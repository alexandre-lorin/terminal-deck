const { spawn } = require('node:child_process');
const { startStudio } = require('../tools/sprite-studio/server.cjs');
(async () => {
  const studio = await startStudio();
  console.log(`Atelier des compagnons : ${studio.url}`);
  console.log('Ctrl C pour fermer le serveur local.');
  if (process.argv.includes('--open')) {
    const browser = spawn('firefox', ['--new-tab', studio.url], { detached: true, stdio: 'ignore' });
    browser.once('error', () => console.error('Ouverture automatique indisponible : utilisez le lien ci-dessus.')); browser.unref();
  }
  process.once('SIGINT', () => studio.close().then(() => process.exit(0)));
  process.once('SIGTERM', () => studio.close().then(() => process.exit(0)));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
