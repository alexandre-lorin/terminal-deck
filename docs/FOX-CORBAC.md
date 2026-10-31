# Fox Loaf and Corbac mini

Created on 25 October 2026 with the **imagegen** skill, integrated tool, from the characters 06 and 01 of the reference provided by Toubi. The reference is kept in `assets/mascots/references/pets-board.png`. The original generation outputs are preserved; two final copies are integrated into the project, without overwriting the trio or its boards.

The active version, simplified to approximate the trio, is described in [the harmonized versions](FOX-CORBAC-HARMONISES.md).

## First version kept

- `assets/mascots/fox-loaf-sheet.png` — 1024 × 1536, RGBA, 24 poses.
- `assets/mascots/corbac-mini-sheet.png` — 1024 × 1536, RGBA, 24 poses.

Each atlas has four columns and six rows: curiosity, keyboard, wait, hi, yawn/sleep, wake up. Sleep uses the last pose of yawning with continuous breathing; other states reuse Deck's native transitions and signals. A completed round still does not mean the task was successful.

The framing is based on cells of 256 × 256. The vertical origins observed are 0, 256, 512, 752, 1000 and 1256 px to avoid overflows of the generated rows. They are shared by the renderer and the workshop via `src/pets.js`. The alpha pixel inspection was used only to control the framing; no PNGs have been scripted. Transparency is preserved.

The images have a generated pixel art aesthetic; they are not a manual reconstruction on a perfect grid. The salute and sleep planks are distinct poses, not just transformations of the resting image.

## Choice and compatibility

Fox Loaf = index 3, Corbac mini = index 4. The indices 0, 1 and 2, saved choices and historical automatic assignments remain unchanged. The explicit choice follows an identified conversation and is reflected in the Nightlight. Without conversation, the quota overview alternates between the five.

The workshop exposes the states of new characters, keeps separate drafts by expression and exports poses in PNG and their settings in JSON. Exporting and importing atlases does not overwrite the sources.

## Exact prompts

### Fox Loaf

Use case: identity-preserve. Asset: production transparent sprite atlas for a terminal companion. Use ONLY the orange Fox loaf in panel 06 of the attached reference as identity inspiration, ignore all other pets and poster graphics. One same charming orange fox throughout: very large fluffy ivory-tipped tail curling beside body, small orange ears with dark tips, ivory cheeks and chest, tiny dark paws, big gentle dark eyes. Match the cozy crisp square pixel-art aesthetic and readable silhouette of that fox. EXACT layout: FOUR columns and SIX rows, twenty-four sprites total, on portrait 1024x1536 canvas; all cells equal square 256px. No visible grid. Full body fits inside center 65 percent of each cell, same size and bottom baseline for every pose, wide fully transparent padding on every side, tail and ears never cross cell borders. Row1 four frames subtle curious idle: look forward, look left, look right, blink. Row2 four frames typing on one small charcoal keyboard with tiny paw taps and restrained tail motion; keyboard present only row2. Row3 four attentive waiting poses: ears perked, little head tilt, one paw raised, settle. Row4 four friendly greeting wave poses with one front paw. Row5 four successive sleepy poses: sleepy eyelids, little yawn, gentle stretch, curled fully asleep nose in fluffy tail. Row6 four waking-up poses: asleep, small yawn, soft stretch, awake sitting settled. ALL rows strictly the SAME fox identity, no alternate costumes/colors, no other characters. Transparent alpha background, no scenery, no writing, no numbers, no labels, no emojis, no floating symbols, no shadows cast on backdrop, no gradients or blur outside character. Consistent pixel blocks, restrained orange cream charcoal palette. Precisely isolated sprites, generous cell gutters.

### Corbac mini

Use case: identity-preserve. Asset: production transparent sprite atlas for a terminal companion. Use ONLY Corbac mini, the tiny raven in panel 01 of the attached reference, as character direction; ignore all other pets and all poster graphics. One SAME very cute round charcoal raven throughout, fluffy dark plum-violet feathers, big glossy ivory-highlighted dark eyes, short grey curved beak, tiny muted warm feet, little tuft, compact folded wings. Cozy restrained square pixel-art aesthetic, clear silhouette readable at tiny scale, matching the reference raven. EXACT layout: FOUR columns by SIX rows, twenty-four sprites, portrait canvas 1024x1536, equal square cells 256px each, no visible grid. Every complete body same size and baseline in center 65 percent of its cell, generous transparent gutters all around, beak/feet/wing/tail never cross cell boundaries. Row1 curious idle loop four frames: face forward, head tilt left, head tilt right, blink. Row2 four typing poses using wing tips on one tiny charcoal keyboard; keyboard present only row2. Row3 attentive waiting loop: perked tuft, head tilt, one wing slightly raised, settle. Row4 four friendly tiny wing-wave poses, looking at viewer. Row5 four sleepy sequence poses: droopy eyelids, tiny beak yawn, little wing stretch, fully asleep tucked into a round feather ball. Row6 wake sequence: sleeping feather ball, eyes half-open, small wing stretch, awake settled. Preserve raven identity across every cell, same plum charcoal palette, same eye and beak design, no alternate costumes, no other characters. Actual transparent alpha background. No writing, captions, letters, numbers, floating symbols, hearts or Zs, no scenery, no backdrop shadow, no glow outside character. Crisp pixel blocks, cute and calm rather than exaggerated. Precisely twenty-four isolated sprites in six rows.
