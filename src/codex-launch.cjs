const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
// Les options -c de l'interface excluent le daemon implicite dans le CLI.
// Une connexion explicite garde le propriétaire de conversation existant.
function codexArgs(env = process.env, threadId = null) {
  if (threadId !== null && !require('./conversations.js').validId(threadId)) throw new Error('Identifiant de conversation invalide.');
  const home = env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const socket = path.join(home, 'app-server-control', 'app-server-control.sock');
  let shared = false;
  try { shared = fs.statSync(socket).isSocket(); } catch {}
  return [...(shared ? ['--remote', 'unix://'] : []), 'resume', ...(threadId ? [threadId] : ['--all']), '-c', 'tui.terminal_title=["thread-id","thread-title"]', '-c', 'tui.keymap.composer.queue=[]'];
}
module.exports = { codexArgs };
