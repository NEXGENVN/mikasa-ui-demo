"""Split local Figma section SVG exports without redrawing or rasterizing them.

Figma exports some unclipped frames as contiguous root siblings. Their exact
background rectangles, or their full-frame clipping groups, identify boundaries.
All coordinates and drawing attributes remain in the original SVG coordinate
system; each output gets the exact frame viewBox. Embedded source bitmaps are
deduplicated byte-for-byte into local assets. No browser or renderer is used.
"""
from __future__ import annotations

import argparse
import base64
import collections
import copy
import hashlib
import json
import math
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.audit/svg-extraction/vendor'))
try:
    from lxml import etree as ET
except ImportError as error:
    raise SystemExit('Install lxml into .audit/svg-extraction/vendor before running.') from error

SVG = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'
URL_REF = re.compile(r'url\(\s*[\"\']?#([^\s)\"\']+)[\"\']?\s*\)')
NUMBER = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?')
SECTIONS = [
    ('web-landscape', 'Web ngang.svg', 'Web ngang', 'web', None),
    ('web-portrait', 'Web dọc.svg', 'Web dọc', 'web-portrait', None),
    ('web-collapsed', 'Sider bar thu nhỏ kích thước các màn ngang.svg', 'Sider bar thu nhỏ kích thước các màn', 'web', None),
    ('web-detail-errors-landscape', 'Tất cả lỗi của lịch sử màn ngang.svg', 'Tất cả lỗi của lịch sử', 'web', None),
    ('web-detail-errors-portrait', 'mã lỗi màn dọc.svg', 'mã lỗi màn dọc', 'web-portrait', None),
    ('app-light', 'Light mode app.svg', None, 'app', 'light'),
    ('app-dark', 'Dark mode app.svg', None, 'app', 'dark'),
    ('mobile-flow', 'Flow.svg', 'Flow', 'app', 'light'),
]


def local_name(node):
    return ET.QName(node).localname


def sha_file(path):
    h = hashlib.sha256()
    with path.open('rb') as source:
        for data in iter(lambda: source.read(1024 * 1024), b''):
            h.update(data)
    return h.hexdigest()


def multiply(a, b):
    return (a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
            a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
            a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5])


def inverse(matrix):
    a,b,c,d,e,f=matrix;determinant=a*d-b*c
    if abs(determinant)<1e-12:
        raise ValueError('Native frame ancestry contains a singular transform.')
    return (d/determinant,-b/determinant,-c/determinant,a/determinant,
            (c*f-d*e)/determinant,(b*e-a*f)/determinant)


def fig_matrix(value):
    return tuple(value[k] for k in ('m00','m10','m01','m11','m02','m12'))


def transform(value):
    matrix = (1, 0, 0, 1, 0, 0)
    for name, argument in re.findall(r'([A-Za-z]+)\s*\(([^)]*)\)', value or ''):
        v = [float(x) for x in NUMBER.findall(argument)]
        if name == 'matrix' and len(v) == 6:
            part = tuple(v)
        elif name == 'translate' and len(v) in (1, 2):
            part = (1, 0, 0, 1, v[0], v[1] if len(v) == 2 else 0)
        elif name == 'scale' and len(v) in (1, 2):
            part = (v[0], 0, 0, v[1] if len(v) == 2 else v[0], 0, 0)
        elif name == 'rotate' and len(v) in (1, 3):
            angle = math.radians(v[0]); c, s = math.cos(angle), math.sin(angle)
            part = (c, s, -s, c, 0, 0)
            if len(v) == 3:
                part = multiply(multiply((1,0,0,1,v[1],v[2]), part), (1,0,0,1,-v[1],-v[2]))
        elif name in ('skewX', 'skewY') and len(v) == 1:
            t = math.tan(math.radians(v[0]))
            part = (1, 0, t, 1, 0, 0) if name == 'skewX' else (1, t, 0, 1, 0, 0)
        else:
            raise ValueError(f'Unsupported SVG transform {name}({argument})')
        matrix = multiply(matrix, part)
    return matrix


