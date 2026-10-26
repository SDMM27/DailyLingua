# Plan — grammaire, alphabets, révision du vocabulaire, parcours par niveau

Statut : **H1 (grammaire pilote) et I1 (cyrillique : russe, ukrainien, avec le test de lecture) sont faits**, en attente de relecture native ; le reste est une proposition. H2, H3 (grammaire des 19 langues), I2 à I5, J1, J2, J3, K1 et K2 sont implémentés depuis. Date : 2026-10-21, mis à jour le 2026-10-26 (J3, K2). Ce plan complète [product-features.md](product-features.md) (phases A à G) sans le remplacer. Les phases ci-dessous portent les lettres H à K pour ne pas se confondre avec les précédentes.

## 1. Constat

Ce qui existe déjà :

- **Répétition espacée** : système de Leitner à 7 boîtes (intervalles de 1 à 64 jours) dans `src/lib/domain/spaced-repetition.ts`, utilisé pour le vocabulaire et, depuis la phase D, pour les cartes de correction (`correction_cards`).
- **Contenu réel** : missions générées à partir de sources authentiques (vidéos, podcasts, articles), catalogue couvrant A1 à C2 dans les 19 langues.
- **Production corrigée** : retour écrit avec notes par critère (dont la grammaire) et catégories d'erreurs communes (`verb`, `agreement`, `function_word`, `word_order`, etc.).
- **Test de niveau** : adaptatif, A1 à C2 par langue (phase C).

Ce qui manque :

- **Aucune leçon de grammaire.** La grammaire n'apparaît qu'à travers une note et des commentaires. Un utilisateur qui fait une erreur de cas ou de temps reçoit une correction, pas une explication structurée.
- **Aucun module d'alphabet ou d'écriture.** Un débutant en russe, en arabe ou en coréen ne peut pas lire les textes proposés.
- **Pas de mesure de l'efficacité** : on ne sait pas si les mots révisés sont retenus une semaine plus tard.
- **Pas de parcours par niveau** : tous les niveaux voient les mêmes écrans.

## 2. Réponses aux questions

### Grammaire

Oui, c'est faisable, mais pas comme une génération libre. Une leçon générée à la demande par un modèle peut contenir des erreurs de règle, et la relecture native coûte cher. Proposition : **des points de grammaire curés**, rédigés une fois, relus par un natif, versionnés dans le dépôt (comme les banques du test de niveau). Chaque point comporte une fiche courte, 3 à 5 exercices et une fois exercé, il entre dans la répétition espacée.

Le lien avec les erreurs est le point fort : une erreur d'accord répétée dans les productions suggère la fiche correspondante. Cela s'appuie sur les catégories de la phase D, qui existent déjà.

### Vocabulaire « façon Duolingo » : est-ce efficace ?

La réponse courte : **le principe est bon, le format « jeu » seul ne suffit pas.**

- Ce qui est bien étayé par la recherche : la répétition espacée et le rappel actif (se souvenir avant de voir la réponse). Le moteur est déjà là.
- Ce qui motive, mais dont l'effet sur la maîtrise est moins prouvé : les séries de jours, les points, les ligues. Duolingo publie surtout ses propres mesures, et les études indépendantes sont rares. Il faut donc traiter la gamification comme un moyen de rester régulier, pas comme une preuve d'apprentissage.
- Ce qui manque souvent : les mots appris hors contexte se retiennent moins bien dans une phrase réelle. L'app a un avantage : les mots viennent déjà de contenus authentiques.

Recommandation : **ne pas copier Duolingo**. Améliorer le moteur existant (modes de rappel plus exigeants, phrases réelles, production écrite), garder une gamification légère et **mesurer** la rétention (phase J).

### Alphabets

Oui, à faire, mais seulement pour les langues dont l'écriture bloque la lecture :

| Langue | Écriture | Taille approximative | Remarque |
|---|---|---|---|
| russe, ukrainien | cyrillique | 33 à 34 lettres | Lettres très proches du latin pour certaines. Accent tonique déjà géré. |
| grec | grec | 24 lettres | |
| arabe | arabe | 28 lettres | Forme de la lettre selon sa position, écriture de droite à gauche, voyelles courtes absentes du texte courant. Module plus long. |
| coréen | hangûl | 24 lettres de base, en syllabes | Apprenable en quelques jours. |
| japonais | hiragana, katakana | 46 + 46 de base | Les kanjis relèvent d'un module séparé, plus tard. |
| chinois | pas d'alphabet | — | Le pinyin (romanisation) et les tons, puis les hanzis en module séparé. Hors périmètre v1. |

