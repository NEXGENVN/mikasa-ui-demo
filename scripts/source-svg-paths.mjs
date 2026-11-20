import {canonicalPath} from '../figma-preview/source-text-slots.mjs';

const I={a:1,b:0,c:0,d:1,e:0,f:0};
const mul=(a,b)=>({a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f});
const nums=s=>(s.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[]).map(Number);
const entity=s=>s.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,v=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[v.slice(1,-1)]??String.fromCodePoint(v[2]==='x'?parseInt(v.slice(3,-1),16):Number(v.slice(2,-1)))));
function transform(value=''){
 let m={...I};
 for(const part of value.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)){
  const n=nums(part[2]),[x=0,y=0]=n;let p;
  if(part[1]==='matrix'&&n.length===6)p=Object.fromEntries(['a','b','c','d','e','f'].map((k,i)=>[k,n[i]]));
  else if(part[1]==='translate')p={...I,e:x,f:y};
  else if(part[1]==='scale')p={...I,a:x,d:n[1]??x};
  else if(part[1]==='rotate'){const rad=x*Math.PI/180;p={a:Math.cos(rad),b:Math.sin(rad),c:-Math.sin(rad),d:Math.cos(rad),e:0,f:0};if(n.length===3)p=mul(mul({...I,e:n[1],f:n[2]},p),{...I,e:-n[1],f:-n[2]});}
  else if(part[1]==='skewX')p={...I,c:Math.tan(x*Math.PI/180)};
  else if(part[1]==='skewY')p={...I,b:Math.tan(x*Math.PI/180)};
  else throw new Error(`Unsupported source SVG transform ${part[1]}`);
  m=mul(m,p);
 }
 return m;
}
function bounds(segments){
 const points=[];
 const bez=(a,b,c,d,t)=>{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;};
 for(const s of segments){
  if(s[0]==='M'){points.push([s[1],s[2]]);continue;}
  points.push([s[1],s[2]],[s.at(-2),s.at(-1)]);
  if(s[0]!=='C')continue;
  for(const axis of [1,2]){
   const p=[s[axis],s[axis+2],s[axis+4],s[axis+6]],a=-p[0]+3*p[1]-3*p[2]+p[3],b=2*(p[0]-2*p[1]+p[2]),c=p[1]-p[0];
   let roots=[];
   if(Math.abs(a)<1e-12){if(Math.abs(b)>1e-12)roots=[-c/b];}
   else{const dis=b*b-4*a*c;if(dis>=0)roots=[(-b+Math.sqrt(dis))/(2*a),(-b-Math.sqrt(dis))/(2*a)];}
   for(const t of roots)if(t>0&&t<1)points.push([bez(s[1],s[3],s[5],s[7],t),bez(s[2],s[4],s[6],s[8],t)]);
  }
 }
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return points.length?[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)]:[0,0,0,0];
}

/** Read the verified static Figma SVG dialect; no DOM, network, font, or rendering dependency. */
export function readSourceSvgPaths(xml){
 const paths=[],unsupported=[],stack=[],skipTags=new Set(['defs','mask','clipPath','filter','pattern','linearGradient','radialGradient']);let viewBox=[0,0,0,0];
 for(const tag of xml.matchAll(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![^>]*>|<\/?[\w:.-]+\b[^>]*>/g)){
  const token=tag[0];if(token.startsWith('<!')||token.startsWith('<?'))continue;
  if(token.startsWith('</')){stack.pop();continue;}
  const name=token.match(/^<([\w:.-]+)/)[1].split(':').at(-1),attrs=Object.fromEntries([...token.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1],entity(m[2]??m[3])]));
  if(name==='svg'&&!stack.length)viewBox=nums(attrs.viewBox||'0 0 0 0');
  const parent=stack.at(-1)||{matrix:{...I,e:-viewBox[0],f:-viewBox[1]},skip:false},matrix=mul(parent.matrix,transform(attrs.transform)),skip=parent.skip||skipTags.has(name)||attrs.display==='none'||attrs.opacity==='0';
  if(name==='path'&&!skip&&attrs.d){
   try{const canonical=canonicalPath(attrs.d,{matrix});paths.push({tag:'path',id:attrs.id,index:paths.length,d:attrs.d,matrix,bounds:bounds(canonical),fill:attrs.fill});}
   catch(error){unsupported.push({id:attrs.id,error:error.message});}
  }
  if(!token.endsWith('/>'))stack.push({name,matrix,skip});
 }
 return {paths,viewBox,unsupported};
}
