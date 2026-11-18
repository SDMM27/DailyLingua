# Jalon 2, PR 1 — Lot W : données et routes

Auteur : architecte (session principale), 2026-11-18. Exécutant : `implementer`, branche `refonte/j2-web` tirée de `refonte/jalon-2`.

Références (lire avant de coder) : `j2-pr1-lots.md` (contrat du `p_payload`), `j2-architecture.md` §1, §2, §4, §5, §7 (fait foi pour la sécurité), `packages/core/src/ingest/types.ts` (`IngestState`), `packages/core/src/ingest/plan-ingest.ts`, `packages/core/src/session/plan.ts` (`planDay`), `packages/schemas/src/events/*`, `supabase/migrations/20261117000600_app_ingest_batch.sql`, `docs/refonte/passation-j2.md` §2 (écarts S et C). Next.js 16 : lire `node_modules/next/dist/docs/` (route handlers, `connection()`, `server-only`) avant d'écrire une route.

## 0. Décisions de l'architecte

| # | Décision | Pourquoi |
|---|---|---|
| D1 | **`session.client_id` n'est pas créé.** Les séances sont toujours créées par le serveur (`GET /api/session/today`), leur id voyage dans le paquet. Hors ligne sans paquet, l'app propose les cartes locales sans séance : les `review_attempt` sans séance sont acceptés (XP, jour validé par l'XP), seule la preuve d'étape `wake` n'existe pas. `j2-architecture.md` §3.2 est amendé en ce sens. | Pas d'id de séance fourni par le client : une surface de moins, pas de séance fantôme. |
| D2 | **Orchestration dans `apps/web`, pas dans `packages/data`.** Le test des frontières interdit à `data` d'importer `core`. `data` lit et écrit des lignes typées ; `apps/web/src/lib/ingest/` construit l'`IngestState` (fonction pure), appelle `planIngest`, puis `data`. | Respecte les frontières existantes. |
| D3 | **L'état dérivé non reconstructible est persisté par `ingest_batch`**, dans la même transaction que le reste : `ingest_state.memo` (compteurs `StateDay` des jours récents, état des textes et des productions, jours de rattrapage) et `app.ingest_event` (empreinte de **chaque** événement accepté). Les deux viennent de `nextState` rendu par `planIngest`. | `StateDay.counted`, `reviewSuccesses` (succès plafonnés compris), `focusBySession`, `text.referenceWpm`, `production.settled`… ne se déduisent pas exactement des tables ; `knownEvents` doit couvrir `reading_progress`, `session_started`, etc., qui n'ont pas de ligne propre (écart 12 du lot C). |
| D4 | **Motifs de zéro** (`report.zeroed`) écrits en `ui_event` `xp_zeroed` dans le même appel, `client_event_id = deterministicUuid("xp_zeroed:" + clientEventId + ":" + reason)`, `value = { clientEventId, reason }`, `occurred_at = now`. | Le nom existe déjà dans la liste fermée ; idempotent. |
| D5 | **Clé d'une carte = mode servi.** Chaque paquet enregistre dans `session.plan.servedCards` le mode servi par carte. `recognition`/`listening` : `optionId = card.id` (les options du QCM portent l'id de la carte dont elles sont le sens), `accept = []`. `production` : `optionId = null`, `accept = [card.front, ...card.payload.accept (chaînes)]`. Carte jamais servie : mode = `cardRecallVariant` de `core`. **Un `review_attempt` dont `mode` diffère du mode attendu est refusé `invalid_payload` avant `planIngest`.** | Sinon un client déclare `production` (mieux payé) sur une carte servie en QCM et répond avec l'id d'option (`gradeCardRecall` note par choix dès que `optionId` est non nul). Faiblesse du lot C, à signaler à la revue. |
| D6 | **Pas de texte publié disponible → séance `review_only`** (Réveil seul, sans `session.complete`). | Au PR 1 la génération n'existe pas encore (PR 2) ; une séance `daily` sans texte ne pourrait jamais être validée. |
| D7 | **Corrections et `rewrite_check` : branchés au PR 3.** Au PR 1, `state.corrections = {}` et `state.rewriteChecks = {}` (fonction `readCorrections` qui rend `{}` avec un commentaire « PR 3 ») ; un `rewrite_submitted` est donc refusé `unknown_correction`. Aucun écran ne l'émet au PR 1. | Le format de `correction.feedback` du jalon 2 est défini par le portage (PR 3). |
| D8 | **File d'événements et paquets par utilisateur** : base IndexedDB `dailylingua-events-<userId>` et `dailylingua-session-<userId>`. La page `/lab` garde sa base `dailylingua-offline` et son faux expéditeur. | Deux comptes sur un même téléphone : les événements de A ne doivent jamais partir avec le cookie de B. |
| D9 | Lot refusé en SQL de façon **définitive** (`22023`, `23503`, `23505`, `23514`) → **mode isolement** : on rejoue le lot événement par événement (état relu à chaque fois) ; celui qui échoue encore est refusé `server_refused`, les autres passent. | Sinon un seul événement bloquerait la file pour toujours (tête de file). |

