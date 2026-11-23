# Relecture unité — russe — passe A

Fichier : `packages/content/src/units/ru/01-saluer.ts` · Date : 2026-11-23 · Relecteur : agent relecteur-natif (claude-opus-5-5)

## Synthèse
29 éléments relus · 21 sans remarque · 8 avec remarques (0 bloquante, 4 importantes, 5 mineures)

Vérifié sur tout le fichier : orthographe russe, accent tonique (présent et bien placé sur chaque mot de deux syllabes ou plus du texte affiché, absent des `accept` et `answer`), translittération lettre à lettre selon `src/lib/alphabets/ru.ts` (toutes conformes, sauf le « э » accentué), traductions FR et EN, unicité de la bonne réponse des `mcq`, variantes des `order`/`cloze`/`type` au regard de la notation (`normalizeTypedText` retire la ponctuation finale, `ignoreInnerPunctuation` absorbe le tiret de « Я — францу́з », l'accent tonique et ё/е sont ignorés). Les blocs « из Москвы́ / из Пари́жа » donnés comme formules figées conviennent à une unité 1 (pratique courante des manuels A1 ; la glose de из annonce le changement de terminaison sans l'expliquer) : pas de remarque.

## Général (métadonnées et typographie française)
Verdict : à corriger
- [mineur] tout le fichier, textes `fr` (ex. `situation.fr`, `canDo[1].text.fr`, `dialogue.lines[0].translation.fr`, `items[*].explain.fr`) — Actuel : apostrophe droite « t'appelles », « d'où », « c'est », espace ordinaire avant `: ; ? !` — Proposé : apostrophe typographique « t’appelles », « d’où », « c’est » et espace insécable (U+00A0 ou U+202F) avant `: ; ? !` — Pourquoi : règle de typographie française du projet (`src/lib/grammar/AUTHORING.md`, l. 93) ; le fichier n’a aucune apostrophe typographique. Le titre, la situation, les « Je peux… » et la durée sont justes par ailleurs.

## dialogue (titre, locuteurs, lignes d1 à d9)
Verdict : à corriger
- [important] `dialogue.lines[5].transliteration` (d6) et `dialogue.lines[6].transliteration` (d7) — Actuel : « Zdórovo! A kto è́to? » et « È́to Ánna. Oná tóže iz Moskvý. » — Proposé : « Zdórovo! A kto èto? » et « Èto Ánna. Oná tóže iz Moskvý. » — Pourquoi : la génération automatique empile l’accent aigu sur le grave de è (« è́ », deux diacritiques sur une lettre), ce qui s’affiche mal selon les polices et se lit comme une faute ; э́то n’a qu’une voyelle possible pour l’accent (l’autre est о final atone), donc l’accent n’apporte rien ici. Si l’on tient à marquer l’accent, prévoir une règle générale dans le générateur (par ex. souligner ou mettre en gras la voyelle accentuée) plutôt que deux diacritiques ; à trancher pour toutes les unités, э́то reviendra souvent.

Le reste est juste et naturel : « Я Макси́м » sans tiret (pronom sujet), « Мне то́же ! » en réponse à « О́чень прия́тно », « здо́рово » bien accentué sur la 1re syllabe (sens « super », à distinguer de « здоро́во », salut familier), traductions FR et EN fidèles. Translittérations des autres lignes conformes au système (я = ja, ч = č, ь = ʹ, ц = c, ы = y).

## dialogue.glosses
Verdict : à corriger
- [mineur] `dialogue.glosses[20].meaning` (э́то) — Actuel : `{ fr: "c'est, ce", en: "this is, it" }` — Proposé : `{ fr: "c’est, voici", en: "this is, that's" }` — Pourquoi : la note dit « ne change jamais », ce qui est vrai pour э́то présentatif, mais « ce » renvoie au déterminant (э́тот / э́та / э́то), qui, lui, change ; le résumé de grammaire dit déjà « c’est, voici ».

Les autres gloses sont justes (lemmes ты, я, звать, Москва́, Пари́ж, встре́ча, здра́вствовать ; « le premier в ne se prononce pas » est exact ; францу́женка bien accentué).

## keyPhrases
Verdict : ok

## grammar.summary
Verdict : à corriger
- [mineur] `grammar.summary.fr` (4e ligne) et `grammar.summary.en` (4e ligne) — Actuel : « Le genre se voit souvent à la fin du mot : consonne → masculin (Макси́м, францу́з), -а → féminin (А́нна). » / « The ending often shows the gender: consonant → masculine (Макси́м, францу́з), -а → feminine (А́нна). » — Proposé : « Le genre se voit souvent à la fin du mot : consonne → masculin (Макси́м, францу́з), -а → féminin (А́нна). Un prénom d’homme reste masculin : Ле́о → он. » / « The ending often shows the gender: consonant → masculine (Макси́м, францу́з), -а → feminine (А́нна). A man's name stays masculine: Ле́о → он. » — Pourquoi : Ле́о, le héros, finit par -о et ne suit pas la règle ; un apprenant attentif le remarque dès le dialogue. Une demi-phrase évite le doute sans alourdir.

