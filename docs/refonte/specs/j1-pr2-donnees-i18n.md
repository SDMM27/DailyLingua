# Jalon 1, PR 2 — Spec de la vague 1 : inscriptions, accès aux données, messages d'interface

Auteur : architecte. Deux lots indépendants, en parallèle : **A** (`migrateur-donnees`) et **B** (`implementer`). La vague 2 (application `apps/web`) s'appuiera dessus. Références : `d-architecture.md` §3, §5, §7 ; `j1-pr1-schema-app.md`.

## Lot A — `app.save_enrollments` (SQL + pgTAP)

Nouvelle migration `20261113000100_app_save_enrollments.sql` (les migrations `20261112*` sont figées).

**`app.save_enrollments(p_enrollments jsonb) returns setof app.enrollment`** — `security definer`, `set search_path = ''`, exécutable par `authenticated` seulement. Agit sur `auth.uid()` (erreur `28000` sinon). `p_enrollments` est un tableau JSON de 1 à 4 objets :

| Clé | Type | Règle |
|---|---|---|
| `language` | texte | présent dans `app.language`, différent de `profile.native_language`, sans doublon dans le tableau |
| `daily_minutes` | entier | 5 à 120 |
| `days` | tableau d'entiers | 1..7, non vide, sans doublon ; défaut tous les jours |
| `target_level` | texte ou null | A1..C2 |
| `purpose` | texte ou null | ≤ 200 caractères |
| `start_level` | texte ou null | `A0`, A1..C2 : niveau déclaré au départ |

Effets, dans une transaction :
1. Chaque langue du tableau est insérée ou mise à jour (`active = true`, `position` = rang dans le tableau, `focus` conservé s'il existe).
2. Les inscriptions de l'utilisateur absentes du tableau passent `active = false` (jamais supprimées : les cartes et l'historique restent).
3. Pour chaque langue avec `start_level` et **sans aucune** ligne `skill_estimate` : quatre lignes (`reading`, `listening`, `writing`, `speaking`), `level_value` = milieu de la bande (A0 → 0.5, A1 → 1.5 … C2 → 6.5), `uncertainty = 1.0`, `source = 'declared'`. Des estimations existantes ne sont jamais écrasées.
4. `app.mark_active(uid)`.
5. La somme des `daily_minutes` par jour de la semaine ne dépasse pas 120 (erreur `23514`).

Erreurs : entrée mal formée `22023` ; langue inconnue `23503` ; langue maternelle, doublon, plus de 4 langues ou plus de 120 minutes un même jour `23514`.

Tests `supabase/tests/database/app_save_enrollments.test.sql` : cas nominal (2 langues), remplacement (une langue retirée devient inactive, ses cartes restent), réactivation, chaque erreur, `anon` refusé, aucun effet sur un autre utilisateur, estimations déclarées créées une seule fois, `app_active_since` posé, appel par `service_role` sans `auth.uid()` refusé. Les 30 fichiers existants restent verts. Régénérer `packages/data/src/database.app.types.ts`.

Ne rien toucher d'autre. Critères : `npx supabase db reset`, `npx supabase test db`, `npm run migrations:check`, `npm run migration:verify` verts.

## Lot B — `@dailylingua/i18n` et `@dailylingua/data` (TypeScript)

Mêmes conventions que `packages/core` (sources TypeScript exportées telles quelles, `tsconfig` étendu, eslint de base, Vitest, scripts `typecheck`/`lint`/`test`). `npm run refonte:check` doit les couvrir.

### `packages/i18n` — `@dailylingua/i18n`

