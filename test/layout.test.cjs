const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/layout.js');

test('diviser, rééquilibrer puis fermer conserve chaque autre terminal une seule fois', () => {
  let tree = L.leaf('a');
  tree = L.split(tree, 'a', 'b', 'row');
  tree = L.split(tree, 'b', 'c', 'column');
  assert.deepEqual(L.ids(tree), ['a', 'b', 'c']);
  assert.equal(tree.b.axis, 'column');
  tree = L.remove(tree, 'b');
  assert.deepEqual(L.ids(tree), ['a', 'c']);
  for (let count = 1; count <= 16; count++) {
    const ids = Array.from({ length: count }, (_, i) => String(i));
    assert.deepEqual(L.ids(L.grid(ids)), ids);
  }
  assert.equal(L.remove(L.leaf('a'), 'a'), null);
});

test('une disposition corrompue ne restaure ni doublon, ni panneau inconnu, ni ratio hors limites', () => {
  const tree = { type: 'split', ratio: 4, axis: 'invalid', a: L.leaf('a'), b: { type: 'split', a: L.leaf('a'), b: L.leaf('b') } };
  const clean = L.sanitize(tree, new Set(['a', 'b']));
  assert.deepEqual(L.ids(clean), ['a', 'b']);
  assert.equal(clean.ratio, .85); assert.equal(clean.axis, 'row');
  assert.equal(L.sanitize(L.leaf('unknown'), new Set(['a'])), null);
});

test('déplacer ou échanger un panneau préserve chaque session, les ratios et les panneaux réduits', () => {
  const tree = { type: 'split', axis: 'row', ratio: .35, a: L.leaf('a'), b: L.grid(['b', 'c', 'minimized'], 'column') };
  const original = JSON.stringify(tree);
  const swapped = L.move(tree, 'a', 'c');
  assert.deepEqual(L.ids(swapped), ['c', 'b', 'a', 'minimized']); assert.equal(swapped.ratio, .35);
  for (const side of ['left', 'right', 'top', 'bottom']) {
    const moved = L.move(tree, 'a', 'c', side);
    assert.deepEqual([...L.ids(moved)].sort(), ['a', 'b', 'c', 'minimized']);
    const find = node => node.type === 'split' && [node.a, node.b].every(n => n.type === 'leaf') && L.ids(node).includes('a') ? node : node.type === 'split' ? find(node.a) || find(node.b) : null;
    const pair = find(moved); assert.ok(pair);
    assert.equal(pair.axis, ['left', 'right'].includes(side) ? 'row' : 'column');
    assert.deepEqual(L.ids(pair), ['left', 'top'].includes(side) ? ['a', 'c'] : ['c', 'a']);
  }
  assert.equal(JSON.stringify(tree), original);
  assert.equal(L.move(tree, 'a', 'a'), tree); assert.equal(L.move(tree, 'missing', 'c'), tree);
  assert.equal(L.move(tree, 'a', 'c', 'invalid'), tree);
});
