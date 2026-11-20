import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceSvgPaths} from './source-svg-paths.mjs';

test('reads drawing paths through ancestor transforms and ignores definition geometry',()=>{
 const svg='<svg viewBox="100 200 30 30"><defs><path d="M0 0 H20 V20 Z"/></defs><g transform="translate(110 210)"><g transform="scale(2)"><path d="M0 0 H3 V4 Z" fill="#123456"/></g></g></svg>';
 const result=readSourceSvgPaths(svg);
 assert.equal(result.paths.length,1);
 assert.deepEqual(result.paths[0].bounds,[10,10,6,8]);
 assert.deepEqual(result.paths[0].matrix,{a:2,b:0,c:0,d:2,e:10,f:10});
});

test('computes cubic extrema rather than counting control points as visible ink',()=>{
 const result=readSourceSvgPaths('<svg viewBox="0 0 10 10"><path d="M0 0 C0 4 4 4 4 0"/></svg>');
 assert.deepEqual(result.paths[0].bounds,[0,0,4,3]);
});

test('retains XML entity text in path attributes without interpreting markup as code',()=>{
 const result=readSourceSvgPaths('<svg viewBox="0 0 10 10"><path id="A&amp;B" d="M1 2 L3 4"/></svg>');
 assert.equal(result.paths[0].id,'A&B');
});
