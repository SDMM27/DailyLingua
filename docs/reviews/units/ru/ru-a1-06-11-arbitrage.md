# Arbitrage unités débutant — russe (unités 6 à 10 et bilan)

Fichiers : `packages/content/src/units/ru/06-journee.ts`, `07-courses.ts`, `08-gouts.ts`, `09-chez-moi.ts`, `10-week-end.ts`, `11-bilan.ts` · Date : 2026-11-24 · Grille : unités J4 (`j4-pr1-architecture.md` §1.2–1.3, `j4-pr3.md` §1–2) · Passes : `docs/reviews/units/ru/ru-a1-06-11-A.md`, `docs/reviews/units/ru/ru-a1-06-11-B.md`

## Synthèse
6 éléments (5 unités + le bilan) · 6 approuvés (`status: "reviewed"`, `aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" }`) · 0 restent brouillons · 28 corrections appliquées · 6 remarques écartées (plus deux variantes écartées dans des remarques retenues)
Accord entre passes : 7 remarques vues par les deux, 9 par A seule, 13 par B seule, 3 ajoutées par l’arbitre

Décisions transversales :
- **Nombre de mots nouveaux** (décision produit) : 39, 26, 26, 26 (25 + па́спорт) et 18 sont acceptés tels quels. Le compte est honnête, l’unité 10 est une révision, et je n’ajoute aucun mot pour atteindre un quota. Les quatre remarques « niveau » de B sont donc écartées.
- **Formes inventées en distracteur** (décision produit) : on garde celles qui sont exactement l’erreur visée **et** que l’explication nomme comme fausse. J’ai ajouté « (pas …) » aux explications qui ne la nommaient pas : 07-i05 бана́ни, 07-i07 et 07-i20 я́йцы, 10-i05 рабо́тишь, 10-i07 спаю́. Je garde 07-i06 гру́шы (« après ш, jamais ы »), 07-i17 пирожо́кы et пирожо́ки (« après к, toujours -и, et le о tombe »), 08-i05 любю́, 08-i06 говорю́т et 09-i23 в до́ма, que leurs explications nomment déjà. Je remplace гото́веешь (10-i06, invraisemblable) et смотрю́т (08-i17, doublon de 08-i06) par de vraies formes.
- **Écoutes** (voix du premier locuteur) : j’ai relu les dix consignes `listen_mcq`. Aucune ne contredit la voix. 06-i10 (voix de Dmitry) pose une question sur Thomas à la 3e personne, ce qui convient. 07, 08 et 10 (voix de femme) utilisent « la personne / cette personne » ou un texte à la 1re personne sans accord de genre. 09 (voix d’homme) : « Кот на крова́ти », « В кварти́ре есть балко́н ».
- **Variantes ajoutées à `accept`** : chaque mot est déjà affiché dans son unité (étiquettes de l’item). `units:check` ne signale aucun `unknown_word`.
- Les commentaires `// REVIEW:` (06 c5, 07 k10 et c4, 08 d10, 10 d8) sont retirés : les deux passes ont validé chacune de ces tournures, et je suis d’accord.
- Aucun id n’a été renommé, aucun item n’a été ajouté ni retiré, et les tests restent à 10 items. Je n’ai touché à aucun autre fichier que les six unités et cette décision. Fins de ligne LF conservées.
- Résultats : `npm run units:check` ✓ (ru-a1-06 à 11 « reviewed », seuls les audios restent à générer). Dans `packages/content`, `npm run typecheck` ✓ et `npm test` ✓ (57 tests).

## ru-a1-06-journee
Décision : approuvé
- Retenue (A) grammar.summary fr/en[0] : « les verbes en -ать » → « la plupart des verbes en -ать » / « most verbs in -ать » : спать (unités 8 et 10) est en -ать mais de la 2e conjugaison.
- Retenue (A) grammar.summary fr/en[1] : « jamais l’infinitif après я (я рабо́тать est faux) » → « le verbe se conjugue toujours : я рабо́таю, jamais я рабо́тать » : я люблю́ гуля́ть (unité 8) démentirait la règle telle qu’elle était écrite.
- Retenue (B) items[i08].accept : ajout de « Я в семь часов встаю. » : l’ordre est naturel à l’oral, et l’item est tiré au bilan.
- Écartée (B) niveau, 39 mots nouveaux : accepté (décision produit).
- REVIEW c5 « Ты с на́ми ? » (A, B) : naturel, gardé. Commentaire retiré.

