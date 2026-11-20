import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const digest=data=>createHash('sha256').update(data).digest('hex').slice(0,12);
const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function buildPreviewRelease({root=defaultRoot}={}){
 const base=path.join(root,'figma-preview'),out=path.join(base,'release');await fs.mkdir(out,{recursive:true});
 const result=await build({entryPoints:[path.join(base,'app.mjs')],bundle:true,format:'esm',target:'es2022',write:false,minify:true,legalComments:'none'});
 const script=result.outputFiles[0].contents,scriptName='app.'+digest(script)+'.mjs';
 const styleFiles=['styles.css','mobile.css','web-fidelity.css','web-admin.css','web-backups.css','native-preview.css','interactive-preview.css'];
 const styles=(await Promise.all(styleFiles.map(async file=>(await fs.readFile(path.join(base,file),'utf8')).replace(/\r\n/g,'\n').replace(/url\((['"]?)(?:\.\/)?assets\//g,'url($1../assets/')))).join('\n');
 const styleName='styles.'+digest(styles)+'.css';
 let fontCSS='';try{fontCSS=await fs.readFile(path.join(base,'assets/fonts/native.css'),'utf8');}catch{}
 const font=fontCSS?'assets/fonts/native.'+digest(fontCSS)+'.css':'assets/fonts/native.css';
 if(fontCSS)await fs.writeFile(path.join(base,font),fontCSS);
 const version=digest(Buffer.concat([Buffer.from(script),Buffer.from(styles),Buffer.from(fontCSS)]));
 const template=await fs.readFile(path.join(base,'index.template.html'),'utf8');
 const html=template.replaceAll('__STYLE_URL__','release/'+styleName).replaceAll('__SCRIPT_URL__','release/'+scriptName).replaceAll('__FONT_URL__',font).replaceAll('__BUILD_VERSION__',version);
 await fs.writeFile(path.join(out,scriptName),script);await fs.writeFile(path.join(out,styleName),styles);await fs.writeFile(path.join(base,'index.html'),html);
 const metadata={version,script:'release/'+scriptName,style:'release/'+styleName,font};await fs.writeFile(path.join(base,'release.json'),JSON.stringify(metadata,null,2)+'\n');
 return metadata;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildPreviewRelease()));
