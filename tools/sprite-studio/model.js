(function (root) {
  'use strict';
  const catalog = typeof module === 'object' && module.exports ? require('../../src/pets.js') : root.DeckPets;
  const characters = catalog.pets.map(p => p.name);
  const atlases = catalog.pets.filter(p => p.file);
  const packs = [
    { id: 'original', name: 'Repos', file: 'trio.png', width: 2172, height: 724, frames: 1, duration: 1000, columns: 3 },
    { id: 'curious', name: 'Curiosité', file: 'curious-sheet.png', width: 1449, height: 1086, frames: 4, duration: 1400, rows: [2, 32, 64], trim: [0, 2, 0] },
    { id: 'working', name: 'Au clavier', file: 'working-sheet.png', width: 1254, height: 1254, frames: 4, duration: 200, rows: [15, 51, 87] },
    { id: 'waiting', name: 'À l’écoute', file: 'waiting-sheet.png', width: 1448, height: 1086, frames: 4, duration: 900, rows: [0, 32, 64] },
    { id: 'sleeping', name: 'Sommeil', file: 'sleeping-sheet.png', width: 1254, height: 1254, frames: 4, duration: 1250, rows: [17, 49, 84] },
    { id: 'waking', name: 'Réveil', file: 'waking-sheet.png', width: 1448, height: 1086, frames: 4, duration: 300, rows: [3, 32, 64], trim: [0, 3, 0] },
    { id: 'greeting', name: 'Petit salut', file: 'greeting-sheet.png', width: 1254, height: 1254, frames: 4, duration: 400, rows: [10.2073, 46.9537, 84.7209] },
    { id: 'yawning', name: 'Bâillement', file: 'yawning-sheet.png', width: 1448, height: 1086, frames: 4, duration: 450, rows: [5.3039, 32.7072, 61.8785] }
  ];
  const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  function crop(value, width, height) {
    const x = clamp(finite(value.x, 0), 0, width - 1), y = clamp(finite(value.y, 0), 0, height - 1);
    const w = clamp(finite(value.w, width), 1, width - x), h = clamp(finite(value.h, height), 1, height - y);
    return { x, y, w, h, trimTop: clamp(finite(value.trimTop, 0), 0, Math.max(0, h - 1)), trimLeft: clamp(finite(value.trimLeft, 0), 0, Math.max(0, w - 1)), duration: clamp(finite(value.duration, 200), 40, 10000) };
  }
  function source(pack, character) {
    if (pack.custom) return pack;
    const base = packs.find(p => p.id === pack.id) || pack;
    const pet = catalog.pets[character];
    if (!pet?.file) return base;
    const row = { original: 0, curious: 0, working: 1, waiting: 2, greeting: 3, sleeping: 4, yawning: 4, waking: 5 }[base.id] ?? 0;
    return { ...base, file: pet.file, width: pet.width, height: pet.height, frames: ['original', 'sleeping'].includes(base.id) ? 1 : 4, columns: 4, atlas: true, row: pet.rows[row] * pet.width / 128, startFrame: base.id === 'sleeping' ? 3 : 0, trimLeft: pet.trimLeft || 0 };
  }
  function defaults(pack, character) {
    pack = source(pack, character);
    const unit = pack.width / (pack.columns || 4);
    if (pack.atlas) return Array.from({ length: pack.frames }, (_, index) => crop({ x: (index + pack.startFrame) * unit, y: pack.row, w: unit, h: unit, trimLeft: pack.trimLeft || 0, duration: pack.duration }, pack.width, pack.height));
    if (pack.custom) return Array.from({ length: pack.frames }, (_, index) => crop({ x: index * unit, y: (character % pack.gridRows) * pack.height / pack.gridRows, w: unit, h: pack.height / pack.gridRows, duration: pack.duration }, pack.width, pack.height));
    return Array.from({ length: pack.frames }, (_, index) => crop({
      x: pack.id === 'original' ? character * unit : index * unit,
      y: pack.id === 'original' ? 0 : pack.rows[character] * pack.width / 128,
      w: unit, h: pack.id === 'original' ? pack.height : unit,
      trimTop: (pack.trim?.[character] || 0) * pack.width / 128, duration: pack.id === 'curious' ? [1960, 1400, 1960, 280][index] : pack.id === 'waiting' ? [1260, 360, 900, 1080][index] : pack.duration
    }, pack.width, pack.height));
  }
  function parseManifest(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.frames) || !value.frames.length || value.frames.length > 64) throw new Error('Ce fichier n’est pas un réglage de l’atelier.');
    const width = finite(value.source?.width, 0), height = finite(value.source?.height, 0);
    if (width < 1 || height < 1 || width > 8192 || height > 8192) throw new Error('Dimensions de source invalides.');
    const character = catalog.valid(value.character) ? value.character : 0;
    return { version: 1, pack: String(value.pack || 'import').slice(0, 64), character, source: { file: String(value.source?.file || '').split(/[\\/]/).pop().slice(0, 200), width, height }, size: clamp(Math.round(finite(value.size, 96)), 16, 256), frames: value.frames.map(frame => crop(frame || {}, width, height)) };
  }
  function manifest(pack, character, frames, size) {
    pack = source(pack, character);
    return parseManifest({ version: 1, pack: pack.id, character, source: { file: pack.file, width: pack.width, height: pack.height }, size, frames });
  }
  const api = { characters, packs, atlases, source, crop, defaults, parseManifest, manifest };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SpriteStudio = api;
})(typeof globalThis === 'object' ? globalThis : this);
