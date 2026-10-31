const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
for (const folder of ['src', 'scripts', 'test', 'tools/sprite-studio']) {
  for (const file of fs.readdirSync(path.join(__dirname, '..', folder))) {
    if (/\.(c?js)$/.test(file)) execFileSync(process.execPath, ['--check', path.join(__dirname, '..', folder, file)], { stdio: 'inherit' });
  }
}
console.log('Syntaxe JavaScript vérifiée.');
