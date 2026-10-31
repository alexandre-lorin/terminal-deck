'use strict';
const M = window.SpriteStudio, $ = selector => document.querySelector(selector);
const preview = $('#preview'), ctx = preview.getContext('2d'), atlas = $('#atlas'), atlasCtx = atlas.getContext('2d');
const scratch = document.createElement('canvas'), scratchCtx = scratch.getContext('2d');
const packs = [...M.packs], images = new Map(), draftKey = 'terminal-deck-sprite-studio-v1';
let character = 0, pack = packs[2], frames = [], frameIndex = 0, size = 96, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let requestedPack = pack, requestedCharacter = character;
let image, onion = false, grid = false, guides = true, scale = 4, speed = 1, background = 'terminal', elapsed = 0, previousTime = 0, toastTimer, saveTimer, loadSequence = 0, objectURL = null, dragging = null;
let drafts = {};
try { const saved = JSON.parse(localStorage.getItem(draftKey)); if (saved && typeof saved === 'object' && !Array.isArray(saved)) drafts = saved; } catch {}
function message(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3600); }
function safely(fn) { return Promise.resolve().then(fn).catch(error => message(error.message || 'Action indisponible.')); }
const draftId = (item, who) => `${item.file}:${who}${item.atlas ? ':' + item.id : ''}`;
const key = () => draftId(pack, character);
function currentManifest() { return M.manifest(pack, character, frames, size); }
function save() {
  drafts[key()] = currentManifest(); $('#save-status').textContent = 'Modifié';
  clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(draftKey, JSON.stringify(drafts)); $('#save-status').textContent = 'Enregistré ici'; } catch { $('#save-status').textContent = 'Export conseillé'; } }, 180);
}
async function loadImage(selected) {
  if (images.has(selected.file)) return images.get(selected.file);
  const loaded = new Image(); loaded.src = '/assets/' + selected.file;
  await loaded.decode();
  if (loaded.naturalWidth !== selected.width || loaded.naturalHeight !== selected.height) throw new Error('La planche a changé de dimensions : rechargez ses réglages.');
  images.set(selected.file, loaded); return loaded;
}
function renderNavigation() {
  $('#characters').replaceChildren(...M.characters.map((name, index) => {
    const button = document.createElement('button'); button.className = 'character'; button.type = 'button'; button.setAttribute('aria-pressed', String(index === character)); button.setAttribute('aria-label', name);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 48; canvas.setAttribute('aria-hidden', 'true');
    button.append(canvas, document.createTextNode(name)); button.onclick = () => safely(() => select(requestedPack, index));
    loadImage(M.source(M.packs[0], index)).then(source => drawCrop(canvas.getContext('2d'), source, M.defaults(M.packs[0], index)[0], 48)).catch(() => {});
    return button;
  }));
  const icons = ['·', '⌕', '›_', '◌', '☾', '↟', '＋'];
  $('#packs').replaceChildren(...packs.map((item, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'pack'; button.dataset.pack = item.id; button.setAttribute('aria-current', String(item.id === pack.id));
    const icon = document.createElement('span'); icon.textContent = icons[index] || '＋'; icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.textContent = item.name;
    const count = document.createElement('small'), resolved = M.source(item, character); count.textContent = `${resolved.frames} ${resolved.frames === 1 ? 'pose' : 'poses'}`;
    button.append(icon, label, count); button.onclick = () => safely(() => select(item, requestedCharacter)); return button;
  }));
}
async function select(selected, selectedCharacter) {
  requestedPack = selected; requestedCharacter = selectedCharacter;
  const sequence = ++loadSequence;
  selected = M.source(selected, selectedCharacter);
  const source = await loadImage(selected); if (sequence !== loadSequence) return;
  pack = selected; character = selectedCharacter; image = source; frameIndex = 0; elapsed = 0;
  frames = M.defaults(pack, character);
  const saved = drafts[key()]; let restored = false;
  if (saved) {
    try { const checked = M.parseManifest(saved); if (checked.source.width === pack.width && checked.source.height === pack.height && checked.frames.length === pack.frames) { frames = checked.frames; size = checked.size; restored = true; } } catch {}
  }
  $('#output-size').value = String(size); $('#custom-grid').hidden = !pack.custom;
  if (pack.custom) { $('#grid-columns').value = pack.columns; $('#grid-rows').value = pack.gridRows; }
  const title = $('#preview-title'); title.replaceChildren(document.createTextNode(M.characters[character])); const suffix = document.createElement('span'); suffix.textContent = ' · ' + pack.name; title.append(suffix);
  $('#preview-note').textContent = pack.id === 'sleeping' ? 'Dans Deck, le sommeil garde une silhouette stable avec une respiration légère.' : pack.id === 'waking' ? 'Séquence de réveil, répétée ici pour examiner les poses.' : 'Aperçu des poses source · les effets de Deck s’ajoutent à l’affichage.';
  $('#source-size').textContent = `${pack.width} × ${pack.height}`;
  atlas.width = pack.width; atlas.height = pack.height;
  renderNavigation(); renderFrames(); syncFields(); paint(); $('#save-status').textContent = restored ? 'Réglages locaux' : 'Original';
}
function drawCrop(target, source, crop, output) {
  target.clearRect(0, 0, output, output); target.imageSmoothingEnabled = false;
  const factor = Math.min(output / crop.w, output / crop.h), w = crop.w * factor, h = crop.h * factor, x = (output - w) / 2, y = output - h;
  target.drawImage(source, crop.x, crop.y, crop.w, crop.h, x, y, w, h);
  if (crop.trimTop) target.clearRect(0, 0, output, y + crop.trimTop * factor);
  if (crop.trimLeft) target.clearRect(0, 0, x + crop.trimLeft * factor, output);
}
function frameCanvas(crop, output = 48) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = output; drawCrop(canvas.getContext('2d'), image, crop, output); return canvas;
}
function renderFrames() {
  $('#timeline').replaceChildren(...frames.map((crop, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'frame'; button.dataset.frame = String(index); button.setAttribute('aria-current', String(index === frameIndex)); button.setAttribute('aria-label', `Pose ${index + 1}`);
    const label = document.createElement('span'); label.textContent = `${String(index + 1).padStart(2, '0')} · ${Math.round(crop.duration)} ms`;
    button.append(frameCanvas(crop), label); button.onclick = () => { setPlaying(false); chooseFrame(index); }; return button;
  }));
}
function syncFields() {
  if (!frames.length) return;
  for (const field of ['x', 'y', 'w', 'h', 'trimTop', 'trimLeft', 'duration']) $('#crop-' + field).value = String(Math.round(frames[frameIndex][field] * 100) / 100);
  $('#frame-label').textContent = `Pose ${frameIndex + 1} / ${frames.length}`;
  for (const button of $('#timeline').children) button.setAttribute('aria-current', String(Number(button.dataset.frame) === frameIndex));
}
function chooseFrame(index) { frameIndex = (index + frames.length) % frames.length; elapsed = 0; syncFields(); paint(); }
function setPlaying(value) { playing = value; elapsed = 0; $('#play').textContent = playing ? 'Ⅱ' : '▶'; $('#play').setAttribute('aria-label', playing ? 'Mettre en pause' : 'Lire l’animation'); }
function paintPreview() {
  if (!image) return;
  if (preview.width !== size) { preview.width = preview.height = size; }
  const available = Math.min($('#stage').clientWidth - 48, $('#stage').clientHeight - 74);
  const actualScale = Math.max(1, Math.min(scale, Math.floor(available / size)));
  preview.style.width = preview.style.height = `${size * actualScale}px`; $('#zoom-label').textContent = `× ${actualScale}` + (actualScale < scale ? ' · ajusté' : '');
  ctx.clearRect(0, 0, size, size); ctx.imageSmoothingEnabled = false;
  if (onion && frames.length > 1) {
    scratch.width = scratch.height = size; drawCrop(scratchCtx, image, frames[(frameIndex + frames.length - 1) % frames.length], size);
    ctx.globalAlpha = .23; ctx.drawImage(scratch, 0, 0); ctx.globalAlpha = 1;
  }
  scratch.width = scratch.height = size; drawCrop(scratchCtx, image, frames[frameIndex], size); ctx.drawImage(scratch, 0, 0);
  if (guides) {
    ctx.strokeStyle = 'rgba(192,167,236,.25)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(0, size - 1); ctx.lineTo(size, size - 1); ctx.moveTo(size / 2 + .5, 0); ctx.lineTo(size / 2 + .5, size); ctx.stroke(); ctx.setLineDash([]);
  }
  if (grid && actualScale >= 3) {
    ctx.strokeStyle = 'rgba(160,142,174,.16)'; ctx.lineWidth = .15; ctx.beginPath();
    for (let i = 1; i < size; i++) { ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.moveTo(0, i); ctx.lineTo(size, i); } ctx.stroke();
  }
}
function paintAtlas() {
  if (!image) return;
  atlasCtx.clearRect(0, 0, atlas.width, atlas.height); atlasCtx.drawImage(image, 0, 0);
  const c = frames[frameIndex], line = Math.max(1, pack.width / Math.max(1, atlas.clientWidth));
  atlasCtx.fillStyle = 'rgba(0,0,0,.55)'; atlasCtx.beginPath(); atlasCtx.rect(0, 0, pack.width, pack.height); atlasCtx.rect(c.x, c.y, c.w, c.h); atlasCtx.fill('evenodd');
  if (guides) { atlasCtx.strokeStyle = 'rgba(192,167,236,.25)'; atlasCtx.lineWidth = line; for (const frame of frames) atlasCtx.strokeRect(frame.x, frame.y, frame.w, frame.h); }
  atlasCtx.strokeStyle = '#c0a7ec'; atlasCtx.lineWidth = line * 1.5; atlasCtx.strokeRect(c.x, c.y, c.w, c.h);
  if (c.trimTop) { atlasCtx.fillStyle = 'rgba(235,143,148,.3)'; atlasCtx.fillRect(c.x, c.y, c.w, c.trimTop); }
  if (c.trimLeft) { atlasCtx.fillStyle = 'rgba(235,143,148,.3)'; atlasCtx.fillRect(c.x, c.y, c.trimLeft, c.h); }
  const handle = line * 8; atlasCtx.fillStyle = '#d3baee'; atlasCtx.fillRect(c.x + c.w - handle / 2, c.y + c.h - handle / 2, handle, handle);
}
function inspectEdges() {
  if (!image) return;
  scratch.width = scratch.height = size; drawCrop(scratchCtx, image, frames[frameIndex], size);
  const pixels = scratchCtx.getImageData(0, 0, size, size).data, edges = { haut: false, bas: false, gauche: false, droite: false };
  for (let i = 0; i < size; i++) {
    edges.haut ||= pixels[i * 4 + 3] > 100; edges.bas ||= pixels[((size - 1) * size + i) * 4 + 3] > 100;
    edges.gauche ||= pixels[i * size * 4 + 3] > 100; edges.droite ||= pixels[(i * size + size - 1) * 4 + 3] > 100;
  }
  const touched = Object.keys(edges).filter(edge => edges[edge]);
  $('#edge-status').dataset.level = touched.length ? 'warning' : 'clear';
  $('#edge-status').textContent = touched.length ? `Pixels au bord : ${touched.join(', ')}. Vérifiez la silhouette.` : 'La silhouette reste à distance des bords.';
}
function paint() { paintPreview(); paintAtlas(); inspectEdges(); }
function edit(values) {
  if (!('w' in values) && !('h' in values)) {
    if ('x' in values) values.x = Math.max(0, Math.min(pack.width - frames[frameIndex].w, values.x));
    if ('y' in values) values.y = Math.max(0, Math.min(pack.height - frames[frameIndex].h, values.y));
  }
  frames[frameIndex] = M.crop({ ...frames[frameIndex], ...values }, pack.width, pack.height); syncFields(); renderFrames(); paint(); save(); }
