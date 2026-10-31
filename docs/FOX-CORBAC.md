# Fox Loaf et Corbac mini

Créés le 25 octobre 2026 avec la compétence **imagegen**, outil intégré, à partir des personnages 06 et 01 de la référence fournie par Toubi. La référence est conservée dans `assets/mascots/references/pets-board.png`. Les sorties originales de génération sont conservées ; deux copies finales sont intégrées au projet, sans écraser le trio ni ses planches.

La version active, simplifiée pour se rapprocher du trio, est décrite dans [les versions harmonisées](FOX-CORBAC-HARMONISES.md).

## Première version conservée

- `assets/mascots/fox-loaf-sheet.png` — 1024 × 1536, RGBA, 24 poses.
- `assets/mascots/corbac-mini-sheet.png` — 1024 × 1536, RGBA, 24 poses.

Chaque atlas a quatre colonnes et six rangées : curiosité, clavier, attente, salut, bâillement/sommeil, réveil. Le sommeil utilise la dernière pose de bâillement avec respiration continue ; les autres états réutilisent les transitions et signaux natifs de Deck. Un tour terminé ne signifie toujours pas que la tâche a réussi.

Le cadrage repose sur des cellules de 256 × 256. Les origines verticales observées sont 0, 256, 512, 752, 1000 et 1256 px pour éviter les débordements des rangées générées. Elles sont partagées par le rendu et l’atelier via `src/pets.js`. L’inspection des pixels alpha a servi uniquement au contrôle du cadrage ; aucun PNG n’a été retouché par script. La transparence est conservée.

Les images ont une esthétique pixel art générée ; elles ne sont pas une reconstruction manuelle sur une grille parfaite. Le salut et le sommeil des planches sont des poses distinctes, pas seulement des transformations de l’image au repos.

## Choix et compatibilité

Fox Loaf = indice 3, Corbac mini = indice 4. Les indices 0, 1 et 2, les choix sauvegardés et les attributions automatiques historiques restent inchangés. Le choix explicite suit une conversation identifiée et se reflète dans la Veilleuse. Sans conversation, l’aperçu des quotas alterne entre les cinq.

L’atelier expose les états des nouveaux personnages, conserve des brouillons distincts par expression et exporte les poses en PNG et leurs réglages en JSON. L’export et l’import des atlas n’écrasent pas les sources.

## Prompts exacts

### Fox Loaf

Use case: identity-preserve. Asset: production transparent sprite atlas for a terminal companion. Use ONLY the orange Fox loaf in panel 06 of the attached reference as identity inspiration, ignore all other pets and poster graphics. One same charming orange fox throughout: very large fluffy ivory-tipped tail curling beside body, small orange ears with dark tips, ivory cheeks and chest, tiny dark paws, big gentle dark eyes. Match the cozy crisp square pixel-art aesthetic and readable silhouette of that fox. EXACT layout: FOUR columns and SIX rows, twenty-four sprites total, on portrait 1024x1536 canvas; all cells equal square 256px. No visible grid. Full body fits inside center 65 percent of each cell, same size and bottom baseline for every pose, wide fully transparent padding on every side, tail and ears never cross cell borders. Row1 four frames subtle curious idle: look forward, look left, look right, blink. Row2 four frames typing on one small charcoal keyboard with tiny paw taps and restrained tail motion; keyboard present only row2. Row3 four attentive waiting poses: ears perked, little head tilt, one paw raised, settle. Row4 four friendly greeting wave poses with one front paw. Row5 four successive sleepy poses: sleepy eyelids, little yawn, gentle stretch, curled fully asleep nose in fluffy tail. Row6 four waking-up poses: asleep, small yawn, soft stretch, awake sitting settled. ALL rows strictly the SAME fox identity, no alternate costumes/colors, no other characters. Transparent alpha background, no scenery, no writing, no numbers, no labels, no emojis, no floating symbols, no shadows cast on backdrop, no gradients or blur outside character. Consistent pixel blocks, restrained orange cream charcoal palette. Precisely isolated sprites, generous cell gutters.

### Corbac mini

Use case: identity-preserve. Asset: production transparent sprite atlas for a terminal companion. Use ONLY Corbac mini, the tiny raven in panel 01 of the attached reference, as character direction; ignore all other pets and all poster graphics. One SAME very cute round charcoal raven throughout, fluffy dark plum-violet feathers, big glossy ivory-highlighted dark eyes, short grey curved beak, tiny muted warm feet, little tuft, compact folded wings. Cozy restrained square pixel-art aesthetic, clear silhouette readable at tiny scale, matching the reference raven. EXACT layout: FOUR columns by SIX rows, twenty-four sprites, portrait canvas 1024x1536, equal square cells 256px each, no visible grid. Every complete body same size and baseline in center 65 percent of its cell, generous transparent gutters all around, beak/feet/wing/tail never cross cell boundaries. Row1 curious idle loop four frames: face forward, head tilt left, head tilt right, blink. Row2 four typing poses using wing tips on one tiny charcoal keyboard; keyboard present only row2. Row3 attentive waiting loop: perked tuft, head tilt, one wing slightly raised, settle. Row4 four friendly tiny wing-wave poses, looking at viewer. Row5 four sleepy sequence poses: droopy eyelids, tiny beak yawn, little wing stretch, fully asleep tucked into a round feather ball. Row6 wake sequence: sleeping feather ball, eyes half-open, small wing stretch, awake settled. Preserve raven identity across every cell, same plum charcoal palette, same eye and beak design, no alternate costumes, no other characters. Actual transparent alpha background. No writing, captions, letters, numbers, floating symbols, hearts or Zs, no scenery, no backdrop shadow, no glow outside character. Crisp pixel blocks, cute and calm rather than exaggerated. Precisely twenty-four isolated sprites in six rows.