def point(m, x, y):
    return (m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5])


def rect_bounds(node, parent_transform=''):
    x, y, w, h = [float(node.get(key, '0')) for key in ('x', 'y', 'width', 'height')]
    m = multiply(transform(parent_transform), transform(node.get('transform')))
    points = [point(m, a, b) for a, b in ((x,y),(x+w,y),(x,y+h),(x+w,y+h))]
    xs, ys = zip(*points)
    return rounded((min(xs), min(ys), max(xs)-min(xs), max(ys)-min(ys)))


def rounded(bounds):
    return tuple(round(float(x), 3) for x in bounds)


def is_page(bounds, platform):
    _, _, w, h = bounds
    if platform == 'app':
        return abs(w-390) < .01 and 800 <= h <= 1300
    return (abs(w-1440)<.01 and abs(h-1024)<.01) or (999<=w<=1024 and abs(h-1440)<.01)


def read_metadata(inventory_path, section):
    key, _, section_name, platform, theme = section
    inventory = json.loads(inventory_path.read_text(encoding='utf-8-sig'))
    if isinstance(inventory, dict):
        inventory = inventory.get('frames', inventory.get('items', []))
    expected = [dict(f) for f in inventory if
                (f.get('sourceSection', f.get('group')) == section_name if section_name else
                 f.get('platform') == 'app' and f.get('theme') == theme)]
    if key=='mobile-flow':
        expected=[dict(f,platform='app',theme='light',family='prototype-flow') for f in
                  json.loads((ROOT/'.audit/fig-flow-frames.json').read_text(encoding='utf-8'))['frames']]
    metadata_path = ROOT / '.audit' / ('mobile-page-current.xml' if platform == 'app' else 'web-page-current.xml')
    metadata = ET.parse(str(metadata_path), ET.XMLParser(resolve_entities=False, no_network=True, load_dtd=False, huge_tree=True))
    nodes = {node.get('id'): node for node in metadata.getroot().iter() if node.get('id')}
    fresh_path = ROOT / '.audit/fig-current-node-map.json'
    fresh = json.loads(fresh_path.read_text(encoding='utf-8')) if fresh_path.exists() else {}
    for frame in expected:
        node = nodes.get(frame['id'])
        current = fresh.get(frame['id'])
        if current:
            if key=='mobile-flow':
                board=fresh.get('1021:71819')
                if not board:
                    raise ValueError('Fresh native Flow board transform is missing.')
                relative=multiply(inverse(fig_matrix(board['globalTransform'])),fig_matrix(current['globalTransform']))
                corners=[point(relative,x,y) for x,y in ((0,0),(current['width'],0),(0,current['height']),(current['width'],current['height']))]
                xs,ys=zip(*corners)
                frame['metadataBounds']=[min(xs),min(ys),max(xs)-min(xs),max(ys)-min(ys)]
                frame['metadataRelativeTransform']=relative
            elif platform == 'app':
                b = current['globalBounds'];frame['metadataBounds'] = [b[k] for k in ('x','y','width','height')]
            else:
                frame['metadataBounds'] = [current[k] for k in ('x','y','width','height')]
            frame['metadataSource'] = '.audit/fig-current-node-map.json'
        elif node is not None:
            # Web exported sections use section-local coordinates; App frame
            # exports retain their page positions plus a constant translation.
            frame['metadataBounds'] = [float(node.get(k, '0')) for k in ('x','y','width','height')]
            frame['metadataSource'] = metadata_path.relative_to(ROOT).as_posix()
        elif all(k in frame for k in ('x','y','width','height')):
            frame['metadataBounds'] = [frame[k] for k in ('x','y','width','height')]
        else:
            frame['metadataBounds'] = None
    # Non-page section children also delimit flat root sibling runs.
    boundaries = []
    if key=='mobile-flow':
        boundaries=expected
    elif section_name:
        source = next((n for n in metadata.getroot() if n.get('name') == section_name), None)
        if source is not None:
            for n in source:
                if n.get('width') and n.get('height'):
                    boundaries.append({'id':n.get('id'), 'name':n.get('name'), 'metadataBounds':
                                       [float(n.get(k,'0')) for k in ('x','y','width','height')]})
    else:
        boundaries = [f for f in expected if f['metadataBounds']]
    return expected, boundaries


