# Relecture grammaire — russe — passe A

Fichier : src/lib/grammar/courses/ru.ts · Date : 2026-11-05 · Relecteur : agent relecteur-natif (claude-opus-5-5)

## Synthèse
18 éléments relus · 5 sans remarque · 13 avec remarques (2 bloquantes, 17 importantes, 10 mineures)

Remarque générale : les six points B1 n’ont **aucun** accent tonique dans `table` ni dans `examples`, alors que les points A1–A2 en ont partout et que le cours ukrainien en met aussi en B1. Pour chaque point B1, je donne ci-dessous le tableau et les exemples accentués, prêts à coller (voir aussi `## Doutes`).

## ru-a1-gender
Verdict : ok

## ru-a1-present-first
Verdict : à corriger
- [mineur] rule[1] — Actuel : « Après une voyelle on écrit -ю / -ют (де́лать → я де́лаю, они́ де́лают) ; après une consonne -у / -ут (жить → я живу́, они́ живу́т). Quand la terminaison est accentuée, -е- devient -ё- : ты живёшь, он живёт, мы живём. » — Proposé : « Après une voyelle on écrit -ю / -ют (де́лать → я де́лаю, они́ де́лают) ; après une consonne -у / -ут. Le radical du présent n’est pas toujours celui de l’infinitif : жить → жив- (я живу́, они́ живу́т). Quand la terminaison est accentuée, -е- devient -ё- : ты живёшь, он живёт, мы живём. » — Pourquoi : la règle dit « on part du radical du verbe » puis donne жить comme verbe à radical consonantique sans expliquer d’où vient le в ; l’apprenant ne peut pas le déduire de l’infinitif.

## ru-a1-present-second
Verdict : ok

## ru-a1-plural
Verdict : ok

## ru-a1-prepositional
Verdict : à corriger
- [mineur] rule[2] — Actuel : « в = à l’intérieur (в ба́нке, в шко́ле, в магази́не) ; на = sur une surface, un espace ouvert ou une activité (на столе́, на у́лице, на вокза́ле, на рабо́те, на по́чте). Piège : le français dit toujours « à », mais le russe choisit mot par mot : на рабо́те, mais в о́фисе. » — Proposé : « в = à l’intérieur (в ба́нке, в шко́ле, в магази́не) ; на = sur une surface, un espace ouvert ou une activité (на столе́, на у́лице, на вокза́ле, на рабо́те, на по́чте). Piège : le français dit souvent « à » dans les deux cas, mais le russe choisit mot par mot : на рабо́те, mais в о́фисе. » — Pourquoi : « toujours » est faux (le français dit aussi « dans », « sur », « au bureau ») ; l’idée du piège reste la même.
- [mineur] exercises[3].prompt — Actuel : « Мы были в ___ вчера. » — Proposé : « Сейчас мы в ___. » — Pourquoi : le passé n’est vu qu’en A2, et l’ordre neutre serait « Вчера мы были в музее » ; avec вчера en fin de phrase, l’accent porte sur la date, ce qui sonne un peu forcé à A1. `hint` « музей » et `answers` « музее » restent valables.

## ru-a1-possessives
Verdict : à corriger
- [bloquant] exercises[2] — Actuel : « Это Иван, а это ___ жена. » sans `hint`, `answers: ["его"]` — Proposé : ajouter `hint: "он"` (prompt, answers et explanation inchangés) — Pourquoi : sans indice, « Это Иван, а это моя жена » (je présente Ivan, puis ma femme) est une phrase parfaitement correcte et naturelle, de même que твоя / наша ; une bonne réponse serait refusée.

## ru-a2-accusative
Verdict : à corriger
- [important] exercises[4] — Actuel : instruction « Dis que tu vas à cet endroit (remplace « где ? » par « куда ? »). », answers « Я сейчас иду в школу. », « Сейчас я иду в школу. » — Proposé : instruction « Dis que tu vas à pied à cet endroit en ce moment : utilise иду et remplace « где ? » par « куда ? ». », answers `["Я сейчас иду в школу.", "Сейчас я иду в школу.", "Я иду сейчас в школу.", "Я иду в школу сейчас."]` — Pourquoi : la consigne ne dit pas quel verbe employer ; un apprenant qui écrit « Я сейчас еду в школу » ou déplace сейчас donne une phrase correcte refusée. Nommer иду et lister les ordres possibles règle les deux problèmes.

