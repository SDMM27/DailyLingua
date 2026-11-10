# Relecture grammaire — russe — passe B

Fichier : src/lib/grammar/courses/ru.ts · Date : 2026-11-05 · Relecteur : agent relecteur-natif (claude-opus-5-5)

Méthode : exercices d’abord (réponses acceptées, unicité de la bonne option), puis règle, tableau et exemples. Comparaison des réponses prise en compte : casse, ponctuation finale, accent tonique et ё/е ignorés.

## Synthèse
18 éléments relus · 1 sans remarque · 17 avec remarques (3 bloquantes, 20 importantes, 9 mineures)

Remarque transversale : les six points B1 n’ont **aucun** accent tonique dans `table` et `examples`, alors que AUTHORING.md le demande dans `table` et `examples` (la restriction A1–A2 ne vise que les citations de `rule`), et que le cours ukrainien accentue ses exemples B1. Les versions accentuées complètes sont données point par point ci-dessous.

## ru-a1-gender
Verdict : à corriger
- [mineur] rule[1] — Actuel : « Le -ь est le piège : il peut être masculin (день, слова́рь) ou féminin (дверь, тетра́дь), et seul le dictionnaire te le dit. Quelques noms masculins finissent en -а ou -я (па́па, дя́дя) : ils s’accordent comme des masculins. » — Proposé : « Le -ь est le piège : il peut être masculin (день, слова́рь) ou féminin (дверь, тетра́дь), et seul le dictionnaire te le dit. Quelques noms masculins finissent en -а ou -я (па́па, дя́дя) : ils s’accordent comme des masculins. Les noms en -мя (и́мя, вре́мя) sont neutres. » — Pourquoi : и́мя et вре́мя sont du vocabulaire A1 très fréquent (Как ва́ше и́мя ?) et contredisent la règle « -я → féminin ».

## ru-a1-present-first
Verdict : à corriger
- [mineur] rule[1] — Actuel : « … après une consonne -у / -ут (жить → я живу́, они́ живу́т). » — Proposé : « … après une consonne -у / -ут (жить, radical du présent жив- → я живу́, они́ живу́т). » — Pourquoi : la règle dit « on part du radical du verbe », mais жить ne donne pas жив- par simple retrait de -ть ; l’apprenant ne peut pas deviner le в.

## ru-a1-present-second
Verdict : à corriger
- [important] rule[0] — Actuel : « 2e conjugaison : les verbes en -ить et quelques verbes en -еть ou -ать … » — Proposé : « 2e conjugaison : la plupart des verbes en -ить et quelques verbes en -еть ou -ать (смотре́ть, слы́шать) ont les terminaisons -ю/-у, -ишь, -ит, -им, -ите, -ят/-ат. Exemple : говори́ть → я говорю́, ты говори́шь, они́ говоря́т. Retiens -ят plutôt que -ут : c’est le signe de cette conjugaison. Attention : жить, vu au point précédent, reste de la 1re conjugaison (ты живёшь, они́ живу́т). » — Pourquoi : telle quelle, la règle classe жить (et пить) en 2e conjugaison, ce qui contredit directement le point précédent.

## ru-a1-plural
Verdict : ok

## ru-a1-prepositional
Verdict : à corriger
- [important] exercises[3].prompt — Actuel : « Мы были в ___ вчера. » — Proposé : « Сейчас мы в ___. » — Pourquoi : l’ordre « … в музее вчера » sonne peu naturel (un natif dit « Вчера мы были в музее ») et le passé n’est vu qu’en A2 ; la version au présent teste la même forme (музее).
- [mineur] exercises[4] — Actuel : prompt « Моя сестра живёт в ___. », hint « Россия », answers « России » — Proposé : hint « Германия », answers `["Германии"]`, explanation « Les noms en -ия font -ии au prépositionnel : в Германии. » — Pourquoi : l’exercice 3 porte déjà sur в России ; un autre nom en -ия vérifie que la règle est comprise et pas mémorisée.

