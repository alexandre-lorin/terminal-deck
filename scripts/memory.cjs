const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function measure(explicitPid) {
 const processes=[];
 for(const pid of fs.readdirSync('/proc').filter(n=>/^\d+$/.test(n))){try{
   const status=fs.readFileSync('/proc/'+pid+'/status','utf8'),cmd=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\0');
   const exe=fs.readlinkSync('/proc/'+pid+'/exe');let cwd='';try{cwd=fs.readlinkSync('/proc/'+pid+'/cwd')}catch{}
   const parent=Number(status.match(/^PPid:\s+(\d+)/m)?.[1]),rss=Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1]||0);
   let pss=null;try{pss=Number(fs.readFileSync('/proc/'+pid+'/smaps_rollup','utf8').match(/^Pss:\s+(\d+)/m)?.[1])}catch{}
   const electron=exe===path.join(root,'node_modules/electron/dist/electron');
   const tauri=[path.join(root,'src-tauri/target/release/terminal-deck'),path.join(root,'src-tauri/target/debug/terminal-deck'),process.env.DECK_BENCH_BINARY].includes(exe);
   const main=tauri||(electron&&!cmd.some(a=>a.startsWith('--type='))&&(cmd.includes(root)||(cmd.includes('.')&&cwd===root)));
   processes.push({pid:Number(pid),parent,rss,pss,main,electron,tauri,name:path.basename(exe)});
 }catch{}}
 const roots=explicitPid?[Number(explicitPid)]:processes.filter(p=>p.main).map(p=>p.pid);
 return roots.map(pid=>{const ids=new Set([pid]);let size;do{size=ids.size;for(const p of processes)if(ids.has(p.parent))ids.add(p.pid)}while(size!==ids.size);
  const list=processes.filter(p=>ids.has(p.pid));const runtime=list.filter(p=>p.electron||p.tauri||/^WebKit/.test(p.name));const subprocesses=list.filter(p=>!runtime.includes(p));
  const total=list=>({processes:list.length,rssMiB:Math.round(list.reduce((s,p)=>s+p.rss,0)/102.4)/10,pssMiB:list.length&&list.every(p=>p.pss!==null)?Math.round(list.reduce((s,p)=>s+p.pss,0)/102.4)/10:null});
  return {pid,runtime:total(runtime),programmesHeberges:total(subprocesses),ensemble:total(list)};
 });
}
if(require.main===module){const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--pid'&&/^\d+$/.test(args[1])))throw Error('Usage : node scripts/memory.cjs [--pid PID]');const result=measure(args[1]);if(!result.length){console.log('Aucun processus Deck visible ici. Lancez cette commande depuis votre session de bureau pendant que Deck est ouvert.');process.exitCode=1}else console.log(JSON.stringify({unite:'MiB',note:'PSS répartit les pages partagées ; RSS peut les compter plusieurs fois. Les processus Codex externes non descendants sont exclus.',applications:result},null,2));}
module.exports={measure};