def safety_check(tree):
    if tree.docinfo.doctype:
        raise ValueError('SVG DOCTYPE is forbidden.')
    rejected = {}
    for node in tree.getroot().iter():
        if not isinstance(node.tag, str):
            continue
        tag = local_name(node).lower()
        if tag in ('script', 'iframe', 'object', 'embed', 'input', 'form'):
            rejected[node] = f'Forbidden SVG element: {tag}'
        if tag == 'foreignobject':
            # Figma's static backdrop blur uses an empty XHTML div. Preserve
            # that exact source after a deliberately narrow data-only check.
            for child in node.iterdescendants():
                if child.tag != '{http://www.w3.org/1999/xhtml}div' or (child.text and child.text.strip()):
                    rejected[node] = 'foreignObject is not a static empty XHTML div'
                    break
                if set(child.attrib) - {'style'}:
                    rejected[node] = 'foreignObject XHTML div contains non-style attributes'
                    break
                for declaration in child.get('style','').split(';'):
                    if not declaration.strip():
                        continue
                    prop, separator, value = declaration.partition(':'); prop=prop.strip();value=value.strip()
                    allowed = bool(separator) and (
                        (prop=='backdrop-filter' and re.fullmatch(r'blur\(\d+(?:\.\d+)?px\)',value)) or
                        (prop=='clip-path' and re.fullmatch(r'url\(#[A-Za-z0-9_.:-]+\)',value)) or
                        (prop in ('height','width') and re.fullmatch(r'\d+(?:\.\d+)?(?:%|px)',value)))
                    if not allowed:
                        rejected[node] = 'foreignObject XHTML div CSS is outside the static backdrop whitelist'
                        break
        for name, value in node.attrib.items():
            attribute = ET.QName(name).localname.lower()
            if attribute.startswith('on'):
                rejected[node] = f'Forbidden event attribute: {name}'
            if attribute == 'href' and not (value.startswith('#') or re.match(r'data:image/(?:png|jpeg|jpg|gif|webp);base64,', value, re.I)):
                rejected[node] = f'External or unsupported href rejected: {value[:80]}'
            for reference in re.findall(r'url\(\s*([^)]*)\)', value, re.I):
                if not reference.strip(' \"\'').startswith('#'):
                    rejected[node] = 'External SVG url() rejected.'
        if tag == 'style' and node.text and re.search(r'@import|url\(\s*[\"\']?(?!#)', node.text, re.I):
            rejected[node] = 'External style resource rejected.'
    return rejected


def image_assets(root, out):
    assets = []
    for node in root.iter(f'{{{SVG}}}image'):
        attribute = f'{{{XLINK}}}href' if node.get(f'{{{XLINK}}}href') is not None else 'href'
        value = node.get(attribute, '')
        if not re.match(r'data:image/(?:png|jpeg|jpg|gif|webp);base64,', value, re.I):
            continue
        header, encoded = value.split(',', 1)
        data = base64.b64decode(encoded, validate=True)
        digest = hashlib.sha256(data).hexdigest()
        mime = header[5:].split(';')[0].lower()
        suffix = {'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/gif':'gif','image/webp':'webp'}[mime]
        path = out / 'assets' / f'{digest}.{suffix}'
        if not path.exists():
            path.write_bytes(data)
        node.set(attribute, f'../assets/{path.name}')
        assets.append({'id':node.get('id'), 'file':path.relative_to(out).as_posix(), 'sha256':digest, 'bytes':len(data), 'mimeType':mime})
    return assets


def references(nodes):
    result = set()
    for root in nodes:
        for node in root.iter():
            for attribute, value in node.attrib.items():
                result.update(URL_REF.findall(value))
                if ET.QName(attribute).localname == 'href' and value.startswith('#'):
                    result.add(value[1:])
    return result


