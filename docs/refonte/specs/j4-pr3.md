# Jalon 4, PR 3 — Unités 2 à 10 et bilan de fin de parcours

Complète [j4-parcours-debutant.md](j4-parcours-debutant.md) (§4 les dix situations, §5 contenu, point 8), [j4-pr1-architecture.md](j4-pr1-architecture.md) (format, notation, XP) et [j4-pr2.md](j4-pr2.md) (carte, unités Écriture, échauffement).

**But** : un débutant va de l'unité 1 à l'unité 10 en italien et en russe, puis passe un bilan court qui confirme le niveau A1. Aucune migration, aucune règle d'XP nouvelle.

## 1. Contenu des unités 2 à 10

- Fichiers `packages/content/src/units/<lang>/<nn>-<slug>.ts`, ids `<lang>-a1-<nn>-<slug>` : `02-cafe`, `03-nombres-prix`, `04-famille`, `05-ou-est`, `06-journee`, `07-courses`, `08-gouts`, `09-chez-moi`, `10-week-end`. Ordres : italien 2 à 10 ; russe 7 à 15 (après E1 à E5 et l'unité 1 à l'ordre 6).
- Même gabarit que l'unité 1 (trois leçons, 10 items de test vus dans une étape, seuil 8), point de grammaire de la grille §4, 40 à 60 mots nouveaux par unité (`isNew: true`).
- **Vocabulaire cumulé** : `units:check` ne connaît que les formes d'une unité (dialogue, phrases-clés, gloses). Un mot d'une unité précédente réemployé dans une réponse attendue est donc glosé à nouveau avec `isNew: false`. Le format suffit ; aucune extension.
- Russe : translittération repliable dans les unités 2 et 3, plus à partir de l'unité 4 (`transliteration` omis) ; accent tonique (U+0301) sur tout mot de deux syllabes ou plus du texte affiché, jamais dans les réponses acceptées.
- Rédaction `pedagogue-didacticien` par lots (2 à 5, puis 6 à 10, par langue), deux passes `relecteur-natif` indépendantes et un `arbitre-relecture` par lot ; statut `reviewed`, puis `published` après l'écoute de l'audio par le responsable produit. Rapports dans `docs/reviews/units/<lang>/`.

## 2. Bilan de fin de parcours

### 2.1 Forme : un troisième type d'unité, `assessment`

Le bilan réutilise la machinerie du test d'unité : mêmes événements (`unit_test_submitted`), même notation serveur (`gradeUnitTest`), même ligne `unit_test`, même ligne `unit_progress`, même règle `unit.complete`. Il est une unité dont il n'existe que le test.

Source écrite par l'auteur (`packages/content/src/units/<lang>/11-bilan.ts`, id `<lang>-a1-11-bilan`, ordre : après l'unité 10) :
```
AssessmentUnitSource = {
  id, language, kind: "assessment", level: "A1", order,
  title: L10n, situation: L10n, minutes, canDo: [{ id, text: L10n }] (2–3),
  draws: [{ unit: UnitId, item: string }] (exactement 10),   (dans l'ordre affiché, unités mélangées)
  aiReview, status,
}
```
Le registre (`buildRegistry`) **résout** le bilan après les autres unités :
- `items` = copie des items tirés, id réécrit `<nn>-<itemId>` (`nn` = numéro à deux chiffres de l'unité source, ex. `08-i14`) ;
- `drawnFrom: Record<itemId, UnitId>` (pour l'écran d'échec) ;
- `lessons` = `[{ id: "l1", steps: [{ step: "test", itemIds: [], threshold: 0.8 }] }]` (une leçon, la seule étape est le test) ;
- `test` = `{ itemIds: <les 10 ids réécrits>, passScore: 8 }` ;
- `version` = 12 hex du SHA-256 du JSON canonique de `{ source, items }` : modifier un item tiré change la version du bilan.
- Une unité ou un item tiré introuvable fait échouer la construction du registre (comme une source invalide).

Le type `Unit` devient l'union `SituationUnit | ScriptUnit | AssessmentUnit` ; `items`, `lessons` et `test` existent sur les trois, donc `planIngest`, `gradeUnitTest` et `stepValidated` ne changent pas. Les endroits qui lisent un champ propre à un type (`keyPhrases`, `dialogue`, `letters`…) traitent le bilan explicitement (pas de cartes, pas d'audio à générer, pas d'échauffement).

### 2.2 Invariants (`checkUnit`, `units:check`)
- Chaque item tiré appartient au **test** de son unité source ; les 10 tirages sont distincts ; chaque unité source est une unité `situation` de la même langue et d'ordre inférieur ; chaque unité 6 à 10 de la langue fournit au moins un item (le bilan couvre les cinq).
- Un bilan `published` exige que toutes ses unités sources soient `published` ; `reviewed` exige qu'elles soient au moins `reviewed`.
- Les règles communes (ids, `test` de 10, seuil 8, statut et `aiReview`) s'appliquent ; `test_item_unseen` ne s'applique pas (les items sont vus dans leur unité).

### 2.3 Enregistrement et XP
- Côté serveur, rien de neuf : le bilan est réussi quand `unit_progress.passed_at` de `<lang>-a1-11-bilan` est non nul. **« A1 confirmé »** est dérivé de cette ligne, pas stocké ailleurs (pas d'écriture dans `skill_estimates` : la confirmation de palier par tâches est le jalon 6).
- XP : `unit.complete` (25 XP, une fois, dans le plafond de 2 unités par jour d'apprentissage). Le bilan n'a pas d'items d'exercice, donc pas de `focus.*`.
- Échauffement : aucun pour le bilan (ses items ne sont dans aucune étape ; un `unit_item_attempt` serait refusé `unknown_item`). `loadDueWarmups` ignore les unités `assessment`.

### 2.4 Écrans (style existant, pas de maquette)
- **Carte** : le bilan est la dernière station, sous un intertitre « Bilan · A1 ». Une fois réussi, l'en-tête de la carte affiche « A1 confirmé » au lieu du niveau.
- **Feuille d'unité** : objectifs, « 10 questions, sans aide », une seule action « Passer le bilan » (pas de « Je connais déjà », c'est déjà un test).
- **Lecteur** : ouvre directement l'étape test (pas d'introduction de leçons).
- **Fin** : réussite → « A1 confirmé » et le score ; échec → le score, « Il faut 8 sur 10 », et la liste des unités à revoir (titres des unités sources des items manqués, via `drawnFrom`), « Repasser le bilan » et « Retour au parcours ». Pas de phrase sur l'échauffement.
- « Aujourd'hui » : inchangé (la séance du texte du jour est déjà proposée à un A1 ; la carte d'unité mène au bilan quand c'est la prochaine unité, et disparaît quand tout est réussi).
- Textes fr et en dans `packages/i18n`.

### 2.5 Tests
- `content` : résolution du bilan (ids réécrits, `drawnFrom`, version qui change avec un item tiré, erreur sur un tirage inconnu), invariants §2.2 (chaque code de violation).
- `core` : `planIngest` sur un bilan publié — test réussi 8/10 → `passedAt`, 25 XP ; 7/10 → pas de `passedAt` ; deuxième réussite → 0 XP ; `unit_item_attempt` sur un item du bilan → `unknown_item`.
- `web` : carte (station et en-tête « A1 confirmé »), feuille, fin d'échec qui nomme les unités à revoir ; échauffement absent pour un bilan raté.

## 3. Hors PR 3
Écriture dans `skill_estimates` après le bilan (jalon 6), tirage aléatoire des items, bilan intermédiaire après l'unité 5, fiche « sons et orthographe » italienne à part, badges (jalon 7).
