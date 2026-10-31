(function (root) {
  'use strict';
  const pets = typeof module === 'object' && module.exports ? require('./pets.js') : root.DeckPets;
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const prefix = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{5}$/i;
  const clean = text => typeof text === 'string' ? text.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, '').trim() : '';
  function parse(title) {
    const parts = clean(title).slice(0, 1024).split(' | '), first = parts.shift();
    const token = first.replace(/(?:\.\.\.|…)$/, '').toLowerCase();
    if (!uuid.test(token) && !(prefix.test(token) && /(?:\.\.\.|…)$/.test(first))) return null;
    const rest = parts.join(' | '), fallbackId = uuid.test(rest) ? rest.toLowerCase() : null;
    if (fallbackId && !fallbackId.startsWith(token)) return null;
    return { key: token.slice(0, 29), fullId: uuid.test(token) ? token : fallbackId, title: fallbackId ? '' : rest.slice(0, 240) };
  }
  function sanitize(raw) {
    const seen = new Set();
    return (Array.isArray(raw) ? raw : []).slice(0, 500).filter(x => { const key = x?.key?.toLowerCase?.(); if (!prefix.test(key || '') || seen.has(key)) return false; seen.add(key); return true; }).map(x => ({
      key: x.key.toLowerCase(), fullId: uuid.test(x.fullId || '') && x.fullId.toLowerCase().startsWith(x.key.toLowerCase()) ? x.fullId.toLowerCase() : null,
      title: clean(x.title).slice(0, 240), favorite: x.favorite === true,
      companion: pets.valid(x.companion) ? x.companion : null,
      lastOpened: Number.isSafeInteger(x.lastOpened) && x.lastOpened > 0 ? x.lastOpened : 0,
      projectId: typeof x.projectId === 'string' && /^[\w-]{1,80}$/.test(x.projectId) ? x.projectId : null,
      ambiguous: x.ambiguous === true
    }));
  }
  function character(key) { return pets.defaultCharacter(key); }
  const api = { parse, sanitize, character, validId: id => typeof id === 'string' && uuid.test(id), validKey: key => typeof key === 'string' && prefix.test(key) };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DeckConversations = api;
})(globalThis);
