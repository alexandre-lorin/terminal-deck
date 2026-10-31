const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');

const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--target')) throw new Error('Usage : node scripts/apply-preferences.cjs [--target /chemin/AGENTS.md]');
const target = args.length ? path.resolve(args[1]) : path.join(os.homedir(), '.codex', 'AGENTS.md');
const start = '<!-- toubi-interface-preferences:start -->', end = '<!-- toubi-interface-preferences:end -->';
const block = fs.readFileSync(path.join(__dirname, '../docs/PREFERENCES-TOUBI.md'), 'utf8').trim();
const exists = fs.existsSync(target), before = exists ? fs.readFileSync(target, 'utf8') : '';
const a = before.indexOf(start), b = before.indexOf(end);
if ((a < 0) !== (b < 0) || (a >= 0 && b < a)) throw new Error('Bloc de préférences incomplet : aucun changement effectué.');
const after = a >= 0 ? before.slice(0, a) + block + before.slice(b + end.length) : before.trimEnd() + (before.trim() ? '\n\n' : '') + block + '\n';
if (before === after) { console.log('Préférences déjà à jour.'); process.exit(0); }
fs.mkdirSync(path.dirname(target), { recursive: true });
if (exists) {
  const backup = target + '.backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  fs.writeFileSync(backup, before, { mode: 0o600, flag: 'wx' });
  console.log('Sauvegarde : ' + backup);
}
const temporary = target + '.tmp-' + randomUUID();
try {
  fs.writeFileSync(temporary, after, { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, target);
} finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
console.log('Préférences appliquées : ' + target);