## ru-a1-possessives
Verdict : à corriger
- [bloquant] exercises[2] — Actuel : prompt « Это Иван, а это ___ жена. », sans hint, answers `["его"]` — Proposé : ajouter `hint: "он"` et l’explication « Le possesseur est Иван (он) : его, invariable, même devant жена (féminin). » — Pourquoi : sans indice, « Это Иван, а это моя жена » (ou твоя, наша, ваша) est parfaitement correct et naturel (on présente Ivan puis sa propre femme) ; ces bonnes réponses sont refusées.

## ru-a2-accusative
Verdict : à corriger
- [important] exercises[4].answers — Actuel : `["Я сейчас иду в школу.", "Сейчас я иду в школу."]` — Proposé : `["Я сейчас иду в школу.", "Сейчас я иду в школу.", "Я сейчас еду в школу.", "Сейчас я еду в школу.", "Я иду в школу.", "Я еду в школу."]` — Pourquoi : la consigne « Dis que tu vas à cet endroit » n’impose pas d’aller à pied ; еду est aussi juste, et omettre сейчас reste une transformation correcte que le point ne cherche pas à sanctionner.
- [mineur] rule[1] — Actuel : « … Les féminins restent réguliers : Ви́жу А́нну, ма́му. » — Proposé : « … Les féminins restent réguliers : Ви́жу А́нну, ма́му. Les masculins en -а suivent ce modèle : па́па → Ви́жу па́пу. » — Pourquoi : па́па est vu en A1 comme masculin en -а ; l’apprenant appliquerait « animé = génitif » et écrirait *па́пы.

## ru-a2-genitive
Verdict : à corriger
- [mineur] rule[0] — Actuel : « … féminin : -а → -ы (-и après г, к, х, ж, ш, ч, щ), -я → -и ; neutre … » — Proposé : « Le génitif répond à « de qui ? de quoi ? ». Masculin : consonne → -а, -й / -ь → -я ; féminin : -а → -ы (-и après г, к, х, ж, ш, ч, щ), -я et -ь → -и (тетра́дь → тетра́ди) ; neutre : -о → -а, -е → -я. Voir le tableau. » — Pourquoi : le féminin en -ь (déjà vu en A1 : тетра́дь, дверь) n’est pas couvert.

## ru-a2-past
Verdict : à corriger
- [mineur] rule[0] — Actuel : « Il n’y a pas de conjugaison par personne : seul le genre du sujet compte. » — Proposé : « Il n’y a pas de conjugaison par personne : seuls le genre et le nombre du sujet comptent. » — Pourquoi : la phrase précédente vient de présenter -ли pour le pluriel ; « seul le genre » est inexact.

## ru-a2-motion
Verdict : à corriger
- [bloquant] exercises[4].prompt — Actuel : « Мы ___ в Москву на поезде. » (answers `["едем"]`) — Proposé : « Сейчас мы ___ в Москву на поезде. » — Pourquoi : sans repère temporel, « Мы ехали в Москву на поезде » est aussi correct et serait refusé ; сейчас fixe le présent.

## ru-a2-dative
Verdict : à corriger
- [important] rule[1] — Actuel : « … au pluriel, Мне нра́вятся э́ти цены́. … » — Proposé : « Нра́виться se construit à l’envers de « aimer » : la personne qui apprécie est au datif, ce qui plaît est le sujet. Мне нра́вится э́тот го́род (« cette ville me plaît ») ; au pluriel, Мне нра́вятся э́ти фи́льмы. Piège : le verbe s’accorde avec la chose qui plaît, pas avec toi. » — Pourquoi : le nominatif pluriel est це́ны (accent sur le radical), pas цены́ ; de plus « ces prix me plaisent » est un exemple étrange.
- [important] rule[2] — Actuel : « Rappel : 1 → год, 2 à 4 → го́да, 5 et plus → лет (Ей 23 го́да, Ему́ 31 год). » — Proposé : « Âge : мне 20 лет, avec la personne au datif. Le mot dépend du dernier chiffre : 1 → год, 2 à 4 → го́да, 0 et 5 à 9 → лет ; de 11 à 14, toujours лет (Ей 23 го́да, Ему́ 31 год, Мне 12 лет). К + datif signifie « chez, vers » : Я иду́ к врачу́. » — Pourquoi : « 5 et plus → лет » contredit les exemples qui suivent (23 го́да, 31 год) et l’exercice 2 (24 года) ; il faut parler du dernier chiffre et de l’exception 11–14.

