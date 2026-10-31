const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'), temp=fs.mkdtempSync(path.join(os.tmpdir(),'deck-tauri-native-'));
const home=path.join(temp,'home'),profile=path.join(temp,'profile'),bin=path.join(temp,'bin');
for(const p of [home,profile,bin])fs.mkdirSync(p);
execFileSync('git',['init','-b','main',home],{stdio:'ignore'});fs.writeFileSync(path.join(home,'fixture.txt'),'test');
fs.writeFileSync(path.join(bin,'codex'),`#!/usr/bin/env node
if(process.argv[2]==='app-server'){
 const rl=require('node:readline').createInterface({input:process.stdin});rl.on('line',line=>{const q=JSON.parse(line);if(q.id)console.log(JSON.stringify({id:q.id,result:q.id===1?{}:{rateLimits:{primary:{usedPercent:38,windowDurationMins:300,resetsAt:2000000000}}}}));});
}else{
 require('node:assert/strict').deepEqual(process.argv.slice(2),['resume','--all','-c','tui.terminal_title=["thread-id","thread-title"]','-c','tui.keymap.composer.queue=[]']);
 process.stdin.setRawMode(true);let pending=Buffer.alloc(0);process.stdin.on('data',chunk=>{for(const b of chunk){if(b===13){process.stdout.write('\\r\\nKEYS:'+pending.toString('hex')+'\\r\\n');pending=Buffer.alloc(0)}else pending=Buffer.concat([pending,Buffer.from([b])]);}});process.stdout.write('\\x1b]0;Session de recette\\x07\\r\\nFIXTURE_CODEX_TTY\\r\\n');process.stdin.resume();
}
`,{mode:0o700});
const xvfb=process.env.DECK_XVFB||'/tmp/deck-native-tools/usr/bin/Xvfb';
let display,app;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 display=spawn(xvfb,['-displayfd','3','-screen','0','1520x960x24','-nolisten','tcp','-extension','GLX'],{stdio:['ignore','ignore','pipe','pipe']});
 const number=await new Promise((resolve,reject)=>{display.once('error',reject); let stderr=''; display.stderr.on('data',b=>stderr+=b); display.once('exit',code=>reject(new Error('Xvfb arrêté '+code+' : '+stderr))); display.stdio[3].once('data',b=>resolve(b.toString().trim()));});
 const env={...process.env,DISPLAY:':'+number,WAYLAND_DISPLAY:'',GDK_BACKEND:'x11',HOME:home,SHELL:'/bin/bash',PATH:bin+path.delimiter+process.env.PATH,TERMINAL_DECK_PROFILE:profile,TERMINAL_DECK_SMOKE:'1',WEBKIT_DISABLE_DMABUF_RENDERER:'1',LIBGL_ALWAYS_SOFTWARE:'1'};
 app=spawn('dbus-run-session',['--',path.join(root,'src-tauri/target/debug/terminal-deck'),'--no-startup-codex'],{env,cwd:temp,detached:true,stdio:['ignore','pipe','pipe']});let diagnostics='';app.stderr.on('data',b=>{diagnostics=(diagnostics+b).slice(-12000)});app.stdout.on('data',()=>{});
 const report=path.join(profile,'native-smoke.json');
 let keyboard=false,paste=false,finished=false;
 const xdo=process.env.DECK_XDOTOOL||'/tmp/deck-native-tools/usr/bin/xdotool';
 const key=(...args)=>execFileSync(xdo,args,{env:{...env,LD_LIBRARY_PATH:'/tmp/deck-native-tools/usr/lib'},timeout:10000});
 for(let i=0;i<900;i++){
  if(app.exitCode!==null)throw new Error('Application arrêtée : '+diagnostics);
  if(fs.existsSync(report)){
   const current=JSON.parse(fs.readFileSync(report));
   if(current.stage==='keyboard'&&!keyboard){keyboard=true;key('search','--name','^Terminal Deck$','windowfocus');key('type','--clearmodifiers','alpha beta');key('key','ctrl+BackSpace');key('type','--clearmodifiers','gamma');key('key','Return');await sleep(150);key('key','shift+Return');key('key','Return');}
   else if(current.stage==='paste'&&!paste){paste=true;key('key','ctrl+shift+v');await sleep(250);key('key','Return');}
   else if(typeof current.ok==='boolean'){finished=true;break;}
  }
  await sleep(100);
 }
 if(!finished)throw new Error('Scénario incomplet : '+diagnostics);
 if(!fs.existsSync(report))throw new Error('Rapport absent : '+diagnostics);
 const result=JSON.parse(fs.readFileSync(report));if(!result.ok)throw new Error(JSON.stringify(result));
 const studioReport=path.join(profile,'studio-smoke.json'); for(let i=0;i<200&&!fs.existsSync(studioReport);i++)await sleep(100);
 if(!fs.existsSync(studioReport))throw new Error('Studio sans rapport : '+diagnostics); const studio=JSON.parse(fs.readFileSync(studioReport));if(!studio.ok)throw new Error(JSON.stringify(studio)); for(let i=0;i<100&&!fs.existsSync(path.join(profile,'exports'));i++)await sleep(100); const exportedFiles=fs.readdirSync(path.join(profile,'exports')); if(!exportedFiles.some(name=>{const b=fs.readFileSync(path.join(profile,'exports',name)); return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));}))throw new Error('Export PNG natif absent'); console.log(JSON.stringify(studio));
 await sleep(500);
 console.log(JSON.stringify(result,null,2));
 fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
 try{execFileSync('import',['-display',':'+number,'-window','root',path.join(root,'artifacts/tauri-native.png')],{env,timeout:10000,stdio:'ignore'});}catch{}
 for(let i=0;i<60&&app.exitCode===null;i++)await sleep(100); if(app.exitCode!==0)throw new Error('Fermeture native sans confirmation non validée'); console.log('Fermeture native de fenêtre : code 0.');
 }finally{if(app?.pid){try{process.kill(-app.pid,'SIGTERM')}catch{}}display?.kill();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message);process.exitCode=1});
