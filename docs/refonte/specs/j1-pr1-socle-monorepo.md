# Jalon 1, PR 1 — Spec du socle monorepo

Auteur : architecte (session principale). Exécutant : agent `implementer`. Référence : `d-architecture.md` §3.

## 0. Décision d'implantation

L'application actuelle **reste à la racine du dépôt, gelée**, jusqu'à la bascule : elle n'est pas déplacée dans `legacy/`. La nouvelle application se construit à côté, dans `apps/` et `packages/`.

Pourquoi cet écart avec le point 19 validé : déplacer l'app casserait la configuration Vercel de production, la CI et toutes les branches en cours (`redesign/journal`, relecture des banques), pour un bénéfice nul avant la bascule. L'esprit du point 19 est tenu : un seul dépôt, une seule CI, ancienne app en correctifs de sécurité seulement. Le déplacement physique se fera à la bascule, d'un seul `git mv`.

Conséquence : **cette PR ne modifie aucun fichier de `src/`, `e2e/`, `supabase/`, `scripts/`**. Elle ajoute des dossiers et touche quatre fichiers de configuration racine (§1).

## 1. Fichiers racine modifiés (les seuls)

| Fichier | Changement |
|---|---|
| `package.json` | `"workspaces": ["apps/*", "packages/*"]` ; scripts `refonte:typecheck`, `refonte:lint`, `refonte:test`, `refonte:check` (les trois à la suite) qui lancent les scripts des workspaces (`npm run <script> --workspaces --if-present`). Les scripts existants ne changent pas |
| `tsconfig.json` | `"exclude": ["node_modules", "apps", "packages"]` |
| `eslint.config.mjs` | ajouter `"apps/**"` et `"packages/**"` aux `globalIgnores` (chaque workspace a sa propre configuration) |
| `.github/workflows/ci.yml` | dans le job `check`, une étape `npm run refonte:check` après `npm run check`. Rien d'autre |

`vitest.config.mts` n'inclut déjà que `src/**` : ne pas le toucher. Après `npm install`, `package-lock.json` change : c'est attendu. Vérifier que `npm run check` et `npm run build` de l'ancienne app passent toujours.

## 2. Arborescence à créer

```
packages/
  tsconfig.base.json        strict, noUncheckedIndexedAccess, moduleResolution bundler, noEmit, lib esnext (PAS de "dom")
  eslint.base.mjs           typescript-eslint recommandé + frontières (§5)
  schemas/                  @dailylingua/schemas
  core/                     @dailylingua/core
```