Pour les langues en alphabet latin (allemand, espagnol, etc.), pas de module dédié, mais une courte section « accents et lettres particulières » au niveau A1 (ñ, ß, ş, ł, ř, etc.).

### Niveaux

Chaque niveau doit trouver son compte. Proposition de parcours, qui ne change pas le contenu mais ce qui est mis en avant :

| Niveau | Priorité |
|---|---|
| Débutant absolu (avant A1) | Alphabet (phase I), premières structures, contenu en A1 |
| A1–A2 | Grammaire de base (phase H), vocabulaire par fréquence, contenu simple |
| B1–B2 (le cœur actuel) | Grammaire de nuance, corrections transformées en fiches (phase H2) |
| C1–C2 | Registre, collocations, expressions. La grammaire sert de référence, pas de leçon. |

Le niveau vient du test de niveau (phase C) ou de la préférence déclarée. Il n'est pas figé : un utilisateur peut changer.

## 3. Propositions

### Phase H — Grammaire

**H1 (pilote)** : russe et italien, de A1 à B1.

1. Table `grammar_points` (langue, niveau CECR, identifiant stable, titre, ordre). Contenu en fichiers versionnés, comme les banques de test, pas en saisie libre.
2. Chaque point : une fiche (règle en français, 5 à 10 lignes, un exemple annoté), 3 à 5 exercices (compléter, choisir, transformer).
3. Page `/grammaire` : liste par niveau, état (à voir, exercé, maîtrisé), entrée depuis l'accueil.
4. Répétition espacée : chaque point exercé avec succès devient une carte, même moteur que `correction_cards`.
5. Relecture native obligatoire avant publication de chaque point.

**H1 (fait)** : russe et italien, A1 à B1 (`src/lib/grammar`, `/grammaire`). Décisions prises :

- Programme fixe : 6 points par niveau et par langue, soit 18 par langue (`src/lib/grammar/curriculum.ts`). Les identifiants sont stables : les cartes y renvoient, un point n'est jamais renommé, seulement ajouté.
- Contenu en fichiers TypeScript par langue (`src/lib/grammar/courses/<code>.ts`), soumis aux règles de rédaction de `src/lib/grammar/AUTHORING.md` et vérifié par `npm run grammar:check`.
- Trois types d'exercices : `choose`, `fill`, `transform`. Les réponses sont comparées sans tenir compte de la casse, des espaces, de la ponctuation finale, de l'apostrophe typographique ni, pour le russe, de l'accent tonique et de ё/е.
- Une carte de révision par point (table `grammar_cards`, RPC `record_grammar_practice`). Elle est créée à partir de 60 % de bonnes réponses, puis mise à jour seulement quand elle est due ; toute autre série est un entraînement libre qui n'enregistre rien. Un point est « maîtrisé » à partir de la boîte 4.
- Chaque point porte les catégories de correction qu'il traite (`agreement`, `verb`, `function_word`, etc.) : c'est ce qui permettra le lien avec les erreurs en H2.
- Relecture native : drapeau `reviewedOn` (null = brouillon) et variable `GRAMMAR_DRAFTS` (show / hide). Par défaut les brouillons sont masqués en production. Les 36 points sont encore des brouillons.
- Entrée depuis l'accueil : nombre de fiches à revoir, ou invitation à commencer, pour les langues de l'utilisateur qui ont un cours visible. Sur `/grammaire`, le niveau de l'apprenant passe en premier ; au-dessus de B1, tous les points servent de référence.

**H3 (implémenté)** : grammaire des 17 autres langues, A1 à B1, 18 points chacune (306 points de plus). Décisions prises :

