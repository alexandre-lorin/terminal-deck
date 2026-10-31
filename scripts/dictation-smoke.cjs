const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const assert = require('node:assert/strict');
let playwright; try { playwright = require('playwright'); } catch { playwright = require('/tmp/deck-ui-tools/node_modules/playwright'); }
const root = path.resolve(__dirname, '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-dictation-ui-'));
const home = path.join(tmp, 'home'), bin = path.join(tmp, 'bin'), bytes = path.join(tmp, 'bytes'), slow = path.join(tmp, 'slow');
fs.mkdirSync(home); fs.mkdirSync(bin);
const models = path.join(home, '.local/share/falcon/models'); fs.mkdirSync(models, { recursive: true }); fs.writeFileSync(path.join(models, 'ggml-base.bin'), 'explicit fixture, not a speech model');
const executable = (name, source) => fs.writeFileSync(path.join(bin, name), '#!/usr/bin/env node\n' + source, { mode: 0o700 });
executable('codex', `const fs=require('node:fs');process.stdin.setRawMode(true);process.stdout.write('\\x1b[?2004h\\x1b]0;Dictée de recette\\x07READY\\r\\n');process.stdin.on('data',b=>fs.appendFileSync(${JSON.stringify(bytes)},b));`);
executable('pw-record', `const b=Buffer.alloc(3200);for(let i=0;i<b.length;i+=2)b.writeInt16LE(Math.round(3000*Math.sin(i/20)),i);process.stdout.write(b);setInterval(()=>process.stdout.write(b),30);`);
executable('whisper-cli', `const fs=require('node:fs'),a=process.argv.slice(2);const input=fs.readFileSync(a[a.indexOf('-f')+1]);if(input.toString('ascii',0,4)!=='RIFF'||input.readUInt32LE(24)!==16000)process.exit(2);setTimeout(()=>fs.writeFileSync(a[a.indexOf('-of')+1]+'.txt','Bonjour Toubi, ceci est une dictée de recette.'),fs.existsSync(${JSON.stringify(slow)})?2500:150);`);
const env = { ...process.env, HOME: home, TERMINAL_DECK_PROFILE: path.join(tmp, 'profile'), PATH: bin + path.delimiter + process.env.PATH };
delete env.ELECTRON_RUN_AS_NODE;
const native = process.env.DICTATION_NATIVE === '1';
if (!native) { env.DISPLAY = ''; env.WAYLAND_DISPLAY = ''; }
let app;
const received = () => fs.existsSync(bytes) ? fs.readFileSync(bytes, 'utf8') : '';
(async () => {
  try {
    app = await playwright._electron.launch({ executablePath: require('electron'), args: [root, '--no-startup-codex', '--disable-gpu', '--ozone-platform=' + (native ? 'wayland' : 'headless')], env });
    const page = await app.firstWindow();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.waitForFunction(() => typeof state !== 'undefined' && Boolean(state));
    await page.locator('#new-codex').click();
    await page.waitForFunction(() => activeRuntime()?.running && activeRuntime()?.terminalTitle === 'Dictée de recette');
    const phase = value => page.locator(`.dictation[data-phase="${value}"]:not([hidden])`).waitFor();
    const open = async () => { await page.keyboard.press('F9'); await phase('recording'); await page.waitForTimeout(220); };
    await open();
    assert.ok(await page.locator('.dictation-meter i').first().evaluate(el => parseFloat(el.style.height)) > 3);
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'artifacts/dictation-recording.png') });
    await page.keyboard.press('Enter'); await phase('review');
    assert.equal(await page.locator('.dictation-text').inputValue(), 'Bonjour Toubi, ceci est une dictée de recette.');
    assert.equal(received(), '');
    await page.keyboard.press('Shift+Enter'); assert.equal(received(), '');
    await page.locator('.dictation-text').fill('Bonjour Toubi, message corrigé.');
    await page.screenshot({ path: path.join(root, 'artifacts/dictation-review.png') });
    await page.keyboard.press('Enter'); await page.locator('.dictation').waitFor({ state: 'hidden' });
    await page.waitForTimeout(200);
    const sent = '\x1b[200~Bonjour Toubi, message corrigé.\x1b[201~\r';
    assert.equal(received(), sent);
    console.log('F9 → capture avec niveau réel de fixture → Entrée → texte éditable → Entrée : vrai PTY, un seul envoi.');
    await open(); await page.keyboard.press('Escape'); await page.locator('.dictation').waitFor({ state: 'hidden' }); assert.equal(received(), sent);
    console.log('Échap annule la capture et remet le focus dans xterm.');
    fs.writeFileSync(slow, 'slow decoder fixture');
    await open(); await page.keyboard.press('F9'); await phase('transcribing');
    await page.keyboard.press('Escape'); await page.locator('.dictation').waitFor({ state: 'hidden' });
    await page.waitForTimeout(2700); assert.equal(received(), sent);
    console.log('Annulation pendant la transcription : aucun résultat tardif ni envoi.');
    await open(); await page.locator('#new-codex').click();
    await page.locator('.dictation').waitFor({ state: 'hidden' }); assert.equal(received(), sent);
    console.log('Changer de panneau annule sans détourner le texte vers un autre Codex.');
    assert.deepEqual(errors, []);
    await app.evaluate(({ BrowserWindow }) => { for (const w of BrowserWindow.getAllWindows()) w.destroy(); });
  } finally {
    if (app) await app.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
