/* Dictée simple : microphone, transcription à relire, envoi explicite au PTY ciblé. */
(() => {
  let context, busy = false, meterTimer;
  const ui = document.createElement('section');
  ui.className = 'dictation'; ui.hidden = true; ui.setAttribute('aria-label', 'Dictée');
  ui.innerHTML = '<div class="dictation-head"><span class="dictation-label" role="status"></span><button class="dictation-cancel" title="Annuler · Échap" aria-label="Annuler la dictée">×</button></div><div class="dictation-capture"><div class="dictation-meter" aria-hidden="true"></div><span class="dictation-time">0:00</span></div><textarea class="dictation-text" aria-label="Transcription à relire" placeholder="Votre transcription…" hidden></textarea><div class="dictation-foot"><span class="dictation-hint"></span><button class="dictation-confirm primary">Terminer</button></div>';
  document.body.append(ui);
  const $ = s => ui.querySelector(s), text = $('.dictation-text'), label = $('.dictation-label'), hint = $('.dictation-hint'), confirm = $('.dictation-confirm');
  for (let i = 0; i < 22; i++) $('.dictation-meter').append(document.createElement('i'));
  const available = () => Boolean(boot?.dictation && api.dictation);
  function sameTarget(c) { return context === c && state?.activeProject === c.project && activeProject()?.active === c.id && runtimes.get(c.id) === c.runtime && c.runtime.running && !c.runtime.closed; }
  function stage(phase) {
    context.phase = phase; ui.dataset.phase = phase;
    text.hidden = phase !== 'review'; $('.dictation-capture').hidden = phase === 'review';
    confirm.disabled = !['recording', 'review'].includes(phase);
    confirm.textContent = phase === 'review' ? 'Envoyer ↑' : 'Terminer ✓';
    label.textContent = ({ starting: 'Ouverture du micro…', recording: 'Je vous écoute', transcribing: 'Transcription…', review: 'Relire votre message', sending: 'Envoi…' })[phase];
    hint.textContent = phase === 'recording' ? 'F9 ou Entrée pour terminer' : phase === 'review' ? 'Entrée pour envoyer · Maj Entrée pour une ligne' : 'Échap pour annuler';
    ui.setAttribute('aria-busy', ['starting', 'transcribing', 'sending'].includes(phase) ? 'true' : 'false');
  }
  async function cancel() {
    const c = context; if (!c) return;
    context = null; clearInterval(meterTimer); ui.hidden = true; text.value = '';
    try { await api.dictation({ action: 'cancel', id: c.id, token: c.token }); } catch {}
    if (state?.activeProject === c.project && activeProject()?.active === c.id && !c.runtime.closed) c.runtime.term.focus();
  }
  async function open() {
    if (!available() || context || document.querySelector('#modal')?.open) return;
    const runtime = activeRuntime(), session = runtime && sessionById(activeProject()?.active);
    if (!runtime?.running || session?.kind !== 'codex') { toast('Ouvrez le champ de message d’un Codex pour dicter.'); return; }
    const c = context = { id: session.id, project: state.activeProject, runtime, token: crypto.randomUUID(), phase: 'starting' };
    runtime.pane.append(ui); ui.hidden = false; text.value = ''; stage('starting'); $('.dictation-cancel').focus();
    try {
      await api.dictation({ action: 'start', id: c.id, token: c.token });
      if (!sameTarget(c)) { if (context === c) await cancel(); return; }
      stage('recording');
      meterTimer = setInterval(async () => {
        if (busy || context !== c || c.phase !== 'recording') return;
        busy = true;
        try {
          if (!sameTarget(c)) { await cancel(); return; }
          const value = await api.dictation({ action: 'level', id: c.id, token: c.token });
          if (context !== c) return;
          const strength = Math.min(1, value.level * 14);
          for (const [i, bar] of [...$('.dictation-meter').children].entries()) bar.style.height = `${3 + strength * (12 + 17 * Math.sin((i + 1) / 23 * Math.PI))}px`;
          $('.dictation-time').textContent = `${Math.floor(value.seconds / 60)}:${String(value.seconds % 60).padStart(2, '0')}`;
        } catch (error) { if (context === c) { await cancel(); toast(error.message); } }
        finally { busy = false; }
      }, 130);
    } catch (error) { if (context === c) { await cancel(); toast(error.message); } }
  }
  async function finish() {
    const c = context; if (!c || c.phase !== 'recording') return;
    clearInterval(meterTimer); stage('transcribing');
    for (const bar of $('.dictation-meter').children) bar.style.height = '3px';
    try {
      const result = await api.dictation({ action: 'finish', id: c.id, token: c.token });
      if (!sameTarget(c)) { if (context === c) await cancel(); return; }
      text.value = result; stage('review'); text.focus(); text.setSelectionRange(text.value.length, text.value.length);
    } catch (error) { if (context === c) { await cancel(); toast(error.message); } }
  }
  async function send() {
    const c = context; if (!c || c.phase !== 'review' || !text.value.trim()) return;
    if (!sameTarget(c)) { await cancel(); return; }
    // Texte et Entrée envoyés dans un seul IPC au panneau exact. Aucun presse-papiers.
    const message = text.value.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '').replace(/\r?\n/g, ' ').trim().slice(0, 16000);
    if (!message) return;
    stage('sending');
    try {
      const paste = c.runtime.term.modes.bracketedPasteMode ? `\x1b[200~${message}\x1b[201~` : message;
      await api.write({ id: c.id, data: paste + '\r' });
      if (context === c) await cancel();
    } catch (error) { if (context === c) { stage('review'); toast(error.message); } }
  }
  $('.dictation-cancel').onclick = cancel;
  document.querySelector('#dictation-button').onclick = open;
  confirm.onclick = () => context?.phase === 'review' ? send() : finish();
  document.addEventListener('keydown', event => {
    if (!available()) return;
    if (event.key === 'F9' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) context ? finish() : open();
    } else if (context && event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); cancel();
    } else if (context && event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) context.phase === 'review' ? send() : finish();
    }
  }, true);
  window.addEventListener('beforeunload', cancel);
  window.DeckDictation = { open, cancel, selectionChanged: () => { if (context && !sameTarget(context)) cancel(); } };
})();
