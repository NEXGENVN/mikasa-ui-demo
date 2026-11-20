import {toCsv,validatePhone} from './core.mjs';
import {webSourceRecords} from './web-interactive-controls.mjs';
const plain=value=>String(value??'').trim();
const fold=value=>plain(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
const roleKey=value=>{const s=fold(value).replace(/^ql\s+/,'quan ly ');return ({'cskh':'cham soc khach hang','ktv':'ky thuat vien','kt vien':'ky thuat vien','quan tri':'quan tri vien'})[s]||s;};
const csv=toCsv;
const set=(session,field,value)=>{session.values[field]=value;session.dirty.add(field);};
const familyOf=frame=>frame.family==='history-detail-errors'?'history':frame.family;
const target=(frame,key)=>frame.targets?.[key];
export function initializeWebSourceData(data,records=webSourceRecords){
 if(data.__webSourceInitialized)return {initialized:false,hadAppChanges:false};
 const legacyAccounts=(data.accounts||[]).some(a=>/^demo_\d+$/.test(a.username||''));
 const legacyMessages=(data.messages||[]).some(m=>/^MK\d{4}$/.test(m.id||'')&&Number(m.id.slice(2))<1000);
 if(!legacyAccounts&&!legacyMessages&&!data.profile)return {initialized:false,hadAppChanges:false};
 const customMessages=(data.messages||[]).filter(m=>!(/^MK\d{4}$/.test(m.id||'')&&Number(m.id.slice(2))<1000)&&!String(m.id).startsWith('source-web-message-'));
 if(records.accounts?.length){const source=structuredClone(records.accounts),rest=(data.accounts||[]).slice(source.length);data.accounts=[...source,...rest];}
 if(records.messages?.length){const legacyTail=(data.messages||[]).filter(m=>/^MK\d{4}$/.test(m.id||'')&&Number(m.id.slice(2))<1000).slice(records.messages.length);data.messages=[...customMessages,...structuredClone(records.messages),...legacyTail];}
 if(records.configurations?.length){const custom=(data.configurations||[]).filter(c=>String(c.id).startsWith('cfg-'));data.configurations=[...custom,...structuredClone(records.configurations)];}
 if(records.report){data.__webSourceReport=structuredClone(records.report);const customIds=new Set(customMessages.map(m=>m.id));data.__webSourceReportIds=(data.messages||[]).filter(m=>!customIds.has(m.id)).map(m=>m.id);}
 if(data.messages?.length&&!data.messages.some(m=>m.id===data.selectedId))data.selectedId=data.messages[0].id;
 data.__webSourceInitialized=true;
 return {initialized:true,hadAppChanges:customMessages.length>0};
}
function filters(session,family){const p=`web.filter.${family}.`;return Object.fromEntries(Object.entries(session.values).filter(([k])=>k.startsWith(p)).map(([k,v])=>[k.slice(p.length),v]));}
function nativeReport(session){
 const base=session.data.__webSourceReport;if(!base||Object.values(filters(session,'reports')).some(v=>plain(v)&&!/^(all|tat ca|trang thai|vai tro|so dien thoai|kenh|oa)$/i.test(fold(v))))return null;
 const known=new Set(session.data.__webSourceReportIds||[]),current=new Set((session.data.messages||[]).map(m=>m.id));if([...known].some(id=>!current.has(id)))return null;
 const result={...base,byOa:structuredClone(base.byOa||[])},extra=(session.data.messages||[]).filter(m=>!known.has(m.id));
 for(const m of extra){result.sent=(result.sent||0)+1;result.cost=(result.cost||0)+(Number(m.cost)||0);if(['success','sent'].includes(m.status))result.success=(result.success||0)+1;const name=m.oa||'OA';let g=result.byOa.find(g=>g.name.split(' · ')[0]===name);if(!g){g={name,sent:0,cost:0};result.byOa.push(g);}g.sent++;g.cost+=Number(m.cost)||0;}
 result.average=result.sent?Math.round(result.cost/result.sent):0;result.unchanged=!extra.length;return result;
}
function sourceRows(session,family){const data=session.data;if(family==='accounts')return data.accounts||[];if(family==='oa')return data.configurations||[];return data.messages||[];}
export function filteredWebRows(session,family){
 const f=filters(session,family),query=fold(f.query),status=fold(f.status),role=fold(f.role),phone=plain(f.phone),channel=fold(f.channel),date=plain(f.date);
 return sourceRows(session,family).filter(row=>{
  if(query&&!Object.values(row).some(v=>fold(v).includes(query)))return false;
  if(phone&&!/^(tat ca|so dien thoai|all)$/i.test(fold(phone))&&!plain(row.phone).includes(phone))return false;
  if(role&&!/^(vai tro|tat ca|all)$/.test(role)&&![row.role,row.adminRole].some(v=>roleKey(v)===roleKey(role)))return false;
  if(channel&&!/^(kenh|oa|tat ca|all)$/.test(channel)&&!fold(row.channel||row.oa).includes(channel))return false;
  if(status&&!/^(trang thai|tat ca|all)$/.test(status)){
   const wanted=/tam khoa|ngung|inactive/.test(status)?family==='history'?'failed':'inactive':/hoat dong|active/.test(status)?family==='history'?'success':'active':/that bai|failed/.test(status)?'failed':/dang xu ly|pending/.test(status)?'pending':/thanh cong|success/.test(status)?'success':status;
   const actual=family==='accounts'?(row.active===false?'inactive':'active'):row.status==='sent'?'success':fold(row.status);
   if(actual!==wanted&&actual!==status)return false;
  }
  if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&row.date!==date&&!plain(row.time||row.updated).includes(date)&&!plain(row.time||row.updated).includes(date.split('-').reverse().join('/')))return false;
  return true;
 });
}
function accountValue(row,column,part=0){const c=fold(column);if(c==='stt')return '';if(/tai khoan|ten dang nhap/.test(c))return part?row.username:row.name||row.username;if(/email/.test(c))return row.email;if(/vai tro/.test(c))return row.role||row.adminRole;if(/trang thai/.test(c))return row.active===false?'Tạm khóa':'Đang hoạt động';if(/dien thoai/.test(c))return row.phone;if(/dang nhap/.test(c))return row.lastLogin||'Chưa đăng nhập';return '';}
function messageValue(row,column,part=0){const c=fold(column);if(c==='id'||/ma ban/.test(c))return row.displayId||row.id;if(/thoi gian/.test(c))return row.time;if(/dien thoai/.test(c))return row.phone;if(/trang thai/.test(c))return {success:'Gửi thành công',sent:'Gửi thành công',failed:'Gửi thất bại',pending:'Đang xử lý',partial:'Thành công một phần',scheduled:'Hẹn giờ'}[row.status]||row.status;if(/ipv4/.test(c)&&/ipv6/.test(c))return (row.ipv4||'Chưa có dữ liệu')+'\n'+(row.ipv6||'Chưa có dữ liệu');if(/ipv6/.test(c))return row.ipv6||'Chưa có dữ liệu';if(/ipv/.test(c))return row.ipv4||'Chưa có dữ liệu';if(/tai khoan/.test(c))return row.account;if(/mau|noi dung/.test(c))return row.template;if(/chi phi|so tien/.test(c))return row.cost;return row[column]??'';}
function oaValue(row,column){const c=fold(column);if(/ten|cau hinh/.test(c))return row.name;if(/kenh/.test(c))return row.channel;if(/trang thai/.test(c))return row.status;if(/cap nhat|thoi gian/.test(c))return row.updated;return '';}
const permissionControls=frame=>(frame.controls||[]).filter(c=>c.action==='web.permission'&&c.field);
const selectedRole=session=>session.context.role||session.data.ui?.role||'Director';
function rememberRolePermissions(frame,session){
 const controls=permissionControls(frame);if(!controls.length)return;session.data.permissions??={};const stored=session.data.permissions[selectedRole(session)]??={};for(const c of controls)stored[c.field]=!!session.values[c.field];
}

