const { execFile } = require('node:child_process');
function parse(output) {
  const parts = output.split('\0'), branch = (parts.shift() || '').replace(/^## /, '');
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i]; if (entry.length < 3) continue;
    const status = entry.slice(0, 2), path = entry.slice(3);
    const previous = /[RC]/.test(status) ? parts[++i] : null;
    files.push({ status, path, previous });
  }
  return { repository: true, branch, files };
}
function status(cwd) {
  return new Promise((resolve, reject) => execFile('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', 'status', '--porcelain=v1', '-z', '--branch', '--untracked-files=normal'],
    { cwd, timeout: 8000, maxBuffer: 2097152, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }, (error, stdout) => {
      if (error) {
        if (error.code === 128) resolve({ repository: false });
        else reject(new Error('Lecture Git indisponible.'));
      } else resolve(parse(stdout));
    }));
}
module.exports = { parse, status };
