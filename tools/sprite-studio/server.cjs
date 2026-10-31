const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/studio.css', ['studio.css', 'text/css; charset=utf-8']],
  ['/studio.js', ['studio.js', 'text/javascript; charset=utf-8']],
  ['/model.js', ['model.js', 'text/javascript; charset=utf-8']]
]);
const { packs, atlases } = require('./model.js');
files.set('/pet-catalog.js', ['../../src/pets.js', 'text/javascript; charset=utf-8']);
for (const pack of [...packs, ...atlases]) files.set('/assets/' + pack.file, [path.join('../../assets/mascots', pack.file), 'image/png']);
async function startStudio({ port = 47831 } = {}) {
  const server = http.createServer((request, response) => {
    const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, headers); response.end(); return; }
    let pathname; try { pathname = new URL(request.url, 'http://localhost').pathname; } catch { response.writeHead(400, headers); response.end(); return; }
    const file = files.get(pathname);
    if (!file) { response.writeHead(404, headers); response.end('Introuvable'); return; }
    fs.readFile(path.join(__dirname, file[0]), (error, data) => {
      if (error) { response.writeHead(404, headers); response.end('Fichier indisponible'); return; }
      response.writeHead(200, { ...headers, 'Content-Type': file[1] }); response.end(request.method === 'HEAD' ? undefined : data);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', error => {
      if (error.code === 'EADDRINUSE' && port !== 0) { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }
      else reject(error);
    });
    server.listen(port, '127.0.0.1', resolve);
  });
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(resolve => server.close(resolve)), server };
}
module.exports = { startStudio };
