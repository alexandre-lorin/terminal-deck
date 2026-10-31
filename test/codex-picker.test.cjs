const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspect } = require('../src/codex-picker.js');

function terminal(header, selection, focused = true, text = ' Filter:  Cwd  All   Status: Active') {
  const line = { translateToString: () => text, getCell: index => ({ isBold: () => index === text.indexOf(selection), isUnderline: () => focused }) };
  return { rows: 8, buffer: { active: { baseY: 0, getLine: i => i === 0 ? { translateToString: () => header } : i === 2 ? line : null } } };
}
test('identifier le filtre natif sans agir sur un autre écran ni sur la recherche', () => {
  assert.equal(inspect(terminal('Resume a previous session', 'Cwd')), 'cwd');
  assert.equal(inspect(terminal('Resume a previous session', 'All')), 'all');
  assert.equal(inspect(terminal('Resume a previous session', 'Cwd', false)), 'unfocused');
  assert.equal(inspect(terminal('OpenAI Codex', 'Cwd')), null);
});


test('le sélecteur compact affiche uniquement le filtre courant', () => {
  assert.equal(inspect(terminal('Resume a previous session', 'All', false, ' Filter: All   Active  Sort: Updated ')), 'all');
  assert.equal(inspect(terminal('Resume a previous session', 'Cwd', true, ' Filter: Cwd   Active  Sort: Updated ')), 'cwd');
  assert.equal(inspect(terminal('Resume a previous session', 'Cwd', false, ' Filter: Cwd   Active  Sort: Updated ')), 'unfocused');
  assert.equal(inspect(terminal('OpenAI Codex', 'All', true, ' Filter: All   Active  Sort: Updated ')), null);
});
