import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {templates} from '../figma-preview/core.mjs';
import {appRouteFrameId} from '../figma-preview/app-interactive-controller.mjs';
import {sourceComponentPopups,sourceComponentCounters} from '../figma-preview/source-component-states.mjs';
import {appFlowArtwork} from '../figma-preview/app-flow-artwork.mjs';
import {darkAppArtwork} from '../figma-preview/dark-app-artwork.mjs';
import {buildCalendarMetadata,calendarSummarySlots} from './app-calendar-source.mjs';

const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replaceAll('đ','d').replace(/\s+/g,' ').trim();
const target=a=>a.transitionNodeID?`${a.transitionNodeID.sessionID}:${a.transitionNodeID.localID}`:null;
const sameBox=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<.1);
const slot=n=>({id:n.id,box:n.bbox,text:n.text,font:n.font||{family:'Roboto',style:'Regular',size:14,weight:400}});
const compact=a=>a.replace(/\s+/g,' ').trim();

export function appFrameRoute(frame){
 const t=norm((frame.nodes||[]).filter(n=>n.rendered&&n.type==='TEXT').map(n=>n.text).join(' ')),n=norm(frame.name).replaceAll(' ','');
 if(n.startsWith('loi')||frame.family==='error')return'error';
 if((frame.nodes||[]).some(n=>n.rendered&&/bottom sheet/.test(norm(n.name)))&&(frame.nodes||[]).some(n=>n.rendered&&norm(n.name)==='month selector'))return'schedule';
 if(t.includes('nhap so dien thoai nguoi nhan')&&t.includes('mau zns'))return'send';
 if(/b1\.4\.1/.test(n))return'processing';
 if(/b1\.4\.2/.test(n))return'result';
 if(/b1\.3\.3/.test(n))return'scheduled-result';
 if(/b1\.3\.2/.test(n))return'schedule';
 if(/b1\.4/.test(n))return'confirm';
 if(/b1\.3/.test(n))return'send-choice';
 if(/^b/.test(n))return'send';
 if(n==='t1')return'overview';
 if(t.includes('tao mat khau moi'))return'new-password';
 if(t.includes('xac thuc otp'))return'otp';
 if(t.includes('quen mat khau')&&!t.includes('ghi nho'))return'forgot';
 if(/^a/.test(n)&&t.includes('thay doi mat khau thanh cong'))return'password-result';
 if(/^a/.test(n))return'login';
 if(n.startsWith('gd'))return'appearance';
 if(n==='n1')return'language';
 if(n.startsWith('p1'))return'sessions';
 if(n.startsWith('q.'))return'devices';
 if(n.startsWith('tk3.1'))return'deleted-data';
 if(n.startsWith('tk4.1'))return'deleted-account';
 if(n.startsWith('tk3'))return'delete-data';
 if(n.startsWith('tk4'))return'delete-account';
 if(n.startsWith('tk2'))return'data';
 if(n.startsWith('tk1'))return'account';
 if(n.startsWith('dn2.1'))return'fingerprint-success';
 if(n.startsWith('dn2'))return'fingerprint';
 if(n.startsWith('dn')&&t.includes('xac thuc thanh cong'))return'fingerprint-success';
 if(n.startsWith('dn')&&t.includes('xac thuc van tay'))return'fingerprint';
 if(n.startsWith('dn'))return'account';
 if(n.startsWith('h')&&(frame.nodes||[]).some(n=>n.rendered!==false&&n.visible!==false&&n.type==='INSTANCE'&&n.name==='Loading'))return'profile-loading';
 if(n.startsWith('h1.3'))return'profile-result';
 if(n.startsWith('h1.1')||n.startsWith('h1.2')||/^h[234]/.test(n))return'profile-edit';
 if(n.startsWith('h'))return'profile';
 if(n.startsWith('l'))return t.includes('lich su gui tin')||t.includes('tra cuu trang thai')?'history':'detail';
 if(t.includes('mat khau hien tai')||/^d\d/.test(n))return'password';
 return frame.family||'unknown';
}

