# Relecture unités Écriture — russe — passe A

Fichiers : `packages/content/src/units/ru/e1-lettres-familieres.ts`, `e2-faux-amis.ts`, `e3-formes-nouvelles.ts`, `e4-chuintantes.ts`, `e5-voyelles-signes.ts` · Date : 2026-11-23 · Relecteur : agent relecteur-natif (claude-opus-5-5)

## Synthèse
5 éléments relus · 0 sans remarque · 5 avec remarques (0 bloquante, 8 importantes, 10 mineures)

J’ai vérifié chaque accent tonique (U+0301) des mots de deux syllabes ou plus, dans `letters[].example.word`, `words[].text`, les `pairs`, les `options` et les `audioText` : tous sont bien placés (ма́ма, те́ма, коме́та, у́тро, у́хо, она́, рука́, сестра́, ко́мната, рестора́н, Москва́, го́род, зима́, кино́, ла́мпа, кни́га, вода́, спаси́бо, приве́т, пока́, жена́, фо́то, ры́ба, хорошо́, ча́шка, шко́ла, у́лица, же́нщина, музе́й, э́то, я́блоко, подъе́зд, э́тот, ю́бка, мя́со, семья́, друзья́, Росси́я, люблю́, объе́кт ; ёлка et тётя sans marque, à juste titre). Chaque `mcq` et `listen_mcq` a une seule bonne réponse, et `answer` pointe la bonne option partout. La comparaison des réponses ignore la casse (`Moskva`) et compte un écart de seul diacritique comme « presque » accepté (`muz` pour `muž`) : rien à ajouter pour ces cas.

## ru-a0-01-lettres-familieres (E1)
Verdict : à corriger
- [mineur] letters[3].sound.fr — Actuel : « comme « o » dans « mot » quand il est accentué ; sans accent, il se prononce plutôt « a » » — Proposé : « comme « o » dans « porte » quand il est accentué ; sans accent, il se prononce plutôt « a » » — Pourquoi : le о russe accentué est un o ouvert ; « mot » donne un o fermé, que les francophones reproduiront tel quel.

Avis sur les `// REVIEW:` :
- Noms эм et тэ (э vu en E5) : d’accord, ce sont les noms standard et ils servent d’étiquettes, pas de mots à lire.
- е classé `same` : acceptable puisque la description dit bien « yé » et que i01, i02 et i13 insistent dessus. Sur le fond, е est plutôt un faux ami de son (forme de e, son « yé ») : si l’interface affiche un badge « comme en français » pour `same`, je passerais е en `false-friend` avec `lookalike: "e"` (voir Doutes).

## ru-a0-02-faux-amis (E2)
Verdict : à corriger
- [important] letters[3].sound.fr — Actuel : « comme « s » dans « sac », toujours dur, jamais « z » ; pas un c » — Proposé : « comme « s » dans « sac » ; même entre deux voyelles, jamais « z » comme dans « rose » ; pas un c » — Pourquoi : « dur » a ici le sens scolaire français (s = [s]), mais en E4 « dur » prend le sens russe (non mouillé), et с peut justement être mouillé (сестра́). Deux sens du même mot à trois unités d’écart embrouillent l’apprenant.
- [important] letters[5].sound.fr — Actuel : « un souffle rauque au fond de la gorge, comme le « j » espagnol ; pas un x » — Proposé : « un « h » frotté au fond de la bouche, comme le « ch » allemand de « Bach » ou le « j » espagnol de « jota », en plus léger ; pas un x » — Pourquoi : « rauque au fond de la gorge » pousse le francophone vers un r français raclé, l’erreur la plus fréquente sur х ; le х russe est vélaire et plus léger que la jota.
- [important] items[3] (i04) prompt, options, explain — Actuel : prompt « Comment se lit la lettre У ? » / « How do you read the letter У? », options « ou », « i », « è » — Proposé : prompt `{ fr: "Quelle lettre latine transcrit У ?", en: "Which Latin letter transcribes У?" }`, options `[{ id: "a", text: "u" }, { id: "b", text: "y" }, { id: "c", text: "i" }]`, `answer: "a"`, explain `{ fr: "У ressemble à un y, mais se lit « ou » ; en lettres latines, on l’écrit u.", en: "У looks like a y, but reads 'oo'; in Latin letters, it is written u." }` — Pourquoi : les options ne sont pas traduites ; « ou » et « è » sont des graphies françaises illisibles pour un anglophone (« ou » se lit comme dans « out »). Avec u / y / i, l’item vaut pour les deux publics et le distracteur « y » vise le vrai piège de la forme.
- [mineur] items[7] (i08) explain — Actuel fr : « Сок et нос ont les mêmes lettres que des mots latins (« cok », « hoc »), mais se lisent « sok » et « nos ». » ; en : « Сок and нос look like Latin 'cok' and 'hoc', but read 'sok' and 'nos'. » — Proposé fr : « Сок et нос ressemblent à « cok » et « hoc » écrits en lettres latines, mais se lisent « sok » et « nos ». » ; en : « Сок and нос look like 'cok' and 'hoc' in Latin letters, but read 'sok' and 'nos'. » — Pourquoi : « mots latins » fait penser à la langue latine, et « cok » n’est pas un mot.