- Un programme par langue dans `src/lib/grammar/curricula/<code>.ts`, choisi pour chaque langue d’après le CECR et non calqué sur le russe ou l’italien ; un programme vide = langue sans cours, masquée.
- Règles par écriture dans `AUTHORING.md` : arabe standard moderne vocalisé (réponses sans harakat), chinois simplifié avec pinyin, japonais poli avec lecture des kanji (réponses en kanji et en kana), coréen 해요체, portugais de base brésilienne avec les variantes européennes acceptées.
- Comparaison des réponses selon la langue (registre `languages.ts`) : espaces ignorés en chinois et en japonais (`unspaced`), voyelles brèves ignorées en arabe (`optionalVowelMarks`), minuscules turques (ı/İ), ponctuation finale de chaque écriture et `¿ ¡` initiaux.
- Fiches et exercices affichés de droite à gauche pour l’arabe ; les cellules des tableaux suivent le sens de leur texte.
- Tout est en brouillon (`reviewedOn: null`) : 342 points au total attendent une relecture native.

**H2 (après D et H1)** : grammaire suggérée par les erreurs. Une erreur de catégorie `agreement` ou `verb` répétée au moins 3 fois sur une langue propose la fiche correspondante. Étendre ensuite aux 19 langues, par ordre de demande.

**H2 (implémenté)** : suggestions dans `src/lib/domain/grammar-suggestions.ts`. Décisions prises :

- Les erreurs comptées sont celles des productions corrigées des 30 derniers jours, la même fenêtre que le panneau « Évolution » de `/productions` (`productionStats`). Une catégorie déclenche une suggestion à partir de 3 erreurs.
- Seules les catégories grammaticales déclenchent : `verb`, `agreement`, `function_word` et `word_order`. `word_choice`, `spelling` et `register` ne correspondent pas à une fiche de grammaire, même si certaines fiches les citent en second.
- Fiches candidates : elles traitent une catégorie déclenchée, elles ne sont pas maîtrisées et elles sont du niveau de l’apprenant ou en dessous. Au-dessus de B1, toutes les fiches sont candidates. Le classement : d’abord le nombre d’erreurs des catégories traitées, ensuite les fiches jamais vues avant les fiches exercées, enfin l’ordre du programme. On garde 3 fiches au plus.
- Les suggestions s’affichent à deux endroits. Sur `/grammaire`, une section « Suggéré par tes erreurs » en tête, avec la raison (« Accords : 5 erreurs en 30 jours »). Sur `/productions`, un lien vers la fiche sous les catégories de chaque langue qui a un cours. Rien sur l’accueil pour l’instant, parce qu’il faudrait y charger toutes les productions.
- Pas de nouvelle table : la suggestion se calcule à chaque affichage, à partir des productions et des cartes de grammaire.

### Phase I — Alphabets

1. Module `src/lib/domain/alphabets/` : un fichier par écriture, avec les lettres (majuscule, minuscule, nom, son, mot exemple tiré du vocabulaire réel). Pur, sans React, comme le reste du domaine.
2. Ordre : groupes de 6 à 8 lettres. Chaque lettre est une carte de répétition espacée.
3. Exercices : reconnaître (écouter → choisir la lettre), lire (mot court à épeler puis lire), comparer (lettres proches).
4. Audio : `speechSynthesis` avec les `speechRegions` du registre, comme pour l'oral existant.
5. Entrée : un test « tu lis déjà cette écriture ? » dans le test de niveau pour sauter le module.
6. **Hors v1** : tracé à la main (canvas, plus lourd, peu de gain prouvé).

Ordre des écritures : cyrillique (russe, ukrainien) → coréen → grec → japonais (kana) → arabe.

**I1 (fait)** : cyrillique, russe et ukrainien (`src/lib/alphabets`, `/alphabet`). Décisions prises :

- Une carte de révision par groupe de lettres (5 groupes par langue), et non par lettre : une série d'exercices correspond à une carte, comme pour la grammaire (table `alphabet_cards`, RPC `record_alphabet_practice`, même moteur Leitner que `grammar_cards`).
- Les exercices sont générés à partir des données des lettres (lettre → transcription, transcription → lettre, lecture d'un mot, écoute d'un mot), pas rédigés. Graine `groupe:jour` : la série est la même toute la journée.
- Transcription savante lettre à lettre, une forme latine unique par lettre, pour pouvoir relire un mot à partir d'elle.
- Relecture native de l'alphabet entier : drapeau `reviewedOn` (null = brouillon) et variable `ALPHABET_DRAFTS` (show / hide), comme `GRAMMAR_DRAFTS`.
- Entrée depuis l'accueil pour les apprenants A1 tant que l'alphabet n'est pas complet, puis pour les révisions dues.
- Test « Tu lis déjà cette écriture ? » : 10 mots à lire (2 par groupe, tirés selon le jour), il en faut 9 justes ; un score suffisant crée une carte `known` pour chaque groupe sans carte (les cartes existantes ne bougent pas), sans passer par les révisions de découverte. Accès depuis `/alphabet` (tant que l’alphabet n’est pas complet) et depuis l’intro du test de niveau.

