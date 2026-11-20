import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourceFieldAppearances} from './source-field-appearance.mjs';

const font={family:'Roboto',style:'Regular',size:12,weight:400,lineHeight:16,baseline:12.1,fontKey:'Roboto|Regular|400',color:'#000000'};
const input=(id,{value='',placeholder='Name',style=font,box=[0,0,200,40],slotBox=[12,12,80,16]}={})=>({id,type:'input',field:'profile.name',value,placeholder,box,textSlots:[{id:id+';text',text:value||placeholder,box:slotBox,font:style}],valueFont:font});
const frame=(id,controls,platform='app',theme='light')=>({id,platform,theme,controls});
const audit=frames=>({frames:frames.map(f=>({id:f.id,slots:f.controls.flatMap(c=>c.textSlots.map(s=>({id:s.id,status:'matched',sourcePaints:[f.paint||'#64748B']})))}))});

test('typed profile values use actual entered reference paint instead of stale black native metadata',()=>{
 const frames=[frame('empty',[input('empty')]),frame('filled',[input('filled',{value:'Vinh',placeholder:''})])];
 const result=buildSourceFieldAppearances(frames,audit(frames));
 assert.equal(result.appearances['empty;text'].color,'#64748B');
 assert.equal(result.appearances['empty;text'].valueFont.color,'#64748B');
 assert.equal(result.appearances['empty;text'].reference.slotId,'filled;text');
});

test('an entered original retains its own source typography rather than the global value font',()=>{
 const current={...font,lineHeight:24,color:'#121212'};
 const frames=[frame('filled',[input('filled',{value:'0332225555',placeholder:'',style:current})])];
 frames[0].paint='#121212';
 const result=buildSourceFieldAppearances(frames,audit(frames));
 assert.equal(result.appearances['filled;text'].valueFont.lineHeight,24);
 assert.equal(result.appearances['filled;text'].valueFont.color,'#121212');
});

test('a portrait field cannot change landscape placeholder size and baseline after typing',()=>{
 const wide={...font,size:13,lineHeight:13,baseline:11.94};
 const frames=[frame('wide',[input('wide',{style:wide,box:[0,0,280,36],slotBox:[12,10,248,15]})],'web'),frame('portrait',[input('portrait',{value:'1-07-2026',placeholder:'',style:{...font,lineHeight:22,baseline:15.1},box:[0,0,250,30],slotBox:[10,4,204,22]})],'web-portrait')];
 const result=buildSourceFieldAppearances(frames,audit(frames));
 assert.equal(result.appearances['wide;text'].valueFont.size,13);
 assert.equal(result.appearances['wide;text'].valueFont.baseline,11.94);
 assert.equal(result.appearances['wide;text'].reference.mode,'current-source');
});

test('typed references follow the actual field layout and theme rather than the first shared field sample',()=>{
 const wrong={...font,size:16,weight:500,lineHeight:24,baseline:17.46};
 const frames=[frame('empty',[input('empty')]),frame('large',[input('large',{value:'0912',placeholder:'',style:wrong,slotBox:[12,8,80,24]})]),frame('matching',[input('matching',{value:'0912',placeholder:''})]),frame('dark',[input('dark',{value:'0912',placeholder:''})],'app','dark')];
 frames[3].paint='#FFFFFF';
 const result=buildSourceFieldAppearances(frames,audit(frames));
 assert.equal(result.appearances['empty;text'].valueFont.size,12);
 assert.equal(result.appearances['empty;text'].reference.slotId,'matching;text');
});

test('entered references cannot borrow a wider field or a different text inset',()=>{
 for(const layout of [{box:[0,0,300,40],slotBox:[12,12,80,16]},{box:[0,0,200,40],slotBox:[48,12,80,16]}]){
  const frames=[frame('empty',[input('empty')]),frame('different-component',[input('different',{value:'0912',placeholder:'',style:{...font,size:16},...layout})])];
  const result=buildSourceFieldAppearances(frames,audit(frames));
  assert.equal(result.appearances['empty;text'].valueFont.size,12);
  assert.equal(result.appearances['empty;text'].reference.mode,'current-source');
 }
});
