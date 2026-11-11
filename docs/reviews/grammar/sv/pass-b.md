# Relecture grammaire — suédois — passe B

Fichier : src/lib/grammar/courses/sv.ts · Date : 2026-11-09 · Relecteur : agent relecteur-natif (claude-opus-5-5)

## Synthèse
18 éléments relus · 5 sans remarque · 13 avec remarques (5 bloquantes, 6 importantes, 7 mineures)

Méthode : pour chaque point, exercices d’abord (unicité de la bonne option, réponses acceptées, sachant que la comparaison ignore la casse, les espaces en trop et la ponctuation finale, mais pas les virgules internes ni les diacritiques), puis règle, tableau et exemples.

## sv-a1-en-ett
Verdict : à corriger
- [mineur] rule[0] — Actuel : « Le suédois a deux genres : le genre commun (en) et le neutre (ett). Il n’y a ni masculin ni féminin : en man (un homme) et en flicka (une fille) prennent le même article. Environ les trois quarts des noms sont en ; les noms en ett s’apprennent un par un : ett hus, ett barn, ett äpple. » — Proposé : « Le suédois a deux genres : le genre commun (en) et le neutre (ett). Il n’y a ni masculin ni féminin : en man (un homme) et en flicka (une fille) prennent le même article. Environ les trois quarts des noms sont en ; les noms en ett s’apprennent un par un : ett hus, ett barn, ett äpple. On parle de en-ord et de ett-ord. » — Pourquoi : les explications des exercices (exercises[2], exercises[3]) et les points suivants emploient « en-ord » / « ett-ord » sans que le terme ait été introduit.
- [mineur] rule[1] — Actuel : « L’article défini ne se place pas devant le nom : il se colle à la fin. En bil devient bilen, ett hus devient huset. Si le nom finit par une voyelle, on ajoute seulement -n ou -t : en flicka devient flickan, ett äpple devient äpplet. » — Proposé : « L’article défini ne se place pas devant le nom : il se colle à la fin. En bil devient bilen, ett hus devient huset. Si le nom finit par une voyelle, on ajoute seulement -n ou -t : en flicka devient flickan, ett äpple devient äpplet. Les noms en -el et -er ajoutent aussi -n ou -t, parfois en perdant leur e : en nyckel devient nyckeln, ett fönster devient fönstret. » — Pourquoi : nyckel, fönster, fågel, vinter sont du vocabulaire A1 ; sans ce repère l’apprenant produit *nyckelen, *fönsteret.

## sv-a1-present
Verdict : à corriger
- [bloquant] exercises[1].options — Actuel : « ["har", "vara", "är"] » — Proposé : « ["ha", "vara", "är"] » (answer reste 2) — Pourquoi : « Vi har studenter » (nous avons des étudiants) est une phrase correcte et naturelle (un professeur, une école) : l’exercice a deux bonnes réponses. L’infinitif « ha » est un distracteur vraiment faux.
- [important] rule[1] — Actuel : « Le verbe se cite à l’infinitif, qui finit presque toujours par -a (arbeta, läsa). Au présent, on ajoute -r à cet -a pour les verbes du premier groupe (arbeta → arbetar, tala → talar), ou on remplace -a par -er pour beaucoup d’autres (läsa → läser, åka → åker, skriva → skriver). Les verbes courts en voyelle prennent -r : bo → bor, gå → går. » — Proposé : « Le verbe se cite à l’infinitif, qui finit presque toujours par -a (arbeta, läsa). Au présent, on ajoute -r à cet -a pour les verbes du premier groupe (arbeta → arbetar, tala → talar), ou on remplace -a par -er pour beaucoup d’autres (läsa → läser, åka → åker, skriva → skriver). Si le radical finit déjà par -r, on n’ajoute rien : göra → gör, köra → kör. Les verbes courts en voyelle prennent -r : bo → bor, gå → går. » — Pourquoi : le point suivant (sv-a1-word-order, exercises[3]) demande le présent de göra ; en appliquant la règle actuelle, l’apprenant écrit *görer.

