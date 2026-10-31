(async()=>{try{
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 for(let i=0;i<300&&(typeof state==='undefined'||!state);i++)await sleep(50);
 for(const s of activeProject().sessions)await startSession(s.id,null,{focus:false});
 await sleep(5000);
 await window.__TAURI__.core.invoke('native_smoke_report',{result:{ok:true,benchmark:true}});
}catch(error){await window.__TAURI__.core.invoke('native_smoke_report',{result:{ok:false,error:String(error)}})}})();