Avis sur le `// REVIEW:` (i04) : oui, c’est un vrai problème pour les anglophones ; correction ci-dessus.

## ru-a0-03-formes-nouvelles (E3)
Verdict : à corriger
- [mineur] letters[1].sound.fr — Actuel : « comme « g » dans « gare », toujours dur » — Proposé : « comme « g » dans « gare », même devant е et и (jamais comme dans « girafe ») » — Pourquoi : même risque de confusion avec le « dur » russe d’E4 (г peut être mouillé : гид) ; la formulation concrète dit ce qu’on veut dire. L’anglais « always hard » est correct en anglais.
- [mineur] letters[5].sound.fr — Actuel : « comme « l » dans « lac », mais plus sombre ; il ressemble à un petit toit » — Proposé : « comme le « l » anglais de « full » : plus sombre que notre « l », la langue un peu creusée ; il ressemble à un petit toit » — Pourquoi : « plus sombre » seul ne dit rien à un débutant ; l’appui sur l’anglais est parlant pour la plupart des francophones.

Avis sur le `// REVIEW:` (nom эль) : d’accord, c’est le nom standard, affiché en étiquette.

## ru-a0-04-chuintantes (E4)
Verdict : à corriger
- [important] letters[0].sound — Actuel fr : « comme « j » dans « jour », toujours dur » ; en : « like the 's' in 'pleasure', always hard » — Proposé fr : « comme « j » dans « jour », mais plus grave, la langue plus en arrière ; il ne s’adoucit jamais, même devant е ou и » ; en : « like the 's' in 'pleasure', but deeper, with the tongue further back; it never softens, even before е or и » — Pourquoi : « dur » n’a pas été défini (E1 ne parle que d’« adoucir ») ; dire « ne s’adoucit jamais » relie la notion à ce qui a été vu, et prépare жи / же.
- [mineur] letters[5].sound — Actuel fr : « comme « ch » dans « chat », toujours dur » ; en : « like the 'sh' in 'shop', always hard » — Proposé fr : « comme « ch » dans « chat », mais plus grave ; il ne s’adoucit jamais, même devant е ou и » ; en : « like the 'sh' in 'shop', but deeper; it never softens, even before е or и » — Pourquoi : même raison que pour ж, et cela oppose clairement ш au щ « doux ».
- [mineur] letters[7].sound — Actuel fr : « un « i » dit avec la langue en arrière, entre « i » et « ou » ; jamais en début de mot » ; en : « an 'i' said with the tongue pulled back, between 'i' and 'oo'; never at the start of a word » — Proposé fr : « dis « ou », puis étire les lèvres comme pour « i » sans bouger la langue : un « i » dit la langue en arrière ; jamais en début de mot » ; en : « say 'oo', then spread your lips as for 'ee' without moving your tongue: an 'i' with the tongue pulled back; never at the start of a word » — Pourquoi : « entre i et ou » ne se reproduit pas ; l’astuce classique des lèvres donne un résultat immédiat.
- [mineur] words[1].translation.en et items[12] (i13) explain.en — Actuel : « you (one friend) » / « ты = you (one friend) » — Proposé : « you (informal, one person) » / « Мы = we; ты = you (informal, one person); вы = you (polite or plural). » — Pourquoi : ты sert aussi avec la famille, les enfants, les animaux ; « one friend » est trop étroit et sonne bizarre.
- [important] items[0] (i01) explain — Actuel fr : « Quatre sons qui s’écrivent avec deux lettres en français, et une seule en russe. » ; en : « Four sounds that take two letters in English, and only one in Russian. » — Proposé fr : « Trois de ces sons s’écrivent avec plusieurs lettres en français (ch, tch, ts) ; en russe, chaque son a sa propre lettre. » ; en : « Three of these sounds take two letters in English (sh, ch, ts), and the sound of ж has no letter of its own; in Russian, each sound has one letter. » — Pourquoi : faux tel quel : le « j » de « jour » s’écrit avec une seule lettre, et « tch » en a trois ; en anglais, le son de « pleasure » s’écrit s.
- [important] items[3] (i04) options — Actuel : « и = i, й = y bref », « и = i, й = ou », « и = n, й = i » — Proposé : `[{ id: "a", text: "и = i, й = y" }, { id: "b", text: "и = i, й = u" }, { id: "c", text: "и = n, й = i" }]` (answer reste "a") — Pourquoi : les options ne sont pas traduites ; « bref » et « ou » sont du français pour l’anglophone. « y » se lit bien comme une semi-voyelle dans les deux langues (« boy », « yéti ») ; l’explication donne déjà « bref » et la transcription j.
- [important] items[7] (i08) explain — Actuel fr : « Ж en fin de mot se durcit : муж se dit « mouch ». » ; en : « Ж at the end of a word hardens: муж sounds like 'moosh'. » — Proposé fr : « En fin de mot, ж perd sa voix et se prononce comme ш : муж se dit « mouch ». » ; en : « At the end of a word, ж loses its voice and sounds like ш: муж sounds like 'moosh'. » — Pourquoi : c’est un assourdissement, pas un durcissement ; ж est déjà dur (la fiche de la lettre le dit), l’explication contredit donc la leçon.