/** Derive App control semantics from the expanded native Figma tree. */
export function buildAppInteractiveFrames(frames,{artwork={}}={}){
 const frameIds=new Set(frames.map(f=>f.id)),out={};
 for(const frame of frames.filter(f=>f.platform==='app')){
  const route=appFrameRoute(frame),nodes=frame.nodes.filter(n=>n.rendered!==false&&n.visible!==false),byId=new Map(nodes.map(n=>[n.id,n])),texts=nodes.filter(n=>n.type==='TEXT'&&n.text),controls=[],dynamicTexts=[];
  const descendant=(n,parent)=>{let p=n.parentId;while(p){if(p===parent)return true;p=byId.get(p)?.parentId;}return false;};
  const children=n=>texts.filter(t=>descendant(t,n.id));
  const label=n=>compact(children(n).map(t=>t.text).join(' '))||n.text||n.name;
  // A copied input component name does not identify its current field. Use the
  // nearest owning source label, excluding the value and the adjacent column.
  const fieldLabel=n=>{for(let p=byId.get(n.parentId);p;p=byId.get(p.parentId)){const candidates=children(p).filter(t=>!descendant(t,n.id)&&/label/.test(norm(t.name))&&t.bbox[1]+t.bbox[3]<=n.bbox[1]+1&&t.bbox[1]>=n.bbox[1]-60&&Math.min(t.bbox[0]+t.bbox[2],n.bbox[0]+n.bbox[2])-Math.max(t.bbox[0],n.bbox[0])>0);if(candidates.length)return candidates.sort((a,b)=>b.bbox[1]-a.bbox[1]||Math.abs(a.bbox[0]-n.bbox[0])-Math.abs(b.bbox[0]-n.bbox[0]))[0].text;}return'';};
  const inMessageList=n=>{for(let parent=byId.get(n.parentId);parent;parent=byId.get(parent.parentId))if(/recent|message list|lich su|gan day/.test(norm(parent.name)))return true;return false;};
  const click=n=>(n.prototypeInteractions||[]).filter(i=>!i.isDeleted&&i.event?.interactionType==='ON_CLICK').flatMap(i=>i.actions||[]);
  const add=(n,fields={})=>{
   const box=n.clippedBBox||n.bbox;if(!box||box[2]<=0||box[3]<=0||box[0]<-.1||box[1]<-.1)return;
   const control={id:n.id,type:'button',box,label:label(n),action:'prototype',...fields};
   const slots=children(n).map(slot);if(slots.length&&!Object.hasOwn(fields,'textSlots'))control.textSlots=slots;
   if(fields.type==='input'&&slots.length===1&&!control.textSlots?.[0].font)control.textSlots[0].font={family:'Roboto',size:14};
   const duplicate=controls.find(c=>sameBox(c.box,box)&&c.type===control.type);if(duplicate){if(duplicate.action==='prototype'&&control.action!=='prototype')Object.assign(duplicate,control);return;}
   controls.push(control);
  };
  const bind=(n,field)=>{dynamicTexts.push({...slot(n),field});};
  const go=(n,route)=>add(n,{action:'app.navigate',route,targetId:appRouteFrameId(route,frame)});
  const ancestor=(t,predicate)=>{let n=byId.get(t.parentId);while(n){if(predicate(n))return n;n=byId.get(n.parentId);}return t;};
  const inputNodes=nodes.filter(n=>n.type!=='TEXT'&&n.bbox[2]>=40&&n.bbox[3]>=25&&n.bbox[3]<=65&&/input field|tai khoan quan tri input|mat khau.*input|^mat khau ?$|tim kiem tin nhan/.test(norm(n.name))).filter(n=>!nodes.some(p=>p.id!==n.id&&descendant(n,p.id)&&/input field/.test(norm(p.name))));
  inputNodes.sort((a,b)=>a.bbox[1]-b.bbox[1]||a.bbox[0]-b.bbox[0]);
  let index=0;
  for(const n of inputNodes){
   const content=children(n),own=content.filter(t=>t.bbox[3]<=n.bbox[3]+1&&t.bbox[2]<=n.bbox[2]+1),value=compact(own.map(n=>n.text).join(' ')),context=norm(fieldLabel(n));let field,inputType='text',type='input',options;
   if(['profile','profile-edit','profile-loading'].includes(route)&&(value==='Gửi'&&click(n).length||content.some(t=>t.bbox[3]>n.bbox[3]+1&&/^\d+(?:\s+\d+)+$/.test(t.text))))continue;
   if(route==='login'){field=index++===0?'app.auth.username':'app.auth.password';inputType=field.endsWith('password')?'password':'text';}
   else if(route==='forgot'){field='app.auth.recoveryPhone';inputType='tel';}
   else if(route==='new-password'){field=index++===0?'app.reset.next':'app.reset.confirm';inputType='password';}
   else if(route==='password'){field=['app.password.current','app.password.next','app.password.confirm'][index++];inputType='password';}
   else if(['profile','profile-edit','profile-loading'].includes(route)){
    if(context==='gioi tinh'||nodes.some(p=>p.id!==n.id&&norm(p.name)==='gioi tinh'&&descendant(n,p.id)))continue;
    const key={'ten':'name','so dien thoai':'phone','email':'email','ma xac thuc':'verification','ma 2fa':'verification'}[context.replace(/\s*\*$/,'')];if(!key)continue;
    field='app.profile.'+key;inputType=key==='email'?'email':key==='phone'?'tel':'text';
   }else if(route==='send'){
    if(n.bbox[1]<315){field='app.send.phone';inputType='tel';}else if(n.bbox[1]<420){field='app.send.template';type='select';options=templates.map(t=>({label:t,value:t}));}else continue;
   }else if(route==='history'&&/tim kiem/.test(norm(n.name))){field='app.history.query';inputType='search';}
   if(!field)continue;
   const placeholder=/nhap|tai khoan|mat khau|email hoac|so dien thoai|tim theo|ten$|gioi tinh|ma xac thuc|ma 2fa/.test(norm(value))&&(!/\d/.test(value)||norm(value)==='ma 2fa')?value:'';
   add(n,{type,field,inputType,action:'app.input',onInput:field==='app.history.query'||field==='app.send.phone',value:placeholder?'':value,placeholder,options,textSlots:own.map(slot)});
  }
  if(route==='otp')for(const n of nodes.filter(n=>/otp input fields/.test(norm(n.name)))){
   const boxes=nodes.filter(c=>c.parentId===n.id&&c.bbox[2]>=25&&c.bbox[2]<=60&&c.bbox[3]>=40).sort((a,b)=>a.bbox[0]-b.bbox[0]);
   if(boxes.length===6){const sample=texts.find(t=>descendant(t,n.id));const sampleBox=boxes.find(b=>sample&&descendant(sample,b.id))?.bbox||boxes[0].bbox;const dx=sample?sample.bbox[0]-sampleBox[0]:1,dy=sample?sample.bbox[1]-sampleBox[1]:11;add(n,{type:'input',field:'app.auth.otp',action:'app.otp',onInput:true,inputType:'text',inputMode:'numeric',maxLength:6,splitSlots:true,label:'Mã xác minh gồm 6 chữ số',value:boxes.map(b=>children(b).map(t=>t.text).join('')).join(''),textSlots:boxes.map(b=>{const text=children(b)[0];return text?slot(text):{id:b.id+';digit',box:[b.bbox[0]+dx,b.bbox[1]+dy,46,40],text:'',font:sample?.font||{family:'Roboto',style:'Medium',size:24,weight:500,baseline:28.203125}};})});}
  }
  // Text-only links are original source hit areas, including the login recovery link.
  for(const t of texts){const text=norm(t.text),name=norm(t.name),b=t.bbox;
   if(route==='login'&&text==='quen mat khau ?')go(t,'forgot');
   if(['overview','history'].includes(route)&&['xem tat ca','chi tiet'].includes(text))go(ancestor(t,n=>n.bbox[2]<=125&&n.bbox[3]<=45),'history');
   if(route==='appearance'&&['sang','toi','he thong'].includes(text)){const n=ancestor(t,n=>n.bbox[2]>=100&&n.bbox[3]<=70),value={sang:'light',toi:'dark','he thong':'system'}[text];add(n,{type:'radio',field:'app.preferences.theme',value,checked:value===(frame.theme||'light'),action:'app.theme',label:t.text});}
   if(route==='language'&&/tieng viet|english|日本語|中文|한국어/.test(text)){const n=ancestor(t,n=>n.bbox[2]>=100&&n.bbox[3]<=70);add(n,{type:'radio',field:'app.preferences.language',value:t.text.trim(),action:'app.language',label:t.text});}
   if(route==='otp'&&/gui lai ma/.test(text))add(t,{action:'app.otp.resend',label:'Gửi lại mã'});
   if(text==='sao chep')add(ancestor(t,n=>/sao chep ma tin|button/.test(norm(n.name))&&n.bbox[2]<=120&&n.bbox[3]<=45),{action:'app.copy',field:'app.pending.id',label:t.text});
   if(route==='fingerprint'&&text==='huy')go(t,'account');
   if(route==='send'&&/^\d$/.test(t.text)&&b[0]>250&&b[1]>395&&b[1]<460){const n=ancestor(t,n=>n.bbox[2]>=30&&n.bbox[2]<=50&&n.bbox[3]<=30);add(n,{type:'select',field:'app.send.oaCount',action:'app.input',value:t.text,options:Array.from({length:5},(_,i)=>({label:String(i+1),value:String(i+1)})),label:'Số OA gửi'});bind(t,'app.send.oaCount');}
   if(route==='schedule'&&name==='day'&&/^\d{1,2}$/.test(t.text))add(ancestor(t,n=>n.bbox[2]>=24&&n.bbox[2]<=50&&n.bbox[3]<=32),{action:'app.schedule.day',value:t.text,label:'Ngày '+t.text});
   if(route==='schedule'&&name==='month')bind(t,'app.schedule.month');
   if(['confirm','send-choice','schedule','processing'].includes(route)&&name==='phone number'){const p=byId.get(t.parentId);bind(t,children(p||t).some(x=>norm(x.text)==='mau zns')?'app.send.template':'app.send.phone');}
   if(route==='processing'&&name==='ma yeu cau')bind(t,'app.pending.id');
   if(route==='overview'&&text.startsWith('hello,'))bind(t,'app.overview.greeting');
   if(route==='account'&&/vinh|bizzy/.test(text)&&b[1]<210)bind(t,'app.account.name');
   if(route==='history'&&/\d+ tin nhan/.test(text))bind(t,'app.history.count');
   if(route==='detail'){const context=norm(children(byId.get(t.parentId)||t).map(x=>x.text).join(' '));if(name==='phone number'||name==='recipient phone number')bind(t,context.includes('mau zns')?'app.detail.template':'app.detail.phone');if(name==='transaction id'||name==='message id'||name==='account name'&&(context.includes('ma tin')||context.includes('ma lich hen')))bind(t,'app.detail.id');if(name==='template name')bind(t,'app.detail.template');if(name==='account name'&&context.includes('thoi gian'))bind(t,'app.detail.time');if(name==='account name'){const key=context.includes('ipv 4')||context.includes('ipv4')?'ipv4':context.includes('ipv6')?'ipv6':context.includes('port')?'port':context.includes('nha mang')?'provider':null;if(key)bind(t,'app.recorded.'+key);}}
  }
  for(const n of nodes){
   if(n.type==='TEXT'||n.id===frame.id)continue;
   const name=norm(n.name),l=norm(label(n)),b=n.bbox,actions=click(n),action=actions.find(a=>frameIds.has(target(a)))||actions[0],targetId=target(action||{});
   if(controls.some(c=>c.id===n.id&&['input','select','checkbox','radio'].includes(c.type)))continue;
   if(['profile','profile-edit'].includes(route)&&name==='tai anh len'){add(n,{type:'file',field:'app.profile.avatar',action:'app.profile.camera',accept:'image/*',label:'Chọn ảnh đại diện'});continue;}
   if(/menu button/.test(name)&&b[3]<=65){const nav={'tong quat':'overview','gui tin':'send','lich su':'history','tai khoan':'account'}[l];if(nav){go(n,nav);continue;}}
   if(route==='detail'&&/sao chep|^copy$/.test(name)&&b[2]<=40&&b[3]<=40){const parent=byId.get(n.parentId),owned=dynamicTexts.find(t=>parent&&t.id.startsWith(parent.id+';')&&(t.field==='app.detail.id'||t.field?.startsWith('app.recorded.')));if(owned||frame.id.startsWith('1635:'))add(n,{action:'app.copy',field:owned?.field||'app.detail.id',value:owned?.text,label:'Sao chép dữ liệu'});continue;}
   if(route==='schedule'&&name==='close button'){add(n,{action:'app.back',label:'Đóng lịch gửi'});continue;}
   if(/eye|show pass/.test(name)){const input=controls.filter(c=>c.type==='input'&&c.inputType==='password'&&b[1]>=c.box[1]&&b[1]<c.box[1]+c.box[3])[0];if(input)add(n,{action:'app.eye',field:input.field,label:'Hiện mật khẩu'});else if(route==='detail')add(n,{action:'app.recorded.toggle',field:'app.preferences.recordedVisible',label:'Ẩn hoặc hiện dữ liệu ghi nhận',value:true});continue;}
   if(route==='detail'&&['phong to','thu nho'].includes(name)){add(n,{action:'app.map.zoom',value:name==='phong to'?.2:-.2,label:name==='phong to'?'Phóng to bản đồ':'Thu nhỏ bản đồ'});continue;}
   if(route==='detail'&&name==='button mo map'){add(n,{action:'app.map.focus',label:'Xem chi tiết bản đồ'});continue;}
   if(/arrow-left-right/.test(name)&&['profile','profile-edit'].includes(route)){add(n,{action:'app.profile.contact-switch',label:'Đổi thông tin liên hệ'});continue;}
   if(/cham chon quyen/.test(name)&&['send-choice','confirm','schedule'].includes(route)){const context=norm(label(byId.get(n.parentId)||n)),scheduled=!context.includes('gui ngay');add(n,{type:'radio',field:'app.send.scheduled',value:scheduled,checked:n.masterId==='604:31543',activateOnClick:true,checkedMasterId:'604:31543',uncheckedMasterId:'604:31545',checkedAsset:appFlowArtwork['604:31543'].file,uncheckedAsset:appFlowArtwork['604:31545'].file,action:scheduled?'app.schedule.open':'app.schedule.now',label:scheduled?'Hẹn giờ gửi':'Gửi ngay'});continue;}
   if(route==='fingerprint'&&/fingerprint icon background/.test(name)){add(n,{action:'app.fingerprint.verify',label:'Xác thực vân tay mẫu'});continue;}
   if(/check box|checkbox/.test(name)&&route==='login'){add(n,{type:'checkbox',field:'app.auth.remember',action:'app.preference',value:n.masterId==='64:2769',checkedMasterId:'64:2769',uncheckedMasterId:'64:2770',checkedAsset:artwork['64:2769']?.file,uncheckedAsset:artwork['64:2770']?.file,label:'Ghi nhớ'});continue;}
   if(/chevron right/.test(name)&&b[0]<60&&b[1]<110){add(n,{action:targetId?'app.navigate':'app.back',targetId,label:'Quay lại'});continue;}
   if(route==='send'&&b[1]>395&&b[1]<460&&b[2]<=30&&b[3]<=30&&n.type==='INSTANCE'&&actions.length){add(n,{action:b[0]<315?'app.oa.minus':'app.oa.plus',label:b[0]<315?'Giảm số OA':'Tăng số OA'});continue;}
   if(/icon/.test(name)&&['prototype','profile'].includes(route)&&b[0]>300&&actions.some(a=>a.navigationType==='SWAP_STATE')){add(n,{action:'app.back',label:'Đóng thông báo'});continue;}
   if(/on off|toggle/.test(name)){const checkedMasterId=n.masterId?.startsWith('540:')?'540:24477':'557:34966',uncheckedMasterId=n.masterId?.startsWith('540:')?'540:24478':'557:34960',size='@'+b[2]+'x'+b[3],flow=frame.theme==='dark'||/^(?:Mobile · )?Flow$/.test(frame.group||'')?appFlowArtwork:{},assets={checkedMasterId,uncheckedMasterId,checkedAsset:(flow[checkedMasterId+size]||artwork[checkedMasterId+size]||artwork[checkedMasterId])?.file,uncheckedAsset:(flow[uncheckedMasterId+size]||artwork[uncheckedMasterId+size]||artwork[uncheckedMasterId])?.file};if(route==='account'){add(n,{type:'checkbox',field:'app.preferences.fingerprint',action:'app.fingerprint',label:'Đăng nhập bằng vân tay',value:n.masterId===checkedMasterId,...assets});}else if(route==='sessions'){const field=b[1]<400?'app.preferences.hideNotifications':'app.preferences.hideScreenshots';add(n,{type:'checkbox',field,action:'app.preference',label:b[1]<400?'Ẩn nội dung thông báo':'Ẩn nội dung khi chụp màn hình',value:n.masterId===checkedMasterId,...assets});}continue;}
   if(/gioi tinh/.test(name)&&b[3]<=45){if(['profile','profile-edit','profile-loading'].includes(route))add(n,{type:'select',field:'app.profile.gender',action:'app.input',label:'Giới tính',value:/nam|nu/.test(l)?label(n):'',options:[{label:'Giới tính',value:''},{label:'Nam',value:'Nam'},{label:'Nữ',value:'Nữ'}]});else if(route==='sessions')add(n,{type:'select',field:'app.preferences.appLock',action:'app.preference',label:'Khóa ứng dụng',value:'30 phút',options:['Ngay lập tức','1 phút','5 phút','30 phút'].map(v=>({label:v,value:v}))});continue;}
   if(route==='schedule'&&/hour wheel|minute wheel/.test(name)){const hour=name==='hour wheel',selected=texts.filter(t=>descendant(t,n.id)&&t.bbox[1]>=b[1]+b[3]*.39&&t.bbox[1]<=b[1]+b[3]*.51)[0];add(n,{type:'select',field:hour?'app.schedule.hour':'app.schedule.minute',action:hour?'app.schedule.hour':'app.schedule.minute',label:hour?'Giờ gửi':'Phút gửi',value:selected?.text||'00',options:Array.from({length:hour?24:60},(_,i)=>({label:String(i).padStart(2,'0'),value:String(i).padStart(2,'0')})),textSlots:selected?[slot(selected)]:[]});continue;}
   if(route==='schedule'&&name==='icon'&&/month selector/.test(norm(byId.get(n.parentId)?.name))){add(n,{action:'app.schedule.month',value:b[0]<150?-1:1,label:b[0]<150?'Tháng trước':'Tháng sau'});continue;}
   if(route==='account'&&b[2]>=200&&b[3]>=24&&b[3]<=60){const mapping=[['giao dien','appearance'],['ngon ngu','language'],['doi mat khau','password'],['thiet bi duoc duyet','devices'],['bao mat phien lam viec','sessions'],['quan ly du lieu','data'],['ho so','profile']].find(([text])=>l===text);if(mapping){go(n,mapping[1]);continue;}if(l==='dang xuat'){add(n,{action:'app.logout'});continue;}}
   if(route==='account'&&l==='ho so'&&b[3]<=40){go(n,'profile');continue;}
   if(route==='overview'&&name==='gui tin zns moi'){go(n,'send');continue;}
   if(['overview','history'].includes(route)&&inMessageList(n)&&b[1]>260&&b[2]>=300&&b[3]>=45&&b[3]<=80&&children(n).length>=2&&!/margin|body|header/.test(name)){add(n,{action:'app.history.detail',targetId:frameIds.has(targetId)?targetId:undefined,rowIndex:0});continue;}
   if(route==='history'&&/order filter|filter/.test(name)&&b[2]<120&&b[3]<=40){const status={'tat ca':'all','da gui':'sent','hoan thanh':'success','gui that bai':'failed','hen gio':'scheduled','mot phan':'partial'}[l];if(status){add(n,{action:'app.history.filter',value:status,targetId:frameIds.has(targetId)?targetId:undefined});continue;}}
   if(route==='history'&&/button moi cu|sort/.test(name)){add(n,{type:'select',field:'app.history.sort',action:'app.history.sort',value:'newest',label:'Sắp xếp',options:[{label:'Mới nhất',value:'newest'},{label:'Cũ nhất',value:'oldest'}]});continue;}
   // The original schedule strip contains two independent actions. Its generic
   // Button wrapper must not cover the cancel half with the edit action.
   if(route==='detail'&&/doi lich/.test(l)&&/huy lich/.test(l))continue;
   const button=/button|^buttons$|log out|close button|profile action/.test(name)||actions.length||route==='detail'&&/^(doi lich|huy lich)$/.test(l);
   if(!button||b[2]>frame.width*.9&&b[3]>150)continue;
   const fields={targetId:frameIds.has(targetId)?targetId:undefined};
   if(actions.some(a=>['BACK','CLOSE_OVERLAY'].includes(a.connectionType)||['BACK','CLOSE_OVERLAY'].includes(a.navigationType)))Object.assign(fields,{action:'app.back'});
   else if(route==='login'&&l==='dang nhap')Object.assign(fields,{action:'app.login',submit:true});
   else if(route==='forgot'&&/^tiep|gui ma|yeu cau/.test(l))Object.assign(fields,{action:'app.forgot.submit',submit:true});
   else if(route==='new-password'&&/doi mat khau|xac nhan/.test(l))Object.assign(fields,{action:'app.reset.save',submit:true});
   else if(route==='password'&&/xac nhan|doi mat khau/.test(l))Object.assign(fields,{action:'app.password.save',submit:true});
   else if(route==='send'&&l==='tiep')Object.assign(fields,{action:'app.send.next',submit:true});
   else if(route==='processing'&&l==='ve lich su')Object.assign(fields,{action:'app.navigate',route:'history'});
   else if(['confirm','send-choice','schedule'].includes(route)&&l==='gui ngay')Object.assign(fields,{action:'app.schedule.now'});
   else if(['confirm','send-choice','schedule'].includes(route)&&/hen gio gui/.test(l))Object.assign(fields,{action:'app.schedule.open'});
   else if(['confirm','send-choice'].includes(route)&&/gui|xac nhan/.test(l)&&!l.includes('thoi gian'))Object.assign(fields,{action:'app.send.confirm',submit:true});
   else if(['confirm','send-choice','schedule'].includes(route)&&/quay lai/.test(l))Object.assign(fields,{action:'app.navigate',route:'send-ready'});
   else if(route==='schedule'&&/luu|dat lich/.test(l))Object.assign(fields,{action:'app.schedule.save',submit:true});
   else if(route==='schedule'&&/huy|close/.test(l))Object.assign(fields,{action:'app.navigate',route:'confirm'});
   else if(route==='profile'&&/chinh sua/.test(l))Object.assign(fields,{action:'app.profile.edit'});
   else if(['profile','profile-edit'].includes(route)&&l==='gui')Object.assign(fields,{action:'app.profile.verify.send'});
   else if(route==='profile-edit'&&/cap nhat/.test(l))Object.assign(fields,{action:'app.profile.save',submit:true});
   else if(route==='profile-result'&&/ho so/.test(l))Object.assign(fields,{action:'app.navigate',route:'profile'});
   else if(['result','scheduled-result'].includes(route)&&/chi tiet|lich su|lich da dat/.test(l))Object.assign(fields,{action:'app.navigate',route:'detail'});
   else if(route==='fingerprint'&&/xac thuc|tiep tuc/.test(l))Object.assign(fields,{action:'app.fingerprint.verify'});
   else if(route==='data'&&/xoa/.test(l))Object.assign(fields,{action:'app.delete.open',value:/tai khoan/.test(l)?'account':'data'});
   else if(['delete-data','delete-account'].includes(route)&&/xoa|xac nhan/.test(l))Object.assign(fields,{action:'app.delete.confirm',value:route==='delete-account'?'account':'data'});
   else if(['delete-data','delete-account'].includes(route)&&/huy/.test(l))Object.assign(fields,{action:'app.navigate',route:'data'});
   else if(/hen gio|hen lich|dat lich|doi lich/.test(l)&&['send-choice','confirm','detail'].includes(route))Object.assign(fields,{action:route==='detail'?'app.schedule.edit':'app.schedule.open'});
   else if(route==='detail'&&/huy lich/.test(l))Object.assign(fields,{action:'app.schedule.cancel'});
   else if(route==='password-result'&&/dang nhap/.test(l))Object.assign(fields,{action:'app.navigate',route:'login'});
   else if(route==='error'&&/quay lai/.test(l))Object.assign(fields,{action:'app.back'});
   else if(route==='error'&&/thu lai|tai lai|tong quat|trang chu/.test(l))Object.assign(fields,{action:'app.navigate',route:'overview'});
   else if(route==='error'&&/lien he/.test(l))Object.assign(fields,{action:'app.notice',message:'Vui lòng liên hệ quản trị viên Mikasa để được hỗ trợ.'});
   else if(['fingerprint','fingerprint-success'].includes(route)&&l==='dang xuat')Object.assign(fields,{action:'app.logout'});
   else if(route==='login'&&/huy dang nhap/.test(l))Object.assign(fields,{action:'app.navigate',route:'login'});
   else if(route==='login'&&/dang xuat/.test(l))Object.assign(fields,{action:'app.device.logout'});
   else if(actions.length&&frameIds.has(targetId))Object.assign(fields,{action:'app.navigate'});
   else if(actions.length)Object.assign(fields,{action:'prototype.swap',prototypeActions:actions});
   else continue;
   add(n,fields);
  }
  // Bind source history row text slots to persisted sample records after a user operation.
  if(['history','overview'].includes(route)){
   const rows=controls.filter(c=>c.action==='app.history.detail').sort((a,b)=>a.box[1]-b.box[1]);rows.forEach((c,i)=>{c.rowIndex=i;for(const t of texts.filter(t=>descendant(t,c.id))){const name=norm(t.name);if(/so dien thoai|phone/.test(name))bind(t,`app.history.${i}.phone`);else if(/mo ta|description|thoi gian/.test(name))bind(t,`app.history.${i}.description`);else if(/status|trang thai/.test(name))bind(t,`app.history.${i}.status`);}});
  }
  let codeCountdown=false;
  if(['profile','profile-edit'].includes(route)){
   const countdown=inputNodes.find(n=>children(n).some(t=>t.text==='00:')&&children(n).some(t=>/^60\s+59\s+58\b/.test(t.text)));
   if(countdown){
    const visible=t=>{const b=t.clippedBBox;return b&&b[2]>0&&b[3]>0&&b[0]>=countdown.bbox[0]&&b[1]>=countdown.bbox[1]&&b[0]+b[2]<=countdown.bbox[0]+countdown.bbox[2]&&b[1]+b[3]<=countdown.bbox[1]+countdown.bbox[3];};
    const prefix=children(countdown).find(t=>t.text==='00:'&&visible(t)),seconds=children(countdown).find(t=>/^60\s+59\s+58\b/.test(t.text)&&visible(t));
    if(prefix&&seconds){codeCountdown=true;dynamicTexts.push({...slot(prefix),field:'app.profile.code.prefix'},{...slot(seconds),sourceClipBox:seconds.clippedBBox,label:'Số giây còn lại trước khi gửi lại mã',field:'app.profile.code.seconds'});}
   }
  }
  // Remove semantic container duplicates; descendants such as eye icons retain smaller geometry.
  const modal=nodes.filter(n=>/bottom sheet|fingerprint verification prompt/.test(norm(n.name))&&n.bbox[2]>300).at(-1);
  const editable=controls.filter(c=>['input','select','textarea','file'].includes(c.type));
  const coversEditable=c=>c.type==='button'&&c.action==='app.navigate'&&editable.some(input=>c.box[0]<=input.box[0]&&c.box[1]<=input.box[1]&&c.box[0]+c.box[2]>=input.box[0]+input.box[2]&&c.box[1]+c.box[3]>=input.box[1]+input.box[3]);
  if(route==='profile-loading')for(const c of editable.filter(c=>c.field?.startsWith('app.profile.')))for(const text of c.textSlots||[])dynamicTexts.push({...text,field:c.field});
  const selected=route==='profile-loading'?[]:controls.filter((c,i)=>(!modal||descendant(byId.get(c.id)||{},modal.id))&&!coversEditable(c)&&!controls.some((p,j)=>i!==j&&p.action===c.action&&p.field===c.field&&p.label===c.label&&descendant(byId.get(c.id)||{},p.id)&&p.box[2]>=c.box[2]&&p.box[3]>=c.box[3]));
  if(route==='profile')for(const c of selected.filter(c=>['input','select','file'].includes(c.type))){c.readOnly=true;if(c.type!=='input')c.disabled=true;}
  selected.filter(c=>c.action==='app.history.detail').sort((a,b)=>a.box[1]-b.box[1]).forEach((c,i)=>c.rowIndex=i);
  for(const c of selected){const popup=(frame.theme==='dark'?darkAppArtwork.popups[c.id]:null)||sourceComponentPopups[c.id];if(popup){c.popup=popup;if(c.type==='select')c.options=[...new Map([...(c.options||[]),...popup.options].map(o=>[String(o.value),{label:o.label,value:o.value}])).values()];}}
  const componentStates=[];
  // The uploaded Flow.svg is authoritative here: its warning says MAX 2 OA,
  // while the later .fig instance still points to the full-permission master.
  const permission=frame.theme==='dark'?texts.map(t=>/Bạn chỉ được chọn tối đa ([2-5]) OA/i.exec(t.text)).find(Boolean):null;
  const oaLimit=frame.id==='1635:105527'?2:permission?Number(permission[1]):5;
  if(route==='send'){
   const counter=nodes.find(n=>n.type==='INSTANCE'&&(frame.theme==='dark'?/chon so tin/.test(norm(n.name)):/ch[oọ]n s[oố] tin full quy[eề]n/i.test(n.name))),count=selected.find(c=>c.field==='app.send.oaCount'),sourceStates=frame.theme==='dark'?(darkAppArtwork.counters[oaLimit]?.states||sourceComponentCounters.dark?.states):sourceComponentCounters.light?.states;
   const states=sourceStates&&Object.fromEntries(Object.entries(sourceStates).filter(([value])=>Number(value)<=oaLimit).map(([value,state])=>[value,{...state,controls:state.controls.map(c=>({...c,...(c.action==='app.oa.plus'&&Number(value)===oaLimit?{disabled:true}:{})}))}]));
   if(counter&&count&&states){
    const initialValue=frame.id==='1635:105527'?'1':String(count.value||'5');componentStates.push({id:counter.id,box:counter.bbox,field:'app.send.oaCount',initialValue,states});
    count.componentStateId=counter.id;count.type='input';count.inputType='text';count.inputMode='numeric';count.maxLength=1;count.onInput=true;count.options=count.options.filter(o=>Number(o.value)<=oaLimit);
    for(const c of selected.filter(c=>c.action==='app.oa.minus'||c.action==='app.oa.plus'))c.componentStateId=counter.id;
    if(frame.id==='1635:105527'){
     count.value='1';count.box=[counter.bbox[0]+50,counter.bbox[1]+12,30,22];count.textSlots=(count.textSlots||[]).map(slot=>({...slot,box:[counter.bbox[0]+50,counter.bbox[1]+12,30,24],text:'1'}));
     for(let index=selected.length-1;index>=0;index--)if(selected[index].action==='app.oa.minus')selected.splice(index,1);
     const plus=states['1'].controls.find(c=>c.action==='app.oa.plus');if(plus)selected.push({...plus,id:counter.id+';source-svg-initial-plus',componentStateId:counter.id,box:plus.box.map((v,i)=>i<2?v+counter.bbox[i]:v)});
     for(const slot of dynamicTexts.filter(t=>t.field==='app.send.oaCount')){slot.box=[counter.bbox[0]+50,counter.bbox[1]+12,30,24];slot.text='1';}
    }
   }
  }
  const visibility=selected.filter(c=>c.action==='app.history.detail').map(c=>({id:c.id,box:c.box,field:`app.history.${c.rowIndex}.visible`}));
  const mapNode=nodes.find(n=>norm(n.name)==='ban do'&&n.type==='FRAME'),mapFooter=nodes.find(n=>n.name==='Map'&&mapNode&&descendant(n,mapNode.id));
  const transforms=mapNode?[{id:mapNode.id,box:[mapNode.bbox[0],mapNode.bbox[1],mapNode.bbox[2],mapFooter?mapFooter.bbox[1]-mapNode.bbox[1]:mapNode.bbox[3]],field:'app.detail.mapZoom',mode:'map'}]:[];
  const timers=[];if(route==='processing')timers.push({delay:1200,control:{id:'app:finish',type:'button',action:'app.send.finish'}});
  if(codeCountdown)timers.push({delay:1000,repeat:true,control:{id:'app:profile-code-tick',type:'button',action:'app.profile.verify.tick'}});
  if(route==='profile-loading'){
   const timeout=nodes.filter(n=>n.name==='Loading').flatMap(n=>(n.prototypeInteractions||[]).filter(p=>p.event?.interactionType==='AFTER_TIMEOUT').map(p=>({event:p.event,action:p.actions?.find(a=>a.navigationType==='NAVIGATE')}))).find(p=>p.action);
   // Email loading shares the same native overlay; the phone variant supplies
   // its 1.365s completion transition to the existing H1.3 success frame.
   timers.push({delay:timeout?Number(timeout.event.transitionTimeout)*1000:1365,control:{id:'app:profile-finish',type:'button',action:'app.profile.finish',targetId:target(timeout?.action||{})||appRouteFrameId('profile-result',frame)}});
  }
  if(route==='fingerprint-success')timers.push({delay:1500,control:{id:'app:fingerprint-return',type:'button',action:'app.navigate',route:'account'}});
  if(route==='deleted-data')timers.push({delay:1500,control:{id:'app:data-return',type:'button',action:'app.navigate',route:'data'}});
  if(route==='deleted-account')timers.push({delay:1500,control:{id:'app:logout',type:'button',action:'app.logout'}});
  if(!timers.length)for(const n of nodes)for(const p of n.prototypeInteractions||[]){if(p.event?.interactionType!=='AFTER_TIMEOUT')continue;for(const a of p.actions||[]){const destination=target(a);if(a.navigationType==='NAVIGATE'&&destination!==frame.id&&frameIds.has(destination))timers.push({delay:Math.max(0,Number(p.event.transitionTimeout||0)*1000),control:{id:n.id+';timeout',type:'button',...(route==='fingerprint'?{action:'app.fingerprint.verify'}:{action:'app.navigate',targetId:destination})}});}}
  const calendar=route==='schedule'?buildCalendarMetadata(frame,selected):null;
  for(const summary of calendarSummarySlots(frame))if(!dynamicTexts.some(s=>s.id===summary.id))dynamicTexts.push(summary);
  const profileContact=route.startsWith('profile')?(texts.some(t=>/label/.test(norm(t.name))&&norm(t.text)==='so dien thoai')?'phone':texts.some(t=>/label/.test(norm(t.name))&&norm(t.text)==='email')?'email':undefined):undefined;
  out[frame.id]={route,theme:frame.theme,group:frame.group,scheduleEdit:route==='schedule'&&/^l/i.test(frame.name),controls:selected,texts:dynamicTexts,visibility,transforms,timers,componentStates,...(codeCountdown?{codeCountdown:true}:{}),...(profileContact?{profileContact}:{}),...(route==='profile'?{readOnly:true}:{}),...(componentStates.length?{oaLimit}:{}),...(calendar?{calendar}:{})};
 }
 // Direct entry from the source picker still needs the record drawn by that
 // scheduled-detail frame, rather than a shared Web selection.
 for(const f of Object.values(out))if(f.route==='detail'&&f.controls.some(c=>c.action==='app.schedule.edit'))f.scheduledRecord=Object.fromEntries(f.texts.filter(t=>t.field.startsWith('app.detail.')).map(t=>[t.field.slice(11),t.text]));
 for(const [id,f]of Object.entries(out))if(f.scheduleEdit){const source=out[appRouteFrameId('scheduled-detail',{...f,id})];if(source?.scheduledRecord)f.scheduledRecord={...source.scheduledRecord};}
 const inputSamples=Object.values(out).flatMap(f=>f.controls.filter(c=>c.type==='input').map(c=>({control:c,theme:f.theme})));
 for(const f of Object.values(out))for(const c of f.controls.filter(c=>c.type==='input')){
  const samples=inputSamples.filter(s=>s.control.field===c.field&&s.control.value&&!s.control.placeholder);
  const entered=samples.find(s=>s.theme===f.theme)||samples[0];
  c.valueFont=entered?.control.textSlots?.[0]?.font||c.textSlots?.[0]?.font;
  if(c.inputType==='password'){const mask=samples.find(s=>/^[*•●]+$/.test(s.control.value));c.maskCharacter=mask?.control.value?.[0]||'•';}
 }
 return out;
}

