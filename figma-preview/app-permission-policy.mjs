import {APP_STANDARD_DESTINATIONS,standardAppEntryFrameId} from './app-standard-flow.mjs';
import {nativeFrames} from './native-frames.mjs';

// All pairs identify supplied App originals; the permission copies own state only.
export const APP_PERMISSION_ROUTES=Object.freeze({
 login:['658:1036','1456:19654'],overview:['506:23873','1430:85737'],send:['773:88074','1430:86331'],'send-ready':['773:88074','1430:86331'],
 confirm:['1279:8766','1430:88175'],'send-choice':['1279:8597','1430:88032'],'multi-confirm':['1313:75767','1430:88099'],processing:['778:89003','1430:87483'],result:['1279:8878','1430:87433'],
 schedule:['1279:8468','1430:87964'],'schedule-edit':['1107:4929','1444:94357'],'scheduled-result':['1086:73093','1442:91277'],
 history:['784:48201','1430:85846'],'history-sent':['1303:79880','1444:91774'],'history-success':['1303:80128','1444:92022'],'history-failed':['1303:80614','1444:92328'],'history-scheduled':['1085:71117','1444:92629'],
 detail:['784:48751','1430:86619'],'multi-detail':['1308:6902','1450:8895'],'failed-detail':['784:50672','1444:95125'],'multi-failed-detail':['1308:7021','1450:9014'],'success-detail':['784:49355','1430:87138'],'multi-success-detail':['1308:7105','1450:9130'],'partial-detail':['1309:7446','1450:9522'],'scheduled-detail':['1086:73413','1444:93591'],
 account:['823:51460','1450:9744'],profile:['843:50360','1456:12239'],'profile-edit':['843:50716','1456:12749'],'profile-result':['843:50893','1456:12865'],'profile-email':['863:50327','1456:12566'],'profile-loading':['843:50626','1456:12806'],'profile-email-loading':['891:1869','1456:12702'],
 appearance:['863:1499','1450:10174'],language:['863:1189','1450:10146'],password:['843:50060','1456:14695'],devices:['843:51550','1456:14865'],sessions:['852:51826','1456:14881'],data:['1112:76654','1450:9816'],'delete-data':['1112:76816','1450:9840'],'delete-account':['1112:76975','1450:9918'],'deleted-data':['1112:77043','1450:9878'],'deleted-account':['1112:77107','1450:9956'],
 fingerprint:['891:2144','1450:9996'],'fingerprint-success':['916:2740','1456:11813'],'otp-fingerprint':['891:2337','1450:10188'],'otp-password':['891:3812','1456:15057'],forgot:['658:34375'],otp:['658:34596'],'new-password':['658:34855'],'password-result':['658:35036']
});
const routeById=new Map(Object.entries(APP_PERMISSION_ROUTES).flatMap(([route,ids])=>ids.map(id=>[id,route])));
const sourceThemeById=new Map(nativeFrames.filter(frame=>frame.platform==='app').map(frame=>[frame.id,frame.theme]));
for(const [route,id]of Object.entries(APP_STANDARD_DESTINATIONS))if(!routeById.has(id))routeById.set(id,route);
const extraSendIds=['734:77892','1330:76607','1330:76745','1330:76883','734:78586','734:78690','734:78794','734:78898','1430:86270','1442:90757','1442:90887','1442:91017','1442:91147','1432:10566','1432:10696','1432:10827'];
for(const id of extraSendIds)routeById.set(id,'send');
export const appPermissionVariant=variant=>['full','single'].includes(variant)?variant:'standard';
export function appPermissionOALimit(frame={},session={}){
 const variant=appPermissionVariant(session.context?.appPermissionVariant??frame.appPermissionVariant);
 return variant==='full'?5:variant==='single'?1:frame.oaLimit||session.context?.appOALimit||((frame.standardFlow===true||String(frame.id||'').startsWith('1635:'))?2:5);
}
export function resolveAppPermissionFrameId(routeOrId,{variant='standard',theme='light',fallbackId}={}){
 variant=appPermissionVariant(variant);
 const match=/^figma-(\d+)-(\d+)$/.exec(routeOrId||''),id=match?match[1]+':'+match[2]:/^\d+:\d+$/.test(routeOrId||'')?routeOrId:null;
 // A hash identifies a concrete original, including its native theme.
 if(match&&sourceThemeById.has(id))theme=sourceThemeById.get(id);
 let route=id?routeById.get(id):routeOrId;
 if(variant==='standard'){
  if(id&&!match)return id;
  if(theme==='dark'&&APP_PERMISSION_ROUTES[route]?.[1])return APP_PERMISSION_ROUTES[route][1];
  return standardAppEntryFrameId(routeOrId,fallbackId);
 }
 if(variant==='single')route=id==='1635:105774'?'confirm':({'multi-confirm':'confirm','multi-detail':'detail','multi-failed-detail':'failed-detail','multi-success-detail':'success-detail','partial-detail':'failed-detail'}[route]||route);
 const ids=variant==='single'&&['send','send-ready'].includes(route)?['734:77892','1430:86270']:APP_PERMISSION_ROUTES[route];
 return ids?(theme==='dark'&&ids[1]?ids[1]:ids[0]):id||fallbackId||null;
}
export function appPermissionFrameMetadata(frame,{variant=frame.appPermissionVariant,session}={}){
 variant=appPermissionVariant(variant??session?.context?.appPermissionVariant);
 if(variant==='standard')return frame;
 const limit=variant==='single'?1:5;
 const controls=(frame.controls||[]).map(control=>control.field==='app.send.oaCount'?{...control,value:variant==='single'?'1':control.value,readOnly:variant==='single',options:control.options?.filter(option=>Number(option.value)<=limit)}:/^app\.oa\./.test(control.action||'')&&variant==='single'?{...control,disabled:true}:control);
 const componentStates=(frame.componentStates||[]).map(component=>{
  if(component.field!=='app.send.oaCount')return component;
  const entries=Object.entries(component.states||{}).filter(([value])=>Number(value)<=limit).map(([value,state])=>[value,{...state,controls:(state.controls||[]).map(control=>/^app\.oa\./.test(control.action||'')&&variant==='single'?{...control,disabled:true}:control.field===component.field&&variant==='single'?{...control,readOnly:true}:control)}]);
  return {...component,initialValue:variant==='single'?'1':component.initialValue,states:Object.fromEntries(entries)};
 });
 return {...frame,appPermissionVariant:variant,standardFlow:false,oaLimit:limit,controls,componentStates};
}
