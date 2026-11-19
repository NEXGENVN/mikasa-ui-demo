"""Verify every extracted original-vector frame without rendering SVG content."""
import hashlib
import importlib.util
import json
import pathlib
import sys

HERE=pathlib.Path(__file__).resolve().parent
SPEC=importlib.util.spec_from_file_location('svg_importer',HERE/'import-figma-svg-sections.py')
M=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(M)
ROOT=HERE.parent;OUTPUT=ROOT/'.audit/svg-extraction'
manifest=json.loads((OUTPUT/'manifest.json').read_text(encoding='utf-8'))
errors=[];source_files={};ids=set();element_count=0;assets=set()
for frame in manifest['frames']:
    identity=frame['id']
    try:
        assert identity not in ids,'Duplicate frame ID';ids.add(identity)
        path=OUTPUT/frame['file'];data=path.read_bytes()
        assert hashlib.sha256(data).hexdigest()==frame['sha256'],'Frame file hash changed'
        root=M.ET.fromstring(data,M.ET.XMLParser(resolve_entities=False,no_network=True,load_dtd=False,huge_tree=True))
        assert float(root.get('width'))==frame['width'] and float(root.get('height'))==frame['height'],'Frame dimensions changed'
        bounds=frame['sourceBounds'];expected=[bounds[k] for k in ('x','y','width','height')]
        assert [float(x) for x in root.get('viewBox').split()]==expected,'Frame viewBox changed'
        internal={n.get('id') for n in root.iter() if n.get('id')}
        assert M.references([root])<=internal,'Dangling local SVG reference'
        drawing=[n for n in root if M.local_name(n)!='defs']
        drawing_sha=hashlib.sha256(b''.join(M.ET.tostring(n,method='c14n') for n in drawing)).hexdigest()
        assert drawing_sha==frame['sourceDrawingSha256'],'Source drawing attributes or geometry changed'
        element_count+=sum(1 for n in drawing for _ in n.iter())
        for n in root.iter():
            if M.local_name(n)=='image':
                href=n.get('{'+M.XLINK+'}href',n.get('href',''))
                target=(path.parent/href).resolve()
                assert target.is_relative_to((OUTPUT/'assets').resolve()),'Image escaped extracted asset directory'
                assert target.is_file() and target.stat().st_size,'Original image missing'
                assert hashlib.sha256(target.read_bytes()).hexdigest()==target.stem,'Original image bytes changed'
                assets.add(str(target))
        source_files[frame['sourceFile']]=frame['sourceSha256']
    except Exception as error:
        errors.append({'id':identity,'error':str(error)})
for path,digest in source_files.items():
    if M.sha_file(pathlib.Path(path))!=digest:
        errors.append({'sourceFile':path,'error':'Original input file changed'})
summary={'frames':len(ids),'drawingElements':element_count,'sourceFilesUnchanged':len(source_files),'originalImageAssets':len(assets),'errors':errors,'exclusions':len(manifest.get('excludedInventoryItems',[])),'unresolved':[u for s in manifest['sections'] for u in s['unresolved']]}
(OUTPUT/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=True,indent=2))
sys.exit(bool(errors))
