# Relecture grammaire — allemand — passe A

Fichier : src/lib/grammar/courses/de.ts · Date : 2026-11-09 · Relecteur : agent relecteur-natif (claude-opus-5-5)

## Synthèse
18 éléments relus · 4 sans remarque · 14 avec remarques (3 bloquantes, 16 importantes, 7 mineures)

## de-a1-gender-articles
Verdict : à corriger
- [important] exercises[4].source et exercises[4].answers — Actuel : « Der Mann ist nett. » → « Ein Mann ist nett. » — Proposé : source « Das ist der Mann. », answers `["Das ist ein Mann."]`, explanation « Mann est masculin : der devient ein. » — Pourquoi : « Ein Mann ist nett. » est grammatical mais un natif ne le dirait pas seul (affirmation sur « un homme » quelconque) ; avec « Das ist … » les deux versions sont naturelles.

## de-a1-present
Verdict : à corriger
- [important] rule[1] — Actuel : « Si le radical finit par -t ou -d, on intercale un e : du arbeitest, er arbeitet, ihr arbeitet. Sein et haben sont irréguliers et à connaître par cœur. » — Proposé : « Si le radical finit par -t ou -d, on intercale un e : du arbeitest, er arbeitet, ihr arbeitet. S’il finit par -s, -ß ou -z, du prend seulement -t : du heißt, du tanzt. Certains verbes changent de voyelle avec du et er / sie / es (fahren → du fährst, er fährt ; sprechen → du sprichst) : apprends-les avec le verbe. Sein et haben sont irréguliers et à connaître par cœur. » — Pourquoi : « Wie heißt du? » et les verbes à alternance (fahren, sprechen, essen, sehen) sont du vocabulaire A1 de base ; la règle présentée comme générale produit « du heißst » ou « du fahrst ».

## de-a1-word-order
Verdict : à corriger
- [important] table.rows — Actuel : la dernière ligne « Arbeitest | du | heute in Köln? » place du dans la colonne « Position 2 (verbe) », sous le titre « Le verbe reste en deuxième position ». — Proposé : supprimer cette ligne ; rows : `[["Ich", "arbeite", "heute in Köln."], ["Heute", "arbeite", "ich in Köln."], ["In Köln", "arbeite", "ich heute."], ["Wo", "arbeitest", "du heute?"]]` — Pourquoi : dans la question oui / non le verbe est en position 1 ; la ligne contredit le titre du tableau et range le sujet sous « verbe ». La règle et l’exemple Hast du Zeit? couvrent déjà ce cas.
- [mineur] exercises[2].explanation — Actuel : « … et il s’accorde avec du : Hast du Hunger ? » — Proposé : « Question oui / non : le verbe vient en premier, et il s’accorde avec du : Hast du Hunger? » — Pourquoi : la phrase citée est allemande ; pas d’espace avant le point d’interrogation en allemand.

## de-a1-accusative
Verdict : ok

## de-a1-negation
Verdict : à corriger
- [important] rule[2] — Actuel : « Place de nicht : à la fin de la phrase quand il nie le verbe (Er kommt heute nicht), et juste devant l’adjectif ou le complément qu’il nie (nicht gut, nicht in Berlin). » — Proposé : « Place de nicht : quand il nie toute la phrase, il va à la fin (Er kommt heute nicht), mais avant la 2e partie du verbe (Ich kann heute nicht kommen, Ich stehe nicht auf) et avant un complément de lieu ou de direction (Ich fahre nicht nach Berlin). Quand il nie un seul élément, il se place juste devant (nicht gut, nicht heute). » — Pourquoi : « toujours à la fin » est faux dès qu’il y a une particule, un modal ou un complément de direction (« Ich fahre nach Berlin nicht » n’est pas la négation neutre) ; ces cas arrivent dès l’A2 du parcours.
- [important] exercises[3].hint — Actuel : (pas d’indice) « Er kommt heute ___. » — Proposé : hint « nicht ou kein ? » — Pourquoi : sans indice, auch, später, spät ou an complètent la phrase correctement et seraient refusés.

## de-a1-plural
Verdict : à corriger
- [important] rule[2] — Actuel : « … le dictionnaire écrit Tag, -e ou Haus, -er. » — Proposé : « Repère : les noms féminins prennent surtout -(e)n ; les mots d’origine étrangère récents prennent souvent -s. Apprends le pluriel en même temps que le nom : le dictionnaire écrit der Tag, -e ou das Haus, ¨-er (le ¨ signale le tréma). » — Pourquoi : « Haus, -er » donnerait « Hauser » ; c’est justement le tréma que l’apprenant doit retenir, et les manuels le notent ¨-er.
- [mineur] table.rows[2] — Actuel : `["-(e)n", "die Frau", "die Frauen"]` — Proposé : `["-en", "die Frau", "die Frauen"]` — Pourquoi : la ligne suivante est déjà « -n » (Lampe) ; étiqueter Frau « -en » rend l’opposition claire.

