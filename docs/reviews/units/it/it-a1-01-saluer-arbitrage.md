# Arbitrage unité — italien

Fichier : `packages/content/src/units/it/01-saluer.ts` (unité `it-a1-01-saluer`) · Date : 2026-11-23 · Grille : unités J4 (`j4-pr1-architecture.md` §1.2-1.3) · Passes : `it-a1-01-saluer-A.md`, `it-a1-01-saluer-B.md`

## Synthèse
1 unité (statut posé au niveau de l’unité) · 1 approuvée · 0 brouillon · 15 corrections appliquées · 2 remarques écartées (et 1 retenue en partie)
Accord entre passes : 6 remarques vues par les deux, 3 par A seule, 6 par B seule, 0 ajoutée par l’arbitre

Statut posé : `aiReview: { reviewedOn: "2026-11-23", passes: 2, arbiter: "arbitre-relecture" }`. Aucun champ de relecture humaine. La version de l’unité est un hash calculé (nouvelle version : `8bd08ebd8b85`).

Attention publication : avec ce statut, `units:check` considère l’unité comme publiée et échoue tant que les audios `i11.mp3` et `i12.mp3` n’existent pas. Ce n’est pas un défaut de contenu.

## it-a1-01-saluer
Décision : approuvé

### Dialogue et gloses
- Retenue (A, B) glosses[buongiorno].note : « À un inconnu, dans un magasin, à une personne plus âgée. Entre amis : ciao. » → « À un inconnu, dans un magasin, à une personne plus âgée, du matin au début de l’après-midi (ensuite : buonasera). Entre amis : ciao. » (en idem) — c’est le vrai piège du francophone, qui dit « bonjour » jusqu’au soir.
- Retenue (B) glosses : ajout de *arrivederci* (« au revoir (poli) », `isNew: true`) et de la phrase-clé k9 « Arrivederci! » (« Au revoir ! (poli) ») — l’objectif cd1 n’était couvert qu’au registre familier ; l’unité enseignait le bonjour poli sans l’au revoir poli.
- Retenue (B) glosses[mio].meaning : « mien » / « mine » → « mon, le mien » / « my, mine » — *mio* est d’abord l’adjectif possessif.
- Écartée (B) dialogue d3 et conversation c3, traduction fr : « Enchantée ! » → « Enchantée aussi ! » — en français, la réplique naturelle à « Enchanté ! » est « Enchantée ! » ; « Enchantée aussi » sonne traduit, et la glose de *mio* explique déjà la nuance.
- Écartée (A ; B en doute) d8 « Piacere, Anna! Ora vado. A presto! » → ajout de *Scusate* — remarque de goût ; la réplique est correcte et naturelle, et l’ajout ferait entrer un mot nouveau de plus. Le commentaire REVIEW reste.

### Phrases-clés
- Retenue en partie (A, B) k8.translation : « Bonjour ! (poli : à un inconnu, dans un magasin ; entre amis, ciao) » → « Bonjour ! (poli, jusqu’en début d’après-midi) » / « Hello! (polite, until early afternoon) » — A a raison de raccourcir le verso de la carte, B a raison d’y porter la limite horaire ; le détail du registre reste dans la glose.

### Résumé de grammaire
- Retenue (A, B) ligne 5 fr : « Prononciation : ci se dit « tchi » (ciao), chi se dit « ki » (chi, chiamo). » → « Prononciation : c devant e ou i se dit « tch » (piacere = « piatchéré ») ; dans cia, cio, ciu, le i ne s’entend pas (ciao = « tchao ») ; ch se dit « k » (che = « ké », chi = « ki », chiamo = « kiamo »). » — l’exemple *ciao* contredisait la règle ; synthèse des deux propositions (règle générale de A, i muet de B).
- Retenue (A, B) ligne 5 en : même correction (« c before e or i sounds like "ch" in "church" (piacere = "pyah-cheh-reh"); in cia, cio, ciu the i is silent (ciao = "chow"); ch sounds like "k" … »).
- Retenue (B) ligne 2 fr/en : « Ta nationalité : sono francese, sono italiana. » → « Pour le pays, on donne la nationalité : sono francese, sono italiana (et non « sono di Francia »). » — calque fréquent du francophone ; j’ai gardé *sono italiana* pour la forme féminine.
- Fiche « sons et orthographe » (doute A et B) : hors du périmètre de ce lot (le format n’a pas de champ pour elle) ; la ligne 5 corrigée suffit ici.

### Items
- Retenue (A) i05.accept : `["sono"]` → `["sono", "mi chiamo"]`, explain complété (« Io mi chiamo Leo est juste aussi. ») — *Io mi chiamo Leo* est correct ; l’indice peut rester replié, on ne refuse pas une bonne réponse. B jugeait l’indice suffisant, mais il n’est pas toujours lu.
- Retenue (A) i08.distractors : `["ti"]` → `["Ti"]` — la minuscule trahissait le distracteur ; la casse est ignorée à la notation.
- Retenue (A) i10.accept : `[]` → `["Sei di dove?"]`, explain : « … La question commence par di dove. » → « … L’ordre le plus courant est Di dove sei ? À l’oral, on entend aussi Sei di dove ? » — ordre familier mais très répandu, et la consigne « Tu es d’où ? » y pousse ; ce n’est pas une faute.
- Retenue (B) i13.prompt fr : « Écris en italien : « Je suis français. » ou « Je suis française. » » → « Écris en italien : « Je suis français » (ou « française »). » — se lisait comme deux phrases à écrire.
- Retenue (A, B) i14.accept : `["Buongiorno"]` → `["Buongiorno", "Buon giorno"]`, avec une glose `buon giorno` (`isNew: false`, « Autre graphie, plus rare, de buongiorno. ») pour respecter l’invariant des formes vues ; explain → « Buongiorno (on l’écrit le plus souvent en un seul mot). … » — la graphie en deux mots est admise par les dictionnaires.
- Retenue (B) i14.prompt : ajout de « Le matin, » (fr) / « In the morning, » (en) — sans moment de la journée, *buonasera* serait aussi juste.

### Typographie française
- Retenue (A ; B en doute) tous les champs `fr` : apostrophe droite → ’ et espace ordinaire → espace fine insécable U+202F avant `: ; ? !` (80 chaînes) — règle de `src/lib/grammar/AUTHORING.md` ; textes italiens et anglais inchangés.

### Doutes non bloquants
- Une seule voix féminine (Paola) lit aussi Leo : déjà signalé en REVIEW ; la glose de *francese* (invariable) limite le risque de confusion.
- *lei* / *Lei* de politesse : à traiter dans l’unité qui introduira le vouvoiement.
- Audios i11 et i12 à générer avant publication.

## Vérifications
- `npx tsc --noEmit -p packages/content` : OK.
- `npx vitest run` (packages/content) : 2 fichiers, 32 tests, OK.
- `npm run units:check` : code de sortie 1 — seulement `missing_audio` sur i11 et i12 (l’unité est désormais vue comme publiée) ; aucune autre violation (`unknown_word` compris).
