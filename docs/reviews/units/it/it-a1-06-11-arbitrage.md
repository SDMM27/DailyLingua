# Arbitrage unités — italien

Fichiers : `packages/content/src/units/it/06-journee.ts`, `07-courses.ts`, `08-gouts.ts`, `09-chez-moi.ts`, `10-week-end.ts`, `11-bilan.ts` · Date : 2026-11-24 · Grille : unités J4 (`j4-pr1-architecture.md` §1.2–1.3, `j4-pr3.md` §1–2) · Passes : `it-a1-06-11-A.md`, `it-a1-06-11-B.md` (claude-opus-5-5)

## Synthèse
6 éléments · 6 approuvés · 0 restent brouillons · 29 corrections appliquées · 7 remarques écartées (dont 2 en partie)
Accord entre passes : 16 remarques vues par les deux (dont *ore* et *piace*, en doute chez B), 9 par A seule, 5 par B seule, 3 ajoutées par l’arbitre

Statut posé sur les six fichiers : `aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" }` et `status: "reviewed"` (pas `published` : la publication attend l’écoute de l’audio). Aucun champ de relecture humaine touché, aucun id renommé. Les commentaires `// REVIEW:` des sept répliques ont été retirés : les deux passes les ont tranchés de la même façon (tout est gardé).

Contrôles : `npm run units:check` vert (nouveaux mots : 36, 29, 28, 28, 16 ; seuls restent les fichiers audio à générer, attendus avant publication), `npm run typecheck` et `npm test` verts dans `packages/content` (57 tests).

### Conventions appliquées
- **Prépositions articulées** (convention de l’unité 5, relue) : lemme composé `préposition + article` (`a + le`, `da + la`, `in + il`…). Une forme est nouvelle seulement la première fois que sa préposition est enseignée avec l’article : *a* et *in* + article dès l’unité 5, donc `all'`, `alle`, `al`, `nel`, `nella` sont `isNew: false` dans les unités 6 à 10 ; *da* + article apparaît en unité 6 (`dalle`, `isNew: true`), donc `dalla` (unité 10) est `isNew: false`. Les lemmes `a` / `in` / `da` des formes contractées des unités 6 à 10 ont été réécrits au format composé (ajout de l’arbitre, sans effet sur les comptes).
- **Homonymes** : un lemme différent qui se ressemble est nouveau. *Ora* « heure » (nom) n’est pas *ora* « maintenant » (adverbe, unité 1) ; le verbe *piacere* n’est pas *Piacere!* (le nom « plaisir », unité 1). Les deux restent `isNew: true`.
- **Variantes ajoutées à `accept`** : chaque mot est glosé dans l’unité (sinon `unknown_word`), ou la consigne est reformulée pour ne pas appeler la variante.
- **Consignes d’écoute** : un `listen_mcq` est lu avec la voix du premier locuteur (Elsa, voix de femme) ; aucune consigne ne dit plus « il ».

## it-a1-06-journee
Décision : approuvé
- Retenue (A, B) items[i08].accept : `[]` → `["Dalle nove alle cinque lavoro."]` — complément de temps en tête, correct et courant ; item du test et du bilan.
- Retenue (A, B) items[i14].prompt / accept : « … tous les jours » → « … chaque jour » ; ajout de « Pranziamo ogni giorno insieme » et « Noi pranziamo ogni giorno insieme » ; explain « Tous les jours = ogni giorno » → « Chaque jour = ogni giorno » — la consigne n’appelle plus *tutti i giorni*, et les deux ordres naturels sont acceptés.
- Écartée en partie (B) items[i14] : ajout de *tutti i giorni* et de la glose `tutti` — la reformulation de la consigne suffit (solution de repli proposée par B elle-même) et évite un lemme de plus dans l’unité 6.
- Retenue (A, B) glosses `all'`, `alle` : `isNew: true` → `false`, lemmes `a + l'`, `a + le` — *a* + article est enseigné en unité 5 (voir Conventions). `dalle` reste nouveau (lemme `da + le`).
- Retenue (A) items[i09].explain : ajout « On entend aussi « Che ora è ? », au singulier. » (et en) — tournure aussi courante, l’apprenant doit savoir qu’elle n’est pas fautive ; le distracteur *è* reste faux avec les jetons donnés (*Che ore è*).
- Écartée (A ; doute B) glose `ore`.isNew → `false` : *ora* « heure » est un autre lemme que *ora* « maintenant » (décision produit sur les homonymes).
- REVIEW d5 (horaires de Giulia) : tranché par A et B, plausible ; commentaire retiré.

