# Arbitrage unités — italien

Fichiers : `packages/content/src/units/it/02-cafe.ts`, `03-nombres-prix.ts`, `04-famille.ts`, `05-ou-est.ts` · Date : 2026-11-24 · Grille : unités J4 (`j4-pr1-architecture.md` §1.2–1.3, `j4-pr3.md` §1) · Passes : `docs/reviews/units/it/it-a1-02-05-A.md`, `docs/reviews/units/it/it-a1-02-05-B.md`

## Synthèse
4 unités · 4 approuvées · 0 restent brouillons · 31 corrections appliquées · 6 remarques écartées
Accord entre passes : 16 remarques vues par les deux passes, 6 par A seule, 6 par B seule, 2 ajoutées par l'arbitre.

Chaque unité approuvée reçoit `aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" }` et `status: "reviewed"`. La publication attend que le responsable produit écoute l'audio. Aucun champ de relecture humaine n'a été touché. Aucun id existant n'a été renommé. Les nouveaux items (03 : i24, i25 ; 04 : i23, i24 ; 05 : i24) sont ajoutés à l'étape « exercises ». Les tests restent à 10 items, inchangés.

Décisions transversales (consignes produit) :
- **`isNew` par lemme.** Une forme d'article dont le lemme est déjà glosé passe à `isNew: false`. En unité 2, seuls `un` et `il` restent nouveaux (uno, una, un', lo, la et l' passent à false). En unité 3, i, gli et le passent à false (lemme il, vu en unité 2). « Quant'è » reste à false, car ses deux lemmes (quanto, essere) sont déjà comptés.
- **Gloses invisibles.** Une glose qui n'apparaît dans aucune ligne, aucune phrase-clé et aucun item est soit travaillée dans un item qui en donne le sens, soit supprimée.
- **Mots nouveaux après arbitrage** (`units:check`) : 02 → 33 ; 03 → 39 ; 04 → 33 ; 05 → 38. Les quatre unités passent sous la cible de 40, ce que la consigne accepte : le compte est honnête et non gonflé.
- **Prix** : chiffres ronds et crédibles, sans prétention à un tarif officiel.

## it-a1-02-cafe
Décision : approuvé
- Doutes de l'auteur tranchés (A, B) : on garde le Lei de « Cosa prende? » (d1), la demande du sucre (d6) et la note cornetto / brioche. Les commentaires `// REVIEW:` sont retirés.
- Retenue (A, B) items[i13].accept : « ["Grazie mille"] » → « ["Grazie mille", "Mille grazie"] » ; l'explication le signale. Mille grazie est tout aussi courant.
- Retenue (A, B) items[i14].accept : ajout de « Prendo un caffè, per favore » (avec et sans virgule). i15 accepte déjà prendo.
- Écartée en partie (A, B) items[i14].accept, suppression des variantes sans virgule : je ne les ai pas retirées. Je n'ai pas vérifié que la notation des items `type` ignore les virgules internes, et ces variantes ne coûtent rien.
- Retenue (A, B) glosses[frizzante].note : « zz se prononce « dz » : « fridzannté » » → « zz se prononce « ts » : « fritsannté » » (en : "freet-tsahn-teh"). C'est la version de B : en italien standard, ce z est sourd [tts]. La formulation neutre de A n'était pas nécessaire.
- Retenue (B) glosses[zucchero].note : « cch se prononce « k » : « tsoukkéro » » → « Le z se prononce « dz » (« ts » à Rome), cch se prononce « kk » : « dzoukkéro » ». La norme est sonore, et la géminée est rendue.
- Retenue (A, B) glosses latte et certo : supprimées. Ces gloses n'étaient visibles nulle part.
- Ajoutée (arbitre) glosse tè : supprimée pour la même raison. Dans le résumé, « Caffè et tè sont masculins » devient « Caffè et tè (le thé) sont masculins », pour que le sens reste visible.
- Retenue (A) isNew uno, una, un', lo, la, l' : true → false. La consigne produit compte par lemme.
- Retenue (A, B) grammar.summary[1] : on ajoute « et aussi devant gn, ps, y » à la règle de lo (fr et en).
- Écartée (B) i06 « una acqua » : on garde le distracteur. À l'écrit courant, l'élision un'acqua est la norme A1, et l'explication est juste.

