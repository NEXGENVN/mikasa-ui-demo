import {mobileFixtures} from './mobile.mjs';
import {createDemoState} from './core.mjs';
import {createInteractiveSession} from './interactive-session.mjs';
export const APP_VARIANTS=Object.freeze([{id:'standard',label:'App'},{id:'full',label:'App Full quyền'},{id:'single',label:'App 1 quyền'}].map(Object.freeze));
export const normalizeAppVariant=value=>APP_VARIANTS.some(v=>v.id===value)?value:'standard';
export const appVariantFromQuery=query=>normalizeAppVariant(new URLSearchParams(query).get('app'));
export function appPreviewHash({platform,route,mode='source',variant='standard'}){const query=new URLSearchParams();if(mode==='flow')query.set('mode','flow');if(platform==='app'&&normalizeAppVariant(variant)!=='standard')query.set('app',normalizeAppVariant(variant));return '#'+platform+'/'+route+(query.size?'?'+query:'');}

/** The copies share native artwork and shell UI, while sample state remains separate. */
export function createAppVariantStore(baseData){
 const sessions=new Map(),routes=new Map();
 const initialize=(id,data)=>{const s=createInteractiveSession(data);s.context.appPermissionVariant=id;return s;};
 const fresh=id=>{const data=createDemoState();if(id!=='standard')data.draft.oaCount=id==='full'?5:1;if(id==='single')data.mobile={fixtures:mobileFixtures.map(row=>({...row,oaCount:1}))};return data;};
 sessions.set('standard',initialize('standard',baseData));
 function get(value,ui){const id=normalizeAppVariant(value);if(!sessions.has(id))sessions.set(id,initialize(id,fresh(id)));const s=sessions.get(id);if(ui){s.data.ui=ui;ui.appOutcomeChosen=Boolean(s.context.appOutcomeChosen);}return s;}
 function reset(value,{data}={}){const id=normalizeAppVariant(value),s=initialize(id,data||fresh(id));sessions.set(id,s);routes.set(id,'overview');return s;}
 function restart(value){const id=normalizeAppVariant(value),data=get(id).data;if(data.pendingSubmission&&!data.pendingSubmission.row)delete data.pendingSubmission;Object.assign(data.draft,{phone:'033 222 5555',oaCount:id==='full'?5:1,schedule:'',scheduled:false,outcome:id==='standard'?'sent':'success'});const s=initialize(id,data);sessions.set(id,s);return s;}
 return {get,reset,restart,bindStandard:data=>reset('standard',{data}),rememberRoute(value,route){routes.set(normalizeAppVariant(value),route);},route:value=>routes.get(normalizeAppVariant(value))||'overview'};
}
