/** Sample jobs belong to the App session, so leaving the processing screen cannot strand them. */
export function createAppSubmissionRunner({finish,setTimer=setTimeout,clearTimer=clearTimeout,isViewing=(session,frame)=>session.currentFrameId===frame.id,onComplete=()=>{}}){
 const entries=new Set();
 function schedule({session,frame,jobId,delay=1200}){if([...entries].some(e=>e.session===session&&e.jobId===jobId))return;const entry={session,frame,jobId,active:true};entries.add(entry);entry.timer=setTimer(()=>{
  if(!entry.active)return;entries.delete(entry);entry.active=false;const job=session.data.pendingSubmission;if(!job||job.id!==jobId||job.row)return;
  const viewing=isViewing(session,frame),route=session.data.ui.route,selected=session.data.selectedId,completed=session.context.appSendCompleted,selectedFlag=session.context.appSelectedMessage;
  const result=finish({frame,control:{action:'app.send.finish'},session});session.data.ui.route=route;
  if(!viewing){session.data.selectedId=selected;session.context.appSendCompleted=completed;session.context.appSelectedMessage=selectedFlag;}
  onComplete(result,{session,frame,viewing});
 },delay);}
 function cancelAll(){for(const entry of entries){entry.active=false;clearTimer(entry.timer);}entries.clear();}
 function cancelSession(session){for(const entry of entries)if(entry.session===session){entry.active=false;clearTimer(entry.timer);entries.delete(entry);}}
 return {schedule,cancelAll,cancelSession};
}