- Aucune dépendance à React, Next ou `next-intl` : des données et des fonctions pures. (Ajouter ce paquet aux frontières d'import vérifiées par `packages/core/src/boundaries.test.ts` et par le lint.)
- `messages/fr.json` et `messages/en.json` : messages au format ICU MessageFormat, clés imbriquées par écran (`common`, `auth`, `onboarding`, `today`, `settings`, `errors`). Le français est la langue de référence ; ton direct, tutoiement ; l'anglais est naturel, pas calqué.
- Contenu à écrire maintenant (les écrans de la vague 2) : navigation et actions communes ; connexion, création de compte, essai sans compte, mot de passe oublié, déconnexion ; accueil d'installation en trois étapes (« ta langue maternelle », « la langue que tu apprends », « ton niveau de départ » avec `A0` = « Je débute », « ton temps par jour ») ; écran « Aujourd'hui » dans son état du premier jour (voir `docs/refonte/maquettes/maquettes.html`, écran 01 état C, et `e-direction-artistique.md` section « Densité ») ; réglages (langue de l'interface, langue maternelle, fuseau, heure de rappel) ; messages d'erreur. Aucun message culpabilisant. Au moins un pluriel ICU et une interpolation réels.
- `src/index.ts` : `uiLocales = ['fr', 'en'] as const`, `defaultUiLocale = 'en'`, `resolveUiLocale(requested: string | null | undefined, acceptLanguage?: string | null)` (la langue demandée si elle est disponible, sinon la première langue disponible de l'en-tête, sinon `en`), `loadMessages(locale)` (import dynamique du JSON), type `Messages` dérivé de `fr.json`, `messageKeys(messages)` (liste aplatie).
- Tests : mêmes clés dans toutes les langues ; mêmes variables ICU par clé ; aucune valeur vide ; `resolveUiLocale` (`fr-CA` → `fr`, `de` → `en`, en-tête `de, fr;q=0.8` → `fr`).

### `packages/data` — `@dailylingua/data`

Le dossier existe déjà avec `src/database.app.types.ts` (généré, ne pas modifier à la main ; le lot A le régénère : n'y touche pas).
- Dépendances : `@supabase/supabase-js` (version de la racine), `@dailylingua/schemas`. Pas de React, pas de Next, pas de `server-only`.
- `src/client.ts` : type `AppClient = SupabaseClient<AppDatabase, 'app'>` et `appSchema(client)` qui rend `client.schema('app')`. Le paquet ne crée **jamais** de client et ne lit aucune variable d'environnement : il reçoit un client déjà authentifié.
- `src/profile.ts` : `getProfile(client)` → `Profile | null` ; `saveProfile(client, input)` (valide avec `saveProfileInputSchema`, appelle la RPC `save_profile`, rend `Profile`).
- `src/enrollments.ts` : `listEnrollments(client)` (actives, par `position`), `saveEnrollments(client, input)` (RPC `save_enrollments` du lot A ; écris le type d'entrée d'après la spec du lot A ci-dessus et ajoute `saveEnrollmentsInputSchema` à `@dailylingua/schemas`), `listSkillEstimates(client, language)`.
- Conversion `snake_case` → `camelCase` en un seul endroit (`src/mappers.ts`), validée par les schémas Zod de `@dailylingua/schemas` à la sortie.
- Erreurs : une classe `DataError` avec un `code` stable (`unauthenticated`, `invalid`, `conflict`, `not_found`, `unknown`) déduit du `sqlstate` ; jamais le message brut de Postgres vers l'interface.
- Tests unitaires avec un client simulé (mappers, erreurs, validation des entrées). Un test d'intégration `*.integration.test.ts` qui se saute sans les variables de la base locale (même convention que `src/test/setup-env.ts` de l'app actuelle : lis-le) et qui, avec la base, crée un utilisateur de test, appelle `saveProfile` puis `getProfile`, vérifie qu'un second utilisateur ne voit rien, et nettoie. Le test d'`saveEnrollments` en intégration est écrit mais marqué à activer quand la migration du lot A est fusionnée (`describe.skipIf` sur la présence de la fonction).

Ne rien toucher dans `src/`, `supabase/`, `e2e/`, `docs/`. Critères : `npm install`, `npm run refonte:check` vert (4 paquets), `npm run check` de l'app actuelle toujours vert, fins de ligne LF, commits atomiques.
