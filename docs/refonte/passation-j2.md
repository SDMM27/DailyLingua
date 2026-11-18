# Passation — refonte DailyLingua, jalon 2 (mise à jour du 2026-11-18)

Brief pour une nouvelle session Claude Code (Opus 5.5). Travailler dans le worktree `C:\Users\Administrateur\Documents\DailyLingua\.claude\worktrees\refonte-jalon-2` (branche `refonte/jalon-2`, poussée). Ce document **complète** `passation-suite-refonte.md` (à la racine) : son §1 (rôle d'orchestrateur), son §5 (règles à ne pas enfreindre) et son §6 (format des rapports) restent valables tels quels.

## 1. À lire avant d'agir

1. `passation-suite-refonte.md` (racine) : §1, §5, §6.
2. `AGENTS.md`, `CLAUDE.md`, `~/.claude/CLAUDE.md`. Next.js 16 : lire `node_modules/next/dist/docs/` avant d'écrire du code Next.
3. Specs du jalon 2 (`docs/refonte/specs/`) :
   - `j2-points-a-trancher.md` : les 14 points sont validés par le propriétaire ;
   - `j2-architecture.md` : fait foi pour les données et la sécurité ;
   - `j2-jeu-xp-serie.md` : fait foi pour les chiffres du jeu ;
   - `j2-seance-contenu.md`, `j2-ecrans.md`, `maquettes/j2/j2-ecrans.html` ;
   - `j2-pr1-lots.md` : contrats des lots S, C et W de la PR 1 ;
   - `docs/refonte/prototype-iphone.md` §3-§4 : résultats du test iPhone.
4. Ce que les lots S et C ont produit, **indispensable pour la spec du lot W** :
   - `packages/core/src/ingest/types.ts` : `IngestState`, le contrat exact de ce que W doit lire en base ;
   - `packages/core/src/ingest/plan-ingest.ts` : `planIngest(state, events, now) → { payload, rejected, report, nextState }` ;
   - `packages/schemas/src/events/` (en particulier `ingest-payload.ts`, dont l'en-tête documente le choix snake_case du `p_payload`) ;
   - `supabase/migrations/20261117000100` à `000600` (surtout `000600_app_ingest_batch.sql`) et `packages/data/src/database.app.types.ts`.

## 2. État

**Jalon 1 : fusionné dans `dev` le 2026-11-18** (#36 puis #37 → #40, merge commits ; `check`, `refonte:check` et CI verts). Pas de promotion vers `main` : la réécriture n'est pas en production, les migrations du jalon 1 ne sont pas appliquées à la base de prod. **Ne pas promouvoir sans demande explicite du propriétaire.** Les branches `refonte/jalon-1*` et `redesign/journal` restent sur le dépôt (GitHub ne les supprime pas).

**Jalon 2, PR 1 : lots S et C intégrés dans `refonte/jalon-2`** (merges `ad95e79` et `cde967e`, poussés). Après intégration : `npm run check` (1682 tests) et `npm run refonte:check` verts ; `npx supabase test db` : 38 fichiers, 1168 tests, PASS. Fins de ligne LF vérifiées.

- **Lot S** (`refonte/j2-sql`, 7 commits) : 6 migrations `20261117000100`-`000600` (textes partagés ; séance, étapes, `error_item` ; journaux du jeu, `learning_day`, `ingest_state` ; `save_game_settings` ; push, `notification_log`, `content_report` ; `ingest_batch`), pgTAP par bloc, `app_access` mis à jour, types régénérés.
- **Lot C** (`refonte/j2-core`, 6 commits) : schémas Zod stricts (`packages/schemas/src/events/`), `core/grading`, `core/game` (barème `j2.1`, plafonds, série, anneau, preuves d'étape), `core/session`, `core/ingest` (`planIngest`, 300 tests core, cas §4.2 et profil « farm » = 8 XP).
- Worktrees `refonte-j2-sql` et `refonte-j2-core` : propres, peuvent être supprimés.

**Écarts tranchés par les lots, à confirmer dans la revue `relecteur-securite` :**
1. `ingest_batch` applique `cards_created` **avant** `reviews` (une carte créée et révisée dans le même lot passerait sinon en `23503`) ; `planIngest` ne produit de toute façon jamais ce cas.
2. `session.client_id` (`j2-architecture.md` §3.2) **n'est pas créé** : le lot S a suivi la liste de `j2-pr1-lots.md`. À trancher dans la spec W.
3. Lignes d'XP sans source : dédupliquées en SQL sur `(user_id, day, language, reason, md5(meta))` (index `xp_ledger_sourceless_idx`) ; `planIngest` met un `meta.ref` distinct sur chacune (id de séance, de production, `<correctionId>:<n>`, `<sessionId>:<textId>`).
4. Retour d'`ingest_batch` : `{ seq, duplicates }` seulement (pas d'`accepted`). `duplicates` ne liste que les `client_event_id` (tentatives, révisions, productions, réécritures, `ui_event`).
5. Bornes SQL ajoutées : charge ≤ 1 Mio, tableaux ≤ 500, clé inconnue → `22023` ; `learning_days.day` > jour serveur + 1 et XP hors 1..100 → `23514`. La limite de 1 Mio n'est pas vérifiée côté TS : à faire dans W (taille du corps de `POST /api/events`).
6. `ingest_batch` crée à la volée une ligne `ingest_state` manquante (comptes créés par `migrate_user`).
7. `profile.time_zone` suit le dernier `timezone_changes` effectif ; le premier changement émet aussi une ligne de base (ancien fuseau, effet à `profile.createdAt`).
8. `save_game_settings` est un **patch imbriqué** (`{ ring: { tier: 20 } }`), cohérent avec le schéma Zod ; liste fermée de 15 clés ; `streak.mode` **et** `streak.weeklyTarget` prennent effet le lundi suivant ; `notifications.time` est stocké dans `profile.reminder_time`.
9. Push : hôtes autorisés = les trois de la spec **plus `*.notify.windows.com`** (Edge) ; un endpoint ré-enregistré passe à l'utilisateur courant ; 10 abonnements au plus ; `notification_log.status` ∈ `sent`, `failed`, `expired`, unique `(user_id, day, kind)`.
10. `report_content` : vérifie que la cible est visible de l'utilisateur (`23503` sinon), 20 par jour d'apprentissage.
11. Droits de lecture propriétaire ajoutés sur `learning_day`, `setting_change`, `timezone_change`, `device_cursor`, `ui_event`, `notification_log`, `content_report` ; garde « ajout seul » sur `setting_change`, `timezone_change`, `ui_event`.
12. Lot C : raisons ajoutées `no_audio` (motif de zéro), `unknown_item`, `unknown_correction` (refus). Les révisions n'écrivent que `reviews[]` : les motifs de zéro sont dans `report.zeroed`, à écrire par W. `production.corrected` est payé quand la correction est dans `state.corrections` (un appel avec `events` vide la règle). Un réemploi conflictuel d'un `clientEventId` d'un lot précédent n'est détecté que si W stocke l'empreinte (`fingerprint()` exportée). En mode hebdomadaire, `current`/`best` comptent des semaines. FSRS calculé à `max(answeredAt, card.lastReviewAt)`. `state.days` doit être dérivé par W du grand livre par `meta.occurredDay`.

**Non couvert par les tests :** deux lots concurrents (verrou consultatif, `lock_timeout`) ; le chemin `40001` n'est testé que par un `seq` périmé.

**Accords déjà donnés par le propriétaire, à utiliser au bon moment :** `feedback:eval` sur le prompt de correction porté (≈ 0,10 $, appel réel) ; une version mineure de `@sdmm/design` (dépôt `SDMM27/sdmm-design`) avec les tokens listés dans `j2-ecrans.md`.

## 3. Ce qu'il y a à faire, dans l'ordre

1. **Écrire la spec du lot W** dans `docs/refonte/specs/j2-pr1-lot-w.md` (rôle d'architecte, à faire soi-même), d'après `j2-pr1-lots.md` §« Lot W », `IngestState` et les écarts ci-dessus :
   - `packages/data` : lecture de l'`IngestState`, appel d'`ingest_batch` avec reprise sur `40001`, écriture de `report.zeroed`, empreintes des événements ;
   - `POST /api/events` : authentification, taille du corps (≤ 1 Mio), 600 événements/h, `DeliveryReport` ;
   - `GET /api/session/today` : création de la séance, choix du texte, paquet (`served_at`) ;
   - branchement de la file d'événements de l'app sur `/api/events`, paquet de séance dans IndexedDB ;
   - trancher `session.client_id`.
   Puis la confier à `implementer`, dans un worktree dédié (`refonte/j2-web`) tiré de `refonte/jalon-2`.
2. **Relire W**, relancer soi-même `check`, `refonte:check`, `test db`, `build`, puis fusionner dans `refonte/jalon-2`.
3. **Revue `relecteur-securite`** obligatoire sur S + W (lui donner la liste des écarts du §2), corrections, puis `qa-mobile` si des écrans sont touchés.
4. **Ouvrir la PR 1 du jalon 2 vers `dev`**, CI verte, rapport au format du §6 de `passation-suite-refonte.md`. La fusion se fait selon `~/.claude/CLAUDE.md` (livraison automatique), sans promotion vers `main`.
5. Ensuite, PR 2 (écrans de la séance, textes gradués) et PR 3 (correction portée, réécriture, notifications, `metrics:report`) selon `j2-architecture.md` §10, puis captures 390 px clair et sombre, rapport et **arrêt pour validation** du jalon 2.

## 4. Rappels

- Ports : le propriétaire fait souvent tourner `next dev` sur 3000 ; 3200 est le port par défaut de `apps/web` ; lancer les e2e avec `E2E_PORT=3300`, avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` exportés depuis `npx supabase status -o env` (jamais écrits dans un fichier commité).
- `npx supabase db reset` vide la base locale partagée : prévenir si le propriétaire teste quelque chose. Si `app_ai_quota` ou `app_resync` échouent au premier `test db`, c'est un reste de données : refaire `db reset`.
- Le lint lancé à la racine parcourt `.claude/worktrees/` : le lancer depuis le worktree concerné.
- `package-lock.json` est commité en CRLF : un `npm install` sous Windows le réécrit en LF sans changement réel ; ne pas commiter ce bruit.
- Les sous-agents écrivent parfois en CRLF : vérifier `git diff --stat` et retirer les CR avant de commiter.
- Aucun appel réel à l'API sans accord, sauf l'évaluation déjà accordée ci-dessus.
