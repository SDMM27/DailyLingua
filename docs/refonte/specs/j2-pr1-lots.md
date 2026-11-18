# Jalon 2, PR 1 — Lots et contrats

Auteur : architecte. PR 1 = « socle de la boucle » (`j2-architecture.md` §10). Specs de référence : `j2-architecture.md` (données, sécurité : fait foi), `j2-jeu-xp-serie.md` (règles du jeu : fait foi pour les chiffres), `j2-seance-contenu.md` (séance, correction des exercices), `j2-points-a-trancher.md` (validé le 2026-11-16).

Trois lots. **S** (SQL) et **C** (core) partent en parallèle ; **W** (données + web) part quand S et C sont intégrés. Branche d'intégration : `refonte/jalon-2`.

## Lot S — Migrations et pgTAP (`migrateur-donnees`, branche `refonte/j2-sql`)

Base **locale uniquement**. Migrations datées à partir de `20261117000100`, une par bloc. Règles du jalon 1 : `set search_path = ''`, noms qualifiés, `security definer` seulement où c'est dit, révocation explicite `from public, anon, authenticated` sur chaque fonction, tests pgTAP par bloc, test générique `app_access` mis à jour. Ne pas modifier les migrations existantes.

### S1. Textes partagés
`app.text`, `app.text_item`, `app.text_item_key`, `app.text_read` exactement comme `j2-architecture.md` §3.1 (avec `density smallint check (between 1 and 3)`, `variant smallint not null default 1`). Lecture `authenticated` de `text` et `text_item` seulement si `text.status = 'published'` ; `text_item_key` sans aucun droit client ; `text_read` lecture propriétaire. Écriture : `service_role`.

### S2. Séance
- `app.session` : ajouter `format smallint not null default 15 check (format in (10,15,20,30))`, `kind text not null default 'daily' check (kind in ('daily','catch_up','review_only'))`, `served_at timestamptz` (instant où le paquet a été servi : sert au refus `before_served`). Remplacer `unique (user_id, language, day)` par `unique (user_id, language, day, kind)`.
- `app.session_step` : `session_id`, `user_id`, `language`, `step text check (in 'wake','reading','workshop','expression','momentum','review')`, `validated_at`, `proof jsonb`, PK `(session_id, step)`, clé composite vers `session (id, user_id, language)`. Lecture propriétaire.
- `app.card.source` : ajouter `session` à la liste admise.
- `app.production` et `app.rewrite` : ajouter `client_event_id uuid` (unique par utilisateur, partiel `where not null`).
- `app.text_item` sert aussi aux items de l'erreur du jour : ajouter `app.error_item` (`id uuid`, `user_id`, `correction_id` → `correction (id, user_id)`, `error_ref text`, `prompt jsonb`, `answer jsonb`, `created_day date`, `reworked_day date null`), lecture propriétaire **sans** la colonne `answer` (privilèges par colonne), écriture `service_role`.

### S3. Jeu
- `app.xp_ledger` : ajouter `rule_version text not null default 'j2.1'`, `league_eligible boolean not null default true`.
- `app.learning_day`, `app.setting_change`, ajouts à `app.streak_state` : `j2-architecture.md` §3.3 (causes `work`,`session`,`freeze`,`rest`,`repair`,`travel`,`off`,`none`).
- `app.timezone_change` (ajout seul) : `user_id`, `effective_at timestamptz`, `time_zone text` (validé comme `profile.time_zone`), `created_at`.
- `app.device_cursor` : `user_id`, `device_id uuid`, `last_seq bigint`, `last_day date`, PK `(user_id, device_id)`. Lecture propriétaire.
- `app.ingest_state` : `user_id` PK, `seq bigint not null default 0`. Créé par `handle_new_user` (nouvelle version) et par une reprise pour les comptes existants.
- `app.ui_event` (ajout seul) : `id`, `user_id`, `name text check (name ~ '^[a-z_]{1,48}$')`, `value jsonb` (≤ 2 Ko), `occurred_at`, `client_event_id uuid`, unique `(user_id, client_event_id)`.
- `app.save_game_settings(p_settings jsonb) returns app.profile` : `security definer`, `auth.uid()` seulement ; vérifie les clés et types du tableau `j2-jeu-xp-serie.md` §8 (liste fermée, refus `22023` sinon) ; écrit `profile.game_settings` et une ligne `setting_change` par clé modifiée avec `effective_day` = lendemain du jour d'apprentissage courant (lundi suivant pour `streak.mode`) ; `grant execute to authenticated`.