def collect_definitions(nodes, ids):
    internal = {n.get('id') for root in nodes for n in root.iter() if n.get('id')}
    selected, missing = {}, set()
    pending = references(nodes) - internal
    while pending:
        identity = pending.pop()
        if identity in internal or identity in selected:
            continue
        node = ids.get(identity)
        if node is None:
            missing.add(identity); continue
        selected[identity] = node
        pending.update(references([node]) - internal - selected.keys())
    # Do not duplicate a child whose referenced ancestor was already collected.
    kept = [node for node in selected.values() if not any(parent.get('id') in selected for parent in node.iterancestors())]
    return kept, sorted(missing)


def worker(args, section):
    key, filename, section_name, platform, theme = section
    source = args.source_dir / filename
    expected, boundaries = read_metadata(args.inventory, section)
    source_sha = sha_file(source)
    parser = ET.XMLParser(resolve_entities=False, no_network=True, load_dtd=False, huge_tree=True)
    tree = ET.parse(str(source), parser); unsafe = safety_check(tree)
    root = tree.getroot(); ids = {n.get('id'):n for n in root.iter() if n.get('id')}
    assets = image_assets(root, args.output_dir)
    candidates = []
    for index, node in enumerate(root):
        tag = local_name(node)
        bounds = None
        if tag == 'rect':
            bounds = rect_bounds(node)
        elif tag == 'g' and node.get('clip-path'):
            refs = URL_REF.findall(node.get('clip-path'))
            clip = ids.get(refs[0]) if len(refs) == 1 else None
            if clip is not None and len(clip) == 1 and local_name(clip[0]) == 'rect' and clip.get('clipPathUnits', 'userSpaceOnUse') == 'userSpaceOnUse':
                bounds = rect_bounds(clip[0], node.get('transform'))
        if bounds:
            candidates.append({'index':index, 'bounds':bounds, 'kind':'full-clip-group' if tag == 'g' else 'background-rect'})
    pages = [c for c in candidates if is_page(c['bounds'], platform)]
    # Register section export coordinates against native frame coordinates.
    votes = collections.Counter()
    for c in pages:
        x,y,w,h = c['bounds']
        for f in expected:
            if not f['metadataBounds']:
                continue
            fx,fy,fw,fh = f['metadataBounds']
            if abs(w-fw)<.01 and abs(h-fh)<.01:
                votes[rounded((x-fx,y-fy))] += 1
    ranking = votes.most_common(5)
    offset = ranking[0][0] if ranking else (0,0)
    lookup = collections.defaultdict(list)
    for f in boundaries:
        if f['metadataBounds']:
            x,y,w,h = f['metadataBounds']; lookup[rounded((x+offset[0],y+offset[1],w,h))].append(f)
    frame_lookup = {f['id']:f for f in expected}
    markers = []
    for c in candidates:
        matches = lookup.get(c['bounds'], [])
        if len(matches) == 1:
            markers.append(dict(c, id=matches[0]['id'], name=matches[0]['name']))
        elif is_page(c['bounds'], platform):
            markers.append(dict(c, id=None, name='Unmatched original SVG frame'))
    # Repeated full-size clips/overlays belong to the same frame run.
    runs = []
    for m in markers:
        identity = m['id'] or ('bounds', m['bounds'])
        if runs and runs[-1]['identity'] == identity:
            runs[-1]['duplicateMarkers'].append(m['index'])
        else:
            runs.append(dict(m, identity=identity, duplicateMarkers=[]))
    seen = collections.Counter(run['id'] for run in runs if run['id'])
    final_index = next((i for i,n in enumerate(root) if local_name(n)=='defs'), len(root))
    outputs, exclusions, unresolved = [], [], []
    for n, run in enumerate(runs):
        end = runs[n+1]['index'] if n+1<len(runs) else final_index
        frame = frame_lookup.get(run['id'])
        if not frame:
            if is_page(run['bounds'], platform):
                unresolved.append({'sourceBounds':run['bounds'], 'rootSiblingStart':run['index'], 'rootSiblingEndExclusive':end, 'reason':'No unique native frame geometry match'})
            else:
                exclusions.append({'id':run['id'],'name':run['name'],'sourceBounds':run['bounds'],'reason':'Component or annotation boundary, not an inventory page'})
            continue
        if seen[frame['id']] != 1:
            unresolved.append({'id':frame['id'],'reason':'Frame marker appears in disjoint root-sibling runs; extraction not guessed'})
            continue
        nodes = [node for node in list(root)[run['index']:end] if local_name(node) != 'defs']
        definitions, missing = collect_definitions(nodes, ids)
        if missing:
            unresolved.append({'id':frame['id'],'reason':'Missing recursively referenced definitions','references':missing})
            continue
        rejected = [unsafe[node] for top in nodes + definitions for node in top.iter() if node in unsafe]
        if rejected:
            unresolved.append({'id':frame['id'],'name':frame['name'],'sourceBounds':run['bounds'],'reason':'Unsafe source SVG content rejected without executing or removing it','violations':sorted(set(rejected))})
            continue
        x,y,w,h = run['bounds']
        output = ET.Element(f'{{{SVG}}}svg', nsmap=root.nsmap)
        for attribute,value in root.attrib.items():
            if attribute not in ('width','height','viewBox'):
                output.set(attribute,value)
        output.set('width',format(w,'.12g')); output.set('height',format(h,'.12g'))
        output.set('viewBox',' '.join(format(v,'.12g') for v in (x,y,w,h)))
        if definitions:
            defs = ET.SubElement(output,f'{{{SVG}}}defs')
            for node in definitions:
                defs.append(copy.deepcopy(node))
        for node in nodes:
            output.append(copy.deepcopy(node))
        data = ET.tostring(output, encoding='utf-8', xml_declaration=True)
        path = args.output_dir / 'frames' / (frame['id'].replace(':','-')+'.svg')
        path.write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        drawing_sha = hashlib.sha256(b''.join(ET.tostring(node,method='c14n') for node in nodes)).hexdigest()
        outputs.append({'id':frame['id'],'name':frame['name'],'group':section_name or ('Light mode app' if theme=='light' else 'Dark mode app'),'platform':platform,'theme':theme,'family':frame.get('family'),'width':w,'height':h,'file':path.relative_to(args.output_dir).as_posix(),'publicFile':'source-frames/'+frame['id'].replace(':','-')+'.'+digest[:12]+'.svg','sha256':digest,'bytes':len(data),'sourceFile':str(source),'sourceSha256':source_sha,'sourceBounds':{'x':x,'y':y,'width':w,'height':h},'metadataBounds':frame['metadataBounds'],'metadataSource':frame.get('metadataSource'),'metadataRelativeTransform':frame.get('metadataRelativeTransform'),'sectionOffset':{'x':offset[0],'y':offset[1]},'extraction':'original-contiguous-root-siblings','rootSiblingStart':run['index'],'rootSiblingEndExclusive':end,'recursiveDefinitionCount':len(definitions),'sourceDrawingSha256':drawing_sha,'sourceDrawingElementCount':sum(1 for node in nodes for _ in node.iter()),'status':'extracted-original-vectors'})
    emitted = {f['id'] for f in outputs}
    for f in expected:
        if f['id'] not in emitted and not any(x.get('id')==f['id'] for x in unresolved):
            unresolved.append({'id':f['id'],'name':f['name'],'metadataBounds':f['metadataBounds'],'reason':'No exact source SVG frame boundary match; source export may omit this frame'})
    report = {'section':key,'sourceFile':str(source),'sourceSha256':source_sha,'sourceRootBounds':dict(root.attrib),'expectedFrames':len(expected),'extractedFrames':len(outputs),'coordinateRegistration':{'offset':offset,'rankedVotes':ranking},'frames':outputs,'unresolved':unresolved,'exclusions':exclusions,'assets':assets,'safety':{'rejectedSourceNodes':len(unsafe),'staticBackdropForeignObjects':sum(local_name(n).lower()=='foreignobject' and n not in unsafe for n in root.iter()),'violations':dict(collections.Counter(unsafe.values())),'policy':'No active content, event handlers, external network href, external url(), or DOCTYPE. Original Figma static backdrop blur foreignObject is retained only with empty XHTML div and exact CSS property/value whitelist; clip-path may reference local #IDs.'},'preservation':'Original SVG drawings and coordinates; only frame viewBox and source-image href changed. No rasterization or manual redraw.'}
    (args.output_dir / (key+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'section':key,'expected':len(expected),'extracted':len(outputs),'unresolved':len(unresolved),'offset':offset,'assets':len(assets)},ensure_ascii=False),flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir',type=pathlib.Path,default=pathlib.Path('C:/Users/admin/Downloads'))
    parser.add_argument('--output-dir',type=pathlib.Path,default=ROOT/'.audit/svg-extraction')
    parser.add_argument('--inventory',type=pathlib.Path,default=ROOT/'.audit/full-native-inventory.json')
    parser.add_argument('--section',choices=[s[0] for s in SECTIONS])
    parser.add_argument('--merge-only',action='store_true',help='Merge saved section reports without rewriting existing frame files.')
    args=parser.parse_args();args.output_dir.mkdir(parents=True,exist_ok=True)
    (args.output_dir/'frames').mkdir(exist_ok=True);(args.output_dir/'assets').mkdir(exist_ok=True)
    if args.section:
        if args.merge_only:
            parser.error('--section and --merge-only cannot be combined')
        worker(args,next(s for s in SECTIONS if s[0]==args.section));return
    # A separate process per source releases each large DOM before parsing the next.
    if not args.merge_only:
        for section in SECTIONS:
            subprocess.run([sys.executable,str(pathlib.Path(__file__).resolve()),'--source-dir',str(args.source_dir),'--output-dir',str(args.output_dir),'--inventory',str(args.inventory),'--section',section[0]],check=True)
    reports=[json.loads((args.output_dir/(s[0]+'.json')).read_text(encoding='utf-8')) for s in SECTIONS]
    exclusions_path=ROOT/'.audit/web-native-exclusions.json'
    excluded=json.loads(exclusions_path.read_text(encoding='utf-8')) if exclusions_path.exists() else []
    merged={}
    for report in reports:
        for frame in report['frames']:
            if frame['id'] in merged and frame['sha256']!=merged[frame['id']]['sha256']:
                raise ValueError('Conflicting canonical source exports for frame '+frame['id'])
            merged[frame['id']]=frame
    unresolved=[u for r in reports for u in r['unresolved'] if u.get('id') not in merged]
    sections=[]
    for report in reports:
        section={k:v for k,v in report.items() if k not in ('frames','unresolved')}
        section['unresolved']=[u for u in report['unresolved'] if u.get('id') not in merged]
        section['resolvedByOtherSection']=[u for u in report['unresolved'] if u.get('id') in merged]
        sections.append(section)
    inventory=json.loads(args.inventory.read_text(encoding='utf-8-sig'))
    inventory=inventory.get('frames',inventory.get('items',[])) if isinstance(inventory,dict) else inventory
    flow=json.loads((ROOT/'.audit/fig-flow-frames.json').read_text(encoding='utf-8'))['frames']
    required={f['id'] for f in inventory+flow}
    coverage={'requiredFrameCount':len(required),'extractedFrameCount':len(merged),'missingFrameIds':sorted(required-set(merged)),'unexpectedFrameIds':sorted(set(merged)-required)}
    coverage['complete']=not coverage['missingFrameIds'] and not coverage['unexpectedFrameIds'] and not unresolved
    manifest={'format':'figma-original-vector-frame-extraction-v1','coverage':coverage,'frames':list(merged.values()),'excludedInventoryItems':excluded,'unresolved':unresolved,'sections':sections}
    (args.output_dir/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'totalExtracted':len(manifest['frames']),'totalUnresolved':len(unresolved),'coverage':coverage},ensure_ascii=False),flush=True)


if __name__=='__main__':
    main()