## de-a2-separable
Verdict : à corriger
- [important] rule[1] — Actuel : « À l’infinitif (après un verbe de modalité par exemple) et dans une subordonnée, le verbe reste d’un bloc : Ich muss früh aufstehen. Wann stehst du auf ? Le français n’a pas ce mécanisme : le piège est d’oublier la particule à la fin. » — Proposé : « À l’infinitif (après un verbe de modalité par exemple) et dans une subordonnée, le verbe reste d’un bloc : Ich muss früh aufstehen ; …, weil ich früh aufstehe. Dans une question, la particule va aussi à la fin : Wann stehst du auf? Le français n’a pas ce mécanisme : le piège est d’oublier la particule à la fin. » — Pourquoi : « Wann stehst du auf? » est cité juste après « dans une subordonnée, le verbe reste d’un bloc » alors que c’est une principale où la particule est séparée ; l’exemple contredit la phrase qu’il semble illustrer.
- [important] exercises[4].instruction — Actuel : « Mets Morgen au début de la phrase. » — Proposé : « Ajoute Morgen au début de la phrase. » — Pourquoi : la phrase source ne contient pas morgen ; « mets » laisse croire qu’il faut déplacer un mot existant.

## de-a2-modals
Verdict : à corriger
- [important] rule[0] — Actuel : « Aux formes ich et er / sie / es, il n’a pas de terminaison : ich kann, er kann. » — Proposé : « Le verbe de modalité est conjugué en 2e position, l’autre verbe reste à l’infinitif, sans zu, en fin de phrase : Ich kann gut schwimmen. Aux formes ich et er / sie / es, la forme est la même, sans -t : ich kann, er kann ; ich möchte, er möchte. » — Pourquoi : möchten, dans le tableau, a bien un -e (möchte) ; la règle telle quelle est fausse pour un des quatre verbes présentés.

## de-a2-dative
Verdict : ok

## de-a2-perfekt
Verdict : à corriger
- [bloquant] exercises[1].options — Actuel : `["haben", "sind", "waren"]` — Proposé : `["haben", "sind", "seid"]` (answer : 1) — Pourquoi : « Wir waren nach Hamburg gefahren » est un plus-que-parfait correct ; l’exercice a deux bonnes réponses.
- [important] rule[1] — Actuel : « …, ge- + radical + -en pour les forts (gesehen, gegangen). … » — Proposé : « Participe : ge- + radical + -t pour les verbes réguliers (gemacht), ge- + radical + -en pour les forts, souvent avec un changement de voyelle (gesehen, mais gehen → gegangen, trinken → getrunken) : apprends-les par cœur. Avec particule séparable, ge- s’intercale : aufgestanden. Pas de ge- pour les verbes en -ieren ni pour be-, ver-, er- : telefoniert, bestellt, verstanden. » — Pourquoi : gegangen est cité comme « ge- + radical + -en » alors que le radical change (et une consonne aussi) ; l’apprenant produirait « gegehen », « getrinken ».
- [mineur] examples[1].translation — Actuel : « Nous sommes allés à Vienne en voiture. » — Proposé : « Nous sommes allés à Vienne. » — Pourquoi : fahren indique un véhicule, pas forcément la voiture (train, bus) ; « en voiture » surtraduit.

## de-a2-two-way
Verdict : à corriger
- [important] exercises[4].instruction — Actuel : « Dis où tu vas au lieu de dire où tu es. » — Proposé : « Dis où tu vas (verbe gehen) au lieu de dire où tu es. » — Pourquoi : « Ich laufe in den Garten » ou « Ich komme in den Garten » sont corrects et refusés ; imposer gehen ferme l’exercice sur la seule réponse listée.
- [mineur] exercises[2].explanation — Actuel : « La chatte est déjà sur le canapé : … » — Proposé : « Le chat est déjà sur le canapé : position, datif. Sofa est neutre, donc dem Sofa. » — Pourquoi : die Katze désigne le chat en général ; « la chatte » est une traduction maladroite (et ambiguë en français familier).

## de-a2-subordinate
Verdict : ok

## de-b1-adjective-endings
Verdict : ok

## de-b1-praeteritum
Verdict : à corriger
- [important] rule[1] — Actuel : « Verbes faibles (réguliers) : radical + -te : machen → ich machte, wohnen → ich wohnte (arbeiten → arbeitete). Verbes forts : … » — Proposé : « Verbes faibles (réguliers) : radical + -te : machen → ich machte, wohnen → ich wohnte (arbeiten → arbeitete). Les modaux font de même mais perdent leur tréma : können → ich konnte, müssen → ich musste (ne confonds pas avec könnte, « pourrait »). Verbes forts : la voyelle du radical change et il n’y a pas de -te : gehen → ging, kommen → kam, sehen → sah, fahren → fuhr. À apprendre dans la liste des verbes forts. » — Pourquoi : le résumé promet les modaux, mais la règle n’explique pas leur formation ; la perte du tréma (konnte / könnte) est le piège principal.
- [mineur] exercises[3].prompt — Actuel : « Als Kind ___ ich in Lyon. » — Proposé : « Früher ___ ich in einer kleinen Stadt. » (hint wohnen, answers `["wohnte"]`) — Pourquoi : la phrase est identique à l’exemple et à la règle ; l’exercice se résout par simple copie.