## ru-a1-07-courses
Décision : approuvé
- Retenue (A, B) items[i08].accept : `[]` → « Сколько яблоки стоят? », « Яблоки сколько стоят? » : les deux variantes, l’une proposée par A, l’autre par B, sont courantes à l’oral. L’item est tiré au bilan.
- Retenue (A, B) items[i09].accept : ajout de « Есть у вас яйца? », plus « У вас яйца есть? » (ajout de l’arbitre, tout aussi courant).
- Retenue (A, B) glosses[Продавщи́ца].note : « Un vendeur : продаве́ц (unité 3). » → « Un vendeur : продаве́ц. » (en « A man: продаве́ц. ») : le renvoi à l’unité 3 est faux.
- Retenue (A) grammar.summary fr/en : ajout de « Certains mots ne changent jamais, au pluriel non plus : кафе́, метро́, кило́. » : c’est le piège qui suit la règle -ы / -и / -а. J’ai retiré ко́фе de la liste de A, parce qu’on ne l’emploie pas au pluriel.
- Retenue (arbitre) items[i05], [i07], [i20].explain : ajout de « (pas бана́ни) », « (pas я́йцы) », « (pas я́йцы) » : l’explication doit nommer la forme inventée comme fausse (décision produit).
- Écartée (A, B) glosses бу́лочка / бу́лочки, `isNew` à inverser : le compte par lemme est juste, et la marque est sur la première forme que l’apprenant rencontre (бу́лочки, en conversation). C’est aussi le cas de гру́ши / гру́ша et de огурцы́ dans la même unité, que personne n’a relevé.
- Écartée (B) niveau, 26 mots nouveaux : accepté (décision produit).
- REVIEW k10 et c4 (A, B) : naturels, gardés. Commentaires retirés. Doutes de A : i17 пирожо́кы (gardé, voir les décisions transversales) et i23 « Нет, э́то всё. » (l’option reste fausse avec la consigne), sans changement.

## ru-a1-08-gouts
Décision : approuvé
- Retenue (A, B) grammar.summary fr/en[3] : « Люблю́ + nom : … ne change pas » → « Люблю́ + nom de chose : … ne change pas (я люблю́ ко́фе, кино́, фи́льмы). Pour une personne ou un animal, le nom change (я люблю́ ма́му, бра́та) : on le verra plus tard. » (en « Люблю́ + a noun for a thing … For a person or an animal the noun changes (я люблю́ ма́му, бра́та): that comes later. ») : la règle est fausse pour les êtres animés, et l’apprenant connaît déjà брат et ма́ма.
- Retenue (B) glosses[фи́льмы].note : « Au pluriel, le nom ne change pas après люблю́ » → « Un pluriel de chose ne change pas après люблю́ : я люблю́ фи́льмы. » : même raison (я люблю́ друзе́й).
- Retenue (A) glosses[ску́чно].note : ajout de « Le ч se prononce ш : [skouchna]. » (en « The ч is pronounced ш: [skooshna]. ») : c’est la prononciation normée, et l’audio la fera entendre. La notation suit celle de сего́дня (unité 6).
- Retenue (A) items[i17].options[b] : « смотрю́т » → « смо́трит », et explication complétée par « (он смо́трит, вы смо́трите) » : 08-i06 teste déjà -ют / -ят, et les trois options sont maintenant de vraies formes.
- Écartée (B) niveau, 26 mots nouveaux : accepté (décision produit).
- REVIEW d10 (A, B) : le présent pour un projet immédiat est naturel, gardé. Commentaire retiré.

