# Reprise des conversations et verrou d’écriture

## Cause identifiée dans le lancement de Deck

Deck ajoute `-c tui.terminal_title=...` et `-c tui.keymap.composer.queue=[]`.
Le CLI exclut la connexion implicite au daemon pour ces options de configuration.
Il peut donc héberger un serveur embarqué distinct du serveur déjà propriétaire
de la conversation. Un deuxième serveur ne peut pas reprendre son verrou actif.

Source primaire examinée :
https://github.com/openai/codex/blob/main/codex-rs/tui/src/daemon_startup.rs
(`config_exclusion`, liste des options compatibles avec le daemon implicite).

## Correction

`src/codex-launch.cjs` examine le point de connexion local de `CODEX_HOME`.
S’il s’agit d’un socket, Deck lance explicitement :

```sh
codex --remote unix:// resume --all -c 'tui.terminal_title=["thread-id","thread-title"]' -c 'tui.keymap.composer.queue=[]'
```

Le client se connecte ainsi au service partagé existant, malgré ses réglages locaux
d’interface. Sans socket existant, il conserve le lancement autonome précédent.
Un socket présent mais un service défaillant produit une erreur native : Deck ne
force pas la reprise par un autre serveur et ne supprime pas le socket.

Documentation officielle du transport :
https://learn.chatgpt.com/docs/app-server
https://learn.chatgpt.com/docs/cli/reference

## Sessions déjà ouvertes

Le changement s’applique aux prochains processus lancés. Il ne transforme pas un
serveur embarqué déjà actif en serveur partagé. Relancer Deck ferme ses propres
terminaux comme auparavant ; il faudra ensuite choisir la conversation dans le
sélecteur. Si un autre client autonome détient encore le chat, il doit le fermer.

Aucun fichier de verrou n’est supprimé ; aucun daemon ni processus extérieur à
Deck n’est arrêté ; aucune archive ou migration de conversation n’est effectuée.

## Validation et limite du sandbox

- Test unitaire avec un vrai socket temporaire : sélection explicite du service,
  conservation des réglages clavier/titre et lancement autonome en son absence.
- Recette UI et vrai CLI sans compte : sélecteur, saisie et états préservés.
- `npm run test:codex-shared` prépare un profil temporaire, démarre son propre
  app-server puis tente d’attacher deux PTY au même chat, sans compte ni tour modèle.
- Cette dernière recette n’a pas pu aller jusqu’au bout dans le sandbox de l’agent :
  le répertoire réservé `/tmp/codex-daemon-1000` est volontairement inaccessible.
  Le CLI refuse d’y préparer son rendez-vous. Cette protection n’a pas été modifiée.
  L’accès au socket utilisateur existant est également refusé (`EACCES`).
- La disparition effective du verrou dans la session normale reste donc à confirmer.

Le banc partagé utilise `ws` depuis l’outillage de recette sous
`/tmp/deck-ui-tools`, comme Playwright pour les autres recettes ; aucune dépendance
n’est ajoutée à l’application pour ce changement.
