const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../src/companion.js');
test('le compagnon accepte uniquement les états OSC explicites de Codex', () => {
  for (const status of ['idle','working','blocked','done','error']) assert.equal(parse(`state=${status}:app=codex`), status);
  assert.equal(parse('state=blocked:app=codex:kind=permission'), 'blocked');
  assert.equal(parse('state=clear'), 'unknown');
  for (const value of ['Working', 'state=working', 'state=working:app=shell', 'state=busy:app=codex', 'x'.repeat(200)]) assert.equal(parse(value), null);
});

test('les nouveaux compagnons élargissent le catalogue sans changer les anciens indices', () => {
  const pets = require('../src/pets.js');
  const state = require('../src/state.cjs');
  const conversations = require('../src/conversations.js');
  assert.deepEqual(pets.pets.map(p => p.id), ['blob', 'vesper', 'byte', 'fox-loaf', 'corbac-mini']);
  for (const id of [0, 1, 2, 3, 4]) assert.equal(pets.valid(id), true);
  for (const id of [-1, 5, 1.5, '3', null]) assert.equal(pets.valid(id), false);
  for (const id of [3, 4]) {
    assert.equal(state.sessionMeta({ companion: id }).companion, id);
    const raw = { key: '11111111-1111-4111-8111-11111', companion: id, favorite: true };
    assert.equal(conversations.sanitize([raw])[0].companion, id);
  }
  assert.equal(state.sessionMeta({ companion: 5 }).companion, null);
  for (const key of ['abc', 'session-123', 'conversation-a']) assert.equal(pets.defaultCharacter(key), [...key].reduce((n, c) => n + c.charCodeAt(0), 0) % 3);
});
