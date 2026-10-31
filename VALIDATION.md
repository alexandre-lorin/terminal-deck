# Validation locale — 22 octobre 2026

Environnement : Arch Linux / Hyprland, Node.js 26.12, Electron 45, node-pty 1.1.
Recette graphique et ouverture utilisateur effectuées via XWayland (`--ozone-platform=x11`).
Le lancement Wayland natif depuis l'environnement restreint de Codex rencontre des
erreurs d'accès DRM/GPU ; il reste à vérifier depuis une session utilisateur normale.

- `npm install` : installation et reconstruction native réussies ; audit npm sans vulnérabilité signalée.
- `npm run check` : syntaxe des sources, scripts et tests vérifiée.
- `npm test` : 4 tests réussis (arbres de panneaux, fermeture et équilibrage,
  validation des descripteurs, restauration et permissions de fichier).
- `npm run test:ui` : recette Electron réussie avec profil et HOME temporaires.
  Vérification d'un vrai PTY et du dossier de travail, saisie clavier, compositeur,
  divisions et redimensionnement, navigation entre projets sans arrêter les shells,
  palette pilotée au clavier, radar, concentration et contraste monochrome.
  Bouton Codex testé avec un exécutable fictif : terminal interactif, saisie,
  réception de réponse, fin du processus et fermeture du panneau.
  Annulation de fermeture d'un shell, sortie volumineuse de 1 Mio, validation IPC,
  sauvegarde, redémarrage en pause et relance du shell également vérifiés.
- Lanceur local et entrée de menu installés avec `npm run install:local`.

La recette ne vérifie pas la connexion à un vrai compte Codex, ses quotas,
ni la reprise d'une ancienne conversation. Ces fonctions ne sont pas simulées
dans le produit. Les contenus des vrais terminaux n'ont pas été capturés.

Le contrôle du flux limite la sortie en attente de rendu : node-pty est mis en
pause au-delà de 128 K caractères non acquittés et reprend sous 64 K. La capture
de recette est sous `artifacts/terminal-deck.png`, exclue de Git.


## Révision du 23 octobre 2026

- Interface compacte : retrait du compositeur et du pied de page ; une seule barre
  supérieure avec projet, titre actif et commandes essentielles. Les contrôles
  secondaires restent accessibles depuis Ctrl K. Onglets affichés en vue agrandie.
- Titre natif OSC 0/2 affiché dans le panneau, l'en-tête, les onglets et le radar.
  Le lancement Codex demande `tui.terminal_title=["thread-title"]`, sans modifier
  la configuration globale ni lire les données de conversation.
- Ctrl Retour arrière : suppression du mot précédent vérifiée dans un vrai shell.
- Ctrl Maj V : collage vérifié dans le shell et un programme interactif ; le canal
  presse-papiers est remplacé uniquement dans l'instance de test par un texte fictif.
- Maj Entrée : séquence distincte d'Entrée vérifiée à travers un vrai PTY en mode brut.
  Ctrl Retour arrière et le collage protégé sont également vérifiés octet par octet.
- Titres initiaux et renommage testés avec un faux Codex, sans compte ni appel modèle.
- `npm run check`, les 4 tests unitaires et la recette Electron : réussis.
- Rechargement de l’interface puis nouvelle commande dans le même PTY : réussi,
  sans arrêt des deux shells ouverts.


## Fermeture directe et panneaux réduits — 23 octobre 2026

Fermeture immédiate de la fenêtre et des panneaux, sans dialogue. Ctrl Q ferme
le panneau sous la souris et Ctrl T le réduit sans tuer le processus. Les panneaux
réduits restent restaurables par leur titre ; leur état est mémorisé.

La recette couvre un focus clavier différent du panneau survolé, l'absence d'action
hors panneau, la réduction de tous les panneaux, la continuation d'un shell masqué,
la restauration de la disposition, et la fermeture de fenêtre avec un shell actif.
Un faux dialogue de confirmation fait échouer le test s'il est appelé.


## Version 0.2 — 23 octobre 2026

Cause du collage texte : `clipboard.readText()` retourne une Promise sous Electron
45. La lecture attend maintenant cette Promise avant de limiter le texte. L’écriture
attend également sa Promise pour transmettre les erreurs réelles.

