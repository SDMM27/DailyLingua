# Jalon 6.3 — Calibrage du test de niveau et garde-fous

Spec d’implémentation de la partie « test adaptatif et bilan » du [§6.3](j6-progres.md#63--test-adaptatif-bilan-et-immersion), pour le russe et l’italien. Le journal d’immersion fait l’objet d’une [fiche distincte](j6-pr-immersion.md).

## État des lieux (2026-11-27, `dev` au commit `3d2412e`)

- **Le test de niveau n’existe que dans l’ancienne app** (`src/lib/domain/placement.ts`, `src/app/niveau`). `apps/web`, servi en production, n’a pas d’écran de test : l’inscription y enregistre un niveau déclaré. Le moteur actuel est déjà adaptatif par niveau : blocs de cinq questions d’un même niveau, réussis à partir de trois bonnes réponses, montée ou descente jusqu’à la première frontière, 30 questions au plus. Les niveaux des questions sont éditoriaux.
- **Couverture des banques** : 60 questions par langue, dix par niveau (quatre de grammaire, trois de vocabulaire, trois de compréhension écrite). Les deux banques ont été relues selon la grille `x0-placement-2026-11-10` (italien : PR #62 ; russe : relecture du 2026-11-27). Le test ne couvre ni l’écoute, ni l’écriture, ni la parole.
- **Données de réponses** : en production, `app.assessment_result` contient 3 tests de placement terminés en italien et 1 en russe, avec leurs réponses. Aucun bilan indépendant n’est apparié (la fiche des [bilans pilotes](../../assessment/pilot-results.md) est vide). Le bilan de fin de parcours d’`apps/web` n’écrit pas encore dans `assessment_result`.

**Conséquence** : les données ne permettent pas de calibrer les questions. Cette livraison pose les règles et les garde-fous, et les applique aux données réelles. Le test garde la sélection par niveau éditorial tant que le calibrage n’est pas atteint.

## Règles

| Sujet | Règle |
|---|---|
| Observation d’une question | Première réponse d’un test terminé, passé sur la version courante de la banque (`payload.bank_version`). Les tests passés sur une version antérieure ne comptent pas : le dépôt ne conserve pas la correspondance entre versions. « Je ne sais pas » compte comme une erreur. Un test par compte, langue et version : le plus ancien. |
| Question calibrée | Au moins **30** observations, provenant d’au moins **10** comptes. La difficulté retenue est la part de bonnes réponses, avec son intervalle de Wilson à 95 %. |
| Case calibrée | Une case (niveau × type de question) est calibrée lorsque toutes ses questions le sont. |
| Adaptation activée | Pour une langue et un type de question, seulement si les six niveaux sont calibrés. Sinon, la sélection reste celle du moteur actuel, et le rapport indique « calibrage insuffisant ». |
| Compétences mesurées | La compréhension écrite du test alimente **Lire**. La grammaire et le vocabulaire informent le niveau global sans constituer une compétence du tableau. **Écouter**, **Écrire** et **Parler** restent « Non mesuré » par le test, quelle que soit la langue. Une compétence est « Non mesuré » pour une langue si sa banque a moins de deux questions par niveau pour ce type. |
| Bilan et estimation continue | Le résultat du bilan reste une mesure distincte (`assessment_result`, `kind = 'assessment'`). L’écart est `|bilan − estimation continue|` sur l’échelle de 0 à 7 (`levelToValue`). La cible est un écart ≤ 0,5, soit un demi-niveau. L’estimation comparée doit être antérieure au bilan et ne pas reposer sur ses réponses. |
| Projection | Une fourchette n’est calculée qu’avec au moins **trois** mesures comparables de la même compétence (même langue, même type de mesure), étalées sur au moins **60 jours**. Sinon : pas de projection. La fourchette prolonge la tendance linéaire sur l’horizon demandé et s’élargit de l’écart résiduel maximal, avec au moins un demi-niveau de chaque côté. Elle est bornée à l’échelle de 0 à 7. |

Les seuils de 30 observations et de 10 comptes sont des points de départ. Ils seront revus avec les premiers résultats, comme les seuils du §6.2.

## Livraison

1. `packages/core/src/placement-calibration.ts` : fonctions pures et testées pour la couverture d’une banque, le calibrage des questions et des cases, l’activation par type, l’écart bilan–estimation et la projection. Chaque fonction retourne explicitement « insuffisant » ou `null` quand le garde-fou s’applique.
2. `npm run --silent placement:calibrate -- "$TEMP/export.json"` : rapport JSON en lecture seule. L’entrée est un export de `assessment_result` (`language`, `kind`, `taken_at`, `user_id`, `payload`). Le script lit les banques de `src/lib/placement/banks`. Pour le russe et l’italien, il donne la couverture, l’état de chaque case et l’activation par type. Le rapport ne contient ni identifiant de compte ni réponse individuelle.
3. Résultat sur les données de production du 2026-11-27, consigné ci-dessous.

### Utilisation

```
npx supabase db query --linked "select user_id, language, kind, taken_at, payload from app.assessment_result where kind = 'placement'" > "$TEMP/export.json"
npm run --silent placement:calibrate -- "$TEMP/export.json"
```

L’export contient des données de comptes : le garder hors du dépôt. Il peut être un tableau de lignes ou la sortie brute de `supabase db query` (objet avec une clé `rows`). Le script ignore les tests terminés sur une autre version de banque ou non terminés, et ne lit que le russe et l’italien.

### Résultat du 2026-11-27

Export de `app.assessment_result` (tests de placement, russe et italien) après la relecture des deux banques. Russe : 0 test retenu, 1 écarté. Italien : 0 test retenu, 3 écartés. Les tests écartés ont été passés sur la version `2026-10-19`, antérieure à la relecture. Aucune case n’est calibrée et aucun type n’est adaptatif. Le statut des deux langues est « calibrage insuffisant ». Le test garde la sélection par niveau éditorial. **Lire** est mesurable par le test dans les deux langues ; **Écouter**, **Écrire** et **Parler** restent « Non mesuré ». Faute de bilan apparié et de série de mesures comparables, l’écart bilan–estimation et la projection ne sont pas calculables.

## Hors de cette livraison

- **Porter l’écran du test dans `apps/web`.** C’est un nouvel écran, à maquetter avant implémentation. Le choix du moment (inscription, page Progrès ou les deux) relève du produit.
- **Enregistrer le résultat du bilan de fin de parcours** dans `assessment_result`, ventilé par compétence, pour mesurer l’écart avec l’estimation continue.
- **Afficher une projection** sur la page Progrès, une fois le garde-fou franchi par des données réelles.
