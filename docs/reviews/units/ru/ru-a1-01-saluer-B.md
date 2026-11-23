# Relecture unité — russe — passe B

Fichier : packages/content/src/units/ru/01-saluer.ts · Date : 2026-11-23 · Relecteur : agent relecteur-natif (claude-opus-5-5)

Découpage retenu : en-tête (titre, situation, « Je peux… »), dialogue (répliques, translittérations, traductions), gloses, phrases-clés, résumé de grammaire, chacun des 22 items, conversation, test.

Vérifications faites sans remarque : accent tonique de chaque mot de deux syllabes ou plus (texte affiché, gloses, phrases-clés, items, conversation) tous présents et bien placés ; `accept` et `answer` sans accent ; translittération lettre à lettre conforme à `src/lib/alphabets/ru.ts` (я → ja, ц → c, ч → č, ж → ž, ь → ʹ, ы → y) partout sauf pour « э » accentué ; absence de tiret dans « Я Макси́м » conforme à la norme ; un seul bon choix dans chaque `mcq` / `listen_mcq`, `answer` juste partout ; les 10 items du test sont tous vus dans une étape.

## Synthèse
29 éléments relus · 21 sans remarque · 8 avec remarques (0 bloquante, 4 importantes, 6 mineures)

## En-tête (title, situation, canDo)
Verdict : à corriger
- [mineur] tous les champs `fr` du fichier — Actuel : apostrophe droite « D'où », « t'appelles », « quelqu'un »… — Proposé : apostrophe typographique « D’où », « t’appelles », « quelqu’un » dans tous les textes français affichés — Pourquoi : règle de typographie du projet pour le texte français montré à l’apprenant (la comparaison des réponses ramène déjà ’ à ', donc aucun risque côté notation). À aligner avec l’unité italienne si la convention du paquet est différente.

## dialogue
Verdict : à corriger
- [important] dialogue.lines[5].transliteration (d6) — Actuel : « Zdórovo! A kto è́to? » — Proposé : « Zdórovo! A kto èto? » — Pourquoi : le générateur a empilé l’accent aigu combinant sur « è » (U+00E8 + U+0301) ; la plupart des polices superposent ou chevauchent l’accent grave et l’aigu, ce qui donne un signe illisible pour un débutant. « è » ne transcrit que « э », qui est ici la voyelle accentuée, et l’accent reste visible dans le texte cyrillique « э́то ».
- [important] dialogue.lines[6].transliteration (d7) — Actuel : « È́to Ánna. Oná tóže iz Moskvý. » — Proposé : « Èto Ánna. Oná tóže iz Moskvý. » — Pourquoi : même défaut sur la majuscule (È + U+0301), encore plus visible en début de phrase.

Le reste du dialogue est naturel et correct : enchaînement Приве́т → Меня́ зову́т → О́чень прия́тно → Мне то́же, « Ты отку́да? », « Ну, мне пора́. Пока́! », « До встре́чи! ». Traductions françaises et anglaises fidèles et idiomatiques.

## glosses
Verdict : à corriger
- [mineur] glosses (form « а »).meaning.fr — Actuel : « et, et puis » — Proposé : « et (pour enchaîner ou opposer) » — Pourquoi : « а » ne veut pas dire « et puis » (succession) ; c’est le « et » de contraste ou de relance (« А ты ? »). La note « А ты ? = Et toi ? » est bonne.
- [mineur] glosses (form « э́то »).meaning.fr — Actuel : « c'est, ce » — Proposé : « c’est, voici » — Pourquoi : « ce » renvoie au démonstratif adjectival (э́тот, э́та), qui change de forme, ce qui contredit la note « Ne change jamais ». « c’est, voici » est aussi la formule du résumé de grammaire.

## keyPhrases
Verdict : ok

## grammar
Verdict : à corriger
- [mineur] grammar.summary.fr (ligne 1) — Actuel : « Au présent, le russe n'a pas de verbe « être » : Я Ле́о. = Je suis Léo. Я францу́з. = Je suis français. » — Proposé : « Au présent, le russe ne dit pas le verbe « être » : Я Ле́о. = Je suis Léo. Я францу́з. = Je suis français. » — Pourquoi : le verbe быть existe (l’apprenant verra был, бу́ду en A2) ; c’est son présent qu’on omet. La nuance évite une contradiction plus tard sans alourdir.
- [mineur] grammar.summary.en (ligne 1) — Actuel : « In the present, Russian has no verb "to be": Я Ле́о. = I'm Leo. Я францу́з. = I'm French. » — Proposé : « In the present, Russian leaves out the verb "to be": Я Ле́о. = I'm Leo. Я францу́з. = I'm French. » — Pourquoi : même raison.

(Les deux remarques sur la ligne 1 comptent pour une seule remarque mineure.)

