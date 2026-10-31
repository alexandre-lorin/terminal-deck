(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (condition, label) => { for (let n=0;n<300;n++) { if (await condition()) return; await sleep(50); } throw new Error('Délai : '+label); };
  const check = (value, label) => { if (!value) throw new Error(label); };
  try {
    await wait(() => typeof state !== 'undefined' && state && document.querySelector('#project-name').title, 'interface initialisée');
    const project = activeProject();
    check(boot.runtime === 'tauri', 'vrai moteur Tauri');
    await api.copy('collage natif\nseconde ligne'); check(await api.paste() === 'collage natif\nseconde ligne', 'presse-papiers natif');
    await addSession('shell'); const shellId = activeProject().active;
    await wait(() => runtimes.get(shellId)?.running, 'shell PTY');
    await api.write({ id:shellId, data:"printf 'NATIVE_DECK_OK\\n'\r" });
    await wait(async () => (await api.attach(shellId)).data.includes('NATIVE_DECK_OK\r\n'), 'réponse du vrai shell');
    await api.resize({id:shellId,cols:91,rows:31});
    await api.write({ id:shellId, data:'stty size\r' });
    await wait(async () => (await api.attach(shellId)).data.includes('31 91'), 'redimensionnement du PTY');
    await showGit(); check(document.querySelector('.git-branch')?.textContent.includes('main'), 'Git natif'); closeModal();
    await addSession('codex'); const codexId=activeProject().active;
    await wait(async () => (await api.attach(codexId)).data.includes('FIXTURE_CODEX_TTY'), 'Codex de test');
    select(codexId); runtimes.get(codexId).term.focus();
    await window.__TAURI__.core.invoke('native_smoke_report',{result:{stage:'keyboard',ok:null}});
    await wait(async ()=>(await api.attach(codexId)).data.includes('KEYS:616c70686120626574611b7f67616d6d61'), 'Ctrl Retour arrière natif');
    await wait(async ()=>(await api.attach(codexId)).data.includes('KEYS:1b5b31333b3275'), 'Maj Entrée natif');
    await api.copy('COLLAGE_NATIF');
    await window.__TAURI__.core.invoke('native_smoke_report',{result:{stage:'paste',ok:null}});
    await wait(async ()=>(await api.attach(codexId)).data.includes('434f4c4c4147455f4e41544946'), 'Ctrl Maj V natif');
    const quota=await api.quotas(true); check(quota.groups[0].windows[0].usedPercent===38, 'protocole des quotas');
    await chooseCompanion(codexId); check(document.querySelectorAll('.pet-choice').length===5, 'cinq compagnons'); closeModal();
    state.projects[0].sessions.find(s=>s.id===codexId).companion=4;
    await save(true); const saved=(await api.boot()).state; check(saved.projects[0].sessions.find(s=>s.id===codexId).companion===4,'persistance des pets');
    const before=await api.attach(shellId); await api.write({id:shellId,data:'echo STILL_SAME_PTY\r'}); await wait(async ()=>(await api.attach(shellId)).data.includes('STILL_SAME_PTY\r\n'),'PTY conservé');
    await api.removeSession(shellId); check(!(await api.boot()).state.projects[0].sessions.some(s=>s.id===shellId),'fermeture du PTY');
    await api.openStudio();
    await window.__TAURI__.core.invoke('native_smoke_report',{result:{ok:true,checks:['WebKitGTK réel','interface xterm','presse-papiers natif multiligne','shell PTY','resize PTY','Git','Codex fictif','quotas fictifs','catalogue 5 pets','persistance','fermeture PTY','ouverture atelier','Ctrl Retour arrière réel','Maj Entrée réel','Ctrl Maj V réel']}});
  } catch(error) { await window.__TAURI__.core.invoke('native_smoke_report',{result:{ok:false,error:String(error),stack:error.stack}}); }
})();
