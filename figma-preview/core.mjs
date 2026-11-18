export const STATUS = {success:['Hoàn thành','success'],sent:['Đã gửi','info'],failed:['Thất bại','error'],pending:['Đang xử lý','warning'],partial:['Thành công một phần','warning'],scheduled:['Hẹn giờ','info']};
export const templates=['Thông báo đơn hàng','Nhắc thanh toán','Thông báo lịch hẹn','Thanh toán tiền mạng','Chăm sóc khách hàng'];
export const oaNames=['OA chính','OA CSKH','OA bán hàng','OA dịch vụ','OA thông báo'];
export function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function validatePhone(value){let n=String(value).trim().replace(/[\s().-]/g,'');if(/^\+?84/.test(n))n='0'+n.replace(/^\+?84/,'');return /^0[35789]\d{8}$/.test(n)?n:null;}
export function createDemoState(){
 const names=['Nguyễn Minh Anh','Trần Quốc Bảo','Trần Hoàng Nam','Lê Khánh Linh','Phạm Đức Anh','Võ Ngọc Hà','Đặng Tuấn Kiệt','Bùi Phương Thảo','Hoàng Gia Bảo','Nguyễn Hoàng Phúc'];
 const messages=Array.from({length:30},(_,i)=>({id:'MK'+String(i+1).padStart(4,'0'),phone:i%2?'0901234567':'0332225555',template:templates[i%5],status:['success','sent','pending','failed','success'][i%5],time:`18/11/2026 ${String(14-Math.floor(i/6)).padStart(2,'0')}:${String(32-i%30).padStart(2,'0')}`,date:'2026-11-18',account:names[i%10],oa:oaNames[i%5],oaCount:1,cost:i%5===3?0:4000,ipv4:i%5===0?'192.0.2.17':'',ipv6:i%5===0?'2001:db8::25':'',results:[{name:oaNames[i%5],status:['success','sent','pending','failed','success'][i%5]}]}));
 return {permissions:Object.create(null),roles:[],recoveries:[],configurations:[...oaNames.map((name,i)=>({id:'oa-'+i,name,channel:'OA',status:i===3?'Cần xác minh':'Hoạt động',updated:'18/11/2026 · 14:30'})),{id:'g1',name:'GIF chúc mừng khách hàng',channel:'GIF',status:'Đã duyệt',updated:'18/11/2026 · 16:12'},{id:'g2',name:'GIF thông báo đơn hàng',channel:'GIF',status:'Bản nháp',updated:'18/11/2026 · 10:05'},...templates.map((name,i)=>({id:'t'+i,name,channel:'Tin nhắn',status:'Đã duyệt',updated:'18/11/2026 · 10:05'}))],messages,accounts:Array.from({length:30},(_,i)=>({id:i+1,name:names[i%10],username:'demo_'+String(i+1).padStart(2,'0'),email:`demo${i+1}@example.com`,role:['Quản trị viên','Quản lý hệ thống','Quản lý','Kinh doanh','Chăm sóc khách hàng'][i%5],active:i!==12})),oas:oaNames.map((name,i)=>({id:i+1,name,channel:'OA',status:i===3?'Cần xác minh':'Hoạt động',updated:'18/11/2026 · 14:30'})),draft:{phone:'033 222 5555',oaCount:1,template:templates[0],schedule:'',outcome:'success'},selectedId:messages[0].id,profile:{name:'Bizzy',email:'bizzy@example.com',role:'Quản trị viên'},preferences:{fingerprint:false,notifications:true},ui:{platform:'web',route:'overview',theme:'light',query:'',status:'all',page:1,tab:'',role:'Director',collapsed:false,loading:false}};
}
export function filterMessages(messages,{query='',status='all',date='',oa='all'}={}){const q=query.trim().toLocaleLowerCase('vi');return messages.filter(m=>(status==='all'||m.status===status)&&(!date||m.date===date)&&(oa==='all'||m.oa===oa)&&(!q||[m.id,m.phone,m.template,m.account,m.oa].some(v=>String(v).toLocaleLowerCase('vi').includes(q))));}
export function createRequest(state,input){const phone=validatePhone(input.phone);if(!phone)throw new Error('Vui lòng nhập số điện thoại Việt Nam hợp lệ.');const n=Number(input.oaCount);if(!Number.isInteger(n)||n<1||n>5)throw new Error('Số OA phải từ 1 đến 5.');
 const outcome=input.outcome==='partial'&&n===1?'failed':input.outcome||'success';const status=input.schedule?'scheduled':outcome;const row={id:'MK'+String(1001+state.messages.length),phone,template:input.template||templates[0],status,time:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),date:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),account:state.profile.name,oa:oaNames[0],oaCount:n,cost:outcome==='failed'?0:4000*n,ipv4:outcome==='success'||outcome==='partial'?'192.0.2.17':'',ipv6:outcome==='success'?'2001:db8::25':'',schedule:input.schedule||'',results:Array.from({length:n},(_,i)=>({name:oaNames[i],status:input.schedule?'scheduled':outcome==='partial'?(i===n-1?'failed':'success'):outcome}))};state.messages.unshift(row);state.selectedId=row.id;return row;}