/** Project changed sample data only. Untouched source states keep their original SVG text. */
export function prepareWebFrame({frame,session}){
 const initialized=initializeWebSourceData(session.data);if(initialized.hadAppChanges)session.data.__webSourceInitialHadAppChanges=true;
 const signature=JSON.stringify([session.data.accounts||[],session.data.messages||[],session.data.configurations||[],session.data.roles||[],session.data.permissions||{},session.data.preferences||{}]);
 session.data.__webSourceInitialSignature??=signature;
 if(session.data.__webSourceInitialHadAppChanges||signature!==session.data.__webSourceInitialSignature)session.context.webChanged=true;
 if(session.context.webDataSignature&&session.context.webDataSignature!==signature)session.context.webChanged=true;session.context.webDataSignature=signature;
 session.context.webInitialData??=structuredClone({accounts:session.data.accounts||[],messages:session.data.messages||[],configurations:session.data.configurations||[]});
 if(frame.roleCards?.length){session.context.sourceRoles??=[];for(const card of frame.roleCards)if(!session.context.sourceRoles.includes(card.name))session.context.sourceRoles.push(card.name);}
 const permissions=session.data.permissions?.[selectedRole(session)];for(const c of permissionControls(frame)){const value=permissions&&Object.hasOwn(permissions,c.field)?permissions[c.field]:c.value??c.checked??false;if(session.values[c.field]!==value)set(session,c.field,value);}
 if(!session.context.webChanged)return;
 const family=familyOf(frame),rows=filteredWebRows(session,family);session.context.filteredRows=rows;session.context.filteredFamily=family;
 const page=Math.max(1,session.context.webPage||1),pageSize=frame.table?.pageSize||10;
 for(const row of frame.table?.rows||[]){const record=rows[(page-1)*pageSize+row.index];if(row.visibilityField)set(session,row.visibilityField,!!record);for(const item of row.slots){const value=!record?'':item.column==='STT'?String((page-1)*pageSize+row.index+1):family==='accounts'?accountValue(record,item.column,item.part):family==='oa'?oaValue(record,item.column):messageValue(record,item.column,item.part);set(session,item.field,value??'');}}
 if(frame.table?.countField){const source=frame.table.countText||'',count=/^Hiển thị/.test(source)?`Hiển thị ${rows.length?(page-1)*pageSize+1:0}–${Math.min(page*pageSize,rows.length)} trên ${rows.length} tài khoản`:/^Tổng/.test(source)?`Tổng ${rows.length}`:source?source.replace(/\d+/,String(rows.length)):`${rows.length} ${family==='accounts'?'Tài khoản':'Bản ghi'}`;set(session,frame.table.countField,count);}
 const selected=session.data.accounts?.find(a=>String(a.id)===String(session.context.accountId));
 if(selected)for(const item of frame.texts||[]){if(!item.field?.startsWith('web.account.detail.'))continue;const k=item.dataField||item.field.slice('web.account.detail.'.length);const value=k==='status'?selected.active===false?'Tạm khóa':'Đang hoạt động':k==='role'?selected.adminRole||selected.role:selected[k];if(value!=null)set(session,item.field,(item.valuePrefix||'')+value+(item.valueSuffix||''));}
 if(session.context.accountEditMode&&/accountCreate|accountEdit/.test(frame.scene||'')){set(session,'web.account.scene.title','Chỉnh sửa Admin');set(session,'web.account.scene.submit','Cập nhật thay đổi');}
 const message=session.data.messages?.find(m=>m.id===(session.context.messageId||session.data.selectedId));if(message)for(const item of frame.texts||[]){if(!item.field?.startsWith('web.history.detail.'))continue;const k=item.dataField||item.field.slice('web.history.detail.'.length);let value=message[k];if(k==='displayId')value=message.displayId||message.id;else if(k==='statusText')value={success:'Gửi thành công',sent:'Gửi thành công',failed:'Gửi thất bại',pending:'Đang xử lý',partial:'Thành công một phần',scheduled:'Hẹn giờ'}[message.status]||message.status;else if(k==='amountReceived')value=message.amountReceived!=null?new Intl.NumberFormat('vi-VN').format(message.amountReceived)+' Đ':'Chưa ghi nhận';else if(k==='port')value=message.port||'443';else if(k==='provider')value=message.provider||'VNPT';else if(k==='lastActive'||k==='openedAt')value=message[k]||message.time;else if(k==='ipv4'||k==='ipv6')value=message[k]||'Chưa có dữ liệu';else if(k==='errorCode')value=message.errorCode||(message.status==='failed'?'GATEWAY_TIMEOUT':'NO_END');else if(k==='errorMessage')value=message.errorMessage||item.text;if(value!=null)set(session,item.field,(item.valuePrefix||'')+value+(item.valueSuffix||''));}
 for(const item of frame.deviceRows||[]){const decision=session.context.deviceDecisions?.[item.id];if(decision)set(session,item.field,decision);}
 const oa=session.data.configurations?.find(c=>String(c.id)===String(session.context.oaId));if(oa)for(const item of frame.texts||[])if(item.field?.startsWith('web.oa.detail.'))set(session,item.field,oa[item.field.slice('web.oa.detail.'.length)]||'');
 const aggregate=family==='reports'?nativeReport(session):null,number=n=>new Intl.NumberFormat('vi-VN').format(n),cost=aggregate?.cost??rows.reduce((n,r)=>n+(Number(r.cost)||0),0),groups=new Map();for(const row of rows){const k=row.oa||'OA';const group=groups.get(k)||{name:k,count:0,cost:0};group.count++;group.cost+=Number(row.cost)||0;groups.set(k,group);}const grouped=aggregate?aggregate.byOa.map(g=>({name:g.name,count:g.sent,cost:g.cost})):[...groups.values()];
 for(const metric of frame.metrics||[]){let value=aggregate?.unchanged&&aggregate.metricTexts?.[metric.field]!=null?aggregate.metricTexts[metric.field]:metric.kind==='cost'&&metric.index==null?'₫ '+number(cost):metric.kind==='sent'?number(aggregate?.sent??rows.length):metric.kind==='success'?number(aggregate?.success??rows.filter(r=>['success','sent'].includes(r.status)).length):metric.kind==='failed'?number(rows.filter(r=>r.status==='failed').length):metric.kind==='pending'?number(rows.filter(r=>r.status==='pending').length):metric.kind==='average'?'₫ '+number(aggregate?.average??(rows.length?Math.round(cost/rows.length):0)):metric.kind==='oa'?grouped[metric.index]?.name||'':metric.kind==='count'?number(grouped[metric.index]?.count||0):metric.kind==='cost'?'₫ '+number(grouped[metric.index]?.cost||0):'';set(session,metric.field,value);}
 if(frame.roleCards){const deleted=session.context.deletedRoles||[],all=[...new Set([...(session.data.roles||[]),...(session.context.sourceRoles||[])])].filter(r=>!deleted.includes(r));session.context.roleRecords=all;for(const card of frame.roleCards){const name=all[card.index];set(session,card.field,name||'');set(session,card.visibilityField,!!name);}}
 for(const item of frame.sessionRows||[])set(session,item.field,!session.context.revokedSessions?.includes(item.id));
 if(session.data.preferences?.adminMfa)for(const item of frame.texts||[])if(item.field==='web.security.status')set(session,item.field,'Đã kích hoạt');
}