## sv-a1-word-order
Verdict : à corriger
- [mineur] rule[0] et table.rows[1] — Actuel : « Idag » (rule[0] : « Jag arbetar idag », « Idag arbetar jag », « Idag jag arbetar » ; table : « Idag ») — Proposé : « I dag » / « i dag » (rule[0] : « … : Jag arbetar i dag. Si tu commences par autre chose (un complément de temps ou de lieu), le sujet passe après le verbe : I dag arbetar jag. Piège : en français on garde « Aujourd’hui, je travaille » ; en suédois, I dag jag arbetar est faux. » ; table.rows[1] : « ["I dag", "bor", "jag i Lund."] ») — Pourquoi : le même point écrit « I morgon » en deux mots ; Språkrådet recommande i dag, i går, i morgon (idag est admis mais il faut être cohérent). Même remarque pour sv-a1-negation (rule[0], examples[1] : « Idag ») et sv-a2-preterite (rule[0], examples[0], exercises[0].prompt, exercises[3].prompt : « Igår », « igår »).

## sv-a1-negation
Verdict : ok

## sv-a1-plural
Verdict : ok

## sv-a1-pronouns
Verdict : à corriger
- [bloquant] exercises[2] — Actuel : prompt « Det är ___ hus. », options « ["våra", "vår", "vårt"] », answer 2 — Proposé : prompt « ___ hus är stort. », options « ["Våra", "Vår", "Vårt"] », answer 2, explanation « Hus est un ett-ord au singulier (stort) : vårt hus. » — Pourquoi : hus est identique au singulier et au pluriel, donc « Det är våra hus » (ce sont nos maisons) est correct : deux bonnes réponses. L’adjectif singulier stort lève l’ambiguïté.
- [important] rule[2] — Actuel : « Piège : le français distingue « son » pour un possesseur ou un autre ; le suédois dit clairement hans bil (la voiture de lui) ou hennes bil (la voiture d’elle). Den remplace un nom en-ord (bilen → den), det un ett-ord (huset → det). » — Proposé : « Piège : en français, « sa voiture » ne dit pas si le possesseur est un homme ou une femme ; le suédois le précise : hans bil (la voiture de lui) ou hennes bil (la voiture d’elle). Den remplace un nom en-ord (bilen → den), det un ett-ord (huset → det). » — Pourquoi : la phrase actuelle affirme que le français « distingue », ce qui est l’inverse de la réalité et rend le piège incompréhensible.

## sv-a2-adjectives
Verdict : à corriger
- [mineur] rule[2] — Actuel : « Quelques particularités : ny → nytt, god → gott, röd → rött, svensk → svenskt. Liten (petit) fait litet, puis små au pluriel et lilla au défini singulier : en liten bil, ett litet hus, små hus, den lilla bilen. » — Proposé : « Quelques particularités : ny → nytt, god → gott, röd → rött ; un adjectif déjà terminé par -t ne change pas : ett trött barn. Gammal fait gamla au pluriel et au défini. Liten (petit) fait litet, puis små au pluriel et lilla au défini singulier : en liten bil, ett litet hus, små hus, den lilla bilen. » — Pourquoi : svensk → svenskt est régulier, ce n’est pas une particularité ; en revanche trött (exercises[2]) et gamla (examples[2]) sont employés sans être expliqués.

## sv-a2-preterite
Verdict : à corriger
- [mineur] rule[0] — Actuel : « … Il ne change pas selon la personne et remplace à la fois l’imparfait, le passé simple et le passé composé du français : jag bodde = j’habitais / j’ai habité. » — Proposé : « Le prétérit sert pour un fait passé et terminé, souvent daté : Igår köpte jag en bok. Il ne change pas selon la personne et correspond à l’imparfait, au passé simple et, quand le moment est passé et précis, au passé composé du français : jag bodde = j’habitais / j’ai habité. » — Pourquoi : dit tel quel, « remplace le passé composé » contredit le point suivant, où « as-tu mangé ? » se dit Har du ätit? (parfait). (Si la remarque sur i går est retenue, écrire « I går köpte jag en bok ».)