for (const field of ['x', 'y', 'w', 'h', 'trimTop', 'trimLeft', 'duration']) $('#crop-' + field).onfocus = () => setPlaying(false);
for (const field of ['x', 'y', 'w', 'h', 'trimTop', 'trimLeft', 'duration']) $('#crop-' + field).onchange = () => { setPlaying(false); edit({ [field]: Number($('#crop-' + field).value) }); };
const sourcePoint = event => { const rect = atlas.getBoundingClientRect(); return { x: (event.clientX - rect.left) / rect.width * pack.width, y: (event.clientY - rect.top) / rect.height * pack.height }; };
atlas.onpointerdown = event => {
  if (event.button !== 0 || !image) return;
  const point = sourcePoint(event), c = frames[frameIndex], reach = pack.width / atlas.clientWidth * 13;
  const resize = Math.abs(point.x - c.x - c.w) < reach && Math.abs(point.y - c.y - c.h) < reach;
  const inside = point.x >= c.x && point.x <= c.x + c.w && point.y >= c.y && point.y <= c.y + c.h;
  if (!inside && !resize) { const index = frames.findIndex(crop => point.x >= crop.x && point.x <= crop.x + crop.w && point.y >= crop.y && point.y <= crop.y + crop.h); if (index >= 0) { setPlaying(false); chooseFrame(index); } return; }
  event.preventDefault(); setPlaying(false); atlas.setPointerCapture(event.pointerId); dragging = { point, crop: { ...c }, resize };
};
atlas.onpointermove = event => {
  if (!dragging) return; const point = sourcePoint(event), dx = Math.round(point.x - dragging.point.x), dy = Math.round(point.y - dragging.point.y), c = dragging.crop;
  edit(dragging.resize ? { w: c.w + dx, h: c.h + dy } : { x: c.x + dx, y: c.y + dy });
};
atlas.onpointerup = atlas.onlostpointercapture = () => { dragging = null; };
$('#previous').onclick = () => { setPlaying(false); chooseFrame(frameIndex - 1); };
$('#next').onclick = () => { setPlaying(false); chooseFrame(frameIndex + 1); };
$('#play').onclick = () => setPlaying(!playing);
$('#speed').onchange = () => { speed = Number($('#speed').value); elapsed = 0; };
$('#zoom').onchange = () => { scale = Number($('#zoom').value); paintPreview(); };
$('#onion').onclick = () => { onion = !onion; $('#onion').setAttribute('aria-pressed', String(onion)); paintPreview(); };
$('#output-size').onchange = () => { size = Number($('#output-size').value); paint(); save(); };
$('#guides').onchange = () => { guides = $('#guides').checked; paint(); };
$('#pixel-grid').onchange = () => { grid = $('#pixel-grid').checked; paintPreview(); };
for (const button of document.querySelectorAll('[data-background]')) {
  if (button.tagName !== 'BUTTON') continue;
  button.onclick = () => { background = button.dataset.background; $('#stage').dataset.background = background; for (const item of document.querySelectorAll('.segmented button')) item.setAttribute('aria-pressed', String(item === button)); };
}
$('#reset-frame').onclick = () => { setPlaying(false); frames[frameIndex] = M.defaults(pack, character)[frameIndex]; syncFields(); renderFrames(); paint(); save(); message('Pose rétablie.'); };
$('#reset-all').onclick = () => { setPlaying(false); frames = M.defaults(pack, character); frameIndex = 0; syncFields(); renderFrames(); paint(); save(); message('Expression rétablie.'); };
$('#copy-frame').onclick = () => {
  const current = frames[frameIndex], original = M.defaults(pack, character), origin = original[frameIndex];
  frames = frames.map((frame, index) => M.crop({ ...frame, x: original[index].x + current.x - origin.x, y: original[index].y + current.y - origin.y, w: current.w, h: current.h, trimTop: current.trimTop, trimLeft: current.trimLeft }, pack.width, pack.height));
  renderFrames(); syncFields(); paint(); save(); message('Décalage, taille et masque appliqués aux poses.');
};
function filename(extension) { return `${M.characters[character].toLowerCase().replace(/\s+/g, '-')}-${pack.id}.${extension}`; }
async function download(blob, name) {
  if (window.__TAURI__) {
    try { await window.__TAURI__.core.invoke('studio_export', { name, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) }); }
    catch (error) { throw new Error(typeof error === 'string' ? error : 'Export indisponible.'); }
    return;
  } const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