### S4. Notifications et signalements
`app.push_subscription`, `app.notification_log` : `j2-architecture.md` §3.5 ; fonctions `app.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)` et `app.delete_push_subscription(p_endpoint text)` (`auth.uid()`, liste fermée d'hôtes en SQL). `app.content_report` : `id`, `user_id`, `target_kind text check (in 'text','text_item','error_item','correction')`, `target_id text`, `reason text check (in 'wrong_answer','unnatural','offensive','other')`, `note text (≤ 500)`, `created_at` ; `app.report_content(...)` (`auth.uid()`, 20 signalements par jour au plus).

### S5. Ingestion
`app.ingest_batch(p_user_id uuid, p_expected_seq bigint, p_payload jsonb) returns jsonb`, `service_role` seulement, comme `j2-architecture.md` §3.4. **Contrat du `p_payload`** (produit par le lot W, validé par Zod côté serveur, revérifié en SQL pour les bornes) :

```jsonc
{
  "sessions":       [{ "id": "uuid", "status": "started|completed|abandoned", "started_at": "ts|null", "completed_at": "ts|null" }],
  "session_steps":  [{ "session_id": "uuid", "step": "wake", "validated_at": "ts|null", "proof": {} }],
  "attempts":       [{ "client_event_id": "uuid", "session_id": "uuid|null", "language": "it", "step": "reading",
                       "exercise_kind": "mcq", "exercise_ref": "uuid", "answer": {}, "result": {}, "correct": true,
                       "duration_ms": 4200, "occurred_at": "ts" }],
  "reviews":        [{ "client_event_id": "uuid", "card_id": "uuid", "rating": 3, "mode": "production",
                       "reviewed_at": "ts", "elapsed_days": 2.1, "scheduled_days": 6,
                       "card": { "state": "review", "stability": 6.2, "difficulty": 5.1, "due_at": "ts",
                                 "last_review_at": "ts", "reps": 5, "lapses": 0 } }],
  "cards_created":  [{ "id": "uuid", "language": "it", "kind": "word", "front": "…", "back": "…", "back_language": "fr",
                       "context": "…", "source": "session", "payload": {}, "state": "new", "due_at": "ts" }],
  "productions":    [{ "id": "uuid", "client_event_id": "uuid", "session_id": "uuid|null", "language": "it",
                       "mode": "writing", "task": {}, "text": "…" }],
  "rewrites":       [{ "client_event_id": "uuid", "correction_id": "uuid", "sentence_index": 0, "text": "…", "accepted": true }],
  "error_items":    [{ "id": "uuid", "reworked_day": "date" }],
  "text_reads":     [{ "text_id": "uuid", "first_read_day": "date" }],
  "xp":             [{ "source": { "kind": "attempt|review", "client_event_id": "uuid" } | null,
                       "language": "it|null", "day": "date", "amount": 2, "reason": "focus.first_try",
                       "rule_version": "j2.1", "league_eligible": true, "meta": {} }],
  "learning_days":  [{ "day": "date", "time_zone": "Europe/Paris", "xp_verified": 84, "validated": true,
                       "cause": "work", "first_activity_at": "ts" }],
  "streak":         { "current": 3, "best": 9, "last_day": "date", "freezes": 2, "mode": "daily",
                      "last_repair_day": null, "freezes_granted_through": "date", "best_set_on": "date",
                      "time_zone_changed_at": null } | null,
  "timezone_changes": [{ "effective_at": "ts", "time_zone": "Europe/Rome" }],
  "device_cursors": [{ "device_id": "uuid", "last_seq": 41, "last_day": "date" }],
  "ui_events":      [{ "client_event_id": "uuid", "name": "sound_toggled", "value": {}, "occurred_at": "ts" }]
}
```

Comportement : l'ordre d'application est celui des clés ci-dessus ; `xp[].source` est résolu en `attempt_id` / `review_log_id` par `client_event_id` **du même utilisateur** (introuvable → `23503`) ; un `client_event_id` déjà présent avec la même charge est ignoré et listé dans `duplicates`, avec une charge différente → `23505` ; `cards` mises à jour seulement si la ligne appartient à `p_user_id` ; `learning_days` remplacent les lignes existantes des mêmes jours ; `streak` remplace l'état. Bornes SQL : somme `xp_ledger.amount` du jour ≤ 400 par utilisateur (`23514`), `day` ∈ [jour serveur − 3, jour serveur + 1] où le jour serveur est calculé avec `profile.time_zone` et 04:00 (`23514`). Retour : `{ "seq": n, "duplicates": ["uuid", …] }`.

Tests pgTAP (au minimum) : droits de chaque table et fonction ; `ingest_batch` refusé à `authenticated` et `anon` ; idempotence (même lot deux fois → mêmes comptes) ; `40001` sur `seq` périmé ; atomicité (un élément invalide annule tout) ; appartenance (carte, séance, correction, tentative d'un autre utilisateur → `23503`) ; borne 400 ; borne de jour ; `save_game_settings` (clé inconnue refusée, `setting_change` écrit, effet au lendemain) ; push (hôte hors liste refusé) ; `report_content` (plafond).

Critères : `npx supabase db reset`, `npx supabase test db` (tout vert), `npm run migrations:check`, `npm run migration:verify` (zéro écart), types régénérés dans `packages/data/src/database.app.types.ts`, LF, commits atomiques.

## Lot C — Logique pure (`implementer`, branche `refonte/j2-core`)

Dans `packages/schemas` et `packages/core` seulement (pas de React, Next, Supabase ; aucune horloge lue : l'instant est un paramètre). Tests Vitest pour chaque règle.

- `packages/schemas/src/events/` : schémas Zod **stricts** des événements de `j2-jeu-xp-serie.md` §2.1 (avec `tz`, `deviceId`, `seq`), des réglages §8, du paquet de séance (`j2-architecture.md` §5) et du `p_payload` ci-dessus (même forme, en camelCase côté TS et conversion vers snake_case dans le lot W, ou snake_case directement : au choix, documenté).
- `packages/core/src/grading/` : normalisation et correction des réponses (`j2-seance-contenu.md` §2 : règle commune, « presque juste » sur les diacritiques, tolérance `strict`/`lenient`, `mcq`, `short_answer`, `cloze`, `transform`, rappel de carte par mode), passage réponse → note FSRS.
- `packages/core/src/game/` : barème `j2.1` (une fonction par règle, identifiants exacts du §1), plafonds et rendements, motifs de zéro, filtres `ringXp`/`streakXp`/`leagueXp`, attribution au jour (§3.2 avec la borne de 7 jours), fuseau à 48 h, `recomputeStreak` (§4.2), anneau et objectif de semaine (§5), preuve des étapes (§1 « Preuve d'étape »).
- `packages/core/src/session/` : plan du jour (durées par format, alternance atelier/élan au format 10, plafonds du Réveil, ordre de service des cartes, reprise après absence, erreur du jour) d'après `j2-seance-contenu.md` §1, §5, §6, §7.
- `packages/core/src/ingest/` : **la fonction centrale** `planIngest(state, events, now): { payload, rejected, report }`. `state` = ce que le lot W lit en base (séance(s) concernées, items et clés, cartes touchées avec leur état, XP déjà inscrite des jours touchés par règle, `learning_day`, `setting_change`, `timezone_change`, `device_cursor`, `streak_state`, textes lus). Elle rend le `p_payload` du lot S et la liste des refus (`reason` des deux specs). C'est la seule fonction que W appelle pour décider ; elle doit être déterministe (même `state` + mêmes événements + même `now` → même résultat) et testée avec les cas du §4.2 (rejouer deux fois, ordre indifférent, voyages, changement d'heure, lots à 71 h, 73 h et 8 jours) et le profil « farm » du §10 (≈ 8 XP).

La correction écrite, la réécriture (appels IA) et les notifications ne sont **pas** dans ce lot : `planIngest` reçoit le résultat de `rewrite_check` déjà calculé dans `state` (champ optionnel) et la correction déjà enregistrée.

Critères : `npm run refonte:check` vert, test des frontières vert, LF, commits atomiques.

## Lot W — Données et routes (`implementer`, après S et C)

Spec détaillée écrite par l'architecte après intégration de S et C : `packages/data` (lecture de l'état pour `planIngest`, appel d'`ingest_batch` avec reprise sur `40001`), `POST /api/events` (authentification, limites, `DeliveryReport`), `GET /api/session/today` (création de la séance, choix du texte, paquet), branchement de la file d'événements de l'app sur `/api/events`, paquet de séance dans IndexedDB. Revue `relecteur-securite` sur S + W avant l'ouverture de la PR.
