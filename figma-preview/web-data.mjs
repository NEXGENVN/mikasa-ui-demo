// Source sample values from TK ngang 2 and LS ngang 2. Additional pages repeat
// the sample fixtures so the pagination controls can be exercised locally.
const aliases=['minhanh_01','quocbao_02','hoangnam_03','khanhlinh_04','ducanh_05','ngocha_06','tuankiet_07','phuongthao_08','giabao_09','hoangphuc_10'];
const roles=['Quản trị viên','Quản lý hệ thống','Quản lý','Kinh doanh','Chăm sóc khách hàng','Kỹ thuật viên','Quản lý kho','KH thành viên','KH thành viên','khách truy cập'];
const last=['Hôm nay, 17:15','Hôm nay, 15:15','Chưa đăng nhập','Hôm nay, 14:15','Hôm nay, 10:15','Chưa đăng nhập','Hôm nay, 13:00','17/10/2025, 09:15','Hôm nay, 9:15','17/10/2025, 15:15'];
const fixtureRows=[
 ['+84368649890','10/25/2026 8:26:11 PM','success','117.5.142.17','2402:800:63a6:bc58:d09f:cc3b:c17:d0507'],
 ['+84984499986','10/25/2026 9:45:34 AM','pending','14.238.43.142'],
 ['+84975748708','10/22/2026 9:14:25 PM','failed','183.80.142.133'],
 ['+84337100373','10/22/2026 9:08:31 PM','pending','14.238.43.142'],
 ['+84984499986','10/22/2026 9:06:29 PM','failed','115.72.7.22'],
 ['+84986230375','10/11/2026 7:33:13 AM','pending','42.115.91.160'],
 ['+84986230375','10/8/2026 8:21:40 PM','success','116.98.218.87'],
 ['+84867542791','10/5/2026 4:50:20 AM','pending','27.67.208.26'],
 ['+84917870676','10/4/2026 6:36:22 PM','success','183.80.174.55'],
 ['+84386345980','10/4/2026 6:24:28 PM','pending','42.114.84.73'],
 ['+84975227297','10/4/2026 11:45:43 AM','failed','27.67.213.86'],
 ...Array.from({length:4},()=>['+84975748708','10/9/2026 8:11:31 PM','pending','59.153.235.54'])
];
export function prepareWebState(s){
 s.web??={};if(s.web.initialized)return;s.web.initialized=true;
 for(const [i,a] of s.accounts.entries())if(/^demo_/.test(a.username)){const n=i%10;a.username=aliases[n];a.email=aliases[n].replace(/_\d+$/,'')+'@gmail.com';a.role=roles[n];a.lastLogin=last[n];a.phone='+84 912 345 678';}
 if(s.messages.length===30&&s.messages.every(m=>/^MK\d{4}$/.test(m.id))){
  s.messages=Array.from({length:285},(_,i)=>{const n=i%15,[phone,time,status,ipv4,ipv6]=fixtureRows[n];return {id:i<15?'MK00'+(i+1):'MK'+String(i+1).padStart(3,'0'),phone,time,status,ipv4,ipv6:ipv6||'2401:d800:8d9:ad64:48f6:7357:a9f0:4ce6',date:'2026-'+(n<2?'10-25':n<5?'10-22':n===5?'10-11':n===6?'10-08':n===7?'10-05':n<11?'10-04':'10-09'),template:'ZNS development configuration',account:'Nguyễn B',oa:'OA chính',oaCount:1,cost:status==='failed'?0:4000,results:[{name:'OA chính',status}]};});
 }
}
export const recentFixtures=Array.from({length:8},(_,i)=>({phone:['033 *** 5555','098 *** 2211','034 *** 6666'][i%3],template:['Xác nhận đơn hàng','Nhắc thanh toán','Xác nhận đơn hàng'][i%3],time:['12/11 · 11:42','12/11 · 11:38','12/12 · 09:15'][i%3],status:i===1?'pending':'success',cost:i===1?'Chờ kết quả':i%2?'200.000 đ':'100.000 đ'}));
export const sourceOaRecords=[
 {id:'source-oa-1',name:'OA chính – admin01',channel:'OA',status:'Hoạt động',updated:'28/10/2026 · 14:30'},
 {id:'source-oa-2',name:'GIF chúc mừng khách hàng',channel:'GIF',status:'Đã duyệt',updated:'27/10/2026 · 16:12'},
 {id:'source-oa-3',name:'Mẫu tin bảo trì hệ thống',channel:'Tin nhắn',status:'Bản nháp',updated:'27/10/2026 · 10:05'},
 {id:'source-oa-4',name:'OA CSKH – manager01',channel:'OA',status:'Cần xác minh',updated:'26/10/2026 · 09:42'},
 {id:'source-oa-5',name:'Ưu đãi tháng 10',channel:'Tin nhắn',status:'Đã gửi',updated:'25/10/2026 · 18:20'}
];
