import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';

// Compile native Figma TSX at build time; output has no framework runtime.
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const kebab=s=>s.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
const decode=s=>s.replace(/(?<!\\)_/g,' ').replaceAll('\\_','_');
const unitless=new Set(['lineHeight','opacity','fontWeight','flex','flexGrow','flexShrink','order','zIndex','scale']);
const basic={absolute:'position:absolute',relative:'position:relative',fixed:'position:fixed',sticky:'position:sticky',static:'position:static',block:'display:block',inline:'display:inline','inline-block':'display:inline-block',flex:'display:flex','inline-flex':'display:inline-flex',grid:'display:grid',hidden:'display:none','flex-col':'flex-direction:column','flex-row':'flex-direction:row','flex-wrap':'flex-wrap:wrap','flex-nowrap':'flex-wrap:nowrap','flex-col-reverse':'flex-direction:column-reverse','flex-row-reverse':'flex-direction:row-reverse','shrink-0':'flex-shrink:0','shrink':'flex-shrink:1','grow':'flex-grow:1','grow-0':'flex-grow:0','flex-1':'flex:1 1 0%','flex-none':'flex:none','items-start':'align-items:flex-start','items-end':'align-items:flex-end','items-center':'align-items:center','items-stretch':'align-items:stretch','items-baseline':'align-items:baseline','justify-start':'justify-content:flex-start','justify-end':'justify-content:flex-end','justify-center':'justify-content:center','justify-between':'justify-content:space-between','justify-around':'justify-content:space-around','justify-evenly':'justify-content:space-evenly','content-stretch':'align-content:stretch','self-start':'align-self:flex-start','self-end':'align-self:flex-end','self-center':'align-self:center','self-stretch':'align-self:stretch','overflow-hidden':'overflow:hidden','overflow-clip':'overflow:clip','overflow-visible':'overflow:visible','overflow-auto':'overflow:auto','overflow-y-auto':'overflow-y:auto','overflow-x-auto':'overflow-x:auto','overflow-y-clip':'overflow-y:clip','overflow-x-clip':'overflow-x:clip','whitespace-nowrap':'white-space:nowrap','whitespace-pre':'white-space:pre','whitespace-pre-wrap':'white-space:pre-wrap','break-words':'overflow-wrap:break-word','break-all':'word-break:break-all','text-left':'text-align:left','text-center':'text-align:center','text-right':'text-align:right','text-justify':'text-align:justify',uppercase:'text-transform:uppercase',lowercase:'text-transform:lowercase',capitalize:'text-transform:capitalize','not-italic':'font-style:normal',italic:'font-style:italic',underline:'text-decoration-line:underline','no-underline':'text-decoration-line:none','line-through':'text-decoration-line:line-through','font-thin':'font-weight:100','font-extralight':'font-weight:200','font-light':'font-weight:300','font-normal':'font-weight:400','font-medium':'font-weight:500','font-semibold':'font-weight:600','font-bold':'font-weight:700','font-extrabold':'font-weight:800','font-black':'font-weight:900','border-solid':'border-style:solid','border-dashed':'border-style:dashed','border-dotted':'border-style:dotted','border-none':'border-style:none','cursor-pointer':'cursor:pointer','cursor-default':'cursor:default','pointer-events-none':'pointer-events:none','pointer-events-auto':'pointer-events:auto','object-cover':'object-fit:cover','object-contain':'object-fit:contain','object-fill':'object-fit:fill','max-w-none':'max-width:none','min-w-0':'min-width:0','min-h-0':'min-height:0','min-w-px':'min-width:1px','min-h-px':'min-height:1px','min-w-full':'min-width:100%','min-h-full':'min-height:100%','max-w-full':'max-width:100%','max-h-full':'max-height:100%','opacity-0':'opacity:0','opacity-100':'opacity:1','isolate':'isolation:isolate','select-none':'user-select:none','align-middle':'vertical-align:middle','align-top':'vertical-align:top','truncate':'overflow:hidden;text-overflow:ellipsis;white-space:nowrap'};
const color={white:'#fff',black:'#000',transparent:'transparent',current:'currentColor','gray-900':'#111827','gray-500':'#6b7280'};
Object.assign(basic,{'bg-clip-padding':'background-clip:padding-box','content-start':'align-content:flex-start','contents':'display:contents','inline-grid':'display:inline-grid','decoration-from-font':'text-decoration-thickness:from-font','decoration-solid':'text-decoration-style:solid','justify-self-start':'justify-self:start','justify-self-stretch':'justify-self:stretch','list-disc':'list-style-type:disc','mix-blend-color-burn':'mix-blend-mode:color-burn','place-items-start':'place-items:start','text-balance':'text-wrap:balance','text-pretty':'text-wrap:pretty','text-ellipsis':'text-overflow:ellipsis','bg-gradient-to-r':'background-image:linear-gradient(to right,var(--native-stops,var(--native-from,transparent) var(--native-from-pos,0%),var(--native-to,transparent) var(--native-to-pos,100%)))'});
Object.assign(basic,{'object-top':'object-position:top','object-bottom':'object-position:bottom','object-center':'object-position:center','object-left':'object-position:left','object-right':'object-position:right'});
Object.assign(basic,{'mask-alpha':'mask-mode:alpha','mask-intersect':'mask-composite:intersect','mask-no-clip':'mask-clip:no-clip','mask-no-repeat':'mask-repeat:no-repeat','mix-blend-luminosity':'mix-blend-mode:luminosity'});
Object.assign(basic,{'content-center':'align-content:center'});
const size=s=>s==='full'?'100%':s==='screen'?'100vw':s==='auto'?'auto':s==='px'?'1px':s==='fit'?'fit-content':s==='min'?'min-content':s==='max'?'max-content':/^\d+\/(\d+)$/.test(s)?`${100*Number(s.split('/')[0])/Number(s.split('/')[1])}%`:/^-?[\d.]+$/.test(s)?`${Number(s)*4}px`:null;
const sides={p:['padding'],px:['padding-left','padding-right'],py:['padding-top','padding-bottom'],pt:['padding-top'],pb:['padding-bottom'],pl:['padding-left'],pr:['padding-right'],m:['margin'],mx:['margin-left','margin-right'],my:['margin-top','margin-bottom'],mt:['margin-top'],mb:['margin-bottom'],ml:['margin-left'],mr:['margin-right'],w:['width'],h:['height'],size:['width','height'],'min-w':['min-width'],'min-h':['min-height'],'max-w':['max-width'],'max-h':['max-height'],top:['top'],left:['left'],bottom:['bottom'],right:['right'],inset:['inset'],'inset-x':['left','right'],'inset-y':['top','bottom'],gap:['gap'],'gap-x':['column-gap'],'gap-y':['row-gap']};
function compileClass(c){
 if(basic[c])return basic[c];
 if(c.startsWith('[')&&c.endsWith(']')&&c.includes(':'))return decode(c.slice(1,-1));
 let m=c.match(/^(.+)-\[(.*)\]$/);
 if(m){let [,k,v]=m;v=decode(v);
  if(sides[k])return sides[k].map(p=>`${p}:${v}`).join(';');
  if(k==='font')return /^['"]/.test(v)?`font-family:${v.replace(/:[^'"]+(['"])/g,'$1')},sans-serif`:`font-weight:${v}`;
  if(k==='text')return /^(#|rgb|hsl|color:|var\(|transparent)/.test(v)?`color:${v.replace(/^color:/,'')}`:`font-size:${v.replace(/^length:/,'')}`;
  if(k==='bg')return /^(url\(|linear-gradient|radial-gradient|conic-gradient|image:)/.test(v)?`background-image:${v.replace(/^image:/,'')}`:`background-color:${v}`;
  if(k==='leading')return `line-height:${v}`;
  if(k==='ms')return `margin-inline-start:${v}`;
  if(k==='mask-position')return `mask-position:${v}`;
  if(k==='mask-size')return `mask-size:${v}`;
  if(k==='mask-image')return `mask-image:${v}`;
  if(k==='me')return `margin-inline-end:${v}`;
  if(k==='col')return `grid-column:${v}`;
  if(k==='row')return `grid-row:${v}`;
  if(k==='drop-shadow')return `filter:drop-shadow(${v})`;
  if(['from','via','to'].includes(k)){if(/^[\d.]+%$/.test(v))return`--native-${k}-pos:${v}`;return`--native-${k}:${v}${k==='via'?';--native-stops:var(--native-from,transparent) var(--native-from-pos,0%),var(--native-via) var(--native-via-pos,50%),var(--native-to,transparent) var(--native-to-pos,100%)':''}`;}
  if(k==='tracking')return `letter-spacing:${v}`;
  if(k==='rounded')return `border-radius:${v}`;
  if(k.startsWith('rounded-')){let p={tl:'top-left',tr:'top-right',bl:'bottom-left',br:'bottom-right'}[k.slice(8)];if(p)return`border-${p}-radius:${v}`;}
  if(k==='border')return /^(#|rgb|hsl|var\(|color:)/.test(v)?`border-color:${v.replace(/^color:/,'')}`:`border-width:${v}`;
  if(k==='border-b'||k==='border-t'||k==='border-l'||k==='border-r'){let p={b:'bottom',t:'top',l:'left',r:'right'}[k.slice(-1)];return /^(#|rgb|hsl|var\()/.test(v)?`border-${p}-color:${v}`:`border-${p}-width:${v}`;}
  if(k==='shadow')return `box-shadow:${v}`;
  if(k==='opacity')return `opacity:${v}`;
  if(k==='flex')return `flex:${v}`;
  if(k==='aspect')return `aspect-ratio:${v}`;
  if(k==='z')return `z-index:${v}`;
  if(k==='rotate')return `rotate:${/^[\d.-]+$/.test(v)?v+'deg':v}`;
  if(k==='translate-x')return `--native-tx:${v};translate:var(--native-tx,0) var(--native-ty,0)`;
  if(k==='translate-y')return `--native-ty:${v};translate:var(--native-tx,0) var(--native-ty,0)`;
  if(k==='scale')return`scale:${v}`;
  if(k==='scale-x')return`scale:${v} 1`;
  if(k==='scale-y')return`scale:1 ${v}`;
  if(k==='origin')return`transform-origin:${v}`;
  if(k==='blur')return`filter:blur(${v})`;
  if(k==='backdrop-blur')return`backdrop-filter:blur(${v})`;
  if(k==='grid-cols')return`grid-template-columns:${v}`;
  if(k==='grid-rows')return`grid-template-rows:${v}`;
  if(k==='col-span')return`grid-column:span ${v}/span ${v}`;
 }
 for(const [prefix,props] of Object.entries(sides).sort((a,b)=>b[0].length-a[0].length)){if(c.startsWith(prefix+'-')){let v=size(c.slice(prefix.length+1));if(v){if(prefix==='h'&&c==='h-screen')v='100vh';return props.map(p=>`${p}:${v}`).join(';');}}}
 m=c.match(/^-(left|right|top|bottom|m[xytrbl]?)-(.+)$/);if(m){const v=size(m[2]);if(v)return sides[m[1]].map(p=>`${p}:calc(${v} * -1)`).join(';');}
 m=c.match(/^(bg|text|border)-(.+)$/);if(m&&color[m[2]])return`${{bg:'background-color',text:'color',border:'border-color'}[m[1]]}:${color[m[2]]}`;
 if(c==='border')return'border-width:1px';
 m=c.match(/^border(?:-([trblxy]))?-(\d+)$/);if(m){let ps=m[1]?{t:['top'],r:['right'],b:['bottom'],l:['left'],x:['left','right'],y:['top','bottom']}[m[1]]:[''];return ps.map(p=>`border${p?'-'+p:''}-width:${m[2]}px`).join(';');}
 m=c.match(/^border-([trblxy])$/);if(m)return{t:'border-top-width:1px',r:'border-right-width:1px',b:'border-bottom-width:1px',l:'border-left-width:1px',x:'border-left-width:1px;border-right-width:1px',y:'border-top-width:1px;border-bottom-width:1px'}[m[1]];
 if(c==='rounded-full')return'border-radius:9999px';if(c==='rounded-none')return'border-radius:0';if(c==='rounded')return'border-radius:4px';
 m=c.match(/^(-)?translate-([xy])-(.+)$/);if(m){let v=size(m[3]);if(v)return`--native-t${m[2]}:${m[1]?'-':''}${v};translate:var(--native-tx,0) var(--native-ty,0)`;}
 m=c.match(/^(-)?rotate-(\d+)$/);if(m)return`rotate:${m[1]?'-':''}${m[2]}deg`;
 m=c.match(/^(-)?scale-([xy])-([\d.]+)$/);if(m){let v=(m[1]?-1:1)*Number(m[3])/100;return`scale:${m[2]==='x'?`${v} 1`:`1 ${v}`}`;}
 m=c.match(/^opacity-(\d+)$/);if(m)return`opacity:${Number(m[1])/100}`;
 m=c.match(/^(col|row)-(\d+)$/);if(m)return`grid-${m[1]==='col'?'column':'row'}-start:${m[2]}`;
 if(c==='leading-normal')return'line-height:1.5';if(c==='leading-none')return'line-height:1';
 return null;
}
const cssEscape=s=>Array.from(s).map(ch=>/[a-zA-Z0-9_-]/.test(ch)?ch:`\\${ch}`).join('');

const adapterCSS = `
.native-statusbar{width:393px;height:70px;flex-shrink:0;padding:24px 41px;display:flex;justify-content:space-between;align-items:flex-start;font-size:16px;line-height:22px}
.native-statusbar>div{display:flex;align-items:center;gap:5px;height:22px}
.native-signal{height:14px;display:flex;align-items:flex-end;gap:2px}
.native-signal i{width:3px;background:currentColor;border-radius:1px;height:6px}
.native-signal i:nth-child(2){height:9px}.native-signal i:nth-child(3){height:11px}.native-signal i:nth-child(4){height:14px}
.native-wifi{width:17px;height:14px;object-fit:contain}
.native-battery{display:block;width:25px;height:13px;border:1px solid #aaa;border-radius:4px;position:relative;margin-left:2px}
.native-battery:before{content:'';position:absolute;inset:1px;border-radius:2px;background:currentColor}
.native-battery:after{content:'';position:absolute;right:-3px;top:3px;width:2px;height:5px;border-radius:0 2px 2px 0;background:#aaa}
`;
const adapterClasses = new Set(['native-statusbar', 'native-signal', 'native-wifi', 'native-battery']);
const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'base', 'embed']);
const motionProps = new Set(['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileInView', 'viewport', 'layout', 'layoutId']);
const slash = value => value.replaceAll('\\', '/');
const execFileAsync = promisify(execFile);

async function versionFonts(options, outputDir) {
  if (options.fontCSS !== undefined) return { css: options.fontCSS, stylesheet: null };
  const directory = path.resolve(options.root, options.fontDir || 'figma-preview/assets/fonts');
  const sourcePath = path.join(directory, 'native.css');
  const bytes = await fs.readFile(sourcePath);
  for (const match of bytes.toString('utf8').matchAll(/url\(([^)]+)\)/g)) {
    const filename = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (!/^[\w.-]+$/.test(filename)) throw new Error(`Font stylesheet must use local original font files: ${filename}`);
    const stat = await fs.stat(path.join(directory, filename));
    if (!stat.size) throw new Error(`Original font file is empty: ${filename}`);
  }
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const target = path.join(directory, `native.${sha256.slice(0, 12)}.css`);
  if (options.emit !== false) await fs.writeFile(target, bytes);
  return {
    css: `@import url("${slash(path.relative(outputDir, target))}");`,
    stylesheet: { sourcePath, path: target, sha256, bytes: bytes.length }
  };
}

function validOriginal(bytes, filename) {
  if (!bytes?.length) return false;
  const extension = path.extname(filename).toLowerCase();
  if (extension === '.svg') return /^\s*(?:<\?xml[^>]+>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(bytes.toString('utf8'));
  // Native Figma URLs sometimes label original JPEG bytes as .png. Preserve
  // their original name and bytes; validate the actual raster signature.
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'].includes(extension)) return (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    /^GIF8[79]a/.test(bytes.subarray(0, 6).toString()) ||
    (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') ||
    (bytes.subarray(4, 8).toString() === 'ftyp' && /avif|avis/.test(bytes.subarray(8, 16).toString()))
  );
  return true;
}

async function prefetchOriginals(frames, options) {
  const found = new Map();
  const add = (filename, url) => { if (!found.has(filename)) found.set(filename, new Set()); found.get(filename).add(url); };
  await Promise.all(frames.map(async frame => {
    try {
      const source = await fs.readFile(path.resolve(options.root, frame.contextPath || frame.context), 'utf8');
      const prefix = source.match(/const\s+assetPathPrefix\s*=\s*(["'])(.*?)\1/);
      if (prefix) for (const match of source.matchAll(/\$\{assetPathPrefix\}\/([^`]+)`/g)) if (/^[\w.-]+$/.test(match[1])) add(match[1], `${prefix[2]}/${match[1]}`);
      for (const match of source.matchAll(/https:\/\/www\.figma\.com\/api\/mcp\/asset\/[\w-]+\/([\w.-]+)/g)) add(match[1], match[0]);
    } catch { /* Missing and sparse source are reported by compileFrame. */ }
  }));
  const assetDir = path.resolve(options.root, options.assetDir || 'figma-preview/assets/figma');
  await fs.mkdir(assetDir, { recursive: true });
  const queue = [];
  for (const [filename, urls] of found) {
    const existing = await fs.readFile(path.join(assetDir, filename)).catch(() => null);
    if (!validOriginal(existing, filename)) queue.push({ filename, urls: [...urls].slice(0, 3) });
  }
  const summary = { referenced: found.size, needed: queue.length, downloaded: 0, failed: [] };
  const failures = new Map();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, queue.length) }, async () => {
    while (next < queue.length) {
      const { filename, urls } = queue[next++];
      const target = path.join(assetDir, filename), temporary = target + '.native-download';
      try {
        let downloaded = false, lastError;
        for (const url of urls) {
          try {
            const response = await execFileAsync(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--fail', '--location', '--silent', '--show-error', '--write-out', '%{http_code}', url, '--output', temporary], { timeout: 45000, windowsHide: true });
            const bytes = await fs.readFile(temporary);
            if (!validOriginal(bytes, filename)) throw new Error(`Original asset returned HTTP ${response.stdout.trim()} with empty or invalid image bytes.`);
            downloaded = true;
            break;
          } catch (error) { lastError = error; }
        }
        if (!downloaded) throw lastError;
        await fs.rename(temporary, target);
        summary.downloaded++;
      } catch (error) {
        await fs.rm(temporary, { force: true });
        const existing = await fs.readFile(target).catch(() => null);
        if (existing && !validOriginal(existing, filename)) await fs.rm(target, { force: true });
        failures.set(filename, String(error.message));
        summary.failed.push(filename);
      }
      if ((summary.downloaded + summary.failed.length) % 50 === 0) options.onProgress?.({ phase: 'assets', completed: summary.downloaded + summary.failed.length, total: queue.length });
    }
  }));
  options.failedAssets = failures;
  return summary;
}

async function loadMetadata(paths = [], root = process.cwd()) {
  const metadata = new Map();
  for (const filename of paths) {
    const xml = await fs.readFile(path.resolve(root, filename), 'utf8');
    for (const match of xml.matchAll(/<(?:frame|instance|component|group|text|rectangle|vector)\s+([^>]+)>/g)) {
      const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], x[2]]));
      if (attrs.id) metadata.set(attrs.id, { ...attrs, width: Number(attrs.width) || undefined, height: Number(attrs.height) || undefined });
    }
  }
  return metadata;
}

function frameOptions(frameOrPath, options) {
  const frame = typeof frameOrPath === 'string' ? { contextPath: frameOrPath, ...options } : { ...frameOrPath };
  const root = path.resolve(options.root || process.cwd());
  const id = String(frame.id || options.id || path.basename(frame.contextPath || '', '.txt').replace(/^(?:mobile-current-|web-)/, ''));
  if (!id || !/^[\w:.-]+$/.test(id)) throw new Error(`Invalid frame id: ${id}`);
  const outputDir = path.resolve(root, options.outputDir || 'figma-preview/native');
  return {
    ...frame, id, root,
    name: frame.name || id,
    width: Number(frame.width ?? frame.w ?? options.width),
    height: Number(frame.height ?? frame.h ?? options.height),
    contextPath: path.resolve(root, frame.contextPath || frame.context || ''),
    outputDir,
    assetDir: path.resolve(root, options.assetDir || 'figma-preview/assets/figma'),
    htmlPath: path.join(outputDir, id.replaceAll(':', '-') + '.html')
  };
}

/** Build one native context. A failed frame has a report and no HTML output. */
export async function compileFrame(frameOrPath, options = {}) {
  const frame = frameOptions(frameOrPath, options);
  const result = {
    id: frame.id, name: frame.name, width: frame.width, height: frame.height,
    contextPath: frame.contextPath, htmlPath: frame.htmlPath,
    ok: false, reason: null, error: null,
    classes: [], classCount: 0, unhandled: [], sourceNodeIds: [], missingComponents: [], missingAssets: [],
    assets: [], adaptersUsed: [], motionTagsRenderedStatically: 0
  };
  const fail = async (reason, error) => {
    result.reason = reason;
    result.error = error || reason;
    if (options.emit !== false) {
      const stem = frame.id.replaceAll(':', '-');
      const filenames = await fs.readdir(frame.outputDir).catch(() => []);
      for (const filename of filenames) {
        if (filename === stem + '.html' || (filename.startsWith(stem + '.') && /^\.[a-f0-9]{8}\.html$/.test(filename.slice(stem.length)))) await fs.rm(path.join(frame.outputDir, filename), { force: true });
      }
    }
    return result;
  };
  if (!(frame.width > 0 && frame.height > 0)) return fail('invalid-dimensions', 'Frame width and height must be positive.');
  try {
    const raw = await fs.readFile(frame.contextPath, 'utf8');
    let source = raw.split(/\nSUPER CRITICAL:/)[0].trim();
    if (source.startsWith('```')) source = source.replace(/^```(?:tsx|jsx|typescript|javascript)?\s*\n/, '').replace(/\n```\s*$/, '');
    if (!/export\s+default\s+/.test(source)) return fail('sparse-context', 'Native source is missing; fetch design context for the frame sublayers.');
    result.motionTagsRenderedStatically = [...source.matchAll(/<motion\.(\w+)/g)].length;
    source = source.replace(/^import \{ motion \} from ["']motion\/react["'];?\s*$/gm, '').replaceAll('<motion.', '<').replaceAll('</motion.', '</');
    if (/^import\s/m.test(source)) return fail('unsupported-import', 'Resolve source imports into explicit componentSources before compiling.');

    const metadata = options.metadataMap || await loadMetadata(options.metadataPaths || [], frame.root);
    const assetsByPath = options.assetCache || new Map();
    const assetsForFrame = new Map();
    async function localAsset(filename, url = null) {
      if (!/^[\w.-]+$/.test(filename)) throw new Error(`Invalid native asset filename: ${filename}`);
      const target = path.join(frame.assetDir, filename);
      let record = assetsByPath.get(target);
      if (!record) {
        let bytes;
        try { bytes = await fs.readFile(target); if (!validOriginal(bytes, filename)) throw new Error('Invalid original asset'); }
        catch {
          if (!url || options.downloadAssets === false || options.failedAssets?.has(filename)) { result.missingAssets.push(filename); return null; }
          await fs.mkdir(frame.assetDir, { recursive: true });
          try {
            const temporary = target + '.native-download';
            execFileSync(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--fail', '--location', '--silent', '--show-error', url, '--output', temporary], { timeout: 45000, stdio: 'pipe', windowsHide: true });
            if (!validOriginal(await fs.readFile(temporary), filename)) { await fs.rm(temporary, { force: true }); throw new Error('Original asset response was empty or invalid.'); }
            await fs.rename(temporary, target);
            bytes = await fs.readFile(target);
          } catch (error) { result.missingAssets.push(filename); return null; }
        }
        if (!bytes.length) { result.missingAssets.push(filename); return null; }
        record = { filename, path: target, sourceUrl: url, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
        assetsByPath.set(target, record);
      }
      const href = slash(path.relative(frame.outputDir, target));
      assetsForFrame.set(target, { ...record, href, sourceUrl: url || record.sourceUrl });
      return href;
    }

    const prefix = source.match(/const\s+assetPathPrefix\s*=\s*(["'])(.*?)\1/);
    if (prefix) {
      for (const match of [...source.matchAll(/\$\{assetPathPrefix\}\/([^`]+)`/g)]) {
        const filename = match[1];
        const href = await localAsset(filename, `${prefix[2]}/${filename}`);
        if (href) source = source.replaceAll('${assetPathPrefix}/' + filename, href);
      }
    }
    for (const match of [...source.matchAll(/https:\/\/www\.figma\.com\/api\/mcp\/asset\/[\w-]+\/([\w.-]+)/g)]) {
      const href = await localAsset(match[1], match[0]);
      if (href) source = source.replaceAll(match[0], href);
    }

    const defs = new Set([...source.matchAll(/(?:function|class|const|let|var)\s+([A-Z]\w*)/g)].map(x => x[1]));
    const uses = new Set([...source.matchAll(/<([A-Z]\w*)\b/g)].map(x => x[1]));
    const unknown = [...uses].filter(name => !defs.has(name) && name !== 'CodeConnectSnippet');
    const classes = new Set(), tags = new Set(), sourceNodeIds = new Set();
    const Fragment = Symbol('Fragment'), CodeConnectSnippet = Symbol('CodeConnectSnippet');
    const h = (tag, props, ...children) => ({ tag, props: props || {}, children: children.flat(Infinity).filter(x => x != null && x !== false && x !== true) });
    const builtin = {}, builtinInitializers = [];
    const dark = frame.theme === 'dark' || frame.sourceTheme === 'dark';
    const adapterProvenance = new Set();
    const recordAdapter = (component, context, provenance, asset = null) => {
      const key = component + ':' + (context.nodeId || 'unidentified');
      if (!adapterProvenance.has(key)) {
        adapterProvenance.add(key);
        result.adaptersUsed.push({ component, nodeId: context.nodeId || null, width: context.width || null, height: context.height || null, provenance, asset });
      }
    };
    if (options.builtinAdapters !== false) {
      if (unknown.includes('StatusBarIPhone') && !options.componentSources?.StatusBarIPhone) {
      const wifiHref = await localAsset(options.wifiAsset || 'lucide-wifi.svg', 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/wifi.svg');
      builtin.StatusBarIPhone = props => {
        const context = props.__nativeContext || {};
        recordAdapter('StatusBarIPhone', context, 'Existing mobile.mjs/mobile.css statusbar geometry 393x70; existing vuexy/index.html Lucide WiFi component with original official SVG.');
        return h('div', { className: 'native-statusbar', 'data-node-id': context.nodeId, 'data-native-adapter': 'StatusBarIPhone', style: { width: context.width || 393, height: context.height || 70, color: dark ? '#f8faff' : '#121212' } },
          h('strong', null, props.textTime || props.time || '09:41'),
          h('div', null,
            h('span', { className: 'native-signal' }, h('i'), h('i'), h('i'), h('i')),
            h('img', { className: 'native-wifi', src: wifiHref || '', alt: '', style: { filter: dark ? 'brightness(0) invert(1)' : 'brightness(0)' } }),
            h('span', { className: 'native-battery' })));
      };
      builtinInitializers.push(`const StatusBarIPhone=((wifiHref)=>(${builtin.StatusBarIPhone.toString()}))(${JSON.stringify(wifiHref)});`);
      }
      const arrowNames = unknown.filter(name => /^Chevron(?:Up|Down|Left|Right)$/.test(name) && !options.componentSources?.[name]);
      if (arrowNames.length) {
        const arrowHref = await localAsset(options.chevronAsset || 'e7f4b.svg');
        for (const name of arrowNames) builtin[name] = props => {
          const context = props.__nativeContext || {};
          const override = options.componentOverrides?.[context.nodeId] || options.componentOverrides?.[name] || {};
          const width = override.width || context.width || 16, height = override.height || context.height || 16;
          recordAdapter(name, { ...context, width, height }, 'Original native e7f4b.svg with CSS rotation and theme tint; source metadata controls instance geometry.', options.chevronAsset || 'e7f4b.svg');
          return h('img', { src: arrowHref || '', alt: '', 'data-node-id': context.nodeId, 'data-native-adapter': name,
            style: { width, height, flexShrink: 0, objectFit: 'contain', rotate: ({ ChevronUp: 0, ChevronRight: 90, ChevronDown: 180, ChevronLeft: -90 })[name] + 'deg', filter: dark ? 'brightness(0) invert(1)' : 'brightness(0)' } });
        };
        for (const name of arrowNames) builtinInitializers.push(`const ${name}=((name,arrowHref,options)=>(${builtin[name].toString()}))(${JSON.stringify(name)},${JSON.stringify(arrowHref)},${JSON.stringify({ componentOverrides: options.componentOverrides, chevronAsset: options.chevronAsset })});`);
      }
    }
    const extra = Object.values(options.componentSources || {}).join('\n');
    result.missingComponents = unknown.filter(name => !builtin[name] && !options.componentSources?.[name]);
    const missingFunctions = result.missingComponents.map(name => `function ${name}(){return null;}`).join('\n');
    const compiled = await transform(source + '\n' + extra + '\n' + missingFunctions, { loader: 'tsx', jsxFactory: 'h', jsxFragment: 'Fragment', format: 'cjs' });
    // Everything callable by native source is created inside the isolated realm.
    // Passing host functions or objects would expose their constructors to source.
    function expandNative(node, inherited = {}) {
      if (Array.isArray(node)) return node.map(child => expandNative(child, inherited));
      if (typeof node !== 'object' || node === null) return node;
      const { tag, props, children } = node;
      if (tag === Fragment) return expandNative(children, inherited);
      if (tag === CodeConnectSnippet) {
        const nodeId = props['data-node-id'];
        if (nodeId) snippetIds.add(nodeId);
        return expandNative(children, { ...inherited, ...metadata.get(nodeId), nodeId });
      }
      if (typeof tag === 'function') return expandNative(tag({ ...props, children, __nativeContext: inherited }), inherited);
      if (typeof tag !== 'string') throw new Error('Unsupported native JSX node.');
      return { tag, props, children: children.map(child => expandNative(child, inherited)) };
    }
    const sandbox = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    const sandboxSource = `
      const module={exports:{}},exports=module.exports;
      const h=(${h.toString()});
      const Fragment=Symbol('Fragment'),CodeConnectSnippet=Symbol('CodeConnectSnippet');
      const dark=${JSON.stringify(dark)},result={adaptersUsed:[]},adapterProvenance=new Set(),snippetIds=new Set();
      const metadata=new Map(${JSON.stringify([...new Set([...source.matchAll(/<CodeConnectSnippet\b[^>]*data-node-id="([^"]+)"/g)].map(match => match[1]))].filter(nodeId => metadata.has(nodeId)).map(nodeId => [nodeId, metadata.get(nodeId)]))});
      const recordAdapter=(${recordAdapter.toString()});
      ${builtinInitializers.join('\n')}
      ${compiled.code}
      const expandNative=(${expandNative.toString()});
      if(typeof module.exports.default!=='function')throw new Error('Expected a native default frame function.');
      JSON.stringify({tree:expandNative(module.exports.default({})),adaptersUsed:result.adaptersUsed,sourceNodeIds:[...snippetIds]});
    `;
    const serialized = new vm.Script(sandboxSource, { filename: frame.contextPath }).runInContext(sandbox, { timeout: options.sourceTimeoutMs || 10000 });
    if (typeof serialized !== 'string') throw new Error('Native source did not produce serializable markup.');
    const expanded = JSON.parse(serialized);
    result.adaptersUsed = expanded.adaptersUsed;
    expanded.sourceNodeIds.forEach(nodeId => sourceNodeIds.add(nodeId));

    const serialize = (node, inherited = {}) => {
      if (Array.isArray(node)) return node.map(child => serialize(child, inherited)).join('');
      if (typeof node !== 'object' || node === null) return esc(node ?? '');
      const { tag, props, children } = node;
      if (tag === Fragment) return serialize(children, inherited);
      if (tag === CodeConnectSnippet) {
        const nodeId = props['data-node-id'];
        if (nodeId) sourceNodeIds.add(nodeId);
        return serialize(children, { ...inherited, ...metadata.get(nodeId), nodeId });
      }
      if (typeof tag === 'function') return serialize(tag({ ...props, children, __nativeContext: inherited }), inherited);
      if (typeof tag !== 'string') throw new Error('Unsupported native JSX node.');
      tags.add(tag);
      const nodeId = props['data-node-id'];
      if (nodeId) sourceNodeIds.add(nodeId);
      if (props.className) String(props.className).split(/\s+/).filter(Boolean).forEach(value => classes.add(value));
      let attributes = '';
      for (let [key, value] of Object.entries(props)) {
        if (['children', 'key', '__nativeContext'].includes(key) || key.startsWith('on') || motionProps.has(key) || value == null || value === false) continue;
        if (key === 'className') key = 'class';
        if (key === 'htmlFor') key = 'for';
        if (key === 'style') value = Object.entries(value).map(([property, item]) => `${kebab(property)}:${typeof item === 'number' && item !== 0 && !unitless.has(property) && !property.startsWith('--') ? item + 'px' : item}`).join(';');
        attributes += ` ${key}="${esc(value)}"`;
      }
      return `<${tag}${attributes}>` + (voidTags.has(tag) ? '' : children.map(child => serialize(child, inherited)).join('') + `</${tag}>`);
    };
    const markup = serialize(expanded.tree);
    result.classes = [...classes].sort();
    result.classCount = classes.size;
    result.sourceNodeIds = [...sourceNodeIds];
    result.assets = [...assetsForFrame.values()];
    result.missingAssets = [...new Set(result.missingAssets)];
    const rules = [];
    for (const className of result.classes) {
      if (adapterClasses.has(className)) continue;
      const declaration = compileClass(className);
      if (declaration) rules.push(`.${cssEscape(className)}{${declaration}}`);
      else result.unhandled.push(className);
    }
    if (result.missingComponents.length) return fail('missing-components', 'Resolve every referenced native component before publishing this frame.');
    if (result.missingAssets.length) return fail('missing-assets', 'Download the missing original source assets before publishing this frame.');
    if (result.unhandled.length) return fail('unsupported-classes', 'Unsupported native CSS utility classes require compiler support.');
    if (/https:\/\/www\.figma\.com\/api\/mcp\/asset/.test(markup)) return fail('temporary-asset-url', 'Temporary native asset URLs must be replaced with local originals.');
    const reset = `html,body{margin:0;padding:0;width:${frame.width}px;height:${frame.height}px}body{font-family:Roboto,Arial,sans-serif;line-height:1.5;color:#000;-webkit-font-smoothing:antialiased}:where(${[...tags].join(',')}){box-sizing:border-box;border-width:0;border-style:solid;border-color:currentColor}:where(p,h1,h2,h3,h4,h5,h6,figure,blockquote){margin:0}:where(button,input,textarea,select){font:inherit;color:inherit;letter-spacing:inherit;background:transparent;padding:0;margin:0;border-radius:0}:where(button){text-transform:none}:where(img,svg,video,canvas){display:block;vertical-align:middle}:where(img,video){max-width:100%;height:auto}:where(a){color:inherit;text-decoration:inherit}`;
    const fontInfo = await versionFonts({ ...options, root: frame.root }, frame.outputDir);
    const fonts = fontInfo.css;
    result.fontStylesheet = options.fontStylesheet || fontInfo.stylesheet;
    const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(frame.name)}</title><style>${fonts}\n${reset}\n${result.adaptersUsed.length ? adapterCSS : ''}\n${rules.join('\n')}</style></head><body data-source-frame="${esc(frame.id)}">${markup}</body></html>`;
    const contentHash = crypto.createHash('sha256').update(html).digest('hex').slice(0, 8);
    result.htmlPath = path.join(frame.outputDir, `${frame.id.replaceAll(':', '-')}.${contentHash}.html`);
    result.file = 'native/' + path.basename(result.htmlPath);
    result.contentHash = contentHash;
    if (options.emit !== false) {
      await fs.mkdir(frame.outputDir, { recursive: true });
      await fs.writeFile(result.htmlPath, html);
    }
    result.ok = true;
    return result;
  } catch (error) {
    return fail('compile-error', String(error?.message || error));
  }
}

/** Compile a complete catalogue manifest; every source failure remains visible. */
export async function buildManifest(manifestOrPath, options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const manifest = typeof manifestOrPath === 'string' ? JSON.parse(await fs.readFile(path.resolve(root, manifestOrPath), 'utf8')) : manifestOrPath;
  const frames = Array.isArray(manifest) ? manifest : manifest.frames;
  if (!Array.isArray(frames)) throw new Error('Manifest requires a frames array.');
  const merged = { ...(manifest.options || {}), ...options, root };
  const outputDir = path.resolve(root, merged.outputDir || 'figma-preview/native');
  const fontInfo = await versionFonts(merged, outputDir);
  merged.fontCSS = fontInfo.css;
  merged.fontStylesheet = fontInfo.stylesheet;
  merged.metadataMap = await loadMetadata(manifest.metadataPaths || merged.metadataPaths || [], root);
  merged.assetCache = new Map();
  const prefetch = merged.downloadAssets === false ? null : await prefetchOriginals(frames, merged);
  const reports = [];
  for (const frame of frames) reports.push(await compileFrame(frame, merged));
  const result = {
    generatedAt: new Date().toISOString(), total: reports.length, prefetch, fontStylesheet: fontInfo.stylesheet,
    successful: reports.filter(frame => frame.ok).length, failed: reports.filter(frame => !frame.ok).length,
    unhandled: [...new Set(reports.flatMap(frame => frame.unhandled))].sort(),
    assets: [...merged.assetCache.values()], frames: reports,
    adapters: Object.fromEntries([...new Set(reports.flatMap(frame => frame.adaptersUsed.map(adapter => adapter.component)))].sort().map(name => [name, reports.flatMap(frame => frame.adaptersUsed).filter(adapter => adapter.component === name).length])),
    reasons: Object.fromEntries([...new Set(reports.filter(frame => !frame.ok).map(frame => frame.reason))].sort().map(reason => [reason, reports.filter(frame => frame.reason === reason).length])),
    manifestPath: path.join(outputDir, 'manifest.json'),
    reportPath: path.resolve(root, merged.reportPath || '.audit/native-build-report.json')
  };
  if (merged.emit !== false) {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(path.dirname(result.reportPath), { recursive: true });
    await fs.writeFile(result.reportPath, JSON.stringify(result, null, 2) + '\n');
    const publicFrames = reports.filter(frame => frame.ok).map(report => {
      const original = frames.find(frame => frame.id === report.id);
      const metadata = {};
      for (const key of ['id', 'name', 'platform', 'theme', 'family', 'group', 'orientation']) if (original[key] != null) metadata[key] = original[key];
      return { ...metadata, width: report.width, height: report.height, file: report.file };
    });
    await fs.writeFile(result.manifestPath, JSON.stringify(publicFrames, null, 2) + '\n');
    await fs.writeFile(path.join(outputDir, 'assets-manifest.json'), JSON.stringify(result.assets.map(asset => ({ filename: asset.filename, bytes: asset.bytes, sha256: asset.sha256 })), null, 2) + '\n');
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const manifestIndex = args.indexOf('--manifest');
  const manifest = manifestIndex >= 0 ? args[manifestIndex + 1] : args.find(arg => !arg.startsWith('--'));
  if (!manifest || args.includes('--help')) {
    console.log('Usage: node scripts/figma-native-build.mjs --manifest frames.json [--out figma-preview/native] [--metadata page.xml] [--no-download]');
    process.exitCode = manifest ? 0 : 1;
  } else {
    const outIndex = args.indexOf('--out');
    const metadataPaths = args.flatMap((arg, index) => arg === '--metadata' ? args[index + 1].split(',') : []);
    const result = await buildManifest(manifest, { ...(outIndex >= 0 ? { outputDir: args[outIndex + 1] } : {}), ...(metadataPaths.length ? { metadataPaths } : {}), downloadAssets: !args.includes('--no-download'), onProgress: progress => console.error(`Original assets ${progress.completed}/${progress.total}`) });
    console.log(JSON.stringify({ total: result.total, successful: result.successful, failed: result.failed, unhandled: result.unhandled, reportPath: result.reportPath }, null, 2));
    process.exitCode = result.failed ? 1 : 0;
  }
}