## 1. Migration `supabase/migrations/20261118000100_app_ingest_ledger.sql`

Règles du jalon 1 : `search_path = ''`, noms qualifiés, révocations explicites `from public, anon, authenticated`, pgTAP dans `supabase/tests/` (nouveau fichier `app_ingest_ledger.test.sql`), `app_access` mis à jour. Ne modifier aucune migration existante.

1. `app.ingest_event` : `user_id uuid not null references auth.users on delete cascade`, `client_event_id uuid not null`, `kind text not null check (kind ~ '^[a-z_]{1,40}$')`, `fingerprint text not null check (fingerprint ~ '^[0-9a-f]{32}$')`, `received_at timestamptz not null default now()`, PK `(user_id, client_event_id)`, index `(user_id, received_at)`. RLS activée, **aucun** droit client (ni lecture).
2. `app.ingest_state.memo jsonb not null default '{}' check (jsonb_typeof(memo) = 'object' and octet_length(memo::text) <= 262144)`. Pas de droit client nouveau (la table reste comme au lot S).
3. `app.text` : `writing_task text null check (char_length(writing_task) between 1 and 400)`, `listening_segment jsonb null` (objet `{from, to}` entiers ≥ 0, `from <= to`, contrainte `check`). Un texte sans `writing_task` n'est jamais servi.
4. `app.event_rate` : `user_id`, `window_start timestamptz`, `events integer not null`, PK `(user_id, window_start)`, RLS, aucun droit client. `app.claim_event_rate(p_user_id uuid, p_count integer, p_limit integer) returns boolean`, `security definer`, `service_role` seulement : fenêtre = `date_trunc('hour', now())`, ajoute `p_count` si `events + p_count <= p_limit` et rend `true`, sinon ne change rien et rend `false` ; supprime les lignes de l'utilisateur de plus de 2 h. `p_count` ∈ 1..50, `p_limit` ∈ 1..10000 (`22023` sinon).
5. **Nouvelle version de `app.ingest_batch`** (`create or replace`, même signature, mêmes révocations) : reprend le corps actuel à l'identique et ajoute deux clés à la liste fermée :
   - `events` (tableau ≤ 500 de `{ client_event_id uuid, kind text, fingerprint text }`), appliqué **en premier** : ligne absente → insérée ; présente avec la même empreinte → ignorée ; empreinte différente → `23505`.
   - `memo` (objet ou `null`), appliqué **en dernier** avant l'incrément de `seq` : objet → remplace `ingest_state.memo` ; `null`/absent → inchangé.
   - après l'incrément : `delete from app.ingest_event where user_id = p_user_id and received_at < now() - interval '14 days'`.