La recette utilise désormais Ozone headless, sans DISPLAY ni WAYLAND_DISPLAY :
le presse-papiers natif d’Electron est propre à ce processus et ne touche pas au
bureau. Le canal IPC de production reste intact. Copier/coller Unicode et texte
long (borne de 60 000 caractères), puis insertion clavier dans shell et PTY brut,
sont testés avec les vraies API. Aucun faux `readText` ou canal IPC de remplacement.

La recette du vrai Codex 0.164.0, avec profil temporaire et fournisseur local fictif,
confirme : `resume --all` au démarrage ; Échap conserve le processus et crée le
nouveau chat ; `/resume` affiche All grâce à l’adaptateur ciblant le filtre natif.
Aucun compte n’est utilisé et aucun prompt de génération n’est envoyé.

Le style reprend les principes de Firefox/Périgée, sans modifier leurs fichiers :
noir profond, lignes fines, sessions à gauche, icônes SVG et variante Périgée
facultative. Les identifiants internes de chats non nommés sont masqués au profit
du libellé Codex.

L’application des préférences est testée sur un AGENTS temporaire : contenu antérieur
préservé, sauvegarde créée, deuxième application sans doublon. Le fichier global
réel n’a pas été modifié par l’agent.

Contrôles 0.2 : `npm run check`, 7 tests unitaires, `npm run test:ui` et
`npm run test:codex` réussis. Captures sur données fictives : `empty-workspace.png`,
`terminal-deck.png`, `perigee.png` et `native-codex-picker.png` sous `artifacts/`.


## Version 0.3 — popup La Veilleuse

- Popup non modal et déplaçable : quotas Codex, fenêtres, échéances annoncées,
  ancienneté du relevé, rafraîchissement manuel et automatique toutes les cinq minutes.
- Normalisation sans conversion des valeurs absentes en 0 ; cache, erreurs,
  dépassement de délai et dernier relevé conservé couverts par les tests.
- Test du temps accéléré : une nouvelle lecture à cinq minutes ; aucune lecture
  supplémentaire une fois le popup fermé. La recette utilise une source fictive,
  séparée du véritable presse-papiers Electron déjà vérifié.
- Le vrai CLI accepte `initialize` puis reçoit `account/rateLimits/read` ; avec
  un CODEX_HOME temporaire sans compte, il refuse correctement le relevé pour
  absence d’authentification. Aucun prompt modèle ou thread n’est créé.
- Lecture avec le profil réel : impossible dans l’environnement de l’agent, le CLI
  s’arrêtant avant les réponses avec une erreur de système de fichiers en lecture
  seule. Aucun quota utilisateur réel n’a donc été validé ici.
- Capture de recette : `artifacts/usage-popup.png` (pourcentages fictifs).

### Ajustements du 23 octobre

- Les jauges affichent le quota restant (`100 - usedPercent`), comme `/status`.
- Le test UI vérifie la valeur accessible et l’ancrage initial en bas à droite.
- Deck lance Codex avec `tui.keymap.composer.queue=[]`, sans bloquer Tab dans les listes ou le shell. Le vrai CLI accepte ce réglage au lancement ; l’envoi pendant une génération réelle n’est pas testé.
- La configuration globale `.codex/config.toml` reste à modifier depuis la session utilisateur : ce dossier est en lecture seule ici.

## Compagnons animés

Voir `docs/MASCOTTES.md` : protocole OSC 7501, transitions synthétiques dans xterm, signal de repos du vrai CLI, et limites de validation sans génération réelle. Les préférences de réduction des mouvements sont vérifiées dans Electron.

## Placement, synchronisation et lancement direct

- Mascotte de 96 pixels au-dessus de Quotas dans la barre latérale ; personnage et signaux synchronisés avec la Veilleuse, y compris après changement de Codex actif.
- Recette du vrai CLI lancée sans clic sur l’accueil : sélecteur All ouvert automatiquement, Échap et `/resume` conservés. Aucun prompt modèle.
- Super Maj Entrée ajouté à Hyprland ; rechargement sans erreur, liaison active confirmée avec `hyprctl binds`.

- Focus au survol vérifié avec une vraie saisie shell sans clic ; la sélection suit également le focus clavier. Le compagnon de 96 pixels est placé dans la barre latérale et les panneaux conservent toute leur hauteur.

## Choix final — variante fixe