## i01
Verdict : ok

## i02
Verdict : à corriger
- [important] `items[1].prompt` et `items[1].options` — Actuel : prompt `{ fr: "Anna est de…", en: "Anna is from…" }`, options « Пари́жа. » / « Москвы́. » — Proposé : prompt `{ fr: "D'où vient Anna ?", en: "Where is Anna from?" }` (avec apostrophe typographique en FR), options `{ id: "a", text: "Из Пари́жа." }` / `{ id: "b", text: "Из Москвы́." }` (answer inchangé : "b") — Pourquoi : une phrase française complétée par un génitif russe isolé, avec majuscule et point, mélange les langues et détache la forme « Москвы́ » du bloc « из Москвы́ » que l’unité demande d’apprendre tel quel. Même format que i01.

## i03
Verdict : ok

## i04
Verdict : ok

## i05
Verdict : ok

## i06
Verdict : ok

## i07
Verdict : ok

## i08
Verdict : à corriger
- [important] `items[7].accept` — Actuel : `["Тебя как зовут?"]` — Proposé : `["Тебя как зовут?", "Как зовут тебя?"]` — Pourquoi : « Как зову́т тебя́ ? » est correct et un natif ne le corrigerait pas (ordre un peu plus marqué, mais courant à l’oral et à l’écrit). Avec trois jetons, l’apprenant a de bonnes chances de le produire : le refuser ferait croire à une faute.

## i09
Verdict : à corriger
- [mineur] `items[8].accept` — Actuel : `[]` — Proposé : `["Зовут меня Лео."]` — Pourquoi : « Зову́т меня́ Ле́о » est correct, fréquent à l’oral comme dans les récits (« Зовут меня Лео, я из Парижа »). Moins neutre que l’ordre de référence, mais pas fautif ; voir aussi la section Doutes.

## i10
Verdict : ok

## i11
Verdict : à corriger
- [important] `items[10].explain` — Actuel : `{ fr: "Я из Москвы́ = Je suis de Moscou. Ты… est une question.", en: "Я из Москвы́ = I'm from Moscow. Ты… is a question." }` — Proposé : `{ fr: "Я из Москвы́ = Je suis de Moscou. Ты из Москвы́ ? = Tu es de Moscou ? : ты veut dire « tu », et c’est l’intonation qui fait la question.", en: "Я из Москвы́ = I'm from Moscow. Ты из Москвы́? = Are you from Moscow?: ты means \"you\", and the intonation makes it a question." }` — Pourquoi : l’explication actuelle laisse croire que ты marque la question ; en russe, la question oui/non se fait par l’intonation seule, piège réel pour un francophone qui cherche un « est-ce que ».
- [mineur] `items[10].prompt` — Actuel : `{ fr: "Écoute. Qu'est-ce qu'il dit ?", en: "Listen. What does he say?" }` — Proposé : `{ fr: "Écoute. Qu’est-ce que tu entends ?", en: "Listen. What do you hear?" }` — Pourquoi : le genre des voix n’est pas établi (commentaire REVIEW du fichier) ; la formule neutre de i12 évite un « il » faux si la voix est féminine.

## i12
Verdict : ok

## i13
Verdict : ok

## i14
Verdict : ok

## i15
Verdict : ok

## i16
Verdict : ok

## i17
Verdict : ok

## i18
Verdict : ok

## i19
Verdict : ok

## i20
Verdict : ok

## i21
Verdict : ok

## i22
Verdict : ok

## lessons et test
Verdict : ok

Les 10 items du test sont tous vus dans une étape, une seule bonne réponse chacun, niveau adapté (pas de forme non vue).

## conversation
Verdict : ok

Répliques identiques ou proches du dialogue, translittérations conformes, traductions fidèles ; chaque `itemId` correspond bien à la réplique de Léo (i20 → c2, i21 → c4, i22 → c6).

## Doutes
- **Translittération de « э́ »** : je propose de supprimer l’accent sur è dans э́то, mais c’est une décision de système (le générateur produira « è́ » pour tout э accentué : э́тот, поэ́т…). À trancher une fois pour toutes les unités russes.
- **i09, « Зову́т меня́ Ле́о »** : correct, mais plus marqué que « Как зову́т тебя́ » (i08). Un arbitre peut juger acceptable de ne garder que l’ordre neutre pour la phrase affirmative ; je penche pour l’accepter.
- **d6, « Здо́рово ! » en réaction à « Я из Москвы́ »** : naturel mais un peu plat, puisque la scène se passe à Moscou ; pas une faute, je n’ai pas signalé.
- **d8 et c6, départ de Léo** : il quitte la conversation juste après avoir rencontré Anna (commentaire REVIEW du fichier). « Ну, мне пора́. Пока́ ! » est naturel ; la brusquerie est un choix de scénario, pas une faute de langue. « Пока́ » à une personne rencontrée à l’instant passe dans une soirée entre jeunes.
- **i13** : « Здоро́во ! » (salut familier) est aussi un « salut » en arrivant, mais il n’est pas enseigné et se confond avec здо́рово du dialogue ; je ne propose pas de l’ajouter.
