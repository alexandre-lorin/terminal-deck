(function (root) {
  'use strict';
  function parse(payload) {
    if (payload === 'state=clear') return 'unknown';
    if (typeof payload !== 'string' || payload.length > 160) return null;
    const fields = Object.fromEntries(payload.split(':').map(part => part.split('=')));
    return fields.app === 'codex' && ['idle', 'working', 'blocked', 'done', 'error'].includes(fields.state) ? fields.state : null;
  }
  const catalog = typeof module === 'object' && module.exports ? require('./pets.js') : root.DeckPets;
  const names = catalog.pets.map(p => p.label);
  const labels = { unknown: 'État non communiqué', idle: 'Au repos', working: 'Codex travaille', blocked: 'Codex attend une intervention', done: 'Tour terminé', error: 'Codex signale une erreur' };
  function create(id, selectedCharacter = null) {
    let character = catalog.valid(selectedCharacter) ? selectedCharacter : catalog.defaultCharacter(id);
    const element = document.createElement('span');
    element.className = 'pane-companion mascot-trio'; element.dataset.mascot = String(character);
    element.setAttribute('role', 'img');
    let sleepTimer, yawnTimer, wakeTimer, greetingTimer, disposed = false, pickerVisible = false, greeting = false, looking = null;
    const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const resting = () => ['idle', 'done', 'unknown'].includes(element.dataset.status);
    const pose = status => status === 'blocked' ? 'waiting' : greeting && resting() ? 'greeting' : status === 'unknown' || looking || (pickerVisible && ['idle', 'done'].includes(status)) ? 'curious' : 'default';
    const notify = () => element.dispatchEvent(new Event('companionchange'));
    function describe() {
      element.title = `${names[character]} · ${element.dataset.sleeping === 'true' ? 'Dodo (Codex au repos)' : labels[element.dataset.status]}`;
      element.setAttribute('aria-label', element.title);
    }
    function clearOutgoing() {
      const layer = element.querySelector('.companion-outgoing');
      layer?.getAnimations().forEach(animation => animation.cancel()); layer?.remove();
    }
    function updateAtlas() {
      const pet = catalog.pets[character];
      const properties = ['--pet-row', '--pose-row', '--companion-row', '--sleep-row', '--greeting-row', '--yawn-row'];
      if (!pet.file) { properties.forEach(p => element.style.removeProperty(p)); return; }
      const pose = element.dataset.pose;
      const row = element.dataset.sleeping === 'true' || pose === 'drowsy' ? 4 : pose === 'waking' ? 5 : pose === 'greeting' ? 3 : pose === 'waiting' ? 2 : element.dataset.status === 'working' ? 1 : 0;
      properties.forEach(p => element.style.setProperty(p, `${-pet.rows[row]}px`));
    }
    function transition(change) {
      const previous = element.isConnected && !reduced() ? getComputedStyle(element) : null;
      const outgoing = previous ? document.createElement('span') : null;
      if (outgoing) {
        outgoing.className = 'companion-outgoing'; outgoing.setAttribute('aria-hidden', 'true');
        for (const property of ['backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'clipPath']) outgoing.style[property] = previous[property];
      }
      clearOutgoing(); change(); updateAtlas();
      if (outgoing) {
        element.append(outgoing);
        outgoing.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: 'ease-out', fill: 'forwards' }).finished.then(() => outgoing.remove()).catch(() => outgoing.remove());
      }
    }
    function visualChange(change) { transition(change); notify(); }
    function clearTimers() { clearTimeout(sleepTimer); clearTimeout(yawnTimer); clearTimeout(wakeTimer); clearTimeout(greetingTimer); }
    function set(status) {
      if (disposed || !Object.hasOwn(labels, status) || element.dataset.status === status) return;
      const waking = element.dataset.sleeping === 'true';
      clearTimers(); greeting = false; looking = null; delete element.dataset.look;
      transition(() => {
        element.dataset.status = status; element.dataset.sleeping = 'false';
        element.dataset.pose = waking ? 'waking' : pose(status);
      });
      if (waking) wakeTimer = setTimeout(() => visualChange(() => { element.dataset.pose = pose(element.dataset.status); }), 1200);
      describe();
      if (status === 'idle' || status === 'done') {
        yawnTimer = setTimeout(() => {
          greeting = false; clearTimeout(greetingTimer); looking = null; delete element.dataset.look;
          visualChange(() => { element.dataset.pose = 'drowsy'; });
        }, 43200);
        sleepTimer = setTimeout(() => {
          transition(() => { element.dataset.sleeping = 'true'; element.dataset.pose = 'sleeping'; });
          describe(); notify();
        }, 45000);
      }
    }
    set('unknown');
    return {
      element, set,
      greet() {
        if (disposed || reduced() || !resting() || greeting || element.dataset.sleeping === 'true' || ['waking', 'drowsy'].includes(element.dataset.pose)) return false;
        greeting = true; delete element.dataset.look;
        visualChange(() => { element.dataset.pose = 'greeting'; });
        greetingTimer = setTimeout(() => { greeting = false; visualChange(() => { element.dataset.pose = pose(element.dataset.status); }); }, 1600);
        return true;
      },
      lookAt(direction) {
        if (disposed || reduced() || !resting() || greeting || element.dataset.sleeping === 'true' || ['waking', 'drowsy'].includes(element.dataset.pose)) return;
        const next = ['left', 'right', 'center'].includes(direction) ? direction : null;
        if (looking === next) return;
        looking = next;
        visualChange(() => { if (next) element.dataset.look = next; else delete element.dataset.look; element.dataset.pose = pose(element.dataset.status); });
      },
      syncVisual(source) {
        if (!source || disposed) return;
        const sleeping = source.dataset.sleeping || 'false', nextPose = source.dataset.pose || 'curious';
        if (element.dataset.sleeping !== sleeping || element.dataset.pose !== nextPose) transition(() => { element.dataset.sleeping = sleeping; element.dataset.pose = nextPose; });
        if (source.dataset.look) element.dataset.look = source.dataset.look; else delete element.dataset.look;
        describe();
      },
      setCharacter(value) {
        if (disposed || value === character || !catalog.valid(value)) return;
        character = value; element.dataset.mascot = String(value); updateAtlas(); describe(); notify();
      },
      setPickerVisible(visible) {
        if (disposed || pickerVisible === visible) return;
        pickerVisible = visible;
        if (element.dataset.sleeping !== 'true' && !['waking', 'drowsy'].includes(element.dataset.pose)) visualChange(() => { element.dataset.pose = pose(element.dataset.status); });
      },
      dispose() { disposed = true; clearTimers(); clearOutgoing(); },
      receive(payload) { const status = parse(payload); if (status) set(status); }
    };
  }
  const api = { parse, create };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DeckCompanion = api;
})(typeof globalThis === 'object' ? globalThis : this);