## ru-a2-genitive
Verdict : à corriger
- [important] table.rows — Actuel : 7 lignes, sans féminin en -ь ni masculin en -ь — Proposé : ajouter après la ligne `["неде́ля", "неде́ли", "-я → -и"]` les deux lignes `["тетра́дь", "тетра́ди", "féminin en -ь → -и"]` et `["слова́рь", "словаря́", "masculin en -ь → -я"]` — Pourquoi : le tableau est présenté comme la référence (« Voir le tableau ») mais omet deux classes de noms vues dès A1 (le féminin en -ь n’est même pas dans la règle).
- [mineur] rule[0] — Actuel : « Le génitif répond à « de qui ? de quoi ? ». Masculin : consonne → -а, -й / -ь → -я ; féminin : -а → -ы (-и après г, к, х, ж, ш, ч, щ), -я → -и ; neutre : -о → -а, -е → -я. Voir le tableau. » — Proposé : « Le génitif répond à « de qui ? de quoi ? ». Masculin : consonne → -а, -й / -ь → -я ; féminin : -а → -ы (-и après г, к, х, ж, ш, ч, щ), -я et -ь → -и ; neutre : -о → -а, -е → -я. Voir le tableau. » — Pourquoi : le féminin en -ь (тетра́дь → тетра́ди, дверь → две́ри) manque.

## ru-a2-past
Verdict : ok

## ru-a2-motion
Verdict : ok

## ru-a2-dative
Verdict : à corriger
- [important] rule[1] — Actuel : « … au pluriel, Мне нра́вятся э́ти цены́. … » — Proposé : « Нра́виться se construit à l’envers de « aimer » : la personne qui apprécie est au datif, ce qui plaît est le sujet. Мне нра́вится э́тот го́род (« cette ville me plaît ») ; au pluriel, Мне нра́вятся э́ти це́ны. Piège : le verbe s’accorde avec la chose qui plaît, pas avec toi. » — Pourquoi : accent mal placé ; le nominatif pluriel de цена́ est це́ны (цены́ est le génitif singulier).
- [mineur] rule[2] — Actuel : « Âge : мне 20 лет, avec la personne au datif. Rappel : 1 → год, 2 à 4 → го́да, 5 et plus → лет (Ей 23 го́да, Ему́ 31 год). К + datif signifie « chez, vers » : Я иду́ к врачу́. » — Proposé : « Âge : мне 20 лет, avec la personne au datif. Le mot dépend du dernier chiffre : 1 → год, 2 à 4 → го́да, 0 et 5 à 9 → лет, et toujours лет de 11 à 14 (Ей 23 го́да, Ему́ 31 год, Мне 12 лет). К + datif signifie « chez, vers » : Я иду́ к врачу́. » — Pourquoi : « 5 et plus → лет » contredit les exemples (23 го́да, 31 год) que la règle donne aussitôt après ; l’exercice 2 (двадцать четыре года) l’exige aussi.

## ru-a2-instrumental
Verdict : à corriger
- [important] examples[2] — Actuel : « Мы идём в кино́ с не́й. » / « Nous allons au cinéma avec elle. » — Proposé : text « Сего́дня я иду́ с не́й в кино́. », translation « Aujourd’hui, je vais au cinéma avec elle. », note « С не́й : н- après la préposition. » — Pourquoi : « мы … с ней » rejeté en fin de phrase sonne peu naturel, et un natif comprend spontanément « мы с ней » comme « elle et moi », source de confusion ; l’ordre « иду с ней в кино » est l’ordre neutre.
- [mineur] exercises[3].prompt — Actuel : « Она хочет стать ___. » (hint « учитель ») — Proposé : « Мой брат хочет стать ___. » — Pourquoi : pour une femme, un natif dirait d’abord учительницей ; учителем n’est pas faux, mais un apprenant qui écrit учительницей serait refusé. Avec un sujet masculin, la seule réponse attendue est учителем.

