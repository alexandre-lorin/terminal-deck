# Expressions des compagnons

Créées avec l’outil intégré **imagegen**, à partir de `assets/mascots/trio.png`, conservé intact. Chaque planche transparente contient trois personnages et quatre poses par personnage.

| Expression | Planche | Déclenchement |
|---|---|---|
| Curiosité | `assets/mascots/curious-sheet.png` | État non communiqué, dont le sélecteur `/resume` ; décoration uniquement |
| Attente | `assets/mascots/waiting-sheet.png` | Signal natif `blocked` : intervention attendue |
| Réveil | `assets/mascots/waking-sheet.png` | Sortie du sommeil, séquence unique de 1,2 seconde |

Le personnage, son état réel et sa pose restent synchronisés entre le panneau, les quotas et le mode plein panneau. Une nouvelle demande d’intervention peut interrompre immédiatement la séquence de réveil. Les préférences de réduction des mouvements arrêtent les animations ; la pose finale éveillée est utilisée pendant le réveil.

Les planches de 1448 × 1086 pixels (1449 × 1086 pour la curiosité) sont affichées sans modification via des fenêtres CSS. Les marges des poses ont été inspectées ; les offsets verticaux du premier personnage compensent les baselines générées. Aucune image source n’a été écrasée.

## Prompts utilisés

### curious

Use case: identity-preserve. Production pixel art sprite sheet for a dark terminal companion. Preserve exactly the three reference characters: violet slime, huge-eared bat, small antenna robot; same faces, silhouettes, charcoal violet ivory palette and crisp square pixels. Fully transparent background, no scenery, no grid, no labels, no extra characters. Exactly four columns by three rows of identical cells, twelve sprites total. Slime only row1, bat only row2, robot only row3. Full body centered within each cell, consistent scale and bottom baseline per row, all frames comfortably padded and separated. Four subtle frames of a seamless curious idle loop. Look a little left, head tilted toward viewer, look a little right, blink and return to center. Bat ears gently perk and swivel, slime tilts its oval eyes and soft body, robot tilts head and one antenna. Warm and inquisitive, no keyboard, no question marks or symbols. Tiny pose differences only.

### waiting

Use case: identity-preserve. Production pixel art sprite sheet for a dark terminal companion. Preserve exactly the three reference characters: violet slime, huge-eared bat, small antenna robot; same faces, silhouettes, charcoal violet ivory palette and crisp square pixels. Fully transparent background, no scenery, no grid, no labels, no extra characters. Exactly four columns by three rows of identical cells, twelve sprites total. Slime only row1, bat only row2, robot only row3. Full body centered within each cell, consistent scale and bottom baseline per row, all frames comfortably padded and separated. Four subtle frames of an attentive waiting loop, as if listening for the user's answer. Characters sit upright, soft hopeful open eyes, small paw or wing lifted to ask for attention, gentle blink and small nod. Slime raises one tiny pseudopod, bat raises one little wing hand with alert ears, robot raises one hand. No keyboard, no text or symbols; restrained motion distinct from typing.

### waking

Use case: identity-preserve. Production pixel art sprite sheet for a dark terminal companion. Preserve exactly the three reference characters: violet slime, huge-eared bat, small antenna robot; same faces, silhouettes, charcoal violet ivory palette and crisp square pixels. Fully transparent background, no scenery, no grid, no labels, no extra characters. Exactly four columns by three rows of identical cells, twelve sprites total. Slime only row1, bat only row2, robot only row3. Full body centered within each cell, consistent scale and bottom baseline per row, all frames comfortably padded and separated. Four successive frames of a one-shot waking-up stretch. First settled with half-closed sleepy eyes, second little yawn with eyes closed, third gentle full-body stretch with ears or antenna raised and arms or wings opening, fourth awake and settled looking forward. Slime squishes then stretches, bat stretches wings and ears, robot stretches arms and antennae. Cute and understated, no keyboard, no text or symbols, retain exact identity.


## Correction du débordement

La rangée de gelées dépasse de sa cellule dans les planches générées. Pour la chauve-souris, le rendu masque les deux premiers pixels de la cellule en curiosité et les trois premiers au réveil, situés avant le début des oreilles. Les positions et silhouettes restent inchangées. Les images sources ne sont pas retouchées.

## Animations affinées — 23 octobre 2026

Les planches originales restent intactes. Cette amélioration porte sur la mise en mouvement et les transitions dans Deck, pas sur de nouveaux dessins ou des exports de l’atelier.

- **Blob** : frappe souple avec tassement léger, respiration plus ample et rythme lent.
- **Vesper** : petit soulèvement pendant la frappe, respiration légère, saut de fin plus haut.
- **Byte** : impulsions courtes et régulières au clavier, respiration minimale, petit rebond de fin.
- Curiosité : regards espacés et déplacement discret ; attente : petit redressement pour solliciter l’attention.
- Fin de tour : anticipation, bond puis amortissement, suivis de la respiration existante. Cela reste un signal de fin, sans garantie de réussite.
- Sommeil : pose fixe, cycle continu de 6,2 à 7 secondes selon le compagnon et petite pause après l’inspiration. Aucun défilement des silhouettes endormies.
- Réveil : étirement bref sur les quatre poses, immédiatement interruptible par un nouvel état natif.
- Changement d’état/pose : fondu de 280 ms à partir du cadrage précédent ; une seule couche temporaire, retirée après transition. La Veilleuse reprend aussi les changements visuels du compagnon source.
- Réduction des mouvements : ni animation des sprites, ni fondu, ni transition du zoom.

Les déplacements restent inférieurs au pixel de la cellule de base pendant les boucles ordinaires. Le fond et la pose du sprite sont animés séparément du mouvement du corps. Les changements de personnage ne réinitialisent pas les signaux d’activité ni les délais de sommeil.
