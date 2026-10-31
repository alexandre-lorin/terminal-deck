(function () {
  'use strict';
  const popup = document.querySelector('#usage-popup');
  const button = document.querySelector('#usage-button');
  let snapshot = null, loading = false, refreshTimer, clockTimer;
  let companionIndex = -1;
  let popupCompanion = null, popupCompanionKey = null;
  const node = (tag, className, text) => { const n = document.createElement(tag); n.className = className || ''; if (text !== undefined) n.textContent = text; return n; };
  const duration = minutes => !minutes ? 'Fenêtre' : minutes >= 1440 && minutes % 1440 === 0 ? `${minutes / 1440} j` : minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`;
  function resetLabel(seconds) {
    if (!seconds) return 'Réinitialisation inconnue';
    const minutes = Math.ceil((seconds * 1000 - Date.now()) / 60000);
    if (minutes <= 0) return 'Réinitialisation à revérifier';
    const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), rest = minutes % 60;
    return 'Reprise annoncée dans ' + (days ? `${days} j ${hours} h` : hours ? `${hours} h ${String(rest).padStart(2, '0')}` : `${rest} min`);
  }
  function renderCompanion() {
    if (!state) return;
    const s = companionSession();
    const key = s?.id || `preview-${companionIndex}`;
    const slot = document.querySelector('#usage-mascot');
    if (key !== popupCompanionKey) {
      popupCompanion?.dispose();
      popupCompanionKey = key;
      popupCompanion = DeckCompanion.create(key, s ? null : Math.max(0, companionIndex));
      slot.replaceChildren(popupCompanion.element);
    }
    const status = s ? runtimes.get(s.id)?.companion?.element.dataset.status || 'unknown' : 'unknown';
    if (popupCompanion.element.dataset.status !== status) popupCompanion.set(status);
    if (s) popupCompanion.setCharacter(Number(runtimes.get(s.id)?.companion?.element.dataset.mascot ?? 0));
    if (s) popupCompanion.syncVisual(runtimes.get(s.id)?.companion?.element);
    slot.dataset.mascot = popupCompanion.element.dataset.mascot;
    slot.dataset.sessionId = s?.id || '';
  }
  function renderSessions() {
    renderCompanion();
    const list = document.querySelector('#usage-sessions'); list.replaceChildren();
    if (!state) return;
    const sessions = state.projects.flatMap(p => p.sessions.filter(s => s.kind === 'codex').map(s => ({ p, s })));
    if (!sessions.length) return;
    list.append(node('div', 'usage-section-label', 'DANS LE DECK'));
    for (const { p, s } of sessions.slice(0, 3)) {
      const item = node('button', 'usage-session');
      const indicator = node('span', 'usage-session-dot' + (runtimes.get(s.id)?.running ? ' live' : ''));
      indicator.title = runtimes.get(s.id)?.running ? 'Processus actif' : 'Processus arrêté';
      item.append(indicator, node('span', '', sessionTitle(s)));
      item.title = `${p.name} · ${sessionTitle(s)}`;
      item.onclick = () => { switchProject(p.id); select(s.id); };
      list.append(item);
    }
  }
  function paint() {
    const area = document.querySelector('#usage-groups'); area.replaceChildren();
    const groups = snapshot?.groups || [];
    let caption = loading ? 'Actualisation en cours…' : snapshot?.status === 'ready' ? 'Quota restant déclaré par Codex.' : snapshot?.status === 'stale' ? 'Dernier relevé conservé · connexion indisponible.' : 'Quotas indisponibles.';
    document.querySelector('#usage-caption').textContent = caption;
    for (const group of groups) {
      const section = node('div', 'usage-group');
      if (groups.length > 1) section.append(node('h3', '', group.name));
      for (const w of group.windows) {
        const row = node('div', 'quota-window'); row.dataset.level = w.usedPercent >= 100 ? 'full' : w.usedPercent >= 80 ? 'high' : 'normal';
        const remaining = Math.max(0, Math.min(100, 100 - w.usedPercent));
        const heading = node('div', 'quota-heading');
        heading.append(node('span', 'quota-name', duration(w.windowDurationMins)), node('span', 'quota-value', `${Math.round(remaining)} % restant`));
        const track = node('div', 'quota-track'), bar = node('div', 'quota-fill'); bar.style.width = `${remaining}%`;
        track.setAttribute('role', 'progressbar'); track.setAttribute('aria-label', `${group.name}, ${duration(w.windowDurationMins)}, quota restant`);
        track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100'); track.setAttribute('aria-valuenow', String(remaining)); track.append(bar);
        const reset = node('p', 'quota-reset', resetLabel(w.resetsAt));
        if (w.resetsAt) reset.title = new Date(w.resetsAt * 1000).toLocaleString('fr-FR');
        row.append(heading, track, reset); section.append(row);
      }
      area.append(section);
    }
    if (!groups.length) {
      const messages = { missing: 'Codex est introuvable sur cette machine.', unsupported: 'Cette version du CLI ne fournit pas ce relevé.', authentication: 'Le relevé nécessite une connexion de Codex à votre compte ChatGPT.', empty: 'Ce compte ne fournit pas de fenêtres de quota.', timeout: 'Le service met trop de temps à répondre.' };
      area.append(node('p', 'usage-empty', loading ? 'Les pourcentages apparaîtront après un relevé fiable.' : messages[snapshot?.reason] || 'Vérifiez la connexion de Codex, puis actualisez.'));
    }
    const age = document.querySelector('#usage-age');
    const elapsed = snapshot?.updatedAt ? Math.max(0, Math.floor((Date.now() - snapshot.updatedAt) / 60000)) : null;
    age.textContent = elapsed === null ? 'Aucun relevé' : elapsed < 1 ? 'Actualisé à l’instant' : `Relevé il y a ${elapsed} min`;
    age.title = snapshot?.updatedAt ? new Date(snapshot.updatedAt).toLocaleString('fr-FR') : '';
    document.querySelector('#usage-refresh').disabled = loading;
    popup.dataset.status = snapshot?.status || 'loading';
    renderSessions();
    if (!popup.hidden && popup.style.top) {
      popup.style.top = Math.max(8, Math.min(innerHeight - popup.offsetHeight - 8, parseFloat(popup.style.top))) + 'px';
    }
  }
  async function refresh(force = false) {
    if (loading) return;
    loading = true; paint();
    try { snapshot = await window.deck.quotas(force); }
    catch { snapshot = snapshot?.groups?.length ? { ...snapshot, status: 'stale' } : { status: 'unavailable', groups: [] }; }
    finally { loading = false; if (!popup.hidden) paint(); }
  }
  function close() {
    popup.hidden = true; button.setAttribute('aria-expanded', 'false');
    clearInterval(refreshTimer); clearInterval(clockTimer);
  }
  function open() {
    if (!popup.hidden) return;
    companionIndex = (companionIndex + 1) % DeckPets.pets.length;
    popup.hidden = false; button.setAttribute('aria-expanded', 'true'); paint(); refresh();
    refreshTimer = setInterval(() => refresh(true), 300000);
    clockTimer = setInterval(paint, 30000);
  }
  button.onclick = () => popup.hidden ? open() : close();
  document.querySelector('#usage-close').onclick = close;
  document.querySelector('#usage-refresh').onclick = () => refresh(true);
  popup.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); button.focus(); } });
  const handle = document.querySelector('#usage-handle');
  handle.onpointerdown = event => {
    if (event.target.closest('button')) return;
    event.preventDefault(); handle.setPointerCapture(event.pointerId);
    const rect = popup.getBoundingClientRect(), startX = event.clientX, startY = event.clientY;
    handle.onpointermove = e => {
      popup.style.right = 'auto';
      popup.style.bottom = 'auto';
      popup.style.left = Math.max(8, Math.min(innerWidth - popup.offsetWidth - 8, rect.left + e.clientX - startX)) + 'px';
      popup.style.top = Math.max(8, Math.min(innerHeight - popup.offsetHeight - 8, rect.top + e.clientY - startY)) + 'px';
    };
  };
  handle.onpointerup = handle.onlostpointercapture = () => { handle.onpointermove = null; };
  window.DeckUsage = { open, close, renderSessions: () => { if (!popup.hidden) renderSessions(); } };
})();
