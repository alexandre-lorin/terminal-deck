const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const store = require('../src/state.cjs');
const L = require('../src/layout.js');
const { _electron } = require('/tmp/deck-ui-tools/node_modules/playwright');

const project = path.join(__dirname, '..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'td-native-codex-'));
const home = path.join(root, 'home'), codexHome = path.join(root, 'codex'), bin = path.join(home, '.local/bin');
fs.mkdirSync(bin, { recursive: true }); fs.mkdirSync(codexHome);
const binary = fs.realpathSync(path.join(os.homedir(), '.local/bin/codex'));
const quote = text => "'" + text.replace(/'/g, "'\\''") + "'";
fs.writeFileSync(path.join(bin, 'codex'), '#!/bin/sh\nexec ' + quote(binary) + ' --no-daemon "$@"\n', { mode: 0o700 });
fs.writeFileSync(path.join(codexHome, 'config.toml'), 'model="fixture"\nmodel_provider="fixture"\n[model_providers.fixture]\nname="Fixture locale"\nbase_url="http://127.0.0.1:1/v1"\nwire_api="responses"\nrequires_openai_auth=false\n');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CODEX_') && !['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'ELECTRON_RUN_AS_NODE'].includes(key)));
Object.assign(env, { HOME: home, CODEX_HOME: codexHome, PATH: bin + path.delimiter + process.env.PATH, DISPLAY: '', WAYLAND_DISPLAY: '', TERMINAL_DECK_PROFILE: path.join(root, 'profile') });
const startup = store.project(home);
startup.sessions = [0, 1, 2].map(i => ({ id: 'native-' + i, kind: 'codex', name: 'Codex', minimized: false }));
startup.tree = L.grid(startup.sessions.map(s => s.id)); startup.active = 'native-0';
store.save(path.join(env.TERMINAL_DECK_PROFILE, 'workspace.json'), store.cleanState({ projects: [startup], activeProject: startup.id }, home));
let app;
(async () => {
  try {
    app = await _electron.launch({ executablePath: require('electron'), args: [project, '--ozone-platform=headless', '--disable-gpu'], env });
    const page = await app.firstWindow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => typeof state !== 'undefined' && state && typeof runtimes !== 'undefined');
    await page.waitForFunction(() => runtimes.size === 3 && [...runtimes.values()].every(r => r.running && DeckCodexPicker.inspect(r.term) === 'all'));
    await page.waitForFunction(() => document.querySelector('.terminal-pane .pane-companion')?.dataset.pose === 'curious');
    const movement = await page.locator('.terminal-pane .pane-companion').first().evaluate(el => getComputedStyle(el).animationName);
    if (!movement.includes('companion-curious') && !movement.includes('companion-breathe')) throw new Error('Le compagnon reste figé dans le vrai sélecteur.');
    const textarea = page.locator('.xterm-helper-textarea').first(); await textarea.focus();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => { const r = [...runtimes.values()][0]; return r?.running && DeckCodexPicker.inspect(r.term) === null; });
    // Attendre que le vrai composer ait été dessiné, sans jamais lui envoyer de prompt.
    await page.waitForFunction(() => {
      const term = [...runtimes.values()][0].term, b = term.buffer.active;
      return Array.from({ length: b.length }, (_, i) => b.getLine(i)?.translateToString() || '').some(line => line.includes('for shortcuts'));
    });
    await page.waitForFunction(() => document.querySelector('.pane-companion')?.dataset.status === 'idle');
    await page.waitForFunction(() => {
      const key = [...runtimes.values()][0].conversationKey;
      return key && state.conversations.some(c => c.key === key && c.fullId);
    });
    const metadata = await page.evaluate(() => state.conversations.find(c => c.key === [...runtimes.values()][0].conversationKey));
    if (!require('../src/conversations.js').validId(metadata.fullId)) throw new Error('Association de conversation native absente.');
    await page.keyboard.type('/resume', { delay: 70 }); await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const r = [...runtimes.values()][0]; return DeckCodexPicker.inspect(r.term) === 'all'; });
    if (await page.locator('#active-title').textContent() !== 'Codex') throw new Error('Un identifiant interne est affiché comme titre.');
    fs.mkdirSync(path.join(project, 'artifacts'), { recursive: true });
    await page.screenshot({ path: path.join(project, 'artifacts/native-codex-picker.png') });
    console.log('Vrai Codex, profil temporaire : trois panneaux démarrés en sélection All, Échap → nouveau chat et /resume → All validés, sans compte ni prompt modèle.');
  } catch (error) {
    if (app) { const page = await app.firstWindow(); console.error('CLI isolés :', JSON.stringify(await page.evaluate(() => ({ toast: document.querySelector('#toast').textContent, panes: [...runtimes.values()].map(r => ({ running: r.running, identity: r.conversationKey, filter: DeckCodexPicker.inspect(r.term), cols: r.term.cols, rows: r.term.rows, header: Array.from({ length: Math.min(30, r.term.buffer.active.length) }, (_, i) => r.term.buffer.active.getLine(r.term.buffer.active.baseY + i)?.translateToString(true) || '') })) })), null, 2)); }
    throw error;
  } finally {
    if (app) await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
