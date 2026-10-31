(function (root) {
  'use strict';
  // Ne piloter que le filtre natif identifié et encore focalisé, jamais le composer.
  function inspect(term) {
    const buffer = term.buffer.active;
    let header = false, filter = null, compact = null;
    for (let row = 0; row < Math.min(term.rows, 8); row++) {
      const line = buffer.getLine(buffer.baseY + row);
      if (!line) continue;
      const text = line.translateToString(true);
      if (text.includes('Resume a previous session')) header = true;
      const short = /^\s*Filter:\s+(All|Cwd)\s+.*Sort:/.exec(text);
      if (short && !(text.includes('Cwd') && text.includes('All'))) compact = { mode: short[1], cell: line.getCell(text.indexOf(short[1])) };
      if (text.includes('Filter:') && /\bCwd\b/.test(text) && /\bAll\b/.test(text)) filter = { line, text };
    }
    if (!header) return null;
    if (!filter && compact) return compact.mode === 'All' ? 'all' : compact.cell?.isBold() && compact.cell?.isUnderline() ? 'cwd' : 'unfocused';
    if (!filter) return 'rendering';
    const all = filter.line.getCell(filter.text.indexOf('All'));
    const cwd = filter.line.getCell(filter.text.indexOf('Cwd'));
    if (all?.isBold()) return 'all';
    if (cwd?.isBold() && cwd?.isUnderline()) return 'cwd';
    return 'unfocused';
  }
  const api = { inspect };
  if (typeof module === 'object') module.exports = api;
  else root.DeckCodexPicker = api;
})(globalThis);
