const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function pcmLevel(buffer) {
  let sum = 0, samples = Math.floor(buffer.length / 2);
  for (let i = 0; i < samples * 2; i += 2) sum += buffer.readInt16LE(i) ** 2;
  return samples ? Math.sqrt(sum / samples) / 32768 : 0;
}
function wav(pcm) {
  const head = Buffer.alloc(44);
  head.write('RIFF'); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(16000, 24); head.writeUInt32LE(32000, 28); head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([head, pcm]);
}
function clean(text) { return String(text).replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 16000); }
function createDictation(options = {}) {
  let current;
  const home = options.home || os.homedir();
  const models = options.model ? [options.model] : ['ggml-large-v3-turbo.bin', 'ggml-base.bin'].map(name => path.join(home, '.local/share/falcon/models', name));
  const launch = options.spawn || spawn;
  function child(job, binary, args, stdio) {
    const proc = launch(binary, args, { stdio, windowsHide: true });
    job.child = proc;
    job.closed = new Promise(resolve => {
      proc.once('error', () => resolve(-1));
      proc.once('close', code => resolve(code));
    });
    return proc;
  }
  async function halt(job) {
    const proc = job.child;
    if (!proc) return;
    if (proc.exitCode === null && !proc.killed) proc.kill('SIGINT');
    let killTimer = setTimeout(() => { if (proc.exitCode === null) proc.kill('SIGKILL'); }, 1500);
    await job.closed;
    clearTimeout(killTimer);
    job.child = null;
  }
  function get({ id, token }) {
    if (!current || current.id !== id || current.token !== token) throw Error('Cette dictée est terminée.');
    return current;
  }
  async function cancel(args) {
    const job = current;
    if (!job || args && (job.id !== args.id || job.token !== args.token)) return false;
    current = null; clearTimeout(job.timer);
    await halt(job);
    fs.rmSync(job.dir, { recursive: true, force: true });
    return true;
  }
  async function start({ id, token }) {
    if (current) throw Error('Une dictée est déjà ouverte.');
    if (typeof token !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(token)) throw Error('Dictée invalide.');
    const model = models.find(p => fs.existsSync(p));
    if (!model) throw Error('Modèle de transcription local introuvable.');
    const dir = fs.mkdtempSync(path.join(options.tmpdir || os.tmpdir(), 'deck-dictation-'));
    fs.chmodSync(dir, 0o700);
    const job = current = { id, token, dir, model, phase: 'recording', started: Date.now() };
    job.raw = path.join(dir, 'capture.raw');
    const fd = fs.openSync(job.raw, 'wx', 0o600);
    try {
      child(job, 'pw-record', ['--raw', '--rate', '16000', '--channels', '1', '--format', 's16', '-'], ['ignore', fd, 'ignore']);
    } catch (error) { fs.closeSync(fd); await cancel({ id, token }); throw error; }
    fs.closeSync(fd);
    try {
      for (let i = 0; i < 40; i++) {
        if (current !== job) throw Error('Dictée annulée.');
        if (fs.statSync(job.raw).size > 0) {
          job.timer = setTimeout(() => { cancel({ id, token }).catch(() => {}); }, 180000);
          return true;
        }
        const stopped = await Promise.race([job.closed.then(() => true), delay(50).then(() => false)]);
        if (stopped) break;
      }
      throw Error('Microphone indisponible. Vérifiez votre entrée audio.');
    } catch (error) { await cancel({ id, token }); throw error; }
  }
  function level(args) {
    const job = get(args);
    if (job.phase !== 'recording') return { level: 0, seconds: 0 };
    const size = fs.statSync(job.raw).size;
    const tail = Buffer.alloc(Math.min(size - size % 2, 6400));
    const fd = fs.openSync(job.raw, 'r');
    try { fs.readSync(fd, tail, 0, tail.length, Math.max(0, size - size % 2 - tail.length)); }
    finally { fs.closeSync(fd); }
    return { level: pcmLevel(tail), seconds: Math.floor((Date.now() - job.started) / 1000) };
  }
  async function finish(args) {
    const job = get(args);
    if (job.phase !== 'recording') throw Error('Transcription déjà en cours.');
    job.phase = 'transcribing'; clearTimeout(job.timer);
    try {
      await halt(job);
      if (current !== job) throw Error('Dictée annulée.');
      const pcm = fs.readFileSync(job.raw);
      let voiced = 0;
      for (let i = 0; i + 640 <= pcm.length; i += 640) if (pcmLevel(pcm.subarray(i, i + 640)) > .003) voiced++;
      if (voiced < 8) throw Error('Aucune parole détectée. Vous pouvez réessayer.');
      const file = path.join(job.dir, 'capture.wav'), out = path.join(job.dir, 'transcript');
      fs.writeFileSync(file, wav(pcm), { mode: 0o600 });
      child(job, 'whisper-cli', ['-m', job.model, '-f', file, '-l', 'fr', '-otxt', '-of', out, '-np', '-nt', '-ng', '-t', '6'], 'ignore');
      job.timer = setTimeout(() => { cancel(args).catch(() => {}); }, 90000);
      const code = await job.closed;
      if (current !== job) throw Error('Dictée annulée.');
      if (code !== 0) throw Error('La transcription a échoué. Vous pouvez réessayer.');
      const text = clean(fs.readFileSync(out + '.txt', 'utf8'));
      if (!text) throw Error('Aucune parole reconnue. Vous pouvez réessayer.');
      return text;
    } finally { await cancel(args); }
  }
  function disposeNow() {
    const job = current; if (!job) return;
    current = null; clearTimeout(job.timer);
    if (job.child?.exitCode === null) job.child.kill('SIGKILL');
    // La fermeture de fenêtre est immédiate : ne pas dépendre d’une promesse
    // qui pourrait ne plus s’exécuter après la sortie d’Electron.
    fs.rmSync(job.dir, { recursive: true, force: true });
  }
  return { start, level, finish, cancel, dispose: () => cancel(), disposeNow, cancelSession: id => current?.id === id ? cancel() : Promise.resolve(false) };
}
module.exports = { createDictation, pcmLevel, wav, clean };
