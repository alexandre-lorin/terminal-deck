'use strict';
const $ = selector => document.querySelector(selector);
const api = window.deck, L = window.DeckLayout;
let state, boot, saveTimer, toastTimer, spotlight = null, pendingCreate = false;
let pointer = null;
const runtimes = new Map();
const companionSession = () => activeProject()?.sessions.find(s => s.id === activeProject().active && s.kind === 'codex') || activeProject()?.sessions.find(s => s.kind === 'codex');
const welcome = $('#welcome');
const activeProject = () => state.projects.find(p => p.id === state.activeProject);
const activeRuntime = () => runtimes.get(activeProject()?.active);
const sessionById = id => state.projects.flatMap(p => p.sessions).find(s => s.id === id);
const sessionTitle = s => runtimes.get(s.id)?.terminalTitle || s.title || s.name;
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200); }
function safely(task) { return Promise.resolve().then(task).catch(error => { toast(error.message || 'Action indisponible.'); }); }
function save(immediate = false) {
  clearTimeout(saveTimer);
  if (immediate) return api.save(state).catch(error => toast('Sauvegarde impossible : ' + error.message));
  saveTimer = setTimeout(() => save(true), 180);
}
function actionButton(text, title, action, className = '') {
  const button = el('button', className, text); button.title = title; button.setAttribute('aria-label', title); button.onclick = () => safely(action);
  const paths = { '⌕': 'M6 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m3-1 4 4', '◫': 'M2 2h10v10H2zM7 2v10', '−': 'M3 7h8', '⛶': 'M5 2H2v3m7-3h3v3M2 9v3h3m7-3v3H9', '×': 'm3 3 8 8m0-8-8 8' };
  if (className.includes('icon-button') && paths[text]) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), path = document.createElementNS(svg.namespaceURI, 'path');
    svg.setAttribute('viewBox', '0 0 14 14'); svg.setAttribute('aria-hidden', 'true'); path.setAttribute('d', paths[text]); svg.append(path); button.replaceChildren(svg);
  }
  return button;
}
function renderSidebar() {
  $('#projects').replaceChildren(...state.projects.map(p => {
    const group = el('div', 'project-group');
    const button = el('button', 'project' + (p.id === state.activeProject ? ' active' : ''));
    button.title = p.path; button.setAttribute('aria-current', p.id === state.activeProject ? 'page' : 'false');
    button.append(el('span', 'project-icon', '⌑'));
    const text = el('span', 'project-text'); text.append(el('strong', '', p.name));
    button.append(text);
    button.onclick = () => switchProject(p.id); group.append(button);
    if (p.id === state.activeProject && p.sessions.length) {
      const list = el('div', 'project-sessions');
      for (const s of p.sessions) {
        const item = actionButton('', sessionTitle(s), () => select(s.id), 'session-link' + (s.id === p.active ? ' active' : ''));
        item.dataset.sessionLink = s.id;
        item.classList.toggle('needs-attention', Boolean(runtimes.get(s.id)?.attention));
        item.append(el('span', 'session-link-state' + (runtimes.get(s.id)?.running ? ' live' : '') + (s.minimized ? ' minimized' : '')), el('span', 'session-link-title', (s.favorite ? '★ ' : '') + sessionTitle(s)));
        list.append(item);
      }
      group.append(list);
    }
    return group;
  }));
}
function updateSelection() {
  const p = activeProject(), s = p.sessions.find(s => s.id === p.active);
  window.DeckDictation?.selectionChanged();
  const microphone = document.querySelector('#dictation-button');
  if (microphone) { microphone.hidden = !boot.dictation; microphone.disabled = s?.kind !== 'codex' || !runtimes.get(s?.id)?.running; }
  for (const [id, runtime] of runtimes) runtime.pane.classList.toggle('selected', id === p.active);
  for (const tab of document.querySelectorAll('.session-tab')) tab.classList.toggle('active', tab.dataset.id === p.active);
  for (const link of document.querySelectorAll('.session-link')) link.classList.toggle('active', link.dataset.sessionLink === p.active);
  const title = s ? sessionTitle(s) : 'Terminal Deck';
  $('#active-title').textContent = title; $('#active-title').title = title;
  document.title = s ? `${title} — Terminal Deck` : 'Terminal Deck';
  globalThis.DeckUsage?.renderSessions();
}
function select(id, focus = true) {
  const session = activeProject().sessions.find(s => s.id === id); if (!session) return;
  const restored = session.minimized;
  if (session.minimized) { session.minimized = false; renderCanvas(); renderSidebar(); }
  activeProject().active = id; session.lastOpened = Date.now();
  const conversation = conversationRecord(session); if (conversation) conversation.lastOpened = session.lastOpened;
  acknowledge(id); updateSelection(); save(restored);
  if (spotlight && spotlight !== id) { spotlight = id; renderCanvas(); }
  if (focus) {
    const r = runtimes.get(id);
    if (r?.companionPin?.classList.contains('expanded')) r.companionPin.focus();
    else r?.term.focus();
  }
}
function switchProject(id) {
  window.DeckDictation?.cancel();
  state.activeProject = id; spotlight = null;
  render(); save();
}
function render() {
  const p = activeProject();
  $('#project-name').textContent = p.name;
  $('#project-name').title = p.path;
  $('#new-codex').disabled = welcome.querySelector('#welcome-codex').disabled = !boot.codex;
  $('#new-codex').title = boot.codex ? 'Retrouver une conversation · Échap pour un nouveau chat · Ctrl N' : 'Codex introuvable sur cette machine';
  renderSidebar(); renderCanvas(); updateSelection();
}
function renderCanvas() {
  const p = activeProject(), canvas = $('#canvas');
  const stage = el('div', 'stage');
  if (!p.sessions.length) { stage.append(welcome); canvas.replaceChildren(stage); return; }
  const minimized = p.sessions.filter(s => s.minimized);
  const shelf = el('div', 'minimized-tabs');
  for (const s of minimized) {
    const button = actionButton(`↗ ${sessionTitle(s)}`, `Restaurer ${sessionTitle(s)}`, () => select(s.id), 'minimized-tab');
    button.dataset.id = s.id; shelf.append(button);
  }
  const tabs = el('div', 'session-tabs');
  const visible = p.sessions.filter(s => !s.minimized);
  for (const s of visible) {
    const title = sessionTitle(s);
    const tab = actionButton(`${s.kind === 'codex' ? '✳' : '❯'}  ${title}`, `Sélectionner ${title}`, () => select(s.id), 'session-tab' + (s.id === p.active ? ' active' : ''));
    tab.dataset.id = s.id; tabs.append(tab);
  }
  tabs.append(actionButton(spotlight ? '▦ Tout afficher' : '⛶ Agrandir', 'Basculer entre mosaïque et panneau agrandi', toggleSpotlight, 'tab-view'));
  if (visible.length) stage.append(buildTree(spotlight ? L.leaf(p.active) : visibleTree(p.tree, new Set(visible.map(s => s.id)))));
  else { const empty = el('div', 'reduced-empty'); empty.append(el('p', '', 'Terminaux réduits'), el('small', '', 'Cliquez sur un titre pour restaurer son terminal.')); stage.append(empty); }
  canvas.replaceChildren(...(minimized.length ? [shelf] : []), ...(spotlight && visible.length ? [tabs] : []), stage);
  fitAll();
}
let paneDrag = null, suppressPaneClick = false;
function dropTarget(x, y, source) {
  const pane = document.elementFromPoint(x, y)?.closest('.terminal-pane');
  if (!pane || pane.dataset.sessionId === source || !activeProject().sessions.some(s => s.id === pane.dataset.sessionId && !s.minimized)) return null;
  const rect = pane.getBoundingClientRect(), nx = (x - rect.left) / rect.width, ny = (y - rect.top) / rect.height;
  const edges = [['left', nx], ['right', 1 - nx], ['top', ny], ['bottom', 1 - ny]].sort((a, b) => a[1] - b[1]);
  return { pane, rect, id: pane.dataset.sessionId, side: edges[0][1] < .25 ? edges[0][0] : 'center' };
}
function paintDrop(target) {
  const overlay = paneDrag?.overlay; if (!overlay) return;
  overlay.hidden = !target; if (!target) return;
  let { left, top, width, height } = target.rect;
  if (target.side === 'left' || target.side === 'right') { width /= 2; if (target.side === 'right') left += width; }
  if (target.side === 'top' || target.side === 'bottom') { height /= 2; if (target.side === 'bottom') top += height; }
  Object.assign(overlay.style, { left: `${left + 4}px`, top: `${top + 4}px`, width: `${Math.max(0, width - 8)}px`, height: `${Math.max(0, height - 8)}px` });
  overlay.textContent = target.side === 'center' ? 'Échanger les panneaux' : 'Placer ' + ({ left: 'à gauche', right: 'à droite', top: 'au-dessus', bottom: 'en dessous' })[target.side];
}
function finishPaneDrag(commit = false) {
  const drag = paneDrag; if (!drag) return;
  paneDrag = null; drag.overlay?.remove(); drag.pane.classList.remove('pane-moving'); document.body.classList.remove('pane-dragging');
  if (drag.pane.hasPointerCapture(drag.pointerId)) drag.pane.releasePointerCapture(drag.pointerId);
  if (drag.moved) { suppressPaneClick = true; setTimeout(() => { suppressPaneClick = false; }, 0); }
  if (!commit || !drag.moved || !drag.target || state.activeProject !== drag.projectId) return;
  const p = activeProject(), tree = L.move(p.tree, drag.id, drag.target.id, drag.target.side);
  if (tree === p.tree) return;
  p.tree = tree; p.sessions = L.ids(tree).map(id => p.sessions.find(s => s.id === id)); p.active = drag.id;
  render(); select(drag.id); save(true);
}
document.addEventListener('pointerdown', event => {
  if (!state || !event.ctrlKey || event.altKey || event.metaKey || event.button !== 0 || event.pointerType === 'touch' || $('#modal').open || spotlight || document.body.classList.contains('resizing')) return;
  const pane = event.target.closest('.terminal-pane'), control = event.target.closest('button,input,textarea,select,a,[contenteditable=true]');
  if (!pane || control && !control.classList.contains('pane-name') || activeProject().sessions.filter(s => !s.minimized).length < 2) return;
  event.preventDefault(); event.stopImmediatePropagation();
  finishPaneDrag();
  paneDrag = { id: pane.dataset.sessionId, pane, projectId: state.activeProject, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, target: null };
  pane.setPointerCapture(event.pointerId);
}, true);
document.addEventListener('pointermove', event => {
  if (!paneDrag || event.pointerId !== paneDrag.pointerId) return;
  if (!event.ctrlKey || !(event.buttons & 1)) { finishPaneDrag(); return; }
  if (!paneDrag.moved && Math.hypot(event.clientX - paneDrag.x, event.clientY - paneDrag.y) < 6) return;
  pointer = { x: event.clientX, y: event.clientY };
  event.preventDefault(); event.stopImmediatePropagation();
  if (!paneDrag.moved) {
    paneDrag.moved = true; paneDrag.pane.classList.add('pane-moving'); document.body.classList.add('pane-dragging');
    paneDrag.overlay = el('div', 'pane-drop-preview'); paneDrag.overlay.setAttribute('aria-hidden', 'true'); document.body.append(paneDrag.overlay);
  }
  paneDrag.target = dropTarget(event.clientX, event.clientY, paneDrag.id); paintDrop(paneDrag.target);
}, true);
document.addEventListener('pointerup', event => {
  if (!paneDrag || event.pointerId !== paneDrag.pointerId) return;
  paneDrag.target = dropTarget(event.clientX, event.clientY, paneDrag.id);
  event.preventDefault(); event.stopImmediatePropagation(); finishPaneDrag(event.ctrlKey);
}, true);
for (const type of ['pointercancel', 'lostpointercapture']) document.addEventListener(type, event => { if (paneDrag?.pointerId === event.pointerId) finishPaneDrag(); }, true);
document.addEventListener('click', event => { if (suppressPaneClick) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
document.addEventListener('keydown', event => {
  if (event.key === 'Control') document.body.classList.add('pane-drag-ready');
  if (paneDrag && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finishPaneDrag(); }
  else if (paneDrag && (isDeckShortcut(event) || event.ctrlKey && ['q', 't'].includes(event.key.toLowerCase()))) finishPaneDrag();
}, true);
document.addEventListener('keyup', event => { if (event.key === 'Control') { document.body.classList.remove('pane-drag-ready'); finishPaneDrag(); } }, true);
window.addEventListener('blur', () => { document.body.classList.remove('pane-drag-ready'); finishPaneDrag(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) finishPaneDrag(); });
function visibleTree(tree, allowed) {
  if (!tree) return null;
  if (tree.type === 'leaf') return allowed.has(tree.id) ? tree : null;
  const a = visibleTree(tree.a, allowed), b = visibleTree(tree.b, allowed);
  return a && b ? (a === tree.a && b === tree.b ? tree : { ...tree, a, b, source: tree }) : a || b;
}
function buildTree(tree) {
  if (!tree) return el('div');
  if (tree.type === 'leaf') return runtimes.get(tree.id).pane;
  const root = el('div', 'split ' + tree.axis); root.style.flexDirection = tree.axis;
  const a = el('div', 'branch'), b = el('div', 'branch'), divider = el('div', 'divider');
  a.style.flex = `${tree.ratio} 1 0`; b.style.flex = `${1 - tree.ratio} 1 0`;
  a.append(buildTree(tree.a)); b.append(buildTree(tree.b));
  divider.setAttribute('role', 'separator'); divider.tabIndex = 0;
  divider.setAttribute('aria-label', 'Redimensionner les terminaux');
  divider.setAttribute('aria-orientation', tree.axis === 'row' ? 'vertical' : 'horizontal');
  function setRatio(ratio) {
    tree.ratio = Math.max(.15, Math.min(.85, ratio)); a.style.flex = `${tree.ratio} 1 0`; b.style.flex = `${1 - tree.ratio} 1 0`;
    if (tree.source) tree.source.ratio = tree.ratio;
    divider.setAttribute('aria-valuenow', Math.round(tree.ratio * 100)); fitAll();
  }
  divider.onpointerdown = event => {
    divider.setPointerCapture(event.pointerId); divider.classList.add('dragging'); document.body.classList.add('resizing');
    divider.onpointermove = e => { const rect = root.getBoundingClientRect(); setRatio(tree.axis === 'row' ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height); };
  };
  divider.onpointerup = divider.onlostpointercapture = () => { divider.onpointermove = null; divider.classList.remove('dragging'); document.body.classList.remove('resizing'); save(); };
  divider.onkeydown = event => { if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) { event.preventDefault(); setRatio(tree.ratio + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -.05 : .05)); save(); } };
  divider.ondblclick = () => { setRatio(.5); save(); };
  root.append(a, divider, b); return root;
}
function terminalTheme() {
  const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim();
  return { background: '#080808', foreground: '#cccccc', cursor: accent, cursorAccent: '#080808', selectionBackground: '#343434', black: '#26313d', red: '#ed929b', green: '#9bd6a6', yellow: '#e7c18d', blue: '#88b9e9', magenta: '#b7a2e8', cyan: '#80d7cf', white: '#d6e0e9', brightBlack: '#687d90', brightRed: '#ffa8b0', brightGreen: '#b4e8bd', brightYellow: '#f7d7a8', brightBlue: '#a7d3ff', brightMagenta: '#d4c1ff', brightCyan: '#9dece4', brightWhite: '#f4f7fa' };
}
async function makeRuntime(s) {
  const pane = el('section', 'terminal-pane'); pane.dataset.sessionId = s.id;
  pane.setAttribute('aria-label', `Terminal ${s.name}`);
  const header = el('div', 'pane-header'), stateLabel = el('span', 'pane-state', 'EN PAUSE');
  const companion = s.kind === 'codex' ? DeckCompanion.create(s.id, s.companion) : null;
  if (companion) pane.classList.add('codex-pane');
  
  const name = actionButton(s.name, 'Renommer cette session', () => renameSession(s.id), 'pane-name');
  if (companion) header.append(actionButton('♧', 'Choisir le compagnon de cette session', () => chooseCompanion(s.id), 'icon-button choose-companion'));
  header.title = 'Ctrl + glisser pour déplacer ce panneau';
  header.append(el('span', 'pane-kind', s.kind === 'codex' ? '✳' : '❯'), name, stateLabel,
    actionButton('⌕', 'Chercher dans la sortie · Ctrl F', () => openSearch(s.id), 'icon-button pane-secondary'),
    actionButton('◫', 'Ajouter un terminal à droite', () => addSession('shell', 'row', s.id), 'icon-button pane-secondary'),
    actionButton('−', 'Réduire ce panneau · Ctrl T', () => minimizeSession(s.id), 'icon-button minimize'),
    actionButton('⛶', 'Agrandir ce panneau', () => { select(s.id, false); toggleSpotlight(); }, 'icon-button'),
    actionButton('×', 'Fermer ce panneau', () => closeSession(s.id), 'icon-button close'),
    actionButton('···', 'Actions du panneau', () => paneActions(s.id), 'icon-button pane-more'));
  const host = el('div', 'terminal-host');
  const paused = el('div', 'paused');
  const pauseTitle = el('strong', '', 'Votre session vous attend.'), pauseDescription = el('p', '', 'Le dossier est prêt. Lancez la session quand vous le souhaitez.');
  const startButton = actionButton(s.kind === 'codex' ? '✳ Lancer Codex' : '❯ Lancer le terminal', 'Lancer cette session', () => startSession(s.id), 'primary');
  const seeOutput = actionButton('Voir la sortie', 'Afficher la sortie du terminal arrêté', () => { paused.hidden = true; }, 'see-output'); seeOutput.hidden = true;
  paused.append(el('span', 'pause-symbol', s.kind === 'codex' ? '✳' : '❯'), pauseTitle, pauseDescription, startButton, seeOutput);
  const searchBar = el('div', 'search-bar'); searchBar.hidden = true;
  const searchInput = el('input'); searchInput.placeholder = 'Chercher dans la sortie'; searchInput.setAttribute('aria-label', 'Chercher dans la sortie');
  const searchResult = el('small', '', '');
  const term = new Terminal({ fontFamily: 'DeckMono, "JetBrains Mono", monospace', fontSize: state.settings.fontSize, lineHeight: 1.22, cursorBlink: true, cursorStyle: 'bar', theme: terminalTheme(), scrollback: 6000, allowProposedApi: false, convertEol: false, screenReaderMode: false });
  const fit = new FitAddon.FitAddon(), search = new SearchAddon.SearchAddon(); term.loadAddon(fit); term.loadAddon(search);
  const runtime = { companion, pane, header, stateLabel, name, host, paused, pauseTitle, pauseDescription, seeOutput, startButton, term, fit, search, searchBar, searchInput, terminalTitle: '', identitySeen: Boolean(s.threadKey), running: false, attaching: true, replaying: true, nativeStatus: 'unknown', attention: null, pending: [], seq: 0, starting: false, closed: false };
  runtimes.set(s.id, runtime);
  companion?.element.addEventListener('companionchange', () => globalThis.DeckUsage?.renderSessions());
  if (companion) term.parser.registerOscHandler(7501, payload => { const next = DeckCompanion.parse(payload); if (next) activitySignal(s.id, next); companion.receive(payload); globalThis.DeckUsage?.renderSessions(); return true; });
  search.onDidChangeResults(result => { searchResult.textContent = result.resultCount ? `${result.resultIndex + 1}/${result.resultCount}` : '0'; });
  const find = backwards => { if (searchInput.value) search[backwards ? 'findPrevious' : 'findNext'](searchInput.value, { decorations: { matchBackground: '#625537', activeMatchBackground: '#bd9448', matchOverviewRuler: '#bd9448', activeMatchColorOverviewRuler: '#eec48d' } }); };
  searchInput.oninput = () => find(false);
  searchInput.onkeydown = event => { if (event.key === 'Escape') { searchBar.hidden = true; term.focus(); } if (event.key === 'Enter') find(event.shiftKey); };
  searchBar.append(searchInput, searchResult, actionButton('↑', 'Résultat précédent', () => find(true)), actionButton('↓', 'Résultat suivant', () => find(false)), actionButton('×', 'Fermer la recherche', () => { searchBar.hidden = true; term.focus(); }));
  pane.append(header, host);
  if (companion) {
    const pin = el('button', 'companion-pin'), scale = el('span', 'pane-companion-scale');
    pin.type = 'button'; pin.setAttribute('aria-label', 'Ouvrir l’écran de veille du chat'); pin.setAttribute('aria-pressed', 'false');
    function setExpanded(expanded) {
      pin.classList.toggle('expanded', expanded);
      runtime.resizeCompanion();
      pin.setAttribute('aria-pressed', String(expanded));
      pin.setAttribute('aria-label', expanded ? 'Fermer l’écran de veille du chat' : 'Ouvrir l’écran de veille du chat');
      if (!expanded) term.focus();
    }
    pin.onclick = event => { event.stopPropagation(); companion.greet(); setExpanded(!pin.classList.contains('expanded')); };
    pin.onpointermove = event => { const rect = pin.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; companion.lookAt(x < .35 ? 'left' : x > .65 ? 'right' : 'center'); };
    pin.onpointerleave = () => companion.lookAt(null);
    pin.onkeydown = event => {
      if (event.key === 'Escape' && pin.classList.contains('expanded')) {
        event.preventDefault(); event.stopPropagation(); setExpanded(false); term.focus();
      }
    };
    runtime.resizeCompanion = () => pin.style.setProperty('--pet-zoom', String(Math.max(3, Math.min(12, Math.min(pane.clientWidth, pane.clientHeight - 36) * .6 / 32))));
    runtime.companionPin = pin;
    scale.append(companion.element); pin.append(scale); pane.append(pin);
  }
  pane.append(paused, searchBar);
  pane.addEventListener('pointerdown', event => { if (!event.target.closest('button,input')) select(s.id, false); });
  pane.addEventListener('focusin', () => {
    if (state && !$('#modal').open && activeProject()?.active !== s.id && activeProject()?.sessions.some(session => session.id === s.id)) select(s.id, false);
  });
  pane.addEventListener('pointerenter', event => {
    if (!state || $('#modal').open || document.body.classList.contains('resizing') || event.buttons || event.pointerType === 'touch') return;
    const editing = document.activeElement?.closest('input,textarea,select,[contenteditable=true]');
    if (editing && !editing.classList.contains('xterm-helper-textarea')) return;
    if (activeProject()?.sessions.some(session => session.id === s.id)) select(s.id);
  });
  const scratch = el('div'); scratch.style.cssText = 'position:absolute;width:600px;height:350px;visibility:hidden'; document.body.append(scratch); scratch.append(pane); term.open(host); scratch.remove();
  term.attachCustomKeyEventHandler(event => {
    const key = event.key.toLowerCase();
    const paste = event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && key === 'v';
    const copy = event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && key === 'c';
    const newline = event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && event.key === 'Enter';
    if (paste || copy || newline) {
      if (event.type === 'keydown') {
        event.preventDefault(); event.stopPropagation();
        if (copy) { const text = term.getSelection(); if (text) safely(() => api.copy(text)); }
        if (paste && runtime.running) safely(async () => { const text = await api.paste(); if (!runtime.closed && runtime.running) term.paste(text); });
        if (newline && runtime.running) safely(() => api.write({ id: s.id, data: s.kind === 'codex' || term.buffer.active.type === 'alternate' ? '\x1b[13;2u' : '\x16\n' }));
      }
      return false;
    }
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.key === 'Backspace') {
      if (event.type === 'keydown') {
        event.preventDefault();
        if (runtime.running) safely(() => api.write({ id: s.id, data: '\x1b\x7f' }));
      }
      return false;
    }
    return !isDeckShortcut(event);
  });
  term.onTitleChange(title => {
    const clean = title.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 240);
    const identified = s.kind === 'codex' ? bindConversation(s, runtime, clean) : null;
    runtime.terminalTitle = identified ? identified.title : /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(clean) ? '' : clean;
    s.title = runtime.terminalTitle; save();
    const visible = sessionTitle(s);
    name.textContent = visible; name.title = `${visible} · Renommer ce panneau`;
    pane.setAttribute('aria-label', `Terminal ${visible}`);
    const tab = [...document.querySelectorAll('.session-tab')].find(tab => tab.dataset.id === s.id);
    if (tab) { tab.textContent = `${s.kind === 'codex' ? '✳' : '❯'}  ${visible}`; tab.title = visible; }
    const minimizedTab = [...document.querySelectorAll('.minimized-tab')].find(tab => tab.dataset.id === s.id);
    if (minimizedTab) { minimizedTab.textContent = `↗ ${visible}`; minimizedTab.title = `Restaurer ${visible}`; }
    const sidebarLink = [...document.querySelectorAll('.session-link')].find(link => link.dataset.sessionLink === s.id);
    if (sidebarLink) { sidebarLink.querySelector('.session-link-title').textContent = (s.favorite ? '★ ' : '') + visible; sidebarLink.title = visible; }
    updateSelection();
  });
  term.onData(data => { if (runtime.running) safely(() => api.write({ id: s.id, data })); });
  function preferAllConversations() {
    if (s.kind !== 'codex') return;
    const filter = DeckCodexPicker.inspect(term);
    companion?.setPickerVisible(Boolean(filter));
    if (!filter) { runtime.adjustedPicker = false; return; }
    if (filter === 'all') { runtime.adjustedPicker = true; return; }
    if (filter === 'cwd' && runtime.running && !runtime.adjustedPicker) {
      runtime.adjustedPicker = true;
      safely(() => api.write({ id: s.id, data: '\x1b[C' }));
    }
  }
  runtime.preferAllConversations = preferAllConversations;
  term.onWriteParsed(preferAllConversations);
  term.onBell(() => { if (!runtime.replaying) markAttention(s.id, 'Signal du terminal'); });
  runtime.observer = new ResizeObserver(() => { runtime.resizeCompanion?.(); fitRuntime(runtime, s.id); }); runtime.observer.observe(host);
  const snapshot = await api.attach(s.id);
  if (snapshot.data) term.write(snapshot.data, () => { runtime.replaying = false; safely(() => api.ack({ id: s.id, seq: snapshot.seq })); });
  if (!snapshot.data) runtime.replaying = false;
  runtime.seq = snapshot.seq; runtime.running = snapshot.running; runtime.attaching = false;
  for (const event of runtime.pending) receiveData(event); runtime.pending = [];
  updateRuntime(runtime, snapshot.exitCode);
  return runtime;
}
function fitRuntime(runtime, id) {
  if (!runtime.host.isConnected || runtime.host.clientWidth < 50 || runtime.host.clientHeight < 30) return;
  try { runtime.fit.fit(); if (runtime.running) safely(() => api.resize({ id, cols: runtime.term.cols, rows: runtime.term.rows })); } catch { /* Le panneau est en cours de déplacement. */ }
}
function fitAll() { requestAnimationFrame(() => { for (const [id, r] of runtimes) fitRuntime(r, id); }); }
function receiveData(event) {
  const runtime = runtimes.get(event.id); if (!runtime) return;
  if (runtime.attaching) { runtime.pending.push(event); return; }
  if (event.seq <= runtime.seq) return;
  runtime.seq = event.seq; runtime.term.write(event.data, () => { safely(() => api.ack({ id: event.id, seq: event.seq })); });
}
function updateRuntime(runtime, exitCode = null) {
  if (runtime.companionPin) runtime.companionPin.hidden = !runtime.running;
  if (!runtime.running) { runtime.companion?.set('unknown'); runtime.nativeStatus = 'unknown'; runtime.attention = null; refreshAttention(); }
  runtime.stateLabel.textContent = runtime.running ? 'EN COURS' : exitCode === null ? 'EN PAUSE' : `TERMINÉ · ${exitCode}`;
  runtime.stateLabel.classList.toggle('live', runtime.running); runtime.paused.hidden = runtime.running;
  if (exitCode !== null) {
    runtime.pauseTitle.textContent = 'Session terminée.'; runtime.pauseDescription.textContent = `Code de sortie : ${exitCode}. Vous pouvez consulter la sortie ou relancer.`; runtime.seeOutput.hidden = false;
  }
  updateSelection(); renderSidebar();
  runtime.preferAllConversations?.();
}
api.onData(receiveData);
api.onExit(({ id, exitCode }) => {
  const r = runtimes.get(id); if (!r) return;
  r.running = false; updateRuntime(r, exitCode);
  if (exitCode !== 0) markAttention(id, `Processus arrêté avec le code ${exitCode}`);
});
async function startSession(id, threadId = null, { focus = true } = {}) {
  const r = runtimes.get(id); if (!r || r.running || r.starting) return;
  r.nativeStatus = 'unknown'; acknowledge(id); r.starting = true; r.startButton.disabled = true; r.term.reset(); r.seq = 0;
  try {
    fitRuntime(r, id); await api.start({ id, cols: r.term.cols, rows: r.term.rows, ...(threadId ? { threadId } : {}) });
    const snapshot = await api.attach(id); r.running = snapshot.running;
    // Un processus très court peut déjà être terminé au retour de l’IPC.
    updateRuntime(r, snapshot.exitCode); if (focus) r.term.focus();
  } finally { r.starting = false; r.startButton.disabled = false; }
}
async function addSession(kind = 'codex', axis = null, target, threadId = null) {
  if (pendingCreate) return;
  pendingCreate = true;
  try {
    const p = activeProject();
    const { session, tree } = await api.addSession({ projectId: p.id, kind, target: target || p.active, axis });
    p.sessions.push(session); p.tree = axis ? tree : L.grid(p.sessions.map(s => s.id)); p.active = session.id; spotlight = null;
    await makeRuntime(session); render(); await startSession(session.id, threadId); save();
  } finally { pendingCreate = false; }
}
function modal(title, eyebrow = 'TERMINAL DECK') {
  $('#modal-title').textContent = title; $('#modal-eyebrow').textContent = eyebrow; $('#modal-body').replaceChildren();
  if (!$('#modal').open) $('#modal').showModal();
  return $('#modal-body');
}
function closeModal() {
  $('#modal').close();
  const r = activeRuntime();
  if (r?.companionPin?.classList.contains('expanded')) r.companionPin.focus();
  else r?.term.focus();
}
async function closeSession(id) {
  window.DeckDictation?.cancel();
  const r = runtimes.get(id); if (!r || r.closing) return;
  r.closing = true;
  try {
    await api.removeSession(id);
    r.observer.disconnect(); r.companion?.dispose(); r.term.dispose(); r.closed = true; runtimes.delete(id);
    const p = state.projects.find(p => p.sessions.some(s => s.id === id));
    p.sessions = p.sessions.filter(s => s.id !== id); p.tree = L.remove(p.tree, id);
    if (p.active === id) p.active = p.sessions.find(s => !s.minimized)?.id || null;
    spotlight = null; refreshAttention(); render(); save();
  } finally { r.closing = false; }
}
function minimizeSession(id) {
  window.DeckDictation?.cancel();
  const p = activeProject(), s = p.sessions.find(s => s.id === id);
  if (!s) return;
  s.minimized = true;
  if (p.active === id) p.active = p.sessions.find(s => !s.minimized)?.id || null;
  spotlight = null; render(); save(true);
}
function pointerSession() {
  if (!pointer) return null;
  return document.elementFromPoint(pointer.x, pointer.y)?.closest('.terminal-pane')?.dataset.sessionId || null;
}
function renameSession(id) {
  const s = sessionById(id), body = modal('Renommer la session', 'RENOMMER LA SESSION');
  const input = el('input'); input.value = sessionTitle(s); input.maxLength = 80; input.setAttribute('aria-label', 'Nom de la session');
  const apply = () => { s.name = input.value.trim() || s.name; s.title = ''; runtimes.get(id).terminalTitle = ''; runtimes.get(id).name.textContent = s.name; render(); save(); closeModal(); };
  input.onkeydown = event => { if (event.key === 'Enter') apply(); };
  body.append(input, actionButton('Enregistrer', 'Enregistrer le nom', apply, 'primary')); input.focus(); input.select();
}
async function addProject(folder) {
  const p = await api.addProject(folder); if (!p) return;
  if (!state.projects.some(x => x.id === p.id)) state.projects.push(p);
  switchProject(p.id); closeModal();
}
async function browseProjects() {
  const catalog = await api.catalog(), body = modal('Ouvrir un projet', 'OUVRIR UN PROJET');
  const input = el('input'); input.placeholder = 'Rechercher un dossier…'; input.setAttribute('aria-label', 'Rechercher un projet');
  const list = el('div', 'modal-list');
  function results() {
    const found = catalog.filter(p => p.name.toLocaleLowerCase().includes(input.value.toLocaleLowerCase()));
    list.replaceChildren(...found.map(p => {
      const button = el('button', 'modal-item'), info = el('div'); info.append(el('strong', '', p.name), el('small', '', p.path));
      button.append(el('span', '', '⌑'), info); button.onclick = () => safely(() => addProject(p.path)); return button;
    }));
    if (!found.length) list.append(el('p', '', 'Aucun dossier trouvé. Vous pouvez en choisir un ailleurs.'));
  }
  input.oninput = results; input.onkeydown = event => { if (event.key === 'Enter') list.querySelector('button')?.click(); };
  body.append(input, list, actionButton('↗ Choisir un autre dossier', 'Parcourir les dossiers', () => addProject())); results(); input.focus();
}
function toggleSpotlight() { if (!activeProject().sessions.length) return; spotlight = spotlight ? null : activeProject().active; render(); }
function toggleFocus() { document.body.classList.toggle('focus-mode'); $('#focus').classList.toggle('active', document.body.classList.contains('focus-mode')); fitAll(); }
function tidy() { spotlight = null; const p = activeProject(); p.tree = L.grid(p.sessions.map(s => s.id)); render(); save(); toast('Chaque terminal retrouve sa place.'); }
function changeFont(delta) { state.settings.fontSize = Math.max(11, Math.min(22, state.settings.fontSize + delta)); for (const r of runtimes.values()) r.term.options.fontSize = state.settings.fontSize; fitAll(); save(); }
function cycleTheme() { const themes = ['noir', 'graphite', 'cendre', 'perigee']; state.settings.theme = themes[(themes.indexOf(state.settings.theme) + 1) % themes.length]; applyTheme(); save(); }
function applyTheme() { document.body.dataset.theme = state.settings.theme; for (const r of runtimes.values()) r.term.options.theme = terminalTheme(); }
function openSearch(id = activeProject().active) { const r = runtimes.get(id); if (!r) return; r.searchBar.hidden = false; r.searchInput.focus(); }
function paneActions(id) {
  const s = sessionById(id); if (!s) return;
  const body = modal(sessionTitle(s), 'ACTIONS DU PANNEAU');
  const list = el('div', 'modal-list');
  const actions = [ ['Chercher dans la sortie', () => openSearch(id)], ['Renommer le panneau', () => renameSession(id)],
    ...(s.kind === 'codex' ? [['Choisir le compagnon', () => chooseCompanion(id)]] : []),
    [s.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris', () => setFavorite(s, !s.favorite)],
    ['Ajouter un terminal à droite', () => addSession('shell', 'row', id)],
    ['Agrandir ce panneau', () => { select(id, false); toggleSpotlight(); }],
    ['Réduire ce panneau', () => minimizeSession(id)], ['Fermer ce panneau', () => closeSession(id)] ];
  for (const [label, action] of actions) list.append(actionButton(label, label, () => { closeModal(); return action(); }, 'modal-item'));
  body.append(list); list.querySelector('button')?.focus();
}
function cycleSession(direction) {
  const sessions = activeProject().sessions.filter(s => !s.minimized);
  if (!sessions.length) return;
  const index = Math.max(0, sessions.findIndex(s => s.id === activeProject().active));
  select(sessions[(index + direction + sessions.length) % sessions.length].id);
}
function overview() { sessionLibrary(); }
function jumpToSession(id) {
  const p = state.projects.find(p => p.sessions.some(s => s.id === id));
  if (!p) { toast('Cette session a été fermée. Retrouvez la conversation via Codex.'); return; }
  switchProject(p.id); select(id); if ($('#modal').open) closeModal();
}
function acknowledge(id) {
  const r = runtimes.get(id); if (r) r.attention = null;
  refreshAttention(); renderSidebar();
}
function refreshAttention() {
  const count = [...runtimes.values()].filter(r => r.attention).length;
  const b = $('#attention-button'); b.hidden = !count; b.textContent = `◉ À votre attention · ${count}`;
}
function markAttention(id, reason) {
  const r = runtimes.get(id); if (!r || r.replaying || r.attention) return;
  r.attention = reason; r.pane.classList.add('attention-signal');
  setTimeout(() => r.pane.classList.remove('attention-signal'), 1800);
  refreshAttention(); renderSidebar();
  toast(`${sessionTitle(sessionById(id))} · ${reason}. Retrouvez-la dans « À votre attention ».`);
  safely(() => api.attention(id));
}
function activitySignal(id, next) {
  const r = runtimes.get(id), previous = r.nativeStatus;
  if (next === previous) return;
  r.nativeStatus = next;
  if (r.replaying) return;
  if (['working', 'idle', 'done', 'unknown'].includes(next)) { r.attention = null; refreshAttention(); renderSidebar(); }
  if (next === 'blocked' || next === 'error') markAttention(id, next === 'blocked' ? 'Intervention attendue' : 'Erreur signalée par Codex');
  if (next === 'done' && ['working', 'blocked'].includes(previous)) {
    state.history.unshift({ sessionId: id, title: sessionTitle(sessionById(id)), at: Date.now() });
    state.history = state.history.slice(0, 80); save();
  }
}
function conversationRecord(s) { return s?.kind === 'codex' ? state.conversations.find(c => c.key === (runtimes.get(s.id)?.conversationKey || s.threadKey) && !c.ambiguous) : null; }
function syncConversation(record) {
  for (const p of state.projects) for (const s of p.sessions) {
    const r = runtimes.get(s.id);
    if (s.kind !== 'codex' || (r?.conversationKey || s.threadKey) !== record.key) continue;
    s.favorite = record.favorite; s.companion = record.companion;
    r?.companion?.setCharacter(record.companion ?? DeckConversations.character(record.key));
  }
  renderSidebar(); globalThis.DeckUsage?.renderSessions();
}
function bindConversation(s, r, title) {
  const parsed = DeckConversations.parse(title);
  if (!parsed) { r.conversationKey = null; s.threadKey = null; return null; }
  let record = state.conversations.find(c => c.key === parsed.key);
  if (record && parsed.fullId && record.fullId && parsed.fullId !== record.fullId) record.ambiguous = true;
  if (record?.ambiguous) { r.conversationKey = null; s.threadKey = null; return parsed; }
  if (!record) {
    record = { ...parsed, favorite: !r.identitySeen && s.favorite === true, companion: !r.identitySeen ? s.companion ?? null : null, lastOpened: s.lastOpened || 0, projectId: state.projects.find(p => p.sessions.includes(s))?.id || null, ambiguous: false };
    if (state.conversations.length >= 500) { r.conversationKey = null; s.threadKey = null; return parsed; }
    state.conversations.push(record);
  }
  if (parsed.fullId) record.fullId = parsed.fullId;
  if (parsed.title) record.title = parsed.title;
  r.identitySeen = true; r.conversationKey = s.threadKey = record.key;
  syncConversation(record); return parsed;
}
function setFavorite(s, value, record = conversationRecord(s)) {
  if (record) { record.favorite = value; syncConversation(record); }
  else s.favorite = value;
  save(); renderSidebar();
}
async function openSavedConversation(record) {
  const existing = state.projects.flatMap(p => p.sessions).find(s => s.threadKey === record.key && runtimes.get(s.id)?.running);
  if (existing) { jumpToSession(existing.id); return; }
  const p = state.projects.find(p => p.id === record.projectId) || activeProject();
  switchProject(p.id); closeModal();
  await addSession('codex', null, null, record.fullId);
  if (!record.fullId) toast(`Retrouvez « ${record.title || 'cette conversation'} » dans le sélecteur Codex. Son identifiant complet n’a pas encore été communiqué.`);
}
function openCompanions() { if (state) chooseCompanion(companionSession()?.id); }
function chooseCompanion(id) {
  const s = id ? sessionById(id) : null, r = runtimes.get(id), selectable = Boolean(s && r?.companion);
  const body = modal(selectable ? 'Votre compagnon' : 'Vos compagnons', 'COMPAGNONS');
  body.append(el('p', 'library-note', !selectable ? 'Ouvrez un panneau Codex pour choisir son compagnon.' : conversationRecord(s) ? 'Ce compagnon suivra la conversation, même dans un autre panneau.' : 'Conversation non identifiée : ce choix reste lié au panneau.'));
  const choices = el('div', 'pet-choices');
  DeckPets.pets.forEach(({ name }, character) => {
    const button = actionButton('', `Choisir ${name}`, () => {
      const record = conversationRecord(s);
      if (record) { record.companion = character; syncConversation(record); }
      else { s.companion = character; r.companion.setCharacter(character); } save(true); closeModal(); globalThis.DeckUsage?.renderSessions();
    }, 'pet-choice');
    const preview = DeckCompanion.create(`choice-${character}`, character);
    const portrait = el('span', 'pet-choice-portrait'); portrait.append(preview.element);
    button.append(portrait, el('strong', '', name));
    button.disabled = !selectable;
    button.setAttribute('aria-pressed', String(selectable && Number(r.companion.element.dataset.mascot) === character)); choices.append(button);
  }); body.append(choices);
  if (!selectable) {
    const open = actionButton('Ouvrir Codex', 'Ouvrir un Codex pour choisir son compagnon', async () => { closeModal(); await addSession('codex'); chooseCompanion(activeProject().active); }, 'primary');
    open.disabled = !boot.codex; body.append(open);
  }
}
const foldSearch = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
function sessionLibrary(mode = 'all') {
  const body = modal(mode === 'attention' ? 'À votre attention' : 'Vos sessions', 'RETROUVER LE FIL');
  const input = el('input'); input.placeholder = 'Titre ou projet…'; input.setAttribute('aria-label', 'Rechercher une session');
  const filters = el('div', 'library-filters'), list = el('div', 'modal-list');
  let filter = mode, highlighted = 0;
  for (const [value, text] of [['all', 'Toutes'], ['favorites', 'Favoris'], ['recent', 'Récentes'], ['attention', 'À votre attention']]) {
    const button = actionButton(text, text, () => { filter = value; results(); }); button.dataset.filter = value; filters.append(button);
  }
  function results() {
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    const query = foldSearch(input.value.trim());
    const entries = state.projects.flatMap(p => p.sessions.map(s => ({ p, s, record: conversationRecord(s) })));
    const seen = new Set();
    const unique = entries.filter(row => { const key = row.record?.key; if (!key) return true; if (seen.has(key)) return false; seen.add(key); return true; });
    for (const record of state.conversations) {
      if (record.ambiguous || seen.has(record.key)) continue;
      const p = state.projects.find(p => p.id === record.projectId) || { name: 'Codex' };
      unique.push({ p, record, saved: true, s: { id: 'saved-' + record.key, kind: 'codex', name: record.title || 'Codex', ...record } });
    }
    const rows = unique
      .filter(({ p, s }) => foldSearch(`${sessionTitle(s)} ${p.name}`).includes(query) && (filter !== 'favorites' || s.favorite) && (filter !== 'attention' || runtimes.get(s.id)?.attention))
      .sort((a, b) => (filter === 'recent' ? 0 : Number(b.s.favorite) - Number(a.s.favorite)) || (b.s.lastOpened || 0) - (a.s.lastOpened || 0));
    highlighted = 0;
    list.replaceChildren(...rows.map(({ p, s, record, saved }) => {
      const row = el('div', 'library-row'), button = actionButton('', `Ouvrir ${sessionTitle(s)}`, () => saved ? openSavedConversation(record) : jumpToSession(s.id), 'modal-item');
      const info = el('div'); info.append(el('strong', '', sessionTitle(s)), el('small', '', `${p.name} · ${runtimes.get(s.id)?.attention || (saved ? 'À reprendre' : s.minimized ? 'Réduite' : runtimes.get(s.id)?.running ? 'Ouverte' : 'En pause')}${s.lastOpened ? ' · ' + new Date(s.lastOpened).toLocaleString('fr-FR') : ''}`)); button.append(info);
      const star = actionButton(s.favorite ? '★' : '☆', s.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris', () => { setFavorite(s, !s.favorite, record); results(); }, 'favorite-toggle');
      star.setAttribute('aria-pressed', String(s.favorite)); row.append(button, star); return row;
    }));
    if (!rows.length) list.append(el('p', 'library-note', 'Aucune session correspondante.'));
    mark();
  }
  function mark() {
    const buttons = [...list.querySelectorAll('.modal-item')];
    buttons.forEach((button, i) => button.classList.toggle('highlighted', i === highlighted));
    buttons[highlighted]?.scrollIntoView({ block: 'nearest' });
  }
  input.oninput = results;
  input.onkeydown = event => {
    const buttons = list.querySelectorAll('.modal-item');
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); highlighted = Math.max(0, Math.min(buttons.length - 1, highlighted + (event.key === 'ArrowDown' ? 1 : -1))); mark();
    }
    if (event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'd') {
      event.preventDefault(); buttons[highlighted]?.closest('.library-row')?.querySelector('.favorite-toggle')?.click(); input.focus();
    }
    if (event.key === 'Enter') { event.preventDefault(); buttons[highlighted]?.click(); }
  };
  body.append(input, filters, list, el('p', 'library-note', '↑ ↓ parcourir · Entrée ouvrir · Ctrl D favori. Les autres conversations restent dans le sélecteur Codex.'), actionButton('Toutes les conversations Codex ↗', 'Ouvrir le sélecteur natif', () => { closeModal(); return addSession('codex'); })); results(); input.focus();
}
function showHistory() {
  const body = modal('Tours terminés', 'LES DERNIÈRES FINS DE TOUR');
  body.append(el('p', 'library-note', 'Signal natif de fin, sans garantie de réussite. Aucun contenu des échanges conservé.'));
  const list = el('div', 'modal-list');
  for (const entry of state.history) {
    const row = el('div', 'library-row'), info = el('div');
    info.append(el('strong', '', entry.title), el('small', '', new Date(entry.at).toLocaleString('fr-FR')));
    const button = actionButton('', 'Revenir à cette session', () => jumpToSession(entry.sessionId), 'modal-item');
    button.append(info); button.disabled = !sessionById(entry.sessionId); if (button.disabled) button.title = 'Panneau fermé ; conversation accessible via Codex';
    row.append(button); list.append(row);
  }
  if (!state.history.length) list.append(el('p', 'library-note', 'Les prochaines fins de tour apparaîtront ici.'));
  body.append(list, actionButton('Effacer cet historique', 'Effacer uniquement les métadonnées des fins de tour', () => { state.history = []; save(true); showHistory(); }));
}
async function showGit() {
  const project = activeProject(), body = modal('Git · ' + project.name, 'PROJET / VERSIONNEMENT');
  const note = el('p', 'library-note', 'Lecture du dépôt…'); body.append(note);
  try {
    const result = await api.git(project.id);
    if (!body.isConnected || $('#modal-title').textContent !== 'Git · ' + project.name) return;
    body.replaceChildren();
    if (!result.repository) { body.append(el('p', 'library-note', 'Ce dossier ne se trouve pas dans un dépôt Git.')); return; }
    body.append(el('p', 'git-branch', result.branch));
    if (!result.files.length) body.append(el('p', 'library-note', 'Aucune modification locale.'));
    const list = el('div', 'git-files');
    for (const file of result.files) {
      const row = el('div', 'git-file'); row.append(el('code', '', file.status), el('span', '', file.previous ? file.previous + ' → ' + file.path : file.path)); list.append(row);
    }
    body.append(list, actionButton('Actualiser', 'Relire la branche et les changements', showGit));
  } catch (error) { note.textContent = error.message; }
}
$('#git-button').onclick = () => safely(showGit);
function palette() {
  const body = modal('Commandes', 'COMMANDES / NAVIGATION');
  const input = el('input'); input.placeholder = 'Une commande, un projet, une session…'; input.setAttribute('aria-label', 'Rechercher une commande');
  const list = el('div', 'modal-list'); let highlighted = 0;
  const commands = [
    ['⑂', 'Git du projet', 'Branche et fichiers modifiés, en lecture seule', '', showGit],
    ['✳', 'Ouvrir Codex', 'Toutes les conversations · Échap pour un nouveau chat', 'Ctrl N', () => addSession('codex')],
    ['❯', 'Nouveau terminal', 'Ouvrir votre shell dans le projet actif', 'Ctrl Maj N', () => addSession('shell')],
    ['⌑', 'Ouvrir un projet', 'Explorer vos dossiers de développement', '', browseProjects],
    ['◫', 'Diviser à droite', 'Un nouveau terminal à côté du panneau actif', 'Ctrl Maj D', () => addSession('shell', 'row')],
    ['⊟', 'Diviser en dessous', 'Un nouveau terminal sous le panneau actif', '', () => addSession('shell', 'column')],
    ['▦', 'Ranger les panneaux', 'Répartir les terminaux dans une grille équilibrée', '', tidy],
    ['⛶', 'Concentration', 'Faire toute la place au travail', 'Ctrl Maj F', toggleFocus],
    ['⌕', 'Rechercher les sessions', 'Favoris, récentes et recherche par titre', 'Ctrl Maj O', overview],
    ['◉', 'À votre attention', 'Sessions en attente d’une intervention', '', () => sessionLibrary('attention')],
    ['↶', 'Tours terminés', 'Historique léger des signaux de fin', '', showHistory],
    ['♧', 'Choisir le compagnon', 'Choisir le compagnon du Codex actif', '', openCompanions],
    ['◉', 'Radar', 'Retrouver toutes les sessions de tous les projets', 'Ctrl Maj O', overview],
    ['◴', 'Quotas Codex', 'Popup actualisé toutes les cinq minutes tant qu’il est ouvert', '', () => DeckUsage.open()],
    ['✧', 'Atelier des compagnons', 'Prévisualiser, cadrer et exporter les sprites dans le navigateur', '', () => api.openStudio()],
    ['◐', 'Changer de contraste', 'Noir → graphite → cendre → Périgée', '', cycleTheme],
    ['◌', 'Ambiance Périgée', 'Noir profond, accent violet discret', '', () => { state.settings.theme = 'perigee'; applyTheme(); save(); }],
    ['A+', 'Agrandir le texte', 'Augmenter la taille des terminaux', '', () => changeFont(1)],
    ['A−', 'Réduire le texte', 'Diminuer la taille des terminaux', '', () => changeFont(-1)],
    ['⌕', 'Chercher dans la sortie', 'Recherche dans le terminal actif', 'Ctrl F', openSearch],
    ['↗', 'Agrandir le panneau actif', 'Basculer entre les onglets et la mosaïque', 'Ctrl Maj Entrée', toggleSpotlight],
    ['−', 'Réduire le panneau actif', 'Garder le processus actif et masquer le panneau', '', () => { if (activeProject().active) minimizeSession(activeProject().active); }]
  ];
  for (const p of state.projects) {
    commands.push(['⌑', p.name, p.path, '', () => switchProject(p.id)]);
    for (const s of p.sessions) commands.push([s.kind === 'codex' ? '✳' : '❯', sessionTitle(s), p.name + ' / session', '', () => { switchProject(p.id); select(s.id); }]);
  }
  function results() {
    highlighted = 0; const query = input.value.toLocaleLowerCase();
    list.replaceChildren(...commands.filter(c => (c[1] + ' ' + c[2]).toLocaleLowerCase().includes(query)).map(c => {
      const button = el('button', 'modal-item'), info = el('div'); info.append(el('strong', '', c[1]), el('small', '', c[2])); button.append(el('span', '', c[0]), info); if (c[3]) button.append(el('kbd', '', c[3]));
      button.onclick = () => { closeModal(); safely(c[4]); }; return button;
    })); mark();
  }
  function mark() { [...list.children].forEach((child, i) => child.classList.toggle('highlighted', i === highlighted)); list.children[highlighted]?.scrollIntoView({ block: 'nearest' }); }
  input.oninput = results;
  input.onkeydown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); highlighted = Math.max(0, Math.min(list.children.length - 1, highlighted + (event.key === 'ArrowDown' ? 1 : -1))); mark(); }
    if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); list.children[highlighted]?.click(); }
  };
  body.append(input, list); results(); input.focus();
}
function isDeckShortcut(event) {
  if (!event.ctrlKey && !event.metaKey) return event.altKey && /^[1-9]$/.test(event.key);
  const key = event.key.toLowerCase();
  return ['k', 'n', 'f', 'pageup', 'pagedown'].includes(key) || (event.shiftKey && ['d', 'o', 'w', 'enter'].includes(key));
}
document.addEventListener('keydown', event => {
  if (!state || $('#modal').open || event.type !== 'keydown') return;
  if (event.altKey && /^[1-9]$/.test(event.key)) { const s = activeProject().sessions[Number(event.key) - 1]; if (s) { event.preventDefault(); select(s.id); } return; }
  if (!event.ctrlKey && !event.metaKey) return;
  const key = event.key.toLowerCase(); let action;
  if (event.ctrlKey && !event.altKey && !event.shiftKey && ['pageup', 'pagedown'].includes(key)) action = () => cycleSession(key === 'pageup' ? -1 : 1);
  if (key === 'k') action = palette;
  if (key === 'n') action = () => addSession(event.shiftKey ? 'shell' : 'codex');
  if (key === 'f') action = event.shiftKey ? toggleFocus : () => openSearch();
  if (event.shiftKey && key === 'd') action = () => addSession('shell', 'row');
  if (event.shiftKey && key === 'o') action = overview;
  if (event.shiftKey && key === 'w' && activeProject().active) action = () => closeSession(activeProject().active);
  if (key === 'enter' && event.shiftKey) action = toggleSpotlight;
  if (action) { event.preventDefault(); safely(action); }
});
document.addEventListener('pointermove', event => { pointer = { x: event.clientX, y: event.clientY }; });
document.addEventListener('pointerleave', () => { pointer = null; });
document.addEventListener('keydown', event => {
  if (!state || $('#modal').open || !event.ctrlKey || event.shiftKey || event.altKey || event.metaKey || !['q', 't'].includes(event.key.toLowerCase())) return;
  event.preventDefault(); event.stopImmediatePropagation();
  if (event.repeat) return;
  const id = pointerSession();
  if (id) safely(() => event.key.toLowerCase() === 'q' ? closeSession(id) : minimizeSession(id));
}, true);
$('#modal-close').onclick = closeModal;
$('#modal').addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
$('#modal').addEventListener('click', event => { if (event.target === $('#modal')) { const r = $('#modal').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
$('#palette-button').onclick = $('#more-button').onclick = palette;
$('#add-project').onclick = $('#browse-projects').onclick = () => safely(browseProjects);
$('#new-codex').onclick = $('#welcome-codex').onclick = () => safely(() => addSession('codex'));
$('#new-shell').onclick = $('#welcome-shell').onclick = () => safely(() => addSession('shell'));
$('#focus').onclick = toggleFocus;
$('#companions-button').onclick = openCompanions;
$('#sessions-button').onclick = overview;
$('#history-button').onclick = showHistory;
$('#attention-button').onclick = () => sessionLibrary('attention');
api.onNavigate(id => { if (state) jumpToSession(id); });
window.addEventListener('beforeunload', () => { if (state) save(true); });
safely(async () => {
  boot = await api.boot(); state = boot.state; applyTheme();
  for (const p of state.projects) for (const s of p.sessions) await makeRuntime(s);
  render();
  if (boot.openCodex && boot.codex) await openStartupCodex();
});

async function waitForCodexStartup(runtime) {
  // Le premier TUI initialise éventuellement la base locale : attendre son écran natif
  // avant d'ouvrir d'autres clients, sans lire le contenu des conversations.
  await new Promise(resolve => {
    let interval, timeout;
    const done = () => { clearInterval(interval); clearTimeout(timeout); resolve(); };
    const ready = () => {
      if (runtime.closed || !runtime.running || DeckCodexPicker.inspect(runtime.term) || runtime.companion?.element.dataset.status !== 'unknown') done();
    };
    interval = setInterval(ready, 80); timeout = setTimeout(done, 10000); ready();
  });
}
async function openStartupCodex() {
  const p = activeProject();
  const sessions = p.sessions.filter(s => s.kind === 'codex');
  if (!sessions.length) { await addSession('codex'); return; }
  const failures = []; let first = true;
  for (const s of sessions) {
    try {
      await startSession(s.id, null, { focus: false });
      if (first) { first = false; const r = runtimes.get(s.id); if (r?.running) await waitForCodexStartup(r); }
    }
    catch (error) { failures.push(`${sessionTitle(s)} : ${error.message || 'lancement impossible'}`); }
  }
  // Préserver le panneau choisi et les réductions, même si l’utilisateur navigue pendant le démarrage.
  if (state.activeProject === p.id && !$('#modal').open && !document.activeElement?.closest('input,button,select')) {
    const r = activeRuntime();
    if (r?.companionPin?.classList.contains('expanded')) r.companionPin.focus();
    else r?.term.focus();
  }
  if (failures.length) toast('Certains Codex n’ont pas démarré : ' + failures.join(' · '));
}
