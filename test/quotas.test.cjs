const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { normalize, createQuotaReader } = require('../src/quotas.cjs');

test('les fenêtres inconnues ne deviennent pas des quotas à zéro', () => {
  assert.deepEqual(normalize({ rateLimits: { primary: { usedPercent: null } } }), []);
  assert.deepEqual(normalize(null), []);
  const windows = normalize({ rateLimitsByLimitId: {}, rateLimits: { primary: { usedPercent: 0, windowDurationMins: 300 }, secondary: null } });
  assert.equal(windows[0].windows[0].usedPercent, 0);
  assert.equal(windows[0].windows[0].resetsAt, null);
});

test('protocole limité aux quotas, cache, actualisation explicite et conservation du dernier relevé', async () => {
  let launches = 0, fail = false, time = 1000;
  const script = `const rl=require('node:readline').createInterface({input:process.stdin});
    rl.on('line',line=>{const q=JSON.parse(line);
      if(q.method==='initialized')return;
      if(!['initialize','account/rateLimits/read'].includes(q.method))process.exit(2);
      if(process.env.FAIL_FIXTURE==='1'){console.log(JSON.stringify({id:q.id,error:{code:-32601}}));return;}
      console.log(JSON.stringify({id:q.id,result:q.method==='initialize'?{}:{rateLimits:{primary:{usedPercent:68,windowDurationMins:300,resetsAt:2000}}}}));
    });`;
  const reader = createQuotaReader({ getBinary: () => process.execPath, now: () => time, spawn: (binary, args, options) => {
    launches++; assert.deepEqual(args, ['app-server', '--listen', 'stdio://']);
    return spawn(binary, ['-e', script], { ...options, env: { ...process.env, FAIL_FIXTURE: fail ? '1' : '0' } });
  } });
  try {
    const first = await reader.read(); assert.equal(first.status, 'ready'); assert.equal(first.groups[0].windows[0].usedPercent, 68);
    await reader.read(); assert.equal(launches, 1);
    time += 100; await reader.read(true); assert.equal(launches, 2);
    fail = true; time += 300001;
    const stale = await reader.read(); assert.equal(stale.status, 'stale'); assert.equal(stale.updatedAt, 1100);
    assert.equal(stale.reason, 'unsupported'); assert.equal(stale.groups[0].windows[0].usedPercent, 68);
  } finally { reader.dispose(); }
});

test('absence de CLI et délai dépassé restent des états indisponibles', async () => {
  const missing = createQuotaReader({ getBinary: () => null });
  assert.equal((await missing.read()).reason, 'missing');
  const stalled = createQuotaReader({ getBinary: () => process.execPath, timeoutMs: 60,
    spawn: (binary, _args, options) => spawn(binary, ['-e', 'process.stdin.resume()'], options) });
  try { assert.equal((await stalled.read()).reason, 'timeout'); }
  finally { stalled.dispose(); }
});
