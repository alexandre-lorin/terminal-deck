const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
const launcher = path.join(os.homedir(), '.local/bin/terminal-deck');
const desktop = path.join(os.homedir(), '.local/share/applications/terminal-deck.desktop');
const script = '#!/bin/sh\nexec ' + quote(path.join(root, 'node_modules/.bin/electron')) + ' ' + quote(root) + ' "$@"\n';
const entry = '[Desktop Entry]\nType=Application\nName=Terminal Deck\nComment=Projets, Codex et terminaux locaux\nExec="' + launcher + '"\nIcon=' + path.join(root, 'assets/icon.svg') + '\nTerminal=false\nCategories=Development;TerminalEmulator;\nStartupWMClass=terminal-deck\n';
for (const [file, content, mode] of [[launcher, script, 0o755], [desktop, entry, 0o644]]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') !== content) throw new Error('Un lanceur différent existe déjà : ' + file);
  fs.writeFileSync(file, content, { mode });
}
console.log('Lanceur installé : terminal-deck');
