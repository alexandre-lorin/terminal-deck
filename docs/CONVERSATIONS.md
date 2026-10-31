# Préférences par conversation

La [documentation officielle OpenAI](https://learn.chatgpt.com/docs/developer-commands) décrit la composition du titre de terminal. La recette locale du CLI installé vérifie la configuration `tui.terminal_title=["thread-id","thread-title"]`, dans un HOME temporaire, sans compte et sans prompt modèle.

## Identité observée

Le CLI émet par exemple un titre composé d’un préfixe UUID abrégé, suivi de ` | ` puis du nom. Pour une conversation non nommée, la seconde partie peut être l’UUID complet. L’adaptateur garde le nom visible et sépare les métadonnées techniques ; il ne lit ni les transcripts, ni les bases privées, ni les identifiants de connexion.

Les préférences utilisent les 29 caractères du préfixe UUID effectivement émis par ce CLI. Ce préfixe n’est pas un UUID complet : la reprise directe exige un UUID complet validé, connu via le même canal. Un format plus court ou inattendu ne produit aucune association. Si deux UUID complets connus partagent ce préfixe, l’entrée est marquée ambiguë et la synchronisation est désactivée pour cette entrée. L’unicité d’un préfixe abrégé ne constitue pas une garantie mathématique pour des UUID complets jamais communiqués.

## Données et comportement

`workspace.json` conserve au maximum 500 fiches : clé native abrégée, UUID complet quand connu, dernier nom, favori Deck, compagnon choisi, dernière consultation et projet d’origine. Aucun échange n’est conservé. Les préférences antérieures d’un panneau sont reprises lors de sa première identification ; passer ensuite à une autre conversation n’hérite pas des choix du chat précédent.

- Même conversation dans plusieurs panneaux : compagnon et favoris partagés.
- Renommage : la clé reste identique ; le nom n’est jamais utilisé pour identifier un chat.
- Fermeture d’un panneau : la fiche reste consultable dans Sessions.
- Réouverture par un clic explicite : accès au panneau actif existant, sinon lancement de la reprise par UUID complet. Si seul le préfixe est connu, ouverture du sélecteur natif avec un message explicatif, sans saisie automatique dans le terminal.
- Sans identité reconnue : préférences du panneau seulement. Aucun rapprochement par nom, dossier ou contenu.
- Les favoris sont propres à Deck ; ils ne modifient pas les épingles du client Codex officiel.

Le lancement ordinaire reste `resume --all` ; les connexions et verrous continuent d’être gérés par Codex.
