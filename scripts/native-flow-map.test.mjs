import test from 'node:test';import assert from 'node:assert/strict';import {createNativeFlowMap} from './native-flow-map.mjs';
test('known Mobile source states retain their exact flow screen when switching preview mode',()=>{
 const map=createNativeFlowMap();for(const [id,route]of [['863:1499','appearance'],['863:1189','language'],['843:51550','devices'],['852:51826','sessions'],['658:34375','forgot'],['658:34596','otp'],['843:50716','profile-edit']])assert.equal(map.get(id)?.flowRoute,route);
 assert.deepEqual(map.get('1450:9014').flowState.detail,{status:'failed',oaCount:5});
 assert.deepEqual(map.get('1086:73413').flowState.detail,{status:'scheduled',oaCount:1});
 assert.deepEqual(map.get('1214:70572').flowState.ui,{tab:'notifications'});
});
