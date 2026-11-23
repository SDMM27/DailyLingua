# Jalon 4, PR 2 — Carte du parcours, unités Écriture, reprise des erreurs

Complète [j4-parcours-debutant.md](j4-parcours-debutant.md), [j4-pr1-architecture.md](j4-pr1-architecture.md) et [j4-ecrans.md](j4-ecrans.md) (variante C). La PR 1 a livré l'unité 1 jouable en italien et en russe.

## 0. Décision qui modifie le cadrage

L'ancien module d'alphabet russe (`src/lib/alphabets/ru.ts`) a **5** groupes de lettres, pas 4, et le dialogue de l'unité 1 emploie déjà des lettres du dernier groupe (я, ь). Donc :
- **5 unités Écriture (E1 à E5), une par groupe, toutes avant les situations** (ordres 1 à 5) ; l'unité russe 1 passe à l'ordre 6.
- Cela remplace « 4 unités entremêlées » de `j4-parcours-debutant.md` §3 (à corriger dans ce document). La translittération repliable des unités 1 à 3 reste l'aide de transition.

## 1. Unités Écriture (`kind: "script"`)

### 1.1 Format (extension de `unitSchema`)
`unitSchema` devient une union discriminée par `kind` :
- `situation` : inchangé.
- `script` : mêmes champs communs (`id`, `language`, `level: "A0"`, `order`, `title`, `situation`, `minutes`, `canDo`, `items`, `lessons`, `test`, `aiReview`, `status`), **sans** `dialogue`, `keyPhrases`, `grammar`, `conversation`, `grammarPointId`, et avec :
```
letters: [{
  upper, lower, latin,                 (translittération du système de ru.ts)
  name: string,                        (nom de la lettre, ex. "бэ")
  kind: "same" | "false-friend" | "new" | "sign",
  lookalike: string | null,            (pour un faux ami : la lettre latine trompeuse)
  sound: L10n,                         (description du son pour un francophone / anglophone)
  example: { word, translation: L10n, audio: string | null }
}] (4–8)
words: [{ id, text, latin, translation: L10n, audio: string | null }] (8–14)   (mots lisibles avec les lettres vues jusqu'ici)
```
- Étapes : `l1` = `letters` (découverte, items de reconnaissance) puis `sounds` (écoute → lettre) ; `l2` = `words` (lire un mot → son sens ou sa translittération) puis `reading` (écouter → choisir le mot écrit) ; `l3` = `test` (10 items, seuil 8).
- Items : les genres existants suffisent (`mcq`, `listen_mcq`, `match`, `type` pour la translittération en latin). Pas de saisie en cyrillique en A0.

### 1.2 Invariants (`checkUnit`, `units:check`)
- **Lettres cumulées** : chaque mot de `words` et chaque texte cyrillique d'un item n'emploie que les lettres de cette unité et des unités Écriture d'ordre inférieur (accents toniques ignorés). C'est la règle qui rend l'unité faisable sans aide.
- Les lettres des 5 unités couvrent exactement l'alphabet de `ru.ts`, sans doublon.
- `latin` de chaque mot = translittération lettre à lettre calculée depuis `ru.ts` (le script la vérifie).
- Les règles communes (ids, items référencés, test de 10 items vus, statut) s'appliquent.

### 1.3 Contenu
E1 à E5 reprennent les groupes de `ru.ts` (lettres, sons, exemples, mots). Rédaction par l'agent pédagogue, deux relectures natives, arbitrage, audio Piper (exemples et mots, voix `ru_RU-denis-medium`, accents retirés avant synthèse), écoute par le responsable produit avant publication.

### 1.4 Notation et XP
Aucun changement d'ingestion : les unités Écriture passent par les mêmes événements et règles (`unit_item_attempt`, `unit_step_completed`, `unit_test_submitted`, `unit.complete`). `stepValidated` et `gradeUnitTest` ne lisent que `lessons`, `items` et `test`. Pas de cartes de phrases-clés pour une unité Écriture (pas d'étape `key_phrases`) ; les mots de `words` ne deviennent pas des cartes non plus dans cette PR.

## 2. Carte du parcours

