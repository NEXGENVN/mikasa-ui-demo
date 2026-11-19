import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,createRequest} from './core.mjs';
import {renderWeb,webScreens} from './web.mjs';
import {renderMobile,mobileScreens} from './mobile.mjs';

test('every Web and App preview route renders after clearing sample history',()=>{
 const s=createDemoState();s.messages=[];
 for(const [route] of webScreens)assert.doesNotThrow(()=>renderWeb(s,route),route);
 for(const [route] of mobileScreens)assert.doesNotThrow(()=>renderMobile(s,route),route);
});
test('a one-OA partial scenario reports the actual failed result',()=>{
 const s=createDemoState();const row=createRequest(s,{phone:'0332225555',oaCount:1,outcome:'partial'});
 assert.equal(row.status,'failed');assert.equal(row.cost,0);
});
test('profile input is rendered as text on Web and App',()=>{
 const s=createDemoState();s.profile.name='<img src=x onerror=alert(1)>';
 s.accounts[0].name=s.profile.name;
 for(const html of [renderWeb(s,'account-detail'),renderMobile(s,'overview'),renderMobile(s,'profile')]){
  assert.equal(html.includes('<img src=x onerror=alert(1)>'),false);
  assert.equal(html.includes('&lt;img src=x onerror=alert(1)&gt;'),true);
 }
});
