import test from 'node:test';import assert from 'node:assert/strict';
const m=await import('./dark-reference-layout.mjs').catch(e=>e.code==='ERR_MODULE_NOT_FOUND'?{}:Promise.reject(e));
test('account hit areas and editable text follow the displayed Dark reference while removed logout cannot be activated',()=>{
 assert.equal(typeof m.withDarkReferenceLayout,'function');const slot={id:'name',text:'Vinh',box:[111,136,122,26]},f={id:'1450:9744',platform:'app',controls:[{id:'profile',box:[313,150,52,24]},{id:'appearance',box:[16,268,358,42]},{id:'logout',box:[16,691,358,42],action:'app.logout'}],texts:[slot]};const next=m.withDarkReferenceLayout(f);
 assert.deepEqual(next.controls.map(c=>c.id),['profile','appearance']);assert.deepEqual(next.controls[0].box,[313,169.5,52,24]);assert.deepEqual(next.controls[1].box,[16,290,358,42]);assert.deepEqual(next.texts[0].box,[121,155.5,122,26]);assert.deepEqual(f.texts[0].box,[111,136,122,26]);assert.equal(f.controls.length,3);
});
test('Dark reference layout does not move Light, Web, modal foreground or ordinary detail controls',()=>{assert.equal(typeof m.withDarkReferenceLayout,'function');for(const f of [{id:'823:51460',platform:'app'},{id:'1450:9744',platform:'web'},{id:'1450:9014',platform:'app'}])assert.equal(m.withDarkReferenceLayout(f),f);const f={id:'1450:9996',platform:'app',controls:[{id:'verify',box:[20,760,350,40]}]};assert.deepEqual(m.withDarkReferenceLayout(f).controls[0].box,[20,760,350,40]);});

test('the late edit minute metadata matches its restored static 30 sample without forcing the session value',()=>{
 const slots=[{id:'active',text:'00',box:[224,644,126,40],font:{size:20}},{id:'muted',text:'30',box:[224,684,126,40],font:{size:18}}],frame={id:'1444:94627',platform:'app',controls:[{id:'minute',field:'app.schedule.minute',value:'00',textSlots:[slots[0]]}],calendar:{wheels:[{field:'app.schedule.minute',selectedIndex:0,slots}]}};
 const next=m.withDarkReferenceLayout(frame),wheel=next.calendar.wheels[0];assert.equal(wheel.selectedIndex,1);assert.deepEqual(wheel.slots.map(s=>[s.text,s.box]),[['00',[224,604,126,40]],['30',[224,644,126,40]]]);assert.equal(next.controls[0].textSlots[0].text,'30');assert.equal(next.controls[0].value,'00');assert.equal(frame.calendar.wheels[0].slots[0].text,'00');
 for(const id of ['1444:94357','1279:8468']){const other={...frame,id};assert.equal(m.withDarkReferenceLayout(other),other);}
});