## ru-a2-instrumental
Verdict : à corriger
- [mineur] examples[2].text — Actuel : « Мы идём в кино́ с не́й. » — Proposé : « Мы идём с не́й в кино́. » — Pourquoi : le complément pronominal en fin de phrase porte une insistance inutile ; l’ordre neutre place с не́й avant le lieu.

## ru-b1-aspect
Verdict : à corriger
- [important] table.rows — Actuel : sans accent tonique — Proposé : `[["де́лать", "сде́лать", "faire"], ["чита́ть", "прочита́ть", "lire"], ["писа́ть", "написа́ть", "écrire"], ["покупа́ть", "купи́ть", "acheter"], ["реша́ть", "реши́ть", "résoudre, décider"], ["открыва́ть", "откры́ть", "ouvrir"]]` — Pourquoi : AUTHORING.md exige l’accent dans `table` à tous les niveaux.
- [important] examples[*].text — Actuel : sans accent tonique — Proposé : examples[0] « Весь день я писа́л отчёт. » ; examples[1] « Наконе́ц я написа́л отчёт и отпра́вил его́ нача́льнику. » ; examples[2] « Ра́ньше мы ча́сто обе́дали в э́том кафе́. » ; examples[3] « Вчера́ я купи́л биле́ты на по́езд. » — Pourquoi : idem, pour `examples`.

## ru-b1-future
Verdict : à corriger
- [important] rule[2] — Actuel : « … Et après если et когда, le russe garde le futur, là où le français met le présent : Если ты напишешь, я отвечу (« si tu écris, je répondrai »). » — Proposé : « Pièges : on n’écrit jamais буду + perfectif (я буду прочитать est faux). Après если, le russe met le futur là où le français met le présent : Если ты напишешь, я отвечу (« si tu écris, je répondrai »). Après когда, comme en français, on emploie le futur : Когда я приеду, я позвоню (« quand j’arriverai, j’appellerai »). » — Pourquoi : le français met le futur après « quand » (l’exemple 2 traduit d’ailleurs « quand j’arriverai ») ; la règle est fausse pour когда.
- [important] exercises[2].options — Actuel : `["пишешь", "написал", "напишешь", "писал"]` — Proposé : `["пишешь", "написать", "напишешь", "писал"]` — Pourquoi : « Если ты написал мне сообщение, я сразу отвечу » (« si tu m’as écrit, je répondrai tout de suite ») est grammatical et défendable ; le distracteur n’est pas franchement faux.
- [important] table — Actuel : sans accent tonique — Proposé : caption « Futur de чита́ть (imperfectif) et de прочита́ть (perfectif) » ; rows `[["я", "бу́ду чита́ть", "прочита́ю"], ["ты", "бу́дешь чита́ть", "прочита́ешь"], ["он / она́", "бу́дет чита́ть", "прочита́ет"], ["мы", "бу́дем чита́ть", "прочита́ем"], ["вы", "бу́дете чита́ть", "прочита́ете"], ["они́", "бу́дут чита́ть", "прочита́ют"]]` — Pourquoi : accent requis dans `table`.
- [important] examples[*].text — Actuel : sans accent tonique — Proposé : examples[0] « За́втра я бу́ду рабо́тать до́ма. » ; examples[1] « Я позвоню́ тебе́, когда́ прие́ду в о́фис. » ; examples[2] « Е́сли ты напи́шешь мне, я сра́зу отве́чу. » ; examples[3] « На сле́дующей неде́ле мы бу́дем обсужда́ть но́вый прое́кт. » — Pourquoi : accent requis dans `examples`.

