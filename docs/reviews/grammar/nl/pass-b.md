# Relecture grammaire — néerlandais — passe B

Fichier : src/lib/grammar/courses/nl.ts · Date : 2026-11-09 · Relecteur : agent relecteur-natif (claude-opus-5-5)

## Synthèse
18 éléments relus · 3 sans remarque · 15 avec remarques (2 bloquantes, 12 importantes, 15 mineures)

Méthode : exercices de chaque point d’abord (unicité de la bonne option, réponses acceptées), puis règle, tableau et exemples. Comparaison de l’app prise en compte : casse, espaces multiples, ponctuation finale et apostrophe ’/' sont déjà absorbées ; la virgule interne ne l’est pas.

## nl-a1-articles
Verdict : à corriger
- [important] exercises[3].source / answers — Actuel : « De man is aardig. » → « Een man is aardig. » — Proposé : source « Daar staat de man. », answers `["Daar staat een man."]` — Pourquoi : « Een man is aardig » est une généralisation bizarre (« un homme est gentil ») qu’aucun natif ne dirait ; la phrase transformée doit rester naturelle.
- [mineur] rule[1] — Actuel : « Quelques repères : les diminutifs en -je sont toujours des het-woorden (het meisje, het huisje). » — Proposé : « Un repère sûr : les diminutifs en -je sont toujours des het-woorden (het meisje, het huisje). » — Pourquoi : un seul repère est donné.

## nl-a1-present
Verdict : à corriger
- [important] exercises[3].prompt — Actuel : « Ik ___ in een kantoor. » — Proposé : « Ik ___ op een kantoor. » — Pourquoi : on travaille « op kantoor / op een kantoor » ; « in een kantoor » est un calque du français, possible mais peu idiomatique.
- [mineur] rule[1] — Actuel : « maken → ik maak (la voyelle double reste ouverte), blijven → ik blijf. » — Proposé : « L’orthographe du radical s’adapte : maken → ik maak (la voyelle longue s’écrit double en fin de syllabe fermée), blijven → ik blijf (v devient f en fin de mot). Zijn et hebben sont irréguliers, à connaître par cœur. » — Pourquoi : « reste ouverte » est confus (la syllabe maak est justement fermée) ; v → f n’est pas expliqué.
- [mineur] table.rows[2] — Actuel : `["u", "werkt", "bent", "hebt"]` — Proposé : `["u", "werkt", "bent", "hebt / heeft"]` — Pourquoi : u heeft est au moins aussi courant que u hebt et entièrement standard ; l’apprenant le rencontrera partout (Heeft u…?).

## nl-a1-word-order
Verdict : à corriger
- [important] table.rows[4] — Actuel : `["Werk", "je", "vandaag in Utrecht?"]` — Proposé : `["—", "Werk", "je vandaag in Utrecht?"]` — Pourquoi : dans un tableau aux colonnes « Position 1 / Verbe / Suite », la ligne actuelle range je sous « Verbe », ce qui contredit la règle ; dans la question oui / non, le verbe est seul en tête.
- [mineur] rule[3] — Actuel : « Les conjonctions en, maar, of, want ne changent pas l’ordre. » — Proposé : « Les conjonctions en (et), maar (mais), of (ou) et want (car) ne changent pas l’ordre. » — Pourquoi : of reviendra en A2 comme « si » avec verbe à la fin ; préciser qu’ici il signifie « ou » évite la confusion.

## nl-a1-negation
Verdict : ok

## nl-a1-plural
Verdict : à corriger
- [mineur] rule[0] — Actuel : « Les noms terminés par -el, -er, -em, -en ou un diminutif en -je prennent -s : tafel → tafels, kamer → kamers, meisje → meisjes. » — Proposé : « La plupart des noms prennent -en au pluriel : boek → boeken. Les noms terminés par -el, -er, -em, -en, par un e muet ou par un diminutif en -je prennent -s : tafel → tafels, kamer → kamers, tante → tantes, meisje → meisjes. » — Pourquoi : les noms en -e muet (tante, ziekte, piste) sont fréquents dès A1 et prennent -s sans apostrophe ; la règle ne les couvre pas.

## nl-a1-pronouns-possessives
Verdict : à corriger
- [mineur] exercises[1].prompt — Actuel : « Wij hebben ___ huis verkocht. » — Proposé : « Wij verkopen ___ huis. » — Pourquoi : le perfectum n’est vu qu’en A2 ; le présent teste la même chose au bon niveau.

## nl-a2-separable
Verdict : à corriger
- [important] table.rows[2] — Actuel : `["aankomen", "Hij komt aan.", "Hij kan aankomen."]` — Proposé : `["aankomen", "Hij komt om negen uur aan.", "Hij moet om negen uur aankomen."]` — Pourquoi : « Hij kan aankomen » seul ne veut rien dire de naturel (et s’entend plutôt « il peut prendre du poids »).
- [mineur] rule[1] — Actuel : « Omdat ik vroeg opsta... » — Proposé : « Omdat ik vroeg opsta… » — Pourquoi : points de suspension typographiques, comme dans le reste du fichier.