async function main(){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const expanded=JSON.parse(await fs.readFile(path.join(root,'.audit/interactive-expanded-source.json'),'utf8'));
 const artwork=(await import('../figma-preview/source-control-artwork.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return{};throw error;})).sourceControlArtwork||{};
 const frames=buildAppInteractiveFrames(expanded.frames,{artwork}),filename=path.join(root,'figma-preview/app-interactive-controls.mjs');
 await fs.writeFile(filename,'// Generated from original local Figma node geometry by scripts/app-interactive-source.mjs.\nexport const appInteractiveFrames='+JSON.stringify(frames)+';\n');
 const controls=Object.values(frames).flatMap(f=>f.controls),report={frames:Object.keys(frames).length,controls:controls.length,byAction:controls.reduce((s,c)=>(s[c.action]=(s[c.action]||0)+1,s),{}),framesWithoutControls:Object.entries(frames).filter(([,f])=>!f.controls.length).map(([id])=>id),unresolvedComponentControls:controls.filter(c=>c.action==='prototype.swap').map(c=>({id:c.id,label:c.label,box:c.box,actions:c.prototypeActions}))};
 await fs.writeFile(path.join(root,'.audit/app-interactive-controls-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({frames:report.frames,controls:report.controls,unresolvedComponentControls:report.unresolvedComponentControls.length}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
