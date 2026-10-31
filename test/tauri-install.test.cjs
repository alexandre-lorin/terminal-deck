const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
test('Installation Tauri parallèle : profil copié une seule fois et lanceur principal intact',()=>{
 const root=path.resolve(__dirname,'..');if(!fs.existsSync(path.join(root,'src-tauri/target/release/terminal-deck')))return;
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'deck-install-')),config=path.join(home,'.config');
 try{
  fs.mkdirSync(path.join(config,'terminal-deck'),{recursive:true});fs.mkdirSync(path.join(home,'.local/bin'),{recursive:true});
  const source=path.join(config,'terminal-deck/workspace.json'),original=JSON.stringify({projects:[{id:'p',path:home,sessions:[{id:'c',kind:'codex',companion:4}],active:'c'}],activeProject:'p'});
  fs.writeFileSync(source,original);const launcher=path.join(home,'.local/bin/terminal-deck');fs.writeFileSync(launcher,'#!/bin/sh\necho existing\n');
  const run=()=>execFileSync(process.execPath,[path.join(root,'scripts/install-tauri.cjs')],{env:{...process.env,HOME:home,XDG_CONFIG_HOME:config}});
  run();const target=path.join(config,'terminal-deck-tauri/workspace.json');assert.equal(JSON.parse(fs.readFileSync(target)).projects[0].sessions[0].companion,4);
  assert.equal(fs.readFileSync(source,'utf8'),original);assert.equal(fs.readFileSync(launcher,'utf8'),'#!/bin/sh\necho existing\n');
  const snapshot=fs.readFileSync(target);run();assert.deepEqual(fs.readFileSync(target),snapshot);
  assert.ok(fs.readFileSync(path.join(home,'.local/bin/terminal-deck-tauri'),'utf8').includes('target/release/terminal-deck'));
 }finally{fs.rmSync(home,{recursive:true,force:true})}
});