function png(canvas) { return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export PNG indisponible.')), 'image/png')); }
$('#export-frame').onclick = () => safely(async () => { const canvas = frameCanvas(frames[frameIndex], size); await download(await png(canvas), filename(`pose-${frameIndex + 1}.png`)); message('Pose exportée, sans repères.'); });
$('#export-sheet').onclick = () => safely(async () => {
  const canvas = document.createElement('canvas'); canvas.width = size * frames.length; canvas.height = size; const target = canvas.getContext('2d'); target.imageSmoothingEnabled = false;
  for (let i = 0; i < frames.length; i++) target.drawImage(frameCanvas(frames[i], size), i * size, 0);
  await download(await png(canvas), filename('png')); message('Planche PNG exportée, avec des cadres égaux.');
});
$('#export-settings').onclick = () => safely(async () => {
  const value = currentManifest(); value.atlas = { file: filename('png'), width: size * frames.length, height: size, frames: frames.map((frame, index) => ({ x: index * size, y: 0, w: size, h: size, duration: frame.duration })) };
  await download(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }), filename('json')); message('Réglages et coordonnées de la planche exportés.');
});
$('#import-settings').onclick = () => $('#settings-file').click();
$('#settings-file').onchange = () => safely(async () => {
  const file = $('#settings-file').files[0]; if (!file) return;
  if (file.size > 200000) throw new Error('Le fichier de réglages est trop volumineux.');
  const checked = M.parseManifest(JSON.parse(await file.text()));
  const selected = packs.map(item => M.source(item, checked.character)).find(item => item.file === checked.source.file && item.width === checked.source.width && item.height === checked.source.height && (!item.atlas || item.id === checked.pack));
  if (!selected) throw new Error('Importez d’abord la planche PNG associée à ces réglages.');
  if (checked.frames.length !== selected.frames) throw new Error('Le nombre de poses ne correspond pas à la planche.');
  drafts[draftId(selected, checked.character)] = checked; await select(selected, checked.character); save(); message('Réglages chargés.');
}).finally(() => { $('#settings-file').value = ''; });
$('#import-image').onclick = () => $('#image-file').click();
$('#image-file').onchange = () => safely(async () => {
  const file = $('#image-file').files[0]; if (!file) return;
  if (file.size > 24 * 1024 * 1024) throw new Error('Choisissez une planche PNG de moins de 24 Mo.');
  const bytes = new Uint8Array(await file.slice(0, 24).arrayBuffer());
  if (bytes.length < 24 || [137,80,78,71,13,10,26,10].some((byte, i) => bytes[i] !== byte)) throw new Error('Le fichier doit être un PNG.');
  const header = new DataView(bytes.buffer), width = header.getUint32(16), height = header.getUint32(20);
  if (!width || !height || width > 8192 || height > 8192) throw new Error('La planche doit mesurer au maximum 8192 × 8192 pixels.');
  const url = URL.createObjectURL(file), loaded = new Image(); loaded.src = url;
  try { await loaded.decode(); } catch { URL.revokeObjectURL(url); throw new Error('Ce PNG est illisible.'); }
  if (objectURL) URL.revokeObjectURL(objectURL); objectURL = url;
  const old = packs.findIndex(item => item.custom); if (old >= 0) { images.delete(packs[old].file); packs.splice(old, 1); }
  const selected = { id: 'import', name: 'Votre planche', file: file.name.slice(0, 200), width, height, frames: 4, duration: 200, columns: 4, gridRows: 3, custom: true };
  // Le nom d’un import ne remplace jamais les planches intégrées dans le cache.
  selected.file = 'import-' + selected.file; packs.push(selected); images.set(selected.file, loaded); await select(selected, character); message('Planche importée. Ajustez sa grille à droite.');
}).finally(() => { $('#image-file').value = ''; });
for (const field of ['columns', 'rows']) $('#grid-' + field).onchange = () => {
  if (!pack.custom) return;
  pack.columns = Math.max(1, Math.min(16, Math.round(Number($('#grid-columns').value) || 1))); pack.gridRows = Math.max(1, Math.min(16, Math.round(Number($('#grid-rows').value) || 1))); pack.frames = pack.columns;
  delete drafts[key()]; safely(() => select(pack, character));
};
document.addEventListener('keydown', event => {
  if (event.target.closest('input,select,textarea') || event.ctrlKey || event.metaKey) return;
  if (event.altKey && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
    event.preventDefault(); setPlaying(false); const amount = event.shiftKey ? 10 : 1, c = frames[frameIndex];
    edit({ x: c.x + (event.key === 'ArrowRight' ? amount : event.key === 'ArrowLeft' ? -amount : 0), y: c.y + (event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0) }); return;
  }
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON') { event.preventDefault(); setPlaying(!playing); }
  if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); setPlaying(false); chooseFrame(frameIndex + (event.key === 'ArrowRight' ? 1 : -1)); }
});
new ResizeObserver(() => { paintPreview(); paintAtlas(); }).observe($('#stage'));
function tick(time) {
  const delta = previousTime ? Math.min(150, time - previousTime) : 0; previousTime = time;
  if (image && playing && frames.length > 1 && !document.hidden) {
    elapsed += delta * speed;
    if (elapsed >= frames[frameIndex].duration) { elapsed %= frames[frameIndex].duration; frameIndex = (frameIndex + 1) % frames.length; syncFields(); paint(); }
  }
  requestAnimationFrame(tick);
}
setPlaying(playing); safely(() => select(pack, character)); requestAnimationFrame(tick);
