const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { _electron } = require('/tmp/deck-ui-tools/node_modules/playwright');
const store = require('../src/state.cjs');
const L = require('../src/layout.js');
const project = path.join(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'td-startup-'));
const home = path.join(temporary, 'home'), bin = path.join(temporary, 'bin');
fs.mkdirSync(home); fs.mkdirSync(bin);
fs.writeFileSync(path.join(bin, 'codex'), `#!/usr/bin/env node
const assert=require('node:assert/strict');
assert.deepEqual(process.argv.slice(2),['resume','--all','-c','tui.terminal_title=["thread-id","thread-title"]','-c','tui.keymap.composer.queue=[]']);
process.stdin.setRawMode(true); process.stdin.resume();
process.stdout.write('STARTUP_READY\\r\\n\\x1b]7501;state=idle:app=codex\\x07');
process.stdin.on('data',()=>{throw Error('Aucune saisie attendue dans le sélecteur de recette');});
`, { mode: 0o700 });
const env = { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', HOME: home, CODEX_HOME: path.join(temporary, 'codex'), PATH: bin + path.delimiter + process.env.PATH };
delete env.ELECTRON_RUN_AS_NODE;
let app;
(async () => {
  try {
    for (const count of [1, 3, 16]) {
      const profile = path.join(temporary, 'profile-' + count);
      const p = store.project(home), other = store.project(temporary);
      p.sessions = Array.from({ length: count }, (_, i) => ({ id: `codex-${i}`, kind: 'codex', name: `Codex ${i}`, minimized: count > 1 && i === count - 1 }));
      p.sessions.push({ id: 'shell', kind: 'shell', name: 'Terminal' });
      p.tree = L.grid(p.sessions.map(s => s.id)); p.active = 'codex-0';
      // 16 est le plafond total des panneaux ; garder le cas maximal à 16.
      if (count === 16) { p.sessions.pop(); p.tree = L.grid(p.sessions.map(s => s.id)); }
      other.sessions = [{ id: 'other-codex', kind: 'codex', name: 'Autre projet' }]; other.tree = L.leaf('other-codex'); other.active = 'other-codex';
      store.save(path.join(profile, 'workspace.json'), store.cleanState({ projects: [p, other], activeProject: p.id }, home));
      app = await _electron.launch({ executablePath: require('electron'), args: [project, '--ozone-platform=headless', '--disable-gpu'], env: { ...env, TERMINAL_DECK_PROFILE: profile } });
      const page = await app.firstWindow(); const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.waitForFunction(count => typeof state !== 'undefined' && state && typeof runtimes !== 'undefined' && [...runtimes.entries()].filter(([id, r]) => id.startsWith('codex-') && r.running && !r.starting).length === count, count);
      await page.waitForFunction(count => Array.from({ length: count }, (_, i) => runtimes.get('codex-' + i)).every(r => { const b = r.term.buffer.active; return Array.from({ length: b.length }, (_, i) => b.getLine(i)?.translateToString(true) || '').includes('STARTUP_READY'); }), count);
      const snapshot = await page.evaluate(() => ({ active: activeProject().active, minimized: activeProject().sessions.filter(s => s.minimized).map(s => s.id), shellRunning: runtimes.get('shell')?.running, otherRunning: runtimes.get('other-codex').running, ids: activeProject().sessions.map(s => s.id) }));
      assert.equal(snapshot.active, 'codex-0'); assert.equal(snapshot.otherRunning, false);
      if (count < 16) assert.equal(snapshot.shellRunning, false);
      assert.deepEqual(snapshot.minimized, count > 1 ? ['codex-' + (count - 1)] : []);
      assert.equal(await page.locator('.terminal-pane.codex-pane .paused:visible').count(), 0);
      await page.reload();
      await page.waitForFunction(count => typeof runtimes !== 'undefined' && [...runtimes.entries()].filter(([id, r]) => id.startsWith('codex-') && r.running && !r.starting).length === count, count);
      assert.deepEqual(await page.evaluate(() => activeProject().sessions.map(s => s.id)), snapshot.ids);
      assert.deepEqual(errors, []);
      await app.close(); app = null;
    }
    console.log('Démarrage Electron/PTY : 1, 3 et 16 Codex lancés automatiquement ; panneaux réduits, focus, shells en pause, autres projets et réattachement préservés. Aucun prompt envoyé.');
  } finally { if (app) await app.close(); fs.rmSync(temporary, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
