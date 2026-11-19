import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { compileFrame, buildManifest } from './figma-native-build.mjs';

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'figma-native-test-'));
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + 'figma-native-test-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.mkdir(path.join(root, 'assets/figma'), { recursive: true });
  return { root, outputDir: path.join(root, 'native'), assetDir: path.join(root, 'assets/figma'), downloadAssets: false, fontCSS: '' };
}
async function source(options, text, name = 'frame.txt') {
  const contextPath = path.join(options.root, name);
  await fs.writeFile(contextPath, text);
  return { id: '42:1', name: 'Native frame', contextPath, width: 390, height: 844 };
}

test('builds native nodes with local original assets and no framework runtime', async t => {
  const options = await workspace(t);
  const original = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M1 2L3 4"/></svg>';
  await fs.writeFile(path.join(options.assetDir, 'icon.svg'), original);
  const frame = await source(options, [
    'const assetPathPrefix="https://www.figma.com/api/mcp/asset/example";',
    'const img=`${assetPathPrefix}/icon.svg`;',
    'export default function Frame(){return <div data-node-id="42:1" className="bg-[#f9fafb] flex w-full h-full"><img data-node-id="42:2" className="size-[24px]" alt="" src={img}/></div>}'
  ].join('\n'));
  const result = await compileFrame(frame, options);
  assert.equal(result.ok, true);
  const html = await fs.readFile(result.htmlPath, 'utf8');
  assert.match(html, /src="\.\.\/assets\/figma\/icon\.svg"/);
  assert.match(html, /data-node-id="42:2"/);
  assert.doesNotMatch(html, /<script|figma\.com\/api\/mcp\/asset/);
  assert.deepEqual(result.sourceNodeIds.sort(), ['42:1', '42:2']);
  assert.ok(result.classes.includes('size-[24px]'));
  assert.equal(await fs.readFile(path.join(options.assetDir, 'icon.svg'), 'utf8'), original);
  assert.equal(result.assets[0].sha256.length, 64);
});

test('an unsupported class removes a stale frame instead of publishing an incomplete preview', async t => {
  const options = await workspace(t);
  const frame = await source(options, 'export default function Frame(){return <div className="w-full" data-node-id="42:1"/>}');
  const good = await compileFrame(frame, options);
  assert.equal(good.ok, true);
  await fs.writeFile(frame.contextPath, 'export default function Frame(){return <div className="some-unsupported-utility" data-node-id="42:1"/>}');
  const failed = await compileFrame(frame, options);
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.unhandled, ['some-unsupported-utility']);
  await assert.rejects(fs.access(good.htmlPath));
});

test('sparse metadata and missing native components remain explicit build failures', async t => {
  const options = await workspace(t);
  let frame = await source(options, '<frame id="42:1" width="390" height="844"/>\nIMPORTANT: The design was too large to fit into context');
  let failed = await compileFrame(frame, options);
  assert.equal(failed.ok, false);
  assert.equal(failed.reason, 'sparse-context');
  frame = await source(options, 'export default function Frame(){return <CodeConnectSnippet data-node-id="42:2"><MissingNative/></CodeConnectSnippet>}');
  failed = await compileFrame(frame, options);
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.missingComponents, ['MissingNative']);
});

test('CodeConnect asset adapters inherit source instance dimensions and source node ids', async t => {
  const options = await workspace(t);
  await fs.writeFile(path.join(options.assetDir, 'e7f4b.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/>');
  const metadataPath = path.join(options.root, 'metadata.xml');
  await fs.writeFile(metadataPath, '<canvas><instance id="42:2" width="16" height="16"/></canvas>');
  const frame = await source(options, 'export default function Frame(){return <div data-node-id="42:1"><CodeConnectSnippet data-node-id="42:2"><ChevronDown/></CodeConnectSnippet></div>}');
  const result = await compileFrame(frame, { ...options, metadataPaths: [metadataPath] });
  assert.equal(result.ok, true);
  const html = await fs.readFile(result.htmlPath, 'utf8');
  assert.match(html, /data-node-id="42:2"/);
  assert.match(html, /width:16px/);
  assert.match(html, /height:16px/);
  assert.match(html, /assets\/figma\/e7f4b\.svg/);
  assert.doesNotMatch(html, /CodeConnectSnippet|native-missing/);
  assert.equal(result.adaptersUsed[0].component, 'ChevronDown');
});

test('a manifest reports each failed source without creating fake frames', async t => {
  const options = await workspace(t);
  const frame = await source(options, 'export default function Frame(){return <div data-node-id="42:1" className="w-full h-full"/>}');
  const bad = await source(options, '<frame id="42:3"/>\nIMPORTANT: sparse response', 'sparse.txt');
  bad.id = '42:3';
  const result = await buildManifest({ frames: [frame, bad] }, options);
  assert.equal(result.successful, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.frames.find(f => f.id === '42:3').reason, 'sparse-context');
  await assert.rejects(fs.access(path.join(options.outputDir, '42-3.html')));
  assert.ok((await fs.readFile(result.reportPath, 'utf8')).includes('sparse-context'));
});

test('published frames use content hashes and a public manifest without source cache paths', async t => {
  const options = await workspace(t);
  const frame = await source(options, 'export default function Frame(){return <div data-node-id="42:1" className="w-full">First</div>}');
  frame.platform = 'app'; frame.theme = 'light'; frame.family = 'overview';
  const first = await buildManifest([frame], options);
  assert.equal(typeof first.manifestPath, 'string');
  const published = JSON.parse(await fs.readFile(first.manifestPath, 'utf8'));
  assert.match(published[0].file, /^native\/42-1\.[a-f0-9]{8}\.html$/);
  assert.equal(published[0].platform, 'app');
  assert.equal(published[0].width, 390);
  assert.doesNotMatch(JSON.stringify(published), /contextPath|screenshotPath|\.audit/);
  await fs.writeFile(frame.contextPath, 'export default function Frame(){return <div data-node-id="42:1" className="w-full">Second</div>}');
  const second = await buildManifest([frame], options);
  assert.notEqual(first.frames[0].file, second.frames[0].file);
});

test('source callbacks cannot obtain the host process through the JSX factory', async t => {
  const options = await workspace(t);
  const frame = await source(options, 'export default function Frame(){const exposed=h.constructor("return typeof process")();return <div data-node-id="42:1">{exposed}</div>}');
  const result = await compileFrame(frame, options);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'compile-error');
});