## de-b1-konjunktiv-ii
Verdict : à corriger
- [important] rule[2] — Actuel : « Piège : évite würde avec sein et haben (on dit Wenn ich reich wäre, pas « würde sein ») et n’emploie pas würde dans la proposition en wenn. Könnten Sie… ? et Würden Sie… ? sont plus polis que Können Sie… ?. » — Proposé : « Piège : évite würde avec sein et haben (on dit Wenn ich reich wäre, pas « würde sein »). Dans la proposition en wenn, préfère la forme simple quand elle existe (wenn ich Zeit hätte) ; avec les autres verbes, würde y est tout à fait correct : Wenn du mitkommen würdest, wäre ich froh. Könnten Sie… ? et Würden Sie… ? sont plus polis que Können Sie… ? » — Pourquoi : l’interdiction absolue de würde après wenn est fausse en allemand standard moderne (Duden l’admet, c’est l’usage courant avec les verbes pleins). Supprimer aussi le point final redondant après « ? ».
- [mineur] exercises[2].explanation — Actuel : « Wurde est le prétérit de werden (passif). » — Proposé : « Conseil : würde + infinitif. Werde est le présent et wurde le prétérit de werden ; seul würde exprime le conditionnel. » — Pourquoi : wurde n’est pas propre au passif (« er wurde müde ») ; l’explication ne dit rien non plus de werde.

## de-b1-relative
Verdict : à corriger
- [important] exercises[2].prompt — Actuel : « Das ist der Kollege, mit ___ ich oft Mittag esse. » — Proposé : « Das ist der Kollege, mit ___ ich oft zu Mittag esse. » — Pourquoi : la forme standard est « zu Mittag essen » ; « Mittag essen » est familier ou régional.

## de-b1-passive
Verdict : à corriger
- [bloquant] exercises[0].options — Actuel : `["hat", "wird", "wurde"]` — Proposé : `["hat", "wird", "werden"]` (answer : 1) — Pourquoi : « Das Essen wurde jeden Tag von meiner Mutter gekocht » (habitude passée) est parfaitement correct ; rien dans la phrase n’impose le présent : deux bonnes réponses.
- [bloquant] exercises[3].answers — Actuel : `["wird"]` — Proposé : `["wird", "wurde"]`, explanation « Passif : werden à la 3e personne du singulier, wird (présent) ou wurde (prétérit), et le participe geöffnet en fin de phrase. » — Pourquoi : « Die Tür wurde um acht Uhr geöffnet » est correct et serait refusé.
- [mineur] table.rows[4] — Actuel : `["Avec agent", "Der Mechaniker repariert es.", "Das Auto wird vom Mechaniker repariert."]` — Proposé : `["Avec agent", "Der Mechaniker repariert das Auto.", "Das Auto wird vom Mechaniker repariert."]` — Pourquoi : les deux colonnes doivent montrer la même phrase pour que la transformation soit lisible.

## de-b1-zu-infinitive
Verdict : à corriger
- [important] table.rows[0] — Actuel : `["Infinitif simple", "zu + infinitif", "Ich versuche, früh zu schlafen."]` — Proposé : `["Infinitif simple", "zu + infinitif", "Ich versuche, früh ins Bett zu gehen."]` — Pourquoi : « früh schlafen » sonne peu naturel ; un natif dit « früh ins Bett gehen » ou « früh schlafen gehen ».
- [important] exercises[4].answers — Actuel : `["Ich fahre nach Berlin, um meine Schwester zu besuchen."]` — Proposé : `["Ich fahre nach Berlin, um meine Schwester zu besuchen.", "Um meine Schwester zu besuchen, fahre ich nach Berlin."]` — Pourquoi : l’antéposition du groupe um … zu est correcte et courante ; elle serait refusée.

## Doutes
- de-b1-relative, exercises[3] (« Das Auto, ___ ich kaufen möchte, ist teuer. ») : le relatif welches est correct mais soutenu et rare à l’oral ; je ne l’ai pas exigé dans answers. L’arbitre peut l’ajouter s’il veut être tolérant.
- de-a1-present, rule[1] : les radicaux en -chn, -gn, -fn (rechnen, regnen, öffnen) prennent aussi le e intercalé ; pas indispensable en A1, non signalé.
- de-b1-praeteritum, rule[0] : la préférence pour le Perfekt à l’oral est plus forte dans le Sud (Bavière, Autriche, Suisse) que dans le Nord ; la formulation générale me semble acceptable pour un apprenant.
- de-a2-modals, examples[1] : « …, aber du darfst. » (ellipse) est naturel à l’oral ; je ne l’ai pas signalé.
- de-b1-konjunktiv-ii, exercises[4] : faut-il accepter aussi les variantes avec bitte (« Könntest du mir bitte helfen? ») ? Elles ajoutent un mot non demandé ; laissé à l’arbitre.
