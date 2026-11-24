# Arbitrage unités débutant — russe

Fichiers : `packages/content/src/units/ru/02-cafe.ts`, `03-nombres-prix.ts`, `04-famille.ts`, `05-ou-est.ts` · Date : 2026-11-24 · Grille : unités J4 (`j4-pr1-architecture.md` §1.2–1.3, `j4-pr3.md` §1) · Passes : `docs/reviews/units/ru/ru-a1-02-05-A.md`, `docs/reviews/units/ru/ru-a1-02-05-B.md`

## Synthèse
4 unités · 4 approuvées (`status: "reviewed"`, `aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" }`) · 0 restent brouillons · 19 corrections appliquées · 3 remarques écartées (et une variante écartée dans une remarque retenue)
Accord entre passes : 6 remarques vues par les deux, 8 par A seule, 4 par B seule, 4 ajoutées par l’arbitre

Mots nouveaux après arbitrage : unité 2 = 42, unité 3 = 40, unité 4 = 40, unité 5 = **39** (passe sous 40 parce que la glose це́нтре est retirée : le mot n’apparaît plus nulle part, voir unité 5).

Décisions transversales :
- **`isNew` compté par lemme** (décision produit). La première glose d’un lemme est `isNew: true`, quelle que soit sa forme. Toutes les autres formes de ce lemme, dans la même unité ou plus tard, sont `isNew: false`. L’unité 5 suivait déjà cette règle. J’ai corrigé les unités 2 à 4. Les prénoms restent `false`, comme dans l’unité 1. J’ai vérifié les quatre unités avec un script ponctuel, puis je l’ai supprimé.
- **Gloses invisibles.** кафе́ (unité 2) n’apparaît que dans le titre du dialogue (« В кафе́ »). Ce titre est affiché, donc je garde la glose. мне (unité 2, `isNew: false`) n’apparaît que dans `accept`. Ce n’est pas un mot nouveau, donc rien à corriger. го́роде et у́лице (unité 5) : les items i12 et i13 donnent maintenant le mot de base dans la consigne (voir unité 5).
- Les commentaires `// REVIEW:` sont retirés des quatre fichiers : les deux passes ont confirmé chacun des points.
- Ids inchangés. Aucun item n’a été ajouté ni retiré, et les tests restent à 10 items. Je n’ai touché ni aux fichiers 06 à 10 ni à `index.ts`.
- Résultats : `npm run units:check` ✓ (ru-a1-02 à 05 « reviewed », seuls les 2 audios par unité restent à générer). Dans `packages/content`, `npm run typecheck` ✓ et `npm test` ✓ (57 tests).

## ru-a1-02-cafe
Décision : approuvé
- Retenue (A, B) grammar.summary fr/en[0] : « -а → féminin ; -о → neutre » → « -а ou -я → féminin ; -о ou -е → neutre. Les noms en -ь peuvent être masculins ou féminins : apprends leur genre avec eux. » — aligné sur la fiche `ru-a1-gender` ; prépare семья́, дочь, пло́щадь.
- Retenue (A, B) items[i13].accept : ajout de « Мне, пожалуйста, кофе » et « Можно кофе, пожалуйста » — мо́жно + nom est enseigné dans l’unité, et l’ordre мне, пожа́луйста, … est très courant.
- Écartée (A) items[i13].accept, variante « Можно кофе » : la consigne demande « s’il vous plaît », la réponse sans пожалуйста ne la traduit pas entièrement.
- Retenue (A, B) conversation.turns[c7] : « Ещё чай? » → « Что́-нибудь ещё? » (translittération « Čtó-nibudʹ eščë? », fr « Autre chose ? », en « Anything else? ») — solution de B. Le thé vient d’être commandé et pas encore servi, donc proposer « encore du thé » n’a pas de sens. La solution de A (« Ещё чай бу́дете? ») a le même défaut. J’ai ajouté la glose что́-нибудь (`isNew: true`) et la note de ещё est devenue « Что́-нибудь ещё ? = Autre chose ? ».
- Retenue (A) glosses[бу́дете].meaning : « (vous) allez prendre » → « (vous) allez (+ verbe) » / « (you) will (+ verb) » — бу́дете ne veut pas dire « prendre ».
- Retenue (B) grammar.summary fr/en[3] : ajout de « (à l’oral, on entend parfois le neutre, mais la norme est le masculin) » — c’est honnête, et i07 reste sans ambiguïté grâce à вку́сный.
- Retenue (arbitre) glosses `isNew` : молоко́м → `true`, молоко́ → `false` (première forme du lemme) ; есть → `false` (même lemme быть que бу́дете, glosé avant).

