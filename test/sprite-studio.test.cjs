const test = require('node:test');
const assert = require('node:assert/strict');
const { defaults, packs, characters, source, manifest, parseManifest } = require('../tools/sprite-studio/model.js');
const { startStudio } = require('../tools/sprite-studio/server.cjs');
test('les cadrages restent dans les sources et les réglages exportés se rechargent', () => {
  for (const pack of packs) for (let character = 0; character < characters.length; character++) {
    const resolved = source(pack, character);
    const frames = defaults(pack, character);
    for (const frame of frames) { assert.ok(frame.x >= 0 && frame.y >= 0); assert.ok(frame.x + frame.w <= resolved.width); assert.ok(frame.y + frame.h <= resolved.height); }
    const settings = manifest(pack, character, frames, 96);
    assert.deepEqual(parseManifest(JSON.parse(JSON.stringify(settings))), settings);
  }
  assert.throws(() => parseManifest({ version: 1, source: { width: 90000, height: 1 }, frames: [{}] }));
  const checked = parseManifest({ version: 1, source: { file: '../../image.png', width: 100, height: 100 }, frames: [{ x: -10, y: 90, w: 200, h: 500, trimTop: 500, trimLeft: 500 }] });
  assert.equal(checked.source.file, 'image.png'); assert.equal(checked.frames[0].x, 0); assert.equal(checked.frames[0].h, 10); assert.equal(checked.frames[0].trimTop, 9); assert.equal(checked.frames[0].trimLeft, 99);
});
test('le serveur local sert uniquement l’atelier et les planches connues', async () => {
  const studio = await startStudio({ port: 0 });
  try {
    const page = await fetch(studio.url); assert.equal(page.status, 200); assert.ok((await page.text()).includes('L’atelier des compagnons'));
    assert.ok(page.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    assert.equal((await fetch(studio.url + 'assets/curious-sheet.png')).headers.get('content-type'), 'image/png');
    for (const route of ['package.json', 'src/main.cjs', 'assets/%2e%2e%2f%2e%2e%2fAGENTS.md', 'draft']) assert.equal((await fetch(studio.url + route)).status, 404);
    assert.equal((await fetch(studio.url, { method: 'POST', body: 'test' })).status, 405);
  } finally { await studio.close(); }
});