## nl-a2-modals
Verdict : à corriger
- [important] rule[1] — Actuel : « Avec jij, kunnen et willen ont deux formes : jij kunt / kan, jij wilt / wil. Après le verbe, seule la forme courte s’emploie : Kun je ... ? Wil je ... ? » — Proposé : « Piège : « pouvoir » se traduit par kunnen pour une capacité ou une possibilité, mais par mogen pour une permission ou une interdiction (Hier mag je niet roken). Avec jij, kunnen et willen ont deux formes : jij kunt / kan, jij wilt / wil. Quand je ou jij suit le verbe, kunt et wilt perdent leur -t : Kun je… ? Wil je… ? (Kan je… ? est aussi correct et très courant). » — Pourquoi : la règle n’explique pas d’où vient kun (absent du tableau) et affirme à tort que seule cette forme s’emploie : Kan je mij helpen ? est standard (Taaladvies) et majoritaire à l’oral.
- [important] rule[0] — Actuel : « …se conjuguent au singulier sans -t pour ik et hij : ik kan, ik wil, ik moet, ik mag. » — Proposé : « Kunnen (pouvoir, être capable de), willen (vouloir), moeten (devoir) et mogen (avoir la permission) sont irréguliers : ik et hij ont la même forme, sans -t ajouté (ik kan, hij kan ; ik mag, hij mag ; le t de moet appartient au radical). L’infinitif de l’autre verbe va à la fin de la phrase, sans te ni préposition : Ik kan zwemmen. » — Pourquoi : citer ik moet comme exemple de forme « sans -t » est trompeur.
- [important] rule[2] — Actuel : « Pour une proposition polie, on utilise souvent kunnen : Kun je mij helpen ? » — Proposé : « Pour une demande polie, on utilise souvent kunnen : Kun je mij helpen ? Zullen sert à proposer (Zullen we gaan ? = On y va ?) et à promettre (Ik zal je helpen ; ik / hij zal, jij zult / zal, wij zullen). » — Pourquoi : le programme (curricula/nl.ts) inclut zullen dans ce point, absent du contenu ; c’est un modal de base en A2. « Kun je mij helpen » est une demande, pas une proposition. (Si l’arbitre préfère retirer zullen du programme, garder seulement le remplacement « demande ».)

## nl-a2-perfectum
Verdict : à corriger
- [important] rule[2] — Actuel : « Zijn s’emploie avec les verbes de déplacement ou de changement d’état : gaan, komen, blijven, worden, ainsi que zijn lui-même. » — Proposé : « Zijn s’emploie avec les verbes de changement de lieu ou d’état : gaan, komen, vertrekken, worden, ainsi qu’avec blijven et zijn lui-même. Les verbes de mouvement comme fietsen, lopen ou zwemmen prennent zijn avec une destination (Ik ben naar huis gefietst) et hebben sans destination (Ik heb gefietst). Piège : « j’ai été » se dit ik ben geweest (zijn), pas « ik heb geweest ». » — Pourquoi : « verbes de déplacement » pousse à dire *ik ben gefietst / gewandeld*, faute fréquente ; blijven n’est ni un déplacement ni un changement d’état.
- [important] rule[1] — Actuel : « On met -t si le radical finit par t, k, f, s, ch ou p (’t kofschip) : gewerkt, gemaakt ; sinon -d : gespeeld, gewoond. » — Proposé : « On met -t si le radical finit par t, k, f, s, ch ou p (’t kofschip) : gewerkt, gemaakt ; sinon -d : gespeeld, gewoond. Regarde l’infinitif : si le radical finit par f ou s parce que l’infinitif a v ou z, on met -d (leven → geleefd, reizen → gereisd). » — Pourquoi : exception majeure de ’t kofschip, piège classique dès A2, passée sous silence.

## nl-a2-imperfectum
Verdict : à corriger
- [mineur] rule[0] — Actuel : « (même règle ’t kofschip que pour le participe) » — Proposé : « (même règle ’t kofschip que pour le participe, avec la même exception : leven → leefde, reizen → reisde) » — Pourquoi : même piège v / z que pour le participe.
- [mineur] table.caption — Actuel : « Imperfectum fréquents » — Proposé : « Formes d’imperfectum fréquentes » — Pourquoi : accord français incorrect.

## nl-a2-adjective-e
Verdict : à corriger
- [important] rule[0] — Actuel : « Il ne prend pas -e dans un seul cas : avec een (ou sans article) devant un het-woord singulier : een groot huis. » — Proposé : « Devant un nom, l’adjectif prend presque toujours -e : de grote tafel, het grote huis, grote huizen. Il ne prend pas -e devant un het-woord singulier sans article défini, démonstratif ni possessif : après een, geen, elk, ieder, zo'n, ou sans article : een groot huis, geen groot huis, koud water. » — Pourquoi : « un seul cas : een » fait écrire *geen grote huis* ; geen et elk relèvent du même cas et sont de niveau A2.

## nl-a2-subordinate
Verdict : ok