- Un compagnon par terminal Codex, ancré en bas à droite ; la marge latérale évite de recouvrir les cellules du terminal.
- Deux compagnons simultanés vérifiés, avec des états indépendants ; la Veilleuse suit le panneau actif.
- L’ancien compagnon de la barre latérale est retiré. Les deux maquettes HTML sont conservées dans `docs/demos/`.

## Hauteur, sommeil et reprise partagée

- Compagnon remonté ; nouvelle planche de sommeil transparente.
- 45 secondes au repos : sommeil synchronisé avec la Veilleuse ; reprise du travail : réveil immédiat. Vérifié dans Electron avec l’horloge accélérée.
- Nouveau test avec un vrai socket local : choix du service partagé explicite.
- Recette de deux clients réels sur un service de test : bloquée par le répertoire de rendez-vous volontairement inaccessible dans le sandbox ; aucun contournement. Voir `docs/VERROUS.md`.

## Compagnon interactif sans bande latérale

- Suppression des 112 pixels réservés à droite : retour à la marge normale de 5 pixels.
- Compagnon de 96 pixels, décalé à gauche ; clic pour agrandir à 144 pixels.
- Test UI du clic, second clic, activation clavier avec Entrée et réduction avec Échap, ainsi que des dimensions et du maintien des animations natives.

## Écran de veille du chat

La recette Electron vérifie le grossissement au survol, la couverture du seul panneau concerné, l’opacité noire de 80 %, le clic de fermeture, l’activation clavier et Échap. Le compagnon conserve son état et le processus du terminal continue.

## Mouvement du sélecteur et réaction de fin

Le mouvement décoratif du compagnon est vérifié dans le vrai sélecteur Codex. Les tests UI vérifient séparément le signal de fin, le rebond et les étincelles, avec les mêmes sprites et sans prompt modèle.

## Expressions dessinées

- Chargement et dimensions des trois nouvelles planches vérifiés dans Electron.
- Curiosité dans le vrai sélecteur natif, attente sur signal `blocked`, séquence de réveil et retour au travail vérifiés.
- Une intervention pendant le réveil annule immédiatement cette pose ; son temporisateur ne rétablit pas une ancienne expression.
- Synchronisation avec les quotas et respect de la réduction des mouvements vérifiés avec les signaux synthétiques de recette, sans prompt modèle.

## Continuité du mouvement

Les tests Electron échantillonnent les transformations CSS après la fin de la célébration : la respiration continue effectivement. Pour le sommeil, ils vérifient un changement de transformation avec un timing continu `ease-in-out`, sans changement de frame ou de position de la planche.

## Atelier local des compagnons

- Modèle : limites des cadres, masques, rechargement des JSON et dimensions de toutes les planches vérifiés.
- Serveur : routes limitées, lecture seule, refus des chemins arbitraires et CSP vérifiés.
- Recette réelle Electron : sélection des personnages, glissement du cadre, clavier, pelure, vitesse, sauvegarde et rechargement, téléchargement natif de PNG/JSON, réimport et disposition sur écran étroit.
- Empreintes des six images sources identiques avant et après la recette. Aucun compte, aucun prompt, aucune donnée de terminal réelle utilisée.
- Le rendu des poses source est distinct des transformations décoratives de Deck ; les exports ne sont pas appliqués à l’application.

## Sessions, attention et historique — 23 octobre 2026

- `npm run check` et `npm test` : validation des métadonnées, compagnon borné à trois choix, historique limité à 80 entrées, réécriture sans contenu de terminal.
- Recette Electron/xterm/PTY isolée : recherche d’une session, favori puis filtre, choix Vesper, sauvegarde effective dans le profil temporaire, synchronisation des quotas, restauration au rechargement.
- Signaux OSC de test injectés dans le vrai parseur xterm : attente → entrée d’attention → retour au panneau et acquittement ; travail/attente → fin → une entrée d’historique. Rechargement avec ancien buffer : aucune nouvelle entrée ou alerte.
- La recette ne contacte aucun compte Codex. Les signaux d’activité de ce scénario sont des fixtures explicites ; aucune tâche modèle réelle n’est envoyée.
- Les notifications système sont conditionnées à Electron `Notification.isSupported()` et au focus de la fenêtre. Leur affichage et leur clic sous le bureau Hyprland personnel ne sont pas validés par la recette headless ; la navigation dans l’application l’est.
- Dans cette révision du 23 octobre, le compagnon et les favoris suivaient un panneau Deck. La révision du 24 octobre ci-dessous ajoute une association à l’identité native reconnue, sans indexer tous les chats externes.

