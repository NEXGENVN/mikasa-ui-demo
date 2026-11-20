const reference=value=>/^url\(\s*["']?#([^\s)'";]+)["']?\s*\)$/.exec(value||'')?.[1];
/** Restore the native opaque wheel backdrop lost at SVG clip-group boundaries.
 * The original color-burn band, blur, glyphs and viewport remain untouched.
 * A white backdrop makes color-burn preserve white while tinting the digits.
 */
export function restoreSourceWheelBackdrops(document){
 const svg=document?.querySelector('svg');if(!svg)return 0;let added=0;
 for(const band of svg.querySelectorAll('g[filter]')){
  if(!/(?:^|;)\s*mix-blend-mode\s*:\s*color-burn\s*(?:;|$)/i.test(band.getAttribute('style')||''))continue;
  const filter=document.getElementById(reference(band.getAttribute('filter'))),blur=filter?.querySelector('feGaussianBlur');
  if(!/foregroundBlur/.test(blur?.getAttribute('result')||''))continue;
  const parent=band.parentElement,clip=document.getElementById(reference(parent?.getAttribute('clip-path'))),rect=clip?.querySelector('rect');
  if(!rect||Number(rect.getAttribute('width'))!==126||Number(rect.getAttribute('height'))!==200)continue;
  if([...parent.children].some(n=>n.getAttribute('data-source-wheel-backdrop')==='true'))continue;
  const background=rect.cloneNode(false);for(const key of ['id','stroke','filter','mask','clip-path'])background.removeAttribute(key);
  background.setAttribute('fill','white');background.setAttribute('pointer-events','none');background.setAttribute('aria-hidden','true');background.setAttribute('data-source-wheel-backdrop','true');parent.insertBefore(background,parent.firstChild);added++;
 }
 return added;
}