6. pgTAP : droits (tables sans accès client, fonctions refusées à `anon`/`authenticated`), `events` idempotent et `23505` sur empreinte différente, `memo` remplacé et conservé si `null`, borne 256 Kio, clé inconnue toujours `22023`, purge à 14 jours, `claim_event_rate` (limite, fenêtre, bornes), contraintes de `text.writing_task`/`listening_segment`. Les tests du lot S doivent rester verts sans modification.
7. Régénérer `packages/data/src/database.app.types.ts` (même commande que le lot S, voir l'en-tête du fichier ou `package.json`), vérifier `npm run migrations:check` et `npm run migration:verify`.

## 2. `packages/schemas`

Dans `packages/schemas/src/events/` (nouveau fichier `ingest-ledger.ts`, exporté) :

- `ingestMemoSchema` (strict) : `{ v: 1, days: Record<DateKey, StateDay>, texts: Record<uuid, { readingEarnedDay: DateKey|null, referenceWpm: number|null }>, productions: Record<uuid, { day, late, settled, correctionDeferred }>, catchUpDays: DateKey[] }`. `StateDay` réécrit en Zod à l'identique de `core/ingest/types.ts` (schemas ne peut pas importer core ; un test de `apps/web` vérifie que `z.infer` et le type de core sont assignables dans les deux sens).
- `ingestBatchPayloadSchema = ingestPayloadSchema.extend({ events: z.array(...).max(500), memo: ingestMemoSchema.nullable() })`.
- `storedSessionPlanSchema` (strict, ce qui est écrit dans `session.plan`, **sans clé de réponse**) : `{ v: 1, steps: PlannedStep[], requiredSteps: PlanStep[], wake: { cardIds, newCardIds, budgetMinutes, errorItemId: uuid|null }, reading: { textId: uuid|null, itemIds }, workshop: { itemIds }, momentumWords: number|null, rewriteSentences, servedCards: Record<uuid, ReviewMode>, resumption: boolean, newCardsSuspendedThrough: DateKey|null }`. `momentumWords = "whole_text_plus_180"` est stocké `null` (convention de `StateSession`).
- `deliveryReportSchema` : `{ rejected: { clientEventId, reason }[] }` où `reason` ∈ `rejectionReasons` + `server_refused` (ajouter `server_refused` à `rejectionReasons`, avec un commentaire).

## 3. `packages/data` (aucun import de `core`)

Nouveaux modules, tous prennent un `AppClient` **de service** et un `userId` explicite (jamais lu d'un corps de requête) ; erreurs via `DataError` existant (ajouter les codes nécessaires) :

- `ingest-rows.ts` — `readIngestRows(client, userId, refs, window)` rend des DTO camelCase typés (pas l'`IngestState`) :
  - `profile` (`time_zone`, `created_at`, `game_settings`), enrollments actifs (`language`, `daily_minutes`), `skill_estimate` (writing ou, à défaut, global) ;
  - séances : celles dont l'id est référencé (**sans filtre utilisateur**, pour que `planIngest` rende `foreign_session`) + celles de l'utilisateur avec `day` dans `window` (jour serveur − 8 → + 1) ; avec `session_step` ;
  - items `text_item` + `text_item_key` des plans de ces séances ; textes des séances et des `textId` référencés ;
  - cartes référencées (**sans filtre utilisateur** → `unknown_card`) + leur dernier `review_log` (instant, note) ;
  - `learning_day`, `setting_change`, `timezone_change` : toutes les lignes de l'utilisateur ; `device_cursor` des `deviceId` du lot ; `streak_state.time_zone_changed_at` ; `text_read` des textes lus parmi ceux de l'état ;
  - `knownEvents` : `ingest_event` (avec empreinte) des `clientEventId` du lot, plus, sans empreinte (`null`), les `client_event_id` du lot présents dans `attempt`, `review_log`, `production`, `rewrite`, `ui_event` ;
  - `cardFronts` : `language|kind|lower(front)` des cartes de l'utilisateur dans les langues des séances lues ; 30 derniers textes de `production` ; productions référencées par `productionId` ou présentes dans le memo ; `ingest_state` (`seq`, `memo`).
  - Requêtes groupées (`in (...)`) ; aucune boucle de requêtes par événement.
- `ingest-write.ts` — `callIngestBatch(client, userId, expectedSeq, payload)` → `{ seq, duplicates }` ; erreur PostgREST → `IngestBatchError { code: "stale" (40001) | "busy" (55P03) | "refused" (22023, 23503, 23505, 23514) | "unavailable" (autre) , sqlstate, message }`. `claimEventRate(client, userId, count, limit)`.
- `session-today.ts` — lectures pour le plan (cartes de la langue non supprimées : `id, state, due_at, stability, last_review_at, kind, front, back, context, payload` + note de la dernière révision de la veille ; dernière séance, nombre de séances format 10 complétées ; textes candidats publiés avec `writing_task` non nul, non lus, non servis dans une autre séance, de la langue et de la bande de niveau ; leurs items et clés ; usages de quota du jour) et `insertSession(...)` (`insert ... on conflict (user_id, language, day, kind) do nothing` puis relecture : sûr en concurrence).
- Tests : unitaires avec `fake-client.ts` ; intégration (`*.integration.test.ts`, motif existant, sautés sans `SUPABASE_SERVICE_ROLE_KEY`) contre la base locale.

## 4. `apps/web` — client de service

`apps/web/src/lib/supabase/service.ts` : `import "server-only"` ; lit `SUPABASE_SERVICE_ROLE_KEY` avec son propre schéma Zod (jamais dans `readSupabaseEnv`, jamais `NEXT_PUBLIC_*`) ; client sans session persistée (`auth: { persistSession: false, autoRefreshToken: false }`), schéma `app`. Utilisé **uniquement** par les deux routes ci-dessous. Mettre à jour le commentaire de `env.ts` (« service role : seulement `service.ts`, pour l'ingestion »). `.env.example` (s'il existe) : la variable, sans valeur.

## 5. `apps/web/src/lib/ingest/` (serveur, `server-only` sauf les fonctions pures)

- `build-state.ts` (pur, testé) : DTO de `data` + memo + `now` → `IngestState`. Règles :
  - `profile.timeZone` = `profile.time_zone` ; `writingLevels[lang]` = `valueToLevel(skill_estimate)` borné à A2..C1 (A0/A1 → A2 ; absent → clé omise) ; `answerTolerance` = `game_settings.answerTolerance.accents ?? "lenient"` ; `defaultRingTier` = format de l'enrollment (`daily_minutes` arrondi au format 10/15/20/30 le plus proche, 15 par défaut).
  - `StateSession` depuis la ligne + `storedSessionPlanSchema` (plan illisible → séance absente de l'état, journalisé) ; `steps` depuis `session_step`.
  - `StateItem` depuis `text_item` + clé : `mcq` → `answer` = `key.answer` ; autres → `accept` ; `card` = `text_item.prompt.card` s'il passe un petit schéma Zod `{ kind, front, back, backLanguage, context }`, sinon `null`.
  - `StateText` : `wordCount`, `body` ; `readingEarnedDay`/`referenceWpm` depuis le memo.
  - `StateCard` : clé selon D5 ; `servedAt` = `served_at` de la séance la plus récente de la fenêtre dont `servedCards` contient la carte, sinon `null` ; `lastReview` = jour d'apprentissage (`learningDay(reviewed_at, profile.time_zone)`) et note du dernier `review_log`.
  - `days` = `memo.days` des jours de la fenêtre ; `catchUpDays`, productions (`settled`…) depuis le memo ; `knownEvents`, `cardFronts`, `recentProductionTexts` depuis les DTO ; `corrections = {}`, `rewriteChecks = {}` (D7).
- `next-memo.ts` (pur, testé) : `nextState` → memo : `days` du jour serveur − 10 à + 1 seulement ; `texts` : 200 entrées au plus (les plus récentes par `readingEarnedDay`) ; `productions` : non réglées, ou réglées depuis moins de 10 jours ; `catchUpDays` des 60 derniers jours. Taille JSON vérifiée < 256 Kio (sinon erreur serveur journalisée, jamais tronquée en silence).
- `ingest-events.ts` : `ingestEvents({ service, userId, events, now })` :
  1. pré-filtre D5 (mode de révision) ;
  2. lit les lignes (refs extraites des événements bruts, sans faire confiance à leur forme : `typeof === "string"`) → `buildIngestState` → `planIngest(state, events, now)` ;
  3. payload = `plan.payload` + `events` (entrées de `nextState.knownEvents` absentes de `state.knownEvents`, avec le `kind` de l'événement brut) + `ui_events` `xp_zeroed` (D4) + `memo` ; vérifie `ingestBatchPayloadSchema` et la taille ≤ 1 Mio (écart 5) avant l'appel ;
  4. `callIngestBatch` ; `stale` → recommence depuis 2 (3 essais au plus, puis échec passager) ; `busy`/`unavailable` → échec passager ; `refused` → isolement (D9), au plus 50 appels ;
  5. rend `{ rejected: plan.rejected + pré-filtre + server_refused, duplicates, report }`.

## 6. `POST /api/events` (`apps/web/src/app/api/events/route.ts`)

Ordre : (1) `Origin` présent et égal à l'origine de la requête, sinon 403 (CSRF) ; `Content-Type: application/json`, sinon 415. (2) Utilisateur via `getSessionUser()` (cookie, `auth.getUser()` vérifié), sinon 401. (3) Corps lu en flux avec arrêt à 64 Kio (`MAX_BATCH_BYTES`) — ne pas se fier à `Content-Length` — sinon 413 ; JSON invalide ou pas un tableau → 400 ; plus de 50 éléments → 413. (4) `claimEventRate(userId, n, 600)` faux → 429 avec `Retry-After` (secondes jusqu'à l'heure suivante). (5) `ingestEvents` avec `now = new Date()`. (6) 200 `{ rejected }` (`deliveryReportSchema`) ; échec passager → 503 ; jamais le message SQL dans la réponse (journal serveur seulement). En-têtes : `Cache-Control: no-store`. `export const dynamic`/`runtime` selon la doc Next 16 (Node, pas Edge). Le proxy (`src/proxy.ts`) ne doit pas rediriger `/api/*` vers `/sign-in` : rendre 401 JSON.

## 7. `GET /api/session/today?language=xx`

1. Utilisateur (401) ; `language` doit être un enrollment actif de l'utilisateur (sinon 404). `await connection()` si la doc l'exige pour une route dynamique.
2. Jour serveur = `learningDay(now, profile.time_zone)`.
3. Séance existante du jour (`daily`, sinon `review_only`) → paquet reconstruit depuis son plan (idempotent, `served_at` inchangé).
4. Sinon : `planDay` (`core/session`) avec format = celui de l'enrollment, cartes de la langue, `lastSessionDay`, `completedShortSessions`, `newCardsToday` = `memo.days[jour].newCards`, `newCardsSuspendedThrough` du dernier plan `resumption`, `errorItemId = null` (PR 3). Texte : premier candidat (§3) par `density` la plus proche de 2 puis `created_at`, `id` ; aucun → `kind = "review_only"` (D6). Items : `READING_QUESTIONS[format]` de lecture (dont 1 `listening_only` s'il en existe) et `WORKSHOP_COMPOSITION[format].total` d'atelier, par `position`. `served_at = now`. Écrit via `insertSession` (client de service).
5. Paquet (`sessionPacketSchema`, validé avant envoi) : cartes = Réveil du plan + cartes dues d'ici jour + 2 (120 au plus), avec mode (D5) ; options `recognition`/`listening` : 4 options dont la bonne (`id = card.id`, texte = `back`), distracteurs = sens d'autres cartes de la même langue, tirage déterministe (graine = id de séance + id de carte) ; moins de 3 distracteurs ou `back` nul → mode `production`. `text.writingTask`/`listeningSegment` depuis les nouvelles colonnes. `errorOfTheDay = null`. Quotas : usage du jour d'apprentissage et limites de `@dailylingua/ai` (`writing_feedback`, `rewrite_check`). `Cache-Control: private, no-store`.
6. `servedCards` du plan = mode de chaque carte servie. Une séance déjà servie garde ses modes.

## 8. Client (`apps/web`)

- `lib/offline/http-sender.ts` : `BatchSender` qui POSTe sur `/api/events` (`credentials: "same-origin"`, JSON) ; 200 → `DeliveryReport` validé ; 401, 403, 429, 5xx, réseau, réponse invalide → rejet (échec passager, la file réessaie).
- `lib/offline/session-packet-store.ts` : IndexedDB `dailylingua-session-<userId>`, une entrée par `language|day` (`{ packet, storedAt }`) ; `put`, `get(language, day)`, `purge(today)` (supprime `day < today − 2`, et les séances `completed` dont la file est vide).
- `components/pwa/event-sync-provider.tsx` (client, monté dans `app/(app)/layout.tsx` avec le `userId`) : file `createIndexedDbEventQueue("dailylingua-events-" + userId)` + `startEventSync` + expéditeur HTTP ; expose `enqueue` par contexte React (utilisé au PR 2) ; arrêté au démontage.
- `components/today/session-prefetch.tsx` (client, sans rendu visible) monté dans la page Aujourd'hui : en ligne, `GET /api/session/today?language=…` puis rangement du paquet ; purge. Aucun changement visuel de l'écran.
- À la déconnexion (`app/actions/auth.ts`) : supprimer la base `dailylingua-session-<userId>` côté client (les paquets contiennent des clés de réponse) ; la file d'événements est gardée (elle partira à la prochaine connexion du même compte).

## 9. Tests et critères de fin

- Unitaires : `build-state`, `next-memo`, pré-filtre D5, extraction des refs sur entrées hostiles, `http-sender`, route `POST` (Origin, 401, 413 en flux, 400, 429, 503, 200) et `GET` (401, 404, paquet valide, idempotence, `review_only` sans texte) avec dépendances injectées.
- Intégration (base locale, `packages/data` ou `apps/web`, sautée sans clé) : **boucle complète** — utilisateur + enrollment + texte publié avec items → paquet → `session_started`, 3 révisions, lecture complète, réponses → `xp_ledger`, `learning_day`, `session_step`, `ingest_event`, memo écrits ; **même lot rejoué → aucune ligne nouvelle, `duplicates` non vide** ; événement d'un autre utilisateur → `foreign_session` ; lot avec un événement refusé en SQL → isolement, les autres acceptés ; `stale` simulé → reprise.
- `npm run check`, `npm run refonte:check`, `npm run refonte:build`, `npx supabase db reset` puis `npx supabase test db`, `npm run migrations:check`, `npm run migration:verify` : tout vert.
- LF partout (`git diff --stat`, `git ls-files --eol`), commits atomiques en anglais, `package-lock.json` non réécrit pour rien, aucune clé dans un fichier commité.

## 10. Hors périmètre (PR 2 et PR 3)

Écrans de la séance, génération des textes, correction écrite et `rewrite_check`, erreur du jour, notifications, `metrics:report`. Le service worker n'est pas modifié.

## 11. Correctifs de la revue de sécurité (`docs/reviews/refonte/j2-pr1-securite.md`)

Décisions de l'architecte sur les constats de la revue S + W. Branche `refonte/j2-secfix` tirée de `refonte/jalon-2`. Migration unique `supabase/migrations/20261118000200_app_ingest_hardening.sql`.

| Constat | Correctif |
|---|---|
| **B1** (bloquant) : `save_profile` réécrit `profile.time_zone` librement → contournement de la règle « 1 changement / 48 h » | Nouvelle version de `app.save_profile` (`create or replace`, même signature, mêmes droits) : si `app.ingest_state.seq > 0` pour l'utilisateur, `time_zone` **n'est plus modifié** (la valeur reçue est validée puis ignorée) ; avant toute ingestion, comportement inchangé (l'accueil fixe le fuseau). Dès lors le fuseau ne change plus que par le journal (`timezone_change`, règle des 48 h dans `core`), et le repli de `core` sur `profile.timeZone` est sûr. pgTAP : avant ingestion le fuseau change ; après une ingestion il reste, les autres champs changent. Commentaire dans `apps/web/src/app/actions/settings.ts` : le fuseau est suivi par les événements une fois l'app utilisée (l'écran Réglages sera ajusté au PR 2). |
| **I2** : `timezone_changes.effective_at` sans borne | Dans une nouvelle version d'`ingest_batch` : `effective_at` ∈ [`now() − 8 jours`, `now() + 5 min`], sinon `23514`. |
| **I5** : recherche XP « avec source » par `is not distinct from` (pas d'index) | Même nouvelle version : deux branches, `x.attempt_id = v_id_attempt` ou `x.review_log_id = v_id_review`, pour utiliser les index uniques partiels. Le reste du corps est identique à `20261118000100` (vérifier par `diff`). |
| **I4** : `save_game_settings` sans plafond | Nouvelle version : plus de 50 lignes `setting_change` de l'utilisateur sur les dernières 24 h → `23514`. pgTAP. |
| **W-I1** : memo sans borne (productions jamais réglées) | `next-memo.ts` : productions gardées seulement si `day` ≥ jour serveur − 4 (au-delà, `production.corrected` ne peut plus être inscrite : borne de jour SQL), et 30 au plus (les plus récentes). Plafond de création : pré-filtre dans `ingest-events.ts`, au plus **10 `production_submitted` acceptées par jour d'apprentissage** (memo du jour serveur + lot) ; au-delà → refus `too_many` (ajouté à `rejectionReasons`, commenté). Test : 11e production refusée ; memo stable après 1 000 productions simulées. |
| **W-I2** : échecs définitifs traités comme passagers | **Client** (`http-sender.ts`) : 413 avec plus d'un événement → coupe le lot en deux et envoie chaque moitié (récursif, rapports fusionnés) ; 413 sur un seul événement → refusé `invalid_payload` ; 400 ou 415 → tous les événements du lot refusés `invalid_payload` (notre client ne produit jamais ces cas ; mieux vaut les écarter que bloquer la file). 401, 403, 429, 5xx, réseau → passager (inchangé). **Serveur** (`ingest-write.ts`) : toute classe `22xxx` et `23xxx` et `42501` → `refused` (donc isolement), sauf `40001`/`55P03` ; tests. |
| W-M3 memo illisible | Inchangé (journalisé en erreur) : échouer fermé bloquerait le compte. |
| W-M4 file conservée à la déconnexion | Accepté : la file est propre au compte (D8) et partira à la reconnexion. |
| W-M1, W-M2, W-M5, W-M6, W-M7, I3, M1-M11 | Acceptés ou reportés, notés dans la passation (défense en profondeur, PR 2-3). |

Critères : identiques au §9, plus les tests listés ci-dessus.