## ru-a1-09-chez-moi
Décision : approuvé
- Retenue (A) items[i17].options[c] : « стену́ » → « сте́ну » : l’accusatif de стена́ est сте́ну. C’était une faute d’accent dans un item du test.
- Retenue (A) glosses[стену́] : forme « стену́ » → « сте́ну » : même faute.
- Retenue (B) conversation c3 / c4, items[i21].before et gloses : « мой телефо́н » → « мой па́спорт » (c3 « Отли́чно! А мой па́спорт? Он то́же там? », c4 « Нет, па́спорт на дива́не, в ко́мнате. », i21 « Нет, па́спорт на »), avec la nouvelle glose па́спорт (`isNew: true`) : la scène est un appel (« я ря́дом »), et on ne demande pas au téléphone où est son téléphone. La glose телефо́н reste pour i19.
- Retenue en partie (B) conversation c8 : « До встре́чи! Я до́ма. » → « Я до́ма. До встре́чи! » (fr « Je suis à la maison. À tout de suite ! », en « I'm at home. See you! ») : on dit d’abord où on est, puis on prend congé. Variante écartée : « Хорошо́, … », qui répéterait le Хорошо́ de c7. i23 n’est pas touché.
- Écartée (B) niveau, 25 mots nouveaux (26 avec па́спорт) : accepté (décision produit).
- Doutes de A et B sur i20 (« в столе́, в ку́хне ») : l’option reste fausse pour « sur la table, dans la cuisine ». Pas de changement.

## ru-a1-10-week-end
Décision : approuvé
- Retenue (A) items[i06].options[b] : « гото́веешь » → « гото́вит », et explain « Avec ты, 2e conjugaison : ты гото́вишь. Гото́вит va avec он / она́, et le л n’apparaît qu’en я : гото́влю. » (fr/en) : la forme était inventée et invraisemblable (décision produit).
- Retenue (A, B) dialogue.lines[d4].translation.fr et keyPhrases[k4].translation.fr : « je prends longtemps mon petit-déjeuner » → « je prends mon petit-déjeuner sans me presser » : la tournure d’origine est maladroite en français.
- Retenue (A) glosses[вто́рник].note : `null` → « Quand ? во вто́рник (во devant вт). » / « When? во вто́рник (во before вт). » : c’est le seul jour qui change de préposition.
- Retenue (B) items[i08].accept : ajout de « Я поздно встаю в субботу. » : c’est aussi naturel que les quatre variantes déjà acceptées.
- Retenue (B) items[i19].options[b] : « смотри́те » → « смо́трим », explain « Avec вы : -ите. Вы смо́трите (мы смо́трим, они́ смо́трят). » (fr/en). La glose смотри́те, qui n’apparaissait plus nulle part, est remplacée par смо́трим (`isNew: false`) : les deux options ne différaient que par l’accent, et l’impératif n’est pas enseigné. L’item teste maintenant la personne.
- Retenue (B) items[i10].audioText : « Я пла́ваю в бассе́йне в сре́ду. » → « В сре́ду я пла́ваю в бассе́йне. » : c’est l’ordre que l’unité enseigne, et l’audio n’est pas encore généré, donc le changement ne coûte rien.
- Retenue (arbitre) items[i05], [i07].explain : ajout de « (pas рабо́тишь) » et « (pas спаю́) » (décision produit sur les formes inventées).
- Écartée (B) niveau, 18 mots nouveaux : c’est une unité de révision, accepté (décision produit).
- REVIEW d8 (A, B) : у меня́ = chez moi, présenté comme un bloc, gardé. Commentaire retiré.

## ru-a1-11-bilan
Décision : approuvé (après les corrections des unités 6 à 10, toutes `reviewed`)
- Retenue (A, B, arbitre) draws, rééquilibrage : avant, 4 remises en ordre (les trois premières questions d’affilée), 0 QCM, et 09-i09 trivial. Après : 07-i08, 09-i05, 06-i14, 08-i08, 10-i10, 09-i12, 06-i08, 10-i06, 07-i15, 08-i14. Cela fait 3 remises en ordre (questions 1, 4 et 7, jamais deux de suite), 4 textes à trous, 1 saisie, 2 QCM (09-i05 на ку́хне, proposé par A ; 10-i06 гото́вишь, aux options désormais réelles) et 1 écoute. Il y a 8 items de production sur 10, et jamais deux items de la même unité de suite. Les cinq points sont couverts : 1re conjugaison (06-i14, 06-i08), pluriel et сто́ят (07-i08, 07-i15), 2e conjugaison et люблю́ (08-i08, 08-i14, 10-i06), prépositionnel (09-i05, 09-i12), heure et jours (06-i08, 10-i10). Écartés de la proposition de B : 08-i06 (говоря́т ferait doublon avec 08-i14) et 09-i06 (09-i05 teste le piège на ку́хне, plus central pour un francophone).
- Retenue (doute de A, décision produit) situation fr/en : « sans aide » → « sans traduction ni gloses » / « with no translations or glosses » : les indices des textes à trous font partie de la question et restent affichés. La situation dit donc la règle exacte.
- Retenue (B), sans changement dans ce fichier : les variantes manquantes de 06-i08 et 07-i08 sont ajoutées dans leurs unités, et le bilan hérite des corrections.
- canDo (journée, goûts, logement, courses simples) : toujours vrais avec les nouveaux tirages (09-i05, 09-i12, 07-i08).