**I2 (implémenté)** : hangeul, coréen (`src/lib/alphabets/ko.ts`). Décisions prises :

- Les lettres sont les 40 jamo (19 consonnes, 21 voyelles, doubles et composées comprises), en 6 groupes : voyelles de base avec ㅇ et ㄴ, consonnes de base, voyelles en « y », consonnes aspirées, consonnes tendues, voyelles composées rares. Pas de majuscules : une seule forme par lettre.
- Les mots sont écrits en blocs syllabiques et découpés en jamo pour la lecture (`src/lib/domain/hangul.ts`). Les syllabes à double consonne finale sont découpées en deux lettres.
- Transcription : la romanisation révisée sans les changements de son. Une consonne finale prend sa forme de fin de syllabe (`latinFinal` : ㄱ → k, ㅅ → t), sauf devant une syllabe qui commence par ㅇ muet (liaison : 한국어 → hangugeo). ㅇ est muet en début de syllabe (`silentInitial`). Les mots de lecture évitent les assimilations que cette règle ne couvre pas (ㄴ + ㄹ, ㄱ + ㄴ, etc.).
- Dans les mauvaises réponses de lecture, une voyelle ne remplace qu'une voyelle et une consonne qu'une consonne, pour que les erreurs proposées restent plausibles.
- Même moteur que I1 : une carte par groupe, test de lecture (2 mots par groupe, 12 questions), brouillon jusqu'à la relecture native.

