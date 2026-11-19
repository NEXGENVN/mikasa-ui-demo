export const platforms=Object.freeze([
 Object.freeze({id:'web',label:'Web ngang'}),
 Object.freeze({id:'web-portrait',label:'Web dọc'}),
 Object.freeze({id:'app',label:'App'})
]);
export const isWebPlatform=id=>id==='web'||id==='web-portrait';
export function parsePreviewHash(hash,routes){
 const [requestedPlatform,requestedRoute]=String(hash).replace(/^#/,'').split('/');
 if(!platforms.some(p=>p.id===requestedPlatform))return {platform:'web',route:'overview'};
 const platform=requestedPlatform;
 const route=(routes[platform]||[]).some(([id])=>id===requestedRoute)||['palette','states'].includes(requestedRoute)?requestedRoute:'overview';
 return {platform,route};
}