export function toCsv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{let v=String(value??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
export const money=n=>new Intl.NumberFormat('vi-VN').format(n)+' ₫';

export function beginSubmission(state,input){
 if(state.pendingSubmission&&!state.pendingSubmission.row)throw new Error('Một yêu cầu mẫu đang được xử lý.');
 if(!validatePhone(input.phone))throw new Error('Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
 const oaCount=Number(input.oaCount);if(!Number.isInteger(oaCount)||oaCount<1||oaCount>5)throw new Error('Số OA phải từ 1 đến 5.');
 const snapshot=Object.freeze({phone:input.phone,oaCount,template:input.template,outcome:input.outcome,schedule:input.scheduled?input.schedule:''});
 const job={id:(state.submissionSequence=(state.submissionSequence||0)+1),input:snapshot,row:null};state.pendingSubmission=job;return job;
}
export function finishSubmission(state,id){
 const job=state.pendingSubmission;if(!job||job.id!==id)return null;
 if(!job.row){const selected=state.selectedId;job.row=createRequest(state,job.input);state.selectedId=selected;}
 return job.row;
}
export function addConfiguration(state,input){
 const name=String(input.name||'').trim();if(!name)throw new Error('Vui lòng nhập tên cấu hình.');
 if(!['OA','GIF','Tin nhắn'].includes(input.channel))throw new Error('Kênh cấu hình không hợp lệ.');
 const value={id:'cfg-'+(state.configurationSequence=(state.configurationSequence||0)+1),name,channel:input.channel,status:input.channel==='OA'?'Hoạt động':'Bản nháp',updated:'Vừa xong'};
 state.configurations.unshift(value);return value;
}
export function getReport(state,filters={}){
 const messages=filterMessages(state.messages,filters);const groups=new Map(),days=new Map();
 for(const m of messages){const g=groups.get(m.oa)||{name:m.oa,sent:0,cost:0};g.sent++;g.cost+=Number(m.cost)||0;groups.set(m.oa,g);days.set(m.date,(days.get(m.date)||0)+(Number(m.cost)||0));}
 const cost=messages.reduce((n,m)=>n+(Number(m.cost)||0),0);
 return {messages,sent:messages.length,success:messages.filter(m=>m.status==='success').length,cost,costPerMessage:messages.length?Math.round(cost/messages.length):0,byOa:[...groups.values()],days:[...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,cost])=>({date,cost}))};
}
export function saveSessionPolicy(state,{lifetime=state.preferences.sessionLifetime||'30 phút',idle=state.preferences.idleTimeout||'30 phút'}={}){
 if(!['30 phút','1 giờ','8 giờ'].includes(lifetime)||!['30 phút','15 phút','5 phút'].includes(idle))throw new Error('Thời gian phiên không hợp lệ.');
 state.preferences.sessionLifetime=lifetime;state.preferences.idleTimeout=idle;
}
export function queueRecovery(state,email){
 const value=String(email).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('Email không hợp lệ.');
 const row={id:'REC-'+(state.recoveries.length+1),email:value,status:'Chờ xử lý',time:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})};state.recoveries.unshift(row);return row;
}