## ru-b1-aspect
Verdict : à corriger
- [important] table.rows — Actuel : sans accents — Proposé :
  `["де́лать", "сде́лать", "faire"],`
  `["чита́ть", "прочита́ть", "lire"],`
  `["писа́ть", "написа́ть", "écrire"],`
  `["покупа́ть", "купи́ть", "acheter"],`
  `["реша́ть", "реши́ть", "résoudre, décider"],`
  `["открыва́ть", "откры́ть", "ouvrir"],`
  — Pourquoi : l’accent tonique est requis dans `table` (et présent en B1 dans le cours ukrainien).
- [important] examples[*].text — Actuel : sans accents — Proposé : examples[0] « Весь день я писа́л отчёт. » ; examples[1] « Наконе́ц я написа́л отчёт и отпра́вил его́ нача́льнику. » ; examples[2] « Ра́ньше мы ча́сто обе́дали в э́том кафе́. » ; examples[3] « Вчера́ я купи́л биле́ты на по́езд. » — Pourquoi : accent tonique requis dans `examples`.
- [bloquant] exercises[1] — Actuel : prompt « Наконец-то я ___ этот сложный отчёт! », options « написал, писал, пишу, напишу », answer 0 — Proposé : prompt « Вчера вечером я наконец-то ___ этот сложный отчёт! » (options et answer 0 inchangés) — Pourquoi : sans repère de temps, « Наконец-то я пишу этот отчёт! » (enfin je m’y mets) et « Наконец-то я напишу этот отчёт! » (enfin je vais pouvoir l’écrire) sont corrects ; trois options sont acceptables. Вчера вечером ne laisse que le passé, et l’opposition написал / писал reste le cœur de l’exercice.

## ru-b1-future
Verdict : à corriger
- [important] table — Actuel : caption et rows sans accents — Proposé : caption « Futur de чита́ть (imperfectif) et de прочита́ть (perfectif) » ; rows :
  `["я", "бу́ду чита́ть", "прочита́ю"],`
  `["ты", "бу́дешь чита́ть", "прочита́ешь"],`
  `["он / она́", "бу́дет чита́ть", "прочита́ет"],`
  `["мы", "бу́дем чита́ть", "прочита́ем"],`
  `["вы", "бу́дете чита́ть", "прочита́ете"],`
  `["они́", "бу́дут чита́ть", "прочита́ют"],`
  — Pourquoi : accent tonique requis dans `table`.
- [important] examples[*].text — Actuel : sans accents — Proposé : examples[0] « За́втра я бу́ду рабо́тать до́ма. » ; examples[1] « Я позвоню́ тебе́, когда́ прие́ду в о́фис. » ; examples[2] « Е́сли ты напи́шешь мне, я сра́зу отве́чу. » ; examples[3] « На сле́дующей неде́ле мы бу́дем обсужда́ть но́вый прое́кт. » — Pourquoi : accent tonique requis dans `examples`.

## ru-b1-imperative
Verdict : à corriger
- [important] table.rows — Actuel : sans accents — Proposé :
  `["чита́ть", "чита́й", "чита́йте"],`
  `["говори́ть", "говори́", "говори́те"],`
  `["писа́ть", "пиши́", "пиши́те"],`
  `["откры́ть", "откро́й", "откро́йте"],`
  `["сказа́ть", "скажи́", "скажи́те"],`
  `["отве́тить", "отве́ть", "отве́тьте"],`
  — Pourquoi : accent tonique requis dans `table` ; ici il est d’autant plus utile que la règle de formation (-и / -ь) dépend justement de la place de l’accent.