- Route `/(app)/parcours/[lang]` (RSC, `await connection()`), langue = langue cible du profil, sinon 404. Données : `unitsFor(lang)` visibles (publiées, ou brouillons avec le drapeau), progression de l'apprenant (`getUnitProgress`), en un seul aller-retour.
- Écran « La ligne » de la variante C (`j4-ecrans.md` §3.1) : stations faites (avec leur « Je peux… »), station en cours avec « Continuer », stations à venir en pointillés, **aucun cadenas** ; intertitres « Écriture · A0 » et « Situations · A1 » ; compte honnête « n unités sur N ». La station en cours = première unité non réussie dans l'ordre.
- Toucher une station ouvre la feuille d'unité (§3.2) : objectifs, « Commencer » ou « Continuer », « Je connais déjà : passer le test ».
- **4e onglet « Parcours »** : visible seulement si la langue cible a au moins une unité visible et que le niveau de l'apprenant est A0 à A2 (même calcul que la carte « Aujourd'hui »). Sinon, trois onglets.
- Fin d'unité : « Unité suivante » ouvre l'unité suivante dans l'ordre ; « Retour au parcours » ouvre la carte. La carte « Aujourd'hui » mène à l'unité en cours (inchangé), avec un lien secondaire vers la carte.

## 3. Reprise des erreurs (le lendemain)

Les items d'une unité ne sont pas des phrases-clés : ils ne deviennent pas des cartes FSRS. À la place :
- Les items manqués au **dernier test échoué** d'une unité (`app.unit_test.missed`, lisible par son propriétaire) forment un **échauffement** proposé à partir du jour d'apprentissage suivant : carte « Revoir les n phrases d'hier » sur « Aujourd'hui », et bloc en tête de la feuille d'unité.
- L'échauffement rejoue ces items (mêmes composants), puis propose le test. Les réponses partent en `unit_item_attempt` avec la leçon d'origine de l'item : l'XP suit les règles existantes (un item déjà réussi ne rapporte plus rien), **aucune règle nouvelle**.
- L'échauffement disparaît quand l'unité est réussie, ou quand les items ont tous été réussis depuis le test.
- Le texte de l'écran d'échec redevient : « Les n phrases manquées reviennent demain, avant le test. » (vrai désormais.)
- Données : `getLastFailedTest(client, userId, unitId)` et `getPendingWarmups(client, userId, language)` dans `packages/data` (client de l'utilisateur, RLS), à partir de `unit_test` et des tentatives `attempt` (step `unit`) postérieures.

## 4. Corrections issues des essais de la PR 1
1. En révision d'une unité déjà réussie, n'afficher **aucune** estimation d'XP (le serveur n'en donne pas).
2. Écran d'échec : « tes n XP restent acquis » compte l'XP gagnée **dans l'unité** (somme des lignes `focus.*` de ses tentatives, lue côté serveur), pas celle de la séance en cours ; à défaut de donnée fiable, retirer le chiffre.
3. `match` : après un deuxième essai faux, les paires fausses ne gardent pas la bordure verte.
4. Corrections de la DA (`j4-ecrans.md` §8) dans `e-direction-artistique.md` et la mention du cadenas de la maquette 06.

## 5. Hors PR 2
Badges (jalon 7, aucun système de badges n'existe encore), unités 2 à 10 (PR 3), page d'unité ouverte hors ligne à froid, bilan de fin de parcours (PR 3).

## 6. Lots
| Lot | Contenu | Agent | Fichiers |
|---|---|---|---|
| F | §1.1, §1.2 : schéma `script`, `checkUnit`, `units:check`, lecteur d'unité pour les étapes `letters`, `sounds`, `words`, `reading`, script audio étendu aux lettres et mots | implementer | `packages/schemas/src/unit.ts`, `packages/content/src/check.ts` + tests, `scripts/units-*.mts`, `apps/web/src/components/unit/**` (étapes Écriture uniquement) |
| G | §2, §3, §4 : carte, onglet, feuille, unité suivante, échauffement, lectures `packages/data`, corrections | implementer | `apps/web/src/app/(app)/parcours/[lang]/page.tsx`, `components/path/**`, `layout/tab-bar.tsx`, Today, `packages/data/src/unit-*.ts`, i18n, `docs/refonte/e-direction-artistique.md` |
| H | §1.3 : contenu E1 à E5 | agent pédagogue, puis relecteurs et arbitre | `packages/content/src/units/ru/e1-…` à `e5-…`, ordre de l'unité 1 |

F et G se partagent `components/unit/**` : G ne touche qu'à `unit-result.tsx`, `item-view.tsx` (correction 3) et `unit-flow.tsx` (échauffement) ; F ajoute des fichiers d'étapes Écriture et un aiguillage dans `unit-player.tsx`. Les fichiers communs sont signalés dans chaque brief.
