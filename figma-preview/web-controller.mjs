import {handleBackupAction} from './web-backups.mjs';
import {validatePhone} from './core.mjs';
import {webAdminAction,webAdminChange,webAdminSubmit} from './web-admin-controller.mjs';
const invalid=(input,message)=>{input.setCustomValidity(message);input.reportValidity();input.addEventListener('input',()=>input.setCustomValidity(''),{once:true});};
export function webAction(action,el,c){const {state:s,navigate,render,toast}=c;
 if(webAdminAction(action,el,c)||handleBackupAction(action,el,c))return true;
 switch(action){
 case 'web-forgot':navigate('forgot');return true;
 case 'web-resend':toast('Đã gửi lại mã OTP mẫu.');return true;
 case 'web-create-account':navigate('account-create');return true;
 case 'web-account':s.ui.accountId=Number(el.dataset.id);navigate('account-detail');return true;
 case 'web-edit-account':navigate('account-edit');return true;
 case 'web-disable-account':s.ui.webModal='disable-account';render();return true;
 case 'web-close-modal':s.ui.webModal='';render();return true;
 case 'web-confirm-disable':{const a=s.accounts.find(a=>a.id===Number(s.ui.accountId))||s.accounts[0];if(a)a.active=false;s.ui.webModal='';navigate('accounts');toast('Cập nhật thành công');return true;}
 case 'web-manage-mfa':navigate('security');s.ui.tab='sessions';render();return true;
 case 'web-map-source':toast('Mục Bản đồ có trong thanh bên Figma; chưa có frame trang đích trong nhóm Web được cung cấp.');return true;
 case 'web-chart':s.ui.chartMode=el.dataset.value;render();return true;
 case 'web-rank':s.ui.rankMode=el.dataset.value;render();return true;
 case 'web-recent':s.ui.overviewStatus=el.dataset.status;render();return true;
 case 'web-oa-record':s.ui.oaRecord=el.dataset.id;render();return true;
 case 'web-connect-oa':s.web.connected=true;toast('Đã mô phỏng kết nối Zalo OA.');return true;
 case 'web-refresh-oa':case 'web-refresh-token':toast('Đã làm mới dữ liệu mẫu.');return true;
 case 'web-recovery-review':toast('Đã xác minh yêu cầu khôi phục mẫu.');return true;
 default:return false;
 }
}
export function webChange(el,c){return webAdminChange(el,c);}
export function webInput(el,c){if(el.hasAttribute('data-admin-role-query'))return webAdminChange(el,c);return false;}
export function webSubmit(f,data,c){const {state:s,navigate,toast}=c;if(webAdminSubmit(f,data,c))return true;
 switch(f.dataset.form){
 case 'web-account':{const editing=s.ui.route==='account-edit',a=editing?(s.accounts.find(a=>a.id===Number(s.ui.accountId))||s.accounts[0]):null;const value={username:data.username.trim(),name:a?.name||data.username.trim(),email:data.email.trim(),phone:data.phone,adminRole:data.role,role:data.role==='Super Admin'?'Quản lý hệ thống':'Quản trị viên',active:a?.active??true,lastLogin:a?.lastLogin||'Chưa đăng nhập'};if(a)Object.assign(a,value);else s.accounts.unshift({id:Math.max(0,...s.accounts.map(a=>a.id))+1,...value});navigate(editing?'account-detail':'accounts');toast('Cập nhật thành công');return true;}
 case 'web-forgot':if(!validatePhone(data.phone)){invalid(f.elements.phone,'Vui lòng nhập số điện thoại Việt Nam hợp lệ.');return true;}s.web.recoveryPhone=data.phone;s.recoveries.unshift({id:'REC-'+(s.recoveries.length+1),phone:data.phone,time:new Date().toLocaleString('vi-VN'),status:'Chờ xử lý'});navigate('otp');return true;
 case 'web-otp':navigate('new-password');return true;
 case 'web-new-password':if(!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(data.next)){invalid(f.elements.next,'Mật khẩu cần ít nhất 12 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.');return true;}if(data.next!==data.confirm){invalid(f.elements.confirm,'Mật khẩu xác nhận chưa khớp.');return true;}navigate('password-result');return true;
 case 'web-provider':if(data.key!==data.confirm){invalid(f.elements.confirm,'Khóa API xác nhận chưa khớp.');return true;}f.reset();toast('Đã lưu khóa API mẫu.');return true;
 default:return false;
 }
}
