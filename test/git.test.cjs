const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { status, parse } = require('../src/git.cjs');
test('Git conserve espaces, retours à la ligne et renommages sans interpréter les chemins', () => {
  assert.deepEqual(parse('## main\0R  new name\0old\nname\0?? $(example).txt\0').files, [
    { status:'R ', path:'new name', previous:'old\nname' }, { status:'??', path:'$(example).txt', previous:null }
  ]);
});
test('Git lit un vrai dépôt et distingue un dossier sans dépôt', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'deck-git-'));
  try {
    assert.equal((await status(root)).repository,false);
    execFileSync('git',['init','-b','main',root],{stdio:'ignore'});
    fs.writeFileSync(path.join(root,'fichier avec espaces.txt'),'fixture');
    const result=await status(root);
    assert.match(result.branch,/main/); assert.equal(result.files[0].path,'fichier avec espaces.txt');
    assert.equal(fs.existsSync(path.join(root,'.git/index')),false);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