Chaque paquet : `package.json` (`"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }` — sources TypeScript consommées telles quelles, pas d'étape de build), `tsconfig.json` (étend la base), `eslint.config.mjs`, `vitest.config.ts`, scripts `typecheck` (`tsc --noEmit`), `lint`, `test` (`vitest run`). Imports relatifs à l'intérieur d'un paquet ; `@dailylingua/schemas` depuis `core`. Pas d'alias `@/`.

`apps/` reste vide dans cette PR (créer `apps/.gitkeep`).

## 3. `@dailylingua/schemas`

Dépendance : `zod` (même version que la racine). Contenu, écrit **à neuf** en s'inspirant de `src/lib/schemas/common.ts` :

- `cefrLevelSchema` (`A1`…`C2`), `cefrLevels`, type `CefrLevel`.
- `languageCodeSchema` : chaîne `^[a-z]{2,3}$`.
- `dateKeySchema` : `YYYY-MM-DD`, type `DateKey`.
- `skillSchema` : `reading | listening | writing | speaking`.
- `cardKindSchema`, `cardStateSchema`, `reviewRatingSchema` (1..4) : mêmes valeurs que `j1-pr1-schema-app.md` §2.2.
- `profileSchema`, `enrollmentSchema`, `skillEstimateSchema`, `cardSchema`, `reviewLogSchema` : formes **camelCase** des tables de `j1-pr1-schema-app.md` (les dates en chaînes ISO).
- `saveProfileInputSchema` : `nativeLanguage`, `uiLanguage`, `timeZone`, `reminderTime` (`HH:mm` ou null).
- `localizedTextSchema` : `{ text: string, lang: languageCode }` — remplace tous les champs `*_fr`. **Aucun champ dont le nom contient une langue.**

Tests : chaque schéma accepte un exemple valide et refuse les cas limites évidents.

## 4. `@dailylingua/core`

Domaine pur. Dépendances : `@dailylingua/schemas`, `ts-fsrs`. **Avant d'utiliser `ts-fsrs`, lis ses types et son README dans `node_modules/ts-fsrs`** : n'écris rien de mémoire. Vérifie sa licence (MIT attendu) et note la version installée dans ton rapport.

| Module | Contenu |
|---|---|
| `dates` | Copie adaptée de `src/lib/domain/dates.ts` avec ses tests. Ajouter `learningDay(instant, timeZone)` : le jour d'apprentissage va de **04:00 à 03:59 locales** (une action à 00:30 compte pour la veille), et `localTime(dateKey, 'HH:mm', timeZone) → Date` |
| `levels` | Copie adaptée de `src/lib/domain/levels.ts` avec ses tests. Ajouter l'échelle continue : `levelToValue(level)` = milieu de la bande (A1 → 1.5, A2 → 2.5 … C2 → 5.5 ; 0 à 1 = A0) et `valueToLevel(value)` → `'A0' | CefrLevel` |
| `languages` | Registre des langues cibles, repris de `src/lib/domain/languages.ts` **sans `nameFr`** et **avec le français** (`fr`, `dir: 'ltr'`, mêmes champs que les autres). `languageDisplayName(code, uiLocale)` via `Intl.DisplayNames` (repli : `nativeName`, puis le code). `isValidNativeLanguage(code)` : toute langue que `Intl.DisplayNames(['en'], {type:'language'})` sait nommer et dont le code a 2 ou 3 lettres. `canLearn(nativeLanguage, target)` : faux si identiques. `textDirection(code)` pour une langue d'interface (`ar`, `he`, `fa`, `ur` → `rtl`) |
| `memory/fsrs` | Enveloppe de `ts-fsrs` : types `MemoryState` (`state`, `stability`, `difficulty`, `dueAt`, `lastReviewAt`, `reps`, `lapses` — mêmes noms que la table `card`), `newCardState(now)`, `schedule(state, rating, now, { targetRetention })` → nouvel état + `scheduledDays` + `elapsedDays`. Rétention cible : 0,90 par défaut, bornée à 0,80-0,95. Rien de `ts-fsrs` n'apparaît dans les types exportés |
| `memory/legacy-leitner` | `LEITNER_INTERVALS_DAYS = [1,2,4,8,16,32,64]` et `leitnerToMemoryState({ box, dueOn, lastReviewedOn, reviewCount, againCount, known }, timeZone)` : **exactement** la règle de `j1-pr1-schema-app.md` §4.1 (stabilité = intervalle, difficulté 5.0, échéance à 04:00 locales, dernière révision à 12:00 locales). Un test documente chaque boîte, et un test vérifie qu'une carte convertie puis notée « good » par `schedule` reçoit un intervalle ≥ 1 jour et une échéance postérieure à l'ancienne |
| `memory/queue` | `dueCards(cards, now)` trié par échéance ; `capQueue(cards, { maxMinutes, secondsPerCard })` ; `spreadBacklog(cards, now, { days })` : étale un retard sur plusieurs jours sans jamais avancer une échéance |

Tests Vitest pour chaque module (cas nominaux, bornes, fuseaux `Europe/Paris`, `Asia/Tokyo`, `America/Los_Angeles`, changement d'heure). Aucune fonction ne lit l'horloge : `now` est toujours un paramètre.

## 5. Frontières d'import (lint)

Dans `packages/eslint.base.mjs`, `no-restricted-imports` interdit dans `schemas` et `core` : `react`, `react-dom`, `next` et `next/*`, `@supabase/*`, `@anthropic-ai/*`, `server-only`, tout chemin commençant par `../../src` ou `@/`. `schemas` n'importe pas `core`. Un test (`packages/boundaries.test.ts` ou dans `core`) parcourt les sources des deux paquets et échoue si un import interdit apparaît : le lint peut être contourné, pas ce test.

## 6. Ce qu'il ne faut pas faire

- Ne déplace ni ne modifie rien dans `src/`, `supabase/`, `e2e/`, `scripts/`, `docs/`.
- Pas de `packages/data`, `packages/ai`, `packages/content`, `packages/i18n` ni d'`apps/web` : PR suivantes. (Un autre agent dépose `packages/data/src/database.app.types.ts` : ne crée pas ce dossier.)
- Pas de XP, de série ni de séance : jalon 2.
- Pas de nouvelle dépendance au-delà de `ts-fsrs` et de l'outillage (`typescript-eslint` si absent). Les versions de `zod`, `typescript`, `vitest`, `eslint` sont celles de la racine.

## 7. Critères de fin

À la racine : `npm install` sans erreur ; `npm run refonte:check` vert ; `npm run check` et `npm run build` (ancienne app) toujours verts. `git diff --stat` : aucun fichier existant modifié hors les quatre du §1 et `package-lock.json` ; aucune conversion CRLF. Commits atomiques sur la branche du lot. Le message final donne les commandes lancées, leurs résultats réels (nombre de tests), la version et la licence de `ts-fsrs`, et tout écart à cette spec.
