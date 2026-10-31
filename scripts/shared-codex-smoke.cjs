const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const pty = require('node-pty');
const WebSocket = require('/tmp/deck-ui-tools/node_modules/ws');
const { codexArgs } = require('../src/codex-launch.cjs');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'td-shared-codex-'));
const home = path.join(temporary, 'home'), codexHome = path.join(temporary, 'codex');
fs.mkdirSync(home, { mode: 0o700 }); fs.mkdirSync(codexHome, { mode: 0o700 }); fs.mkdirSync(path.join(codexHome, 'app-server-control'), { mode: 0o700 });
const binary = fs.realpathSync(path.join(os.homedir(), '.local/bin/codex'));
fs.writeFileSync(path.join(codexHome, 'config.toml'), 'model="fixture"\nmodel_provider="fixture"\n[model_providers.fixture]\nname="Fixture locale"\nbase_url="http://127.0.0.1:1/v1"\nwire_api="responses"\nrequires_openai_auth=false\n');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CODEX_') && !['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'ELECTRON_RUN_AS_NODE'].includes(key)));
Object.assign(env, { HOME: home, CODEX_HOME: codexHome, TERM: 'xterm-256color', TERM_PROGRAM: 'TerminalDeck' });
const socket = path.join(codexHome, 'app-server-control/app-server-control.sock');
const listenSocket = path.join(temporary, 'server.sock');
const children = [], pending = new Map(); let server, ws, requestId = 0;
function request(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++requestId, timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Délai dépassé : ${method}`)); }, 10000);
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function terminal(threadId) {
  const args = codexArgs(env); assert.deepEqual(args.slice(0, 2), ['--remote', 'unix://']);
  args[args.indexOf('--all')] = threadId;
  const proc = pty.spawn(binary, args, { cols: 120, rows: 35, cwd: home, env }); children.push(proc);
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => { listener.dispose(); reject(new Error('Le vrai terminal ne signale pas son état de repos.')); }, 20000);
    const listener = proc.onData(data => {
      output = (output + data).slice(-150000);
      if (output.includes('This conversation is open in another app')) {
        clearTimeout(timeout); listener.dispose(); reject(new Error('Verrou concurrent au sein du service partagé.'));
      } else if (/\x1b\]7501;state=idle:app=codex/.test(output)) {
        clearTimeout(timeout); listener.dispose(); resolve();
      }
    });
    proc.onExit(() => { clearTimeout(timeout); listener.dispose(); reject(new Error('Le terminal de recette a quitté avant le repos.')); });
  });
  return proc;
}
(async () => {
  try {
    assert.equal(codexArgs(env).includes('--remote'), false);
    server = spawn(binary, ['app-server', '--listen', 'unix://' + listenSocket], { cwd: home, env, stdio: ['ignore', 'ignore', 'pipe'] });
    // Les diagnostics du CLI restent privés ; aucune donnée de compte ou de conversation affichée.
    let diagnostics = ''; server.stderr.on('data', data => { diagnostics = (diagnostics + data).slice(-4000); });
    await new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (fs.existsSync(listenSocket)) { clearInterval(timer); fs.symlinkSync(listenSocket, socket); resolve(); }
        else if (Date.now() - started > 10000 || server.exitCode !== null) { clearInterval(timer); reject(new Error('Le serveur de recette ne crée pas son socket : ' + diagnostics)); }
      }, 50);
    });
    ws = new WebSocket('ws://localhost', { createConnection: () => net.createConnection(socket) });
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    ws.on('message', data => {
      const message = JSON.parse(data); const handler = pending.get(message.id); if (!handler) return;
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(`RPC refusée : ${message.error.code}`)); else handler.resolve(message.result);
    });
    await request('initialize', { clientInfo: { name: 'terminal_deck_shared_test', version: '0.3.0' } });
    ws.send(JSON.stringify({ method: 'initialized' }));
    const { thread } = await request('thread/start', { cwd: home, model: 'fixture', modelProvider: 'fixture', approvalPolicy: 'never', sandbox: 'read-only' });
    await terminal(thread.id);
    await terminal(thread.id);
    console.log('Vrai Codex : même conversation ouverte dans deux PTY via le même serveur, sans verrou concurrent, sans compte ni prompt modèle.');
  } finally {
    for (const child of children) { try { child.kill(); } catch {} }
    if (ws) ws.terminate();
    if (server && server.exitCode === null) {
      server.kill();
      await new Promise(resolve => { const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 3000); server.once('exit', () => { clearTimeout(timer); resolve(); }); });
    }
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