## nl-b1-er
Verdict : à corriger
- [mineur] rule[0] — Actuel : « Avec une préposition : erover, ervan, ermee (= en parle, de cela, avec cela). » — Proposé : « Avec une préposition : erover, ervan, ermee (= à ce sujet, de cela, avec cela). » — Pourquoi : « en parle » n’est pas une glose de erover.
- [mineur] rule[1] — Actuel : « Er se place après le verbe conjugué, avant le reste de la phrase. » — Proposé : « Er se place juste après le verbe conjugué, ou après le sujet ou le pronom qui suit ce verbe (Heb jij er twee ?). Avec une préposition, er et la préposition se séparent souvent : Ik heb er niets over gehoord. » — Pourquoi : la règle actuelle est fausse après inversion, et la séparation er… over, très fréquente en B1, n’est pas signalée.

## nl-b1-om-te
Verdict : à corriger
- [important] exercises[3].hint — Actuel : « om » — Proposé : « mot qui introduit … te » — Pourquoi : l’indice donne la réponse exacte ; l’exercice ne teste plus rien.

## nl-b1-relative
Verdict : à corriger
- [mineur] exercises[3].prompt — Actuel : « De kinderen ___ buiten spelen, zijn mijn buren. » — Proposé : « De kinderen ___ buiten spelen, zijn van de buren. » — Pourquoi : des enfants qui « sont mes voisins » sonne étrange ; « ce sont les enfants des voisins » est l’idée naturelle.
- [mineur] examples[2].note — Actuel : « Waarmee = met + de pen. » — Proposé : « Waarmee = met + de pen (met devient mee après waar). » — Pourquoi : le changement met → mee n’est dit nulle part.

## nl-b1-comparison
Verdict : ok

## nl-b1-passive
Verdict : à corriger
- [mineur] rule[1] — Actuel : « Piège : au présent, de brief is geschreven décrit un résultat, pas une action en cours ; pour l’action, on dit wordt. » — Proposé : « Au perfectum, on emploie zijn (sans worden ni geworden) avec le participe : De brief is geschreven (la lettre a été écrite). Piège : de brief is geschreven exprime une action terminée ou un résultat, jamais une action en cours ; pour l’action en cours, on dit wordt. » — Pourquoi : « au présent » contredit la phrase précédente qui présente is geschreven comme un perfectum.

## nl-b1-conditional
Verdict : à corriger
- [bloquant] rule[2] — Actuel : « Piège : n’emploie jamais zou dans la subordonnée en als. Dis als ik rijk was, jamais « als ik zou zijn ». » — Proposé : « Piège : dans la subordonnée en als, préfère l’imperfectum : als ik rijk was. Als ik rijk zou zijn est aussi correct en néerlandais (contrairement au français « si je serais »), mais plus lourd. Pour un conseil, on utilise zou + moeten : Je zou naar de dokter moeten gaan. » — Pourquoi : règle fausse ; als + zou est du néerlandais standard (Taaladvies, ANS), très courant (als je zou willen…). On transpose à tort la règle française.
- [bloquant] exercises[0].options — Actuel : `["zou zijn", "ben", "was"]` (answer 2) — Proposé : `["is", "ben", "was"]` (answer 2), explanation « Dans la subordonnée en als, on emploie l’imperfectum : als ik rijk was. Is ne va pas avec ik, et ben (présent) ne convient pas à une hypothèse irréelle. » — Pourquoi : « Als ik rijk zou zijn, zou ik… » est correct ; l’exercice a deux bonnes réponses.
- [important] exercises[3].answers — Actuel : `["had"]` — Proposé : `["had", "zou hebben"]` — Pourquoi : « Als ik tijd zou hebben, zou ik meer lezen » est correct ; le refuser serait sanctionner une bonne réponse.

## Doutes
- Espace avant « ? » dans les citations néerlandaises insérées dans les règles (« Werk jij ? », « Sta je vroeg op ? », « Kun je mij helpen ? », « Zou u het raam willen openen ? ») : correct en typographie française, mais une phrase néerlandaise ne prend pas d’espace. Je ne l’ai pas signalé point par point ; à trancher globalement selon la convention de l’app.
- nl-b1-er, exercises[3] : « daarvan » est aussi naturel que « ervan » dans « Wat vind je … ? » ; l’indice « er + van » oriente vers ervan, donc je ne l’ai pas exigé. On peut l’ajouter aux réponses par générosité.
- nl-b1-om-te, exercises[3] : « Ik heb geen tijd te koken » (sans om) se rencontre à l’écrit soutenu ; la réponse unique « om » me paraît acceptable puisque le trou est obligatoire.
- nl-a2-modals : l’ajout de zullen dépend de la décision de garder zullen dans le programme ; le titre devrait alors le mentionner (« … mogen, zullen », ≤ 80 caractères).
- nl-b1-passive, exercises[2] : « Gisteren is de auto gestolen » serait la forme la plus naturelle à l’oral, mais elle n’est pas proposée, donc l’option unique werd reste juste.
- nl-a2-perfectum, examples[3] : « J’ai été en Espagne » est familier en français (« Je suis allé en Espagne » est plus courant) ; laissé tel quel car il sert le piège ik ben geweest.