test('explicit native component source replaces a builtin adapter', async t => {
  const options = await workspace(t);
  const frame = await source(options, 'export default function Frame(){return <CodeConnectSnippet data-node-id="42:2"><StatusBarIPhone/></CodeConnectSnippet>}');
  const result = await compileFrame(frame, { ...options, componentSources: { StatusBarIPhone: 'function StatusBarIPhone(){return <div data-node-id="42:2" className="h-[70px]">Actual source component</div>}' } });
  assert.equal(result.ok, true);
  const html = await fs.readFile(result.htmlPath, 'utf8');
  assert.match(html, /Actual source component/);
  assert.equal(result.adaptersUsed.length, 0);
});

test('the reused statusbar uses an original vector WiFi asset instead of a text glyph', async t => {
  const options = await workspace(t);
  await fs.writeFile(path.join(options.assetDir, 'lucide-wifi.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/>');
  const frame = await source(options, 'export default function Frame(){return <CodeConnectSnippet data-node-id="42:2"><StatusBarIPhone time="09:41"/></CodeConnectSnippet>}');
  const result = await compileFrame(frame, options);
  assert.equal(result.ok, true);
  const html = await fs.readFile(result.htmlPath, 'utf8');
  assert.doesNotMatch(html, /⌁/);
  assert.match(html, /assets\/figma\/lucide-wifi\.svg/);
  assert.match(html, /width:393px;height:70px/);
});

test('an empty successful HTTP response is an asset failure and never becomes a local original', async t => {
  const options = await workspace(t);
  const server = http.createServer((request, response) => { response.statusCode = 202; response.end(); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const prefix = `http://127.0.0.1:${server.address().port}`;
  const frame = await source(options, [
    `const assetPathPrefix="${prefix}";`,
    'const img=`${assetPathPrefix}/empty.svg`;',
    'export default function Frame(){return <img data-node-id="42:1" src={img} alt=""/>}'
  ].join('\n'));
  const result = await buildManifest([frame], { ...options, downloadAssets: true });
  assert.equal(result.successful, 0);
  assert.equal(result.prefetch.downloaded, 0);
  assert.deepEqual(result.prefetch.failed, ['empty.svg']);
  await assert.rejects(fs.access(path.join(options.assetDir, 'empty.svg')));
});

test('accepts unchanged native JPEG bytes served under a Figma png filename', async t => {
  const options = await workspace(t);
  const original = await fs.readFile(new URL('../figma-preview/assets/figma/60372.png', import.meta.url));
  await fs.writeFile(path.join(options.assetDir, 'avatar.png'), original);
  const frame = await source(options, [
    'const assetPathPrefix="https://www.figma.com/api/mcp/asset/example";',
    'const img=`${assetPathPrefix}/avatar.png`;',
    'export default function Frame(){return <img data-node-id="42:1" src={img} alt=""/>}'
  ].join('\n'));
  const result = await compileFrame(frame, options);
  assert.equal(result.ok, true);
  assert.deepEqual(await fs.readFile(path.join(options.assetDir, 'avatar.png')), original);
});

test('a changed local font stylesheet changes the native HTML content hash', async t => {
  const options = await workspace(t);
  const { fontCSS, ...fontOptions } = options;
  fontOptions.fontDir = path.join(options.root, 'fonts');
  await fs.mkdir(fontOptions.fontDir);
  await fs.writeFile(path.join(fontOptions.fontDir, 'font.woff2'), 'original-font-bytes');
  await fs.writeFile(path.join(fontOptions.fontDir, 'native.css'), '@font-face{font-family:Test;src:url(font.woff2)}');
  const frame = await source(options, 'export default function Frame(){return <div data-node-id="42:1"/>}');
  const first = await buildManifest([frame], fontOptions);
  assert.equal(typeof first.fontStylesheet?.path, 'string');
  assert.match(first.fontStylesheet.path, /native\.[a-f0-9]{12}\.css$/);
  const html = await fs.readFile(first.frames[0].htmlPath, 'utf8');
  assert.match(html, /native\.[a-f0-9]{12}\.css/);
  assert.doesNotMatch(html, /url\("[^\"]*native\.css"\)/);
  await fs.appendFile(path.join(fontOptions.fontDir, 'native.css'), '/* updated font CSS */');
  const second = await buildManifest([frame], fontOptions);
  assert.notEqual(first.fontStylesheet.path, second.fontStylesheet.path);
  assert.notEqual(first.frames[0].contentHash, second.frames[0].contentHash);
});
