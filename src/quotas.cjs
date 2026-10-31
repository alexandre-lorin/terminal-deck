const { spawn: spawnProcess } = require('node:child_process');

function normalize(result) {
  const raw = result?.rateLimitsByLimitId && typeof result.rateLimitsByLimitId === 'object' && Object.keys(result.rateLimitsByLimitId).length
    ? Object.entries(result.rateLimitsByLimitId) : result?.rateLimits ? [['codex', result.rateLimits]] : [];
  return raw.slice(0, 12).flatMap(([id, bucket]) => {
    if (!bucket || typeof bucket !== 'object') return [];
    const windows = ['primary', 'secondary'].flatMap(key => {
      const w = bucket[key];
      if (!w || typeof w.usedPercent !== 'number' || !Number.isFinite(w.usedPercent) || w.usedPercent < 0) return [];
      return [{ key, usedPercent: w.usedPercent,
        windowDurationMins: typeof w.windowDurationMins === 'number' && w.windowDurationMins > 0 ? w.windowDurationMins : null,
        resetsAt: typeof w.resetsAt === 'number' && Number.isFinite(w.resetsAt) && w.resetsAt > 0 ? w.resetsAt : null }];
    });
    if (!windows.length) return [];
    const clean = value => String(value).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 80);
    return [{ id: clean(id), name: clean(bucket.limitName || (id === 'codex' ? 'Codex' : id)), windows }];
  });
}

function createQuotaReader({ getBinary, env = process.env, cwd, spawn = spawnProcess, now = Date.now, timeoutMs = 12000, cacheMs = 300000 }) {
  let cached = null, attemptedAt = -Infinity, pending = null, cancelCurrent = null;
  function query() {
    return new Promise((resolve, reject) => {
      const binary = getBinary();
      if (!binary) { reject(new Error('missing')); return; }
      let child;
      try { child = spawn(binary, ['app-server', '--listen', 'stdio://'], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] }); }
      catch { reject(new Error('unavailable')); return; }
      let buffer = '', total = 0, done = false;
      const finish = (error, result) => {
        if (done) return; done = true; clearTimeout(timer); cancelCurrent = null;
        try { child.stdin.end(); child.kill('SIGTERM'); } catch {}
        if (error) reject(new Error(error)); else resolve(result);
      };
      const timer = setTimeout(() => finish('timeout'), timeoutMs);
      cancelCurrent = () => finish('closed');
      const send = value => { try { child.stdin.write(JSON.stringify(value) + '\n'); } catch { finish('unavailable'); } };
      child.on('error', () => finish('unavailable'));
      child.on('exit', () => { if (!done) finish('unavailable'); });
      child.stdin.on('error', () => finish('unavailable'));
      child.stderr.on('data', () => {}); // Ne jamais exposer ou conserver les diagnostics du CLI.
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', chunk => {
        total += chunk.length;
        if (total > 2097152) { finish('unavailable'); return; }
        buffer += chunk;
        let end;
        while (!done && (end = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
          let message; try { message = JSON.parse(line); } catch { continue; }
          if (![1, 2].includes(message.id)) continue;
          if (message.error) { finish(message.error.code === -32601 ? 'unsupported' : /auth/i.test(message.error.message || '') ? 'authentication' : 'unavailable'); return; }
          if (message.id === 1) {
            send({ method: 'initialized' });
            send({ id: 2, method: 'account/rateLimits/read' });
          } else finish(null, normalize(message.result));
        }
      });
      send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'terminal_deck_usage', version: '0.3.0' } } });
    });
  }
  async function read(force = false) {
    if (pending) return pending;
    if (!force && cached && now() - attemptedAt < cacheMs) return cached;
    attemptedAt = now();
    pending = query().then(groups => {
      cached = { status: groups.length ? 'ready' : 'unavailable', groups, updatedAt: now(), reason: groups.length ? null : 'empty' };
      return cached;
    }).catch(error => {
      cached = cached?.groups.length ? { ...cached, status: 'stale', reason: error.message } : { status: 'unavailable', groups: [], updatedAt: null, reason: error.message };
      return cached;
    }).finally(() => { pending = null; });
    return pending;
  }
  return { read, dispose: () => cancelCurrent?.() };
}
module.exports = { normalize, createQuotaReader };
