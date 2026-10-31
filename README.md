# Terminal Deck 0.4

Cockpit local pour Codex et vos shells. Interface HTML/CSS/JavaScript et xterm.js,
moteur **Tauri 2 / Rust / portable-pty** disponible en parallèle du moteur Electron.
Le moteur Tauri ne lance ni Node ni Electron ; les CLI hébergés gardent leur propre runtime.

## Utilisation

```sh
npm install
npm start              # développement Tauri
npm run build:tauri     # binaire optimisé
npm run install:tauri   # lanceur terminal-deck-tauri, profil séparé
npm run start:electron  # version Electron conservée
```

La compilation Tauri demande Rust, GTK 3 et WebKitGTK 4.1 sous Linux. Le projet
reste dans son dossier historique pour préserver les chemins existants.
`postinstall` prépare encore Electron/node-pty pour la version de comparaison.
Le binaire Tauri installé ne dépend pas de leur exécution.

Le lanceur principal n’est pas remplacé par l’installation parallèle. Pour le
remplacer explicitement : `node scripts/install-tauri.cjs --replace`. Le profil
Electron est copié une seule fois dans `~/.config/terminal-deck-tauri`, sans modifier
la source. Les deux profils évoluent ensuite séparément.

[Migration, vérifications et mémoire](docs/MIGRATION-TAURI.md).
Bouton **Git** en haut : branche et fichiers modifiés, en lecture seule.
`npm run memory` mesure les processus Deck visibles depuis votre session.

- Projets accessibles dans la barre latérale ; catalogue des dossiers de `~/01 - Dev`
  et `00 - Projets à tester`, ou choix d'un autre dossier.
- Codex ou shell dans chaque panneau ; divisions horizontales/verticales,
  séparateurs déplaçables, grille équilibrée et panneau agrandi avec onglets.
- Les terminaux restent actifs en changeant de projet ou en réduisant un panneau.
  Les titres des panneaux réduits permettent de les restaurer. Radar de toutes les sessions.
- Renommer un terminal en cliquant sur son nom. Recherche dans sa sortie.
- Barre supérieure compacte : projet et titre du terminal actif. Aucun compositeur
  ni bandeau d’état en bas ; les actions secondaires se trouvent dans Ctrl K.
- Le titre natif du terminal est repris dans les panneaux, les onglets et le radar.
  Pour Codex, Deck demande `thread-id` et `thread-title` ; seul le nom lisible est affiché. L’identité technique sert aux préférences de conversation.
  Le renommage manuel d’un panneau reste disponible en cliquant sur son titre.
- Noir neutre par défaut ; contrastes graphite et cendre, et ambiance **Périgée**
  à accent violet discret, disponible dans Ctrl K. Les sessions du projet actif
  sont accessibles directement dans la barre latérale.

## Raccourcis

| Action | Raccourci |
|---|---|
| Palette de commandes et navigation | Ctrl K |
| Nouveau Codex | Ctrl N |
| Nouveau shell | Ctrl Maj N |
| Terminal à droite | Ctrl Maj D |
| Concentration | Ctrl Maj F |
| Radar des sessions | Ctrl Maj O |
| Agrandir/restaurer le panneau | Ctrl Maj Entrée |
| Sélectionner un panneau | Alt 1…9 |
| Chercher dans le terminal | Ctrl F |
| Copier/coller dans le terminal | Ctrl Maj C / V |
| Fermer le panneau sous la souris, directement | Ctrl Q |
| Réduire le panneau sous la souris | Ctrl T |
| Fermer le panneau actif, directement | Ctrl Maj W |
| Effacer le mot précédent | Ctrl Retour arrière |
| Saut de ligne dans Codex, sans envoyer | Maj Entrée |
| Dicter un message (moteur Electron Linux) | F9 ou bouton micro |

La dictée ouvre une carte dans le Codex ciblé. Parlez, puis F9, Entrée ou
**Terminer** lance la transcription. Le texte reste modifiable ; **Envoyer** ou
Entrée l’envoie au terminal. Échap annule. Aucun bruit ne déclenche d’envoi ni
d’interruption de Codex. La carte ne répond pas à voix haute.

Le microphone passe par PipeWire et la transcription par Whisper local, avec le
modèle multilingue Falcon existant (`large-v3-turbo`, sinon `base`). Aucun compte,
réseau ou presse-papiers n’est utilisé par cette fonction. Audio et transcription
sont temporaires, nettoyés après validation, annulation ou fermeture normale.
Une interruption brutale du système peut laisser les fichiers sous `/tmp`.
Le moteur Tauri conserve son fonctionnement et ne propose pas encore cette carte.
Recette : `npm run test:dictation` (vrais Electron/PTY, audio et décodeur de fixture
explicites) ; `DICTATION_NATIVE=1 npm run test:dictation` utilise Wayland.

