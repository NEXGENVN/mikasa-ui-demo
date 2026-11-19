import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createDemoState} from './core.mjs';
import {renderBackups,handleBackupAction,backupRows} from './web-backups.mjs';

test('the source recovery tab retains its literal backup data in both Web orientations',()=>{
  const s=createDemoState();s.recoveries.push({id:'REC-1',email:'sample@example.com'});
  for(const orientation of ['landscape','portrait']){const html=renderBackups(s,orientation);assert.match(html,new RegExp(orientation==='portrait'?'580:27340':'557:35890'));assert.match(html,/Bản sao lưu/);assert.match(html,/BK-001/);assert.match(html,/Phạm Đức Anh/);assert.match(html,/Cấu hình hệ thống/);assert.match(html,/10 Bản/);assert.doesNotMatch(html,/REC-1|sample@example.com/);assert.equal((html.match(/data-action="web-backup-restore"/g)||[]).length,10);assert.equal((html.match(/Chờ kích hoạt/g)||[]).length,1);}
  assert.equal(backupRows[1].size,'1 GB');assert.equal(backupRows[2].pending,true);
});
test('restoring a source backup only reports the local sample action',()=>{
  const s=createDemoState(),before=JSON.stringify(s);let message='';const c={state:s,toast(value){message=value;}};
  assert.equal(handleBackupAction('web-backup-restore',{dataset:{backup:'1'}},c),true);
  assert.match(message,/mô phỏng.*BK-002/);assert.equal(JSON.stringify(s),before);
  assert.equal(handleBackupAction('unknown',{dataset:{}},c),false);
});
test('backup status dots use the original local five-pixel assets',async()=>{
  for(const asset of ['aa4cf','9460a']){const url=new URL(`assets/figma/${asset}.svg`,import.meta.url);assert.ok((await stat(url)).size);assert.match(await readFile(url,'utf8'),/<svg[^>]*width="5"[^>]*height="5"/);}
});