## ru-b1-imperative
Verdict : à corriger
- [important] table.rows — Actuel : sans accent tonique — Proposé : `[["чита́ть", "чита́й", "чита́йте"], ["говори́ть", "говори́", "говори́те"], ["писа́ть", "пиши́", "пиши́те"], ["откры́ть", "откро́й", "откро́йте"], ["сказа́ть", "скажи́", "скажи́те"], ["отве́тить", "отве́ть", "отве́тьте"]]` — Pourquoi : accent requis dans `table` ; ici il est même au cœur de la règle (-и si l’accent tombe sur la terminaison).
- [important] examples[*].text — Actuel : sans accent tonique — Proposé : examples[0] « Откро́й, пожа́луйста, окно́: здесь ду́шно. » ; examples[1] « Проходи́те, сади́тесь, чу́вствуйте себя́ как до́ма! » ; examples[2] « Не открыва́й э́ту дверь, там сквозня́к. » ; examples[3] « Осторо́жно, не упади́! » — Pourquoi : accent requis dans `examples`.
- [mineur] examples[0].translation — Actuel : « Ouvre la fenêtre, s’il te plaît : il fait lourd ici. » — Proposé : « Ouvre la fenêtre, s’il te plaît : on étouffe ici. » — Pourquoi : « il fait lourd » évoque la météo orageuse ; душно dans une pièce, c’est le manque d’air.

## ru-b1-numbers
Verdict : à corriger
- [important] table.rows — Actuel : sans accent tonique — Proposé : `[["1, 21, 101", "nominatif singulier", "оди́н стол"], ["2, 3, 4, 22…", "génitif singulier", "два стола́, три кни́ги"], ["2 (féminin)", "génitif singulier", "две неде́ли"], ["5 à 20, 25, 30…", "génitif pluriel", "пять столо́в, де́сять книг"], ["11 à 14", "génitif pluriel", "оди́ннадцать столо́в"]]` — Pourquoi : accent requis dans `table`.
- [important] examples[*].text — Actuel : sans accent tonique — Proposé : examples[0] « У меня́ два бра́та и три сестры́. » ; examples[1] « В на́шей ко́мнате пять о́кон и оди́н большо́й стол. » ; examples[2] « Мы рабо́таем вме́сте уже́ два́дцать оди́н год. » ; examples[3] « Я купи́л две буты́лки воды́ и де́сять я́блок. » — Pourquoi : accent requis dans `examples`.
- [mineur] rule[1] — Actuel : « … féminin et neutre → on retire la terminaison (книга → книг, окно → окон), souvent avec une voyelle fugitive (сестра → сестёр). » — Proposé : « Genre : один / одна / одно, mais seulement два / две pour le féminin (две книги, два окна). Génitif pluriel : masculin → -ов (-ев après -й : музеев ; -ей après -ь, ж, ш, ч, щ : словарей) ; féminin et neutre en -а / -о → on retire la terminaison (книга → книг, окно → окон), souvent avec une voyelle fugitive (сестра → сестёр) ; en -ь et en -е → -ей (тетрадей, морей). » — Pourquoi : « on retire la terminaison » est faux pour тетрадь, море, déjà vus en A1.

## ru-b1-relative
Verdict : à corriger
- [important] rule[0] — Actuel : « Который (« qui, que, dont, où, à qui… ») introduit une relative et remplace tous les relatifs français. » — Proposé : « Который (« qui, que, dont, où, à qui… ») introduit une relative et peut traduire tous les relatifs français ; pour un lieu, on dit aussi souvent где (город, где я живу). Il suit deux règles : son genre et son nombre sont ceux du mot qu’il remplace (мужчина, который… ; книга, которая… ; письмо, которое… ; люди, которые…), mais son cas dépend de sa fonction dans la relative. » — Pourquoi : где est au moins aussi courant que в котором pour « où » ; l’apprenant le rencontrera tout de suite.
- [important] examples[3].text — Actuel : « Девушка, с которой ты говорил, наш новый директор. » — Proposé : « Де́вушка, с кото́рой ты говори́л, — наш но́вый дире́ктор. » — Pourquoi : sujet et prédicat sont deux groupes nominaux au nominatif sans verbe : le tiret est obligatoire après la relative ; l’accent manque aussi.
- [important] table et examples[0..2] — Actuel : sans accent tonique — Proposé : caption « Кото́рый selon le cas (neutre : comme le masculin, sauf кото́рое) » ; rows `[["Nominatif", "кото́рый", "кото́рая", "кото́рые"], ["Accusatif (inanimé)", "кото́рый", "кото́рую", "кото́рые"], ["Génitif", "кото́рого", "кото́рой", "кото́рых"], ["Datif", "кото́рому", "кото́рой", "кото́рым"], ["Instrumental", "кото́рым", "кото́рой", "кото́рыми"], ["Prépositionnel", "кото́ром", "кото́рой", "кото́рых"]]` ; examples[0] « Э́то колле́га, кото́рый рабо́тает со мно́й в одно́м отде́ле. » ; examples[1] « Кни́га, кото́рую я чита́ю, о́чень интере́сная. » ; examples[2] « Мы живём в го́роде, в кото́ром мно́го па́рков. » — Pourquoi : accent requis dans `table` et `examples`.

