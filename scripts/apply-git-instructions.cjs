const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--target')) throw new Error('Usage : --target /chemin/AGENTS.md');
const target = args.length ? path.resolve(args[1]) : path.join(os.homedir(), '.codex/AGENTS.md');
const start = '<!-- toubi-git-projects:start -->', end = '<!-- toubi-git-projects:end -->';
const block = fs.readFileSync(path.join(__dirname, '../docs/GIT-PROJETS.md'), 'utf8').trim();
const exists = fs.existsSync(target), before = exists ? fs.readFileSync(target, 'utf8') : '';
const a = before.indexOf(start), b = before.indexOf(end);
if ((a < 0) !== (b < 0) || (a >= 0 && b < a)) throw new Error('Bloc Git incomplet, aucun changement.');
const after = a >= 0 ? before.slice(0, a) + block + before.slice(b + end.length) : before.trimEnd() + '\n\n' + block + '\n';
if (before === after) { console.log('Instructions Git déjà présentes.'); process.exit(0); }
fs.mkdirSync(path.dirname(target), { recursive: true });
if (exists) fs.writeFileSync(target + '.backup-' + randomUUID(), before, { flag: 'wx', mode: 0o600 });
const tmp = target + '.tmp-' + randomUUID();
try { fs.writeFileSync(tmp, after, { flag: 'wx', mode: 0o600 }); fs.renameSync(tmp, target); }
finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
console.log('Instructions Git ajoutées : ' + target);
