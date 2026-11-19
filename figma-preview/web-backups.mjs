import {escapeHtml as e} from './core.mjs';

// Literal contents of the active recovery tab in TK ngang 11 / TK dọc 3.
// These are backup rows in the design, including the person names in rows 5–10.
export const backupRows=[
  {name:'BK-001',date:'04/11/2026 02:00',type:'Toàn bộ dữ liệu',size:'245 MB'},
  {name:'BK-002',date:'03/11/2026 02:00',type:'Toàn bộ dữ liệu',size:'1 GB'},
  {name:'BK-003',date:'02/11/2026 02:00',type:'Toàn bộ dữ liệu',size:'245 MB',pending:true},
  {name:'BK-004',date:'01/11/2026 02:00',type:'Toàn bộ dữ liệu',size:'245 MB'},
  {name:'Phạm Đức Anh',date:'01/11/2026 02:00',type:'Người dùng',size:'245 MB'},
  {name:'Võ Ngọc Hà',date:'01/11/2026 02:00',type:'Cấu hình hệ thống',size:'245 MB'},
  {name:'Đặng Tuấn Kiệt',date:'01/11/2026 02:00',type:'Người dùng',size:'245 MB'},
  {name:'Bùi Phương Thảo',date:'01/11/2026 02:00',type:'Toàn bộ dữ liệu',size:'245 MB'},
  {name:'Hoàng Gia Bảo',date:'01/11/2026 02:00',type:'Người dùng',size:'245 MB'},
  {name:'Nguyễn Hoàng Phúc',date:'01/11/2026 02:00',type:'Toàn bộ dữ liệu',size:'245 MB'},
];
export function renderBackups(s,orientation='landscape'){
  const portrait=orientation==='portrait';
  return `<div class="wb-backups wb-${orientation}" data-node-id="${portrait?'580:27340':'557:35890'}"><nav class="wb-tabs" aria-label="Tài khoản"><button type="button" data-action="tab" data-tab="list">Tài khoản</button><button type="button" data-action="tab" data-tab="recovery" aria-current="page">Yêu cầu khôi phục</button></nav><section class="wb-card"><table aria-label="Yêu cầu khôi phục"><colgroup><col class="wb-col-number"><col class="wb-col-name"><col class="wb-col-type"><col class="wb-col-size"><col class="wb-col-status"><col class="wb-col-actions"></colgroup><thead><tr>${['STT','Bản sao lưu','Loại dữ liệu','Dung lượng','Trạng thái','Thao tác'].map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${backupRows.map((row,index)=>`<tr><td>${index+1}</td><th scope="row"><strong>${e(row.name)}</strong><small>${row.date}</small></th><td>${row.type}</td><td>${row.size}</td><td><span class="wb-status ${row.pending?'wb-pending':''}"><img src="assets/figma/${row.pending?'9460a':'aa4cf'}.svg" alt="">${row.pending?'Chờ kích hoạt':'Đang hoạt động'}</span></td><td><button type="button" class="wb-restore" data-action="web-backup-restore" data-backup="${index}" aria-label="Khôi phục ${e(row.name)}">Khôi phục</button></td></tr>`).join('')}</tbody></table><footer>10 Bản</footer></section></div>`;
}
export function handleBackupAction(action,el,c){
  if(action!=='web-backup-restore')return false;
  const row=backupRows[Number(el.dataset.backup)];
  if(row)c.toast(`Đã mô phỏng khôi phục bản sao lưu ${row.name}.`);
  return true;
}
