# Jalon 1, PR 1 — Spec du schéma `app` et de la reprise des données

Auteur : architecte (session principale). Exécutant : agent `migrateur-donnees`. Cette spec fait foi ; tout écart est remonté, pas improvisé. Référence : `d-architecture.md` §4-5, `f-plan-de-migration.md`.

## 0. Règles

- Nouveau schéma **`app`**. **Aucune** table, fonction ni politique de `public` n'est modifiée ou supprimée.
- Une seule exception dans les fichiers existants : `supabase/config.toml`, `[api] schemas` devient `["public", "graphql_public", "app"]`.
- Migrations nommées comme les existantes (`YYYYMMDDHHMMSS_nom.sql`), datées à partir de `20261112000100`, une par bloc cohérent (§1 à §5). `npm run migrations:check` doit rester vert.
- Toute fonction : `set search_path = ''`, noms qualifiés. `security definer` seulement où c'est écrit ici.
- Types de dates : `timestamptz` partout, sauf les « jours d'étude » (`date`, jour local de l'utilisateur).
- Base **locale uniquement**.

## 1. Droits du schéma

```sql
create schema app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;
alter default privileges in schema app revoke execute on functions from public;
```

`anon` n'a aucun droit sur `app`. `authenticated` reçoit `select` table par table (ci-dessous) et jamais `insert`/`update`/`delete` : **toute écriture passe par une fonction `security definer` ou par `service_role`**. `service_role` reçoit tous les droits sur toutes les tables et séquences de `app`.

RLS activée sur **toutes** les tables. Politique type « propriétaire en lecture » : `for select to authenticated using (user_id = (select auth.uid()))`.

## 2. Tables

Notation : `→` clé étrangère ; toutes les FK vers `auth.users` et entre tables utilisateur sont `on delete cascade`.

### 2.1 Référence et identité

**`app.language`** — langues cibles. `code text primary key check (code ~ '^[a-z]{2,3}$')`, `created_at`. Remplie avec les 19 codes de `public.languages` **plus `fr`**. Lecture : tout `authenticated`.

**`app.profile`** (lecture : propriétaire)

| Colonne | Type | Contrainte |
|---|---|---|
| `user_id` | uuid PK → `auth.users` | |
| `native_language` | text not null default `'fr'` | `~ '^[a-z]{2,3}$'` (toute langue ISO 639, pas seulement les cibles) |
| `ui_language` | text not null default `'fr'` | même motif |
| `time_zone` | text not null default `'Europe/Paris'` | validée contre `pg_timezone_names` (déclencheur, comme `public.validate_time_zone`, réécrit dans `app`) |
| `reminder_time` | time null | secondes = 0 |
| `game_settings` | jsonb not null default `'{}'` | objet JSON |
| `is_guest` | boolean not null default false | |
| `legacy_migrated_at` | timestamptz null | posé par la reprise |
| `created_at`, `updated_at` | timestamptz | `updated_at` tenu par déclencheur |

**`app.enrollment`** (lecture : propriétaire) — une ligne par langue apprise.

`id uuid PK default gen_random_uuid()`, `user_id`, `language → app.language`, `purpose text null`, `target_level text null check (in A1..C2)`, `daily_minutes smallint not null check (between 5 and 120)`, `days smallint[] not null default '{1,2,3,4,5,6,7}'` (valeurs 1..7, non vide, sans doublon), `focus jsonb not null default '{}'`, `position smallint not null default 0`, `active boolean not null default true`, `created_at`, `updated_at`. `unique (user_id, language)`. Déclencheur : `language <> profile.native_language` (erreur `23514`).

**`app.skill_estimate`** (lecture : propriétaire)

`user_id`, `language → app.language`, `skill text check (in 'reading','listening','writing','speaking')`, `level_value numeric(4,2) not null check (between 0 and 6)`, `uncertainty numeric(4,2) not null check (> 0)`, `source text not null check (in 'legacy','placement','assessment','estimated','declared')`, `updated_at`. PK `(user_id, language, skill)`.

