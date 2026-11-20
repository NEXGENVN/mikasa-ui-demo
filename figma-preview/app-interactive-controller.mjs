import {APP_STANDARD_DESTINATIONS,isAppStandardFrame} from './app-standard-flow.mjs';
import {validatePhone,beginSubmission,finishSubmission,filterMessages,templates} from './core.mjs';
import {mobileMessages} from './mobile.mjs';
import {initializeAppSchedule,syncAppSchedule,changeAppSchedule,scheduleParts,validateAppSchedule,openAppSchedule,scheduleSaveState,scheduleISO} from './app-calendar.mjs';
import {appPermissionOALimit,appPermissionVariant,resolveAppPermissionFrameId} from './app-permission-policy.mjs';

// Every destination is an existing original Figma frame. Flow has its own originals.
const routes={
 login:['658:1036','1456:19654','1635:105270'],overview:['506:23873','1430:85737','1635:105349'],send:['734:77892','1430:86270','1635:105527'],'send-ready':['773:88074','1430:86331','1635:105527'],
 confirm:['1279:8766','1430:88175','1635:109001'],processing:['778:89003','1430:87483','1635:109115'],result:['1279:8878','1430:87433','1635:109243'],
 'send-choice':['1279:8597','1430:88032','1635:105774'],schedule:['1279:8468','1430:87964','1635:105895'],'schedule-edit':['1107:4929','1444:94357','1635:109376'],'scheduled-result':['1086:73093','1442:91277','1635:106187'],
 history:['784:48201','1430:85846'],detail:['784:48751','1430:86619','1635:109806'],'scheduled-detail':['1086:73413','1444:93591','1635:109272'],
 account:['823:51460','1450:9744','1635:110138'],profile:['843:50360','1456:12239'],'profile-edit':['843:50716','1456:12749','1635:110900'],'profile-result':['843:50893','1456:12865'],'profile-email':['863:50327','1456:12566','1635:111726'],'profile-loading':['843:50626','1456:12806','1635:112035'],'profile-email-loading':['891:1869','1456:12702','1635:111940'],
 appearance:['863:1499','1450:10174','1635:110779'],language:['863:1189','1450:10146','1635:110831'],password:['843:50060','1456:14695','1635:112210'],devices:['843:51550','1456:14865','1635:112310'],sessions:['852:51826','1456:14881','1635:112462'],
 data:['1112:76654','1450:9816'],'delete-data':['1112:76816','1450:9840','1635:110281'],'delete-account':['1112:76975','1450:9918','1635:110341'],'deleted-data':['1112:77043','1450:9878'],'deleted-account':['1112:77107','1450:9956'],
 fingerprint:['891:2144','1450:9996','1635:110452'],'fingerprint-success':['916:2740','1456:11813','1635:110629'],'otp-fingerprint':['891:2337','1450:10188','1635:110403'],'otp-password':['891:3812','1456:15057','1635:112161'],forgot:['658:34375'],otp:['658:34596'],'new-password':['658:34855'],'password-result':['658:35036']
};
const permissionCopy=frame=>appPermissionVariant(frame?.appPermissionVariant)!=='standard';
const standardFrame=frame=>!permissionCopy(frame)&&isAppStandardFrame(frame);
export function appRouteFrameId(route,frame={},theme=frame.theme){if(permissionCopy(frame))return resolveAppPermissionFrameId(route,{variant:frame.appPermissionVariant,theme});const ids=routes[route];if(!ids)return isAppStandardFrame(frame)?APP_STANDARD_DESTINATIONS[route]||null:null;const flow=isAppStandardFrame(frame)||/(?:^|·\s*)Flow$/i.test(frame.group||'');return flow&&theme!=='dark'&&APP_STANDARD_DESTINATIONS[route]?APP_STANDARD_DESTINATIONS[route]:theme==='dark'&&ids[1]?ids[1]:ids[0];}
export function appDetailFrameId(message,frame={}){if(!message)return appRouteFrameId('detail',frame);const multi=Number(message.oaCount)>1,status=message.status;if(status==='scheduled')return appRouteFrameId('scheduled-detail',frame);if(standardFrame(frame)&&frame.theme!=='dark'&&status==='sent')return'1635:109806';const ids=status==='failed'?(multi?['1308:7021','1450:9014']:['784:50672','1444:95125']):status==='partial'?['1309:7446','1450:9522']:status==='success'?(multi?['1308:7105','1450:9130']:['784:49355','1430:87138']):(multi?['1308:6902','1450:8895']:['784:48751','1430:86619']);return frame.theme==='dark'?ids[1]:ids[0];}
const get=(s,key,fallback='')=>s.values[key]??fallback;
function set(s,key,value){s.values[key]=value;s.dirty.add(key);}
function syncDraft(s){Object.assign(s.data.draft,{phone:get(s,'app.send.phone',s.data.draft.phone),template:get(s,'app.send.template',s.data.draft.template),oaCount:Number(get(s,'app.send.oaCount',s.data.draft.oaCount)),schedule:get(s,'app.send.schedule',s.data.draft.schedule),scheduled:Boolean(get(s,'app.send.scheduled',s.data.draft.scheduled))});return s.data.draft;}
function passwordValid(v,min=8,max=20){return v.length>=min&&v.length<=max&&/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/\d/.test(v)&&/[^A-Za-z0-9]/.test(v);}
const appMessages=s=>mobileMessages(s.data);
const oaLimit=appPermissionOALimit;
const flowContext=(frame,s)=>({...frame,appPermissionVariant:s.context.appPermissionVariant||frame.appPermissionVariant,standardFlow:isAppStandardFrame(frame)||s.context.appStandardFlow===true});
const nativeFlowTargets={'506:23873':'overview','823:51460':'account','773:88074':'send-ready','734:77892':'send','916:2740':'fingerprint-success','843:50716':'profile-edit'};
const routeForFrameId=id=>Object.entries(routes).find(([,ids])=>ids.includes(id))?.[0]||Object.entries(APP_STANDARD_DESTINATIONS).find(([,target])=>target===id)?.[0];
function cancelScheduleChoice(s){const edit=s.context.appScheduleChoice;if(!edit)return;Object.assign(s.data.draft,{schedule:edit.schedule,scheduled:edit.scheduled});if(edit.date)syncAppSchedule(s,edit.date);else delete s.context.appScheduleDate;set(s,'app.send.schedule',edit.schedule);set(s,'app.send.scheduled',edit.scheduled);delete s.context.appScheduleChoice;s.context.appScheduleOpen=false;}

