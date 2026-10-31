const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { _electron } = require('/tmp/deck-ui-tools/node_modules/playwright');
const { startStudio } = require('../tools/sprite-studio/server.cjs');
const { packs, atlases } = require('../tools/sprite-studio/model.js');
const root = path.join(__dirname, '..'), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'td-studio-test-'));
const hashes = () => [...packs, ...atlases].map(pack => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/mascots', pack.file))).digest('hex'));
const originals = hashes();
let app, studio, page;
(async () => {
  try {
    studio = await startStudio({ port: 0 });
    const env = { ...process.env, HOME: temporary, DISPLAY: '', WAYLAND_DISPLAY: '', TERMINAL_DECK_PROFILE: path.join(temporary, 'profile') };
    delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({ executablePath: require('electron'), args: [root, '--ozone-platform=headless', '--disable-gpu', '--no-startup-codex'], env });
    const next = app.waitForEvent('window');
    await app.evaluate(async ({ BrowserWindow }, url) => {
      const window = new BrowserWindow({ width: 1600, height: 1000, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
      await window.loadURL(url);
    }, studio.url);
    page = await next; await page.setViewportSize({ width: 1600, height: 1000 });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') console.error('Navigateur :', message.text()); });
    await app.evaluate(({ session }, folder) => {
      globalThis.studioDownloads = [];
      session.defaultSession.on('will-download', (_event, item) => {
        const filename = item.getFilename();
        item.setSavePath(folder + '/' + filename);
        item.once('done', (_event, state) => globalThis.studioDownloads.push({ filename, state }));
      });
    }, temporary);
    async function download(button, extension) {
      await app.evaluate(() => { globalThis.studioDownloads = []; });
      await page.locator(button).click();
      const started = Date.now();
      while (Date.now() - started < 6000) {
        const items = await app.evaluate(() => globalThis.studioDownloads);
        const item = items.find(item => item.filename.endsWith(extension));
        if (item) { assert.equal(item.state, 'completed'); return path.join(temporary, item.filename); }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Téléchargement absent : ' + extension);
    }
    await page.waitForFunction(() => document.querySelectorAll('.frame').length === 4 && document.querySelector('#source-size').textContent === '1254 × 1254');
    await page.locator('#play').click();
    await page.getByRole('button', { name: 'Vesper', exact: true }).click();
    await page.locator('[data-pack="curious"]').click();
    await page.waitForFunction(() => document.querySelector('#source-size').textContent === '1449 × 1086');
    await page.locator('.frame').first().click();
    assert.equal(await page.locator('#preview').getAttribute('width'), '96');
    assert.ok(Number(await page.locator('#crop-trimTop').inputValue()) > 22);
    const x = Number(await page.locator('#crop-x').inputValue());
    await page.locator('#crop-x').fill(String(x + 12)); await page.locator('#crop-x').press('Tab');
    assert.equal(Number(await page.locator('#crop-x').inputValue()), x + 12);
    const atlasRect = await page.locator('#atlas').boundingBox();
    await page.mouse.move(atlasRect.x + 35, atlasRect.y + atlasRect.height * .5);
    await page.mouse.down(); await page.mouse.move(atlasRect.x + 39, atlasRect.y + atlasRect.height * .5 + 2); await page.mouse.up();
    assert.ok(Number(await page.locator('#crop-x').inputValue()) > x + 12);
    await page.locator('#stage').click({ position: { x: 15, y: 15 } });
    const y = Number(await page.locator('#crop-y').inputValue());
    await page.keyboard.press('Alt+ArrowDown');
    assert.ok(Math.abs(Number(await page.locator('#crop-y').inputValue()) - y - 1) < .02);
    await page.locator('#onion').click(); assert.equal(await page.locator('#onion').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-background="checker"]').click(); assert.equal(await page.locator('#stage').getAttribute('data-background'), 'checker');
    await page.locator('#speed').selectOption('0.5');
    const jsonPath = await download('#export-settings', '.json');
    const settings = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.equal(settings.character, 1); assert.equal(settings.source.file, 'curious-sheet.png'); assert.equal(settings.atlas.width, 384); assert.equal(settings.frames.length, 4);
    const pngPath = await download('#export-sheet', '.png');
    const buffer = fs.readFileSync(pngPath); assert.equal(buffer.readUInt32BE(16), 384); assert.equal(buffer.readUInt32BE(20), 96);
    await page.locator('[data-pack="working"]').click();
    await page.locator('#settings-file').setInputFiles(jsonPath);
    await page.waitForFunction(() => document.querySelector('#source-size').textContent === '1449 × 1086');
    assert.ok(Math.abs(Number(await page.locator('#crop-x').inputValue()) - settings.frames[0].x) < .02);
    await page.reload();
    await page.locator('[data-pack="curious"]').click(); await page.getByRole('button', { name: 'Vesper', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#source-size').textContent === '1449 × 1086');
    assert.ok(Math.abs(Number(await page.locator('#crop-x').inputValue()) - settings.frames[0].x) < .02);
    await page.locator('#image-file').setInputFiles(pngPath);
    await page.waitForFunction(() => !document.querySelector('#custom-grid').hidden);
    await page.locator('#grid-rows').fill('1'); await page.locator('#grid-rows').press('Tab');
    await page.waitForFunction(() => Number(document.querySelector('#crop-h').value) === 96);
    assert.equal(await page.locator('.frame').count(), 4);
    // Les deux atlas partagent les mêmes états, avec des brouillons séparés par expression.
    assert.equal(await page.locator('#characters .character').count(), 5);
    await page.locator('[data-pack="working"]').click(); await page.getByRole('button', { name: 'Fox Loaf', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#preview-title').textContent.includes('Fox Loaf') && document.querySelector('[data-pack="working"]').getAttribute('aria-current') === 'true');
    assert.equal(await page.locator('#source-size').textContent(), '1024 × 1536');
    assert.equal(Number(await page.locator('#crop-trimLeft').inputValue()), 16);
    const foxX = Number(await page.locator('#crop-x').inputValue()) + 3;
    await page.locator('#crop-x').fill(String(foxX)); await page.locator('#crop-x').press('Tab');
    await page.locator('[data-pack="waiting"]').click();
    await page.waitForFunction(() => document.querySelector('[data-pack="waiting"]').getAttribute('aria-current') === 'true');
    assert.equal(Number(await page.locator('#crop-x').inputValue()), 0);
    await page.locator('[data-pack="working"]').click();
    await page.waitForFunction(x => Number(document.querySelector('#crop-x').value) === x, foxX);
    await page.screenshot({ path: path.join(root, 'artifacts/fox-loaf-studio.png') });
    await page.locator('[data-pack="curious"]').click();
    await page.waitForFunction(() => document.querySelector('[data-pack="curious"]').getAttribute('aria-current') === 'true');
    await page.locator('.frame').nth(1).click(); await page.locator('#guides').uncheck();
    const leftAlpha = () => page.evaluate(() => { const c = document.querySelector('#preview'), d = c.getContext('2d').getImageData(0, 0, 6, c.height).data; return Array.from(d).filter((_, i) => i % 4 === 3).reduce((sum, a) => sum + a, 0); });
    assert.equal(await leftAlpha(), 0);
    await page.locator('#crop-trimLeft').fill('0'); await page.locator('#crop-trimLeft').press('Tab');
    assert.ok(await leftAlpha() > 0);
    await page.locator('#reset-frame').click(); assert.equal(Number(await page.locator('#crop-trimLeft').inputValue()), 16);
    assert.equal(await leftAlpha(), 0);
    await page.locator('#guides').check(); await page.locator('[data-pack="working"]').click();
    await page.waitForFunction(() => document.querySelector('[data-pack="working"]').getAttribute('aria-current') === 'true');
    await page.getByRole('button', { name: 'Corbac mini', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#preview-title').textContent.includes('Corbac mini'));
    assert.equal(Number(await page.locator('#crop-trimLeft').inputValue()), 0);
    const ravenPath = await download('#export-settings', '.json');
    const ravenSettings = JSON.parse(fs.readFileSync(ravenPath, 'utf8'));
    assert.equal(ravenSettings.character, 4); assert.equal(ravenSettings.pack, 'working'); assert.equal(ravenSettings.source.file, 'corbac-mini-sheet-v3.png');
    const ravenPng = await download('#export-sheet', '.png');
    const ravenBytes = fs.readFileSync(ravenPng); assert.equal(ravenBytes.readUInt32BE(16), 384); assert.equal(ravenBytes.readUInt32BE(20), 96);
    await page.locator('[data-pack="greeting"]').click();
    await page.locator('#settings-file').setInputFiles(ravenPath);
    await page.waitForFunction(() => document.querySelector('[data-pack="working"]').getAttribute('aria-current') === 'true' && document.querySelector('#preview-title').textContent.includes('Corbac mini'));
    await page.locator('[data-pack="sleeping"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.frame').length === 1);
    assert.equal(Number(await page.locator('#crop-x').inputValue()), 768);
    assert.equal(Number(await page.locator('#crop-y').inputValue()), 976);
    await page.locator('[data-pack="curious"]').click(); await page.getByRole('button', { name: 'Vesper', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#source-size').textContent === '1449 × 1086');
    await page.locator('#reset-all').click();
    await page.locator('button[data-background="terminal"]').click();
    await page.screenshot({ path: path.join(root, 'artifacts/sprite-studio.png') });
    await page.setViewportSize({ width: 850, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []); assert.deepEqual(hashes(), originals);
    console.log('Atelier : vrai rendu Electron, déplacement de cadre, clavier, sauvegarde locale, exports PNG/JSON, import PNG et réglages, vue étroite et sources intactes validés.');
  } catch (error) {
    if (page) {
      console.error('Atelier :', await page.evaluate(() => ({ toast: document.querySelector('#toast')?.textContent, source: document.querySelector('#source-size')?.textContent, frames: document.querySelectorAll('.frame').length })));
      await page.screenshot({ path: path.join(root, 'artifacts/studio-failure.png') });
    }
    throw error;
  } finally {
    if (app) await app.close(); if (studio) await studio.close(); fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(async error => {
  console.error(error);
  process.exitCode = 1;
});