## i01
Verdict : ok

## i02
Verdict : à corriger
- [mineur] i02.prompt et i02.options — Actuel : prompt « Anna est de… » / « Anna is from… », options « Пари́жа. » et « Москвы́. » — Proposé : prompt { fr: « D’où vient Anna ? », en: « Where is Anna from? » }, options « Из Пари́жа. » et « Из Москвы́. » — Pourquoi : un génitif isolé (« Москвы́. ») n’est pas une réponse russe possible et l’amorce française mélange les deux langues ; la forme avec « из » est le bloc enseigné, comme dans i01.

## i03
Verdict : ok

## i04
Verdict : ok

## i05
Verdict : ok

## i06
Verdict : ok

## i07
Verdict : à corriger
- [mineur] i07.explain — Actuel : fr « Pas de verbe « être » au présent : я + prénom. Меня́ va seulement avec зову́т. » / en « No verb "to be" in the present: я + name. Меня́ only goes with зову́т. » — Proposé : fr « Pas de verbe « être » au présent : я + prénom. Pour dire ton prénom, меня́ va avec зову́т. » / en « No verb "to be" in the present: я + name. To give your name, меня́ goes with зову́т. » — Pourquoi : « seulement » est faux en dehors de cette unité (у меня́, меня́ нет…), et l’apprenant les rencontrera dès l’A1.

## i08
Verdict : à corriger
- [important] i08.accept — Actuel : « ["Тебя как зовут?"] » — Proposé : « ["Тебя как зовут?", "Как зовут тебя?"] » — Pourquoi : « Как зову́т тебя́? » est une phrase correcte et courante à l’oral (accent d’insistance sur « toi », fréquente après « А… ») ; un natif ne la corrigerait pas. Avec seulement trois étiquettes, la refuser sanctionne une bonne réponse.

## i09
Verdict : à corriger
- [important] i09.accept — Actuel : « [] » — Proposé : « ["Зовут меня Лео."] » — Pourquoi : « Зову́т меня́ Ле́о » est parfaitement correct et très usité pour se présenter (ordre neutre du récit oral : « Зову́т меня́ Ива́н ») ; un natif l’accepte sans hésiter.

## i10
Verdict : ok

## i11
Verdict : ok

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

## conversation
Verdict : ok

Translittérations c1 à c7 justes (pas de « э » dans la conversation). Répliques naturelles ; « Здо́рово! А я из Москвы́. » (c5) est plus naturel encore que d6.

## test
Verdict : ok

Les 10 items (i04, i05, i06, i08, i10, i11, i14, i15, i17, i21) sont vus dans une étape ; couverture équilibrée (salutations, он/она, prénom, origine, écoute). Si i08 et i09 gardent leurs `accept` actuels, i08 au test refusera une bonne réponse : raison de plus pour corriger i08.

## Doutes
- Translittération de « э » accentué : je propose d’omettre l’accent sur « è » (« èto ») parce que « è » ne transcrit que « э » et que l’accent reste visible en cyrillique. Si l’arbitre préfère garder la règle « accent sur chaque mot de deux syllabes », il faut une autre graphie (par exemple placer l’accent de façon lisible) et vérifier le rendu dans l’app ; dans tous les cas, corriger le générateur pour les unités suivantes (э́тот, э́та…).
- i09 : « Ле́о меня́ зову́т » (prénom en tête) se dit aussi à l’oral familier, mais c’est plus marqué ; je ne l’exige pas.
- Gloses : « здо́рово » (super) a un homonyme familier « здоро́во » (salut, entre hommes). La note « Accent sur la première syllabe » est juste ; mentionner l’homonyme est possible mais pas nécessaire en A0.
- Résumé de grammaire, ligne 4 : « consonne → masculin, -а → féminin » est présenté avec « souvent », ce qui suffit, mais « Ле́о » (en -о, masculin) figure dans ce même dialogue. Une parenthèse du type « les prénoms d’homme gardent le masculin : Ле́о, Са́ша » pourrait prévenir la confusion ; à l’arbitre de juger si cela alourdit trop.
- Accents toniques dans les `options` des `mcq` et les `tokens` des `order` : la consigne générale de relecture (fiches de grammaire) les veut absents des options ; ici l’en-tête du fichier fixe « accent sur tout le texte affiché », et aucun choix ne se distingue par l’accent. Je considère la convention de l’unité comme cohérente et ne l’ai pas signalée.
- « из Пари́жа / из Москвы́ » comme blocs figés : niveau adapté, et la note de « из » l’explique bien. Le « Je peux dire d’où je viens » (cd3) reste limité à ces deux villes ; acceptable pour une unité 1.
- k8 « Здра́вствуйте » n’est pas dans le dialogue (`lineId: null`) : le schéma le permet et c’est pédagogiquement utile.
