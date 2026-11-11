# Relecture grammaire — allemand — passe B

Fichier : src/lib/grammar/courses/de.ts · Date : 2026-11-09 · Relecteur : agent relecteur-natif (claude-opus-5-5)

## Synthèse
18 éléments relus · 7 sans remarque · 11 avec remarques (3 bloquantes, 9 importantes, 8 mineures)

## de-a1-gender-articles
Verdict : à corriger
- [important] exercises[4].source / exercises[4].answers — Actuel : « Der Mann ist nett. » → « Ein Mann ist nett. » — Proposé : source « Der Mann wartet. », answers `["Ein Mann wartet."]`, explanation « Mann est masculin : der devient ein. » (inchangée) — Pourquoi : « Ein Mann ist nett » est grammatical mais sonne faux (énoncé générique sans contexte) ; « Ein Mann wartet » (un homme attend) est une phrase qu’un natif dit vraiment.
- [mineur] examples[1].note — Actuel : « Les noms en -in sont féminins. » — Proposé : « Les noms de personnes en -in sont féminins : der Lehrer → die Lehrerin. » — Pourquoi : le suffixe -in des noms de personnes est féminin, mais der Termin ou das Benzin (fréquents) ne le sont pas ; la note telle quelle généralise à tort.

## de-a1-present
Verdict : à corriger
- [important] rule[1] — Actuel : « Si le radical finit par -t ou -d, on intercale un e : du arbeitest, er arbeitet, ihr arbeitet. Sein et haben sont irréguliers et à connaître par cœur. » — Proposé : « Si le radical finit par -t ou -d, on intercale un e : du arbeitest, er arbeitet, ihr arbeitet. Certains verbes changent de voyelle à du et er / sie / es : fahren → du fährst, er fährt ; sehen → du siehst, er sieht ; essen → du isst, er isst. Sein et haben sont irréguliers et à connaître par cœur. » — Pourquoi : le changement de voyelle au présent est un point central de l’A1 et n’est traité nulle part ailleurs, alors que le cours emploie dès l’A1 Siehst du, fährt, schläft, gefällt sans explication.

## de-a1-word-order
Verdict : à corriger
- [important] table.rows[4] — Actuel : `["Arbeitest", "du", "heute in Köln?"]` — Proposé : supprimer cette ligne (la question oui / non est déjà dans rule[2] et examples[2]) — Pourquoi : la colonne « Position 2 (verbe) » contient ici le sujet du, et le verbe est dans « Position 1 » : la ligne contredit l’en-tête et la légende « Le verbe reste en deuxième position ».

## de-a1-accusative
Verdict : ok

## de-a1-negation
Verdict : à corriger
- [important] exercises[3].hint — Actuel : (absent) — Proposé : `hint: "négation"` — Pourquoi : sans indice, « Er kommt heute ___. » admet beaucoup de réponses justes (spät, früh, an, mit, auch…) qui seraient refusées ; l’indice fixe la négation sans donner la forme.
- [mineur] rule[2] — Actuel : « Place de nicht : à la fin de la phrase quand il nie le verbe (Er kommt heute nicht), et juste devant l’adjectif ou le complément qu’il nie (nicht gut, nicht in Berlin). » — Proposé : « Place de nicht : à la fin de la phrase quand il nie le verbe (Er kommt heute nicht), mais avant une particule ou un infinitif final (Ich rufe dich nicht an), et juste devant l’adjectif ou le complément qu’il nie (nicht gut, nicht in Berlin). » — Pourquoi : « à la fin de la phrase » mène à « *Ich rufe dich an nicht » dès les verbes séparables et les modaux.

## de-a1-plural
Verdict : ok

## de-a2-separable
Verdict : à corriger
- [important] rule[1] — Actuel : « À l’infinitif (après un verbe de modalité par exemple) et dans une subordonnée, le verbe reste d’un bloc : Ich muss früh aufstehen. Wann stehst du auf ? Le français n’a pas ce mécanisme : le piège est d’oublier la particule à la fin. » — Proposé : « À l’infinitif (après un verbe de modalité par exemple) et dans une subordonnée, le verbe reste d’un bloc : Ich muss früh aufstehen ; …, weil ich früh aufstehe. Ailleurs, la particule va à la fin, même dans une question : Wann stehst du auf? Le français n’a pas ce mécanisme : le piège est d’oublier la particule à la fin. » — Pourquoi : l’exemple « Wann stehst du auf ? » est présenté comme un cas où le verbe « reste d’un bloc », alors qu’il est justement séparé ; la subordonnée annoncée n’est pas illustrée.
- [mineur] exercises[4].instruction — Actuel : « Mets Morgen au début de la phrase. » — Proposé : « Ajoute Morgen au début de la phrase. » — Pourquoi : Morgen n’est pas dans la phrase source (« Ich rufe dich an. ») ; il faut l’ajouter, pas le déplacer.

## de-a2-modals
Verdict : ok

## de-a2-dative
Verdict : ok

