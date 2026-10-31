const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/tmp/deck-ui-tools/node_modules/playwright'); }
const root = path.join(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-deck-ui-'));
const profile = path.join(temporary, 'profile'), home = path.join(temporary, 'home');
fs.mkdirSync(home);
const bin = path.join(temporary, 'bin'); fs.mkdirSync(bin);
// Un faux exécutable pour tester le chemin Codex sans connexion ni consommation.
fs.writeFileSync(path.join(bin, 'codex'), `#!/usr/bin/env node
const assert = require('node:assert/strict');
if(process.argv[2]==='app-server') {
  assert.deepEqual(process.argv.slice(2), ['app-server','--listen','stdio://']);
  const rl=require('node:readline').createInterface({input:process.stdin});
  rl.on('line',line=>{const q=JSON.parse(line);if(q.method==='initialized')return;
    assert.ok(['initialize','account/rateLimits/read'].includes(q.method));
    const f=require('node:fs'),file=require('node:path').join(require('node:os').homedir(),'.quota-reads');let calls=0;
    if(q.method==='account/rateLimits/read'){calls=f.existsSync(file)?Number(f.readFileSync(file,'utf8')):0;calls++;f.writeFileSync(file,String(calls));}
    console.log(JSON.stringify({id:q.id,result:q.method==='initialize'?{}:{rateLimits:{limitId:'codex',primary:{usedPercent:67+calls,windowDurationMins:300,resetsAt:Math.floor(Date.now()/1000)+7200},secondary:{usedPercent:42,windowDurationMins:10080,resetsAt:Math.floor(Date.now()/1000)+172800}}}}));
  });
} else {
assert.equal(process.argv[2], 'resume');
const explicit = process.argv[3] !== '--all';
if (explicit) assert.match(process.argv[3], /^[0-9a-f-]{36}$/i);
assert.deepEqual(process.argv.slice(4), ['-c', 'tui.terminal_title=["thread-id","thread-title"]', '-c', 'tui.keymap.composer.queue=[]']);
process.stdin.setRawMode(true);
process.stdout.write('\\x1b[?2004h\\x1b]0;' + (explicit ? process.argv[3] + ' | ' : '') + 'Projet — construction\\x07\\r\\nFIXTURE_CODEX_TTY:yes\\r\\n');
let pending = Buffer.alloc(0);
process.stdin.on('data', chunk => {
  for (const byte of chunk) {
    if (byte === 13) {
      if (pending.toString() === 'exit') process.exit(0);
      process.stdout.write('\\r\\nKEYS:' + pending.toString('hex') + '\\r\\n\\x1b]2;Projet — vérifications\\x1b\\\\');
      pending = Buffer.alloc(0);
    } else pending = Buffer.concat([pending, Buffer.from([byte])]);
  }
});
}
`, { mode: 0o700 });
const errors = [];
let app;
// Ozone headless possède son propre presse-papiers : aucun accès à celui du bureau.
const env = { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', HOME: home, SHELL: '/bin/bash', PATH: bin + path.delimiter + process.env.PATH, TERMINAL_DECK_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
async function launch() {
  app = await playwright._electron.launch({ executablePath: require('electron'), args: [root, '--ozone-platform=headless', '--disable-gpu', '--no-startup-codex'], env });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1440, height: 900 });
  page.on('pageerror', error => errors.push(error.message));
  await page.waitForFunction(home => document.querySelector('#project-name').title === home, home);
  return page;
}
async function command(page, text) {
  await page.locator('#more-button').click();
  await page.locator('#modal input').fill(text);
  await page.locator('#modal input').press('Enter');
}
async function close() {
  await app.evaluate(({ BrowserWindow }) => { for (const window of BrowserWindow.getAllWindows()) window.destroy(); });
  await app.close(); app = null;
}
async function output(page, id, expected) {
  await page.waitForFunction(({ id, expected }) => {
    const runtime = runtimes.get(id), buffer = runtime.term.buffer.active;
    const logical = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i), text = line?.translateToString(true) || '';
      if (line?.isWrapped && logical.length) logical[logical.length - 1] += text;
      else logical.push(text);
    }
    return logical.includes(expected);
  }, { id, expected });
}
(async () => {
  try {
    let page = await launch();
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'artifacts/empty-workspace.png') });
    await page.clock.install();
    await page.locator('#usage-button').click();
    await page.locator('.quota-value').filter({ hasText: '32 % restant' }).waitFor();
    assert.equal(await page.locator('.quota-window').count(), 2);
    assert.equal(await page.locator('#usage-popup').getAttribute('data-status'), 'ready');
    const quotaRect = await page.locator('#usage-popup').boundingBox();
    const viewport = page.viewportSize() || await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    assert.ok(Math.abs(viewport.height - quotaRect.y - quotaRect.height - 18) < 2);
    assert.equal(await page.locator('.quota-track').first().getAttribute('aria-valuenow'), '32');
    await page.locator('#usage-handle').hover({ position: { x: 50, y: 12 } });
    await page.mouse.down(); await page.mouse.move(quotaRect.x - 100, quotaRect.y + 80); await page.mouse.up();
    await page.screenshot({ path: path.join(root, 'artifacts/usage-popup.png') });
    await page.clock.fastForward(300000);
    await page.locator('.quota-value').filter({ hasText: '31 % restant' }).waitFor();
    await page.locator('#usage-refresh').click();
    await page.locator('.quota-value').filter({ hasText: '30 % restant' }).waitFor();
    await page.locator('#usage-close').click();
    await page.clock.fastForward(300000);
    assert.equal(fs.readFileSync(path.join(home, '.quota-reads'), 'utf8'), '3');
    assert.equal(await page.locator('#usage-mascot').getAttribute('data-mascot'), '0');
    for (const expected of ['1', '2', '3', '4', '0']) {
      await page.locator('#usage-button').click();
      assert.equal(await page.locator('#usage-mascot').getAttribute('data-mascot'), expected);
      await page.locator('#usage-close').click();
    }
    await page.getByRole('button', { name: 'Compagnons', exact: true }).click();
    assert.equal(await page.locator('.pet-choice').count(), 5);
    assert.equal(await page.locator('.pet-choice:disabled').count(), 5);
    await page.getByRole('button', { name: 'Ouvrir un Codex pour choisir son compagnon', exact: true }).waitFor();
    await page.locator('#modal-close').click();
    await page.locator('#welcome-shell').click();
    await page.locator('.pane-state.live').waitFor();
    const id = await page.locator('.terminal-pane').getAttribute('data-session-id');
    await page.evaluate(async id => { await deck.write({ id, data: "printf '\\nTD_REAL_PTY:%s:%s\\n' \"$(test -t 0 && echo yes)\" \"$PWD\"\r" }); }, id);
    await output(page, id, `TD_REAL_PTY:yes:${home}`);
    assert.equal(await page.locator('#composer, footer, .workspace-heading, .deck-toolbar').count(), 0);
    await page.locator('.xterm-helper-textarea').focus();
    await page.keyboard.type("printf '\\nWORD_OK:%s\\n' remove");
    await page.keyboard.press('Control+Backspace'); await page.keyboard.type('keep'); await page.keyboard.press('Enter');
    await output(page, id, 'WORD_OK:keep');
    // API native Electron complète, dans le presse-papiers isolé de ce processus.
    await page.evaluate(() => deck.copy('copied ✓'));
    assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), 'copied ✓');
    await app.evaluate(async ({ clipboard }) => { await clipboard.writeText('x'.repeat(61000)); });
    assert.equal(await page.evaluate(async () => (await deck.paste()).length), 60000);
    await app.evaluate(async ({ clipboard }) => { await clipboard.writeText('pasted text'); });
    await page.keyboard.type("printf '\\nPASTE_OK:%s\\n' '");
    await page.keyboard.press('Control+Shift+V');
    await page.waitForFunction(id => runtimes.get(id).term.buffer.active.getLine(runtimes.get(id).term.buffer.active.cursorY + runtimes.get(id).term.buffer.active.baseY)?.translateToString().includes('pasted text'), id);
    await page.keyboard.type("'"); await page.keyboard.press('Enter'); await output(page, id, 'PASTE_OK:pasted text');
    // Saisie directe, y compris une application plein écran et son redimensionnement.
    await page.evaluate(async id => { await deck.write({ id, data: "printf '\\033[?1049h\\033[2J\\033[HALTERNATE_BUFFER_OK'; sleep 1; printf '\\033[?1049l'\r" }); }, id);
    await command(page, 'Diviser à droite'); await page.locator('.pane-state.live').nth(1).waitFor();
    assert.equal(await page.locator('.terminal-pane').count(), 2);
    const second = await page.locator('.terminal-pane').nth(1).getAttribute('data-session-id');
    await page.keyboard.press('Control+PageUp');
    assert.equal(await page.evaluate(() => activeProject().active), id);
    await page.keyboard.press('Control+PageDown');
    assert.equal(await page.evaluate(() => activeProject().active), second);
    const divider = page.locator('.divider').first(), rect = await divider.boundingBox();
    await page.mouse.move(rect.x + 4, rect.y + rect.height / 2); await page.mouse.down(); await page.mouse.move(rect.x + 90, rect.y + rect.height / 2); await page.mouse.up();
    await page.evaluate(async id => { await deck.write({ id, data: "printf '\\nRESIZE_OK\\n'; stty size\r" }); }, second); await output(page, second, 'RESIZE_OK');
    await page.locator('.terminal-pane').nth(1).locator('.xterm-helper-textarea').focus();
    await page.keyboard.type("printf '\\nKEYBOARD_OK\\n'"); await page.keyboard.press('Enter'); await output(page, second, 'KEYBOARD_OK');
    // Gestes réels avec Ctrl : échange, placement, annulation et conservation du PTY.
    await page.evaluate(async id => deck.write({ id, data: "printf '\\nDRAG_PID:%s\\n' \"$$\"\r" }), id);
    await page.waitForFunction(id => { const b = runtimes.get(id).term.buffer.active; return Array.from({ length: b.length }, (_, i) => b.getLine(i)?.translateToString(true) || '').some(line => /^DRAG_PID:\d+$/.test(line)); }, id);
    const pidBefore = await page.evaluate(id => { const b = runtimes.get(id).term.buffer.active; return Array.from({ length: b.length }, (_, i) => b.getLine(i)?.translateToString(true) || '').find(line => /^DRAG_PID:\d+$/.test(line)).split(':')[1]; }, id);
    const originalDragLayout = await page.evaluate(() => JSON.stringify(activeProject().tree));
    const startDrag = async (source, target, zone = 'center') => {
      const from = await page.locator(`.terminal-pane[data-session-id="${source}"] .terminal-host`).boundingBox();
      const to = await page.locator(`.terminal-pane[data-session-id="${target}"]`).boundingBox();
      await page.keyboard.down('Control'); await page.mouse.move(from.x + from.width / 2, from.y + 35); await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, zone === 'top' ? to.y + 8 : to.y + to.height / 2, { steps: 8 });
      await page.locator('.pane-drop-preview:visible').waitFor();
    };
    await startDrag(second, id);
    assert.equal(await page.locator('.pane-drop-preview').textContent(), 'Échanger les panneaux');
    await page.screenshot({ path: path.join(root, 'artifacts/pane-drag-preview.png') });
    await page.mouse.up(); await page.keyboard.up('Control');
    assert.deepEqual(await page.evaluate(() => DeckLayout.ids(activeProject().tree)), [second, id]);
    assert.equal(await page.locator('.pane-name:visible').count(), 2);
    await startDrag(second, id); await page.mouse.up(); await page.keyboard.up('Control');
    assert.equal(await page.evaluate(() => JSON.stringify(activeProject().tree)), originalDragLayout);
    await startDrag(second, id, 'top');
    await page.keyboard.press('Escape'); await page.mouse.up(); await page.keyboard.up('Control');
    assert.equal(await page.evaluate(() => JSON.stringify(activeProject().tree)), originalDragLayout);
    assert.equal(await page.locator('.pane-drop-preview').count(), 0);
    await startDrag(second, id, 'top'); await page.keyboard.up('Control'); await page.mouse.up();
    assert.equal(await page.evaluate(() => JSON.stringify(activeProject().tree)), originalDragLayout);
    await startDrag(second, id, 'top'); await page.mouse.move(12, 12); await page.mouse.up(); await page.keyboard.up('Control');
    assert.equal(await page.evaluate(() => JSON.stringify(activeProject().tree)), originalDragLayout);
    await startDrag(second, id, 'top'); await page.mouse.up(); await page.keyboard.up('Control');
    assert.equal(await page.evaluate(() => activeProject().tree.axis), 'column');
    assert.deepEqual(await page.evaluate(() => DeckLayout.ids(activeProject().tree)), [second, id]);
    // Replacer à droite, puis vérifier le processus et le profil réellement écrit.
    const from = await page.locator(`.terminal-pane[data-session-id="${second}"] .terminal-host`).boundingBox();
    const to = await page.locator(`.terminal-pane[data-session-id="${id}"]`).boundingBox();
    await page.keyboard.down('Control'); await page.mouse.move(from.x + from.width / 2, from.y + 35); await page.mouse.down();
    await page.mouse.move(to.x + to.width - 8, to.y + to.height / 2, { steps: 8 }); await page.mouse.up(); await page.keyboard.up('Control');
    assert.deepEqual(await page.evaluate(() => DeckLayout.ids(activeProject().tree)), [id, second]);
    assert.equal(await page.evaluate(() => activeProject().tree.axis), 'row');
    const noCtrlLayout = await page.evaluate(() => JSON.stringify(activeProject().tree));
    const header = await page.locator(`.terminal-pane[data-session-id="${id}"] .pane-header`).boundingBox();
    await page.mouse.move(header.x + 5, header.y + 18); await page.mouse.down(); await page.mouse.move(header.x + 70, header.y + 70); await page.mouse.up();
    assert.equal(await page.evaluate(() => JSON.stringify(activeProject().tree)), noCtrlLayout);
    await page.evaluate(async id => deck.write({ id, data: "printf '\\nDRAG_AFTER:%s\\n' \"$$\"\r" }), id);
    await output(page, id, 'DRAG_AFTER:' + pidBefore);
    await page.evaluate(() => save(true));
    const dragState = JSON.parse(fs.readFileSync(path.join(profile, 'workspace.json'), 'utf8'));
    assert.deepEqual(dragState.projects.find(p => p.id === dragState.activeProject).tree, await page.evaluate(() => activeProject().tree));
    // Sortir du panneau après le test de sélection normale, puis y rentrer.
    await page.locator('#more-button').hover();
    // Le focus et la saisie suivent la souris, sans clic.
    await page.locator('.terminal-pane').first().locator('.pane-header').hover();
    assert.equal(await page.evaluate(() => activeProject().active), id);
    await page.keyboard.type("printf '\\nHOVER_FOCUS_OK\\n'"); await page.keyboard.press('Enter');
    await output(page, id, 'HOVER_FOCUS_OK');
    await page.locator('.terminal-pane').last().locator('.pane-header').hover();
    assert.equal(await page.evaluate(() => activeProject().active), second);
    // Le survol, et non le terminal qui possède le focus, désigne la cible.
    const layoutBefore = await page.evaluate(() => JSON.stringify(activeProject().tree));
    await page.locator('.terminal-pane').first().locator('.pane-header').hover();
    await page.keyboard.press('Control+t');
    await page.waitForFunction(() => document.querySelectorAll('.terminal-pane').length === 1);
    assert.equal(await page.locator('.terminal-pane').getAttribute('data-session-id'), second);
    assert.equal(await page.locator('.minimized-tab').count(), 1);
    await page.locator('.terminal-pane').locator('.pane-header').hover(); await page.keyboard.press('Control+t');
    await page.waitForFunction(() => document.querySelectorAll('.terminal-pane').length === 0);
    assert.equal(await page.locator('.minimized-tab').count(), 2);
    await page.evaluate(async id => { await deck.write({ id, data: "printf '\\nMINIMIZED_ALIVE_OK\\n'\r" }); }, id);
    await output(page, id, 'MINIMIZED_ALIVE_OK');
    await page.locator('.minimized-tab').first().click(); await page.locator('.minimized-tab').click();
    assert.equal(await page.locator('.terminal-pane').count(), 2);
    assert.equal(await page.evaluate(() => JSON.stringify(activeProject().tree)), layoutBefore);
    await page.locator('#new-shell').click(); await page.locator('.pane-state.live').nth(2).waitFor();
    const third = await page.locator('.terminal-pane').last().getAttribute('data-session-id');
    await page.locator('.terminal-pane').first().locator('.xterm-helper-textarea').focus();
    await page.locator('.terminal-pane').last().locator('.pane-header').hover();
    await page.keyboard.press('Control+q');
    await page.waitForFunction(id => !runtimes.has(id), third);
    assert.equal(await page.locator('.terminal-pane').count(), 2);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    await page.locator('#more-button').hover(); await page.keyboard.press('Control+q');
    assert.equal(await page.locator('.terminal-pane').count(), 2);
    await command(page, 'Changer de contraste'); assert.equal(await page.locator('body').getAttribute('data-theme'), 'graphite');
    await page.locator('#focus').click(); assert.equal(await page.locator('.sidebar').isVisible(), false); await page.locator('#focus').click();
    await page.locator('#palette-button').click(); await page.locator('#modal input').fill('radar'); await page.locator('#modal input').press('Enter'); await page.locator('.library-row').first().waitFor(); await page.locator('#modal-close').click();
    // Deux projets : vérifier que changer d’espace ne tue pas les processus.
    const other = path.join(temporary, 'other-project'); fs.mkdirSync(other);
    await page.evaluate(async folder => { await addProject(folder); }, other);
    assert.equal(await page.locator('.terminal-pane').count(), 0);
    await page.locator('.project').first().click(); await page.locator('.terminal-pane').nth(1).waitFor();
    await page.evaluate(async id => { await deck.write({ id, data: "printf '\\nSTILL_ALIVE_OK\\n'\r" }); }, id); await output(page, id, 'STILL_ALIVE_OK');
    await command(page, 'Ranger les panneaux');
    const artifact = path.join(root, 'artifacts'); fs.mkdirSync(artifact, { recursive: true });
    await page.screenshot({ path: path.join(artifact, 'terminal-deck.png') });
    await command(page, 'Ambiance Périgée');
    assert.equal(await page.locator('body').getAttribute('data-theme'), 'perigee');
    await page.screenshot({ path: path.join(artifact, 'perigee.png') });
    await command(page, 'Changer de contraste'); await command(page, 'Changer de contraste');
    await page.locator('#new-codex').click();
    const codexId = await page.locator('.terminal-pane').last().getAttribute('data-session-id');
    await output(page, codexId, 'FIXTURE_CODEX_TTY:yes');
    const companion = page.locator(`.terminal-pane[data-session-id="${codexId}"] .pane-companion`);
    assert.equal(await companion.count(), 1);
    assert.equal(await companion.getAttribute('data-status'), 'unknown');
    assert.equal(await companion.getAttribute('data-pose'), 'curious');
    assert.equal(await companion.evaluate(el => getComputedStyle(el).animationName), 'companion-curious, companion-look');
    // Choix effectif, persistance et synchronisation du compagnon.
    await page.getByRole('button', { name: 'Compagnons', exact: true }).click();
    await page.getByRole('button', { name: 'Choisir Vesper', exact: true }).click();
    assert.equal(await companion.getAttribute('data-mascot'), '1');
    await page.locator('#sessions-button').click();
    await page.getByRole('button', { name: 'Rechercher une session', exact: true }).count();
    await page.getByRole('textbox', { name: 'Rechercher une session' }).fill('construction');
    assert.equal(await page.locator('.library-row').count(), 1);
    await page.getByRole('button', { name: 'Ajouter aux favoris', exact: true }).click();
    await page.getByRole('button', { name: 'Favoris', exact: true }).click();
    await page.screenshot({ path: path.join(root, 'artifacts/session-library.png') });
    assert.equal(await page.locator('.library-row').count(), 1);
    await page.locator('#modal-close').click();
    await page.evaluate(() => save(true));
    const featureState = JSON.parse(fs.readFileSync(path.join(profile, 'workspace.json'), 'utf8'));
    const storedCodex = featureState.projects.flatMap(p => p.sessions).find(s => s.id === codexId);
    assert.equal(storedCodex.companion, 1); assert.equal(storedCodex.favorite, true);
    assert.equal(storedCodex.title, 'Projet — construction');
    // Les trois silhouettes ont un mouvement de frappe distinct et continu.
    const motions = await page.evaluate(id => {
      const c = runtimes.get(id).companion, result = [];
      c.set('working');
      for (let i = 0; i < 3; i++) {
        c.setCharacter(i);
        const motion = c.element.getAnimations().find(a => ['companion-squish', 'companion-flutter', 'companion-tap'].includes(a.animationName));
        motion.pause(); motion.currentTime = 0; const first = getComputedStyle(c.element).transform;
        motion.currentTime = 320;
        result.push({ name: motion.animationName, moving: first !== getComputedStyle(c.element).transform });
        motion.play();
      }
      c.setCharacter(1); c.set('unknown'); return result;
    }, codexId);
    assert.deepEqual(motions.map(m => m.name), ['companion-squish', 'companion-flutter', 'companion-tap']);
    assert.ok(motions.every(m => m.moving));
    // Vérifier un vrai fondu navigateur, puis sa libération et la réduction des mouvements.
    const fade = await page.evaluate(async () => {
      const c = DeckCompanion.create('transition-test', 1); document.body.append(c.element);
      c.set('working'); c.set('blocked');
      const layer = c.element.querySelector('.companion-outgoing'), animation = layer.getAnimations()[0];
      animation.pause(); animation.currentTime = 140;
      const opacity = Number(getComputedStyle(layer).opacity);
      animation.finish(); await animation.finished; await Promise.resolve();
      const cleaned = !c.element.querySelector('.companion-outgoing');
      c.dispose(); c.element.remove(); return opacity > 0 && opacity < 1 && cleaned;
    });
    assert.equal(fade, true);
    // Les nouveaux sprites sont réellement décodés, les réactions ne simulent pas du travail.
    await page.evaluate(async () => {
      for (const name of ['greeting', 'yawning']) { const image = new Image(); image.src = new URL(`../assets/mascots/${name}-sheet.png`, location.href).href; await image.decode(); }
      const c = DeckCompanion.create('new-poses-test', 1); document.body.append(c.element); globalThis.poseFixture = c;
      c.set('idle'); if (!c.greet() || c.element.dataset.pose !== 'greeting') throw new Error('Salut absent');
      if (c.element.dataset.status !== 'idle') throw new Error('Le salut altère le statut');
    });
    await page.clock.fastForward(1600);
    assert.equal(await page.evaluate(() => poseFixture.element.dataset.pose), 'default');
    await page.evaluate(() => poseFixture.lookAt('left'));
    assert.equal(await page.evaluate(() => poseFixture.element.dataset.look), 'left');
    await page.evaluate(() => poseFixture.set('working'));
    assert.equal(await page.evaluate(() => poseFixture.greet()), false);
    await page.evaluate(() => poseFixture.set('idle'));
    await page.clock.fastForward(43200);
    assert.equal(await page.evaluate(() => poseFixture.element.dataset.pose), 'drowsy');
    await page.clock.fastForward(1800);
    assert.equal(await page.evaluate(() => poseFixture.element.dataset.sleeping), 'true');
    assert.equal(await page.evaluate(() => poseFixture.greet()), false);
    await page.evaluate(() => { poseFixture.set('working'); poseFixture.set('blocked'); poseFixture.dispose(); poseFixture.element.remove(); });
    await page.evaluate(() => {
      const preview = document.createElement('section'); preview.id = 'new-pose-preview';
      preview.style.cssText = 'position:fixed;left:300px;top:100px;width:760px;padding:30px;background:#09090c;border:1px solid #38313f;z-index:1000;pointer-events:none';
      const title = document.createElement('h2'); title.textContent = 'Les compagnons · nouvelles poses'; title.style.cssText = 'font:16px monospace;color:#d9d1e3;margin:0 0 24px'; preview.append(title);
      document.body.append(preview); globalThis.previewCompanions = [];
      for (const pose of ['greeting', 'drowsy']) {
        const heading = document.createElement('p'); heading.textContent = pose === 'greeting' ? 'Un petit salut' : 'Le bâillement avant le dodo'; heading.style.cssText = 'font:12px monospace;color:#a397b1'; preview.append(heading);
        const row = document.createElement('div'); row.style.cssText = 'display:flex;justify-content:space-around;align-items:end;height:116px;margin-bottom:24px'; preview.append(row);
        for (let i = 0; i < DeckPets.pets.length; i++) {
          const c = DeckCompanion.create('preview-' + pose + i, i); row.append(c.element); c.element.style.zoom = '3'; c.set('idle');
          if (pose === 'greeting') c.greet(); else c.syncVisual({ dataset: { sleeping: 'false', pose } });
          c.element.querySelector('.companion-outgoing')?.remove();
          c.element.getAnimations().forEach(a => { a.pause(); a.currentTime = 800; });
          previewCompanions.push(c);
        }
      }
    });
    await page.locator('#new-pose-preview').screenshot({ path: path.join(root, 'artifacts/new-companion-poses.png') });
    await page.evaluate(() => { previewCompanions.forEach(c => c.dispose()); document.querySelector('#new-pose-preview').remove(); });
    for (const character of [3, 4]) {
      const file = character === 3 ? 'fox-loaf-sheet-v3.png' : 'corbac-mini-sheet-v3.png';
      await page.evaluate(({ character, file }) => {
        const c = DeckCompanion.create('new-pet-' + character, character); globalThis.newPetFixture = c; document.body.append(c.element);
        c.set('working');
        if (!getComputedStyle(c.element).backgroundImage.includes(file) || getComputedStyle(c.element).backgroundSize !== '128px 192px') throw new Error('Mauvais atlas');
        if (c.element.style.getPropertyValue('--companion-row') !== '-32px') throw new Error('Rangée clavier incorrecte');
        c.set('blocked'); if (c.element.style.getPropertyValue('--pose-row') !== '-62px' || c.greet()) throw new Error('Attente incorrecte');
        c.set('idle'); if (!c.greet() || c.element.style.getPropertyValue('--greeting-row') !== '-92px') throw new Error('Salut absent');
      }, { character, file });
      await page.clock.fastForward(1600);
      await page.clock.fastForward(41600);
      assert.equal(await page.evaluate(() => newPetFixture.element.dataset.pose), 'drowsy');
      await page.clock.fastForward(1800);
      const sleeping = await page.evaluate(() => ({ sleeping: newPetFixture.element.dataset.sleeping, frame: getComputedStyle(newPetFixture.element).backgroundPosition }));
      assert.equal(sleeping.sleeping, 'true'); assert.equal(sleeping.frame, '-96px -122px');
      await page.evaluate(() => newPetFixture.set('working'));
      assert.equal(await page.evaluate(() => newPetFixture.element.dataset.pose), 'waking');
      await page.clock.fastForward(1200);
      assert.equal(await page.evaluate(() => newPetFixture.element.style.getPropertyValue('--companion-row')), '-32px');
      await page.evaluate(() => { newPetFixture.dispose(); newPetFixture.element.remove(); });
    }
    const selectedCharacter = await companion.getAttribute('data-mascot');
    await companion.evaluate(el => { el.dataset.mascot = '1'; });
    assert.equal(await companion.evaluate(el => getComputedStyle(el).clipPath), 'inset(2px 0px 0px)');
    await companion.evaluate((el, character) => { el.dataset.mascot = character; }, selectedCharacter);
    await page.locator('#usage-button').click();
    assert.equal(await page.locator('#usage-mascot').getAttribute('data-session-id'), codexId);
    assert.equal(await page.locator('#usage-mascot').getAttribute('data-mascot'), await companion.getAttribute('data-mascot'));
    const companionRect = await companion.boundingBox();
    assert.ok(companionRect.width >= 95);
    const paneRect = await page.locator(`.terminal-pane[data-session-id="${codexId}"]`).boundingBox();
    assert.ok(Math.abs(paneRect.x + paneRect.width - companionRect.x - companionRect.width - 37) < 2);
    const codexPane = page.locator(`.terminal-pane[data-session-id="${codexId}"]`);
    assert.equal(await codexPane.locator('.terminal-host').evaluate(el => getComputedStyle(el).paddingRight), '5px');
    assert.ok(companionRect.y > paneRect.y + paneRect.height / 2);
    assert.equal(await page.locator('#sidebar-companion').count(), 0);
    for (const status of ['working', 'blocked', 'done', 'idle']) {
      await page.evaluate(({ id, status }) => {
        const runtime = runtimes.get(id);
        runtime.term.write('\x1b]7501;state=' + status + ':app=codex\x1b\\');
      }, { id: codexId, status });
      await page.waitForFunction(status => document.querySelector('.terminal-pane .pane-companion')?.dataset.status === status, status);
      assert.equal(await page.locator('#usage-mascot .pane-companion').getAttribute('data-status'), status);
      if (status === 'blocked') {
        assert.equal(await companion.getAttribute('data-pose'), 'waiting');
        assert.equal(await companion.evaluate(el => getComputedStyle(el).animationName), 'companion-waiting, companion-listen');
      }
      if (status === 'blocked') {
        await page.locator('#attention-button:visible').waitFor();
        await page.locator('#usage-close').click();
        await page.locator('#attention-button').click();
        assert.equal(await page.locator('.library-row').count(), 1);
        await page.getByRole('button', { name: 'Ouvrir Projet — construction', exact: true }).click();
        assert.equal(await page.locator('#attention-button').isHidden(), true);
        await page.locator('#usage-button').click();
      }
      if (status === 'done') {
        await page.locator('#usage-close').click();
        await page.locator('#history-button').click();
        assert.equal(await page.locator('.library-row').count(), 1);
        assert.ok((await page.locator('#modal-body').textContent()).includes('Projet — construction'));
        await page.locator('#modal-close').click();
        await page.locator('#usage-button').click();
        assert.equal(await companion.evaluate(el => getComputedStyle(el).animationName), 'companion-finish, companion-breathe');
        const keepsMoving = await companion.evaluate(el => {
          const finish = el.getAnimations().find(a => a.animationName === 'companion-finish');
          const breathe = el.getAnimations().find(a => a.animationName === 'companion-breathe');
          finish.currentTime = 2000; breathe.currentTime = 1800;
          const first = getComputedStyle(el).transform;
          breathe.currentTime = 4300;
          return first !== getComputedStyle(el).transform;
        });
        assert.equal(keepsMoving, true);
        assert.equal(await companion.evaluate(el => getComputedStyle(el, '::before').animationName), 'companion-spark');
      }
      if (status === 'working') {
        assert.equal(await companion.evaluate(el => getComputedStyle(el).animationName), 'companion-type, companion-flutter');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await companion.evaluate(el => getComputedStyle(el).animationName), 'none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.screenshot({ path: path.join(root, 'artifacts/companion-working.png') });
      }
    }

    await page.clock.fastForward(45000);
    assert.equal(await companion.getAttribute('data-sleeping'), 'true');
    assert.equal(await page.locator('#usage-mascot .pane-companion').getAttribute('data-sleeping'), 'true');
    const smoothSleep = await companion.evaluate(el => {
      const breath = el.getAnimations().find(a => a.animationName === 'companion-rest');
      if (!breath) return false;
      breath.currentTime = 0;
      const first = getComputedStyle(el).transform, frame = getComputedStyle(el).backgroundPosition;
      breath.currentTime = 2750;
      return first !== getComputedStyle(el).transform && frame === getComputedStyle(el).backgroundPosition && !getComputedStyle(el).animationTimingFunction.includes('steps');
    });
    assert.equal(smoothSleep, true);
    await page.screenshot({ path: path.join(root, 'artifacts/companion-sleeping.png') });
    await page.evaluate(id => runtimes.get(id).term.write('\x1b]7501;state=working:app=codex\x1b\\'), codexId);
    await page.waitForFunction(() => document.querySelector('.terminal-pane .pane-companion')?.dataset.status === 'working');
    assert.equal(await companion.getAttribute('data-sleeping'), 'false');
    assert.equal(await companion.getAttribute('data-pose'), 'waking');
    assert.equal(await page.locator('#usage-mascot .pane-companion').getAttribute('data-pose'), 'waking');
    await page.clock.fastForward(1200);
    assert.equal(await companion.getAttribute('data-pose'), 'default');
    assert.equal(await companion.evaluate(el => getComputedStyle(el).animationName), 'companion-type, companion-flutter');
    // Une intervention arrivée pendant le réveil prend la priorité immédiatement.
    await page.evaluate(id => runtimes.get(id).term.write('\x1b]7501;state=idle:app=codex\x1b\\'), codexId);
    await page.waitForFunction(() => document.querySelector('.terminal-pane .pane-companion')?.dataset.status === 'idle');
    await page.clock.fastForward(45000);
    await page.evaluate(id => runtimes.get(id).term.write('\x1b]7501;state=working:app=codex\x1b\\'), codexId);
    await page.waitForFunction(() => document.querySelector('.terminal-pane .pane-companion')?.dataset.pose === 'waking');
    await page.evaluate(id => runtimes.get(id).term.write('\x1b]7501;state=blocked:app=codex\x1b\\'), codexId);
    await page.waitForFunction(() => document.querySelector('.terminal-pane .pane-companion')?.dataset.pose === 'waiting');
    await page.clock.fastForward(1500);
    assert.equal(await companion.getAttribute('data-pose'), 'waiting');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await companion.evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(async () => {
      for (const name of ['curious', 'waiting', 'waking']) {
        const image = new Image(); image.src = new URL(`../assets/mascots/${name}-sheet.png`, location.href).href;
        await image.decode();
        if (image.naturalWidth !== (name === 'curious' ? 1449 : 1448) || image.naturalHeight !== 1086) throw new Error('Planche manquante ou dimensions inattendues');
      }
    });
    await page.evaluate(id => runtimes.get(id).term.write('\x1b]7501;state=idle:app=codex\x1b\\'), codexId);
    await page.evaluate(() => addSession('codex'));
    const anotherCodex = await page.evaluate(() => activeProject().active);
    await output(page, anotherCodex, 'FIXTURE_CODEX_TTY:yes');
    assert.equal(await page.locator('.terminal-pane .pane-companion').count(), 2);
    assert.equal(await companion.getAttribute('data-status'), 'idle');
    assert.equal(await page.locator(`.terminal-pane[data-session-id="${anotherCodex}"] .pane-companion`).getAttribute('data-status'), 'unknown');
    assert.equal(await page.locator('#usage-mascot').getAttribute('data-session-id'), anotherCodex);
    await page.evaluate(id => select(id), codexId);
    assert.equal(await page.locator('#usage-mascot').getAttribute('data-session-id'), codexId);
    assert.equal(await page.locator('#usage-mascot').getAttribute('data-mascot'), await page.locator(`.terminal-pane[data-session-id="${codexId}"] .pane-companion`).getAttribute('data-mascot'));
    // Même identité native dans deux panneaux : choix partagés malgré le renommage.
    const threadId = '11111111-1111-4111-8111-111111111111';
    const titleFor = async (id, title) => page.evaluate(({ id, title }) => new Promise(resolve => runtimes.get(id).term.write('\x1b]2;' + title + '\x07', resolve)), { id, title });
    await titleFor(codexId, threadId + ' | Projet — construction');
    await titleFor(anotherCodex, threadId.slice(0, 29) + '... | Conversation renommée');
    assert.equal(await page.evaluate(id => sessionById(id).favorite, anotherCodex), true);
    for (const [character, name] of [[3, 'Fox Loaf'], [4, 'Corbac mini']]) {
      await page.locator('#usage-close').click();
      await page.evaluate(id => select(id), id);
      await page.getByRole('button', { name: 'Compagnons', exact: true }).click();
      if (character === 3) { assert.equal(await page.locator('.pet-choice').count(), 5); await page.screenshot({ path: path.join(root, 'artifacts/five-companion-choices.png') }); }
      await page.getByRole('button', { name: 'Choisir ' + name, exact: true }).click();
      await page.locator('#usage-button').click();
      await page.waitForFunction(({ id, character }) => runtimes.get(id).companion.element.dataset.mascot === String(character), { id: codexId, character });
      assert.equal(await page.locator(`.terminal-pane[data-session-id="${anotherCodex}"] .pane-companion`).getAttribute('data-mascot'), String(character));
      assert.equal(await page.locator('#usage-mascot').getAttribute('data-mascot'), String(character));
      await page.evaluate(() => save(true));
      const saved = JSON.parse(fs.readFileSync(path.join(profile, 'workspace.json'), 'utf8'));
      assert.equal(saved.conversations.find(c => c.key === threadId.slice(0, 29)).companion, character);
      const newPetPin = page.locator(`.terminal-pane[data-session-id="${codexId}"] .companion-pin`);
      await newPetPin.click();
      assert.equal(await newPetPin.getAttribute('aria-pressed'), 'true');
      assert.equal(await newPetPin.locator('.pane-companion').getAttribute('data-mascot'), String(character));
      await page.screenshot({ path: path.join(root, 'artifacts/' + (character === 3 ? 'fox-loaf' : 'corbac-mini') + '-screensaver.png') });
      await newPetPin.press('Escape');
      assert.equal(await newPetPin.getAttribute('aria-pressed'), 'false');
    }
    await page.locator(`.terminal-pane[data-session-id="${anotherCodex}"] .choose-companion`).click();
    await page.getByRole('button', { name: 'Choisir Byte', exact: true }).click();
    await page.waitForFunction(id => runtimes.get(id).companion.element.dataset.mascot === '2', codexId);
    await titleFor(anotherCodex, '22222222-2222-4222-8222-222222222222 | Conversation renommée');
    assert.equal(await page.evaluate(id => sessionById(id).favorite, anotherCodex), false);
    await page.waitForFunction(id => runtimes.get(id).companion.element.dataset.mascot === '2', codexId);
    await titleFor(anotherCodex, threadId + ' | Conversation renommée');
    assert.equal(await page.evaluate(id => sessionById(id).favorite, anotherCodex), true);
    assert.equal(await page.locator(`.terminal-pane[data-session-id="${anotherCodex}"] .pane-companion`).getAttribute('data-mascot'), '2');
    await page.locator(`.terminal-pane[data-session-id="${anotherCodex}"] .choose-companion`).click();
    await page.getByRole('button', { name: 'Choisir Vesper', exact: true }).click();
    assert.equal(await companion.getAttribute('data-mascot'), '1');
    await titleFor(codexId, threadId + ' | Projet — construction');
    // Les actions restent accessibles quand la mosaïque réduit les panneaux.
    await page.setViewportSize({ width: 920, height: 620 });
    const compactPane = page.locator(`.terminal-pane[data-session-id="${codexId}"]`);
    await compactPane.locator('.pane-more:visible').waitFor();
    assert.equal(await compactPane.locator('.pane-header').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await compactPane.locator('.pane-more').click();
    await page.getByRole('button', { name: 'Choisir le compagnon', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal').isVisible(), false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(id => openSearch(id), codexId);
    const field = compactPane.locator('.search-bar input'); await field.fill('Recherche conservée');
    await page.locator(`.terminal-pane[data-session-id="${anotherCodex}"] .terminal-host`).hover();
    assert.equal(await field.evaluate(el => el === document.activeElement), true);
    await field.press('Escape');
    await page.evaluate(id => closeSession(id), anotherCodex);
    await page.evaluate(id => select(id), codexId);
    await page.locator('#usage-close').click();
    await page.locator('.terminal-pane').last().locator('.terminal-host').hover();
    await page.locator('#active-title').filter({ hasText: 'Projet — construction' }).waitFor();
    await page.screenshot({ path: path.join(root, 'artifacts/fixed-companions.png') });
    const petButton = page.locator(`.terminal-pane[data-session-id="${codexId}"] .companion-pin`);
    await petButton.hover();
    await page.waitForFunction(id => document.querySelector(`.terminal-pane[data-session-id="${id}"] .pane-companion`).getBoundingClientRect().width >= 127, codexId);
    await petButton.click();
    assert.equal(await petButton.getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(id => document.querySelector(`.terminal-pane[data-session-id="${id}"] .pane-companion`).getBoundingClientRect().width >= 300, codexId);
    await page.clock.fastForward(250);
    const overlayRect = await petButton.boundingBox();
    const chatRect = await page.locator(`.terminal-pane[data-session-id="${codexId}"]`).boundingBox();
    assert.ok(Math.abs(overlayRect.width - (chatRect.width - 2)) < 2);
    assert.ok(Math.abs(overlayRect.height - (chatRect.height - 38)) < 2);
    assert.equal(await petButton.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(5, 5, 7, 0.8)');
    assert.equal(await page.locator('.companion-pin.expanded').count(), 1);
    await page.screenshot({ path: path.join(root, 'artifacts/companion-screensaver.png') });
    await petButton.click();
    assert.equal(await petButton.getAttribute('aria-pressed'), 'false');
    await petButton.press('Enter');
    assert.equal(await petButton.getAttribute('aria-pressed'), 'true');
    await petButton.press('Escape');
    assert.equal(await petButton.getAttribute('aria-pressed'), 'false');
    await page.evaluate(() => save(true));
    const historyCount = await page.evaluate(() => state.history.length);
    await page.reload();
    await page.locator(`.terminal-pane[data-session-id="${codexId}"] .pane-state.live`).waitFor();
    assert.equal(await companion.getAttribute('data-mascot'), '1');
    assert.equal(await page.evaluate(() => state.history.length), historyCount);
    assert.equal(await page.evaluate(id => sessionById(id).favorite, codexId), true);
    assert.equal(await page.locator('#attention-button').isHidden(), true);
    assert.equal(await page.locator('.terminal-pane').last().locator('.pane-name').textContent(), 'Projet — construction');
    await page.locator('.terminal-pane').last().locator('.xterm-helper-textarea').focus();
    await page.keyboard.type('first'); await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('second'); await page.keyboard.press('Control+Backspace');
    await page.evaluate(id => {
      window.pasteCompleted = new Promise(resolve => {
        const listener = runtimes.get(id).term.onData(data => { if (data.includes('pasted text')) { listener.dispose(); resolve(); } });
      });
    }, codexId);
    await page.keyboard.press('Control+Shift+V');
    await page.evaluate(() => Promise.race([window.pasteCompleted, new Promise((_, reject) => setTimeout(() => reject(new Error('Collage non reçu par le terminal ciblé')), 5000))]));
    await page.keyboard.press('Enter');
    const raw = 'first\x1b[13;2usecond\x1b\x7f\x1b[200~pasted text\x1b[201~';
    await output(page, codexId, 'KEYS:' + Buffer.from(raw).toString('hex'));
    await page.locator('#active-title').filter({ hasText: 'Projet — vérifications' }).waitFor();
    await command(page, 'Agrandir le panneau actif');
    await page.locator('.session-tab').filter({ hasText: 'Projet — vérifications' }).waitFor();
    await command(page, 'Agrandir le panneau actif');
    await page.locator('.terminal-pane').last().locator('.xterm-helper-textarea').focus();
    await page.keyboard.type('exit'); await page.keyboard.press('Enter');
    await page.locator('.terminal-pane').last().locator('.pane-state').filter({ hasText: 'TERMINÉ' }).waitFor();
    await page.locator('.terminal-pane').last().locator('button.close').click();
    assert.equal(await page.locator('.terminal-pane').count(), 2);
    // Le favori reste disponible après fermeture et se reprend par UUID explicite.
    await page.locator('#sessions-button').click();
    await page.getByRole('textbox', { name: 'Rechercher une session' }).fill('Projet — construction');
    await page.getByRole('button', { name: 'Favoris', exact: true }).click();
    assert.equal(await page.locator('.library-row').count(), 1);
    await page.getByRole('button', { name: 'Ouvrir Projet — construction', exact: true }).click();
    const resumedId = await page.locator('.terminal-pane').last().getAttribute('data-session-id');
    await output(page, resumedId, 'FIXTURE_CODEX_TTY:yes');
    assert.equal(await page.evaluate(id => sessionById(id).favorite, resumedId), true);
    assert.equal(await page.locator(`.terminal-pane[data-session-id="${resumedId}"] .pane-companion`).getAttribute('data-mascot'), '1');
    await page.evaluate(id => closeSession(id), resumedId);
    // Les deux shells sont conservés après fermeture directe du Codex fictif.
    assert.equal(await page.locator('.pane-state.live').count(), 2);
    await page.evaluate(async id => { await deck.write({ id, data: "yes x | head -c 1048576; printf '\\nFLOOD_DONE\\n'\r" }); }, second);
    await output(page, second, 'FLOOD_DONE');
    await page.evaluate(() => save(true));
    // Recharger l’interface conserve les processus et réattache les terminaux.
    await page.reload();
    await page.locator('.pane-state.live').nth(1).waitFor();
    await page.evaluate(async id => { await deck.write({ id, data: "printf '\\nUI_RELOAD_OK\\n'\r" }); }, id);
    await output(page, id, 'UI_RELOAD_OK');
    // Le canal IPC refuse une saisie hors format.
    const invalid = await page.evaluate(async id => { try { await deck.write({ id, data: 123 }); return false; } catch { return true; } }, id); assert.equal(invalid, true);
    await close();
    page = await launch();
    await page.locator('.terminal-pane').nth(1).waitFor();
    assert.equal(await page.locator('.pane-state.live').count(), 0);
    assert.equal(await page.locator('.paused:visible').count(), 2);
    assert.equal(await page.locator('body').getAttribute('data-theme'), 'graphite');
    assert.equal(await page.locator('.project').count(), 2);
    await page.locator('.paused .primary').first().click(); await page.locator('.pane-state.live').waitFor();
    await page.evaluate(async id => { await deck.write({ id, data: "printf '\\nRELAUNCH_OK\\n'\r" }); }, id); await output(page, id, 'RELAUNCH_OK');
    const persisted = fs.readFileSync(path.join(profile, 'workspace.json'), 'utf8');
    assert.equal(persisted.includes('PASTE_OK'), false);
    assert.equal(persisted.includes('KEYS:'), false);
    assert.equal(JSON.parse(persisted).history.length, 1);
    assert.deepEqual(errors, []);
    // Une fermeture normale de la fenêtre, avec un shell actif, ne pose aucune question.
    await app.evaluate(({ dialog }) => { dialog.showMessageBoxSync = () => { throw new Error('Confirmation inattendue'); }; });
    const closed = app.waitForEvent('close', { timeout: 10000 });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close()).catch(error => { if (!/closed|Target/.test(error.message)) throw error; });
    await closed; app = null;
    console.log('UI et vrais PTY : raccourcis, titres, fermeture directe, Ctrl Q ciblé par survol, Ctrl T sans arrêt du processus, restauration et fermeture de fenêtre sans confirmation validés.');
  } catch (error) {
    if (app) {
      const page = await app.firstWindow();
      console.error('État de test :', await page.evaluate(() => ({ toast: document.querySelector('#toast').textContent, conversations: state.conversations, runtimes: [...runtimes].map(([id, r]) => ({ id, running: r.running, starting: r.starting, label: r.stateLabel.textContent, attached: r.pane.isConnected, character: r.companion?.element.dataset.mascot, thread: r.conversationKey, sessionThread: sessionById(id)?.threadKey })) })));
      fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'artifacts/failure.png') });
    }
    throw error;
  } finally {
    if (app) await close();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
