# Salut et bâillement — 24 octobre 2026

Création avec la compétence **imagegen**, outil intégré, à partir de `assets/mascots/trio.png`. Référence et anciennes planches conservées intactes. Les nouveaux fichiers sont copiés dans le projet ; les sorties de génération originales sont aussi conservées.

## Assets et intégration

- `assets/mascots/greeting-sheet.png` : 1254 × 1254, trois personnages et quatre poses de salut. Un salut de 1,6 seconde au clic, uniquement au repos. Aucun changement de statut natif, aucun message transmis à Codex.
- `assets/mascots/yawning-sheet.png` : 1448 × 1086, quatre poses par personnage. Début du bâillement après 43,2 secondes de repos, puis sommeil à 45 secondes. Un nouvel état natif interrompt immédiatement la séquence.
- Survol : regard discret vers la gauche ou la droite à partir des poses de curiosité existantes, sans perturber un travail, une attente d’intervention, le réveil ou le sommeil.
- Les deux planches sont disponibles dans l’atelier. L’atelier montre les poses source ; le montage temporel et les micro-mouvements de Deck restent gérés par CSS.
- Cadrage : quatre colonnes de largeur égale. Les origines verticales observées sont 100/460/830 px pour le salut et 60/370/700 px pour le bâillement. L’inspection des bandes alpha a servi au cadrage uniquement, sans retouche des PNG.
- Réduction des mouvements respectée : pas de salut ni suivi du pointeur, bâillement affiché sur une pose fixe. Les réactions décoratives n’altèrent jamais le signal d’activité.

Ces images gardent une esthétique pixel art générée ; elles ne constituent pas une reconstruction manuelle sur une grille pixel parfaite.

## Prompts exacts

### Petit salut

Use case: identity-preserve. Create a transparent production animation sprite sheet using the attached reference trio. Preserve EXACTLY the recognizable violet slime Blob, charcoal huge-eared bat Vesper, and antenna robot Byte: same silhouettes, faces, colors, square pixel style. Reference is identity only. Canvas EXACT square 1024x1024, four equal columns and three equal rows, no visible grid. Exactly TWELVE sprites. Row1 slime only, row2 bat only, row3 robot only. Each complete body centered at same baseline and scale inside its own cell, generous empty padding to every boundary. Four successive tiny friendly greeting frames: 1 calm looking at viewer, 2 lifts small pseudopod/wing-hand/robot hand, 3 gentle wave with bright eyes, 4 lowers hand and settles, seamless return to first. Bat wings mostly folded, keep huge ears and body compact. Slime waves a pseudopod. Robot waves one hand. No keyboard, no props, no typography, no symbols, no extra characters, no shadows cast on background, no glow outside sprites. Fully transparent alpha background. Preserve restrained kawaii violet charcoal ivory look, crisp pixel blocks, full silhouettes comfortably isolated in each cell.

### Bâillement

Use case: identity-preserve. Create a transparent production animation sprite sheet using attached reference trio as exact identity reference. Three characters only: violet slime Blob, charcoal violet huge-eared bat Vesper, antenna robot Byte, same faces/colors/design. EXACT four columns by three rows, twelve sprites total, transparent square canvas. Row1 slime only, row2 bat only, row3 robot only. Each sprite FULL BODY and SMALL within its equal-sized cell: maximum 65 percent of cell width and 65 percent height, centered horizontally, same bottom baseline, wide transparent gutters. NO CHARACTER TOUCHING OR CROSSING ANY CELL BORDER. Four successive frames of a very soft sleepy yawn before bed: relaxed sleepy eyelids, little eyes-closed yawn (tiny mouth), gentle stretch of ears/paws/antennae, then curled quiet sleeping pose. Preserve identities, same scale and baseline across all four frames in a row. Bat folds wings to rest with large ears relaxing, slime settles like a soft puddle, robot lowers antenna and rests arms. Crisp square pixel art aesthetic violet charcoal ivory. No keyboard, no objects, no floating Zs, no writing, no gridlines, no labels, no scenery, no shadows on background, no glow outside body, fully transparent alpha. Do not make them larger to fill the cells.
