(function (root) {
  'use strict';
  const leaf = id => ({ type: 'leaf', id });
  function ids(tree) { return !tree ? [] : tree.type === 'leaf' ? [tree.id] : [...ids(tree.a), ...ids(tree.b)]; }
  function split(tree, target, id, axis = 'row') {
    if (!tree) return leaf(id);
    if (tree.type === 'leaf') return tree.id === target ? { type: 'split', axis, ratio: .5, a: tree, b: leaf(id) } : tree;
    return { ...tree, a: split(tree.a, target, id, axis), b: split(tree.b, target, id, axis) };
  }
  function remove(tree, id) {
    if (!tree) return null;
    if (tree.type === 'leaf') return tree.id === id ? null : tree;
    const a = remove(tree.a, id), b = remove(tree.b, id);
    return a && b ? { ...tree, a, b } : a || b;
  }
  function grid(list, axis = 'row') {
    if (!list.length) return null;
    if (list.length === 1) return leaf(list[0]);
    const mid = Math.ceil(list.length / 2);
    return { type: 'split', axis, ratio: .5, a: grid(list.slice(0, mid), axis === 'row' ? 'column' : 'row'), b: grid(list.slice(mid), axis === 'row' ? 'column' : 'row') };
  }
  function sanitize(tree, allowed, seen = new Set(), depth = 0) {
    if (!tree || depth > 20) return null;
    if (tree.type === 'leaf') {
      if (!allowed.has(tree.id) || seen.has(tree.id)) return null;
      seen.add(tree.id); return leaf(tree.id);
    }
    if (tree.type !== 'split') return null;
    const a = sanitize(tree.a, allowed, seen, depth + 1), b = sanitize(tree.b, allowed, seen, depth + 1);
    return a && b ? { type: 'split', axis: tree.axis === 'column' ? 'column' : 'row', ratio: Math.min(.85, Math.max(.15, Number(tree.ratio) || .5)), a, b } : a || b;
  }
  function move(tree, source, target, side = 'center') {
    const known = ids(tree);
    if (source === target || !known.includes(source) || !known.includes(target) || !['center', 'left', 'right', 'top', 'bottom'].includes(side)) return tree;
    if (side === 'center') {
      const swap = node => node.type === 'leaf' ? leaf(node.id === source ? target : node.id === target ? source : node.id) : { ...node, a: swap(node.a), b: swap(node.b) };
      return swap(tree);
    }
    const insert = node => {
      if (node.type !== 'leaf') return { ...node, a: insert(node.a), b: insert(node.b) };
      if (node.id !== target) return node;
      const before = side === 'left' || side === 'top';
      return { type: 'split', axis: side === 'left' || side === 'right' ? 'row' : 'column', ratio: .5, a: before ? leaf(source) : node, b: before ? node : leaf(source) };
    };
    return insert(remove(tree, source));
  }
  const api = { leaf, ids, split, remove, grid, sanitize, move };
  if (typeof module === 'object') module.exports = api;
  else root.DeckLayout = api;
})(globalThis);