## Persistance et limites de cette première version

`~/.config/terminal-deck/workspace.json` conserve les dossiers, noms, dispositions,
états réduits, derniers titres, favoris, compagnons choisis, dates de consultation, tailles de texte et contraste. Aucun contenu de terminal ou de prompt n'est
enregistré par Deck. L'historique et les conversations que les programmes lancés
enregistrent eux-mêmes restent gérés par ces programmes.

Fermer l'application, notamment avec Super Q sous Hyprland, arrête ses terminaux
sans demander de confirmation. Fermer un panneau arrête son terminal directement. À la réouverture,
tous les panneaux Codex du projet actif démarrent dans le sélecteur de conversations, y compris les panneaux réduits. Les shells et les autres projets restent en pause. **Lancer** ouvre un nouveau processus ; il ne reprend
pas automatiquement une ancienne conversation Codex. La sortie précédente reste
consultable tant que l'application est ouverte, avec un historique borné en mémoire.
Le cache de réattachement est limité à 512 K caractères par terminal.

Le bouton Codex lance `codex resume --all` dans le dossier du projet avec
`-c 'tui.terminal_title=["thread-id","thread-title"]'`. Toutes les conversations actives sont
proposées. **Échap** dans ce sélecteur démarre un nouveau chat. Lors d’un `/resume`
ultérieur, Deck sélectionne aussi le filtre **All** dans l’interface native. L’option `tui.terminal_title` concerne seulement le titre
de la fenêtre ; les permissions et l'authentification du CLI restent inchangées.
La configuration globale de Codex n'est pas modifiée. Le dernier titre émis par le terminal est conservé dans le descripteur du panneau ; Deck ne lit pas les bases de conversations pour le retrouver.
Les verrous des conversations déjà utilisées par un autre client restent gérés
par Codex : Deck ne supprime aucun verrou et ne force pas de reprise.
Les comptes ne sont pas isolés par panneau. L'état « en cours » indique que le
processus fonctionne ; il ne prétend pas mesurer l'activité ou le quota de l'agent.
Le shell hérite de votre environnement et charge sa configuration de connexion.

## Validation

```sh
npm run check
npm test
# Outils de recette hors dépendances de l'application :
npm install --prefix /tmp/deck-ui-tools --no-package-lock playwright
npm run test:ui
# Vérifier le vrai sélecteur Codex installé, sans compte :
npm run test:codex
```

La recette Electron utilise un HOME et un profil temporaires, de vrais shells et
un exécutable Codex fictif. L’affichage headless possède un presse-papiers isolé :
le test appelle les véritables API asynchrones de lecture/écriture d’Electron sans
accéder au presse-papiers du bureau. Elle ne lit pas les connexions et n’envoie
aucun prompt à un compte. La recette `test:codex` emploie le vrai CLI, un profil
temporaire et un fournisseur local fictif, sans appel à un modèle. Elle vérifie le PTY, les raccourcis clavier, les titres natifs, les panneaux,
le redimensionnement, les thèmes, la navigation, la fermeture et la restauration.
La capture `artifacts/terminal-deck.png` représente exclusivement ces données fictives.