## Amélioration des animations — 23 octobre 2026

- Recette réelle Electron : les trois personnages ont un mouvement de frappe distinct ; échantillonnage de la transformation à deux instants pour vérifier qu’elle change.
- Fondu : opacité intermédiaire vérifiée sur la couche navigateur et retrait après la fin de son animation.
- Fin de tour : respiration toujours active après le bond. Sommeil : cadrage fixe et mouvement continu, sans fonction de timing par sauts.
- Conservation des contrôles existants : réveil interruptible, état et pose synchronisés avec les quotas, agrandissement par survol, écran de veille par clic et retour par Échap, réduction des mouvements.
- Les signaux de recette sont fictifs, injectés dans le vrai xterm ; aucun compte ni prompt modèle utilisé.

## Livraison du 24 octobre 2026 — conversation, confort et poses

- Recette du vrai CLI installé, sans compte ni prompt : `thread-id` + `thread-title` accepté, extraction du préfixe natif et de l’UUID complet de la conversation non nommée, identifiant masqué dans le titre visible ; sélecteur All initial et `/resume` préservés.
- Recette Electron/xterm : même identité dans deux panneaux, partage d’un choix Byte puis Vesper et du favori, renommage, autre chat portant le même nom sans héritage du favori, retour au premier chat, fermeture puis reprise explicite du favori par UUID. Les identités et sorties de ces scénarios sont des fixtures locales.
- Ctrl Page précédente/suivante, champ de recherche protégé du focus au survol, menu compact à 920 × 620 et Échap : vérifiés dans Electron. Les anciens parcours de collage natif, saisie shell/Codex et raccourcis restent inclus.
- Salut au repos, refus de saluer pendant le travail/sommeil, regard, bâillement à 43,2 s, sommeil à 45 s et interruption native : vérifiés. Les PNG sont décodés par le navigateur ; aperçu des six nouvelles poses représentatives dans `artifacts/new-companion-poses.png`.
- Atelier : les deux planches sont incluses dans la liste de sources ; exports/imports PNG/JSON, cadrage et empreintes des sources vérifiés par `npm run test:studio`.
- Lecture D-Bus du service de notifications personnel : Mako répond à `GetServerInformation`. Aucun test d’affichage ou de clic d’une notification réelle n’est revendiqué.

## Ctrl + glisser les panneaux

- Tests de l’arbre : échange, insertion sur quatre bords, conservation de tous les identifiants dont les panneaux réduits, maintien des ratios hors insertion, arbres inchangés pour cibles invalides.
- Vrais gestes pointeur dans Electron : échange puis retour, placement au-dessus puis à droite, aperçu, Échap, relâchement de Ctrl et dépôt hors cible. Sans Ctrl, aucun changement d’arbre.
- Le même shell imprime le même PID avant et après les déplacements ; aucun processus n’est recréé. La disposition réellement écrite dans le profil temporaire correspond à l’arbre affiché. Les scénarios de rechargement et relance de l’application restent dans la même recette.
- Capture utile : `artifacts/pane-drag-preview.png`, uniquement données synthétiques de recette.

## Démarrage automatique de tous les Codex — 25 octobre 2026

- `npm run test:startup` : 1, 3 et 16 panneaux Codex, vrais Electron et PTY avec un CLI fictif ; chaque panneau démarre, aucun panneau visible ne reste sur « Lancer Codex ». Le panneau sélectionné, les réductions, les shells en pause et les autres projets sont conservés. Un rechargement ne crée pas de panneau supplémentaire et réattache les processus.
- Le premier vrai test multi-CLI sur un CODEX_HOME neuf a révélé une course dans les migrations SQLite natives de Codex. Deck attend désormais l’écran natif ou le signal d’activité du premier TUI avant de lancer les autres (attente plafonnée à 10 s). Aucune base ni aucun verrou ne sont modifiés par Deck.
- Détection de l’en-tête compact `Filter: All … Sort:` ajoutée. Le passage depuis Cwd reste conditionné aux attributs natifs de sélection et de focus ; aucune touche n’est envoyée dans un autre écran.
- `npm run test:codex` vérifie trois vrais CLI sans compte, fournisseur local fictif et sans prompt modèle. Tous arrivent sur All ; Échap → nouveau chat et `/resume` → All sont ensuite vérifiés dans le premier panneau.
- Vérification de syntaxe, 20 tests unitaires et recette habituelle Electron/PTY exécutés.

