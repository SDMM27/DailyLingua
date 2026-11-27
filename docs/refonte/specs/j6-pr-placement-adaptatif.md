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

- **Enregistrer le résultat du bilan de fin de parcours** dans `assessment_result`, ventilé par compétence, pour mesurer l’écart avec l’estimation continue.
- **Afficher une projection** sur la page Progrès, une fois le garde-fou franchi par des données réelles.

## Écran du test dans `apps/web` (maquette B, retenue le 2026-11-28)

Le test est porté dans la nouvelle app pour le russe et l’italien. Il suit la maquette B « Cartes et repères » : progression par bloc, réponses en tuiles A à D, introduction en feuille, échelle A1 à C2 au résultat et, à partir de 900 px, colonne des niveaux visités.

| Sujet | Règle |
|---|---|
| Moteur | Celui de l’ancienne app, sans changement de règles : blocs de cinq questions d’un même niveau, réussis à trois bonnes réponses, départ au niveau déclaré, 30 questions au plus. Il passe dans `packages/core`, sans dépendance à Next.js ni React. Le calibrage reste en observation : la sélection suit les niveaux éditoriaux (« calibrage insuffisant »). |
| Banques | Une seule source pour le russe et l’italien, partagée par l’ancienne app, le script de calibrage et `apps/web`. Les autres langues ne proposent pas le test. |
| Points d’entrée | Page Progrès, pour la langue active, tant qu’aucun test terminé n’existe pour la version courante de la banque. Proposition après l’inscription, avec « Plus tard » qui mène à Aujourd’hui. |
| Arrêt | « Arrêter » demande confirmation et ne produit aucun résultat. Rien n’est enregistré, et le test reprend du début. |
| Enregistrement | Le serveur rejoue les réponses et calcule seul l’estimation et la confiance. Il ajoute une ligne `assessment_result` (`kind = 'placement'`), avec une charge au format lu par `placement:calibrate` : `status`, `bank_version`, `start_level`, `estimated_level`, `confidence`, `chosen_level` et `answers`. Il met à jour **Lire** dans `skill_estimate` (`source = 'placement'`) avec le niveau gardé par l’apprenant. L’incertitude vaut 0,5, 0,75 ou 1 selon que la confiance est haute, moyenne ou faible. Les autres compétences ne changent pas. L’écriture passe par le rôle de service, filtrée sur l’utilisateur de la session, comme le journal d’immersion. Aucune migration n’est nécessaire. |
| Résultat | Il présente le niveau estimé, la confiance, **Lire** mesuré et les trois autres compétences « Non mesuré » par ce test. L’apprenant peut garder l’estimation ou toucher un autre niveau de l’échelle. Il arrive ensuite sur le parcours de la langue. |
| Langue | Interface en français et en anglais. Questions dans la langue cible, avec `lang`. Couleur d’accent tirée de `languageStyle()`. |

**Recette.** Couvrir un compte neuf, l’abandon en cours de test, le choix d’un autre niveau, une réponse falsifiée refusée par le serveur et l’isolation entre deux comptes. Vérifier le russe et l’italien, en clair et en sombre, à 390 et 1280 px, au clavier.
