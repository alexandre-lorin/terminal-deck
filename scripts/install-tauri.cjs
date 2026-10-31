const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const args=process.argv.slice(2);if(args.length&&!(args.length===1&&args[0]==='--replace'))throw Error('Usage : node scripts/install-tauri.cjs [--replace]');const replace=args.includes('--replace');
const root=path.resolve(__dirname,'..'),home=os.homedir(),quote=s=>"'"+s.replace(/'/g,"'\\''")+"'";
const binary=path.join(root,'src-tauri/target/release/terminal-deck');
if(!fs.existsSync(binary))throw Error('Construisez Tauri avec npm run build:tauri avant installation.');
const launcher=path.join(home,replace?'.local/bin/terminal-deck':'.local/bin/terminal-deck-tauri'),desktop=path.join(home,replace?'.local/share/applications/terminal-deck.desktop':'.local/share/applications/terminal-deck-tauri.desktop'),rollback=path.join(home,'.local/bin/terminal-deck-electron');
const old='#!/bin/sh\nexec '+quote(path.join(root,'node_modules/.bin/electron'))+' '+quote(root)+' "$@"\n';
const next='#!/bin/sh\nexec '+quote(binary)+' "$@"\n';
if(fs.existsSync(launcher)&&![old,next].includes(fs.readFileSync(launcher,'utf8')))throw Error('Lanceur différent : installation interrompue.');
if(fs.existsSync(rollback)&&fs.readFileSync(rollback,'utf8')!==old)throw Error('Le lanceur de retour Electron existe déjà avec un contenu différent.');
const config=process.env.XDG_CONFIG_HOME||path.join(home,'.config'),source=path.join(config,'terminal-deck/workspace.json'),target=path.join(config,'terminal-deck-tauri/workspace.json');
if(!fs.existsSync(target)&&fs.existsSync(source)){
 const original=fs.readFileSync(source);const cleaned=require('../src/state.cjs').cleanState(JSON.parse(original),home);
 fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(path.dirname(target),'electron-import-original.json'),original,{mode:0o600,flag:'wx'});
 fs.writeFileSync(target,JSON.stringify(cleaned,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log('Profil repris dans terminal-deck-tauri ; source Electron conservée.');
}
for(const file of [launcher,rollback,desktop])fs.mkdirSync(path.dirname(file),{recursive:true});
if(fs.existsSync(desktop)&&!fs.existsSync(desktop+'.electron-backup'))fs.copyFileSync(desktop,desktop+'.electron-backup',fs.constants.COPYFILE_EXCL);
fs.writeFileSync(rollback,old,{mode:0o755});fs.writeFileSync(launcher,next,{mode:0o755});
fs.writeFileSync(desktop,'[Desktop Entry]\nType=Application\nName=Terminal Deck'+(replace?'':' (Tauri)')+'\nComment=Projets, Codex et terminaux locaux — Tauri\nExec="'+launcher+'"\nIcon='+path.join(root,'assets/icon.svg')+'\nTerminal=false\nCategories=Development;TerminalEmulator;\nStartupWMClass=local.toubi.terminal-deck\n',{mode:0o644});
console.log(replace?'Lanceur principal passé sur Tauri. Retour : terminal-deck-electron.':'Tauri installé à côté : terminal-deck-tauri. Lanceur principal conservé.');