## Fox Loaf et Corbac mini — 25 octobre 2026

- Catalogue partagé à cinq entrées, indices 0/1/2 conservés, choix 3 et 4 acceptés dans les descripteurs et fiches de conversation. Les attributions automatiques historiques restent au modulo 3.
- Recette Electron/xterm/PTY : cinq cartes de choix et cinq aperçus tournants sans Codex. Fox Loaf et Corbac mini choisis via l’interface, synchronisés entre deux panneaux de la même conversation et les quotas ; valeurs 3/4 vérifiées dans le profil réellement sauvegardé via IPC.
- Poses : atlas correct au clavier et en attente, refus de saluer pendant l’attente, salut au repos, bâillement à 43,2 s, sommeil à 45 s sur la dernière pose stable, réveil puis retour au clavier. La réduction des mouvements conserve une pose fixe.
- Écran de veille de chaque nouvel animal ouvert au clic puis fermé par Échap. Captures synthétiques `artifacts/fox-loaf-screensaver.png`, `artifacts/corbac-mini-screensaver.png` et `artifacts/five-companion-choices.png`.
- Cadrage des 48 sprites inspecté en lecture seule sur les bandes alpha ; origines corrigées dans les métadonnées sans retoucher les PNG. Capture comparative : `artifacts/new-companion-poses.png`.
- Atelier : cinq personnages, changement rapide expression/personnage, résolution des sources, réglages séparés entre clavier et attente, export Corbac mini PNG/JSON, import des réglages vers le bon état du même atlas, sommeil sur une pose, retour à une planche du trio. Empreintes des dix sources préservées.
- `npm run check`, 21 tests unitaires, `npm run test:ui` et `npm run test:studio` exécutés. Aucun compte ni prompt modèle utilisé par les recettes ; les assets sont issus de l’outil intégré imagegen.


## Accès aux compagnons — 25 octobre 2026

- Bouton latéral **Compagnons** ajouté pour rendre le choix visible sans connaître le symbole ♧.
- Recette Electron : collection de cinq cartes visible sans Codex, puis ouverture du choix du Codex actif par ce bouton. Depuis un shell sélectionné, choix Fox Loaf et Corbac mini appliqués au Codex du projet et sauvegardés ; les autres accès restent disponibles.


## Harmonisation graphique — 25 octobre 2026

- Fox Loaf et Corbac mini redessinés avec l’outil intégré imagegen à partir du trio et des atlas précédents : formes simplifiées, yeux et contours plus francs, couleurs orange/charbon conservées. Les anciens PNG restent présents ; les sources actives utilisent des noms versionnés.
- Cadrages de six rangées vérifiés sur les bandes alpha sans retouche de PNG, puis présence et poses observées dans le vrai rendu Electron. Le masque gauche du renard est partagé avec l’atelier, exporté en JSON et appliqué aux PNG rendus.
- Tests de modèle : masque borné à la taille du cadre et aller-retour du manifeste. Recette atelier : masque gauche actif = bande transparente, désactivation = pixels visibles, rétablissement = bande transparente. Export Corbac mini PNG/JSON puis import vers la bonne expression de la source versionnée.
- Les choix 3/4, la synchronisation entre panneaux/quotas, le salut, le bâillement, le sommeil fixe, le réveil et l’écran de veille restent dans la recette UI. Les compteurs de tests ne représentent pas une validation du nombre exact de couleurs ou d’une grille pixel manuelle.
- `npm run check`, 21 tests unitaires, `npm run test:ui` et `npm run test:studio` exécutés. Les captures `five-companion-choices.png` et `new-companion-poses.png` montrent le rendu actuel ; leurs anciennes versions sont conservées avec le suffixe `-v1`.

## Migration Tauri — 26 octobre 2026

