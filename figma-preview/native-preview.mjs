import {escapeHtml as e} from './core.mjs';
import {sourceHotspots} from './source-hotspots.mjs';

const labels={accounts:'Tài khoản',account:'Tài khoản',authentication:'Đăng nhập & xác thực',auth:'Đăng nhập & xác thực',overview:'Tổng quan',history:'Lịch sử',reports:'Báo cáo',security:'Bảo mật',settings:'Cài đặt',oa:'OA / GIF / Tin nhắn',profile:'Hồ sơ',send:'Gửi tin',password:'Mật khẩu',fingerprint:'Vân tay',error:'Màn lỗi','account-data':'Tài khoản & dữ liệu',prototype:'Nguyên mẫu'};
export const nativeRoute=id=>'figma-'+String(id).replace(':','-');
export function frameIdFromRoute(route){const m=/^figma-(\d+)-(\d+)$/.exec(route||'');return m?m[1]+':'+m[2]:null;}
export function createCatalogue(input){
 const byId=new Map();
 const frames=input.map(frame=>{
  if(!/^\d+:\d+$/.test(frame.id)||!['web','web-portrait','app'].includes(frame.platform))throw new Error('Invalid native frame identity');
  if(!Number.isFinite(frame.width)||!Number.isFinite(frame.height)||frame.width<=0||frame.height<=0)throw new Error('Invalid native frame dimensions');
  if(frame.file&&!/^(native\/\d+-\d+\.[a-f\d]{8,64}\.html|source-frames\/\d+-\d+\.[a-f\d]{12,64}\.(svg|html))$/.test(frame.file))throw new Error('Invalid native frame file');
  if(byId.has(frame.id))throw new Error('Duplicate native frame '+frame.id);
  const item=Object.freeze({...frame,file:frame.file||null});byId.set(item.id,item);return item;
 });
 return {frames,byId};
}
export function findNativeFrame(catalogue,platform,route,fallbackId){
 const selected=catalogue.byId.get(frameIdFromRoute(route));if(selected?.platform===platform)return selected;
 const fallback=catalogue.byId.get(fallbackId);return fallback?.platform===platform?fallback:catalogue.frames.find(f=>f.platform===platform)||null;
}
const normalized=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('vi').replaceAll('đ','d');
export function renderNativeOptions(frames,selectedId,query=''){
 const search=normalized(query),filtered=frames.filter(f=>!search||normalized([f.name,f.id,f.family,f.group,f.theme,labels[f.family]].join(' ')).includes(search));
 const groups=new Map();for(const f of filtered){const sourceGroup=f.group||(f.platform==='app'?'App · '+(f.theme==='dark'?'Dark':'Light'):'');const label=[sourceGroup,labels[f.family]||f.family].filter(Boolean).join(' · ')||'Màn Figma';if(!groups.has(label))groups.set(label,[]);groups.get(label).push(f);}
 return (!filtered.some(f=>f.id===selectedId)?'<option value="" selected disabled>'+(filtered.length?'Chọn màn trong kết quả':'Không có màn phù hợp')+'</option>':'')+[...groups].map(([group,list])=>'<optgroup label="'+e(group)+'">'+list.map(f=>'<option value="'+nativeRoute(f.id)+'" '+(f.id===selectedId?'selected':'')+'>'+e(f.name)+' · '+f.id+(f.file?'':' · Chưa có preview')+'</option>').join('')+'</optgroup>').join('');
}
export function renderNativeFrame(frame,{hotspots:includeHotspots=true}={}){
 if(!frame)return '<div class="native-unavailable"><h2>Chưa tìm thấy frame</h2></div>';
 const url='https://www.figma.com/design/2oHQaSkcqH2GoOidQMwrEs/Mikasa?node-id='+frame.id.replace(':','-');
 const meta='<div class="native-caption"><strong>'+e(frame.name)+'</strong><span>'+frame.width+' × '+frame.height+' · '+frame.id+'</span><a href="'+url+'" target="_blank" rel="noopener">Mở frame Figma ↗</a></div>';
 if(!frame.file)return '<section class="native-unavailable" data-missing-frame="'+frame.id+'"><h2>Chưa có bản preview của frame này</h2><p>'+e(frame.name)+' · '+frame.id+'</p><a href="'+url+'" target="_blank" rel="noopener">Xem frame nguồn trên Figma ↗</a></section>';
 const hotspots=(includeHotspots?sourceHotspots[frame.id]||[]:[]).map(h=>{const [x,y,w,height]=h.bbox;return '<button type="button" class="native-hotspot" data-action="'+(h.back?'native-back':'native-target')+'" '+(h.destinationId?'data-destination="'+h.destinationId+'"':'')+' data-source-node="'+e(h.id)+'" aria-label="'+e(h.label)+'" style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+height+'px"></button>';}).join('');
 return '<section class="native-preview" data-native-frame="'+frame.id+'" data-native-width="'+frame.width+'" data-native-height="'+frame.height+'">'+meta+'<div class="native-canvas-host" style="max-width:'+frame.width+'px"><iframe class="native-frame" src="'+e(frame.file)+'" title="'+e(frame.name)+' · '+frame.id+'" width="'+frame.width+'" height="'+frame.height+'" scrolling="no" sandbox="allow-same-origin" loading="eager"></iframe>'+(hotspots?'<div class="native-hotspots" style="width:'+frame.width+'px;height:'+frame.height+'px">'+hotspots+'</div>':'')+'</div></section>';
}
export function fitNativeFrames(root=document){
 for(const iframe of root.querySelectorAll('.native-frame')){const host=iframe.parentElement,scale=String(Math.min(1,host.clientWidth/Number(iframe.getAttribute('width'))));iframe.style.zoom=scale;for(const layer of host.querySelectorAll('.native-hotspots,.interactive-overlay'))layer.style.zoom=scale;}
}
