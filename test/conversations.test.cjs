const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/conversations.js');
const { codexArgs } = require('../src/codex-launch.cjs');
const id = '01a16faf-44f1-7be3-8ae5-9f0569002e9e';
test('le titre natif sépare identité abrégée, UUID complet et nom visible', () => {
  const key = id.slice(0, 29);
  assert.deepEqual(C.parse(`${key}... | ${id}`), { key, fullId: id, title: '' });
  assert.deepEqual(C.parse(`${key}... | Mon chat | Suite`), { key, fullId: null, title: 'Mon chat | Suite' });
  assert.deepEqual(C.parse(`${id} | Renommé`), { key, fullId: id, title: 'Renommé' });
  assert.equal(C.parse('Un titre seul'), null);
  assert.equal(C.parse('01a16faf... | Chat'), null);
  assert.equal(C.parse(`${key}... | 11111111-1111-4111-8111-111111111111`), null);
});
test('les préférences de conversation excluent le contenu et restent bornées', () => {
  const key = id.slice(0, 29);
  const raw = { key, fullId: id, title: 'Chat\x1b', companion: 1, favorite: true, lastOpened: 123, transcript: 'secret' };
  const result = C.sanitize([raw, raw, { key: '../x' }]);
  assert.equal(result.length, 1); assert.equal(result[0].title, 'Chat');
  assert.equal(result[0].companion, 1); assert.equal(result[0].favorite, true);
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.deepEqual(C.sanitize(result), result);
  assert.equal(C.sanitize([{ ...raw, companion: 99, fullId: 'bad' }])[0].companion, null);
  assert.equal(C.sanitize([{ ...raw, companion: 99, fullId: 'bad' }])[0].fullId, null);
});
test('la reprise explicite utilise un UUID validé et le démarrage ordinaire reste un sélecteur', () => {
  const env = { CODEX_HOME: '/tmp/terminal-deck-nonexistent-home' };
  assert.ok(codexArgs(env).includes('--all'));
  const args = codexArgs(env, id); assert.equal(args[1], id); assert.equal(args.includes('--all'), false);
  assert.throws(() => codexArgs(env, '--dangerous'));
  assert.throws(() => codexArgs(env, id.slice(0, 29) + '...'));
});
