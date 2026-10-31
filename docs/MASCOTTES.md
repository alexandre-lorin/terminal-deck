# Compagnons de terminal

Les panneaux Codex affichent un compagnon stable, choisi à partir de leur identifiant.
La Veilleuse reprend le même personnage et le même état que le Codex actif. Si le panneau actif est un shell, elle utilise le premier Codex du projet. Sans Codex, elle conserve sa rotation décorative.

- Sans signal : état inconnu, léger balancement décoratif (notamment dans `/resume`), jamais une animation de travail.
- `idle` : respiration légère, puis sommeil après 45 secondes sans travail.
- `working` : boucle de quatre poses au clavier.
- `blocked` : posture attentive ; l’état ne précise pas nécessairement une question.
- `done` : petit bond ponctuel, puis sommeil après 45 secondes ; cela n’annonce pas que la tâche est réussie.
- `error` : image désaturée et libellé explicite au survol.
- Sortie du processus : retour à l’état inconnu.

Les préférences système de réduction des mouvements arrêtent les animations.
Chaque panneau Codex affiche son compagnon fixe de 96 pixels en bas à droite, décalé de 36 pixels depuis le bord. La marge latérale réservée est supprimée : le terminal utilise toute sa largeur et le compagnon se superpose localement à son contenu. Le survol agrandit le compagnon à 128 pixels ; le clic ouvre l’écran de veille du panneau avec le personnage centré en grand. Un second clic ou Échap revient au terminal. Le bouton est accessible au clavier. Sur les panneaux étroits, les tailles normales et au survol sont de 72 et 96 pixels ; les panneaux trop courts le masquent.

## Signal

Le parseur xterm écoute uniquement OSC 7501 : `state=working:app=codex`, etc.
Aucune lecture de transcript, de prompt ou de base de conversations ; aucun hook
ajouté ni modification du compte. Une ancienne version sans ce signal conserve
uniquement son mouvement décoratif. Le texte du terminal n’est jamais interprété comme une activité.

Source primaire : https://github.com/openai/codex/blob/main/codex-rs/tui/src/terminal_program_status.rs

## Assets

- `assets/mascots/trio.png` : original de Toubi, conservé intact.
- `assets/mascots/working-sheet.png` : planche transparente créée avec l’outil intégré imagegen.

La planche générée comporte une marge supérieure importante : les fenêtres CSS
utilisent les positions effectivement observées, pas une hypothèse de grille régulière.

Prompt utilisé :

> Use case: identity-preserve. Create a production pixel art animation sprite sheet based exactly on the three supplied violet mascots: slime, bat, robot. Transparent background. Output a square sheet divided into an EXACT invisible 4-column by 3-row equal-cell grid. Row1 only slime, row2 only bat, row3 only robot. Each cell contains the same full character at identical scale and anchored baseline within its row with generous transparent padding. Columns are four sequential frames of a seamless working loop: sitting behind a tiny charcoal computer keyboard, alternating small left and right paw/hand taps; slime uses tiny pseudopod hands, bat its little wing hands, robot its hands. Preserve original identities, face, ears, antennae, violet charcoal ivory colors and pixel art. Small gentle bounce and blink, not exaggerated. Exactly twelve sprites total, no extra rows, no text, labels, grid lines, scenery, shadows or glow beyond original. All sprites isolated from adjacent cells; crisp square pixel blocks; alpha transparent.

## Vérification

Tests unitaires du protocole et rejet des signaux étrangers/inconnus.
Test Electron/xterm des transitions avec signaux synthétiques explicites et capture.
Vrai CLI avec profil temporaire sans compte : signal `idle` effectivement reçu.
Une génération réelle et ses demandes d’approbation restent à vérifier en usage :
aucun prompt modèle n’est envoyé par le banc de test.

## Sommeil et hauteur — ajustement

Le compagnon est remonté de 58 à 68 pixels selon la hauteur du panneau, pour rester
à distance des avertissements de quota et de la saisie. Les panneaux trop courts
le masquent afin de préserver leur contenu.

`assets/mascots/sleeping-sheet.png` est une nouvelle planche transparente de quatre
poses par personnage, réalisée avec l’outil intégré imagegen. Les originaux restent
intacts. Après 45 secondes d’un état réel `idle` ou `done`, elle remplace le personnage
éveillé. Un nouvel état de travail, attente ou erreur le réveille immédiatement.
L’état inconnu ne déclenche jamais le sommeil. La Veilleuse suit ce même état visuel.
Les temporisateurs sont libérés quand les compagnons sont supprimés.

Les tests Electron vérifient l’endormissement, la synchronisation et le réveil avec
une horloge accélérée ; ils n’envoient pas de prompt à un compte réel.

Prompt de la planche de sommeil :

Use case: identity-preserve. Edit the three reference pixel mascots into a sleeping animation sprite sheet. Keep exactly the identities, violet charcoal ivory palette, pixel blocks and recognizable silhouette of the slime, bat, and robot. Fully transparent background, no shadows or scenery. Square sheet, EXACT invisible 4 columns by 3 rows of equally sized cells, each sprite centered at identical scale and baseline. Row1 slime, row2 bat, row3 robot. Four sequential frames per row: curled or settled sleeping, closed eyelids, gentle breathing inhale and exhale. Bat folds its wings and relaxes its huge ears, robot sits eyes closed with antennae relaxed, slime settles into a soft puddle. Small floating pixel Z shapes optional confined within each cell, no other text. No keyboard. All 12 sprites separated by generous transparent margins and inside their own cells, no visible grid. Calm, cute and understated, designed to loop at very slow speed in a dark terminal interface.

## Écran de veille par conversation

Le survol ou le focus clavier agrandit discrètement le compagnon. Un clic ouvre un écran de veille dans le panneau concerné : fond noir à 80 % d’opacité, léger flou et personnage centré, dimensionné selon la place disponible. Les autres panneaux restent utilisables. Un nouveau clic ou Échap ferme cet écran et rend le focus au terminal. Le même sprite continue de recevoir les états réels de Codex, sans interrompre son processus.

## Présence et fin de tour

Le menu de reprise conserve un balancement décoratif léger. Le signal natif `done` déclenche un double rebond discret et deux petites étincelles pendant 1,8 seconde, sans affirmer que la tâche est réussie. Les mouvements et les étincelles respectent la réduction des animations du système.

Les trois expressions dessinées supplémentaires (curiosité, attente et réveil) sont détaillées avec les planches et prompts dans `docs/EXPRESSIONS-MASCOTTES.md`.

## Respiration après la fin et sommeil fluide

Après la courte célébration, le signal `done` conserve une respiration décorative en boucle jusqu’au sommeil. La fin de la célébration ne laisse plus le personnage figé. Au sommeil, la première pose dessinée reste stable : une respiration continue de 5,5 secondes et un petit « z » flottant remplacent les changements de silhouette par à-coups. Le réveil et les autres états restent inchangés.
