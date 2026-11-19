import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {buildPreviewRelease} from './build-preview-release.mjs';
test('changed source receives new entry URLs and release CSS resolves original assets',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mikasa-release-test-'));t.after(async()=>{const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep+'mikasa-release-test-'));await fs.rm(resolved,{recursive:true,force:true});});
 const base=path.join(root,'figma-preview');await fs.mkdir(base);
 await fs.writeFile(path.join(base,'app.mjs'),'export const current="first";');
 await fs.writeFile(path.join(base,'index.template.html'),'<html data-version="__BUILD_VERSION__"><link href="__FONT_URL__"><link href="__STYLE_URL__"><script src="__SCRIPT_URL__"></script>');
 await fs.mkdir(path.join(base,'assets/fonts'),{recursive:true});await fs.writeFile(path.join(base,'assets/fonts/native.css'),'@font-face{font-family:Demo;src:url(first.woff2)}');
 for(const name of ['styles','mobile','web-fidelity','web-admin','web-backups','native-preview'])await fs.writeFile(path.join(base,name+'.css'),name==='mobile'?".x{background:url('assets/figma/original.svg')}\r\n":'');
 const first=await buildPreviewRelease({root});await fs.writeFile(path.join(base,'app.mjs'),'export const current="second";');const second=await buildPreviewRelease({root});
 assert.notEqual(first.version,second.version);assert.notEqual(first.script,second.script);assert.equal(first.style,second.style);
 assert.match(await fs.readFile(path.join(base,second.style),'utf8'),/\.\.\/assets\/figma\/original\.svg/);
 assert.doesNotMatch(await fs.readFile(path.join(base,second.style),'utf8'),/\r/);
 const html=await fs.readFile(path.join(base,'index.html'),'utf8');assert.ok(html.includes(second.script));assert.ok(html.includes(second.style));assert.doesNotMatch(html,/__BUILD_VERSION__/);
 await fs.writeFile(path.join(base,'assets/fonts/native.css'),'@font-face{font-family:Demo;src:url(second.woff2)}');const third=await buildPreviewRelease({root});
 assert.notEqual(third.font,second.font);assert.notEqual(third.version,second.version);
});