function selectedScheduledMessage(frame,s){
 const rows=appMessages(s),selected=rows.find(m=>m.id===s.data.selectedId);
 if(selected&&((s.context.appSelectedMessage&&selected.status==='scheduled')||!frame.scheduledRecord)){s.context.appSelectedMessage=true;return selected;}
 const source=frame.scheduledRecord;if(!source?.id||s.data.mobile?.dataCleared||s.context.appCanceledSourceSchedules?.includes(source.id))return null;
 let row=rows.find(m=>m.id===source.id);
 if(!row){const parts=/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(source.time||'');if(!parts)return null;row={...source,status:'scheduled',oaCount:1,schedule:scheduleISO({year:Number(parts[3]),month:Number(parts[2]),day:Number(parts[1]),hour:Number(parts[4]),minute:Number(parts[5])})};s.data.mobile.fixtures.push(row);}
 s.data.selectedId=row.id;s.context.appSelectedMessage=true;return row;
}
function beginScheduleEdit(s){
 if(!s.context.appScheduleEdit){
  s.context.appScheduleEdit={messageId:s.data.selectedId,draft:{...s.data.draft},values:Object.fromEntries(['phone','template','oaCount'].map(key=>[key,get(s,'app.send.'+key,s.data.draft[key])])),schedule:get(s,'app.send.schedule',s.data.draft.schedule),scheduled:get(s,'app.send.scheduled',s.data.draft.scheduled),date:s.context.appScheduleDate};
  const message=appMessages(s).find(m=>m.id===s.data.selectedId);if(message)for(const key of ['phone','template','oaCount'])if(message[key]!=null){set(s,'app.send.'+key,message[key]);s.data.draft[key]=message[key];}
 }
 s.context.appEditingSchedule=true;
}
function endScheduleEdit(s){
 const edit=s.context.appScheduleEdit;
 if(edit){Object.assign(s.data.draft,edit.draft);for(const key of ['phone','template','oaCount'])set(s,'app.send.'+key,edit.values?.[key]??edit.draft[key]);if(edit.date)syncAppSchedule(s,edit.date);else delete s.context.appScheduleDate;set(s,'app.send.scheduled',Boolean(edit.scheduled));set(s,'app.send.schedule',edit.schedule||'');}
 delete s.context.appScheduleEdit;s.context.appEditingSchedule=false;s.context.appScheduleOpen=false;
}
const statusLabels={success:'Hoàn thành',sent:'Đã gửi',failed:'Thất bại',pending:'Chờ gửi',partial:'Một phần',scheduled:'Chờ gửi'};
function messageTime(m){if(m.status==='scheduled'&&m.schedule&&Number.isFinite(new Date(m.schedule).getTime())){const p=scheduleParts(m.schedule),pad=n=>String(n).padStart(2,'0');return `${pad(p.day)}/${pad(p.month)}/${p.year} ${pad(p.hour)}:${pad(p.minute)}`;}return m.time||'';}
function maskedPhone(value){const phone=validatePhone(value);return phone?`+84 ${phone.slice(1,3)} ${phone.slice(3,6)} ****`:String(value||'');}
function historyValues(s,project=true){
 const overview=s.context.appHistorySurface==='overview',rows=filterMessages(appMessages(s),{query:overview?'':get(s,'app.history.query'),status:overview?'all':get(s,'app.history.status','all')});if(!overview&&get(s,'app.history.sort','newest')==='oldest')rows.reverse();s.context.appHistoryRows=rows.map(m=>m.id);if(!project)return rows;
 set(s,'app.history.projected',true);set(s,'app.history.count',rows.length+' tin nhắn');
 for(let i=0;i<7;i++){const m=rows[i],scheduledLayout=s.context.appHistoryScheduledLayout;
  set(s,`app.history.${i}.visible`,Boolean(m));set(s,`app.history.${i}.phone`,m?(scheduledLayout?m.template:maskedPhone(m.phone)):'');set(s,`app.history.${i}.description`,m?(scheduledLayout?maskedPhone(m.phone):m.template)+'\n'+messageTime(m):'');set(s,`app.history.${i}.status`,m?(statusLabels[m.status]||m.status):'');set(s,`app.history.${i}.state`,m?.status||'');set(s,`app.history.${i}.oaCount`,Number(m?.oaCount)||0);
 }return rows;
}
function detailValues(s){
 const m=appMessages(s).find(m=>m.id===s.data.selectedId);if(!m)return;
 const time=messageTime(m),n=Math.max(1,Math.min(5,Number(m.oaCount)||1)),complete=['success','partial'].includes(m.status);
 set(s,'app.detail.projected',true);
 for(const key of ['phone','template','oaCount','id','time','schedule'])set(s,'app.detail.'+key,String((key==='time'?time:m[key])??''));
 set(s,'app.detail.openTime',String(m.openTime||m.openedAt||m.receivedAt||(complete?m.time:'Chưa có dữ liệu')));
 const fallback=i=>m.status==='partial'?(i===n-1?'failed':'success'):m.status==='sent'&&n>1?['success','failed','success','pending','pending'][i]:m.status;
 const results=Array.from({length:n},(_,i)=>({name:m.results?.[i]?.name||'OA '+(i+1),state:m.results?.[i]?.status||fallback(i)}));
 const success=results.filter(result=>result.state==='success').length,failed=results.filter(result=>result.state==='failed').length;
 set(s,'app.detail.successCount',success+' Hoàn thành');set(s,'app.detail.failedCount',failed+' Thất bại');set(s,'app.detail.pendingCount',(n-success-failed)+' Chờ gửi');
 for(let i=0;i<5;i++){const result=results[i];set(s,`app.detail.oa.${i}.visible`,Boolean(result));set(s,`app.detail.oa.${i}.name`,result?.name||'');set(s,`app.detail.oa.${i}.state`,result?.state||'');set(s,`app.detail.oa.${i}.status`,result?(statusLabels[result.state]||result.state):'');}
 const title=complete?'Đã nhận đủ thông tin':m.status==='failed'?'Không thể gửi tin':m.status==='scheduled'?'Tin đang chờ gửi':'Tin đã được gửi',subtitle=complete?'Người nhận đã mở tin':m.status==='failed'?'Không đủ số dư ZNS':m.status==='scheduled'?'Dự kiến gửi lúc '+time:'Đang chờ người nhận mở tin';
 set(s,'app.detail.statusTitle',title);set(s,'app.detail.statusDetail',subtitle);
 for(let i=0;i<3;i++)set(s,`app.detail.timeline.${i}.time`,String(m.timeline?.[i]?.time||time));
 s.context.appProjectedRecorded={ipv4:m.ipv4||'Chưa có dữ liệu',ipv6:m.ipv6||'Chưa có dữ liệu',port:m.port||'Chưa có dữ liệu',provider:m.provider||m.carrier||'Chưa có dữ liệu'};
 for(const [key,value]of Object.entries(s.context.appProjectedRecorded))set(s,'app.recorded.'+key,get(s,'app.preferences.recordedVisible',true)?String(value):'••••••');
}
function commitProfile(s,profile){s.data.mobile??={};s.data.mobile.profile={...profile};Object.assign(s.data.profile,{name:profile.name,email:profile.email});for(const [k,v]of Object.entries(profile))set(s,'app.profile.'+k,v);set(s,'app.account.name',profile.name);set(s,'app.overview.greeting','Hello, '+profile.name);s.context.appProfileChanged=true;delete s.context.appProfileOriginal;s.context.appProfileLoading=false;}
const profileKeys=['name','email','phone','gender','verification'];
function holdProfileDraft(s){for(const key of profileKeys){const field='app.profile.'+key;if(Object.hasOwn(s.values,field))s.dirty.add(field);}}
function cancelProfileDraft(s){const original=s.context.appProfileOriginal;if(!original)return;for(const key of profileKeys){const field='app.profile.'+key,value=s.data.mobile?.profile?.[key]??original[key];if(value){set(s,field,value);}else{s.dirty.delete(field);delete s.values[field];}}delete s.context.appProfileOriginal;delete s.context.appPendingProfile;s.context.appProfileLoading=false;}
function recordedValues(frame,s){s.context.appRecordedOriginal??={};const visible=get(s,'app.preferences.recordedVisible',true);for(const t of frame.texts||[]){if(!t.field?.startsWith('app.recorded.'))continue;const fieldKey=frame.id+';'+t.field;s.context.appRecordedOriginal[fieldKey]??=t.text;if(s.dirty.has('app.preferences.recordedVisible'))set(s,t.field,visible?(get(s,'app.detail.projected',false)?s.context.appProjectedRecorded?.[t.field.split('.').at(-1)]||'Chưa có dữ liệu':s.context.appRecordedOriginal[fieldKey]):'••••••');}}
export function prepareAppFrame({frame,session:s,now=Date.now()}){
 s.context??={};const scoped=flowContext(frame,s),copy=permissionCopy(scoped);
 if(standardFrame(scoped)){if(!s.context.appStandardFlow&&!s.data.ui?.appOutcomeChosen&&s.data.draft.outcome==='success')s.data.draft.outcome='sent';s.context.appStandardFlow=true;}
 if(frame.route==='profile-edit'&&!s.context.appProfileOriginal)s.context.appProfileOriginal=Object.fromEntries(profileKeys.map(k=>[k,get(s,'app.profile.'+k,'')]));
 if(frame.route==='profile-loading')s.context.appProfileLoading=true;else if(frame.route!=='profile-edit'&&s.context.appProfileOriginal)cancelProfileDraft(s);
 if(frame.route==='profile'&&s.data.mobile?.profile)for(const [key,value]of Object.entries(s.data.mobile.profile))set(s,'app.profile.'+key,value);
 if(frame.codeCountdown){s.context.appProfileCodeSentAt??=now;const remaining=Math.max(0,Math.ceil((s.context.appProfileCodeSentAt+60000-now)/1000));set(s,'app.profile.code.prefix','00:');set(s,'app.profile.code.seconds',String(remaining).padStart(2,'0'));}
 if(frame.route==='send'){s.context.appSendFrameId=frame.id;s.context.appSendTheme=frame.theme;}
 if(frame.oaLimit||frame.route==='send'){
  s.context.appOALimit=oaLimit(scoped,s);const count=Number(get(s,'app.send.oaCount',s.data.draft.oaCount||1)),clamped=Math.max(1,Math.min(s.context.appOALimit,Number.isFinite(count)?Math.round(count):1));
  if(copy||!Number.isInteger(count)||count<1||count>s.context.appOALimit)set(s,'app.send.oaCount',clamped);
  if(copy)s.data.draft.oaCount=clamped;
 }
 if(copy||s.context.appConfirmStarted){
  const count=Number(get(s,'app.send.oaCount',s.data.draft.oaCount||1)),remaining=Math.max(0,count-1);
  if(Number.isInteger(count)&&count>=1&&count<=5){set(s,'app.send.oaCountDisplay',count+' OA');set(s,'app.send.totalMessages',(count*2)+' tin');set(s,'app.send.extraOA',remaining>1?remaining+' OA còn lại':remaining===1?'OA phụ 1 ':'');set(s,'app.send.extraAllocation',remaining?remaining+' tin V4 + '+remaining+' tin V6':'');}
 }
 if(frame.id==='1635:110403'||frame.theme==='dark'&&frame.route==='otp'&&frame.family==='fingerprint')s.context.appOtpPurpose='fingerprint';
 if(['1635:112161','1456:15057'].includes(frame.id))s.context.appOtpPurpose='password';
 if(frame.profileContact)s.context.appContactEmail=frame.profileContact==='email';
 if(frame.route!=='schedule'){cancelScheduleChoice(s);if(s.context.appEditingSchedule)endScheduleEdit(s);s.context.appScheduleOpen=false;}
 if(frame.scheduleEdit&&!s.context.appEditingSchedule){selectedScheduledMessage(frame,s);beginScheduleEdit(s);openAppSchedule(s,{now,iso:appMessages(s).find(m=>m.id===s.data.selectedId)?.schedule??null});}
 if(frame.route==='schedule'){if(!s.context.appScheduleOpen)openAppSchedule(s,{now});else syncAppSchedule(s,s.context.appScheduleDate,{now});}
 if(['history','overview'].includes(frame.route)){s.context.appHistorySurface=frame.route;s.context.appHistoryScheduledLayout=false;}
 if(frame.route==='history'){
  const initialStatus=frame.historyStatus||({'1085:71117':'scheduled','1444:92629':'scheduled','1303:79880':'sent','1444:91774':'sent','1303:80128':'success','1444:92022':'success','1303:80614':'failed','1444:92328':'failed'}[frame.id])||'all';
  s.context.appHistoryScheduledLayout=initialStatus==='scheduled';
  if(s.context.appHistoryFrameId!==frame.id&&(copy||s.dirty.has('app.history.status')))set(s,'app.history.status',initialStatus);
  s.context.appHistoryFrameId=frame.id;
 }
 if(['history','overview'].includes(frame.route))historyValues(s,Boolean(copy||s.context.appMessagesChanged||s.dirty.has('app.history.query')||s.dirty.has('app.history.status')||s.dirty.has('app.history.sort')));
 if(frame.route==='detail'){if(s.context.appSelectedMessage)detailValues(s);recordedValues(frame,s);}
}

