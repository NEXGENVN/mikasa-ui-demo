import test from 'node:test';import assert from 'node:assert/strict';
import {componentMembers,popupPosition} from './source-component-dom.mjs';
test('native component transition uses exact variant geometry and boundary controls',()=>{
 const component={field:'count',initialValue:'1',states:{'1':{controls:[{field:'count',box:[50,12,30,22]},{action:'plus',box:[88,10,26,26]}]},'5':{controls:[{field:'count',box:[66,12,30,22]},{action:'minus',box:[32,10,26,26]}]}}},session={values:{count:'5'},dirty:new Set(['count'])};
 const current=componentMembers(component,session);assert.equal(current.value,'5');assert.deepEqual(current.members.get('field:count').box,[66,12,30,22]);assert.equal(current.members.has('plus'),false);assert.equal(current.members.has('minus'),true);
});
test('native popup aligns to original component origin without viewport guesses',()=>{assert.deepEqual(popupPosition({box:[100,200,130,30]},{offset:[-4,3],width:138,height:104}),[96,203,138,104]);});
