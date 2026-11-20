import test from 'node:test';import assert from 'node:assert/strict';import {createDemoState} from './core.mjs';
import {mobileMessages} from './mobile.mjs';
const m=await import('./app-variants.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;});
test('Full and Single App copies isolate drafts, records, profile and navigation',()=>{
 assert.equal(typeof m.createAppVariantStore,'function');const base=createDemoState(),store=m.createAppVariantStore(base),full=store.get('full'),single=store.get('single'),standard=store.get('standard');
 assert.equal(standard.data,base);assert.equal(full.context.appPermissionVariant,'full');assert.equal(single.context.appPermissionVariant,'single');assert.equal(full.data.draft.oaCount,5);assert.equal(single.data.draft.oaCount,1);
 full.data.draft.phone='0987654321';full.data.messages.unshift({id:'MK9000'});full.data.profile.name='Full';full.values.test='full';full.history.push('1635:105270');
 assert.notEqual(single.data.draft.phone,full.data.draft.phone);assert.equal(single.data.messages.some(m=>m.id==='MK9000'),false);assert.notEqual(single.data.profile.name,'Full');assert.equal(single.values.test,undefined);assert.deepEqual(single.history,[]);assert.equal(base.messages.some(m=>m.id==='MK9000'),false);
});
test('reset and restart replace only the requested App session',()=>{
 assert.equal(typeof m.createAppVariantStore,'function');const store=m.createAppVariantStore(createDemoState()),full=store.get('full'),single=store.get('single');single.data.draft.phone='0987654321';full.data.messages=[];store.rememberRoute('single','history');
 const restarted=store.restart('single');assert.notEqual(restarted,single);assert.equal(restarted.data,single.data);assert.equal(restarted.data.draft.oaCount,1);assert.equal(store.get('full'),full);
 const reset=store.reset('full');assert.notEqual(reset,full);assert.equal(reset.data.messages.length,30);assert.equal(store.get('single'),restarted);assert.equal(store.route('single'),'history');assert.equal(reset.data.draft.oaCount,5);
 const newBase=createDemoState();store.bindStandard(newBase);assert.equal(store.get('standard').data,newBase);assert.equal(store.get('single'),restarted);
});
test('preview links preserve App permission variants and modes without changing Web routing',()=>{
 assert.equal(typeof m.appPreviewHash,'function');assert.equal(m.appPreviewHash({platform:'app',route:'history',mode:'flow',variant:'full'}),'#app/history?mode=flow&app=full');
 assert.equal(m.appPreviewHash({platform:'app',route:'send',mode:'source',variant:'single'}),'#app/send?app=single');assert.equal(m.appPreviewHash({platform:'app',route:'overview',mode:'flow',variant:'standard'}),'#app/overview?mode=flow');
 assert.equal(m.appPreviewHash({platform:'web-portrait',route:'history',mode:'flow',variant:'full'}),'#web-portrait/history?mode=flow');assert.equal(m.appVariantFromQuery('mode=flow&app=single'),'single');assert.equal(m.appVariantFromQuery('app=unknown'),'standard');
});
test('explicit outcome choices cannot change another App copy initial scenario',()=>{
 const store=m.createAppVariantStore(createDemoState()),ui={},full=store.get('full');full.context.appOutcomeChosen=true;
 store.get('full',ui);assert.equal(ui.appOutcomeChosen,true);store.get('single',ui);assert.equal(ui.appOutcomeChosen,false);store.get('standard',ui);assert.equal(ui.appOutcomeChosen,false);store.get('full',ui);assert.equal(ui.appOutcomeChosen,true);
});
test('Single initial and reset history samples contain exactly one OA each',()=>{
 const store=m.createAppVariantStore(createDemoState());for(const session of [store.get('single'),store.reset('single')])assert.ok(mobileMessages(session.data).every(row=>row.oaCount===1));
 assert.ok(mobileMessages(store.get('full').data).some(row=>row.oaCount>1));
});
