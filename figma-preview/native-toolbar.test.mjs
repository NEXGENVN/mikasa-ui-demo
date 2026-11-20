import test from 'node:test';import assert from 'node:assert/strict';import {renderPreviewToolbar} from './native-toolbar.mjs';import {createDemoState} from './core.mjs';import {platforms} from './platforms.mjs';
test('the App toolbar exposes original, Full and Single copies with one selected copy',()=>{
 const state=createDemoState();Object.assign(state.ui,{platform:'app',route:'overview',previewMode:'flow',appVariant:'full'});const html=renderPreviewToolbar({state,platforms,frames:[],currentFrame:null});
 for(const id of ['standard','full','single'])assert.match(html,new RegExp('data-action="app-variant"[^>]*data-variant="'+id+'"'));
 const buttons=html.match(/<button[^>]*data-action="app-variant"[^>]*>/g);assert.equal(buttons.length,3);assert.equal(buttons.filter(b=>b.includes('aria-pressed="true"')).length,1);assert.match(buttons.find(b=>b.includes('aria-pressed="true"')),/data-variant="full"/);
 assert.match(html,/<option value="partial"/);state.ui.appVariant='single';assert.doesNotMatch(renderPreviewToolbar({state,platforms,frames:[],currentFrame:null}),/<option value="partial"/);
 state.ui.platform='web';assert.doesNotMatch(renderPreviewToolbar({state,platforms,frames:[],currentFrame:null}),/data-action="app-variant"/);
});
