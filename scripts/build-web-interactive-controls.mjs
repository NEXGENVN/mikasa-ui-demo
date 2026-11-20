import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {sourceControlArtwork} from '../figma-preview/source-control-artwork.mjs';
import * as sourceComponentStates from '../figma-preview/source-component-states.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const key=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
const slug=s=>key(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const routes={
 login:['67:1340','495:41658'],forgot:['64:2776','495:42245'],otp:['64:2818','495:42342'],password:['64:2905','495:42405'],passwordResult:['64:3266','495:42546'],
 overview:['1144:70434','1214:84730'],accounts:['64:3513','458:15284'],accountsEmpty:['557:35476','580:28941'],accountCreate:['64:4748','458:16759'],accountDetail:['64:5315','458:18079'],accountEdit:['98:2568','458:19300'],accountDisable:['98:2356','458:18733'],recovery:['557:35890','580:27340'],
 oa:['557:36756','458:21540'],oaAdded:['1000:85457','604:35497'],gif:['557:36948','458:22952'],messages:['557:37037','458:26862'],history:['557:49673','31:5251'],historyEmpty:['557:49626','200:7331'],detail:['557:50194','98:3079'],failedDetail:['557:50113','47:8835'],reports:['105:2990','470:16153'],security:['1214:69975','495:39196'],securityPassword:['1214:70371','1226:92877'],securityRequests:['1214:70572','1226:93090'],settings:['491:19159','552:25880'],settingsManagement:['540:26898','556:26026'],roleCreate:['540:27304','556:26290'],preferences:['516:29972','563:26019'],notifications:['516:30648','563:26191']
};
const navNames={Overview:'overview',Account:'accounts','QA / GIF':'oa',History:'history',Reports:'reports',Security:'security',Settings:'settings'};
function familyOf(f){if(f.family==='history-detail-errors')return 'history';if(f.family!=='unclassified')return f.family;return /^QA/.test(f.name)?'oa':/^T\s/.test(f.name)?'overview':f.family;}
function normalizedSceneName(name){return key(name).replace(/ngang|doc/g,'').replace(/qa\s*\/\s*gif/g,'qa').replace(/^tq /,'t ').replace(/\s+/g,' ').trim();}
function classifyScene(frame,scene=familyOf(frame)){
 const visible=frame.nodes.filter(n=>n.rendered),labels=visible.filter(n=>n.text),text=labels.map(n=>clean(n.text)).join('\n'),title=labels.find(n=>/Page title|Tiêu đề trang/i.test(n.name))?.text||'',family=familyOf(frame);
 if(family==='accounts'&&/Thông tin tài khoản/.test(text))return /Chỉnh sửa/.test(title)||/Cập nhật thay đổi/.test(text)?'accountEdit':'accountCreate';
 if(family==='accounts'&&/Chi tiết tài khoản/.test(text))return /Xác nhận vô hiệu hóa/.test(text)?'accountDisable':'accountDetail';
 if(family==='settings'&&/Tên vai trò/.test(text))return 'roleCreate';
 if(family==='settings'&&/Ngôn ngữ|Múi giờ/.test(text))return 'preferences';
 if(family==='history'&&/Chi tiết bản tin lịch sử/.test(title))return 'detail';
 if(family==='oa'){
  // Copied source tabs and search placeholders can be stale; page and list headings carry the section intent.
  const heading=key(title),lists=labels.filter(n=>/List title|Tiêu đề danh sách/i.test(n.name)).map(n=>key(n.text));
  if(/^(tin nhan|quan ly tin nhan)$/.test(heading))return 'messages';
  if(/^(gif|quan ly gif)$/.test(heading))return 'gif';
  if(lists.some(t=>t==='danh sach tin nhan'))return 'messages';
  if(lists.some(t=>t==='danh sach gif'))return 'gif';
  if(lists.some(t=>t==='danh sach / cau hinh'))return scene;
  const byId=new Map(visible.map(n=>[n.id,n])),active=visible.find(n=>/Active tab indicator/i.test(n.name)),tab=key(byId.get(active?.parentId)?.name);
  if(tab==='tab tin nhan')return 'messages';if(tab==='tab gif')return 'gif';
 }
 return scene;
}

export function buildWebSourceRecords(frames){
 const rows=id=>frames[id]?.table?.rows||[];
 const values=(row,pattern)=>row.slots.filter(s=>pattern.test(key(s.column))).sort((a,b)=>(a.part||0)-(b.part||0)).map(s=>clean(s.text));
 const detail=Object.fromEntries((frames['557:50194']?.texts||[]).filter(t=>t.dataField).map(t=>[t.dataField,t.text]));
 const accounts=rows('64:3513').map((r,i)=>{const names=values(r,/^tai khoan$/),role=values(r,/vai tro/)[0]||'Quản trị viên';return {id:'source-web-account-'+i,name:names[0]||'',username:names[1]||'',email:values(r,/email/)[0]||'',role,adminRole:role==='Quản lý hệ thống'?'Super Admin':'Admin',active:!values(r,/trang thai/).some(v=>/tam khoa|ngung/.test(key(v))),lastLogin:values(r,/dang nhap/)[0]||'Chưa đăng nhập',phone:i===0?'+84 912 345 678':''};});
 const messages=rows('557:49673').map((r,i)=>{const displayed=values(r,/^id$/)[0]||String(i+1),time=values(r,/thoi gian/)[0]||'',date=/([0-3]\d)\/([01]\d)\/(\d{4})/.exec(time),state=key(values(r,/trang thai/)[0]),ips=values(r,/ipv/).join(' ').split(/\s+/);return {id:'source-web-message-'+i,displayId:displayed,phone:values(r,/dien thoai/)[0]||'',time,date:date?`${date[3]}-${date[2]}-${date[1]}`:'',status:/that bai/.test(state)?'failed':/dang xu ly|cho/.test(state)?'pending':/mot phan/.test(state)?'partial':'success',ipv4:ips.find(v=>/^(?:\d{1,3}\.){3}\d{1,3}$/.test(v))||'',ipv6:ips.find(v=>v.includes(':')&&/^[\da-f:.]+$/i.test(v))||'',account:accounts[i%Math.max(1,accounts.length)]?.name||'',template:detail.template||'Thông báo đơn hàng',oa:'OA chính',oaCount:1,cost:0,port:detail.port||'443',provider:detail.provider||'VNPT',...(!/that bai|dang xu ly|cho/.test(state)&&detail.amountReceived?{amountReceived:Number(detail.amountReceived.replace(/\D/g,''))}:{}),lastActive:detail.lastActive||time,openedAt:detail.openedAt||time};});
 const configurations=rows('557:36756').map((r,i)=>({id:'source-web-configuration-'+i,name:values(r,/ten|cau hinh/)[0]||'',channel:values(r,/kenh/)[0]||'OA',status:values(r,/trang thai/)[0]||'',updated:values(r,/cap nhat/)[0]||''}));
 const reportFrame=frames['105:2990'];let report;
 if(reportFrame?.metrics?.length){const text=new Map((reportFrame.texts||[]).map(t=>[t.field,t.text])),number=s=>{const v=String(s||'').replace(/[^\d.,MK]/gi,'');return /[MK]$/i.test(v)?Number(v.slice(0,-1).replaceAll('.','').replace(',','.'))*(/M$/i.test(v)?1e6:1e3):Number(v.replace(/[^\d]/g,''));};const byOa=[];report={metricTexts:Object.fromEntries(text)};for(const m of reportFrame.metrics){const value=text.get(m.field)||'';if(m.index==null)report[m.kind]=number(value);else{byOa[m.index]??={name:'',sent:0,cost:0};if(m.kind==='oa')byOa[m.index].name=value;else byOa[m.index][m.kind==='count'?'sent':'cost']=number(value);}}report.byOa=byOa;for(const m of messages)m.cost=report.average||0;}
 return {accounts,messages,configurations,...(report?{report}:{})};
}

export function buildWebInteractiveFrames(allFrames){
 const frames=allFrames.filter(f=>['web','web-portrait'].includes(f.platform));
 const byId=new Map(frames.map(f=>[f.id,f]));
 const collapsed=f=>/thu nhỏ/i.test(f.group||'');
 const sourceTexts=f=>new Set(f.nodes.filter(n=>n.rendered&&n.text&&n.bbox[0]>(collapsed(f)?100:f.platform==='web-portrait'?260:350)).map(n=>clean(n.text)));
 const fingerprints=new Map(frames.map(f=>[f.id,sourceTexts(f)]));
 const descriptors=new Map(frames.map(f=>{const visible=f.nodes.filter(n=>n.rendered),texts=visible.filter(n=>n.text).map(n=>clean(n.text)),title=visible.find(n=>/Page title/i.test(n.name))?.text||'',body=texts.join('\n');let scene=classifyScene(f);if(visible.filter(n=>/^Loading/i.test(n.name)).length>10&&texts.length<10)scene+=':loading';else if(/Thông tin tài khoản/.test(body))scene+=':account-form';else if(/Chi tiết tài khoản/.test(body))scene+=':account-detail';else if(/Tên vai trò/.test(body))scene+=':role-form';else if(/Nhập mật khẩu mới và xác nhận|Thiết lập mật khẩu cấp 2/.test(body))scene+=':security-password';else if(/Yêu cầu đang chờ/.test(body))scene+=':security-requests';else if(/Bản sao lưu/.test(body))scene+=':recovery';else if(/Ngôn ngữ|Múi giờ/.test(body))scene+=':preferences';if(/Xác nhận vô hiệu hóa|Bạn muốn vô hiệu hóa/.test(body))scene+=':disable';if(texts.some(t=>t==='Chưa có dữ liệu')&&['accounts','history','oa'].includes(familyOf(f)))scene+=':empty';return [f.id,{scene,title:key(title)}];}));
 function equivalent(frame,target,wantCollapsed){
  const d=descriptors.get(target.id),reference=fingerprints.get(target.id);const candidates=frames.filter(f=>f.platform===target.platform&&collapsed(f)===wantCollapsed&&familyOf(f)===familyOf(target));
  const score=f=>{const other=descriptors.get(f.id),set=fingerprints.get(f.id),intersection=[...set].filter(t=>reference.has(t)).length,union=new Set([...set,...reference]).size;return (other.scene===d.scene?1000:-1000)+(other.title===d.title?100:0)+(intersection/(union||1))*100;};
  return candidates.sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0]?.id||target.id;
 }
 function counterpart(frame,targetId){
  const target=byId.get(targetId);if(!target||frame.platform==='web-portrait'||!collapsed(frame))return targetId;
  return equivalent(frame,target,true);
 }
 function targetsFor(f){return Object.fromEntries(Object.entries(routes).map(([r,ids])=>[r,counterpart(f,ids[f.platform==='web-portrait'?1:0])]).filter(([,id])=>byId.has(id)));}
 const output={};
 for(const frame of frames){
  const nodes=frame.nodes.map(n=>n.scrollBBox?{...n,rendered:n.scrollRendered,clippedBBox:n.scrollBBox}:n),byNode=new Map(nodes.map(n=>[n.id,n]));
  const descendants=n=>nodes.filter(c=>{if(c.id.startsWith(n.id+';'))return true;if(c.id.includes(';'))return false;let p=byNode.get(c.parentId);while(p){if(p.id===n.id)return true;p=byNode.get(p.parentId);}return false;});
  const texts=n=>descendants(n).filter(c=>c.rendered&&c.text);
  const ancestors=n=>{const a=[];let p=byNode.get(n.parentId);while(p){a.push(p);p=byNode.get(p.parentId);}return a;};
  const slot=n=>{const record={id:n.id,box:n.bbox,text:n.text,font:n.font};
   const clips=ancestors(n).filter(p=>p.id!==frame.id&&p.clipsContent);
   if(!clips.length)return record;
   const clip=clips.reduce((a,p)=>{const b=p.bbox,x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]);return[x,y,Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-x),Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-y)];},[0,0,frame.width,1e7]),b=n.bbox;
   if(b[0]<clip[0]-.01||b[1]<clip[1]-.01||b[0]+b[2]>clip[0]+clip[2]+.01||b[1]+b[3]>clip[1]+clip[3]+.01)record.sourceClipBox=clip;
   return record;
  };
  const targets=targetsFor(frame),family=familyOf(frame),visibleTexts=nodes.filter(n=>n.rendered&&n.text),text=visibleTexts.map(n=>clean(n.text)).join('\n');
  const title=visibleTexts.find(n=>/Page title|Tiêu đề trang/i.test(n.name))?.text||'';
  const scene=classifyScene(frame,Object.entries(targets).find(([,id])=>id===frame.id)?.[0]||family);
  const controls=[],used=new Set();
  const add=(n,c)=>{if(used.has(n.id)||!n.rendered||n.clippedBBox[2]<=0||n.clippedBBox[3]<=0)return;used.add(n.id);const stateAction=n.prototypeInteractions?.filter(i=>i.event?.interactionType==='ON_CLICK').flatMap(i=>i.actions||[]).find(a=>a.navigationType==='SWAP_STATE'&&a.transitionNodeID);const popupTargetId=stateAction?`${stateAction.transitionNodeID.sessionID}:${stateAction.transitionNodeID.localID}`:null;controls.push({id:n.id,type:'button',box:n.clippedBBox,label:clean(c.label||texts(n).map(t=>t.text).join(' ')||n.name),...(n.masterId?{sourceMasterId:n.masterId}:{}),...(c.type==='select'&&popupTargetId?{popupTargetId}:{}),...c});};
  const buttonBox=n=>{for(const p of ancestors(n)){if(/Frame 62965|^Tab /i.test(p.name)&&p.bbox[2]<=150&&p.bbox[3]>=14&&p.bbox[3]<=64)return p;if(p.bbox[2]>frame.width*.8||p.bbox[3]>80)continue;if(p.bbox[2]>=n.bbox[2]&&p.bbox[3]>=20&&p.bbox[3]<=64&&p.bbox[2]<=700&&!/Breadcrumb|Page title|Status text|Table header|Column header|Role name|Title|Label Container/i.test(p.name)){if(p.bbox[3]<30&&texts(p).length>1&&!/button|action|tab/i.test(p.name))return n;return p;}}return null;};
  const nearLabel=n=>{const p=byNode.get(n.parentId);if(!p)return '';return texts(p).filter(t=>t.id!==n.id&&!t.id.startsWith(n.id+';')&&t.bbox[1]+t.bbox[3]<=n.bbox[1]+2&&n.bbox[1]-t.bbox[1]<42).sort((a,b)=>b.bbox[1]-a.bbox[1])[0]?.text||'';};
  const inSidebar=n=>ancestors(n).some(p=>/Sider bar|sidebar/i.test(p.name));
  const placeholder=s=>/^(nhap|tim |chon |dd\/|tai khoan$|mat khau$|\*|•|\+?84\s|0{4,})/i.test(key(s));
  function fieldFor(label,filter=false){const l=key(label);const prefix=filter?`web.filter.${family}.`:scene==='roleCreate'?'web.role.':family==='security'?'web.security.':family==='auth'?'web.auth.':family==='oa'?'web.oa.':scene==='preferences'?'web.preferences.':'web.account.';
   let suffix=/xac nhan|nhap lai/.test(l)?'confirm':/mat khau|password/.test(l)?'password':/email/.test(l)?'email':/so dien thoai|phone/.test(l)?'phone':/ten dang nhap|tai khoan quan tri/.test(l)?'username':/ho va ten/.test(l)?'name':/ten vai tro/.test(l)?'name':/mo ta/.test(l)?'description':/ma mfa|otp|xac minh/.test(l)?'otp':/api/.test(l)?'key':/tim|search|tai khoan$/.test(l)?'query':/trang thai/.test(l)?'status':/vai tro/.test(l)?'role':/kenh|^oa$/.test(l)?'channel':/thoi gian treo/.test(l)?'lifetime':/thoi gian cho/.test(l)?'idle':/thoi gian|ngay|date|calender|calendar/.test(l)?'date':slug(label)||'value';return prefix+suffix;
  }
  // Sidebar nodes are expanded real instances, including their exact compact variants.
  for(const n of nodes.filter(n=>n.rendered)){
   if(navNames[n.name]&&inSidebar(n))add(n,{action:'web.navigate',route:navNames[n.name],targetId:targets[navNames[n.name]],label:texts(n).map(t=>t.text).join(' ')||n.name});
   if(/^(sidebar-right|Thu nhỏ)$/.test(n.name)||(collapsed(frame)&&n.name==='logo'&&inSidebar(n)&&n.bbox[1]<130)){
    const destination=equivalent(frame,frame,!collapsed(frame));
    if(destination!==frame.id)add(n,{action:'web.sidebar',sourceScene:scene,targetId:destination,label:collapsed(frame)?'Mở thanh bên':'Thu nhỏ thanh bên'});
   }
  }
  // Use actual input rectangles, even when copied Figma node names retain stale labels.
  const inputNames=/input$|^Input$|^Role Search$|^Filter option$|^Tìm kiếm$|^Date filter$|^Date Field$|^Khoảng thời gian$|^calender$|^T\/g treo$|^Trạng thái$|^Số điện thoại$|^Kênh\s*$|^Tổng quan$|^Phone filter$|^Status filter$|^ngôn ngữ$|^Múi\s+giờ$|^lịch cài đặt$|^Định dạng giờ$|^Số dòng$|^Khoảng thời gian mặc định$|^Role Name Input Container$|^Description Input Container$/i;
  for(const n of nodes){
   const [x,y,w,h]=n.bbox;if(!n.rendered||!['FRAME','INSTANCE'].includes(n.type)||w<60||h<24||h>(/Description Input Container/.test(n.name)?130:80)||inSidebar(n))continue;
   const own=texts(n),secret=own.some(t=>/^[•*]{3}/.test(t.text));
   if(!inputNames.test(n.name)&&!(secret&&h<=60))continue;
   if(descendants(n).some(c=>c.rendered&&(/input$/i.test(c.name)||c.name==='Filter option')&&['FRAME','INSTANCE'].includes(c.type)&&c.bbox[2]>=60&&c.bbox[3]>=24&&c.bbox[3]<h))continue;
   if(ancestors(n).some(p=>used.has(p.id)&&controls.find(c=>c.id===p.id)?.type==='input'))continue;
   const nearby=nearLabel(n),label=clean(nearby||own[0]?.text||n.name.replace(/ input$/i,'')),content=clean(own[0]?.text||'');
   const dateLike=/date|calender|^Khoảng thời gian$/i.test(n.name)||/^DD\/MM\/YYYY$/i.test(content);
   const isFilter=(dateLike||/filter|search|Tìm kiếm|Trạng thái|Số điện thoại|Kênh|Tổng quan|Date|Khoảng thời gian|calender/i.test(n.name))&&!(/input/i.test(n.name))&&scene!=='roleCreate'&&!/API|khóa|mật khẩu/i.test(label);
   const select=!dateLike&&/Trạng thái|Tổng quan|Số điện thoại$|Kênh|T\/g treo|Phone filter|Status filter|ngôn ngữ|Múi\s+giờ|lịch cài đặt|Định dạng giờ|Số dòng|Khoảng thời gian mặc định/i.test(n.name);
   const field=fieldFor(/T\/g treo/.test(n.name)?nearby:dateLike?'Ngày':/^Role Search$/i.test(n.name)?'Tìm vai trò':label,isFilter&&!/T\/g treo/.test(n.name));
   const sourceOptions=descendants(n).filter(t=>t.visible&&t.text&&!t.rendered).map(t=>clean(t.text)).filter(t=>t&&t!==content);
   const inputType=/password/.test(field)||secret?'password':/email/.test(field)?'email':/phone/.test(field)?'tel':/date/.test(field)?'date':'text';
   let options=[...new Set([content,...sourceOptions])].map(label=>({label,value:label}));
   if(select&&options.length<2){const labels=/status/.test(field)?['Trạng thái','Đang hoạt động','Tạm khóa']:/role/.test(field)?['Vai trò','Admin','Super Admin']:/lifetime|idle/.test(field)?['30 phút','1 giờ','8 giờ']:['Tất cả'];options=labels.map(label=>({label,value:label}));}
   add(n,{type:select?'select':'input',label,field,action:isFilter?'web.filter':'web.value',onInput:isFilter&&!select,onChange:true,value:placeholder(content)?'':content,placeholder:placeholder(content)?content:undefined,inputType,...(field.endsWith('.otp')?{maxLength:6,inputMode:'numeric',autocomplete:'one-time-code'}:{}),...(/Description Input Container/.test(n.name)?{multiline:true}:{}),...(select?{options}:{}),textSlots:own.filter(t=>t.bbox[1]>=y&&t.bbox[1]+t.bbox[3]<=y+h+1).map(slot),...(inputType==='password'?{autocomplete:family==='auth'&&scene==='login'?'current-password':'new-password'}:{})});
  }
  // Native binary controls retain exact graphics from the provided source frames.
  for(const n of nodes){if(!n.rendered||inSidebar(n)||!(/check.?box|^On OFF$|^Toggle Group$|^Radio |^chấm chọn quyền$|^Component 10[12]$/i.test(n.name))||n.bbox[2]>80||n.bbox[3]>50)continue;
   const p=byNode.get(n.parentId),label=clean(p?texts(p).map(t=>t.text).join(' '):n.name),isRadio=/Radio |chấm chọn quyền/.test(n.name),own=descendants(n).filter(c=>c.rendered),toggle=/On OFF|Toggle Group/.test(n.name),checked=toggle?own.some(c=>c.type==='ELLIPSE'&&c.bbox[0]-n.bbox[0]>n.bbox[2]/2):own.some(c=>c.type==='VECTOR'||/Selected|check|tick/i.test(c.name));
   const permissionGroup=ancestors(n).find(p=>/Department Permissions|Human Resources Permissions|Permission Group/.test(p.name));
   const field=isRadio?'web.account.role':scene==='roleCreate'&&toggle?'web.role.active':family==='settings'&&toggle?`web.preferences.${slug(label)}`:family==='settings'?`web.permission.${slug(permissionGroup?.name||'organization')}.${slug(label)}`:family==='security'?'web.security.acknowledge':/Ghi nhớ/.test(label)?'web.auth.remember':/lời mời/.test(label)?'web.account.invite':`web.account.permission.${slug(label)}`;
   const graphics=isRadio?{on:'64:5157',off:'64:5162'}:toggle&&['540:27698','540:27700'].includes(n.masterId)?{on:'540:27698',off:'540:27700'}:toggle&&n.bbox[2]===64?{on:n.masterId?.startsWith('557:')?'557:34964':'540:24475',off:n.masterId?.startsWith('557:')?'557:34962':'540:24476'}:!toggle?{on:'64:2769',off:'64:2770'}:null;
   add(n,{type:isRadio?'radio':'checkbox',action:field.startsWith('web.permission.')?'web.permission':'web.value',onChange:true,label,field,value:isRadio?/Super/.test(n.name+' '+label)?'Super Admin':'Admin':checked,checked,masterId:n.masterId,...(isRadio&&p&&p.bbox[2]>100?{cardNodeId:p.id,cardBox:p.clippedBBox}:{}),...(graphics&&sourceControlArtwork[graphics.on]&&sourceControlArtwork[graphics.off]?{checkedAsset:sourceControlArtwork[graphics.on].file,uncheckedAsset:sourceControlArtwork[graphics.off].file}:{})});
  }
  function actionFor(label,n){
   const l=key(label),p=byNode.get(n.parentId),parentName=p?.name||'';
   if(family==='settings'&&['director','delivery management','branch head','admi kpi','employee','user'].includes(l))return {action:'web.role.select',role:label,targetId:l==='delivery management'?targets.settingsManagement:targets.settings};
   if(/^(Nhãn bước|Số bước)|Tiêu đề$|^Title$|Page title/i.test(n.name))return null;
   if(l==='quen mat khau?')return {action:'web.navigate',targetId:targets.forgot};
   if(l==='quay lai dang nhap')return {action:'web.navigate',targetId:targets.login};
   if(l==='dang nhap')return scene==='login'?{action:'web.auth.login',submit:true,targetId:targets.overview}:{action:'web.navigate',targetId:targets.login};
   if(family==='auth'&&(/^(gui ma|gui yeu cau|tiep tuc|xac minh|xac nhan ma)/.test(l)||l==='tiep')&&l.length<60)return {action:'web.auth.next',submit:true,targetId:scene==='otp'?targets.password:targets.otp};
   if(/gui lai/.test(l))return {action:'web.auth.resend'};
   if(/^(cap nhat mat khau|doi mat khau)$/.test(l))return {action:'web.auth.password',submit:true,targetId:targets.passwordResult};
   if(l==='tao tai khoan')return /submit/i.test(parentName)?{action:'web.account.save',submit:true,targetId:targets.accounts}:{action:'web.navigate',route:'accountCreate',targetId:targets.accountCreate};
   if(l==='chinh sua')return {action:'web.navigate',route:'accountEdit',targetId:targets.accountEdit};
   if(l==='vo hieu hoa')return scene==='accountDisable'?{action:'web.account.disable',targetId:targets.accounts}:{action:'web.navigate',targetId:targets.accountDisable};
   if(l==='tam thoi')return {action:'web.account.disable',targetId:targets.accounts};
   if(/^huy$|^quay lai/.test(l))return {action:'web.cancel',targetId:scene==='accountCreate'?targets.accounts:scene==='accountEdit'?targets.accountDetail:scene==='accountDisable'?targets.accountDetail:scene==='roleCreate'?targets.settings:undefined};
   if(l==='xoa bo loc')return {action:'web.filter.clear',targetId:targets[family]};
   if(l==='thu lai')return targets[family]?{action:'web.navigate',targetId:targets[family]}:{action:'web.retry',targetId:targets.overview};
   if(l==='ve trang chu')return {action:'web.navigate',targetId:targets.overview};
   if(l==='tao vai tro'||l==='them vai tro')return {action:'web.navigate',targetId:targets.roleCreate};
   if(family==='oa'&&/^(tao moi|them moi|them cau hinh|tao cau hinh|them gif|tao tin nhan)$/.test(l))return {action:'web.oa.add',targetId:targets[scene==='gif'?'gif':scene==='messages'?'messages':'oaAdded']};
   if(l==='luu vai tro')return {action:'web.role.save',submit:true,targetId:targets.settings};
   if(l==='luu')return {action:'web.permissions.save'};
   if(l==='luu thay doi'||l==='cap nhat thay doi')return {action:family==='accounts'?'web.account.save':'web.preferences.save',submit:true,targetId:family==='accounts'?targets.accountDetail:undefined};
   if(l==='khoi phuc')return {action:'web.backup.restore',recordId:p?.id};
   if(/thiet lap mat khau/.test(l)&&/action|button/i.test(parentName))return {action:'web.security.save',submit:true};
   if(l==='dang xuat')return {action:family==='security'?'web.session.revoke':'web.logout',recordId:p?.id,targetId:family==='security'?undefined:targets.login};
   if(l==='duyet yeu cau')return {action:'web.device.approve',recordId:p?.parentId};
   if(l==='tu choi')return {action:'web.device.reject',recordId:p?.parentId};
   if(l==='ket noi zalo oa'&&/action|zalo oa/i.test(parentName))return {action:'web.oa.connect'};
   if(/^lam moi/.test(l))return {action:/token/.test(l)?'web.oa.token':'web.oa.refresh'};
   if(/luu khoa api/.test(l))return {action:'web.oa.save',submit:true};
   if(/^csv$|xuat csv|tai csv/.test(l))return {action:'web.export',format:'csv'};
   if(/^excel$|xuat excel/.test(l))return {action:'web.export',format:'excel'};
   const tabs={oa:'oa',gif:'gif','tin nhan':'messages','cau hinh':family==='settings'?'settings':'security','thong bao':family==='security'?'securityRequests':'notifications','tai khoan':family==='security'?'securityPassword':family==='settings'?'preferences':'accounts','yeu cau khoi phuc':'recovery'};
   if(tabs[l]&&/tab|Frame 62965|Component|Cài đặt|vai trò/i.test(parentName))return {action:'web.navigate',targetId:targets[tabs[l]],route:tabs[l]};
   if(['so tin','so tien','luot gui','chi phi','tat ca','thanh cong','that bai','dang xu ly'].includes(l)&&/button|Frame|segment|filter|Component/i.test(parentName))return {action:'web.segment',field:`web.${family}.${['so tin','so tien'].includes(l)?'chart':['luot gui','chi phi'].includes(l)?'rank':'status'}`,value:label};
   if(/quan ly mfa/.test(l))return {action:'web.navigate',targetId:targets.securityPassword};
   return null;
  }
  for(const n of visibleTexts){if(inSidebar(n))continue;const action=actionFor(clean(n.text),n);if(!action)continue;const box=buttonBox(n);if(box&&!controls.some(c=>c.id===box.id&&c.type!=='button'))add(box,{...action,label:clean(n.text)});}
  for(const n of nodes){
   if(!n.rendered||used.has(n.id)||inSidebar(n))continue;
   if(/show pass|eye|view-off|^eye-off$/i.test(n.name)&&n.bbox[2]<=40)add(n,{action:'web.password.toggle',field:controls.find(c=>c.type==='input'&&n.id.startsWith(c.id+';'))?.field,label:'Hiện mật khẩu'});
   if(/^Close button$/i.test(n.name))add(n,{action:ancestors(n).some(p=>/Toast/i.test(p.name))?'web.navigate':'web.close',...(ancestors(n).some(p=>/Toast/i.test(p.name))?{targetId:targets[family]}:{}),label:'Đóng'});
   if(/^ellipsis$/.test(n.name)&&family==='settings'){const role=ancestors(n).map(p=>texts(p).map(t=>t.text).find(t=>/^(Director|Delivery Management|Branch Head|Admi KPI|Employee|User)$/.test(t))).find(Boolean);add(n,{type:'select',action:'web.role.menu',field:'web.role.menu',value:'',role,onChange:true,label:'Thao tác vai trò '+(role||''),options:[{label:'Thao tác',value:''},{label:'Chỉnh sửa',value:'edit'},{label:'Đổi trạng thái',value:'toggle'},{label:'Xóa',value:'delete'}]});}
   if(/sao chép|copy/i.test(n.name)&&n.bbox[2]<=40){const p=byNode.get(n.parentId),value=p?texts(p).map(t=>t.text).join(' '):'';add(n,{action:'web.copy',value,...(family==='history'?{copyField:value.includes(':')?'ipv6':'ipv4'}:{}),label:'Sao chép'});}
   if(/^Frame 629(496|187|492|493|494|495|491)$/.test(n.name)&&n.bbox[2]<=40)add(n,{action:'web.page',value:n.name==='Frame 629496'?'previous':n.name==='Frame 629491'?'next':texts(n)[0]?.text||'1',label:n.name==='Frame 629496'?'Trang trước':n.name==='Frame 629491'?'Trang sau':'Trang '+(texts(n)[0]?.text||'1')});
   if(n.prototypeInteractions?.some(i=>i.event?.interactionType==='ON_CLICK')){const interaction=n.prototypeInteractions.find(i=>i.event?.interactionType==='ON_CLICK'),a=interaction.actions?.[0],destination=a?.transitionNodeID?`${a.transitionNodeID.sessionID}:${a.transitionNodeID.localID}`:null;if(destination&&byId.has(destination))add(n,{action:'web.navigate',targetId:destination});}
  }
  // Account and history identifiers are source table cells, not invented row hit areas.
  const dynamicTexts=[],visibility=[];let table;
  if(['accounts','history','oa','reports'].includes(family)){
   const inTable=n=>ancestors(n).some(p=>/Daily summary table|Records table|Summary Table|Bảng dữ liệu/i.test(p.name));
   const cellShape=n=>n.type==='INSTANCE'&&n.rendered&&n.bbox[2]>=40&&n.bbox[2]<600&&n.bbox[3]>=28&&n.bbox[3]<=70&&texts(n).length>0;
   const cells=nodes.filter(n=>cellShape(n)&&inTable(n)&&!ancestors(n).some(p=>cellShape(p)));
   const grouped=new Map();for(const cell of cells){const y=Math.round(cell.bbox[1]*10)/10;if(!grouped.has(y))grouped.set(y,[]);grouped.get(y).push(cell);}
   const groups=[...grouped].sort(([a],[b])=>a-b).map(([,cells])=>cells.sort((a,b)=>a.bbox[0]-b.bbox[0]));
   const headerIndex=groups.findIndex(g=>g.some(c=>texts(c).some(t=>/^(STT|Tài khoản|ID|OA|Tên OA|Email)$/i.test(clean(t.text)))));
   if(headerIndex>=0&&groups[headerIndex].length>=2){
    const header=groups[headerIndex].map((c,i)=>({x:c.bbox[0],name:clean(texts(c)[0]?.text||String(i)),index:i}));
    const dataGroups=groups.slice(headerIndex+1).filter(g=>g.length>=2);
    const rows=dataGroups.map((cells,index)=>{const visibilityField=`web.table.${family}.${index}.visible`,slots=[];
     for(const cell of cells){const col=[...header].sort((a,b)=>Math.abs(a.x-cell.bbox[0])-Math.abs(b.x-cell.bbox[0]))[0];const content=texts(cell).sort((a,b)=>a.bbox[1]-b.bbox[1]);
      for(const [part,t]of content.entries()){const item={...slot(t),field:`web.table.${family}.${index}.${col.index}.${part}`,column:col.name,part};slots.push(item);dynamicTexts.push(item);}
      visibility.push({id:cell.id,box:cell.clippedBBox,field:visibilityField});for(const c of controls)if(c.id===cell.id||c.id.startsWith(cell.id+';'))c.visibilityField=visibilityField;
      if(family==='accounts'&&/^Tài khoản$/i.test(col.name))add(cell,{action:'web.account.open',recordIndex:index,targetId:targets.accountDetail,label:clean(content.map(t=>t.text).join(' ')),visibilityField});
      if(family==='history'&&/^ID$/i.test(col.name))add(cell,{action:'web.history.open',recordIndex:index,targetId:targets.detail,label:clean(content.map(t=>t.text).join(' ')),visibilityField});
     }return {index,visibilityField,slots};});
    table={pageSize:Math.max(1,rows.length),rows};
    const count=visibleTexts.find(t=>/Result count/i.test(t.name)||/^(Hiển thị|Tổng \d|\d+ Tài khoản)/.test(t.text));if(count){table.countField=`web.table.${family}.count`;table.countText=count.text;dynamicTexts.push({...slot(count),field:table.countField});}
   }
  }
  if(family==='oa'&&!table){const header=nodes.find(n=>n.rendered&&/^Table header$/i.test(n.name));const headers=header?texts(header).sort((a,b)=>a.bbox[0]-b.bbox[0]):[];const sourceRows=nodes.filter(n=>n.rendered&&/^Record row \d+$/i.test(n.name));if(headers.length&&sourceRows.length){const rows=sourceRows.map((r,index)=>{const visibilityField=`web.table.oa.${index}.visible`;const slots=texts(r).sort((a,b)=>a.bbox[0]-b.bbox[0]).map((t,i)=>({...slot(t),column:headers[i]?.text||String(i),part:0,field:`web.table.oa.${index}.${i}.0`}));dynamicTexts.push(...slots);visibility.push({id:r.id,box:r.clippedBBox,field:visibilityField});add(r,{action:'web.oa.open',recordIndex:index,visibilityField,label:slots[0]?.text});return {index,visibilityField,slots};});table={pageSize:rows.length,rows};}}
  const metrics=[];if(family==='reports'){
   const values=visibleTexts.filter(t=>t.name==='KPI value');for(const [i,t]of values.entries()){const panel=ancestors(t).find(p=>texts(p).some(s=>s.name==='KPI label')),label=key(panel?texts(panel).find(s=>s.name==='KPI label')?.text:'');const kind=/chi phi.*tin/.test(label)?'average':label==='chi phi'?'cost':/thanh cong/.test(label)?'success':/tin da gui/.test(label)?'sent':['cost','sent','success','average'][i]||'sent',field='web.report.'+kind;dynamicTexts.push({...slot(t),field});metrics.push({field,kind});}
   for(const t of visibleTexts){const m=/^(OA|Count|Cost) (\d+)$/.exec(t.name);if(m){const field=`web.report.group.${m[2]}.${m[1].toLowerCase()}`;dynamicTexts.push({...slot(t),field});metrics.push({field,kind:m[1].toLowerCase(),index:Number(m[2])});}}
  }
  if(family==='overview')for(const t of visibleTexts.filter(t=>/^\d[\d.,]*$/.test(clean(t.text)))){const panel=ancestors(t).find(p=>texts(p).some(s=>/^(Số lượt gửi|Thành công|Thất bại|Đang xử lý)$/.test(clean(s.text)))&&p.bbox[3]>=60&&p.bbox[3]<200);if(panel){const label=texts(panel).find(s=>/^(Số lượt gửi|Thành công|Thất bại|Đang xử lý)$/.test(clean(s.text)))?.text,kind=label==='Số lượt gửi'?'sent':label==='Thành công'?'success':label==='Thất bại'?'failed':'pending',field='web.overview.'+kind;dynamicTexts.push({...slot(t),field});metrics.push({field,kind});}}
  if(family==='oa')for(const t of visibleTexts){const p=byNode.get(t.parentId);let field;if(p?.name==='Record Name'&&t.name!=='Record Name Label'&&!/^Tên bản ghi$/.test(t.text))field='name';else if(/Record Channel|Record OA|Channel Info/.test(p?.name||'')&&!/^OA \/ kênh gửi$/.test(t.text))field='channel';else if(/Record Time|Timestamp|Time Info/.test(p?.name||'')&&!/^Thời gian$/.test(t.text))field='updated';if(field)dynamicTexts.push({...slot(t),field:'web.oa.detail.'+field});}
  const roleCards=[];if(family==='settings'&&scene!=='roleCreate')for(const t of visibleTexts.filter(t=>/^(Director|Delivery Management|Branch Head|Admi KPI|Employee|User)$/.test(t.text))){const card=ancestors(t).find(p=>p.bbox[2]>=180&&p.bbox[2]<400&&p.bbox[3]>=60&&p.bbox[3]<150);if(!card)continue;const index=roleCards.length,field=`web.role.card.${index}.name`,visibilityField=`web.role.card.${index}.visible`;dynamicTexts.push({...slot(t),field});visibility.push({id:card.id,box:card.clippedBBox,field:visibilityField});roleCards.push({id:card.id,name:t.text,index,field,visibilityField});for(const c of controls)if(c.id===card.id||c.id.startsWith(card.id+';')){c.roleIndex=index;c.visibilityField=visibilityField;}}
  if(table)for(const c of controls.filter(c=>c.type==='select'&&c.field?.startsWith('web.filter.'))){const suffix=c.field.split('.').at(-1),matcher={role:/vai tro/i,status:/trang thai/i,phone:/dien thoai/i,channel:/kenh/i}[suffix];if(matcher){const nativeChoices=[...new Set(table.rows.flatMap(r=>r.slots.filter(s=>matcher.test(key(s.column))).map(s=>clean(s.text))))];for(const label of nativeChoices)if(label&&!c.options.some(o=>o.label===label))c.options.push({label,value:label});}}
  if(family==='accounts'&&/accountDetail|accountDisable/.test(scene))for(const t of visibleTexts){let field,valuePrefix='',valueSuffix='';if(/@/.test(t.text)&&!/^Home/.test(t.text))field='email';else if(/\+84|^0[\d ]{8,}$/.test(t.text))field='phone';else if(/Nguyễn Minh Anh/.test(t.text)){field='name';const i=t.text.indexOf('Nguyễn Minh Anh');valuePrefix=t.text.slice(0,i);valueSuffix=t.text.slice(i+'Nguyễn Minh Anh'.length);}else if(/username|tên đăng nhập/i.test(t.name)||/^(admin\d+|[a-z]+_\d+)/i.test(t.text)){field='username';const match=/^([\w_]+)(.*)$/.exec(t.text);if(match)valueSuffix=match[2];}else if(/^(Đang hoạt động|Tạm khóa)$/.test(clean(t.text)))field='status';if(field){if(!valuePrefix&&/\n/.test(t.text))valuePrefix=t.text.slice(0,t.text.indexOf('\n')+1);dynamicTexts.push({...slot(t),field:'web.account.detail.'+field+'.'+slug(t.id),dataField:field,...(valuePrefix?{valuePrefix}:{}),...(valueSuffix?{valueSuffix}:{})});}}
  if(family==='accounts'&&/accountCreate|accountEdit/.test(scene))for(const t of visibleTexts){if(/Page title/i.test(t.name))dynamicTexts.push({...slot(t),field:'web.account.scene.title'});else if(/submit label/i.test(t.name))dynamicTexts.push({...slot(t),field:'web.account.scene.submit'});}
  if(family==='history'&&scene==='detail')for(const t of visibleTexts){const name=key(t.name);let dataField;if(name==='summary date')dataField='time';else if(name==='summary id')dataField='displayId';else if(name==='summary status'||name==='status label'||/gia tri.*trang thai/.test(name))dataField='statusText';else if(/gia tri.*tai khoan/.test(name))dataField='account';else if(/gia tri.*so dien thoai/.test(name))dataField='phone';else if(/gia tri.*san pham/.test(name))dataField='template';else if(/gia tri.*so tien/.test(name))dataField='amountReceived';else if(/gia tri.*ipv4/.test(name))dataField='ipv4';else if(/gia tri.*ipv6/.test(name))dataField='ipv6';else if(/gia tri.*cong/.test(name))dataField='port';else if(/gia tri.*nha mang/.test(name))dataField='provider';else if(/gia tri.*lan cuoi hoat dong/.test(name)){const p=byNode.get(t.parentId);dataField=p&&texts(p).some(n=>/Thời gian mở tin/.test(n.text))?'openedAt':'lastActive';}else if(name==='ma loi'||name==='error code')dataField='errorCode';else if(name==='mo ta loi'||name==='error description')dataField='errorMessage';if(dataField)dynamicTexts.push({...slot(t),field:'web.history.detail.'+slug(t.id),dataField});}
  const deviceRows=[];if(family==='security')for(const t of visibleTexts.filter(t=>/^Chờ xử lý$/.test(clean(t.text)))){const p=ancestors(t).find(p=>p.bbox[2]>400&&p.bbox[3]<100);if(p){const field='web.device.'+slug(p.id);dynamicTexts.push({...slot(t),field});deviceRows.push({id:p.id,field});}}
  const sessionRows=[];if(family==='security')for(const c of controls.filter(c=>c.action==='web.session.revoke')){const n=byNode.get(c.id),row=n&&ancestors(n).find(p=>p.bbox[2]>400&&p.bbox[3]<100);if(row){const field='web.session.'+slug(c.recordId)+'.visible';visibility.push({id:row.id,box:row.clippedBBox,field});sessionRows.push({id:c.recordId,field});c.visibilityField=field;}}
  if(family==='security')for(const t of visibleTexts.filter(t=>clean(t.text)==='Chưa kích hoạt'))dynamicTexts.push({...slot(t),field:'web.security.status'});
  const modal=nodes.filter(n=>n.rendered&&(/^(Vô hiệu hóa|vô hiệu hóa|Thêm vai trò)$/.test(n.name))&&n.bbox[2]>200&&n.bbox[3]>100&&n.bbox[2]<frame.width*.8).sort((a,b)=>a.bbox[2]*a.bbox[3]-b.bbox[2]*b.bbox[3])[0];
  let finalControls=modal?controls.filter(c=>c.id===modal.id||c.id.startsWith(modal.id+';')):controls;
  // Parent wrappers would intercept their child controls; retain only atomic hit areas.
  finalControls=finalControls.filter(c=>!finalControls.some(d=>d.id!==c.id&&c.id.startsWith(d.id+';')&&d.type===c.type&&d.action===c.action&&d.targetId===c.targetId&&d.field===c.field));
  const timers=[];const timeout=nodes.flatMap(n=>(n.prototypeInteractions||[]).filter(i=>i.event?.interactionType==='AFTER_TIMEOUT').map(i=>({n,i}))).find(({n})=>n.rendered&&/Loading/i.test(n.name));
  if(timeout&&targets[family]&&targets[family]!==frame.id)timers.push({delay:Math.max(800,Math.round((timeout.i.event.transitionTimeout||.8)*1000)),control:{id:timeout.n.id,type:'button',action:'web.navigate',targetId:targets[family]}});
  const contentBottom=Math.max(frame.height,...finalControls.map(c=>c.box[1]+c.box[3]),...visibleTexts.filter(t=>t.bbox[1]>=frame.height).map(t=>t.bbox[1]+t.bbox[3]));
  const scrollHeight=contentBottom>frame.height?Math.ceil(contentBottom+24):null;
  output[frame.id]={family,scene,orientation:frame.platform==='web-portrait'?'portrait':'landscape',collapsed:collapsed(frame),targets,controls:finalControls,...(scrollHeight?{scrollHeight}:{}),...(timers.length?{timers}:{}),texts:dynamicTexts,...(visibility.length?{visibility}:{}),...(table?{table}:{}),...(metrics.length?{metrics}:{}),...(roleCards.length?{roleCards}:{}),...(sessionRows.length?{sessionRows}:{}),...(deviceRows.length?{deviceRows}:{}),...(modal?{modalBox:modal.bbox}:{})};
 }
 const valueFonts=new Map();for(const f of Object.values(output))for(const c of f.controls)if(c.field&&c.value&&c.type==='input'&&c.textSlots?.[0]?.font&&!c.placeholder)valueFonts.set(c.field,c.textSlots[0].font);
 for(const [id,f]of Object.entries(output)){if(sourceComponentStates.sourceComponentExtraArtwork?.[id])f.extraArtwork=sourceComponentStates.sourceComponentExtraArtwork[id];for(const c of f.controls){if(c.type==='input'&&valueFonts.has(c.field))c.valueFont=valueFonts.get(c.field);const popup=sourceComponentStates.sourceComponentPopups?.[c.id];if(popup){c.popup=popup;c.options??=[];for(const o of popup.options||[])if(!c.options.some(a=>String(a.value)===String(o.value)))c.options.push({label:o.label,value:o.value});}const card=sourceComponentStates.sourceComponentCards?.[c.id];if(card)c.cardAssets=card;}}
 return output;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const expanded=JSON.parse(await fs.readFile(path.join(root,'.audit/interactive-expanded-source.json'),'utf8'));
 const data=buildWebInteractiveFrames(expanded.frames);
 const records=buildWebSourceRecords(data);
 const output=path.join(root,'figma-preview/web-interactive-controls.mjs');
 await fs.writeFile(output,'// Generated from the original local Figma node geometry and expanded component values.\nexport const webInteractiveFrames='+JSON.stringify(data)+';\nexport const webSourceRecords='+JSON.stringify(records)+';\nexport default webInteractiveFrames;\n');
 const summary={frames:Object.keys(data).length,controls:Object.values(data).reduce((n,f)=>n+f.controls.length,0),byType:{},uncoveredFrames:[]};
 for(const [id,f]of Object.entries(data)){if(!f.controls.length)summary.uncoveredFrames.push(id);for(const c of f.controls)summary.byType[c.type]=(summary.byType[c.type]||0)+1;}
 const inventory=Object.fromEntries(Object.entries(data).map(([id,f])=>[id,{family:f.family,scene:f.scene,controls:f.controls.length,actions:[...new Set(f.controls.map(c=>c.action))]}]));
 await fs.writeFile(path.join(root,'.audit/web-interactive-investigation.json'),JSON.stringify({summary,frames:inventory},null,2)+'\n');
 console.log(JSON.stringify(summary));
}