**I3 à I5 (implémentés)** : grec, kana japonais, arabe (`src/lib/alphabets/el.ts`, `ja.ts`, `ar.ts`). Chaque écriture a ses règles de lecture (tokenisation, lecture d'une lettre selon son contexte, classes de lettres pour les mauvaises réponses), réunies dans le domaine ; les règles du cyrillique et du hangeul ne changent pas. Décisions prises :

- **Grec** (24 lettres, 4 groupes) : transcription lettre à lettre, avec η → ē et ω → ō pour garder une forme unique par lettre. Comme dans ELOT 743, ου se lit « ou », et αυ, ευ « av, ev » (ou « af, ef » devant une consonne sourde ou en fin de mot). μπ, ντ, γκ restent lettre à lettre (mp, nt, gk) ; les conseils de groupe disent comment ils se prononcent. L'accent écrit est ignoré à la lecture et ς est lu comme σ.
- **Kana** (151 caractères, 16 groupes) : hiragana puis katakana, deux lignes du tableau par groupe (10 caractères au plus par groupe, au lieu de 8). Les caractères avec ゛ et ゜, les petits ゃゅょ, っ et ー sont compris. Transcription Hepburn lettre à lettre : を → wo, ぢ et づ → di et du. Une syllabe en -i devant un petit ゃゅょ se fond avec lui (きゃ → kya, しゃ → sha), っ double la consonne suivante et ー répète la voyelle (コーヒー → koohii). Un même son existe dans les deux séries : une transcription n'est unique que dans sa série, et les mauvaises réponses de « transcription → caractère » sont prises dans la même série. Les kanjis restent hors périmètre.
- **Arabe** (35 signes, 5 groupes) : les 28 lettres, أ, ة et les cinq signes du texte vocalisé (fatha, kasra, damma, sukun, shadda). Les mots de lecture sont entièrement vocalisés, comme dans les manuels pour débutants. Règles de lecture :
  - une voyelle brève suivie de sa lettre longue donne une voyelle longue (ـَا ā, ـُو ū, ـِي ī) ;
  - sukun ne se lit pas, et shadda double la consonne ;
  - ة après fatha n'ajoute rien, et la hamza en début de mot ne s'écrit pas en transcription.

  Les mots évitent l'article ال (assimilation des lettres solaires) et ى. Les formes jointes des lettres sont affichées, et le texte arabe s'écrit de droite à gauche.
- Les signes (kind `sign` : harakat arabes, petits kana, ー, ь, ъ) ne sont demandés que dans le sens « signe → transcription ».
- Le nom de l'écriture porte son article (« le grec », « les kana », « l’alphabet arabe ») pour les phrases « Tu lis déjà … ? ».
- Le test de lecture garde 2 mots par groupe : 32 questions pour les kana.

### Phase J — Révision du vocabulaire : modes et mesure

1. **Modes de rappel** en plus de la reconnaissance : écrire la traduction, écouter et taper, phrase à trou dans une vraie phrase de contenu.
2. **Mesure** : une fois par semaine, une révision « surprise » de 10 mots appris il y a 7 jours et jamais revus. Le taux de rappel par mode est enregistré. C'est la seule façon de savoir si le système fonctionne pour cet utilisateur.
3. **Gamification légère** (décidée, voir J3) : série de jours, sans points ni ligues. Activable et désactivable.

**J1 et J2 (implémentés)** : modes de rappel et mesure de la rétention (`src/lib/domain/review-modes.ts`, `/vocabulaire`). La gamification est traitée en J3 ci-dessous. Décisions prises :

- Cinq modes : `flip` (la carte actuelle, auto-évaluée), `translate` (le mot → taper la traduction), `produce` (la traduction → taper le mot), `listen` (écouter le mot → le taper) et `cloze` (la phrase d’exemple avec un trou → taper le mot).
- Par défaut, la séance est « mélangée » : le mode dépend de la boîte du mot. Boîte 0 : `flip` ; boîte 1 : `flip` ou `translate` ; boîtes 2 et 3 : `translate`, `listen` ou `cloze` ; à partir de la boîte 4 : `produce`, `listen` ou `cloze`. Le tirage utilise la graine `mot:jour`, donc le mode d’un mot ne change pas dans la journée. On peut aussi choisir un seul mode pour toute la séance.
- `cloze` ne sert que si l’exemple contient le mot tel quel. `listen` ne sert que si l’appareil a une voix pour la langue (rien n’est envoyé à un tiers). Sinon, le mot passe en `translate`.
- Les réponses tapées sont corrigées automatiquement, avec la même normalisation que la grammaire. Pour la traduction, chaque sens séparé par une virgule est accepté, avec ou sans article. Les notes sont : juste → « Bien », presque (accents seuls, ou une lettre d’écart sur un mot de 5 lettres ou plus) → « Difficile », faux → « À revoir ». L’apprenant peut corriger la note : « J’avais bon » (→ « Bien ») ou « Trop facile » (→ « Facile »).
- **Mesure** : au lieu d’une révision « surprise », qui dérangerait le calendrier des révisions, la mesure vient du journal `vocabulary_reviews`. Chaque révision y enregistre désormais son mode et le nombre de jours depuis la révision précédente (`mode`, `days_since_last`). La rétention est le taux de mots rappelés (toute note sauf « À revoir ») parmi les révisions faites au moins 7 jours après la précédente, sur les 90 derniers jours, par mode. Ces écarts arrivent naturellement à partir de la boîte 3 (8 jours).
- Affichage sur `/vocabulaire` : un mode n’apparaît qu’à partir de 10 révisions, et la carte reste indicative tant qu’il y en a moins de 30 en tout. Le mode `flip` est signalé comme auto-évalué, donc moins fiable que les modes tapés.

**J3 (implémenté)** : gamification légère, la série de jours seule (`computeStreak` dans `src/lib/domain/stats.ts`, carte de la semaine sur l’accueil, `/preferences`). Décisions prises :

- Série de jours seule : ni points, ni ligues, ni classement. La série existait déjà sur l’accueil ; J3 en précise le calcul et permet de la masquer.
- Un jour d’étude est un jour avec au moins une activité de mission terminée **ou** au moins une révision de vocabulaire (`mission_stats` et `vocabulary_reviews`, deux journaux datés par jour calendaire dans le fuseau de l’utilisateur). Réviser ses mots suffit donc à garder la série.
- La grammaire et l’alphabet ne comptent pas : ils n’ont pas de journal par jour, seulement `last_reviewed_on`, écrasé à chaque révision. Compter ces jours ferait disparaître les jours passés de la série.
- Affichée par défaut ; désactivable dans `/preferences` (« Afficher ma série de jours », `profiles.show_streak`, `showStreak` dans les préférences). Désactivée, la flamme et le nombre disparaissent de l’accueil ; les sept pastilles de la semaine et les trois chiffres restent.

### Phase K — Parcours par niveau (transversal)

Pas une phase de développement isolé. C'est un fichier de configuration qui indique, pour chaque niveau, quels modules sont mis en avant, quel contenu est proposé en premier et quels rappels s'affichent sur l'accueil. Il est appliqué au fur et à mesure que H, I et J arrivent. Le premier pas : définir la table niveau → modules, puis l'utiliser sur l'accueil.

**K1 (implémenté)** : table niveau → modules et accueil (`src/lib/domain/learning-path.ts`). Décisions prises :

- Quatre étapes : `beginner` (A1 qui ne lit pas encore l'écriture : la langue a un alphabet visible dont un groupe n'a pas de carte), `basics` (A1 qui lit l'écriture, A2), `core` (B1–B2) et `advanced` (C1–C2). Le « débutant absolu » n'est pas un niveau à part : c'est un A1 qui apprend l'écriture, ce qui se déduit des cartes d'alphabet.
- Quatre modules mis en avant à côté de la mission : `alphabet`, `grammar`, `vocabulary` et `errors` (cartes de correction). Pour chaque étape, la table donne l'ordre des modules sur l'accueil et ceux qui ont une invitation même sans révision due :

  | Étape | Ordre sur l'accueil | Invitation sans révision due |
  |---|---|---|
  | beginner | alphabet, grammaire, vocabulaire, erreurs | alphabet, grammaire |
  | basics | grammaire, vocabulaire, erreurs, alphabet | grammaire |
  | core | erreurs, grammaire, vocabulaire, alphabet | grammaire |
  | advanced | vocabulaire, erreurs, grammaire, alphabet | aucune |

- La table change ce qui est mis en avant, pas ce qui existe : chaque module reste accessible à tous les niveaux, et une révision due s'affiche toujours.
- Avec plusieurs langues, l'ordre des cartes suit l'étape de la première langue (la langue principale). Les invitations se décident langue par langue : l'alphabet pour chaque langue en `beginner` (même règle qu'avant, désormais portée par la table), la grammaire si une langue avec cours est à une étape qui l'invite. En C1–C2, la grammaire n'apparaît que pour les fiches à revoir.
- La mission, l'invitation au test de niveau et les bannières restent en tête ; la carte de la semaine passe après les modules.
- K2 : le contenu proposé en premier selon l'étape, voir ci-dessous.

**K2 (implémenté)** : contenus de la mission choisis selon l'étape, avec la fréquence des mots (décision 4 de la section 5). Aujourd'hui, `rankCandidates` (`src/lib/generation/select-contents.ts`) classe surtout par niveau, et ce niveau est celui de la source (« typiquement B2 »), pas celui du texte. Un débutant reçoit donc le contenu le moins difficile parmi des sources toutes trop dures. Décisions de conception :

1. **Données.** Un script (`scripts/frequency/build.py`, lancé à la main, jamais au build ni en CI) tire de wordfreq les 5 000 formes les plus fréquentes de chaque langue, en minuscules, sans nombres ni ponctuation. Il les écrit dans `src/lib/frequency/data/<code>.json` (une liste ordonnée, 42 à 82 Ko par langue), avec un fichier `LICENSE` CC BY-SA 4.0 et les attributions dans ce dossier. Les fichiers sont versionnés. La normalisation fine (`normalizeWord` : celle des réponses tapées, `normalizeGrammarAnswer`, plus le sigma final grec écrit σ comme le fait wordfreq) est faite côté TypeScript au chargement (`src/lib/frequency/index.ts`, qui garde les rangs en cache), avec la fonction qui normalise aussi le texte mesuré : les deux côtés se correspondent donc toujours. Le module n'est importé que par la génération (serveur et scripts), jamais par un composant client.
2. **Mesure, pure dans le domaine** (`src/lib/domain/frequency.ts`) : `lexicalCoverage(language, text, ranks, top)` (les rangs sont injectés : le domaine n'importe pas les listes) donne la part des mots du texte qui sont parmi les `top` formes les plus fréquentes. Les mots sont découpés par `Intl.Segmenter` (granularité `word`), qui découpe aussi le chinois et le japonais. Sous 8 mots, la mesure est `null` (texte trop court pour conclure). Les nombres et les noms propres repérés par la majuscule en milieu de phrase sont ignorés (pas de majuscules en arabe, chinois, japonais, coréen : rien n'y est ignoré ; l'allemand, qui met une majuscule à tous les noms, n'ignore rien non plus, d'où l'option `capitalizedCommonNouns` du registre). Une élision (« l'amico ») est cherchée entière, puis par ce qui suit l'apostrophe.
3. **Ce qui est mesuré** : le titre et l'accroche, seul texte stocké. C'est court, donc la mesure est grossière ; elle départage des contenus de même niveau de source, elle ne remplace pas ce niveau.
4. **Classement**, seulement aux étapes `beginner` et `basics` (A1–A2) :
   - une pénalité de 0 à 6 points selon l'écart à la couverture visée : 90 % des mots dans les 1 000 premiers pour A1, dans les 2 000 premiers pour A2. Elle reste sous l'écart d'un niveau CECR (10 points), qui garde la priorité ;
   - un bonus de 3 points pour les sources faites pour les apprenants : expliquées en français ou en anglais (`instructionLanguage`) ou jeunesse (`audience: "children"`). Le classement reçoit ces traits à côté du candidat ; ils ne sont pas envoyés au modèle (`sourceKey` du candidat, jamais écrit dans le prompt). Pénalité et bonus sont dans `rankCandidates` ; une accroche trop courte pour être mesurée reçoit la moitié de la pénalité maximale (3 points). Les deux termes ensemble s'étalent sur 9 points (de -3 à +6), sous l'écart d'un niveau CECR : le niveau garde la priorité sur eux (la fraîcheur, jusqu'à 14 points, peut toujours le renverser, comme avant K2).
   - De B1 à C2, rien ne change.
5. **Rédaction** : pour A1–A2, le prompt demande que les expressions « À retenir » soient prises de préférence parmi les mots fréquents. Il reçoit, pour chaque candidat retenu, les mots de l'accroche qui sont dans les 2 000 premiers (10 au plus, `frequentWords` du candidat, version du prompt `2026-10-26.1`). Le modèle reste libre ; aucune expression n'est rejetée sur ce critère.
6. **Suivi** : la couverture du contenu choisi est ajoutée à la trace de génération (`generation_meta`), pour vérifier sur de vraies missions que les seuils de 90 % sont réalistes, langue par langue. Les seuils sont réglés dans une table par langue (`COVERAGE_TARGETS`, `src/lib/domain/frequency.ts`), d'abord identiques. La trace porte `coverage` : par session, la part des 1 000 et des 2 000 premiers (`null` si trop court), absente des anciennes missions ; c'est du jsonb, sans migration : le découpage du japonais par `Intl.Segmenter` ne suit pas exactement celui de wordfreq (MeCab), sa couverture mesurée sera plus basse.
7. **Attribution** : une section « Données utilisées » sur `/confidentialite` cite wordfreq (Robyn Speer) et ses sources (SUBTLEX, OpenSubtitles, Google Books Ngrams, Wikipédia…), avec la licence CC BY-SA 4.0 et le lien vers la liste tirée.
8. **Hors périmètre de K2** : un badge « mot fréquent » dans la liste de vocabulaire, et la même mesure pour l'onglet Lire. À reprendre après les premières données du point 6.

Tests (`src/lib/domain/frequency.test.ts`, `select-contents.test.ts`, `prompt.test.ts`, `generate-mission.test.ts`) : `lexicalCoverage` (découpage de chaque écriture, texte court, majuscules) ; `rankCandidates` (un contenu plus couvert passe devant à même niveau de source pour A1–A2, jamais devant un contenu d'un meilleur niveau ; aucun changement en B1+) ; le prompt (les mots fréquents n'apparaissent que pour A1–A2).

## 4. Ordre proposé

Une phase validée avant la suivante, comme pour le reste du projet.

1. **H1 — Grammaire pilote** (ru, it, A1–B1). Le plus visible pour le niveau intermédiaire. *Fait.*
2. **I — Alphabets** (cyrillique d'abord). Débloque les débutants en russe, ukrainien, puis les autres écritures. *I1 (cyrillique) fait, I2 à I5 (hangeul, grec, kana, arabe) implémentés : toutes les écritures prévues sont couvertes, en attente de relecture native.*
3. **J — Modes de révision et mesure de rétention.** Commencer la mesure tôt : elle prend des semaines à produire des données. *J1 (modes), J2 (mesure) et J3 (gamification : série de jours seule) implémentés.*
4. **H2 — Grammaire suggérée par les erreurs.** Dépend de D (déjà fait) et de H1. *Implémenté ; depuis H3, les suggestions couvrent les 19 langues.*
5. **K — Parcours par niveau**, appliqué progressivement. *K1 (table niveau → modules, accueil) implémenté ; K2 (contenus selon l'étape, fréquence des mots) implémenté.*

Phase G (écrire puis dire) est faite ; elle n'avait pas de dépendance avec ce plan.

En parallèle du développement : faire relire par des natifs les 342 points de grammaire (19 langues) et les six alphabets (russe, ukrainien, coréen, grec, japonais, arabe), pour pouvoir les publier en production.

## 5. Décisions

Prises :

1. **Grammaire** : leçons curées, relues avant publication (H1).
2. **Langues pilotes de la grammaire** : russe et italien (H1).
3. **Gamification** : série de jours seule, désactivable (J3).
4. **Fréquence des mots** : [wordfreq](https://github.com/rspeer/wordfreq), CC BY-SA 4.0 (2026-10-26). Recherche des licences après la liste « À prendre ».

À prendre :

1. **Chinois** : les hanzis entrent-ils dans le périmètre, ou seulement plus tard ?

Recherche des licences pour la décision 4 (2026-10-26) : une liste de fréquence doit avoir une licence compatible avec un usage commercial.

| Source | Licence des données | Usage commercial | Langues de l'app couvertes |
| --- | --- | --- | --- |
| [wordfreq](https://github.com/rspeer/wordfreq) (sous-titres, Wikipédia, livres, web…) | CC BY-SA 4.0, attributions par source (SUBTLEX, OpenSubtitles, Google Books) | Oui | 19 sur 19 |
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (OpenSubtitles 2018) | CC BY-SA 4.0 | Oui | 19 sur 19 |
| [Leipzig Corpora Collection](https://wortschatz.uni-leipzig.de/en/usage) | CC BY affiché, mais usage commercial interdit sans accord écrit | Non, sauf accord | — |
| Listes Kelly (lemmes classés par niveau CECR) | CC BY-SA 3.0 pour le suédois ; non commerciale pour les autres d'après Wiktionary, non confirmé | Suédois seulement | 1 |

Recommandation retenue : wordfreq. Il couvre les 19 langues, mélange plusieurs sources (moins biaisé vers l'oral des sous-titres) et sa licence permet un usage commercial. Conditions : citer wordfreq et ses sources dans l'app (page `/confidentialite` ou une page « Sources »), et publier sous CC BY-SA 4.0 la liste qu'on en tire ; le code de l'app n'est pas concerné. Limites : les données s'arrêtent vers 2021 (projet en fin de vie), ce sont des formes et pas des lemmes (« parle » et « parlons » sont deux entrées), et elles contiennent des noms propres et des grossièretés. Pour K2, des formes suffisent : la part d'un texte couverte par les 2 000 à 3 000 formes les plus fréquentes est une mesure de lisibilité classique. Ce n'est pas un avis juridique.

## 6. Risques

- **Coût de relecture native** : chaque point de grammaire et chaque banque d'alphabet doit être relu. C'est le principal goulot, plus que le développement.
- **Contenu généré par IA** : déjà le cas pour les banques du test de niveau ; même règle ici (relecture avant publication).
- **Licences** : listes de fréquence, illustrations de lettres, sons. Vérifier avant publication.
- **iOS** : `speechSynthesis` n'a pas les mêmes voix selon les versions de Safari ; tester les langues pilotes sur iPhone avant de généraliser.
- **Mesure** : des données de rétention sur peu d'utilisateurs ne prouvent rien. Présenter les résultats comme indicatifs jusqu'à un volume suffisant.