## it-a1-03-nombres-prix
Décision : approuvé
- Doute d2 tranché (A, B) : on garde « per l'autobus ». Le commentaire REVIEW est retiré.
- Écartée (A) d6–d9, k7, i02 (2 cartes, 2 timbres, total 7 €) : le dialogue ne donne pas le prix du timbre, qui n'est qu'implicite. Le total 10,20 € (timbre à 1,30 €) est rond et crédible, et ne prétend pas être un tarif officiel. Le changement aurait aussi fait disparaître nove et ottanta des répliques. Le commentaire REVIEW devient « Illustrative prices, not an official tariff ».
- Retenue (A, B) nombres invisibles (zero, sei, otto, trenta, quaranta, sessanta, novanta, cento) : deux items de correspondance sont ajoutés aux exercices. i24 couvre zero, sei, otto, trenta et cento ; i25 couvre quaranta, cinquanta, sessanta, ottanta et novanta.
- Retenue (A) grammar.summary : ajout d'une ligne avec la liste des nombres de 0 à 10, puis des dizaines jusqu'à 100 (fr et en). Je n'ai pas déplacé i04 : c'est une correspondance, son retour donne le sens, et tre, cinque et settanta se devinent depuis le français.
- Retenue (A) grammar.summary[1] : « Les noms en -a (souvent féminins) font -e » → « Les noms féminins en -a font -e » (en : "Feminine nouns in -a take -e"). Un masculin en -a ne fait pas -e.
- Retenue (A, B) items[i14].accept : ajout de « Quanto fa ». Une glose fa (fare, `isNew: true`) est ajoutée, et l'explication de i14 donne la tournure.
- Retenue (A) isNew i, gli, le : true → false, selon la règle par lemme.
- Ajoutée (arbitre) items[i16] : ajout de la paire « gli amici » → « les amis », et l'explication cite gli. gli était enseigné dans le résumé mais n'apparaissait dans aucun item.
- Écartée (B) glosses[quant'è].isNew → true : avec la règle par lemme, quanto et essere sont déjà comptés. dov'è comptait en unité 2 parce que dove y était nouveau.
- Pas de changement (A) pour d5 « Costano cinquanta centesimi. » et pour « Grazie e arrivederci! » en d9. Les deux sont corrects.

## it-a1-04-famille
Décision : approuvé
- Doute d5 tranché (A, B) : on garde « il più piccolo ». Le commentaire REVIEW est retiré.
- Retenue (A, B) glosse grande : supprimée. « mio fratello grande » est familier, et la glose était invisible.
- Retenue (A, B) gloses invisibles : bambini, cane, sposato, noi, nostro, voi et vostro sont supprimées. Les autres mots sont travaillés dans des items :
  - i16 couvre nonna, zio, cugina, figlio et moglie. Ces paires remplacent padre, madre, fratello et sorella, déjà travaillés ailleurs.
  - i23, une nouvelle correspondance, couvre marito, mamma, papà, figlia et zia.
  - i24, un nouveau QCM « « Mes parents » se dit : i miei genitori / i miei parenti / i miei fratelli », rend parenti visible.
- Retenue (A, B) faux ami genitori / parenti : il est testé dans i24 et ajouté comme ligne du résumé (fr et en).
- Retenue (A) grammar.summary[1] : « Il s'accorde… » devient « Comme en français, il s'accorde… ».
- Retenue (A, B) grammar.summary[2] : la ligne « Piège » est complétée. L'article revient au pluriel et devant un nom de parenté accompagné d'un adjectif (il mio fratello più piccolo). Avec mamma et papà, il est facultatif (la mia mamma ou mia mamma).
- Retenue (A, B) grammar.summary[4] : les formes de noi et voi sont complètes, et loro y figure : il loro, la loro, i loro, le loro.
- Retenue (B) glosses[Lucia].note : « loutchia » → « loutchìa (accent sur le i) » (en : "loo-CHEE-ah").
- Retenue (B) situation.fr : « une photo de sa famille » → « une photo de la famille de Giulia ». Le « sa » était ambigu.

## it-a1-05-ou-est
Décision : approuvé
- Doutes tranchés (A, B) : on garde « È lontano? » (d3), qui est adverbial. Les commentaires REVIEW de d3 et de i18 sont retirés.
- Retenue (A, B) items[i17].options, bloquant : « al » → « alla ». L'explication devient « Parco est masculin (nella, alla : féminin) ». « Ci sono due bar al parco » était une deuxième bonne réponse.
- Écartée (B) option « nello » : la forme n'est pas enseignée. « alla », déjà glosé, est faux sans ambiguïté devant parco.
- Retenue (A, B) items[i18].accept : « ["sulla"] » → « ["sulla", "a"] ». « a destra » est juste, et l'explication le dit déjà.
- Retenue (A, B) gloses invisibles :
  - della, del et sul sont supprimées. Le résumé garde les contractions travaillées : al, alla, dell', nel, sulla.
  - supermercato, ospedale et centro sont travaillés dans i24, une nouvelle correspondance : il supermercato, l'ospedale, in centro, la banca, il museo.
- Retenue (A, B) grammar.summary[2] : « A, di, in, su (et da) se soudent… Da fait de même : da + il = dal. » (fr et en). On reste sans exemple, pour ne pas introduire medico.
- Retenue (B) glosses[chiesa].note : « kiéza » → « kiéza (ou « kiéssa » dans le Centre et le Sud) ».
- Écartée (A) i06 « Sono » comme distracteur : dans le sens « il y a », c'est faux, et l'item n'a qu'une bonne réponse.
- Pas de changement (A) pour sinistra : la paire de i04 donne son sens avant i11 et c4.

## Vérifications
- `npm run units:check` : ✓ pour les quatre unités, au statut « reviewed ». Il reste 2 fichiers audio à générer par unité, ce qui est normal avant l'audio.
- `packages/content` : `npm run typecheck` passe. `npm test` : 57/57.
- Fins de ligne LF conservées. Seuls les quatre fichiers d'unité et cette décision sont modifiés : 06–10 et `index.ts` n'ont pas été touchés.

## Points d'attention
- Prononciation (frizzante en ts, zucchero en dz, chiesa) : à confronter à l'audio Azure quand le responsable produit l'écoutera. Si la voix diffère, on ajustera la note à l'audio.
- La glose fa (unité 3) n'est visible que dans l'explication de i14. C'est le seul mot nouveau dont le sens n'est donné qu'après la réponse.
- Les gloses supprimées (unité 2 : latte, certo, tè ; unité 4 : grande, bambini, cane, sposato, noi, nostro, voi, vostro ; unité 5 : della, del, sul) ne sont plus « enseignées ». Si les unités 6 à 10 les emploient, elles doivent les compter comme nouvelles.
