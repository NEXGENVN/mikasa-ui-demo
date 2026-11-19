import {escapeHtml as e, saveSessionPolicy} from './core.mjs';
import {adminReportCsv,adminReportRows} from './web-admin.mjs';

function download(data,type,filename){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function edited(s,role){s.ui.adminPermissionsEdited??={};s.ui.adminPermissionsEdited[role]=true;}
export function webAdminAction(action,el,c){
  const s=c.state;
  if(action==='wa-settings-tab')return true;
  if(action==='add-role'&&s.ui.route==='settings'){s.ui.adminRoleDialog=true;c.render();return true;}
  if(action==='wa-close-role'){s.ui.adminRoleDialog=false;c.render();return true;}
  if(action==='select-role'&&s.ui.route==='settings'){s.ui.role=el.dataset.role;c.render();return true;}
  if(action==='save-permissions'&&s.ui.route==='settings'){c.toast('Đã lưu quyền cho '+s.ui.role+'.');return true;}
  if(action==='wa-password'){const input=el.parentElement.querySelector('input');input.type=input.type==='password'?'text':'password';el.setAttribute('aria-pressed',String(input.type==='text'));el.setAttribute('aria-label',input.type==='text'?'Ẩn mật khẩu':'Hiện mật khẩu');const img=el.querySelector('img');if(img)img.src='assets/figma/'+(input.type==='text'?'36cdf':'6bde6')+'.svg';return true;}
  if(action==='wa-mfa-cancel'){el.closest('form')?.reset();return true;}
  if(action==='wa-signout'){s.ui.adminSignedOut??=[];s.ui.adminSignedOut.push(Number(el.dataset.id));c.render();return true;}
  if(action==='wa-device-reject'||action==='wa-device-approve'){s.ui.adminDeviceDecisions??={};s.ui.adminDeviceDecisions[el.dataset.id]=action==='wa-device-approve'?'Đã duyệt':'Đã từ chối';c.render();return true;}
  if(action==='export'&&s.ui.route==='reports'){
    if(el.dataset.format==='excel'){const rows=adminReportRows(s);download('\ufeff<html><head><meta charset="utf-8"></head><body><table>'+rows.map(row=>'<tr>'+row.map(x=>`<td>${e(x)}</td>`).join('')+'</tr>').join('')+'</table></body></html>','application/vnd.ms-excel;charset=utf-8','bao-cao.xls');}
    else download(adminReportCsv(s),'text/csv;charset=utf-8','bao-cao.csv');
    c.toast('Đã xuất báo cáo theo bộ lọc hiện tại.');return true;
  }
  return false;
}
export function webAdminChange(el,c){
  const s=c.state;
  if(el.hasAttribute('data-admin-policy')){const key=el.dataset.adminPolicy;saveSessionPolicy(s,{[key]:el.value});return true;}
  if(el.hasAttribute('data-admin-filter')){s.ui[el.dataset.adminFilter]=el.value;s.ui.page=1;c.render();return true;}
  if(el.hasAttribute('data-admin-role-query')){s.ui.adminRoleQuery=el.value;c.render({restoreRoleQuery:{pos:el.selectionStart??el.value.length}});return true;}
  if(el.hasAttribute('data-admin-permission')){const role=el.dataset.adminPermission==='organization'?'organization':s.ui.role;const index=Number(el.dataset.permission);s.permissions??={};s.permissions[role]??={};s.permissions[role][index]=el.checked;edited(s,role);c.render();return true;}
  if(el.hasAttribute('data-admin-group')){const organization=el.dataset.adminGroup==='organization',role=organization?'organization':s.ui.role,count=organization?4:role==='Delivery Management'?11:6;s.permissions??={};s.permissions[role]??={};for(let i=0;i<count;i++)s.permissions[role][i]=el.checked;edited(s,role);c.render();return true;}
  return false;
}
export function webAdminSubmit(form,data,c){
  const s=c.state;
  if(form.dataset.form==='wa-role'){const name=String(data.name||'').trim();if(!name){form.elements.name.setCustomValidity('Vui lòng nhập tên vai trò.');form.elements.name.reportValidity();form.elements.name.addEventListener('input',()=>form.elements.name.setCustomValidity(''),{once:true});return true;}s.roles??=[];if(!s.roles.includes(name))s.roles.push(name);s.roleDescriptions??={};s.roleDescriptions[name]=String(data.description||'').trim();s.roleActive??={};s.roleActive[name]=!!data.active;s.ui.role=name;s.ui.adminRoleQuery='';s.ui.adminRoleDialog=false;c.render();c.toast('Đã lưu vai trò.');return true;}
  if(form.dataset.form==='wa-mfa'){const input=form.elements.confirm;if(data.next!==data.confirm){input.setCustomValidity('Mật khẩu xác nhận chưa khớp.');input.reportValidity();input.addEventListener('input',()=>input.setCustomValidity(''),{once:true});return true;}if(!form.elements.acknowledge.checked){form.elements.acknowledge.reportValidity();return true;}s.preferences.adminMfa=true;c.render();c.toast('Đã kích hoạt mật khẩu cấp 2.');return true;}
  return false;
}