/** Pure sample-data actions. The shell owns rendering, timers, focus and navigation. */
export function handleAppInteraction({frame,control,session:s,value,now=Date.now()}){
 if(!control?.action?.startsWith('app.'))return null;
 s.context??={};s.data.mobile??={};const scoped=flowContext(frame,s),copy=permissionCopy(scoped);const standard=standardFrame(scoped)&&frame.theme!=='dark';
 const sourceTarget=id=>copy?resolveAppPermissionFrameId(id,{variant:scoped.appPermissionVariant,theme:frame.theme||s.data.ui.theme}):id;
 const go=route=>{s.data.ui.route=route;const theme=frame.theme||s.data.ui.theme;let targetId=route==='detail'?((standard||frame.theme==='dark')&&!s.context.appSelectedMessage?appRouteFrameId(frame.route==='scheduled-result'?'scheduled-detail':'detail',scoped,theme):appDetailFrameId(appMessages(s).find(m=>m.id===s.data.selectedId),scoped)):appRouteFrameId(route,scoped,theme);if(route==='send-ready'&&!copy&&theme==='dark'&&frame.route!=='send'&&s.context.appSendTheme==='dark'&&s.context.appSendFrameId)targetId=s.context.appSendFrameId;if(route==='confirm'&&copy)targetId=appRouteFrameId(Number(s.data.draft.oaCount)>1?'multi-confirm':'confirm',scoped,theme);else if(route==='confirm'&&theme==='dark'&&Number(s.data.draft.oaCount)>1)targetId='1430:88099';else if(route==='confirm'&&standard)targetId=Number(s.data.draft.oaCount)>1?'1635:105774':'1635:109001';else if(route==='confirm'&&s.data.draft.scheduled){targetId=Number(s.data.draft.oaCount)>1?(theme==='dark'?'1430:88099':'1313:75767'):appRouteFrameId('send-choice',frame,theme);}return{targetId,...(targetId&&s.history?.at(-1)===targetId?{back:true}:{})};};
 const invalid=(field,message)=>({focusField:field,message});
 const completeOtp=()=>{if(s.context.appOtpPurpose==='fingerprint')return {...go('fingerprint'),replace:true};if(s.context.appOtpPurpose==='password')return {...go('password'),replace:true};return go('new-password');};
 switch(control.action){
 case 'app.navigate':if(frame.route==='schedule'&&s.context.appEditingSchedule)endScheduleEdit(s);if(control.route==='history')historyValues(s,Boolean(copy||s.context.appMessagesChanged));if(control.route==='detail')detailValues(s);if((standard||frame.theme==='dark')&&control.route==='password'&&frame.route==='account'){s.context.appOtpPurpose='password';set(s,'app.auth.otp','');return go('otp-password');}const route=control.route||((standard||frame.theme==='dark')?nativeFlowTargets[control.targetId]:null);return route?go(route):control.targetId?{targetId:sourceTarget(control.targetId)}:null;
 case 'app.back':{const profileEditing=frame.route==='profile-edit';if(profileEditing)cancelProfileDraft(s);const editing=frame.route==='schedule'&&s.context.appEditingSchedule;if(editing)endScheduleEdit(s);else if(frame.route==='schedule')cancelScheduleChoice(s);return s.history?.length?{back:true}:go(profileEditing?'profile':editing?'scheduled-detail':frame.route==='schedule'?'confirm':['devices','sessions','password','fingerprint'].includes(frame.route)?'account':'overview');}
 case 'app.login':{
  if(!String(get(s,'app.auth.username')).trim())return invalid('app.auth.username','Vui lòng nhập email hoặc tên đăng nhập.');
  if(!String(get(s,'app.auth.password')))return invalid('app.auth.password','Vui lòng nhập mật khẩu.');
  s.context.appAuthenticated=true;return go('overview');
 }
 case 'app.logout':s.context.appAuthenticated=false;s.history=[];return {...go('login'),replace:true};
 case 'app.forgot.submit':{const phone=get(s,'app.auth.recoveryPhone');if(!validatePhone(phone))return invalid('app.auth.recoveryPhone','Vui lòng nhập số điện thoại Việt Nam hợp lệ.');s.context.appOtpPurpose='recovery';s.data.mobile.recoveryPhone=phone;set(s,'app.auth.maskedPhone',String(phone).slice(0,1)+'*******'+String(phone).slice(-2));return go('otp');}
 case 'app.otp':{if(control.field==='app.auth.otp'){const code=String(value??get(s,control.field)).replace(/\D/g,'').slice(0,6);set(s,control.field,code);return code.length===6?completeOtp():{};}if(control.field){set(s,control.field,String(value??get(s,control.field)).replace(/\D/g,'').slice(0,1));}const code=Array.from({length:6},(_,i)=>get(s,'app.auth.otp.'+i)).join('');if(/^\d{6}$/.test(code))return completeOtp();return{focusField:'app.auth.otp.'+Math.min(5,Number(control.field?.split('.').at(-1)||0)+1)};}
 case 'app.otp.resend':return{message:'Đã gửi lại mã xác minh mẫu.',repaint:false};
 case 'app.password.save':case 'app.reset.save':{
  const reset=control.action==='app.reset.save',prefix=reset?'app.reset':'app.password';
  if(!reset&&!get(s,prefix+'.current'))return invalid(prefix+'.current','Vui lòng nhập mật khẩu hiện tại.');
  const next=String(get(s,prefix+'.next')),confirm=String(get(s,prefix+'.confirm'));
  if(!passwordValid(next,reset?12:8,reset?Infinity:20))return invalid(prefix+'.next',reset?'Dùng tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.':'Mật khẩu cần từ 8 đến 20 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
  if(next!==confirm)return invalid(prefix+'.confirm','Mật khẩu xác nhận chưa khớp.');
  s.context.appPasswordChanged=true;return go(reset?'password-result':'account');
 }
 case 'app.input':{
  if(control.field==='app.send.oaCount'){const number=Number(get(s,control.field));if(!Number.isInteger(number)||number<1||number>oaLimit(frame,s)){if(scoped.appPermissionVariant==='single'){set(s,control.field,1);s.data.draft.oaCount=1;}return{...invalid(control.field,'Số OA phải từ 1 đến '+oaLimit(frame,s)+'.'),repaint:false};}}
  if(control.field?.startsWith('app.send.')){syncDraft(s);if(scoped.appPermissionVariant!=='single'&&control.field==='app.send.phone'&&['734:77892','1430:86270'].includes(frame.id)&&validatePhone(get(s,control.field)))return{...go('send-ready'),focusField:'app.send.phone'};}
  if(control.field?.startsWith('app.history.')){historyValues(s);return{repaint:false};}
  return{};
 }
 case 'app.eye':return{togglePassword:control.field,repaint:false};
 case 'app.recorded.toggle':set(s,'app.preferences.recordedVisible',!get(s,'app.preferences.recordedVisible',true));recordedValues(frame,s);return{repaint:false};
 case 'app.map.zoom':set(s,'app.detail.mapZoom',Math.max(1,Math.min(1.6,Number(get(s,'app.detail.mapZoom',1))+Number(control.value||0))));return{repaint:false};
 case 'app.map.focus':set(s,'app.detail.mapZoom',1.3);return{scrollToBox:frame.transforms?.find(t=>t.mode==='map')?.box,repaint:false};
 case 'app.send.next':{const draft=syncDraft(s);if(!validatePhone(draft.phone))return invalid('app.send.phone','Vui lòng nhập số điện thoại Việt Nam hợp lệ.');if(!Number.isInteger(draft.oaCount)||draft.oaCount<1||draft.oaCount>oaLimit(frame,s))return invalid('app.send.oaCount','Số OA phải từ 1 đến '+oaLimit(frame,s)+'.');set(s,'app.send.scheduled',Boolean(draft.scheduled));s.context.appConfirmStarted=true;s.context.appSendCompleted=false;return go('confirm');}
 case 'app.oa.minus':case 'app.oa.plus':{const current=Number(get(s,'app.send.oaCount',s.data.draft.oaCount)),base=Number.isInteger(current)&&current>=1&&current<=oaLimit(frame,s)?current:s.data.draft.oaCount||1,n=Math.max(1,Math.min(oaLimit(frame,s),base+(control.action.endsWith('plus')?1:-1)));set(s,'app.send.oaCount',n);syncDraft(s);return{repaint:false};}
 case 'app.send.confirm':{
  if(s.context.appSendCompleted)return go(s.data.draft.scheduled?'scheduled-result':'result');
  syncDraft(s);if(!Number.isInteger(s.data.draft.oaCount)||s.data.draft.oaCount<1||s.data.draft.oaCount>oaLimit(frame,s))return invalid('app.send.oaCount','Số OA không hợp lệ.');if(s.data.draft.scheduled){try{validateAppSchedule(s.data.draft.schedule,{now});}catch(error){return invalid('app.send.schedule',error.message);}}
  try{const pending=s.data.pendingSubmission;if(pending&&!pending.row){const d=s.data.draft;if(validatePhone(pending.input.phone)!==validatePhone(d.phone)||pending.input.oaCount!==d.oaCount||pending.input.template!==d.template||pending.input.outcome!==d.outcome||pending.input.schedule!==(d.scheduled?d.schedule:''))return invalid('app.send.phone','Yêu cầu trước đang xử lý. Vui lòng chờ hoàn tất.');}if(!pending||pending.row){const job=beginSubmission(s.data,s.data.draft,{now});s.context.appPendingJob=job.id;}}catch(error){return invalid(error.field||'app.send.phone',error.message);}
  if((standard||copy)&&s.data.draft.scheduled)return handleAppInteraction({frame:scoped,control:{action:'app.send.finish'},session:s,now});
  set(s,'app.pending.id',s.data.pendingSubmission?.messageId||'');return {...go('processing'),pendingJobId:s.context.appPendingJob};
 }
 case 'app.send.finish':{
  const pending=s.data.pendingSubmission;if(pending&&!pending.row&&(!Number.isInteger(pending.input.oaCount)||pending.input.oaCount<1||pending.input.oaCount>oaLimit(frame,s))){delete s.data.pendingSubmission;delete s.context.appPendingJob;return{...go('send-ready'),...invalid('app.send.oaCount','Số OA không hợp lệ.')};}
  let row;try{const job=s.data.pendingSubmission;if(job&&!job.row&&job.input.schedule)validateAppSchedule(job.input.schedule,{now});row=finishSubmission(s.data,s.context.appPendingJob,{now});}catch(error){if(s.data.pendingSubmission&&!s.data.pendingSubmission.row){delete s.data.pendingSubmission;delete s.context.appPendingJob;}return {...go('schedule'),...invalid(error.field||'app.send.schedule',error.message)};}if(row){s.data.selectedId=row.id;s.context.appSendCompleted=true;s.context.appMessagesChanged=true;s.context.appSelectedMessage=true;detailValues(s);historyValues(s);}return go(row?.status==='scheduled'?'scheduled-result':'result');
 }
 case 'app.schedule.open':{if(s.context.appEditingSchedule)endScheduleEdit(s);s.context.appScheduleChoice??={schedule:s.data.draft.schedule||'',scheduled:Boolean(s.data.draft.scheduled),date:s.context.appScheduleDate};set(s,'app.send.scheduled',s.context.appScheduleChoice.scheduled);openAppSchedule(s,{now});return go('schedule');}
 case 'app.schedule.day':case 'app.schedule.month':case 'app.schedule.hour':case 'app.schedule.minute':{try{changeAppSchedule(s,{part:control.action.split('.').at(-1),value:value??control.value,calendarIndex:control.calendarIndex},{now});return{repaint:false,calendar:true};}catch{return{...invalid('app.send.schedule','Chọn thời gian trong tương lai, từ 07 đến 23 giờ, phút 00 hoặc 30, trong hôm nay đến hôm nay + 14 ngày.'),calendar:true};}}
 case 'app.schedule.now':set(s,'app.send.scheduled',false);set(s,'app.send.schedule','');syncDraft(s);return{repaint:true};
 case 'app.schedule.save':{const save=scheduleSaveState(s,{now});if(!save.valid||!save.changed)return invalid('app.send.schedule',save.message||'Lịch gửi chưa có thay đổi.');let schedule;try{schedule=validateAppSchedule(get(s,'app.send.schedule'),{now});}catch(error){return invalid('app.send.schedule',error.message);}syncAppSchedule(s,schedule,{now});if(s.context.appEditingSchedule){const m=appMessages(s).find(m=>m.id===(s.context.appScheduleEdit?.messageId||s.data.selectedId));if(!m)return invalid('app.send.schedule','Lịch gửi không còn tồn tại. Vui lòng mở lại từ lịch sử.');m.schedule=s.context.appScheduleDate;m.status='scheduled';s.data.selectedId=m.id;s.context.appSelectedMessage=true;s.context.appMessagesChanged=true;endScheduleEdit(s);detailValues(s);return go('scheduled-detail');}set(s,'app.send.scheduled',true);delete s.context.appScheduleChoice;syncDraft(s);return go('confirm');}
 case 'app.schedule.cancel':{const message=selectedScheduledMessage(frame,s);if(!message)return {...go('history'),message:'Lịch gửi không còn tồn tại.'};const id=message.id;if(frame.scheduledRecord?.id===id)s.context.appCanceledSourceSchedules=[...new Set([...(s.context.appCanceledSourceSchedules||[]),id])];appMessages(s);s.data.messages=s.data.messages.filter(m=>m.id!==id);s.data.mobile.fixtures=(s.data.mobile.fixtures||[]).filter(m=>m.id!==id);s.context.appMessagesChanged=true;historyValues(s);return go('history');}
 case 'app.schedule.edit':{const message=selectedScheduledMessage(frame,s);if(!message&&frame.scheduledRecord)return {...go('history'),message:'Lịch gửi không còn tồn tại.'};beginScheduleEdit(s);openAppSchedule(s,{now,iso:message?.schedule??null});return go('schedule-edit');}
 case 'app.history.filter':set(s,'app.history.status',control.value||value||'all');historyValues(s);return control.targetId?{targetId:sourceTarget(control.targetId)}:{repaint:true};
 case 'app.history.sort':set(s,'app.history.sort',value||control.value||'newest');historyValues(s);return{repaint:true};
 case 'app.history.detail':{const rows=s.context.appHistoryRows||appMessages(s).map(m=>m.id),id=rows[control.rowIndex??0];if(!id)return{repaint:false};const m=appMessages(s).find(m=>m.id===id);if(!m)return{repaint:false};s.data.selectedId=id;s.context.appSelectedMessage=true;detailValues(s);return{targetId:appDetailFrameId(m,scoped)};}
 case 'app.profile.edit':return go('profile-edit');
 case 'app.profile.verify.send':{holdProfileDraft(s);const email=String(get(s,'app.profile.email')).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return invalid('app.profile.email','Email không hợp lệ.');s.context.appProfileVerificationRequested=true;s.context.appProfileCodeSentAt=now;set(s,'app.profile.verification','');return {targetId:frame.theme==='dark'?'1456:12656':control.targetId||'891:1762',focusField:'app.profile.verification'};}
 case 'app.profile.verify.tick':{if((s.context.appProfileCodeSentAt??now)+60000<=now)return go('profile-email');return{repaint:false};}
 case 'app.profile.finish':{const profile=s.context.appPendingProfile;if(!profile)return go('profile');delete s.context.appPendingProfile;commitProfile(s,profile);return {...go('profile-result'),replace:true};}
 case 'app.profile.save':{
  const profile={};for(const name of ['name','email','phone','gender','verification'])profile[name]=String(get(s,'app.profile.'+name,s.data.mobile.profile?.[name]||'')).trim();
  if(!profile.name)return invalid('app.profile.name','Vui lòng nhập tên.');if(profile.phone&&!validatePhone(profile.phone))return invalid('app.profile.phone','Vui lòng nhập số điện thoại Việt Nam hợp lệ.');if(frame.controls?.some(c=>c.field==='app.profile.verification')&&!/^\d{6}$/.test(profile.verification))return invalid('app.profile.verification','Nhập mã xác minh gồm 6 chữ số.');if(profile.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))return invalid('app.profile.email','Email không hợp lệ.');
  if(standard||frame.theme==='dark'){s.context.appPendingProfile=profile;return {...go((frame.profileContact==='email'||s.context.appContactEmail)?'profile-email-loading':'profile-loading'),replace:true};}commitProfile(s,profile);return go('profile-result');
 }
 case 'app.profile.camera':{const filename=String(value||get(s,'app.profile.avatar')).split(/[\\/]/).at(-1);if(!filename)return{};set(s,'app.profile.avatar',filename);s.data.mobile.avatarFilename=filename;return{message:'Đã chọn '+filename+' cho ảnh đại diện mẫu.',repaint:false};}
 case 'app.profile.contact-switch':{holdProfileDraft(s);s.context.appContactEmail=!(frame.profileContact?frame.profileContact==='email':s.context.appContactEmail);const emailFrame=standard?'1635:111726':frame.theme==='dark'?'1456:12566':'863:50327';return{targetId:s.context.appContactEmail?emailFrame:appRouteFrameId('profile-edit',scoped),focusField:s.context.appContactEmail?'app.profile.email':'app.profile.phone'};}
 case 'app.theme':{const theme=control.value||value||'light';s.data.mobile.themeMode=theme;s.data.ui.theme=theme==='system'?(s.context.systemTheme||'light'):theme;set(s,'app.preferences.theme',theme);s.history=(s.history||[]).map(id=>{if(copy)return resolveAppPermissionFrameId(id,{variant:scoped.appPermissionVariant,theme:s.data.ui.theme})||id;const route=routeForFrameId(id);return route?appRouteFrameId(route,scoped,s.data.ui.theme)||id:id;});return{targetId:appRouteFrameId('appearance',scoped,s.data.ui.theme),replace:true};}
 case 'app.language':set(s,'app.preferences.language',control.value||value||'Tiếng Việt');s.data.mobile.language=get(s,'app.preferences.language');return{message:'Đã chọn ngôn ngữ mẫu '+s.data.mobile.language+'.',repaint:true};
 case 'app.fingerprint':if(s.data.preferences.fingerprint){s.data.preferences.fingerprint=false;set(s,'app.preferences.fingerprint',false);return{repaint:true};}set(s,'app.preferences.fingerprint',false);if(standard||frame.theme==='dark'){s.context.appOtpPurpose='fingerprint';set(s,'app.auth.otp','');return go('otp-fingerprint');}return go('fingerprint');
 case 'app.fingerprint.verify':s.data.preferences.fingerprint=true;set(s,'app.preferences.fingerprint',true);return {...go('fingerprint-success'),replace:true};
 case 'app.preference':{const field=control.field,selected=value??(typeof get(s,field)==='boolean'?!get(s,field):get(s,field));set(s,field,selected);s.data.preferences[field?.split('.').at(-1)||control.id]=selected;return{repaint:true};}
 case 'app.delete.open':return go(control.value==='account'?'delete-account':'delete-data');
 case 'app.delete.confirm':delete s.data.pendingSubmission;delete s.context.appPendingJob;s.context.appSendCompleted=false;s.data.mobile.dataCleared=true;s.context.appMessagesChanged=true;if(control.value==='account'){s.context.appAuthenticated=false;s.data.messages=[];return {...go('deleted-account'),replace:true};}s.data.messages=[];set(s,'app.history.count','0 tin nhắn');return {...go('deleted-data'),replace:true};
 case 'app.copy':return{copy:control.field?get(s,control.field,control.value||frame.texts?.find(t=>t.field===control.field)?.text||''):control.value||'',message:'Đã sao chép dữ liệu mẫu.'};
 case 'app.device.logout':s.context.appLoggedOutDevices=(s.context.appLoggedOutDevices||0)+1;return{...go('login'),message:'Đã đăng xuất thiết bị mẫu.'};
 case 'app.notice':return{message:control.message||'Đã thực hiện thao tác mẫu.',repaint:false};
 default:return null;
 }
}