## de-a2-perfekt
Verdict : à corriger
- [bloquant] exercises[1].options — Actuel : `["haben", "sind", "waren"]` — Proposé : `["haben", "sind", "seid"]` (answer reste 1) — Pourquoi : « Wir waren nach Hamburg gefahren » est un plus-que-parfait parfaitement correct : l’exercice a deux bonnes réponses.
- [mineur] rule[2] — Actuel : « Sein s’emploie avec les verbes de mouvement ou de changement d’état (gehen, fahren, kommen, aufstehen) et avec bleiben et passieren. » — Proposé : « Sein s’emploie avec les verbes de mouvement ou de changement d’état (gehen, fahren, kommen, aufstehen) et avec sein, werden, bleiben et passieren : ich bin gewesen. » — Pourquoi : avec « Tous les autres prennent haben », l’apprenant déduit « *ich habe gewesen », faute fréquente des francophones (« j’ai été »).
- [mineur] examples[1].translation — Actuel : « Nous sommes allés à Vienne en voiture. » — Proposé : « Nous sommes allés à Vienne. » — Pourquoi : fahren indique un véhicule, pas forcément la voiture (train, bus) ; la traduction ajoute une précision absente de l’allemand.

## de-a2-two-way
Verdict : à corriger
- [important] exercises[4].instruction — Actuel : « Dis où tu vas au lieu de dire où tu es. » — Proposé : « Dis où tu vas, avec le verbe gehen. » — Pourquoi : seule « Ich gehe in den Garten. » est acceptée, alors que « Ich laufe in den Garten. » ou « Ich komme in den Garten. » répondent aussi à la consigne ; fixer le verbe évite de refuser une bonne réponse.
- [mineur] exercises[2].explanation — Actuel : « La chatte est déjà sur le canapé : position, datif. Sofa est neutre, donc dem Sofa. » — Proposé : « Le chat est déjà sur le canapé : position, datif. Sofa est neutre, donc dem Sofa. » — Pourquoi : die Katze désigne le chat en général ; « la chatte » est inutilement marqué en français et prête à un double sens.

## de-a2-subordinate
Verdict : ok

## de-b1-adjective-endings
Verdict : ok

## de-b1-praeteritum
Verdict : ok

## de-b1-konjunktiv-ii
Verdict : à corriger
- [important] exercises[4].answers — Actuel : `["Könntest du mir helfen?", "Würdest du mir helfen?"]` — Proposé : `["Könntest du mir helfen?", "Würdest du mir helfen?", "Könntest du mir bitte helfen?", "Würdest du mir bitte helfen?"]` — Pourquoi : la consigne « Rends la demande plus polie » pousse naturellement à ajouter bitte ; ces réponses sont justes et seraient refusées.
- [mineur] exercises[2].explanation — Actuel : « Conseil : würde + infinitif. Wurde est le prétérit de werden (passif). » — Proposé : « Conseil : würde + infinitif. Wurde est le prétérit de werden (« devenait », ou auxiliaire du passif). » — Pourquoi : wurde n’est pas propre au passif ; c’est le prétérit de werden dans tous ses emplois.

## de-b1-relative
Verdict : à corriger
- [important] exercises[3].answers — Actuel : `["das"]` — Proposé : `["das", "welches"]` — Pourquoi : welches (relatif soutenu) est correct ici et correspond à l’indice « neutre, accusatif » ; un apprenant qui le connaît ne doit pas être sanctionné.
- [mineur] exercises[2].prompt — Actuel : « Das ist der Kollege, mit ___ ich oft Mittag esse. » — Proposé : « Das ist der Kollege, mit ___ ich oft zu Mittag esse. » — Pourquoi : la forme standard est zu Mittag essen ; « Mittag essen » sans zu est familier.

## de-b1-passive
Verdict : à corriger
- [bloquant] exercises[0].options — Actuel : `["hat", "wird", "wurde"]` — Proposé : `["hat", "wird", "werden"]` (answer reste 1) — Pourquoi : « Das Essen wurde jeden Tag von meiner Mutter gekocht » (habitude passée) est tout aussi correct ; rien dans la phrase n’impose le présent, donc deux bonnes réponses.
- [bloquant] exercises[3].hint — Actuel : « werden » — Proposé : « werden, au présent » — Pourquoi : « Die Tür wurde um acht Uhr geöffnet. » est juste et serait refusée ; l’indice doit fixer le temps attendu (wird).

## de-b1-zu-infinitive
Verdict : à corriger
- [important] exercises[4].answers — Actuel : `["Ich fahre nach Berlin, um meine Schwester zu besuchen."]` — Proposé : `["Ich fahre nach Berlin, um meine Schwester zu besuchen.", "Um meine Schwester zu besuchen, fahre ich nach Berlin."]` — Pourquoi : l’antéposition du groupe en um … zu est naturelle et correcte (le verbe de la principale suit la virgule) ; c’est une bonne réponse refusée.

## Doutes
- de-a2-modals, examples[2] : « zwei Kaffee » est l’usage courant au café ; « zwei Kaffees » est aussi correct. Je n’ai rien signalé.
- de-b1-konjunktiv-ii, rule[2] : « n’emploie pas würde dans la proposition en wenn » est la norme écrite ; à l’oral, « wenn er kommen würde » est très répandu. La simplification me paraît acceptable à B1.
- de-b1-relative, exercises[4] : « Das ist mein Bruder, welcher in Wien wohnt. » est correct mais très soutenu, presque artificiel dans ce contexte ; à l’arbitre de décider s’il faut l’ajouter aux answers par cohérence avec la proposition pour exercises[3].
- de-b1-praeteritum, examples[0] : « Hier, j’étais au cinéma. » est correct ; « Hier, je suis allé au cinéma » serait plus idiomatique en français, mais s’éloigne de war. Laissé tel quel.
- Typographie : les citations allemandes dans le texte français portent parfois l’espace française avant « ? » (« Wann stehst du auf ? », « Können Sie… ? »). Je ne sais pas si la convention du projet l’impose aussi dans les citations en langue étrangère.
