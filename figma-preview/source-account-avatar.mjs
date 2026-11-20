const ns='http://www.w3.org/2000/svg';
const accountFrames=new Set(['823:51460','891:2144','916:2740','1635:110138','1635:110629','1635:110452','1450:9744','1450:9996','1456:11813']);
const photoAsset='1939fe761b2e4a2fa134ed8c344843fa8e9e93e87ba17eb04de1163dea5e4854.jpg';
const near=(a,b)=>Math.abs(Number(a)-b)<.02;

/** User reference rounds the existing account photo to its native backing shape. */
export function roundSourceAccountAvatars(document,{frameId}={}){
 if(!accountFrames.has(frameId))return 0;
 const svg=document?.querySelector('svg');if(!svg)return 0;
 const rects=[...svg.querySelectorAll('rect[fill]')];let count=0;
 for(const photo of rects){
  if(photo.getAttribute('clip-path')||!near(photo.getAttribute('width'),58)||!near(photo.getAttribute('height'),61.8667))continue;
  const patternId=/^url\(#([^\s)]+)\)$/.exec(photo.getAttribute('fill')||'')?.[1],pattern=document.getElementById(patternId),use=pattern?.querySelector('use'),imageId=(use?.getAttribute('href')||use?.getAttribute('xlink:href')||'').replace(/^#/,''),image=document.getElementById(imageId);
  if(!(image?.getAttribute('href')||image?.getAttribute('xlink:href')||'').endsWith(photoAsset))continue;
  const x=Number(photo.getAttribute('x')),y=Number(photo.getAttribute('y')),backing=rects.find(rect=>near(rect.getAttribute('x'),x-.5)&&near(rect.getAttribute('y'),y-.5)&&near(rect.getAttribute('width'),59)&&near(rect.getAttribute('height'),63)&&near(rect.getAttribute('rx'),29.5));
  if(!backing)continue;
  const clip=document.createElementNS(ns,'clipPath'),shape=backing.cloneNode(false),id='account-avatar-'+frameId.replace(':','-')+'-'+count;
  clip.setAttribute('id',id);clip.setAttribute('clipPathUnits','userSpaceOnUse');shape.removeAttribute('stroke');shape.setAttribute('fill','white');clip.append(shape);
  let defs=svg.querySelector('defs');if(!defs){defs=document.createElementNS(ns,'defs');svg.append(defs);}defs.append(clip);photo.setAttribute('clip-path','url(#'+id+')');count++;
 }
 return count;
}