## ru-a1-03-nombres-prix
Décision : approuvé
- Retenue (A, B) canDo[cd2] : « Je peux comprendre un prix jusqu’à mille roubles. » → « Je peux comprendre un prix simple en roubles, comme 72 ou 122. » / « I can understand a simple price in roubles, like 72 or 122. » — l’unité n’enseigne ni 12 à 19, ni 300 à 900. Même « jusqu’à deux cents » (proposition de A) promettrait 15 ou 115.
- Retenue (A, B) glosses[рубле́й].meaning : « roubles (après 5 à 20, et après 0) » → « roubles (après un nombre qui finit par 0 ou par 5 à 9, et après 11 à 14) » / « roubles (after a number ending in 0 or 5 to 9, and after 11 to 14) » — la règle porte sur le dernier chiffre, comme le dit le résumé.
- Retenue (A) glosses[ка́ртой].note : ajout de « ка́рта change de fin (-ой) » (fr/en), sur le modèle de с молоко́м.
- Retenue (arbitre) glosses `isNew` : рубле́й → `true`, рубль → `false` (рубле́й est la première forme glosée et entendue).

## ru-a1-04-famille
Décision : approuvé
- Retenue (A) grammar.summary fr/en[3] : « Piège : c’est le nom possédé qui compte, pas la personne… » → « Piège pour un francophone : « son, sa, ses » se traduit selon le possesseur, pas selon le nom. Le mari de Julie = её муж ; la femme d’Ivan = его́ жена́ (et non её). Autre piège : па́па, де́душка, дя́дя… » — avec мой et твой, le français accorde déjà comme le russe. Le vrai piège est его́ / её.
- Retenue (A) conversation.turns[c5] / [c6] et items[i22].prompt : « Твоя́ де́вушка? » / « Нет, э́то моя́ ста́ршая сестра́… » → « Твоя́ сестра́? » / « Да, э́то моя́ ста́ршая сестра́, Жюли́. » (et i22 « Да, э́то моя́ ___ сестра́, Жюли́. ») — Léo a déjà présenté Julie comme sa sœur (d4). La glose де́вушка, qui n’apparaît plus nulle part, est retirée.
- Retenue (A) conversation.turns[c4] et items[i21].before : « Нет, он студе́нт. » → « Нет, он уже́ студе́нт. » (fr « Non, il est déjà étudiant. ») — ещё appelle уже́. J’ai ajouté la glose уже́ (`isNew: true`) et une note ещё / уже́ sur ещё. Le compte de mots nouveaux reste à 40.
- Écartée (B) dialogue.lines[d2].translation.fr « mon père et ma mère » → « mon papa et ma maman » : c’est une préférence de style, et la version actuelle est naturelle en français.
- Retenue (arbitre) glosses `isNew` : твоя́ → `true`, твой → `false` ; мои́ → `true`, мой → `false` (première forme de chaque lemme dans le dialogue).

## ru-a1-05-ou-est
Décision : approuvé
- Retenue (A, B) items[i09].accept : « [] » → « ["Где метро, вы не знаете?"] » — tournure orale très fréquente, faite avec les mêmes étiquettes.
- Retenue (A) conversation.turns[c3] : « По́чта? Она́ в це́нтре. » → « По́чта? Она́ на вокза́ле. » (fr « La poste ? Elle est à la gare. », en « The post office? It’s at the station. ») — Léo est déjà dans le centre, et « dans le centre… oui, c’est loin » se contredit. La glose це́нтре est retirée (le mot n’apparaît plus nulle part), d’où 39 mots nouveaux.
- Retenue (A) glosses[ря́дом].note : « bloc à apprendre tel quel » → « Après с, la fin du nom change en général (comme с молоко́м) ; метро́, lui, ne change jamais. » (fr/en) — évite « ря́дом с гости́ница ».
- Retenue (A) items[i19].explain : ajout de « « Росси́е » n’existe pas. » (fr/en) — un distracteur qui n’existe pas doit être signalé comme tel.
- Retenue (arbitre) items[i12] / [i13].prompt : ajout de « La ville = го́род. » et « La rue = у́лица. » (fr/en) — sans cela, l’apprenant devait écrire un mot qu’il n’avait jamais vu. Les gloses го́роде et у́лице sont ainsi pratiquées dans un item qui donne leur sens.
- Écartée (B) dialogue.lines[d1] / keyPhrases[k1].translation.fr, ajout de « par ici » : la traduction actuelle est naturelle, et la glose de здесь donne déjà le sens. C’est une préférence.
- Écartée (B) dialogue.lines[d5].text « И ещё вопро́с » → « И ещё оди́н вопро́с » : la forme actuelle est correcte et courante (B le dit lui-même). C’est une préférence.
