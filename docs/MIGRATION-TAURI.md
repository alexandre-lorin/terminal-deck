# Migration Tauri — 26 octobre 2026

La version Tauri conserve le frontend xterm.js et les compagnons. Son moteur Rust
utilise portable-pty ; aucun processus Electron ni backend Node n’est nécessaire
pour exécuter le binaire. Electron reste disponible pour comparaison et retour.
Le dossier historique n’est pas renommé afin de préserver les chemins locaux.

## Commandes

- `npm start` : développement Tauri ; `npm run start:electron` : ancien moteur.
- `npm run build:tauri` : binaire optimisé dans `src-tauri/target/release/terminal-deck`.
- `npm run install:tauri` : installation parallèle `terminal-deck-tauri` et menu dédié.
- `node scripts/install-tauri.cjs --replace` : remplacement explicite du lanceur principal.
- `terminal-deck-electron` : moteur Electron conservé après installation parallèle.
- `npm run memory` : PSS/RSS des processus visibles depuis la session courante.
- `npm run instructions:git` : applique le bloc Git global, sauvegarde puis remplacement atomique.

Le profil est `~/.config/terminal-deck-tauri/workspace.json`. Au premier import,
l’installateur conserve aussi une copie brute du profil Electron dans ce nouveau
dossier, avec permissions privées. Le profil d’origine reste intact. Les deux
profils ne se synchronisent pas après la copie. Les conversations restent gérées
par Codex ; seules les dispositions et préférences documentées sont importées.
`TERMINAL_DECK_PROFILE` continue de permettre une recette isolée.

## Architecture et limites

- `src-tauri/src/main.rs` : API explicite, garde de fenêtre, fenêtres locales et fermeture.
- `terminal.rs` : PTY, UTF-8 entre lectures, redimensionnement, acquittements et contre-pression.
- `workspace.rs` : validation et écriture atomique, mêmes indices de pets et format de profil.
- `quotas.rs` : protocole app-server initialisation/lecture, cache cinq minutes, délai douze secondes, dernier relevé conservé en cas d’erreur.
- `git.rs` : commande fixe en lecture seule, sortie bornée et délai huit secondes. Le moteur Electron propose la même vue via `src/git.cjs`.
- `src/tauri-bridge.js` : contrat frontend commun, écouteurs installés avant boot.
- L’atelier est une autre WebView locale. Il ne peut pas utiliser `deck` ; sa seule commande métier est `studio_export`, limitée aux PNG/JSON validés dans Téléchargements. Création exclusive pour ne pas écraser de fichier. Aucune possibilité de choisir un chemin arbitraire.
- Navigation limitée aux pages locales prévues ; nouvelles fenêtres distantes refusées. Les capacités de l’interface principale ne s’appliquent pas à l’atelier.
- Les scénarios intégrés ne sont compilés qu’avec `native-smoke`. **Ne jamais installer ce binaire de test** ; la compilation normale les exclut.

Les tests X11 isolés ne prouvent pas la recette sur le bureau Hyprland/Wayland réel,
ni l’action d’un serveur de notifications réel, ni la reprise d’un compte Codex en
cours d’utilisation. Aucun verrou n’est supprimé et aucun serveur Codex global
n’est arrêté. La sélection du serveur partagé suit les arguments existants.

## Mémoire mesurée

Scénario local synthétique : trois shells bash au repos, fenêtre 1520 × 960,
Xvfb sans GPU et profils temporaires. Tauri compilé en release. Aucun compte ou
prompt modèle. Mesure des processus descendants après stabilisation cinq secondes.

| Moteur | PSS application | RSS cumulée application | PSS avec les shells |
|---|---:|---:|---:|
| Electron | 218 Mio | 626,9 Mio | 221,9 Mio |
| Tauri optimisé | 333,4 Mio | 603,2 Mio | 337 Mio |

**Ce test ne montre pas de baisse de mémoire PSS.** La RSS additionnée compte des
pages partagées plusieurs fois ; son léger recul ne suffit pas à déclarer un gain.
Ce relevé ne mesure pas le Deck de Toubi sur son bureau, ses processus Codex réels,
ni son accélération graphique. Le JSON de mesure est dans
`artifacts/memory-comparison.json` (artefact local ignoré par Git).

L’objectif d’une consommation moindre reste à confirmer/optimiser sur le bureau
réel. L’installation parallèle permet de comparer sans imposer cette hypothèse.

Sources techniques : [architecture Tauri](https://tauri.app/concept/architecture/),
[configuration Tauri](https://v2.tauri.app/reference/config/),
[portable-pty](https://docs.rs/portable-pty/latest/portable_pty/).

## Recette finale

25 tests JavaScript et 7 tests Rust passent ; syntaxe et format vérifiés.
Recettes Electron UI/démarrage/atelier et recette Tauri GTK passent. Cette dernière
vérifie notamment les vrais raccourcis X11, le presse-papiers natif, l’export PNG
écrit par Rust, son en-tête, la séparation des commandes et la fermeture native
sans confirmation. Un essai séparé du binaire release sans feature de test valide
l’ouverture de fenêtre, Ctrl Maj N et une saisie shell réelle.
Installation parallèle effectuée, lanceur principal Electron conservé.
