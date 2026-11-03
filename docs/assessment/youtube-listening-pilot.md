# Compréhension orale sur extraits YouTube : pilote

Décision du 2026-11-03 : l’épreuve de compréhension orale du bilan peut s’appuyer sur un passage d’une vidéo YouTube, lu dans le lecteur officiel intégré (comme les contenus « Regarder »), en plus ou à la place d’un enregistrement de natif. Les publicités sont acceptées.

Règles :

- Lecture par le lecteur intégré seulement (youtube-nocookie) : pas de téléchargement, pas de son seul, lecteur jamais masqué.
- Sous-titres YouTube désactivés pendant l’épreuve (`cc_load_policy=0`, contrôles masqués) ; choisir des passages sans texte incrusté qui donne les réponses.
- On ne stocke pas la transcription : seulement l’identifiant de la vidéo, le début, la fin, nos questions et nos réponses de référence.
- Une vidéo supprimée, privée ou non intégrable rend le dossier indisponible : à contrôler par `assessment:check`.
- Prévenir l’apprenant avant l’épreuve qu’une publicité peut précéder l’extrait, à chaque écoute (constaté : pub avant la vidéo, et pubs au milieu quand on saute au début du passage).

Les trois passages (ru A2, ru B2, it B2) sont maintenant dans les dossiers `ru-a2-1`, `ru-b2-1` et `it-b2-1` (`src/lib/assessment/dossiers/`), avec `checkedOn: null` : à renseigner (date du jour) après avoir écouté le passage et validé les points ci-dessous. Tant que `checkedOn` est null, le dossier n’est pas publié sous la politique « hide ».

Les questions ci-dessous sont rédigées d’après les sous-titres manuels de la chaîne. **À valider à l’écoute** : bornes exactes du passage, niveau, texte affiché à l’écran pendant le passage.

## ru A2 : Russian With Max, « Slow Russian - My Morning Routine »

- Vidéo : https://www.youtube.com/watch?v=8OlKzxWUlBk (`8OlKzxWUlBk`), intégrable.
- Passage : 5:17 → 6:04 (≈ 47 s), de « После зарядки… » à « …Ну или просто сэндвичи. ».
- Débit lent et articulé, un seul locuteur.

1. **Selon Max, quelle est la partie la plus agréable du matin ?**
   Réponse : le petit-déjeuner.
   Éléments attendus : le petit-déjeuner.
2. **Que se prépare-t-il toujours au petit-déjeuner, et qui d’autre aime ça ?**
   Réponse : du café ; Sabrina aussi aime le café.
   Éléments attendus : du café ; Sabrina aussi.
3. **Que mange-t-il le plus souvent au petit-déjeuner, et quoi d’autre parfois ?**
   Réponse : le plus souvent des œufs ; parfois des blinis, de la kacha (bouillie) ou simplement des sandwichs.
   Éléments attendus : des œufs le plus souvent ; parfois blinis, kacha ou sandwichs (au moins un).

## ru B2 : Russian With Max, « Russian Listening Practice (B2+) - Our Life as Parents »

- Vidéo : https://www.youtube.com/watch?v=sxjqV1e_2SY (`sxjqV1e_2SY`), intégrable.
- Passage : 2:57 → 4:26 (≈ 89 s), de « Да, в русскоязычном пространстве… » à « …успокаивается и переключается. ».
- Dialogue naturel entre Max et Ioulia ; c’est surtout Ioulia qui parle.

1. **Comment appelle-t-on cette période en russe et en anglais, et à quel âge se produit-elle ?**
   Réponse : la « crise des trois ans » en russe, les « terrible two » en anglais ; elle peut commencer vers deux ans et durer jusqu’à quatre ans environ, selon l’enfant.
   Éléments attendus : crise des trois ans / terrible two ; de deux à environ quatre ans ; dépend de l’enfant.
2. **Que se passe-t-il pour l’enfant pendant cette période, et d’où vient sa frustration ?**
   Réponse : il prend conscience d’être une personne à part, avec ses propres désirs ; il découvre que ses désirs ne peuvent pas tous être satisfaits tout de suite, ce qui provoque beaucoup d’émotions et de la frustration.
   Éléments attendus : il se perçoit comme une personne à part, avec ses désirs ; tous ses désirs ne peuvent pas être satisfaits immédiatement ; d’où émotions et frustration.
3. **Où en est leur fille Sabrina aujourd’hui, d’après Ioulia ?**
   Réponse : le pic de la crise est passé ; elle peut encore pleurer, par exemple parce qu’elle veut faire du vélo sous la pluie tout de suite, mais il est bien plus facile de discuter avec elle et de lui expliquer, et elle se calme et passe à autre chose plus vite.
   Éléments attendus : le pic est passé ; elle pleure encore parfois (exemple du vélo sous la pluie) ; on peut lui expliquer, elle se calme plus vite.

## it B2 : Podcast Italiano, « 3 opere fondamentali per capire l’Italia »

- Vidéo : https://www.youtube.com/watch?v=D2a6S69w104 (`D2a6S69w104`), intégrable.
- Passage : 3:07 → 4:28 (≈ 81 s), de « Perché quest’opera è così importante? » à « …alla base del pensiero umanista. ».
- Langue soutenue, débit posé, un seul locuteur. **Texte incrusté probable** (titres de parties comme « 1. L’Italia erede della classicità », noms de philosophes) : à vérifier, il peut donner une partie de la réponse 2.

1. **Pourquoi, selon Davide, *L’École d’Athènes* est-elle une œuvre si importante ?**
   Réponse : c’est le manifeste de la Renaissance dans sa phase mûre : elle résume les valeurs de toute une époque en une seule composition monumentale.
   Éléments attendus : manifeste de la Renaissance (mûre) ; synthèse des valeurs d’une époque en une seule œuvre.
2. **Quelle opération « audacieuse » Raphaël réalise-t-il, et qu’affirme-t-il ainsi ?**
   Réponse : il place les philosophes de la Grèce antique (Platon, Aristote, Socrate…) au cœur de l’Italie, à Rome, au Vatican ; il affirme ainsi que l’Italie est l’héritière légitime de la culture grecque, classique.
   Éléments attendus : philosophes grecs placés à Rome / au Vatican ; l’Italie héritière légitime de la culture classique.
3. **Quelle réconciliation l’œuvre opère-t-elle, et sur quoi repose-t-elle ?**
   Réponse : en installant les sages de l’Antiquité dans le palais du pape, Raphaël réconcilie culture classique et culture chrétienne, ce qui est à la base de la pensée humaniste.
   Éléments attendus : réconciliation entre culture classique et culture chrétienne ; fondement de la pensée humaniste.

## Restent à faire

- **it A2** : passage non choisi. Candidate : Elisa’s Italian School, « Morning Routine in Easy Italian » (`40ao6UQlx1o`, sous-titres automatiques seulement).
- **it B1** (en réserve) : Italy Made Easy, « The Story of Italy Made Easy » (`TrzHZynKNvs`), 3:15 → 4:19, les premières vidéos de prononciation.
- Autres niveaux (A1, B1, C1, C2) pour les deux langues.
