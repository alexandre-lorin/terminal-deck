'use strict';
const mode = document.body.dataset.mode;
const examples = [
  { name: 'Terminal Deck — interface', character: 1, prompt: 'Améliore le focus entre les terminaux et garde une interface sobre.', tool: 'src/renderer.js · gestion du focus', intro: 'Je fais suivre le focus à la souris, puis je vérifie la saisie dans chaque panneau.', text: 'Le panneau sous le pointeur reçoit maintenant le clavier sans clic.\n\nLes dialogues et les menus gardent leur focus pendant leur ouverture. Un déplacement de séparation ne change pas le terminal sélectionné.\n\nJe termine avec une vérification du collage et des raccourcis. La mascotte reste attachée à cette conversation, même quand vous travaillez dans le panneau voisin.' },
  { name: 'Nothing Link — connexion', character: 2, prompt: 'Vérifie la reconnexion et rends les retours plus clairs.', tool: 'src/connection.ts · reprise de connexion', intro: 'Je vérifie la reprise après une coupure et les messages affichés pendant l’attente.', text: 'La connexion est rétablie sans perdre les éléments en attente.\n\nJ’ajuste le retour visuel pour distinguer la recherche du téléphone, la connexion et la reprise terminée.\n\nJe vérifie ensuite deux coupures successives. Chaque terminal conserve son propre compagnon et sa propre animation : celui-ci continue de taper pendant que son voisin a déjà terminé.' }
];
const all = [];
for (const [index, example] of examples.entries()) {
  const pane = document.createElement('section'); pane.className = 'pane';
  pane.innerHTML = `<header class="pane-head"><span>✳</span><span>${example.name}</span><span class="tools">⌕ − ×</span></header><div class="terminal"><div class="scroll"><div class="prompt">› ${example.prompt}</div><div class="history"><span class="ok">●</span> Lecture de <strong>${example.tool}</strong><br>  └ Vérification locale de démonstration<br><br><span class="ok">●</span> Préparation des modifications<br>  └ Deux points à vérifier</div><div class="reply">${example.intro}</div><div class="live-row"><span class="live-text"></span></div></div></div><div class="composer">› Posez votre prochaine question…</div><footer class="status"><span class="model">Codex</span><span>·</span><span>~/01 - Dev</span><span class="activity">Travaille…</span></footer>`;
  const pet = document.createElement('div'); pet.className = 'pet';
  pet.innerHTML = `<div class="sprite-scale"><span class="sprite working" data-character="${example.character}" role="img" aria-label="${index ? 'Robot' : 'Chauve-souris'} au clavier"></span></div>`;
  pane.querySelector(mode === 'fixed' ? '.terminal' : '.live-row').append(pet);
  document.querySelector('.panes').append(pane);
  all.push({ pane, example, text: pane.querySelector('.live-text'), sprite: pet.querySelector('.sprite'), offset: 0, timer: null });
}
let paused = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function replay() {
  paused = false; document.body.classList.remove('paused'); document.querySelector('#pause').textContent = 'Pause';
  for (const [index, item] of all.entries()) {
    clearInterval(item.timer); item.offset = reduced ? item.example.text.length : 0; item.text.textContent = '';
    item.pane.classList.remove('done'); item.sprite.className = 'sprite working'; item.pane.querySelector('.activity').textContent = 'Travaille…';
    const step = () => {
      if (paused) return;
      item.offset = Math.min(item.example.text.length, item.offset + 2);
      item.text.textContent = item.example.text.slice(0, item.offset);
      const scroll = item.pane.querySelector('.scroll'); scroll.scrollTop = scroll.scrollHeight;
      if (item.offset === item.example.text.length) {
        clearInterval(item.timer); item.pane.classList.add('done'); item.sprite.className = 'sprite rest'; item.pane.querySelector('.activity').textContent = 'Réponse terminée';
      }
    };
    step(); item.timer = setInterval(step, index ? 65 : 40);
  }
}
document.querySelector('#replay').onclick = replay;
document.querySelector('#pause').onclick = () => { paused = !paused; document.body.classList.toggle('paused', paused); document.querySelector('#pause').textContent = paused ? 'Reprendre' : 'Pause'; };
replay();
