# Hello and yawn — 24 October 2026

Creation with the **imagegen** skill, integrated tool, from `assets/mascots/trio.png`. Reference and old plates preserved intact. The new files are copied into the project; the original generation outputs are also preserved.

## Assets and integration

- `assets/mascots/greeting-sheet.png`: 1254 × 1254, three characters and four greeting poses. A 1,6 second salute on click, only when idle. No native status changes, no messages transmitted to Codex.
- `assets/mascots/yawning-sheet.png`: 1448 × 1086, four poses per character. Start of yawning after 43,2 seconds of rest, then sleep at 45 seconds. A new native state immediately interrupts the sequence.
- Hover: discreet look to the left or right from existing curiosity poses, without disturbing work, waiting for intervention, waking up or sleeping.
- Both boards are available in the workshop. The workshop shows the source poses; Time editing and Deck micro-movements remain managed by CSS.
- Framing: four columns of equal width. The observed vertical origins are 100/460/830 px for hello and 60/370/700 px for yawn. The inspection of the alpha bands was used for framing only, without retouching the PNGs.
- Reduction of movements respected: no greeting or tracking of the pointer, yawn displayed on a fixed pose. Decorative reactions never alter the activity signal.

These images maintain a generated pixel art aesthetic; they do not constitute a manual reconstruction on a perfect pixel grid.

## Exact prompts

### Little hello

Use case: identity-preserve. Create a transparent production animation sprite sheet using the attached reference trio. Preserve EXACTLY the recognizable violet slime Blob, charcoal huge-eared bat Vesper, and antenna robot Byte: same silhouettes, faces, colors, square pixel style. Reference is identity only. Canvas EXACT square 1024x1024, four equal columns and three equal rows, no visible grid. Exactly TWELVE sprites. Row1 slime only, row2 bat only, row3 robot only. Each complete body centered at same baseline and scale inside its own cell, generous empty padding to every boundary. Four successive tiny friendly greeting frames: 1 calm looking at viewer, 2 lifts small pseudopod/wing-hand/robot hand, 3 gentle wave with bright eyes, 4 lowers hand and settles, seamless return to first. Bat wings mostly folded, keep huge ears and body compact. Slime waves a pseudopod. Robot waves one hand. No keyboard, no props, no typography, no symbols, no extra characters, no shadows cast on background, no glow outside sprites. Fully transparent alpha background. Preserve restrained kawaii violet charcoal ivory look, crisp pixel blocks, full silhouettes comfortably isolated in each cell.

### Yawn

Use case: identity-preserve. Create a transparent production animation sprite sheet using attached reference trio as exact identity reference. Three characters only: violet slime Blob, charcoal violet huge-eared bat Vesper, antenna robot Byte, same faces/colors/design. EXACT four columns by three rows, twelve sprites total, transparent square canvas. Row1 slime only, row2 bat only, row3 robot only. Each sprite FULL BODY and SMALL within its equal-sized cell: maximum 65 percent of cell width and 65 percent height, centered horizontally, same bottom baseline, wide transparent gutters. NO CHARACTER TOUCHING OR CROSSING ANY CELL BORDER. Four successive frames of a very soft sleepy yawn before bed: relaxed sleepy eyelids, little eyes-closed yawn (tiny mouth), gentle stretch of ears/paws/antennae, then curled quiet sleeping pose. Preserve identities, same scale and baseline across all four frames in a row. Bat folds wings to rest with large ears relaxing, slime settles like a soft puddle, robot lowers antenna and rests arms. Crisp square pixel art aesthetic violet charcoal ivory. No keyboard, no objects, no floating Zs, no writing, no gridlines, no labels, no scenery, no shadows on background, no glow outside body, fully transparent alpha. Do not make them larger to fill the cells.