/** All effects are returned as data; the shared source renderer owns browser I/O. */
export function handleWebInteraction({frame,control,session,value,eventType}){
 const data=session.data,values=session.values,context=session.context,action=control.action;
 const changed=()=>{context.webChanged=true;return {repaint:true};};
 const reject=(field,message)=>({focusField:field,message});
 if(action==='web.navigate'){
  if(control.route==='accounts'||control.route==='history')context.webPage=1;
  if(control.route==='accountEdit'){context.accountEditMode=true;context.accountId??=data.accounts?.[0]?.id;}
  else if(control.route==='accountCreate'||control.targetId===target(frame,'accountCreate')){context.accountEditMode=false;delete context.accountId;for(const f of ['username','name','email','phone','password'])set(session,'web.account.'+f,'');set(session,'web.account.role','Admin');}
  return control.targetId?{targetId:control.targetId}:null;
 }
 if(action==='web.sidebar'){if(control.sourceScene==='accountEdit'){context.accountEditMode=true;context.accountId??=data.accounts?.[0]?.id;context.webChanged=true;for(const field of Object.keys(values))if(field.startsWith('web.account.'))session.dirty.add(field);}return {targetId:control.targetId};}
 if(action==='web.retry')return session.history?.length?{back:true}:{targetId:control.targetId||target(frame,'overview')};
 if(action==='web.cancel')return control.targetId?{targetId:control.targetId}:{back:true};
 if(action==='web.close')return {back:true};
 if(action==='web.value'){
  if(control.field)values[control.field]=value??values[control.field];
  if(control.field==='web.security.lifetime'){data.preferences??={};data.preferences.sessionLifetime=values[control.field];}
  if(control.field==='web.security.idle'){data.preferences??={};data.preferences.idleTimeout=values[control.field];}
  if(control.field?.startsWith('web.preferences.')){data.preferences??={};data.preferences[control.field.slice('web.preferences.'.length)]=values[control.field];}
  return {repaint:control.type==='checkbox'||control.type==='radio'||control.type==='select'};
 }
 if(action==='web.password.toggle'){context.visiblePasswords??={};context.visiblePasswords[control.field]=!context.visiblePasswords[control.field];return {repaint:true};}
 if(action==='web.auth.login'){
  const username=plain(values['web.auth.query']||values['web.auth.username']),password=plain(values['web.auth.password']);
  if(!username)return reject('web.auth.query','Vui lòng nhập tài khoản.');if(!password)return reject('web.auth.password','Vui lòng nhập mật khẩu.');
  context.authenticated=true;return {targetId:control.targetId||target(frame,'overview')};
 }
 if(action==='web.auth.next'){
  const otp=plain(values['web.auth.otp']);if(frame.scene==='otp'&&!/^\d{6}$/.test(otp))return reject('web.auth.otp','Vui lòng nhập mã xác minh gồm 6 chữ số.');
  if(frame.scene!=='otp'&&values['web.auth.phone']!==undefined&&!validatePhone(values['web.auth.phone']))return reject('web.auth.phone','Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
  if(frame.scene!=='otp'&&!plain(values['web.auth.username']||values['web.auth.phone']||values['web.auth.query']))return reject('web.auth.username','Vui lòng nhập tài khoản quản trị.');
  data.recoveries??=[];if(frame.scene!=='otp')data.recoveries.unshift({id:'REC-'+(data.recoveries.length+1),account:values['web.auth.username']||values['web.auth.query'],phone:values['web.auth.phone']||'',status:'Chờ xử lý'});
  return {targetId:control.targetId};
 }
 if(action==='web.auth.resend'){context.otpResendCount=(context.otpResendCount||0)+1;return {message:'Đã gửi lại mã xác minh mẫu.'};}
 if(action==='web.auth.password'){
  const next=plain(values['web.auth.password']);if(!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(next))return reject('web.auth.password','Mật khẩu cần ít nhất 12 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.');
  if(next!==values['web.auth.confirm'])return reject('web.auth.confirm','Mật khẩu xác nhận chưa khớp.');context.passwordChanged=true;return {targetId:control.targetId};
 }
 if(action==='web.account.open'){
  const rows=context.filteredFamily==='accounts'?context.filteredRows:filteredWebRows(session,'accounts');const a=rows?.[((context.webPage||1)-1)*(frame.table?.pageSize||10)+(control.recordIndex||0)];
  if(!a)return {message:'Chưa có tài khoản.'};context.accountId=a.id;context.webChanged=true;
  for(const k of ['name','username','email','phone'])set(session,'web.account.'+k,a[k]||'');set(session,'web.account.role',a.adminRole||a.role||'Admin');set(session,'web.account.password','');
  return {targetId:control.targetId||target(frame,'accountDetail')};
 }
 if(action==='web.account.save'){
  const username=plain(values['web.account.username']),email=plain(values['web.account.email']),phone=plain(values['web.account.phone']),password=plain(values['web.account.password']);
  if(!username||/\s/.test(username))return reject('web.account.username','Tên đăng nhập không được trống hoặc chứa khoảng trắng.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reject('web.account.email','Vui lòng nhập email hợp lệ.');
  const editing=context.accountEditMode||/account[-]?edit/i.test(frame.scene||'')||context.accountId!=null;
  if(!editing&&password.length<8)return reject('web.account.password','Mật khẩu cần ít nhất 8 ký tự.');
  if(phone&&!/^(?:0|\+?84)[\d\s]{8,12}$/.test(phone))return reject('web.account.phone','Vui lòng nhập số điện thoại hợp lệ.');
  data.accounts??=[];let a=editing?data.accounts.find(a=>String(a.id)===String(context.accountId)):null;
  if(data.accounts.some(other=>other!==a&&other.username===username))return reject('web.account.username','Tên đăng nhập đã tồn tại.');
  const permissions=Object.fromEntries(Object.entries(values).filter(([k])=>k.startsWith('web.account.permission.')).map(([k,v])=>[k.slice('web.account.permission.'.length),!!v]));
  const role=values['web.account.role']||'Admin',update={username,email,phone,name:plain(values['web.account.name'])||a?.name||username,adminRole:role,role:role==='Super Admin'?'Quản lý hệ thống':'Quản trị viên',permissions,invite:!!values['web.account.invite']};
  if(a)Object.assign(a,update);else{a={id:Math.max(0,...data.accounts.map(a=>Number(a.id)||0))+1,...update,active:true,lastLogin:'Chưa đăng nhập'};data.accounts.unshift(a);}
  context.accountId=a.id;context.webChanged=true;context.webPage=1;if(!editing){for(const field of Object.keys(values))if(field.startsWith('web.filter.accounts.')){const suffix=field.split('.').at(-1);set(session,field,suffix==='role'?'Vai trò':suffix==='status'?'Trạng thái':'');}context.filteredRows=filteredWebRows(session,'accounts');context.filteredFamily='accounts';}
  return {targetId:editing?target(frame,'accountDetail')||control.targetId:control.targetId||target(frame,'accounts'),message:editing?'Cập nhật thành công':'Tạo tài khoản thành công',repaint:true};
 }
 if(action==='web.account.disable'){const a=data.accounts?.find(a=>String(a.id)===String(context.accountId))||data.accounts?.[0];if(a)a.active=false;context.webChanged=true;return {targetId:control.targetId||target(frame,'accounts'),message:'Đã vô hiệu hóa tài khoản mẫu.'};}
 if(action==='web.filter'||action==='web.filter.clear'){
  const family=familyOf(frame);if(action==='web.filter.clear')for(const k of Object.keys(values))if(k.startsWith(`web.filter.${family}.`))set(session,k,'');
  else if(control.field)values[control.field]=value??values[control.field];
  context.webPage=1;context.filteredRows=filteredWebRows(session,family);context.filteredFamily=family;context.webChanged=true;
  const emptyTarget=target(frame,family==='accounts'?'accountsEmpty':family==='history'?'historyEmpty':'missing');
  return {repaint:eventType!=='input',...(action==='web.filter.clear'&&control.targetId?{targetId:control.targetId}:eventType!=='input'&&!context.filteredRows.length&&emptyTarget?{targetId:emptyTarget}:{})};
 }
 if(action==='web.page'){const page=context.webPage||1,max=Math.max(1,Math.ceil(filteredWebRows(session,familyOf(frame)).length/(frame.table?.pageSize||10)));context.webPage=control.value==='previous'?Math.max(1,page-1):control.value==='next'?Math.min(max,page+1):Math.min(max,Math.max(1,Number(control.value)||1));return changed();}
 if(action==='web.segment'){set(session,control.field,control.value);if(control.field?.endsWith('.status'))set(session,`web.filter.${familyOf(frame)}.status`,control.value);return changed();}
 if(action==='web.history.open'){const row=filteredWebRows(session,'history')[((context.webPage||1)-1)*(frame.table?.pageSize||15)+(control.recordIndex||0)];if(row){data.selectedId=row.id;context.messageId=row.id;context.webChanged=true;}return {targetId:row?.status==='failed'?target(frame,'failedDetail'):control.targetId||target(frame,'detail')};}
 if(action==='web.export'){
  const family=familyOf(frame),rows=filteredWebRows(session,family);let report;
  if(family==='reports'){const baseline=nativeReport(session);if(baseline)report=[['OA / tài khoản','Tin gửi','Chi phí'],...baseline.byOa.map(g=>[g.name,g.sent,g.cost])];else{const groups=new Map();for(const m of rows){const name=m.oa||'OA',r=groups.get(name)||[name,0,0];r[1]++;r[2]+=Number(m.cost)||0;groups.set(name,r);}report=[['OA / tài khoản','Tin gửi','Chi phí'],...groups.values()];}}
  else if(family==='accounts')report=[['STT','Tài khoản','Email','Vai trò','Trạng thái'],...rows.map((a,i)=>[i+1,a.username,a.email,a.role||a.adminRole,a.active===false?'Tạm khóa':'Đang hoạt động'])];
  else report=[['Mã tin','Số điện thoại','Mẫu ZNS','Thời gian','Trạng thái','OA','Chi phí'],...rows.map(m=>[m.displayId||m.id,m.phone,m.template,m.time,m.status,m.oa,m.cost])];
  const excel=control.format==='excel',text=excel?'<html><head><meta charset="utf-8"></head><body><table>'+report.map(r=>'<tr>'+r.map(c=>{let s=String(c??'');if(/^\s*[=+@-]/.test(s))s="'"+s;return '<td>'+s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</td>';}).join('')+'</tr>').join('')+'</table></body></html>':csv(report);
  return {download:{filename:family==='reports'?'bao-cao.'+(excel?'xls':'csv'):'lich-su.'+(excel?'xls':'csv'),mime:excel?'application/vnd.ms-excel;charset=utf-8':'text/csv;charset=utf-8',text}};
 }
 if(action==='web.role.select'){rememberRolePermissions(frame,session);const role=context.roleRecords?.[control.roleIndex]||control.role;context.role=role;data.ui??={};data.ui.role=role;context.webChanged=true;return {targetId:control.targetId,repaint:true};}
 if(action==='web.role.menu'){
  const role=context.roleRecords?.[control.roleIndex]||control.role;if(!role||!value)return {};
  if(value==='edit'){context.editingRole=role;set(session,'web.role.name',role);set(session,'web.role.description',data.roleDescriptions?.[role]||'');set(session,'web.role.active',data.roleActive?.[role]!==false);return {targetId:target(frame,'roleCreate')};}
  if(value==='toggle'){data.roleActive??={};data.roleActive[role]=data.roleActive[role]===false;return changed();}
  if(value==='delete'){context.deletedRoles??=[];if(!context.deletedRoles.includes(role))context.deletedRoles.push(role);data.roles=(data.roles||[]).filter(r=>r!==role);return changed();}
 }
 if(action==='web.role.save'){
  const name=plain(values['web.role.name']);if(!name)return reject('web.role.name','Vui lòng nhập tên vai trò.');data.roles??=[];if(context.editingRole&&context.editingRole!==name){context.deletedRoles??=[];context.deletedRoles.push(context.editingRole);data.roles=data.roles.filter(r=>r!==context.editingRole);}if(!data.roles.includes(name))data.roles.unshift(name);data.roleDescriptions??={};data.roleDescriptions[name]=plain(values['web.role.description']);data.roleActive??={};data.roleActive[name]=values['web.role.active']!==false;delete context.editingRole;context.role=name;context.webChanged=true;return {targetId:control.targetId||target(frame,'settings'),message:'Đã lưu vai trò.'};
 }
 if(action==='web.permission'){data.permissions??={};const role=context.role||data.ui?.role||'Director';data.permissions[role]??={};data.permissions[role][control.field]=value??values[control.field];return {repaint:true};}
 if(action==='web.permissions.save'){rememberRolePermissions(frame,session);return {message:'Đã lưu quyền cho '+selectedRole(session)+'.'};}
 if(action==='web.preferences.save'){data.preferences??={};for(const [k,v]of Object.entries(values))if(k.startsWith('web.preferences.'))data.preferences[k.slice('web.preferences.'.length)]=v;return {message:'Đã lưu thay đổi.'};}
 if(action==='web.security.save'){
  const password=plain(values['web.security.password']);if(password.length<8)return reject('web.security.password','Mật khẩu cần ít nhất 8 ký tự.');if(password!==values['web.security.confirm'])return reject('web.security.confirm','Mật khẩu xác nhận chưa khớp.');if(values['web.security.acknowledge']===false)return reject('web.security.acknowledge','Vui lòng xác nhận chính sách bảo mật.');data.preferences??={};data.preferences.adminMfa=true;context.webChanged=true;return {repaint:true,message:'Đã kích hoạt mật khẩu cấp 2.'};
 }
 if(action==='web.session.revoke'){context.revokedSessions??=[];if(!context.revokedSessions.includes(control.recordId))context.revokedSessions.push(control.recordId);return changed();}
 if(action==='web.device.approve'||action==='web.device.reject'){context.deviceDecisions??={};context.deviceDecisions[control.recordId||control.id]=action.endsWith('approve')?'Đã duyệt':'Đã từ chối';return changed();}
 if(action==='web.backup.restore'){const backup=context.webInitialData;if(backup)for(const k of ['accounts','messages','configurations'])data[k]=structuredClone(backup[k]);context.webChanged=true;return {repaint:true,message:'Khôi phục thành công'};}
 if(action==='web.oa.save'){if(!plain(values['web.oa.key']))return reject('web.oa.key','Vui lòng nhập khóa API.');if(values['web.oa.key']!==values['web.oa.confirm'])return reject('web.oa.confirm','Khóa API xác nhận chưa khớp.');data.web??={};data.web.apiKeyConfigured=true;set(session,'web.oa.key','');set(session,'web.oa.confirm','');return {repaint:true,message:'Đã lưu khóa API mẫu.'};}
 if(action==='web.oa.open'){const record=filteredWebRows(session,'oa')[((context.webPage||1)-1)*(frame.table?.pageSize||5)+(control.recordIndex||0)];if(record)context.oaId=record.id;return changed();}
 if(action==='web.oa.add'){data.configurations??=[];const name=plain(values['web.filter.oa.query'])||'OA mới '+(data.configurations.length+1),record={id:'cfg-'+(Date.now()),name,channel:frame.scene==='gif'?'GIF':frame.scene==='messages'?'Tin nhắn':'OA',status:'Hoạt động',updated:new Date().toLocaleDateString('vi-VN')};data.configurations.unshift(record);context.oaId=record.id;set(session,'web.filter.oa.query','');context.webChanged=true;return {targetId:control.targetId||target(frame,'oa'),repaint:true};}
 if(action==='web.oa.connect'||action==='web.oa.refresh'||action==='web.oa.token'){data.web??={};if(action==='web.oa.connect')data.web.connected=true;data.web.tokenVersion=(data.web.tokenVersion||48)+1;data.web.lastRefresh=Date.now();return changed();}
 if(action==='web.copy'){const row=data.messages?.find(m=>m.id===(context.messageId||data.selectedId));return {copy:String(control.copyField&&row?row[control.copyField]||'Chưa có dữ liệu':control.value||'')};}
 if(action==='web.logout'){context.authenticated=false;return {targetId:control.targetId||target(frame,'login')};}
 return null;
}