## sv-a2-perfect
Verdict : à corriger
- [mineur] examples[0].note — Actuel : « Har + supin ätit ; pas de pronom devant har dans la question. » — Proposé : « Question : har ouvre la phrase, puis le sujet du, puis le supin ätit. » — Pourquoi : « pas de pronom devant har » est obscur (le pronom du est bien là, après har).

## sv-a2-modals
Verdict : à corriger
- [important] rule[2] — Actuel : « Avec une négation, inte suit le modal : Jag kan inte komma. Pour dire « vouloir quelque chose », on emploie vill ha : Vill du ha kaffe? » — Proposé : « Avec une négation, inte suit le modal : Jag kan inte komma. Piège : « tu ne dois pas fumer ici » se dit Du får inte röka här ; du måste inte (ou du behöver inte) veut dire « tu n’es pas obligé ». Pour dire « vouloir quelque chose », on emploie vill ha : Vill du ha kaffe? » — Pourquoi : c’est le vrai piège du francophone avec måste (= devoir) : traduire « ne pas devoir » par måste inte change le sens (interdiction → absence d’obligation).

## sv-a2-future
Verdict : ok

## sv-a2-reflexive
Verdict : à corriger
- [bloquant] exercises[1] — Actuel : prompt « Per har ___ hus. », options « ["sin", "sina", "sitt"] », answer 2, explanation « Hus est un ett-ord : sitt hus. » — Proposé : prompt « Per äter ___ äpple. », options « ["sin", "sina", "sitt"] », answer 2, explanation « Äpple est un ett-ord au singulier : sitt äpple. » — Pourquoi : hus a le même pluriel que le singulier, donc « Per har sina hus » (Per a ses maisons) est correct : deux bonnes réponses. Avec äpple (pluriel äpplen), sina est vraiment faux.
- [bloquant] exercises[2].prompt — Actuel : « Hon tvättar ___. » — Proposé : « Hon tvättar ___. (elle se lave) » — Pourquoi : « Hon tvättar henne » (elle lave une autre femme, une patiente par exemple) est correct ; sans précision, deux options sont justes. exercises[0] a déjà ce type de précision (« sa propre valise »).

## sv-b1-subordinate
Verdict : ok

## sv-b1-particle-verbs
Verdict : à corriger
- [important] rule[0] — Actuel : « Beaucoup de verbes suédois se combinent avec une particule (upp, ut, in, av, på…) qui en change le sens : ringa (sonner) → ringa upp (appeler), ge (donner) → ge upp (abandonner), stänga (fermer) → stänga av (éteindre), slå (frapper) → slå på (allumer). » — Proposé : « Beaucoup de verbes suédois se combinent avec une particule (upp, ut, in, av, på…) qui en change le sens : ge (donner) → ge upp (abandonner), stänga (fermer) → stänga av (éteindre), slå (frapper) → slå på (allumer), komma (venir) → komma in (entrer). Ringa upp (appeler quelqu’un) reste proche de ringa seul, qui veut déjà dire « téléphoner » : Jag ringer dig. » — Pourquoi : présenter ringa comme « sonner » et ringa upp comme « appeler » est trompeur : ringa seul est le verbe courant pour « appeler au téléphone » (A1), et l’apprenant croirait que « Jag ringer dig » est faux.

## sv-b1-passive
Verdict : à corriger
- [bloquant] exercises[2].options — Actuel : « ["på", "till", "av"] » — Proposé : « ["på", "vid", "av"] » (answer reste 2) — Pourquoi : « Brevet skrevs till Anna » (la lettre a été écrite à Anna) est une phrase correcte : deux bonnes réponses.
- [important] rule[2] — Actuel : « Piège : le français utilise souvent « on » + actif ou « être » + participe. En suédois, le passif en -s remplace les deux : « La porte est fermée à neuf heures » = Dörren stängs klockan nio. Après av, on met l’agent : Boken skrevs av en lärare. » — Proposé : « Piège : le français utilise souvent « on » + actif ou « être » + participe. Le passif en -s décrit une action : « On ferme la porte à neuf heures » = Dörren stängs klockan nio. Pour un état, le suédois emploie vara + participe : « La porte est fermée (en ce moment) » = Dörren är stängd. Après av, on met l’agent : Boken skrevs av en lärare. » — Pourquoi : dire que le passif en -s « remplace » toujours « être + participe » pousse à écrire *Dörren stängs pour un état ; la distinction action / état (stängs / är stängd) est le vrai piège.