Inspirations fonctionnelles : [Claude Deck](../electron--claude-deck/README.md) et
[mode Code de BridgeMind](https://docs.bridgemind.ai/docs/code-mode).

Les options de titre de Codex sont documentées dans les [commandes officielles](https://learn.chatgpt.com/docs/developer-commands#configure-terminal-title-items-with-title).


## Préférences d’interface et instructions Codex

Les préférences exprimées par Toubi sont regroupées dans
[docs/PREFERENCES-TOUBI.md](docs/PREFERENCES-TOUBI.md) et déjà intégrées à l’AGENTS du projet.
Pour les ajouter aux instructions globales sans écraser le contenu existant :

```sh
node scripts/apply-preferences.cjs
```

Le script cible `~/.codex/AGENTS.md`, sauvegarde sa version précédente et remplace
uniquement son propre bloc délimité. Une seconde exécution ne crée pas de doublon.
Il doit être exécuté par Toubi dans son terminal si le dossier `.codex` est en
lecture seule pour l’agent. Pour un autre AGENTS : `--target /chemin/AGENTS.md`.


## La Veilleuse — popup de quotas Codex

Cliquer sur **◴ Quotas** au pied de la barre latérale, ou rechercher **Quotas Codex** dans Ctrl K.
Le popup ne bloque pas les terminaux et peut être déplacé par son en-tête.
Il s’ouvre à côté du bouton, en bas et affiche les pourcentages restants, les fenêtres fournies par Codex, leurs dates
annoncées de réinitialisation et l’ancienneté du relevé. La mascotte est décorative,
pas un indicateur d’activité de l’agent.

Une actualisation a lieu à l’ouverture (cache de cinq minutes), puis toutes les
cinq minutes pendant que le popup reste ouvert. Le bouton ↻ force un relevé.
Fermer le popup arrête son actualisation périodique. Les sessions Codex ouvertes
dans Deck sont également accessibles depuis ce panneau.

Le relevé utilise `codex app-server --listen stdio://`, puis uniquement
`initialize`, `initialized` et `account/rateLimits/read`. Aucune conversation n’est
ouverte, aucun prompt n’est envoyé, aucune connexion n’est déclenchée par Deck.
Le CLI utilise sa connexion existante ; la lecture n’est pas disponible avec tous
les modes d’authentification. Les erreurs sont présentées sans diagnostics bruts.

Les données de quotas restent en mémoire. Une erreur conserve le dernier relevé
avec un état périmé ; une fenêtre absente reste inconnue, jamais à 0 % par défaut.
Le popup actuel est propre à Terminal Deck et à Codex ; ce n’est pas un widget de
bureau autonome ni un compteur Claude. Les quotas réels doivent être vérifiés
depuis une session utilisateur normale : l’environnement restreint de l’agent
bloque le démarrage du CLI avec le profil utilisateur en lecture seule.

API de quotas : [documentation officielle](https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt).

Le lancement Codex dans Deck désactive `tui.keymap.composer.queue` : Tab ne met plus le brouillon en file d’envoi. Les autres usages natifs de Tab restent disponibles.

La Veilleuse affiche le même personnage et le même état que le Codex actif. Sans Codex dans le projet, les cinq compagnons alternent à chaque ouverture : Blob, Vesper, Byte, Fox Loaf et Corbac mini. L’image source est conservée intacte dans `assets/mascots/trio.png` et affichée par fenêtres CSS, sans animation d’activité.

Les panneaux Codex possèdent désormais un petit compagnon : il tape au clavier
sur le signal natif de travail, respire au repos et réagit à la fin d’un tour.
Sans état communiqué par Codex, il reste immobile. Voir `docs/MASCOTTES.md`.

Super + Maj + Entrée ouvre Terminal Deck ou le ramène au premier plan. Au lancement, chaque panneau Codex restauré du projet actif ouvre son sélecteur sur toutes les conversations ; Échap permet un nouveau chat. Les shells et les autres projets restent en pause. Chaque panneau Codex garde son compagnon fixe en bas à droite. Le focus suit la souris entre les terminaux, sans clic.

Le compagnon est remonté au-dessus des avertissements et s’endort après 45 secondes au repos. Il se réveille dès la reprise de Codex.

La reprise utilise explicitement le service partagé quand son socket existe, pour éviter que les réglages locaux du TUI provoquent un serveur distinct. Voir `docs/VERROUS.md` pour les limites et la validation restante sur votre session.

Le compagnon mesure désormais 96 pixels et est légèrement décalé vers la gauche. Cliquez dessus pour l’agrandir à 144 pixels ; recliquez ou appuyez sur Échap pour réduire. La bande réservée sur le côté est supprimée : le terminal utilise toute sa largeur.

Survolez le compagnon pour l’agrandir. Cliquez pour ouvrir l’écran de veille du chat : compagnon au centre en grand, conversation assombrie à 80 %. Recliquez ou appuyez sur Échap pour revenir au terminal.

Les compagnons disposent aussi de poses dessinées de curiosité dans le sélecteur, d’attente pendant une intervention et de réveil après le sommeil. Chaque expression conserve le même personnage dans le terminal et la Veilleuse.

## Atelier des compagnons

**Ctrl K → Atelier des compagnons** ouvre l’outil local dans le navigateur : aperçu animé, avance pose par pose, zoom, pelure, cadrage par glissement, masque des pixels parasites et exports PNG/JSON. Les réglages restent locaux ; les images d’origine ne sont jamais écrasées.

Lancement indépendant : `npm run studio -- --open`. Mode d’emploi dans `docs/ATELIER-COMPAGNONS.md`.


## Sessions, attention et compagnons

- **Sessions** ou **Ctrl Maj O** : recherche par titre/projet dans les panneaux connus de Deck, filtres favoris, récentes et interventions. Le bouton Codex ouvre le sélecteur natif pour les autres conversations ; aucun index privé Codex n’est lu.
- Le bouton **♧** d’un panneau Codex choisit Blob, Vesper ou Byte. Quand l’identité native est reconnue, le choix et les favoris suivent la conversation entre panneaux et après renommage. Sans identité exploitable, le réglage reste attaché au panneau. La Veilleuse garde le même compagnon.
- **À votre attention** apparaît sur les signaux natifs `blocked` / `error`, ou sur une sonnerie terminal. Un clic sur une entrée retrouve le projet et restaure son panneau réduit. Une sélection acquitte l’alerte ; elle ne répond pas à Codex. Les signaux restent génériques : Deck ne prétend pas distinguer une question d’une autorisation.
- Si Deck est en arrière-plan et que le bureau le permet, une notification silencieuse générique ramène à la bonne session. Aucun titre de conversation n’est affiché sur le bureau. La notification du système reste dépendante du service de notifications local.
- **Tours terminés** garde au maximum 80 métadonnées (titre, heure, panneau), sur une transition native travail/attente → fin. Une fin de tour ne garantit pas une réussite. L’historique peut être effacé indépendamment des conversations ; une entrée dont le panneau est fermé reste consultable mais ne lance rien.
- Le réattachement d’une ancienne sortie ne rejoue ni les alertes ni les entrées d’historique. Aucun contenu d’échange n’est sauvegardé par ces fonctions.


## Finitions du 24 octobre 2026

- **Ctrl + glisser** depuis le contenu ou le titre d’un panneau : centre pour échanger, bords pour placer à gauche/droite/au-dessus/en dessous. Aperçu pendant le geste ; Échap, relâchement de Ctrl avant la souris ou dépôt hors cible pour annuler. Les processus restent actifs et la disposition est sauvegardée. En vue agrandie, revenir à la mosaïque pour déplacer les panneaux.
- **Ctrl Page précédente / Page suivante** : parcourir les panneaux visibles. Dans Sessions : flèches, Entrée et **Ctrl D** pour le favori surligné. Échap rend le focus au terminal. Un champ de recherche en cours d’édition garde le focus malgré le survol d’un autre panneau.
- Les petits panneaux regroupent leurs actions secondaires sous **···**, sans masquer les fonctions. Aucun raccourci natif du compositeur Codex n’est changé.
- Nouveau salut au clic, regard discret au survol et bâillement avant le sommeil. Les réactions décoratives sont limitées aux états de repos et respectent la réduction des mouvements. [Planches et prompts](docs/NOUVELLES-POSES.md).
- Les conversations reconnues restent dans Sessions après fermeture de leur panneau. Si l’UUID complet est connu, un clic demande explicitement la reprise native ; sinon Deck ouvre le sélecteur, sans deviner l’identifiant ni envoyer de texte. Le lancement normal ouvre toujours le sélecteur All. [Identité et limites](docs/CONVERSATIONS.md).


## Démarrage de tous les Codex — 25 octobre 2026

Tous les panneaux Codex déjà présents dans le projet actif démarrent automatiquement, sans bouton « Lancer Codex » à cliquer. La mosaïque, le panneau sélectionné et les réductions sont conservés. Si aucun Codex n’est présent, Deck en ouvre un. Les terminaux déjà actifs ne sont pas relancés lors d’un rechargement de l’interface. Un échec de lancement n’empêche pas les autres panneaux de démarrer.

Chaque nouveau processus présente le sélecteur natif `resume --all` : choisir la conversation à reprendre, ou Échap pour un nouveau chat. Aucune conversation ni aucun prompt ne sont envoyés automatiquement.

Recette dédiée : `npm run test:startup`.


## Fox Loaf et Corbac mini — 25 octobre 2026

Le bouton **Compagnons** en bas de la barre latérale ouvre le choix des cinq personnages ; le petit bouton **♧** de chaque Codex reste également disponible. **Fox Loaf** tape avec ses petites pattes puis s’endort dans sa queue ; **Corbac mini** tapote le clavier, incline la tête et dort en boule de plumes. Ils disposent aussi de poses d’attente, de salut, de bâillement et de réveil, avec les mêmes signaux natifs et raccourcis que le trio.

Le personnage choisi suit la conversation reconnue et reste identique dans les quotas. Les anciens indices et les attributions automatiques du trio sont conservés ; les deux nouveaux sont disponibles au choix. Dans l’atelier, sélectionner Fox Loaf ou Corbac mini donne accès aux états de leur atlas individuel et aux exports PNG/JSON.

[Planches harmonisées et prompts](docs/FOX-CORBAC-HARMONISES.md). Les premières versions restent conservées dans le projet.


Le menu Compagnons reste accessible sans panneau Codex : il montre la collection et propose d’en ouvrir un. Si un shell est sélectionné, le bouton latéral cible le premier Codex du projet plutôt que rester sans effet.
