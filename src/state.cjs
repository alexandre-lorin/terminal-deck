const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const conversations = require('./conversations.js');
const pets = require('./pets.js');
const layout = require('./layout.js');
const uuid = () => crypto.randomUUID();
const label = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : fallback;

function sessionMeta(s) {
  return { threadKey: conversations.validKey(s?.threadKey) ? s.threadKey.toLowerCase() : null, favorite: s?.favorite === true,
    companion: pets.valid(s?.companion) ? s.companion : null,
    lastOpened: Number.isSafeInteger(s?.lastOpened) && s.lastOpened > 0 ? s.lastOpened : 0,
    title: typeof s?.title === 'string' ? s.title.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, 240) : '' };
}
function cleanHistory(raw) {
  return (Array.isArray(raw) ? raw : []).filter(x => x && typeof x.sessionId === 'string' && /^[\w-]{1,80}$/.test(x.sessionId) && Number.isSafeInteger(x.at) && x.at > 0)
    .slice(0, 80).map(x => ({ sessionId: x.sessionId, title: sessionMeta(x).title || 'Codex', at: x.at }));
}
function project(folder) {
  return { id: uuid(), name: path.basename(folder), path: folder, sessions: [], tree: null, active: null };
}
function cleanState(raw, defaultPath) {
  const projects = [], known = new Set();
  for (const p of Array.isArray(raw?.projects) ? raw.projects.slice(0, 100) : []) {
    if (typeof p.path !== 'string' || !path.isAbsolute(p.path) || known.has(p.path)) continue;
    known.add(p.path);
    const item = project(p.path);
    item.id = typeof p.id === 'string' && /^[\w-]{1,80}$/.test(p.id) && !projects.some(x => x.id === p.id) ? p.id : item.id;
    item.name = label(p.name, item.name);
    const seen = new Set();
    for (const s of Array.isArray(p.sessions) ? p.sessions.slice(0, 16) : []) {
      if (!s || typeof s.id !== 'string' || !/^[\w-]{1,80}$/.test(s.id) || seen.has(s.id) || projects.some(x => x.sessions.some(y => y.id === s.id))) continue;
      seen.add(s.id);
      item.sessions.push({ id: s.id, kind: s.kind === 'codex' ? 'codex' : 'shell', name: label(s.name, s.kind === 'codex' ? 'Codex' : 'Terminal'), minimized: s.minimized === true, ...sessionMeta(s) });
    }
    const allowed = new Set(item.sessions.map(s => s.id));
    item.tree = layout.sanitize(p.tree, allowed);
    for (const s of item.sessions) if (!layout.ids(item.tree).includes(s.id)) item.tree = layout.split(item.tree, layout.ids(item.tree)[0], s.id);
    item.active = item.sessions.some(s => s.id === p.active && !s.minimized) ? p.active : item.sessions.find(s => !s.minimized)?.id || null;
    projects.push(item);
  }
  if (!projects.length) projects.push(project(defaultPath));
  return { version: 1, conversations: conversations.sanitize(raw?.conversations), history: cleanHistory(raw?.history), projects, activeProject: projects.some(p => p.id === raw?.activeProject) ? raw.activeProject : projects[0].id,
    settings: { fontSize: Math.max(11, Math.min(22, Number(raw?.settings?.fontSize) || 14)), theme: ['noir', 'graphite', 'cendre', 'perigee'].includes(raw?.settings?.theme) ? raw.settings.theme : 'noir' } };
}
function load(file, fallback) {
  try { return cleanState(JSON.parse(fs.readFileSync(file, 'utf8')), fallback); }
  catch { return cleanState(null, fallback); }
}
function save(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file + '.tmp', JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(file + '.tmp', file);
}
module.exports = { sessionMeta, cleanHistory, uuid, project, label, cleanState, load, save };
