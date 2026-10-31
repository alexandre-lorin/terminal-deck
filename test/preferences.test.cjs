const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('appliquer les préférences conserve les instructions et reste idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'td-preferences-'));
  try {
    const target = path.join(root, 'AGENTS.md'), original = '# Instructions existantes\n\nNe jamais créer de commit.\n';
    fs.writeFileSync(target, original);
    const args = [path.join(__dirname, '../scripts/apply-preferences.cjs'), '--target', target];
    execFileSync(process.execPath, args);
    const after = fs.readFileSync(target, 'utf8');
    assert.ok(after.startsWith(original.trimEnd()));
    assert.ok(after.includes('Goût, interface et expérience'));
    const backups = fs.readdirSync(root).filter(name => name.includes('.backup-'));
    assert.equal(backups.length, 1); assert.equal(fs.readFileSync(path.join(root, backups[0]), 'utf8'), original);
    execFileSync(process.execPath, args);
    assert.equal(fs.readFileSync(target, 'utf8'), after);
    assert.equal(fs.readdirSync(root).filter(name => name.includes('.backup-')).length, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
