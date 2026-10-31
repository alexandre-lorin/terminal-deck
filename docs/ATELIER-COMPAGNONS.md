# L’atelier des compagnons

Outil local de prévisualisation et de cadrage des sprites de Terminal Deck. Il n’envoie aucune image à un service externe et ne remplace aucun fichier de l’application.

## Ouvrir

Depuis Deck : **Ctrl K → Atelier des compagnons**. Le navigateur par défaut s’ouvre.

Ou, depuis le dossier du projet :

```sh
npm run studio -- --open
```

Le serveur écoute seulement sur `127.0.0.1`, sur le port 47831 lorsqu’il est disponible. Si ce port est occupé, un port libre est choisi et le lien est affiché. Ctrl C ferme le serveur lancé depuis le terminal. Celui lancé par Deck est fermé avec Deck.

## Utiliser

1. Choisir Blob, Vesper ou Byte, puis une expression.
2. Lire l’animation, la ralentir, mettre en pause et choisir une pose dans la bande inférieure.
3. Déplacer le cadre dans la planche à droite ; tirer son coin inférieur droit pour le redimensionner. Les champs permettent des valeurs précises. « Masquer en haut » retire les pixels parasites sans déplacer la silhouette.
4. Utiliser le damier pour la transparence, la pelure pour comparer avec la pose précédente, et la grille pour les pixels de l’aperçu.
5. Exporter une planche PNG et ses réglages JSON. Le PNG contient uniquement les sprites, sans les repères ni la pelure.

Les contrôles signalent les pixels qui touchent les bords : c’est une aide visuelle, pas une preuve automatique que tout le dessin est correct.

Raccourcis : **Espace** pour lire ou mettre en pause ; **← / →** pour changer de pose ; **Alt + flèches** pour déplacer le cadre d’un pixel source, avec **Maj** pour dix pixels. La saisie d’un champ met la lecture en pause.

## Sauvegarde et imports

Les réglages sont conservés dans le stockage local du navigateur, par planche et par personnage. Ils restent liés au navigateur et à l’adresse locale. Le JSON permet de les conserver ailleurs ou de les recharger.

Une planche PNG personnelle peut être importée, puis ses colonnes et ses lignes réglées. Elle reste en mémoire du navigateur ; après rechargement, il faut réimporter ce PNG pour retrouver les réglages associés. Taille maximale : 24 Mo et 8192 × 8192 pixels.

Le JSON conserve le cadrage dans la source, les durées et les coordonnées des cadres de la planche exportée. Les exports sont carrés, de 32 à 128 pixels selon le choix, avec proportions conservées et alignement sur le bas.

## Périmètre

L’atelier régularise les cadres et permet de les inspecter. Il ne transforme pas automatiquement une illustration générée en dessin pixel art à grille régulière. Il ne dessine pas de nouveaux pixels et n’applique pas les exports à Deck sans une modification distincte.

L’aperçu montre les poses source. Les transformations décoratives ajoutées par Deck — respiration, étincelles, écran de veille — ne sont pas incluses dans le PNG. Le sommeil de Deck conserve une pose stable ; l’atelier permet d’inspecter les quatre poses présentes dans la planche.

## Vérification

```sh
npm run check
npm test
npm run test:studio
npm run test:ui
```

La recette de l’atelier utilise un vrai navigateur Electron isolé : déplacement de cadre, clavier, sauvegarde locale, export PNG et JSON via le téléchargement natif, réimport, vue étroite et contrôle des empreintes des images d’origine. Elle ne lance aucun tour Codex et n’utilise aucun compte.

Le serveur est en lecture seule et ne sert qu’une liste explicite de fichiers de l’atelier et de ses six planches connues. Les chemins arbitraires et les requêtes d’écriture sont refusés. La page ne dispose d’aucun accès au pont IPC de Deck.