- [important] examples[*].text — Actuel : sans accents — Proposé : examples[0] « Откро́й, пожа́луйста, окно́: здесь ду́шно. » ; examples[1] « Проходи́те, сади́тесь, чу́вствуйте себя́ как до́ма! » ; examples[2] « Не открыва́й э́ту дверь, там сквозня́к. » (ou la version de la remarque suivante) ; examples[3] « Осторо́жно, не упади́! » — Pourquoi : accent tonique requis dans `examples`.
- [mineur] examples[2] — Actuel : « Не открывай эту дверь, там сквозняк. » / « N’ouvre pas cette porte, il y a un courant d’air. » — Proposé : text « Не открыва́й окно́, бу́дет сквозня́к. », translation « N’ouvre pas la fenêtre, ça va faire un courant d’air. » — Pourquoi : la justification « il y a un courant d’air » (déjà, là-bas) est un peu illogique ; c’est l’ouverture qui en créerait un.
- [mineur] rule[1] et rule[2] — Actuel : « (Проходите, садитесь !) », « (Не открывай окно !) », « Осторожно, не упади ! » — Proposé : rule[1] « Perfectif : un ordre ou une demande pour un résultat, une seule fois (Открой окно, пожалуйста). Imperfectif : une invitation polie ou une action à répéter (Проходите, садитесь!), et presque toujours l’interdiction avec не (Не открывай окно!). » ; rule[2] « Piège : le français a un seul impératif, le russe en a deux. « Ne fais pas ça ! » est presque toujours Не делай этого. Le perfectif négatif existe, mais comme avertissement d’un accident : Осторожно, не упади! (« attention de ne pas tomber »). » — Pourquoi : la typographie russe ne met pas d’espace avant « ! » ; l’espace française ne doit s’appliquer qu’au texte français.

## ru-b1-numbers
Verdict : à corriger
- [important] table.rows — Actuel : sans accents — Proposé :
  `["1, 21, 101", "nominatif singulier", "оди́н стол"],`
  `["2, 3, 4, 22…", "génitif singulier", "два стола́, три кни́ги"],`
  `["2 (féminin)", "génitif singulier", "две неде́ли"],`
  `["5 à 20, 25, 30…", "génitif pluriel", "пять столо́в, де́сять книг"],`
  `["11 à 14", "génitif pluriel", "оди́ннадцать столо́в"],`
  — Pourquoi : accent tonique requis dans `table`.
- [important] examples[*].text — Actuel : sans accents — Proposé : examples[0] « У меня́ два бра́та и три сестры́. » ; examples[1] « В на́шей ко́мнате пять о́кон и оди́н большо́й стол. » ; examples[2] « Мы рабо́таем вме́сте уже́ два́дцать оди́н год. » ; examples[3] « Я купи́л две буты́лки воды́ и де́сять я́блок. » — Pourquoi : accent tonique requis dans `examples`.
- [mineur] rule[1] — Actuel : « Genre : один / одна / одно, mais seulement два / две pour le féminin (две книги, два окна). Génitif pluriel : masculin → -ов (-ев après -й : музеев ; -ей après -ь, ж, ш, ч, щ : словарей) ; féminin et neutre → on retire la terminaison (книга → книг, окно → окон), souvent avec une voyelle fugitive (сестра → сестёр). » — Proposé : « Genre : один / одна / одно ; два a aussi une forme féminine, две (две книги, mais два окна, два стола) ; три et четыре ne changent pas. Génitif pluriel : masculin → -ов (-ев après -й : музеев ; -ей après -ь, ж, ш, ч, щ : словарей) ; féminin et neutre → on retire la terminaison (книга → книг, окно → окон), parfois avec une voyelle mobile (сестра → сестёр) ; féminin en -ь → -ей (тетрадь → тетрадей). » — Pourquoi : « mais seulement два / две » est obscur ; et la règle « on retire la terminaison » ne marche pas pour le féminin en -ь, fréquent.

## ru-b1-relative
Verdict : à corriger
- [important] table — Actuel : caption et rows sans accents — Proposé : caption « Кото́рый selon le cas (neutre : comme le masculin, sauf кото́рое) » ; rows :
  `["Nominatif", "кото́рый", "кото́рая", "кото́рые"],`
  `["Accusatif (inanimé)", "кото́рый", "кото́рую", "кото́рые"],`
  `["Génitif", "кото́рого", "кото́рой", "кото́рых"],`
  `["Datif", "кото́рому", "кото́рой", "кото́рым"],`
  `["Instrumental", "кото́рым", "кото́рой", "кото́рыми"],`
  `["Prépositionnel", "кото́ром", "кото́рой", "кото́рых"],`
  — Pourquoi : accent tonique requis dans `table`.
