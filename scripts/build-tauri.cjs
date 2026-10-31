const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'dist-tauri');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const folder of ['src', 'assets', 'tools/sprite-studio']) {
  const destination = path.join(out, folder);
  fs.mkdirSync(destination, { recursive: true });
  for (const name of fs.readdirSync(path.join(root, folder))) {
    if (!/\.(js|css|html|png|svg)$/.test(name)) continue;
    fs.copyFileSync(path.join(root, folder, name), path.join(destination, name));
  }
}
const model = require('../tools/sprite-studio/model.js');
fs.mkdirSync(path.join(out, 'assets/mascots'), { recursive: true });
for (const file of new Set([...model.packs, ...model.atlases].map(p => p.file))) fs.copyFileSync(path.join(root, 'assets/mascots', file), path.join(out, 'assets/mascots', file));
for (const folder of ['xterm', 'addon-fit', 'addon-search']) fs.cpSync(path.join(root, 'node_modules/@xterm', folder), path.join(out, 'vendor/@xterm', folder), { recursive: true });
let html = fs.readFileSync(path.join(out, 'src/index.html'), 'utf8');
html = html.replaceAll('../node_modules/@xterm/', '../vendor/@xterm/').replace(/  <meta http-equiv="Content-Security-Policy"[^>]+>\n/, '').replace('  <script src="layout.js">', '  <script src="tauri-bridge.js"></script>\n  <script src="layout.js">');
fs.writeFileSync(path.join(out, 'src/index.html'), html);
const studio = path.join(out, 'tools/sprite-studio/index.html');
fs.writeFileSync(studio, fs.readFileSync(studio, 'utf8').replace('pet-catalog.js', '../../src/pets.js').replace('href="/"', 'href="index.html"').replaceAll('/assets/', '../../assets/'));
console.log('Interface Tauri préparée.');

const studioJs = path.join(out, 'tools/sprite-studio/studio.js');
fs.writeFileSync(studioJs, fs.readFileSync(studioJs, 'utf8').replace("'/assets/'", "'../../assets/mascots/'"));
