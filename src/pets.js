(function (root) {
  'use strict';
  // Les indices 0–2 sont conservés : les choix existants ne changent pas.
  const pets = [
    { id: 'blob', name: 'Blob', label: 'Gelée' },
    { id: 'vesper', name: 'Vesper', label: 'Chauve-souris' },
    { id: 'byte', name: 'Byte', label: 'Robot' },
    { id: 'fox-loaf', name: 'Fox Loaf', label: 'Fox Loaf', file: 'fox-loaf-sheet-v3.png', width: 1024, height: 1536, rows: [2, 32, 62, 92, 122, 153], trimLeft: 16 },
    { id: 'corbac-mini', name: 'Corbac mini', label: 'Corbac mini', file: 'corbac-mini-sheet-v3.png', width: 1024, height: 1536, rows: [2, 32, 62, 92, 122, 152] }
  ];
  const valid = value => Number.isInteger(value) && value >= 0 && value < pets.length;
  // Conserver aussi l'attribution automatique historique du trio ; les nouveaux sont au choix.
  const defaultCharacter = key => [...key].reduce((n, c) => n + c.charCodeAt(0), 0) % 3;
  const api = { pets, valid, defaultCharacter };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DeckPets = api;
})(globalThis);