## it-a1-07-courses
Décision : approuvé
- Retenue (A, B) items[i13].accept : ajout de « No, basta così, grazie », « No, grazie, basta così », « Basta, grazie », « È tutto, grazie », « Grazie, è tutto » ; retrait de « Basta così grazie » (absorbé : la ponctuation interne est ignorée) ; explain complété par *è tutto, grazie* — réponses natives courantes, item du test. Gloses ajoutées : `è` (essere, `isNew: false`) et `tutto` (`isNew: true`, première apparition du lemme).
- Retenue (B) items[i11].prompt : « Qu’est-ce qu’il demande ? » → « Qu’est-ce qu’elle demande ? » (en : « What does she ask for? ») — voix féminine.
- Retenue (A, B) glose `etti`.meaning : « fois cent grammes » → « cent grammes (pluriel de etto) » (en « hundred grams (plural of etto) ») — formulation plus juste que les deux propositions (« centaines de grammes » de B est faux pour *due etti*).
- Retenue (A) grammar.summary (fr, en), 3e ligne : « verde, verdi » → « dolce, dolci » — exemple tiré de l’unité (glose, conversation c3).
- REVIEW d10 (« ho la mia borsa ») : tranché par A et B, naturel ; commentaire retiré.

## it-a1-08-gouts
Décision : approuvé
- Retenue (conséquence de 07-i13) glose `tutto`.isNew : `true` → `false` — le lemme est maintenant introduit en unité 7.
- Retenue (B) dialogue.lines[d4].translation : « Pas beaucoup, mais… » → « Pas très bien, mais… » (en « Not much » → « Not really ») — réponse naturelle à « Tu connais… ? ».
- Retenue (A) items[i13].accept : `["Anche a me"]` → ajout de « Anche a me piace » et « Anche a me piace la pasta » — phrases complètes correctes, tous les mots glosés.
- Écartée (A ; doute B) glose `piace`.isNew → `false` : le verbe *piacere* est un autre lemme que le nom *piacere* de *Piacere!* (unité 1).
- REVIEW d1 et d4 : tranchés par A et B, naturels ; commentaires retirés.