Avis sur les `// REVIEW:` :
- i04 (options mélangées) : oui, à corriger, voir ci-dessus.
- i12 (`muzh` accepté) : d’accord, c’est la graphie qu’un débutant tape sur téléphone ; `muz` est déjà absorbé comme écart de diacritique.

## ru-a0-05-voyelles-signes (E5)
Verdict : à corriger
- [important] letters[3].sound.fr — Actuel : « « ya », comme dans « yacht » ; ce n’est pas un R à l’envers » — Proposé : « « ya », comme dans « yack » ; ce n’est pas un R à l’envers » — Pourquoi : en français, « yacht » se prononce « yot » (ou « yak ») ; l’exemple induit « yo », c’est-à-dire ё.
- [mineur] letters[0].sound.fr et .en — Actuel fr : « « yo », comme dans « yoyo » ; toujours accentué, donc jamais d’accent ajouté » — Proposé fr : « « yo », comme dans « yoyo » ; toujours accentué, donc jamais d’accent ajouté ; dans les textes courants, on l’écrit souvent е » ; en : « 'yo', as in 'yogurt'; always stressed, so it never takes an extra stress mark; in everyday texts, it is often written е » — Pourquoi : l’apprenant rencontrera très vite ёлка écrit елка ; mieux vaut le prévenir dès la découverte de la lettre.
- [mineur] letters[5].sound — Actuel fr : « aucun son : le « signe dur », rare, sépare la consonne de la voyelle qui suit » ; en : « no sound: the 'hard sign', rare, keeps the consonant apart from the vowel after it » — Proposé fr : « aucun son : le « signe dur », rare, sépare la consonne de la voyelle qui suit, dont on entend alors le « y » : подъе́зд se dit « pad-yest » » ; en : « no sound: the 'hard sign', rare, keeps the consonant apart from the vowel after it, whose 'y' you then hear: подъе́зд sounds like 'pad-yest' » — Pourquoi : « sépare » reste abstrait ; l’effet audible est le « y » de е, ё, ю, я après ъ.
- [mineur] words[11].translation — Actuel : « objet » / « object » — Proposé : `{ fr: "objet (d’étude), site", en: "object (of study), site" }` — Pourquoi : объе́кт n’est pas l’objet du quotidien (вещь, предме́т) mais un objet d’étude, un site, un chantier ; « objet » seul fait un faux ami. Variante : remplacer le mot par объявле́ние (`obʺjavlenie`, « annonce » / « notice, ad »), lisible avec les lettres vues et plus courant.

Avis sur les `// REVIEW:` :
- подъе́зд comme exemple de ъ : d’accord, c’est un mot de tous les jours, bien plus utile qu’объе́кт.
- i11 (`yug` accepté) : d’accord ; même logique que `myaso` en i12, à garder.

## Doutes
- E1, е en `kind: "same"` : tout dépend de ce que l’interface affiche pour `same`. Si c’est « se lit comme en français », е devrait être `false-friend` (`lookalike: "e"`). Je laisse l’arbitre trancher selon l’écran.
- Translittération х = h (système de `ru.ts`, proche de l’ISO 9) : un francophone attendrait « kh », un anglophone « kh » aussi. Aucun item `type` ne porte sur х, donc pas de réponse refusée aujourd’hui ; à prévoir (accepter `kh`) si un item `type` en contient un jour.
- E4, ч « toujours doux » : compréhensible puisque E1 a introduit « adoucit » ; je ne l’ai pas signalé.
- Approximations de prononciation (« t’yéma », « niét », « kharacho », « sim’-ya ») : ce sont des aides acceptables en A0 ; elles présentent le mouillement comme un « y » complet, ce qui reste un compromis pédagogique courant.
- Rendu Piper de ы (i07 d’E4) et de ё (i06 d’E5) : à vérifier à l’écoute, ces items ne valent que si la voix distingue nettement ы / и et ё / е.