## ru-b1-prefixed-motion
Verdict : à corriger
- [bloquant] exercises[3].prompt — Actuel : « Он ___ с работы в шесть часов. » (answers `["ушёл"]`) — Proposé : « Вчера он ___ с работы в шесть часов. » — Pourquoi : sans repère temporel, « Он уйдёт с работы в шесть часов » est aussi correct et serait refusé.
- [important] table.rows — Actuel : sans accent tonique — Proposé : `[["при-", "arriver", "прийти́, прие́хать", "приходи́ть, приезжа́ть"], ["у-", "partir", "уйти́, уе́хать", "уходи́ть, уезжа́ть"], ["в-", "entrer", "войти́, въе́хать", "входи́ть, въезжа́ть"], ["вы-", "sortir", "вы́йти, вы́ехать", "выходи́ть, выезжа́ть"], ["пере-", "traverser, déménager", "перейти́, перее́хать", "переходи́ть, переезжа́ть"], ["за-", "passer, faire un détour", "зайти́, зае́хать", "заходи́ть, заезжа́ть"]]` — Pourquoi : accent requis dans `table` ; le вы́- accentué des perfectifs est un vrai piège à montrer.
- [important] examples[*].text — Actuel : sans accent tonique — Proposé : examples[0] « Я приду́ в о́фис в де́вять часо́в. » ; examples[1] « Вчера́ А́нна ушла́ с рабо́ты ра́ньше. » ; examples[2] « Когда́ я вошёл в ко́мнату, все замолча́ли. » ; examples[3] « По доро́ге домо́й я зайду́ в магази́н. » — Pourquoi : accent requis dans `examples`.

## Doutes
- Accent tonique en B1 : je lis AUTHORING.md comme « accent dans `table` et `examples` à tous les niveaux, dans les citations de `rule` en A1–A2 seulement » (lecture confirmée par uk.ts, accentué en B1). Si l’arbitre retient l’autre lecture (« at A1 and A2 » portant sur les trois champs), les remarques d’accent B1 tombent, mais pas le tiret de ru-b1-relative examples[3].
- ru-a2-instrumental exercises[3] : pour « Она хочет стать ___ » avec hint учитель, beaucoup de natifs diraient учительницей. Le hint impose учитель, donc учителем seul se défend ; ajouter « учительницей » aux réponses serait généreux mais pas faux.
- ru-b1-aspect exercises[1] : « Наконец-то я напишу этот сложный отчёт! » (« je vais enfin pouvoir l’écrire ») est marginalement possible ; je le juge assez improbable pour garder l’exercice tel quel.
- ru-b1-prefixed-motion exercises[0] : « уедут из Парижа » est grammatical ; c’est le contexte « Мы встречаем друзей » qui l’exclut. Ça me paraît suffisant.
- ru-a2-past table : жи́ло retenu (norme d’Ozhegov) ; жило́ se rencontre aussi, sans gravité.
- ru-a1-prepositional exercises[1] : « Дети играют в ___ » peut faire penser à играть в + accusatif (jeu). La bonne réponse парке reste unique, mais un autre verbe (гуляют) éviterait le piège involontaire.
- ru-a2-accusative exercises[3] : « Утром она идёт на работу » se lit comme une habitude (on attendrait ходит), mais l’emploi narratif de идти dans une suite d’actions de la journée est courant ; je ne le signale pas.
