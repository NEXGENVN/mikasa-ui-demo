import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNativeFrame} from './native-preview.mjs';
import {renderInteractiveFrame,interactiveControlPriority} from './interactive-preview.mjs';
import {createInteractiveSession} from './interactive-session.mjs';
const frame={id:'1:1',name:'Đăng nhập',platform:'app',width:390,height:844,file:'source-frames/1-1.123456abcdef.html'};
test('interactive mode retains the exact original canvas and places semantic fields at native coordinates',()=>{
 const source=renderNativeFrame(frame),session=createInteractiveSession({});
 const html=renderInteractiveFrame({...frame,controls:[{id:'field-1',type:'input',box:[24,300,342,48],label:'Tên đăng nhập',field:'app.login.username',value:'',placeholder:'Tên đăng nhập',textSlots:[{id:'text-1',box:[40,314,270,20],text:'Tên đăng nhập',font:{family:'Roboto',size:14,lineHeight:20,color:'#64748b'}}]},{id:'submit-1',type:'button',box:[24,503,342,48],label:'Đăng nhập',action:'app.login',submit:true}]},session);
 assert.ok(source.includes('src="source-frames/1-1.123456abcdef.html"'));
 assert.ok(html.includes('src="source-frames/1-1.123456abcdef.html"'));
 assert.match(html,/data-interactive-control="field-1"/);
 assert.match(html,/left:24px;top:300px;width:342px;height:48px/);
 assert.match(html,/<input[^>]+name="app.login.username"/);
 assert.match(html,/aria-label="Tên đăng nhập"/);
 assert.match(html,/<button type="submit"/);
 assert.doesNotMatch(html,/figma-phone|f-route-login/);
});
test('interactive fields render sample strings safely and invalid hit geometry cannot escape the source frame',()=>{
 const session=createInteractiveSession({});session.values['app.name']='"><img src=x onerror=alert(1)>';
 const control={id:'unsafe',type:'input',field:'app.name',box:[16,200,340,40],label:'Tên',value:''};
 const html=renderInteractiveFrame({...frame,controls:[control]},session);
 assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
 assert.throws(()=>renderInteractiveFrame({...frame,controls:[{...control,box:[380,0,100,40]}]},session),/bounds/i);
});
test('native input hit areas beat broad prototype parents while the exact eye icon stays clickable',()=>{
 const input={type:'input',box:[16,354,358,60]},parent={type:'button',box:[16,354,358,98]},eye={type:'button',box:[329,366,20,20]};
 const controls=[input,parent,eye];
 assert.ok(interactiveControlPriority(input,controls)>interactiveControlPriority(parent,controls));
 assert.ok(interactiveControlPriority(eye,controls)>interactiveControlPriority(input,controls));
});
