const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { codexArgs } = require('../src/codex-launch.cjs');
test('utiliser explicitement le service existant malgré les options locales du TUI', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'td-launch-'));
  const folder = path.join(home, 'app-server-control'); fs.mkdirSync(folder);
  const socket = path.join(folder, 'app-server-control.sock'); const server = net.createServer();
  try {
    assert.equal(codexArgs({ CODEX_HOME: home }).includes('--remote'), false);
    fs.writeFileSync(socket, 'pas un socket');
    assert.equal(codexArgs({ CODEX_HOME: home }).includes('--remote'), false); fs.unlinkSync(socket);
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socket, resolve); });
    const args = codexArgs({ CODEX_HOME: home });
    assert.deepEqual(args.slice(0, 4), ['--remote', 'unix://', 'resume', '--all']);
    assert.ok(args.includes('tui.keymap.composer.queue=[]'));
    assert.ok(args.includes('tui.terminal_title=["thread-id","thread-title"]'));
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    fs.rmSync(home, { recursive: true, force: true });
  }
});