Échelle continue : `0` = A0, `1` = début de A1, `2` = début de A2 … `6` = fin de C2. Le milieu de A1 vaut `1.5`.

### 2.2 Mémoire

**`app.card_list`** : `id uuid PK`, `user_id`, `language`, `name text (1..80)`, `description text null (≤ 300)`, `active boolean default true`, `created_at`. `unique (user_id, language, name)`.

**`app.card`** (lecture : propriétaire)

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `user_id`, `language` | | |
| `kind` | text check in (`'word'`,`'chunk'`,`'grammar'`,`'script'`,`'correction'`) | |
| `ref` | text null | identifiant stable du contenu curé (point de grammaire, groupe de lettres) |
| `front` | text not null | terme, ou libellé pour les cartes à `ref` |
| `back` | text null | traduction ou correction |
| `back_language` | text null | langue de `back` (`'fr'` pour l'existant) |
| `context` | text null | phrase d'exemple |
| `note` | text null | |
| `list_id` | uuid null → `card_list` (`on delete cascade`) | |
| `state` | text check in (`'new'`,`'learning'`,`'review'`,`'relearning'`,`'suspended'`,`'known'`) | |
| `stability` | real null check (> 0) | jours |
| `difficulty` | real null check (between 1 and 10) | |
| `due_at` | timestamptz not null | |
| `last_review_at` | timestamptz null | |
| `reps`, `lapses` | integer not null default 0 | |
| `legacy_box` | smallint null | boîte Leitner d'origine, pour l'audit |
| `source` | text not null default `'manual'` | `'mission'`,`'manual'`,`'import'`,`'reader'`,`'unit'`,`'feedback'`,`'legacy'` |
| `payload` | jsonb not null default `'{}'` | données propres au type (catégorie d'erreur, définition…) |
| `created_at`, `updated_at` | | |

Index : `(user_id, due_at) where state not in ('suspended','known')` ; unique partiel `(user_id, language, kind, ref) where ref is not null`.

**`app.review_log`** — ajout seul (lecture : propriétaire)

`id bigint generated always as identity PK`, `user_id`, `card_id → card`, `rating smallint check (between 1 and 4)` (1 again, 2 hard, 3 good, 4 easy), `mode text null`, `reviewed_at timestamptz not null`, `elapsed_days real null`, `scheduled_days real null`, `origin text not null check (in 'fsrs','leitner')`, `client_event_id uuid null`, `created_at`. Unique partiel `(user_id, client_event_id) where client_event_id is not null`. Index `(user_id, reviewed_at)`.

Ajout seul : déclencheur `before update or delete` qui lève une exception, sauf suppression en cascade du compte (tester `pg_trigger_depth() > 1` ou désactiver par rôle : au choix, mais la suppression d'un compte doit fonctionner et un `update` par `service_role` doit échouer).

### 2.3 Séance et tentatives

**`app.session`** : `id uuid PK`, `user_id`, `language`, `day date not null`, `plan jsonb not null default '{}'`, `status text check (in 'planned','started','completed','abandoned') default 'planned'`, `started_at`, `completed_at`, `created_at`. `unique (user_id, language, day)`.

**`app.attempt`** — ajout seul, même protection que `review_log`.

`id bigint identity PK`, `user_id`, `session_id uuid null → session`, `language`, `step text not null`, `exercise_kind text not null`, `exercise_ref text null`, `answer jsonb not null`, `result jsonb null`, `correct boolean null`, `duration_ms integer null check (>= 0)`, `client_event_id uuid not null`, `occurred_at timestamptz not null`, `received_at timestamptz not null default now()`. `unique (user_id, client_event_id)`.

**`app.study_day`** : `user_id`, `day date`, `origin text check (in 'legacy','session','review')`, PK `(user_id, day)`. Sert au calcul de la série.

### 2.4 Production

**`app.production`** : `id uuid PK`, `user_id`, `language`, `session_id uuid null`, `mode text check (in 'writing','spoken','speaking')`, `task jsonb not null default '{}'`, `text text not null check (char_length <= 10000)`, `created_at`.

**`app.correction`** : `id uuid PK`, `production_id → production`, `user_id`, `feedback jsonb not null`, `explanation_language text not null`, `model text null`, `prompt_version text null`, `input_tokens integer null`, `output_tokens integer null`, `created_at`. `unique (production_id)`.

**`app.rewrite`** : `id uuid PK`, `correction_id → correction`, `user_id`, `sentence_index smallint not null`, `text text not null`, `accepted boolean null`, `created_at`.

**`app.assessment_result`** : `id uuid PK`, `user_id`, `language`, `kind text check (in 'placement','assessment')`, `taken_at timestamptz not null`, `levels jsonb not null default '{}'`, `payload jsonb not null` (la ligne d'origine entière), `created_at`.

### 2.5 Jeu (socle seulement)

**`app.xp_ledger`** — ajout seul. `id bigint identity PK`, `user_id`, `language text null`, `day date not null`, `amount smallint not null check (amount > 0)`, `reason text not null`, `attempt_id bigint null → attempt`, `review_log_id bigint null → review_log`, `meta jsonb not null default '{}'`, `created_at`. Index `(user_id, day)`.

**`app.streak_state`** : `user_id PK`, `current integer not null default 0`, `best integer not null default 0`, `last_day date null`, `freezes smallint not null default 0 check (between 0 and 3)`, `mode text not null default 'daily' check (in 'daily','weekly')`, `updated_at`.

### 2.6 Exploitation

**`app.ai_call`** — **aucune lecture client** (RLS activée, aucune politique). `id bigint identity PK`, `purpose text not null`, `model text not null`, `prompt_version text null`, `input_tokens integer not null default 0`, `output_tokens integer not null default 0`, `cache_read_tokens integer not null default 0`, `cache_write_tokens integer not null default 0`, `batch boolean not null default false`, `cost_usd numeric(12,6) not null default 0`, `user_id uuid null → auth.users on delete set null`, `status text not null default 'ok' check (in 'ok','error','refused')`, `created_at`. Index `(created_at)`, `(user_id, created_at)`.

**`app.quota_usage`** : `user_id`, `day date`, `kind text`, `used integer not null default 0 check (>= 0)`, PK `(user_id, day, kind)`. Lecture : propriétaire.

### 2.7 Reprise

**`app.legacy_map`** — aucune lecture client. `legacy_table text`, `legacy_id text`, `app_table text`, `app_id text not null`, `migrated_at timestamptz default now()`, PK `(legacy_table, legacy_id, app_table)`.

**`app.legacy_record`** (lecture : propriétaire) — archive sans perte de tout ce qui n'a pas encore d'équivalent. `user_id`, `legacy_table text`, `legacy_id text`, `payload jsonb not null` (`to_jsonb(ligne)`), `archived_at`, PK `(legacy_table, legacy_id)`.

## 3. Fonctions appelables par le client

Une seule dans cette PR :

**`app.save_profile(p_native_language text, p_ui_language text, p_time_zone text, p_reminder_time time default null) returns app.profile`** — `security definer`, `grant execute … to authenticated`. Met à jour **la ligne de `auth.uid()`** (jamais un identifiant passé en paramètre) ; lève `28000` si non connecté ; valide les motifs ; refuse (`23514`) une `native_language` égale à la langue d'un `enrollment` actif.

**Déclencheur `app.handle_new_user`** sur `auth.users` (`after insert`, `security definer`) : crée `app.profile` (`is_guest = coalesce(new.is_anonymous, false)`) et `app.streak_state`. Il s'ajoute au déclencheur `public` existant, sans le toucher. Vérifier que la création d'un compte et d'un invité fonctionne toujours (les tests pgTAP et d'intégration existants doivent rester verts).

## 4. Reprise des données (`service_role` seulement)

**`app.migrate_user(p_user_id uuid) returns jsonb`** (compte-rendu : lignes créées par table), **`app.migrate_all() returns jsonb`**, **`app.verify_migration() returns table (user_id uuid, check_name text, expected text, actual text)`** (zéro ligne = tout est conforme). `security definer`, `revoke … from public, authenticated`, `grant execute … to service_role`.

**Rejouable** : chaque insertion passe par `legacy_map` ; relancer ne crée rien et ne modifie pas une ligne déjà reprise (sauf `profile.legacy_migrated_at`). Une ligne `public` apparue depuis est reprise au passage suivant.

Lis les migrations de `public` pour les colonnes exactes. Correspondance :

| Source `public` | Cible | Règle |
|---|---|---|
| `profiles` | `profile` | `native_language = 'fr'`, `ui_language = 'fr'`, `time_zone` repris, `reminder_time = generation_time`, `game_settings = {"streak": show_streak}`, `is_guest` d'après `auth.users.is_anonymous`. La ligne `profile` peut déjà exister (déclencheur) : mise à jour si `legacy_migrated_at is null` |
| `user_languages` | `enrollment` | `daily_minutes = weight` (borné 5..120), `days`, `target_level`, objectif et focus repris ; `position` selon l'ordre existant |
| `user_languages.level` | `skill_estimate` `reading` et `listening` | `level_value` = milieu du niveau (A1 → 1.5 … C2 → 6.0 pour C2 : utiliser 5.5), `uncertainty = 0.5`, `source = 'legacy'` |
| `user_languages.production_level` (sinon `level`) | `skill_estimate` `writing` | idem. **Pas de ligne `speaking`** |
| `vocabulary_lists` | `card_list` | copie |
| `vocabulary_items` | `card` (`kind = 'word'`) | `front = term`, `back = translation`, `back_language = 'fr'`, `context = example`, `payload` = le reste (définition, incertain…), `source` repris, `list_id` via `legacy_map`, état : §4.1 |
| `vocabulary_reviews` | `review_log` | `origin = 'leitner'`, `rating` : again 1, hard 2, good 3, easy 4 ; `mode` repris ; `reviewed_at` = midi local du jour de révision ; `elapsed_days = days_since_last` |
| `grammar_cards` | `card` (`kind = 'grammar'`, `ref` = identifiant du point) | `front = ref` ; état §4.1 |
| `alphabet_cards` | `card` (`kind = 'script'`, `ref` = identifiant du groupe) | idem |
| `correction_cards` | `card` (`kind = 'correction'`) | `front` = passage fautif, `back` = correction, `payload` = catégorie, explication, lien vers la production |
| `production_entries` | `production` | `task` = consigne d'origine si disponible |
| `writing_feedback` | `correction` | `feedback` = JSON d'origine, `explanation_language = 'fr'`, modèle, version, tokens repris |
| `placement_tests`, `assessments` | `assessment_result` | `payload = to_jsonb(ligne)` ; `levels` = niveaux résultants |
| Jours d'étude (missions avec activité terminée, `vocabulary_reviews`) | `study_day` (`origin = 'legacy'`) | Même définition que `getStudyDates` / `computeStreak` de l'app actuelle : lis `src/lib/data/supabase-repository.ts` et `src/lib/domain/stats.ts` |
| `missions` (+ sessions, activités, progression, réponses), `feedback`, `content_refusals`, `user_source_access`, `mission_requests` | `legacy_record` | Une ligne par ligne d'origine, `payload = to_jsonb`. Pour `missions` : une ligne par mission dont le `payload` agrège ses sessions, activités, progression et réponses |
| Tables de quota et de réservation, `cron_runs`, `sources`, `contents`, `languages` | — | Non reprises (voir `f-plan-de-migration.md` §2) |

`streak_state` : `current` et `best` ne sont **pas** calculés en SQL dans cette PR (le calcul vit dans le domaine TypeScript) ; laisser `0` et `last_day` = dernier `study_day`.

### 4.1 De Leitner à FSRS

Intervalles des boîtes 0 à 6 : 1, 2, 4, 8, 16, 32, 64 jours (`src/lib/domain/spaced-repetition.ts`).

- `legacy_box = box`
- `stability = intervalle de la boîte`
- `difficulty = 5.0`
- `due_at` = `due_on` à **04:00** dans le fuseau du profil
- `last_review_at` = `last_reviewed_on` à **12:00** dans le fuseau du profil (null si jamais révisée)
- `reps = review_count` ; `lapses` = nombre de révisions notées `again` quand un journal existe, sinon 0
- `state` : statut `known` → `'known'` ; jamais révisée → `'new'` ; sinon `'review'`

Aucune carte ne doit devenir due plus tôt qu'avant : `due_at::date` dans le fuseau du profil = `due_on`.

### 4.2 `verify_migration`

Par utilisateur, une ligne par écart :
1. nombre de cartes par type = nombre de lignes sources ;
2. nombre de `review_log` d'origine `leitner` = nombre de `vocabulary_reviews` ;
3. nombre de `production`, `correction`, `assessment_result` = sources ;
4. `md5` de la concaténation ordonnée des `term` = celui des `front` des cartes `word` ; idem pour les textes des productions ;
5. pour chaque carte : jour local de `due_at` = `due_on` ;
6. ensemble des `study_day` = ensemble des jours d'étude recalculés ;
7. toute ligne des tables reprises a son entrée dans `legacy_map` ou `legacy_record`.

## 5. Tests pgTAP (`supabase/tests/database/app_*.test.sql`)

1. **Droits** : `anon` ne voit rien dans `app` ; un utilisateur ne lit que ses lignes dans chaque table ; `authenticated` ne peut ni insérer, ni modifier, ni supprimer dans **aucune** table de `app` ; `ai_call` et `legacy_map` illisibles par `authenticated`.
2. **Ajout seul** : `update` et `delete` sur `review_log`, `attempt`, `xp_ledger` échouent même pour `service_role` ; la suppression d'un compte supprime tout en cascade.
3. **`save_profile`** : modifie sa ligne seulement ; refuse un motif invalide, un fuseau invalide, une L1 égale à une langue apprise ; refuse `anon`.
4. **`handle_new_user`** : compte normal et invité.
5. **Reprise** sur `seed.sql` enrichi dans le test (deuxième utilisateur, invité, carte jamais révisée, carte `known`, liste en pause, production sans correction, deux langues) : `migrate_all()` puis `verify_migration()` renvoie zéro ligne ; relancer `migrate_all()` ne change aucun compte de lignes ; ajouter une ligne dans `public` puis relancer la reprend ; `due_on` préservé ; `migrate_user` refusé à `authenticated`.
6. Les 23 fichiers pgTAP existants restent verts.

## 6. Autres livrables

- `scripts/migration-verify.mts` + script npm `migration:verify` : appelle `app.migrate_all()` puis `app.verify_migration()` sur la base **locale** (refuse toute URL qui n'est ni `127.0.0.1` ni `localhost`), affiche le compte-rendu, sort en erreur s'il y a un écart.
- Types générés : `supabase gen types --local --schema app` vers `packages/data/src/database.app.types.ts` (créer le dossier ; pas de `package.json` ici, l'autre lot s'en charge). Ne pas régénérer `src/lib/supabase/database.types.ts`.
- **Ne pas toucher** : `src/`, `e2e/`, `package.json` hors l'ajout du script `migration:verify`, `.github/`, `docs/`.

## 7. Critères de fin

`npx supabase db reset` puis `npx supabase test db` : tout vert (anciens et nouveaux). `npm run migrations:check` vert. `npm run migration:verify` : zéro écart. `git diff --stat` sans conversion CRLF. Commits atomiques sur la branche du lot. Le message final liste les commandes et leurs résultats réels, et les cas que cette spec ne couvre pas.
