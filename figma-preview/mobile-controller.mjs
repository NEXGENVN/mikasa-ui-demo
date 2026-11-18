import {validatePhone} from './core.mjs';
import {mobileMessage} from './mobile.mjs';

const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
export function mobilePasswordValid(value,min=8,max=20){return value.length>=min&&value.length<=max&&/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/\d/.test(value)&&/[^A-Za-z0-9]/.test(value);}
export function mobileAction(action,el,c){const {state:s,navigate,render,toast,setTheme}=c;s.mobile??={};const close=()=>{s.ui.mobileSheet='';render();};
 switch(action){
 case 'forgot':navigate('forgot');return true;
 case 'logout':navigate('login');return true;
 case 'oa-minus':case 'oa-plus':s.draft.oaCount=Math.min(5,Math.max(1,s.draft.oaCount+(action==='oa-plus'?1:-1)));render();return true;
 case 'mobile-theme':s.mobile.themeMode=el.dataset.theme;setTheme(el.dataset.theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):el.dataset.theme);return true;
 case 'mobile-fingerprint':if(s.preferences.fingerprint){s.preferences.fingerprint=false;render();}else{s.ui.mobileSheet='fingerprint';render();}return true;
 case 'mobile-verify-fingerprint':s.preferences.fingerprint=true;s.ui.mobileSheet='fingerprint-success';render();setTimeout(()=>{if(s.ui.mobileSheet==='fingerprint-success'){s.ui.mobileSheet='';render();}},1500);return true;
 case 'mobile-close-sheet':close();return true;
 case 'mobile-delete-data':case 'mobile-delete-account':s.ui.mobileSheet=action==='mobile-delete-data'?'delete-data':'delete-account';render();return true;
 case 'mobile-confirm-delete':{const account=s.ui.mobileSheet==='delete-account';s.ui.mobileSheet='';s.mobile.dataCleared=true;s.messages=s.messages.filter(m=>Number(m.id.replace('MK',''))<1000);navigate(account?'login':'data');toast(account?'Đã xóa tài khoản mẫu.':'Đã xóa dữ liệu mẫu.');return true;}
 case 'schedule-now':s.draft.scheduled=false;s.draft.schedule='';render();return true;
 case 'schedule-later':s.mobile.scheduleDraft=(s.ui.route==='detail'?mobileMessage(s).schedule:s.draft.schedule)||localDate(new Date(Date.now()+3600000));s.ui.mobileSheet='schedule';render();return true;
 case 'mobile-month':case 'mobile-day':{const d=new Date(s.mobile.scheduleDraft);if(action==='mobile-month'){d.setDate(1);d.setMonth(d.getMonth()+Number(el.dataset.offset));}else d.setDate(Number(el.dataset.day));s.mobile.scheduleDraft=localDate(d);render();return true;}
 case 'mobile-save-schedule':{if(new Date(s.mobile.scheduleDraft)<=new Date()){toast('Vui lòng chọn thời gian trong tương lai.');return true;}s.draft.schedule=s.mobile.scheduleDraft;s.draft.scheduled=true;s.ui.mobileSheet='';if(s.ui.route==='detail'){const m=mobileMessage(s);m.schedule=s.draft.schedule;}render();return true;}
 case 'mobile-cancel-schedule':{const m=mobileMessage(s);s.messages=s.messages.filter(v=>v.id!==m.id);navigate('history');toast('Đã hủy lịch gửi mẫu.');return true;}
 case 'mobile-camera':toast('Ảnh đại diện mẫu từ Figma.');return true;
 case 'mobile-language':toast('Đã mô phỏng tải ngôn ngữ '+el.dataset.language+'.');return true;
 case 'mobile-resend':toast('Đã gửi lại OTP mẫu. Nhập 6 chữ số để tiếp tục.');return true;
 default:return false;
 }
}
export function mobileChange(el,{state:s,render}){s.mobile??={};if(el.name==='template'&&el.closest('[data-form="send"]')){s.draft.template=el.value;return true;}if(el.dataset.mobilePreference){s.mobile[el.dataset.mobilePreference]=el.type==='checkbox'?el.checked:el.value;return true;}if(el.dataset.schedulePart){const d=new Date(s.mobile.scheduleDraft);if(el.dataset.schedulePart==='hour')d.setHours(Number(el.value));else d.setMinutes(Number(el.value));s.mobile.scheduleDraft=localDate(d);return true;}return false;}
export function mobileInput(el,c){const {state:s,navigate}=c;
 if(el.name==='phone'&&el.closest('[data-form="send"]')){const changed=validatePhone(s.draft.phone)!==validatePhone(el.value);s.draft.phone=el.value;if(changed){const pos=el.selectionStart;c.render();const input=document.querySelector('.f-send input[name="phone"]');input?.focus();input?.setSelectionRange(pos,pos);}return true;}
 if(el.closest('[data-form="mobile-otp"]')){el.value=el.value.replace(/\D/g,'').slice(0,1);if(el.value)el.nextElementSibling?.focus();const inputs=[...el.form.querySelectorAll('input')];if(inputs.every(i=>/^\d$/.test(i.value)))navigate('new-password');return true;}
 if(el.name==='next'&&el.closest('[data-form="mobile-password"]')){const v=el.value;for(const [key,ok] of [['length',v.length>=8&&v.length<=20],['characters',/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/\d/.test(v)],['special',/[^A-Za-z0-9]/.test(v)]])el.form.querySelector(`[data-rule="${key}"]`).classList.toggle('valid',ok);return true;}
 return false;
}
export function mobileSubmit(form,data,c){const {state:s,navigate,toast}=c;s.mobile??={};const invalid=(el,message)=>{el.setCustomValidity(message);el.reportValidity();el.addEventListener('input',()=>el.setCustomValidity(''),{once:true});};
 switch(form.dataset.form){
 case 'mobile-profile-view':navigate('profile-edit');return true;
 case 'mobile-profile':s.mobile.profile={...data,name:data.name.trim(),email:data.email.trim()};s.profile.name=data.name.trim();navigate('profile-result');return true;
 case 'mobile-forgot':if(!validatePhone(data.phone)){invalid(form.elements.phone,'Vui lòng nhập số điện thoại Việt Nam hợp lệ.');return true;}s.mobile.recoveryPhone=data.phone;navigate('otp');return true;
 case 'mobile-password':case 'mobile-new-password':{const reset=form.dataset.form==='mobile-new-password';if(!mobilePasswordValid(data.next,reset?12:8,reset?Infinity:20)){invalid(form.elements.next,reset?'Mật khẩu cần ít nhất 12 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.':'Mật khẩu cần 8–20 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.');return true;}if(data.next!==data.confirm){invalid(form.elements.confirm,'Mật khẩu xác nhận chưa khớp.');return true;}navigate(reset?'password-result':'account');toast('Đã cập nhật mật khẩu mẫu.');return true;}
 case 'mobile-otp':navigate('new-password');return true;
 default:return false;
 }
}