- Source Rust dans `src-tauri`, interface partagée, construction npm/Cargo, profil séparé et lanceur parallèle récupérable.
- Git : tests de lecture d’un vrai dépôt, noms avec espaces/retours à la ligne/renommages, absence d’index créé ; instructions globales sauvegardées et idempotentes sur un AGENTS temporaire.
- Comparaison mémoire réelle mais synthétique : trois shells, Xvfb sans GPU, cinq secondes au repos. Electron 218 Mio PSS application ; Tauri release 333,4 Mio. Aucun gain PSS démontré ; ne pas confondre RSS cumulée et mémoire attribuable.
- La session de bureau et ses processus ne sont pas visibles dans l’environnement de recette ; `npm run memory` est prévu pour cette mesure sur l’hôte.
- Recette native Tauri : WebKitGTK réel, vrais PTY, shell/redimensionnement/fermeture, clavier X11 via xdotool, presse-papiers propre à Xvfb, Codex/protocole de quotas fictifs, cinq pets et sauvegarde, atelier isolé. Aucun prompt réel.
- Le banc Tauri utilise Xvfb et xdotool installés uniquement sous `/tmp/deck-native-tools` ; variables `DECK_XVFB` et `DECK_XDOTOOL` pour les fournir autrement. Playwright de comparaison sous `/tmp/deck-ui-tools`. Aucun changement du bureau requis.
- Les notifications de bureau, Wayland réel et la reprise d’un compte réel restent à vérifier en usage. La recette partagée de verrou antérieure reste bloquée dans le sandbox ; aucune nouvelle promesse à ce sujet.

Résultat final de la migration : 25 tests JavaScript et 7 tests Rust passent.
Syntaxe JavaScript et format Rust vérifiés. Recettes Electron UI, démarrage 1/3/16
et atelier passent. Recette Tauri complète : raccourcis réellement envoyés par
xdotool, presse-papiers natif isolé, export PNG écrit par Rust et signature vérifiée,
refus des commandes Deck depuis l’atelier, fermeture de fenêtre native avec code 0.
Le binaire release normal a aussi été lancé séparément : absence des commandes
native_smoke dans le binaire, fenêtre WebKitGTK, Ctrl Maj N et saisie dans un shell
réel vérifiés (`scripts/tauri-production-smoke.cjs`, capture `artifacts/tauri-release.png`).
Installation parallèle effectuée : lanceur `terminal-deck-tauri`, menu dédié,
profil Electron copié une seule fois avec sauvegarde privée. Lanceur principal
Electron conservé en attendant le choix de Toubi, compte tenu du résultat mémoire.
Aucun commit créé et aucun AGENTS global modifié automatiquement.

## Dictée intégrée — 27 octobre 2026

- Nouvelle carte Electron Linux : F9 / micro, capture avec niveau audio, F9 ou Entrée pour transcrire, texte modifiable, puis Envoyer/Entrée. Échap annule. Pas d’envoi automatique sur silence ou bruit, pas d’interaction avec le mode conversation F8.
- Ciblage du PTY par identifiant et token, sans presse-papiers ni injection clavier Hyprland. Un seul IPC transporte le texte bracketed-paste suivi d’Entrée.
- `npm run check` et `npm test` : 30 tests passent. `npm run test:ui` : recette existante Electron/PTY complète réussie. `node scripts/dictation-smoke.cjs` et `DICTATION_NATIVE=1 npm run test:dictation` : parcours de dictée réussi en Electron headless et sous Wayland.
- La recette d’interface utilise explicitement un faux CLI, une capture PCM et un décodeur de fixture, avec de vrais sous-processus, un vrai Electron et un vrai PTY. Elle vérifie le texte modifié, l’absence d’envoi avant validation, l’envoi unique, Échap pendant capture/transcription, l’absence de résultat tardif et le changement de panneau. Aucun prompt envoyé à un compte.
- Capture PipeWire réelle vérifiée séparément via le nouveau gestionnaire : microphone ouvert, mesure audio disponible, arrêt et nettoyage réussis. La reconnaissance de parole française par le modèle large-v3-turbo et la voix de Toubi restent à essayer ; ne pas confondre le décodeur de fixture avec ce test.
- Captures de recette : `artifacts/dictation-recording.png` et `artifacts/dictation-review.png`, uniquement données de test.
- Ancien source Hyprland F9 commenté avec sauvegarde `~/.config/hypr/hyprland.conf.before-dictation-card-20261027-183145` ; configuration valide, aucun bind F9 global restant. Fichiers anciens conservés.
- La fenêtre personnelle existante n’a pas été relancée : sa fermeture arrête ses PTY. La carte devient disponible à la prochaine ouverture de Terminal Deck Electron. Le moteur Tauri conserve l’interface existante sans cette fonction.
