(async()=>{
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 try {
  for(let i=0;i<200&&!document.querySelector('#timeline')?.children.length;i++)await sleep(50);
  if(document.querySelectorAll('#characters button').length!==5)throw Error('Catalogue absent');
  if(!document.querySelector('#timeline').children.length)throw Error('Atlas non chargé');
  let denied=false;try{await window.__TAURI__.core.invoke('deck',{channel:'deck:boot',args:null})}catch{denied=true}
  if(!denied)throw Error('Le studio accède au moteur principal');
  const canvas=document.querySelector('#preview');if(!canvas.toDataURL().startsWith('data:image/png'))throw Error('Canvas PNG');
  document.querySelector('#export-frame').click(); await sleep(400);
  await window.__TAURI__.core.invoke('native_smoke_report',{result:{ok:true,checks:['atelier chargé dans WebKitGTK','5 personnages','atlas chargé','accès au moteur refusé','canvas PNG','déclenchement export']}});
 setTimeout(()=>window.__TAURI__.core.invoke('native_smoke_close'),3000);
 }catch(error){await window.__TAURI__.core.invoke('native_smoke_report',{result:{ok:false,error:String(error)}})}
})();
