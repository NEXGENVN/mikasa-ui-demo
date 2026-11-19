import {createDemoState} from '../figma-preview/core.mjs';
import {mobileScreens,getMobileFrame} from '../figma-preview/mobile.mjs';
import {webScreens,getWebFrame} from '../figma-preview/web.mjs';

export function createNativeFlowMap(){
 const map=new Map();
 const add=(s,route,extra={})=>{const app=s.ui.platform==='app',frame=app?getMobileFrame(s,route):getWebFrame(s,route);map.set(frame.id,{flowRoute:route,flowState:{...(app?{theme:frame.sourceTheme}:{}),...extra}});};
 for(const theme of ['light','dark'])for(const [route] of mobileScreens){const s=createDemoState();Object.assign(s.ui,{platform:'app',route,theme});add(s,route);if(route==='send'){s.draft.phone='0912345678';add(s,route,{draft:{phone:'0912345678'}});}}
 for(const theme of ['light','dark'])for(const status of ['sent','success','partial','failed','scheduled'])for(const oaCount of [1,5]){
  if(status==='scheduled'&&oaCount!==1)continue;
  const s=createDemoState();Object.assign(s.ui,{platform:'app',route:'detail',theme});s.mobile={fixtures:[{id:'figma-source-detail',phone:'033 222 5555',template:'Thông báo đơn hàng',time:'15/09/2025 10:00',status,oaCount}]};s.selectedId='figma-source-detail';add(s,'detail',{detail:{status,oaCount}});
 }
 for(const platform of ['web','web-portrait'])for(const [route] of webScreens){
  const s=createDemoState();Object.assign(s.ui,{platform,route});add(s,route);
  if(route==='oa')for(const tab of ['gif','messages']){s.ui.tab=tab;add(s,route,{ui:{tab}});}
  if(route==='accounts'){s.ui.tab='recovery';add(s,route,{ui:{tab:'recovery'}});}
  if(route==='security')for(const tab of ['sessions','notifications']){s.ui.tab=tab;add(s,route,{ui:{tab}});}
  if(route==='settings'){s.ui.role='Delivery Management';add(s,route,{ui:{role:'Delivery Management'}});s.ui.adminRoleDialog=true;add(s,route,{ui:{role:'Delivery Management',adminRoleDialog:true}});}
  if(route==='account-detail'){s.ui.webModal='disable-account';add(s,route,{ui:{webModal:'disable-account'}});}
  if(route==='detail'){const m=s.messages.find(m=>m.status==='failed');s.selectedId=m.id;add(s,route,{detail:{status:'failed'}});}
 }
 map.set('1635:105527',{flowRoute:'send',flowState:{theme:'light',draft:{phone:'0912345678',oaCount:5}}});return map;
}