## it-a1-09-chez-moi
Décision : approuvé
- Retenue (A) items[i10] : « Il y a un lit et un bureau » (distracteur *Ci sono*, qui est en fait correct devant deux sujets coordonnés) → prompt « Dans la chambre, il y a un lit. » (en « In the bedroom there's a bed. »), tokens `["un", "C'è", "letto", "Nella", "camera"]`, distracteur `["Ci sono"]`, answer « Nella camera c'è un letto. », accept `["C'è un letto nella camera."]`, explain « Un letto est singulier : c'è. Ci sono, c’est devant un pluriel (ci sono due letti). » — une seule bonne option désormais ; l’ancienne explication présentait l’accord de proximité comme une règle.
- Retenue (A, B) gloses `hanno`, `abbiamo`, `avete`.isNew : `true` → `false` — lemme *avere* enseigné en unité 4.
- Retenue (A) glose `cucina` (lemme `cucina`).isNew : `false` → `true` — le nom n’a jamais été compté (les unités 6 et 8 le rangent sous `cucinare`).
- Retenue (A, B) d2 / k2 / i03 traduction fr : « Qu’il est beau ! Il a combien de pièces ? » → « Que c’est beau ! Il y a combien de pièces ? » ; k2 et i03 : « Il y a combien de pièces ? ».
- Ajoutée (arbitre) d3 traduction fr : « Il a trois chambres… » → « L’appartement a trois chambres… » — même défaut d’antécédent que d2, et la traduction garde l’emploi de *avere* qu’enseigne l’unité.
- Retenue (B) glose `avete`.note : « Giulia parle à Leo et à ses colocataires » → « Giulia parle à Leo, mais pense aussi à ses colocataires : voi avete. » (et en) — les colocataires sont absents.
- Retenue (B) items[i20].prompt : « … ton nouvel appartement » → « … ton nouveau logement (la casa) » (en « your new home (la casa) ») — la bonne réponse est au féminin (*è piccola*).
- Écartée (A) d9 « Abbiamo la pizza » → « una pizza » : correct et naturel à l’oral (« on a de la pizza »), B le garde ; préférence de style.
- REVIEW d10 (« Avete una bella casa! ») : tranché par A et B, naturel ; commentaire retiré.

## it-a1-10-week-end
Décision : approuvé
- Retenue (A, B) items[i13].accept / explain : ajout de « Buona fine settimana » (usage natif très répandu, admis par la Crusca) ; glose `buona` (lemme *buono*, `isNew: false`) ; explain « Buon fine settimana : il fine settimana (le week-end) est masculin. On entend aussi très souvent buona fine settimana, et buon weekend. » (et en).
- Écartée en partie (B) items[i13] « Buon week-end » : graphie minoritaire ; le tiret devenant une espace, il faudrait gloser *week* et *end*. *Buon weekend* reste accepté.
- Retenue (B) items[i11].prompt et items[i12].prompt : « il » → « elle » (en « he » → « she ») — voix féminine ; i11 est dans le bilan.
- Retenue (A, B) glose `dalla`.isNew : `true` → `false`, lemme `da + la` — *da* + article enseigné en unité 6 (voir Conventions).
- Retenue (B) ajout de la glose `martedì` (`isNew: true`) et de la paire « martedì / mardi » dans items[i16], à la place de « domenica » (déjà dans le dialogue) — la semaine était sans mardi ; i16 couvre maintenant lunedì à venerdì, ce qui rend son explication (« de lunedì à venerdì, l’accent est sur le ì final ») exacte.
- Écartée (A, B) enrichissement lexical vers 40 mots : décision produit, l’unité 10 est une unité de révision ; 16 mots nouveaux, sans remplissage.
- Retenue (A) items[i01].options[c] : « mezzogiorno » → « a mezzogiorno » — parallèle avec *alle nove*, *alle otto*.
- Retenue (A, B) items[i10].prompt.fr : « avec les amis » → « avec des amis ».
- Retenue (A, B) items[i14].accept : ajout de « Poi io ceno a casa ».
- Retenue (A, B) items[i18].accept : ajout de « e poi ».
- Écartée (A) d8 « dalla famiglia di Giulia » → « dai genitori di Giulia » : correct ; A et B acceptent de garder, et le changement toucherait k7, i02, i04 pour un gain faible.
- REVIEW d1 et d8 : tranchés par A et B ; commentaires retirés.

## it-a1-11-bilan
Décision : approuvé
- Retenue (A, B, modifiée) draws : `06-i08, 08-i08, 07-i09, 09-i06, 10-i15, 06-i13, 09-i13, 07-i13, 10-i11, 08-i06` → `06-i08, 07-i07, 08-i08, 09-i05, 10-i05, 06-i13, 08-i15, 07-i05, 10-i11, 09-i06` — tous dans le test de leur unité, deux par unité, jamais deux fois la même unité de suite. Couverture : -are (*lavoro*, 06-i08), l’heure (06-i13), pluriel des noms (*pesche*, 07-i07), accord de l’adjectif (*buone*, 07-i05), *piacere* et négation (08-i08), -ere (*leggono*, 08-i15), -ire (*dormo*, 10-i05), *avere* pour l’âge (09-i05, proposé par B) et à toutes les personnes (*abbiamo*, 09-i06), compréhension orale (10-i11). Sept items à produire (order, cloze, type) et trois à choisir. Écartés du tirage : 10-i15 (*giocare*, vu seulement en exercice), 07-i09 et 09-i13 (points déjà couverts) ; 07-i13 est corrigé dans son unité mais n’est plus nécessaire ici.
- Retenue (A, reformulée) situation : « … sans aide. Avec 8 bonnes réponses, ton niveau A1 est confirmé. » → « Dix questions sur les unités 6 à 10, mélangées, sans revoir les leçons. Il faut au moins 8 bonnes réponses sur 10 pour confirmer ton niveau A1. » (en « Ten questions on units 6 to 10, mixed, without going back to the lessons. You need at least 8 right answers out of 10 to confirm your A1 level. ») — la règle est dite exactement (8 sur 10 au moins), et « sans aide » n’est plus promis alors que les trous gardent leur indice.

## Points laissés au responsable
- Charge lexicale du lot (36, 29, 28, 28, 16 mots nouveaux) sous la cible de 40 à 60 de la grille, comme les unités 2 à 5 déjà relues : décision de conception, pas une faute de langue.
- L’écran du bilan annonce « 10 questions, sans aide » (`j4-pr3.md` §2.3) alors que les items à trou affichent leur indice : à harmoniser côté interface si besoin.
