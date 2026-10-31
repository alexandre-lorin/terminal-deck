const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {execFileSync}=require('node:child_process');
test('Instructions Git : sauvegarde, conservation et idempotence',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deck-instructions-')),target=path.join(dir,'AGENTS.md');
 try{fs.writeFileSync(target,'# Mes instructions\n');const run=()=>execFileSync(process.execPath,[path.join(__dirname,'../scripts/apply-git-instructions.cjs'),'--target',target]);run();const once=fs.readFileSync(target,'utf8');assert.ok(once.startsWith('# Mes instructions'));assert.ok(once.includes('Ne jamais créer de commit'));run();assert.equal(fs.readFileSync(target,'utf8'),once);assert.equal(fs.readdirSync(dir).filter(n=>n.includes('.backup-')).length,1);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
