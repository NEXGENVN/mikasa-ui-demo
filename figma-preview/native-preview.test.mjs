import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue,nativeRoute,frameIdFromRoute,findNativeFrame,renderNativeFrame,renderNativeOptions} from './native-preview.mjs';
const frames=[
 {id:'64:3513',platform:'web',name:'Tài khoản',width:1440,height:1024,family:'accounts',file:'native/64-3513.1234abcd.html'},
 {id:'458:15284',platform:'web-portrait',name:'Tài khoản dọc',width:1024,height:1440,family:'accounts',file:null},
 {id:'506:23873',platform:'app',name:'Tổng quát',width:390,height:844,family:'overview',file:'native/506-23873.abcd1234.html'}
];
test('native frame routes resolve exact IDs without crossing form factors',()=>{
 const c=createCatalogue(frames);assert.equal(frameIdFromRoute(nativeRoute('64:3513')),'64:3513');
 assert.equal(findNativeFrame(c,'web','figma-64-3513').id,'64:3513');
 assert.equal(findNativeFrame(c,'app','figma-64-3513','506:23873').id,'506:23873');
 assert.equal(frameIdFromRoute('figma-64-3513<script>'),null);
});
test('catalogue search handles Vietnamese accents and retains unavailable frames honestly',()=>{
 const c=createCatalogue(frames);assert.match(renderNativeOptions(c.frames,'64:3513','tai khoan'),/64-3513/);
 assert.doesNotMatch(renderNativeOptions(c.frames,'64:3513','tai khoan'),/506-23873/);
 assert.match(renderNativeOptions([{...frames[0],name:'Đăng nhập'}],'64:3513','dang nhap'),/64-3513/);
 assert.match(renderNativeOptions([{...frames[2],theme:'dark'}],'506:23873','dark'),/App · Dark/);
 const html=renderNativeFrame(c.byId.get('458:15284'));assert.match(html,/Chưa có bản preview/);assert.doesNotMatch(html,/<iframe/);
});
test('source canvas keeps native dimensions and escapes source labels',()=>{
 const c=createCatalogue(frames),html=renderNativeFrame({...c.frames[0],name:'"<script>'});
 assert.match(html,/width="1440" height="1024"/);assert.match(html,/native\/64-3513.1234abcd.html/);assert.doesNotMatch(html,/<script>/);
 assert.throws(()=>createCatalogue([{...frames[0],file:'https://example.com/evil.html'}]),/file/);
});