- [important] examples[*].text — Actuel : sans accents — Proposé : examples[0] « Э́то колле́га, кото́рый рабо́тает со мно́й в одно́м отде́ле. » ; examples[1] « Кни́га, кото́рую я чита́ю, о́чень интере́сная. » ; examples[2] « Мы живём в го́роде, в кото́ром мно́го па́рков. » ; examples[3] « Де́вушка, с кото́рой ты говори́л, — наш но́вый дире́ктор. » — Pourquoi : accent tonique requis dans `examples` (examples[3] intègre aussi la correction suivante).
- [important] examples[3].text — Actuel : « Девушка, с которой ты говорил, наш новый директор. » — Proposé : « Де́вушка, с кото́рой ты говори́л, — наш но́вый дире́ктор. » — Pourquoi : entre un sujet nom et un attribut nom sans verbe, la ponctuation russe exige le tiret ; sans lui, un natif bute sur la phrase.
- [mineur] rule[2] — Actuel : « Piège : le français distingue qui / que / dont / où ; le russe garde un seul mot et change sa terminaison. Une virgule précède toujours который. Pour un masculin animé, l’accusatif est identique au génitif : человек, которого я вижу. » — Proposé : « Piège : le français distingue qui / que / dont / où ; le russe garde un seul mot et change sa terminaison. Une virgule ouvre toujours la relative : devant который, ou devant la préposition qui le précède (город, в котором я живу). Pour un masculin animé, l’accusatif est identique au génitif : человек, которого я вижу. » — Pourquoi : avec une préposition, la virgule se place avant la préposition, pas directement avant который ; la formule actuelle peut induire « в, котором ».

## ru-b1-prefixed-motion
Verdict : à corriger
- [important] table.rows — Actuel : sans accents — Proposé :
  `["при-", "arriver", "прийти́, прие́хать", "приходи́ть, приезжа́ть"],`
  `["у-", "partir", "уйти́, уе́хать", "уходи́ть, уезжа́ть"],`
  `["в-", "entrer", "войти́, въе́хать", "входи́ть, въезжа́ть"],`
  `["вы-", "sortir", "вы́йти, вы́ехать", "выходи́ть, выезжа́ть"],`
  `["пере-", "traverser, déménager", "перейти́, перее́хать", "переходи́ть, переезжа́ть"],`
  `["за-", "passer, faire un détour", "зайти́, зае́хать", "заходи́ть, заезжа́ть"],`
  — Pourquoi : accent tonique requis dans `table` ; le préfixe вы- accentué au perfectif (вы́йти) mais pas à l’imperfectif (выходи́ть) est un vrai point à montrer.
- [important] examples[*].text — Actuel : sans accents — Proposé : examples[0] « Я приду́ в о́фис в де́вять часо́в. » ; examples[1] « Вчера́ А́нна ушла́ с рабо́ты ра́ньше. » ; examples[2] « Когда́ я вошёл в ко́мнату, все замолча́ли. » ; examples[3] « По доро́ге домо́й я зайду́ в магази́н. » — Pourquoi : accent tonique requis dans `examples`.

## Doutes
- Accent tonique en B1 : AUTHORING.md dit « write the stress mark in `table`, `examples` and in the `rule` quotes at A1 and A2 ». Je lis « at A1 and A2 » comme portant sur les seules citations de `rule` (le cours ukrainien accentue tableaux et exemples en B1). Si l’arbitre lit la règle autrement, les 12 remarques « accents » des points B1 tombent ; elles restent recommandées pour l’apprenant.
- ru-a1-possessives : свой n’est pas mentionné. C’est normal à A1, mais le piège (« Он лю́бит свою́ жену́ », pas его́) arrivera vite ; à prévoir dans un point ultérieur ?
- ru-a1-gender : les neutres en -мя (вре́мя, и́мя) ne sont pas signalés, alors que вре́мени apparaît dans ru-a2-genitive. Un apprenant peut les croire féminins ; une phrase dans la règle suffirait.
- ru-b1-numbers : la règle ne précise pas qu’elle vaut au nominatif / accusatif (в двух стола́х) ni que l’adjectif après 2–4 passe au génitif pluriel (два больши́х стола́). Acceptable à B1 selon moi, à trancher.
- ru-b1-numbers exercises[1] : « работают пять сотрудников » est correct, mais « работает пять сотрудников » est au moins aussi courant. Le verbe est donné dans le prompt, donc pas de réponse refusée.
- ru-a2-instrumental examples[0] : колле́га est épicène ; « un collègue » est une traduction fidèle, je n’ai pas jugé utile de la changer.
