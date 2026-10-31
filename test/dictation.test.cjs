const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawn } = require('node:child_process');
const { createDictation, clean } = require('../src/dictation.cjs');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixture({ silent = false, slow = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-dictation-test-'));
  const recorder = path.join(dir, 'recorder.cjs'), decoder = path.join(dir, 'decoder.cjs'), model = path.join(dir, 'model.bin');
  fs.writeFileSync(model, 'explicit test fixture');
  fs.writeFileSync(recorder, `const b=Buffer.alloc(32000);for(let i=0;i<b.length;i+=2)b.writeInt16LE(${silent ? 0 : 1200},i);process.stdout.write(b);setInterval(()=>{},1000);`);
  fs.writeFileSync(decoder, `const fs=require('node:fs');const a=process.argv.slice(2);const p=a[a.indexOf('-of')+1];setTimeout(()=>{fs.writeFileSync(p+'.txt',' Bonjour\\nToubi. ');},${slow ? 30000 : 10});`);
  const manager = createDictation({ tmpdir: dir, model, spawn: (name, args, options) => spawn(process.execPath, [name === 'pw-record' ? recorder : decoder, ...args], options) });
  return { manager, dir, async dispose() { await manager.dispose(); fs.rmSync(dir, { recursive: true, force: true }); } };
}
const target = { id: 'test-session', token: 'token-test-one' };
test('la dictée termine sa capture réelle de fixture, retourne le texte et efface ses fichiers', async () => {
  const f = fixture();
  try {
    await f.manager.start(target);
    assert.ok(f.manager.level(target).level > 0);
    await assert.rejects(f.manager.finish({ ...target, token: 'another-token' }), /terminée/);
    assert.equal(await f.manager.finish(target), 'Bonjour Toubi.');
    assert.equal(fs.readdirSync(f.dir).filter(name => name.startsWith('deck-dictation-')).length, 0);
    assert.throws(() => f.manager.level(target), /terminée/);
  } finally { await f.dispose(); }
});
test('annuler pendant une transcription arrête le sous-processus et empêche tout résultat tardif', async () => {
  const f = fixture({ slow: true });
  try {
    await f.manager.start(target);
    const finished = f.manager.finish(target);
    const rejected = assert.rejects(finished, /annulée/);
    await sleep(120);
    assert.equal(await f.manager.cancel(target), true);
    await rejected;
    assert.equal(fs.readdirSync(f.dir).filter(name => name.startsWith('deck-dictation-')).length, 0);
    await f.manager.start({ ...target, token: 'token-test-two' });
    assert.equal(await f.manager.cancel(target), false);
  } finally { await f.dispose(); }
});
test('un microphone muet ne déclenche pas de transcription', async () => {
  const f = fixture({ silent: true });
  try { await f.manager.start(target); await assert.rejects(f.manager.finish(target), /Aucune parole/); }
  finally { await f.dispose(); }
});
test('le texte reconnu ne contient pas de commandes de contrôle terminal', () => {
  assert.equal(clean(' Bonjour\r\nToubi\x00 !\x1b'), 'Bonjour Toubi !');
});
test('la fermeture immédiate supprime la capture sans attendre la boucle Electron', async () => {
  const f = fixture();
  try {
    await f.manager.start(target);
    f.manager.disposeNow();
    assert.equal(fs.readdirSync(f.dir).filter(name => name.startsWith('deck-dictation-')).length, 0);
    assert.throws(() => f.manager.level(target), /terminée/);
  } finally { await f.dispose(); }
});
