const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const store = require('../src/state.cjs');
const L = require('../src/layout.js');

test('restauration des descripteurs sans persister de sortie ni de commande', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-deck-state-'));
  try {
    const p = store.project('/tmp');
    p.sessions = [{ id: 's1', kind: 'shell', name: 'Vérifications', data: 'sortie à ne pas conserver', command: 'commande non autorisée' }, { id: 's2', kind: 'codex', name: 'Construction' }];
    p.tree = L.leaf('s1'); p.active = 's2';
    const state = store.cleanState({ projects: [p], activeProject: p.id, settings: { fontSize: 99, theme: 'cendre' } }, '/tmp');
    assert.deepEqual(L.ids(state.projects[0].tree), ['s1', 's2']);
    assert.equal(state.settings.fontSize, 22);
    assert.equal(state.projects[0].sessions[0].data, undefined);
    assert.equal(state.projects[0].sessions[0].command, undefined);
    const file = path.join(directory, 'workspace.json'); store.save(file, state);
    assert.deepEqual(store.load(file, '/tmp'), state);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    fs.writeFileSync(file, '{broken');
    assert.equal(store.load(file, '/tmp').projects.length, 1);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('les projets et identifiants dupliqués sont écartés', () => {
  const p = { id: 'p', path: '/tmp', sessions: [{ id: 'a', kind: 'codex' }, { id: 'a', kind: 'shell' }] };
  const result = store.cleanState({ projects: [p, p, { path: 'relative' }] }, '/tmp');
  assert.equal(result.projects.length, 1); assert.equal(result.projects[0].sessions.length, 1);
});

test('les panneaux réduits sont restaurés sans devenir le panneau actif', () => {
  const state = store.cleanState({ projects: [{ id: 'p', path: '/tmp', active: 'a', sessions: [{ id: 'a', minimized: true }, { id: 'b' }] }] }, '/tmp');
  assert.equal(state.projects[0].sessions[0].minimized, true);
  assert.equal(state.projects[0].active, 'b');
  state.projects[0].sessions[1].minimized = true;
  assert.equal(store.cleanState(state, '/tmp').projects[0].active, null);
});


test('les favoris, compagnons et fins de tour sont bornés et restaurés sans contenu', () => {
  const p = { id: 'p', path: '/tmp', sessions: [{ id: 'a', kind: 'codex', favorite: true, companion: 2, lastOpened: 123, title: 'Projet\x1b', transcript: 'confidentiel' }, { id: 'b', companion: 9 }] };
  const raw = { projects: [p], history: Array.from({ length: 100 }, () => ({ sessionId: 'a', title: 'Tour', at: 456, output: 'confidentiel' })) };
  const cleaned = store.cleanState(raw, '/tmp');
  assert.equal(cleaned.projects[0].sessions[0].favorite, true);
  assert.equal(cleaned.projects[0].sessions[0].companion, 2);
  assert.equal(cleaned.projects[0].sessions[0].title, 'Projet');
  assert.equal(cleaned.projects[0].sessions[1].companion, null);
  assert.equal(cleaned.history.length, 80);
  assert.equal(JSON.stringify(cleaned).includes('confidentiel'), false);
  assert.deepEqual(store.cleanState(cleaned, '/tmp'), cleaned);
  assert.deepEqual(store.cleanHistory([{ sessionId: '../x', at: 4 }, { sessionId: 'a', at: '5' }]), []);
});