## sv-b1-relative
Verdict : ok

## sv-b1-comparison
Verdict : à corriger
- [mineur] exercises[4] — Actuel : instruction « Dis que la voiture est plus grande que la maison. », source « Bilen är lika stor som huset. », answers « ["Bilen är större än huset."] » — Proposé : instruction « Dis que mon sac est plus grand que le tien. », source « Min väska är lika stor som din. », answers « ["Min väska är större än din."] », explanation « Lika stor som devient större än : comparatif + än. » — Pourquoi : une voiture aussi grande ou plus grande qu’une maison est une phrase absurde ; la grammaire est juste mais le contexte n’est pas de la vie courante.

## sv-b1-pluperfect-conditional
Verdict : à corriger
- [important] rule[2] — Actuel : « Hypothèse présente : om + prétérit, puis skulle + infinitif : Om jag hade tid, skulle jag komma. Hypothèse passée : om + hade + supin, puis hade + supin : Om jag hade haft tid, hade jag kommit. Piège : après om, jamais skulle, comme après « si » en français. » — Proposé : « Hypothèse présente : om + prétérit, puis skulle + infinitif : Om jag hade tid, skulle jag komma. Hypothèse passée : om + hade + supin, puis hade + supin : Om jag hade haft tid, hade jag kommit. Piège : comme après « si » en français, on ne met pas le conditionnel après om : om jag hade tid, et non om jag skulle ha tid. Om … skulle existe seulement au sens de « si jamais » : Om det skulle regna, stannar vi hemma. » — Pourquoi : « après om, jamais skulle » est faux : « Om det skulle regna… » est très courant ; l’apprenant le rencontrera vite et la règle perdra sa crédibilité.

## Doutes
- i dag / idag, i går / igår : Språkrådet recommande la graphie en deux mots, la forme soudée est admise. Le choix doit surtout être cohérent dans tout le cours ; aucune réponse attendue n’est concernée.
- sv-a2-future exercises[3] : à l’oral et de plus en plus à l’écrit, « Vi kommer resa » (sans att) est courant et toléré par Språkrådet. Je ne l’ajoute pas aux réponses, puisque la règle enseigne la forme normée kommer att ; à l’arbitre de décider s’il faut l’accepter.
- sv-b1-subordinate exercises[0] : après veta / säga, l’ordre de principale dans la proposition att (« att hon bor inte här ») s’entend à l’oral et est décrit par les grammaires ; la forme enseignée (inte bor) reste la seule correcte à l’écrit normé, je laisse donc l’exercice tel quel.
- sv-b1-passive exercises[0] : « Dörren stänger klockan nio » (actif intransitif, comme « Butiken stänger klockan nio ») s’entend parfois dans les annonces (« dörrarna stänger kl. 19 »). Il pourrait être prudent d’écrire « Dörren ___ klockan nio. (au passif) ».
- sv-a1-negation : le point ne dit pas que ingen ne s’emploie pas après un modal ou au parfait (*Jag har sett ingen → Jag har inte sett någon). C’est un piège réel mais peut-être trop tôt pour A1 ; à envisager dans un point ultérieur.
- sv-b1-particle-verbs exercises[0] : « släcka lampan » est plus idiomatique que « stänga av lampan », mais ce dernier est correct et courant ; pas de correction nécessaire.
- sv-a1-pronouns : le pronom neutre hen (officiel depuis 2015) n’est pas mentionné ; c’est un choix éditorial, pas une erreur.
