const { app, BrowserWindow, ipcMain, dialog, clipboard, Menu, shell, Notification } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const pty = require('node-pty');
const store = require('./state.cjs');
const L = require('./layout.js');
const { createQuotaReader } = require('./quotas.cjs');
const { codexArgs } = require('./codex-launch.cjs');
const dictation = require('./dictation.cjs').createDictation();
const { startStudio } = require('../tools/sprite-studio/server.cjs');
let studioPromise, studio;

app.setName('Terminal Deck');
app.setPath('userData', process.env.TERMINAL_DECK_PROFILE ? path.resolve(process.env.TERMINAL_DECK_PROFILE) : path.join(app.getPath('appData'), 'terminal-deck'));
const primary = app.requestSingleInstanceLock();
if (!primary) app.quit();
app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
const profile = () => path.join(app.getPath('userData'), 'workspace.json');
const devRoot = path.join(os.homedir(), '01 - Dev');
const defaultPath = fs.existsSync(devRoot) ? devRoot : os.homedir();
let state, window;
const processes = new Map();
const persist = () => store.save(profile(), state);
const findProject = id => {
  const p = state.projects.find(p => p.id === id);
  if (!p) throw new Error('Projet introuvable.');
  return p;
};
const findSession = id => {
  for (const p of state.projects) { const s = p.sessions.find(s => s.id === id); if (s) return { p, s }; }
  throw new Error('Session introuvable.');
};
function notify(channel, data) { if (window && !window.isDestroyed()) window.webContents.send(channel, data); }
function executable(name) {
  if (name.includes('/')) return fs.existsSync(name) ? name : null;
  for (const folder of (process.env.PATH || '').split(path.delimiter)) {
    const candidate = path.join(folder, name);
    try { fs.accessSync(candidate, fs.constants.X_OK); if (fs.statSync(candidate).isFile()) return candidate; } catch {}
  }
  return null;
}
const codex = executable('codex') || executable(path.join(os.homedir(), '.local/bin/codex'));
const shellPath = executable(process.env.SHELL || '/bin/bash') || '/bin/sh';
const quotaEnv = { ...process.env }; delete quotaEnv.ELECTRON_RUN_AS_NODE; delete quotaEnv.TERMINAL_DECK_PROFILE;
const quotas = createQuotaReader({ getBinary: () => codex, env: quotaEnv, cwd: os.homedir() });
function start(id, cols = 100, rows = 30, threadId = null) {
  const { p, s } = findSession(id);
  if (processes.get(id)?.running) return;
  if (!fs.statSync(p.path).isDirectory()) throw new Error('Le dossier du projet est indisponible.');
  if (s.kind === 'codex' && !codex) throw new Error('Codex est absent du PATH. Installez-le ou ouvrez un terminal shell.');
  const env = { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'TerminalDeck' };
  delete env.ELECTRON_RUN_AS_NODE;
  // Ne pas transmettre les variables techniques du banc de test aux programmes lancés.
  delete env.TERMINAL_DECK_PROFILE;
  const proc = pty.spawn(s.kind === 'codex' ? codex : shellPath, s.kind === 'codex' ? codexArgs(env, threadId) : ['-l'], {
    name: 'xterm-256color', cols: dimension(cols, 100), rows: dimension(rows, 30), cwd: p.path, env
  });
  const record = { proc, running: true, seq: 0, data: '', exitCode: null, pending: [], unacked: 0, paused: false };
  processes.set(id, record);
  proc.onData(data => {
    record.seq++;
    record.data = (record.data + data).slice(-524288);
    record.pending.push({ seq: record.seq, size: data.length }); record.unacked += data.length;
    if (record.unacked >= 131072 && !record.paused) { proc.pause(); record.paused = true; }
    notify('terminal:data', { id, seq: record.seq, data });
  });
  proc.onExit(({ exitCode }) => {
    record.running = false; record.exitCode = exitCode;
    if (processes.get(id) === record) notify('terminal:exit', { id, exitCode });
  });
}
function dimension(n, fallback) { return Number.isInteger(n) ? Math.max(2, Math.min(500, n)) : fallback; }
function handle(channel, callback) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Accès refusé.');
    try { return { ok: true, value: await callback(...args) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
}
handle('session:attention', id => {
  const found = findSession(id);
  if (!found || window?.isFocused() || !Notification.isSupported()) return false;
  const notification = new Notification({ title: 'Codex attend votre attention', body: 'Une session Terminal Deck attend une intervention.', silent: true });
  notification.on('click', () => {
    if (!window || window.isDestroyed()) return;
    window.show(); window.restore(); window.focus(); window.webContents.send('session:navigate', id);
  });
  notification.show(); return true;
});
handle('deck:boot', () => ({ state, codex: Boolean(codex), dictation: process.platform === 'linux', shell: path.basename(shellPath), platform: process.platform, openCodex: !process.argv.includes('--no-startup-codex') }));
handle('dictation', async args => {
  if (!args || !['start', 'level', 'finish', 'cancel'].includes(args.action)) throw Error('Action de dictée invalide.');
  if (args.action !== 'cancel') {
    const { s } = findSession(args.id);
    if (s.kind !== 'codex' || !processes.get(args.id)?.running) throw Error('Ce Codex est arrêté.');
  }
  return dictation[args.action](args);
});
handle('studio:open', async () => {
  if (!studioPromise) studioPromise = startStudio().then(value => { studio = value; return value; }).catch(error => { studioPromise = null; throw error; });
  const value = await studioPromise;
  await shell.openExternal(value.url); return true;
});
handle('quotas:read', force => quotas.read(force === true));
handle('git:status', id => require('./git.cjs').status(findProject(id).path));
handle('clipboard:copy', async text => {
  if (typeof text !== 'string' || text.length > 1048576) throw new Error('Sélection trop longue.');
  await clipboard.writeText(text); return true;
});
handle('clipboard:paste', async () => (await clipboard.readText()).slice(0, 60000));
handle('project:catalog', async () => {
  const found = [];
  for (const root of [devRoot, path.join(devRoot, '00 - Projets à tester')]) {
    try { for (const entry of await fs.promises.readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && !/^\d\d - /.test(entry.name)) found.push({ name: entry.name.replace(/^[a-z-]+--/, ''), path: path.join(root, entry.name) });
    } } catch {}
  }
  return found.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
});
handle('project:add', async folder => {
  if (!folder) {
    const result = await dialog.showOpenDialog(window, { title: 'Ouvrir un projet', defaultPath, properties: ['openDirectory'] });
    if (result.canceled) return null;
    folder = result.filePaths[0];
  }
  if (typeof folder !== 'string' || !path.isAbsolute(folder) || !fs.statSync(folder).isDirectory()) throw new Error('Choisissez un dossier existant.');
  folder = fs.realpathSync(folder);
  const p = state.projects.find(p => p.path === folder) || store.project(folder);
  if (!state.projects.includes(p)) state.projects.push(p);
  state.activeProject = p.id; persist(); return p;
});
handle('session:add', ({ projectId, kind, target, axis }) => {
  const p = findProject(projectId);
  if (p.sessions.length >= 16) throw new Error('Ce projet contient déjà 16 panneaux.');
  const s = { id: store.uuid(), kind: kind === 'codex' ? 'codex' : 'shell', name: kind === 'codex' ? 'Codex' : 'Terminal', minimized: false };
  p.tree = L.split(p.tree, L.ids(p.tree).includes(target) ? target : L.ids(p.tree)[0], s.id, axis === 'column' ? 'column' : 'row');
  p.sessions.push(s); p.active = s.id; persist(); return { session: s, tree: p.tree };
});
handle('session:remove', id => {
  dictation.cancelSession(id).catch(() => {});
  const { p } = findSession(id);
  const record = processes.get(id);
  if (record?.running) { try { record.proc.kill(); } catch {} }
  processes.delete(id);
  p.sessions = p.sessions.filter(s => s.id !== id); p.tree = L.remove(p.tree, id);
  if (p.active === id) p.active = p.sessions.find(s => !s.minimized)?.id || null;
  persist(); return true;
});
handle('terminal:start', ({ id, cols, rows, threadId }) => { start(id, cols, rows, threadId); return true; });
handle('terminal:attach', id => {
  findSession(id);
  const record = processes.get(id);
  return record ? { data: record.data, seq: record.seq, running: record.running, exitCode: record.exitCode } : { data: '', seq: 0, running: false, exitCode: null };
});
handle('terminal:write', ({ id, data }) => {
  if (typeof data !== 'string' || data.length > 65536) throw new Error('Saisie trop longue (64 Ko maximum).');
  const record = processes.get(id);
  if (!record?.running) throw new Error('Cette session est arrêtée.');
  record.proc.write(data); return true;
});
handle('terminal:resize', ({ id, cols, rows }) => {
  const record = processes.get(id);
  if (record?.running) record.proc.resize(dimension(cols, 100), dimension(rows, 30));
});
handle('terminal:ack', ({ id, seq }) => {
  const record = processes.get(id);
  if (!record || !Number.isInteger(seq) || seq < 0 || seq > record.seq) return;
  while (record.pending.length && record.pending[0].seq <= seq) record.unacked -= record.pending.shift().size;
  if (record.paused && record.running && record.unacked < 65536) { record.paused = false; record.proc.resume(); }
});
handle('deck:save', update => {
  if (!update || !Array.isArray(update.projects)) throw new Error('Disposition invalide.');
  if (state.projects.some(p => p.id === update.activeProject)) state.activeProject = update.activeProject;
  for (const changes of update.projects) {
    const p = state.projects.find(p => p.id === changes.id); if (!p) continue;
    p.tree = L.sanitize(changes.tree, new Set(p.sessions.map(s => s.id)));
    for (const s of p.sessions) if (!L.ids(p.tree).includes(s.id)) p.tree = L.split(p.tree, L.ids(p.tree)[0], s.id);
    for (const s of p.sessions) {
      const update = changes.sessions?.find(x => x.id === s.id);
      s.name = store.label(update?.name, s.name);
      Object.assign(s, store.sessionMeta(update));
      if (typeof update?.minimized === 'boolean') s.minimized = update.minimized;
    }
    p.sessions = L.ids(p.tree).map(id => p.sessions.find(s => s.id === id));
    p.active = p.sessions.some(s => s.id === changes.active && !s.minimized) ? changes.active : p.sessions.find(s => !s.minimized)?.id || null;
  }
  state.history = store.cleanHistory(update.history);
  state.conversations = require('./conversations.js').sanitize(update.conversations);
  state.settings = store.cleanState({ settings: update.settings }, defaultPath).settings;
  persist(); return true;
});

app.whenReady().then(() => {
  if (!primary) return;
  state = store.load(profile(), defaultPath);
  // Ctrl Q concerne le panneau sous la souris, pas le rôle Quitter du menu Electron.
  Menu.setApplicationMenu(null);
  window = new BrowserWindow({ width: 1520, height: 960, minWidth: 920, minHeight: 620, title: 'Terminal Deck', backgroundColor: '#050505', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, backgroundThrottling: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(path.join(__dirname, 'index.html'));
  window.on('close', () => { persist(); stopTerminals(); });
});
function stopTerminals() {
  dictation.disposeNow();
  for (const p of processes.values()) if (p.running) { p.running = false; try { p.proc.kill(); } catch {} }
}
app.on('before-quit', () => { quotas.dispose(); studio?.server.close(); if (state) persist(); stopTerminals(); });
app.on('window-all-closed', () => { stopTerminals(); app.quit(); });
