# Jalon 2 — Spec d'architecture : données, sécurité, hors ligne, IA

Auteur : architecte (session principale). Cette spec fait foi pour les données et la sécurité du jalon 2 (comme `d-architecture.md`). Elle s'appuie sur trois specs sœurs : `j2-seance-contenu.md` (pédagogie), `j2-jeu-xp-serie.md` (règles du jeu, qui font foi pour les chiffres) et `j2-ecrans.md` (interface). Si une sœur contredit celle-ci sur un point de données ou de sécurité, celle-ci l'emporte et l'écart est remonté.

État de départ : schéma `app` du jalon 1 (`j1-pr1-schema-app.md`, durci par `20261112000700_app_integrity_hardening.sql`), point d'appel IA unique (`@dailylingua/ai`, quota au jour d'apprentissage), file d'événements avec réserve des rejets (`@dailylingua/core/offline`), FSRS (`@dailylingua/core/memory`), PWA (Serwist). Résultats iPhone : `prototype-iphone.md` §4.

## 1. Principe : le client propose des tentatives, le serveur décide

```
client ──(lot d'événements, idempotents)──► POST /api/events (route serveur)
                                              │ 1. authentifie (cookie Supabase) → user_id
                                              │ 2. valide chaque événement (Zod, @dailylingua/schemas)
                                              │ 3. lit l'état (séance, cartes, journal du jour) + ingest_seq
                                              │ 4. corrige, applique FSRS, calcule l'XP (@dailylingua/core)
                                              │ 5. app.ingest_batch(...) : une transaction, verrou par utilisateur,
                                              │    refus si ingest_seq a changé (40001 → reprise ≤ 3 fois)
◄──── DeliveryReport { rejected[] } ──────────┘ 6. 200 + refus définitifs ; 5xx/401 = échec passager
```

- **Toute la logique vit en TypeScript dans `@dailylingua/core`** (testée, partagée avec le natif) ; SQL garantit seulement l'atomicité, l'idempotence, l'ordre et les invariants. Aucune règle du barème n'est dupliquée en SQL, sauf les bornes de sûreté (§3.4).
- **Concurrence optimiste** : `app.ingest_state(user_id, seq bigint)`. L'étape 3 lit `seq` ; `ingest_batch` prend `pg_advisory_xact_lock` sur l'utilisateur, compare, incrémente. Deux lots concurrents (deux onglets, deux appareils) ne peuvent donc pas calculer l'XP ou l'état FSRS sur le même instantané.
- **Aucune valeur d'XP, de note ou d'état FSRS ne vient du client.** Le client envoie la réponse brute, la durée, les horodatages et des événements de lecture.

## 2. Événements (contrat `@dailylingua/schemas`, versionné)

Enveloppe : `PendingEvent { clientEventId: uuid, kind, payload, occurredAt }` (déjà en place). Limites : 50 événements par lot, 64 Ko par lot, 600 événements par utilisateur et par heure (au-delà : 429, échec passager côté client).

| `kind` | Charge (résumé) | Effet serveur |
|---|---|---|
| `session_started` | `sessionId` | `session.status = started`, `started_at` |
| `review_attempt` | `cardId`, `mode`, `answer` (texte ou choix), `shownAt`, `answeredAt` | correction, note FSRS dérivée, `review_log`, mise à jour `card`, XP |
| `reading_progress` | `sessionId`, `textId`, positions de défilement horodatées, `audioPlayed` (segments) | preuve de lecture (durée ≥ mots ÷ 400/min, fin atteinte) |
| `comprehension_answer` | `sessionId`, `itemId`, `answer`, `afterListeningOnly` | correction serveur, XP du texte quand les preuves sont réunies |
| `focus_attempt` | `sessionId`, `itemId`, `answer`, `try` (1 ou 2) | correction, XP |
| `production_submitted` | `sessionId`, `productionId` (uuid client), `text` | crée `production` ; la correction est **un appel séparé** (§6), jamais dans l'ingestion |
| `rewrite_submitted` | `correctionId`, `sentenceIndex`, `text` | vérification (§6), `rewrite.accepted`, XP |
| `fluency_pass` | `sessionId`, `textId`, `startedAt`, `endedAt` | vitesse vs passage précédent, XP |
| `session_step_completed` | `sessionId`, `step` | **indicatif seulement** : le serveur recalcule la validation de l'étape d'après les preuves |
| `ui_event` | `name` (liste fermée : `push_permission_prompted`, `sound_toggled`, …), `value` | mesures (§9) |

Refus définitifs (→ réserve des rejets, `reason`) : `invalid_payload`, `unknown_session`, `foreign_session`, `unknown_card`, `too_old` (> 7 jours à la réception : borne `attempt_occurred_bounds` déjà en base ; entre 72 h et 7 jours l'événement est accepté, marqué `late`, son XP inscrite au jour de réception, sans effet sur l'anneau ni la série, cf. `j2-jeu-xp-serie.md`), `in_future` (> 5 min), `duplicate_conflict` (même `clientEventId`, charge différente). Un doublon identique est **accepté** (idempotence), pas refusé.

## 3. Données (migrations `2026111X…`, base locale uniquement → `migrateur-donnees`)

### 3.1 Textes gradués partagés

| Table | Colonnes clés | Droits |
|---|---|---|
| `app.text` | `id uuid`, `language`, `level_band` (`A2`,`B1`,`B2`,`C1`; C2 servi par C1 au jalon 2), `density smallint` (cran 1 à 3 du niveau, `j2-seance-contenu.md`), `theme`, `prompt_version`, `title`, `body` (≤ 8 000 car.), `word_count`, `new_words jsonb`, `grammar_point text null`, `status` (`generated`,`checked`,`published`,`retired`), `checks jsonb` (résultats des contrôles), `model`, `created_at`. Unique `(language, level_band, density, theme, prompt_version, variant)` | lecture `authenticated` si `status = 'published'` ; écriture `service_role` |
| `app.text_item` | `id uuid`, `text_id`, `step` (`reading`,`workshop`), `kind` (`mcq`,`short_answer`,`cloze`,`transform`), `position`, `prompt jsonb` (énoncé, options), `listening_only boolean` | lecture si le texte est publié |
| `app.text_item_key` | `item_id` PK, `answer jsonb`, `accept jsonb` (variantes) | **aucune lecture client** ; servie au client uniquement dans le paquet de séance (§5) |
| `app.text_read` | `user_id`, `text_id`, `first_read_day`, PK `(user_id, text_id)` | lecture propriétaire ; sert à ne jamais servir deux fois le même texte |

Le texte n'est montré que `published` : contrôles automatiques réussis (`j2-seance-contenu.md`) **et** relecture par un second appel Haiku sans signal bloquant. La relecture par échantillon avec un modèle plus fort (Batch, exception validée) arrive au jalon 3 ; au jalon 2, l'interface affiche « Texte généré, vérifié automatiquement ».

### 3.2 Séance

- `app.session` (existe) : `plan jsonb` reçoit le plan du jour (étapes, format, `text_id`, cartes prévues, item de l'erreur du jour), **sans clés de réponse**. Ajouts : `format smallint` (10/15/20/30), `kind` (`daily`, `catch_up`, `review_only`), `client_id uuid null`. La contrainte `unique (user_id, language, day)` devient `unique (user_id, language, day, kind)` (la séance de rattrapage de la réparation est une seconde séance du même jour). Contenu d'une séance `catch_up` : le format 10 min de `j2-seance-contenu.md`, avec le texte suivant de la file de l'apprenant ; elle ne rapporte pas `session.complete`.
- `app.session_step` (nouvelle, dérivée, réécrite par l'ingestion) : `session_id`, `step`, `validated_at null`, `proof jsonb`. Lecture propriétaire.
- `app.attempt` (existe, ajout seul) : reçoit toutes les tentatives notées. `exercise_ref` = `text_item.id` ou `card.id`.
- `app.card.source` : ajouter la valeur `session` (cartes créées en séance : mots de l'atelier, erreur du jour ratée), au lieu de réutiliser `mission`.

### 3.3 Jeu

- `app.xp_ledger` (existe, ajout seul) : `reason` = identifiant de règle stable de `j2-jeu-xp-serie.md` (ex. `review.recognition`). Ajouts : `rule_version text not null`, `league_eligible boolean not null default true` (prévu pour le jalon 7). Plafond de sûreté actuel `amount <= 100` : à garder si le barème le permet, sinon le relever **dans la même migration** que la règle qui l'exige.
- `app.learning_day` (nouvelle, dérivée) : `user_id`, `day`, `time_zone`, `xp_verified int`, `validated boolean`, `cause text` (`work`,`session`,`freeze`,`rest`,`repair`,`travel`,`off`,`none`), `first_activity_at`, PK `(user_id, day)`. Remplace l'usage de `study_day` pour la nouvelle app (`study_day` reste la trace de la reprise).
- `app.streak_state` (existe) : ajouts `last_repair_day date null`, `freezes_granted_through date null`, `best_set_on date null`, `time_zone_changed_at timestamptz null`. **État dérivé** : recalculé par `@dailylingua/core` depuis `learning_day` à chaque ingestion et écrit dans la même transaction.
- `app.profile.game_settings` : schéma Zod fermé (interrupteurs de `j2-jeu-xp-serie.md` §8), validé par `save_profile` étendu ou par une nouvelle `app.save_game_settings(p jsonb)` (`security definer`, `auth.uid()` seulement). Un changement d'objectif s'applique le lendemain : `goal_history` en ajout seul dans le JSON, non : table `app.setting_change` (ajout seul : `user_id`, `key`, `value jsonb`, `effective_day`, `changed_at`) pour l'objectif, les jours de repos, le mode de série et l'activation de la série. Sans cet historique, le recalcul de la série ne serait pas rejouable. `streak_state` n'en garde que la valeur courante, dérivée.

### 3.4 Fonction d'ingestion

`app.ingest_batch(p_user_id uuid, p_expected_seq bigint, p_payload jsonb) returns jsonb` — `security definer`, `search_path = ''`, exécutable par `service_role` seulement (révocations explicites, test générique `app_access`). Dans une transaction :
1. `pg_advisory_xact_lock(hashtextextended('app.ingest:' || p_user_id, 0))` ; `lock_timeout = '5s'`.
2. `ingest_state.seq = p_expected_seq` sinon `raise sqlstate '40001'`.
3. insère `attempt`, `review_log`, `production`, `rewrite` (ignore un `client_event_id` déjà présent avec charge identique ; `23505` sinon) ; met à jour `card` (état FSRS), `session`, `session_step`, `text_read` ;
4. insère les lignes `xp_ledger` fournies, avec bornes de sûreté vérifiées **en SQL** : somme du jour par utilisateur ≤ 400 (plafond théorique du barème : 336, `j2-jeu-xp-serie.md`), `day` ∈ [jour serveur − 3, jour serveur + 1], unicité `(attempt_id, reason)` / `(review_log_id, reason)` déjà en place ;
5. remplace `learning_day` des jours touchés et `streak_state` par les valeurs fournies ;
6. `seq = seq + 1` ; rend `{ seq, accepted: [...], duplicates: [...] }`.

`p_user_id` vient de la session serveur, jamais du corps de la requête. Tests pgTAP : droits, idempotence, `40001`, bornes, appartenance (une carte ou une séance d'un autre utilisateur → `23503` grâce aux clés composites existantes), atomicité (une ligne invalide annule tout le lot).

### 3.5 Notifications

| Table | Colonnes | Droits |
|---|---|---|
| `app.push_subscription` | `id`, `user_id`, `endpoint` (unique, ≤ 1 000, `https://` d'un service push connu : liste fermée d'hôtes, dont `web.push.apple.com`, `fcm.googleapis.com`, `updates.push.services.mozilla.com`), `p256dh`, `auth`, `user_agent` (≤ 300), `created_at`, `last_success_at`, `failures` | écriture par `app.save_push_subscription` / `app.delete_push_subscription` (`auth.uid()`), lecture propriétaire sans `p256dh`/`auth` (privilèges par colonne) |
| `app.notification_log` | `id`, `user_id`, `day`, `kind` (`daily`,`weekly_summary`), `template`, `sent_at`, `opened_at null`, `status` | lecture propriétaire ; écriture `service_role` |

Envoi : route `/api/cron/reminders` protégée par `CRON_SECRET` (comme l'ancienne app), appelée toutes les 15 min par GitHub Actions ; sélection en SQL (`app.reminders_due(p_at timestamptz)`, `service_role`) puis règles fines en TypeScript (`@dailylingua/core`). Abonnement expiré (404/410) → suppression. La liste fermée d'hôtes évite que le serveur serve de relais vers une adresse arbitraire (SSRF).

## 4. Hors ligne

| Élément | Où | Durée de vie |
|---|---|---|
| Paquet de séance du jour : plan, texte, items **avec leurs clés**, cartes prévues + cartes dues sur 2 jours, consignes | IndexedDB `dailylingua-session`, une entrée par `(language, day)` | purgé après synchronisation complète de la séance, ou à J+2 |
| Tentatives | file d'événements existante | jusqu'à l'accusé de réception ; refus → réserve des rejets |
| Production en attente de correction | file d'événements (`production_submitted`) + état local « en attente » | corrigée au retour du réseau (appel séparé §6) |
| Résultat affiché hors ligne | calculé par le même `@dailylingua/core`, marqué **provisoire** (anneau grisé) | remplacé par la réponse serveur |

Préchargement : à l'ouverture d'« Aujourd'hui » en ligne, le serveur crée la séance du jour (fonction serveur, `service_role`) et rend le paquet. Si l'apprenant ouvre l'app hors ligne un jour sans paquet : séance `review_only` (Réveil sur les cartes locales), validée et comptée à la synchronisation.

**Clés de réponse envoyées au client (point à trancher n° A1).** Sans elles, ni retour immédiat ni séance hors ligne. Risque : un tricheur lit les clés et répond juste. Parades : le serveur recorrige toujours, durées minimales, plafonds d'XP par action et par jour, rendements décroissants, XP de ligue (jalon 7) soumise à la détection d'anomalies. Gain maximal d'une triche par les clés : l'XP plafonnée de l'input et de l'atelier, soit environ 60 XP par jour. Recommandation : **les envoyer dans le paquet de séance** ; les items non utilisés hors séance (bibliothèque, jalon 3) ne sont jamais servis avec leur clé.

## 5. Paquet de séance (`GET /api/session/today?language=xx`)

Route serveur, cookie requis. Rend `{ session, steps, text, items (avec clés), cards, errorOfTheDay, quotas: { writingFeedback, rewriteCheck }, serverDay, timeZone }`. Validé par un schéma Zod partagé. Cache HTTP : `private, no-store` (rien d'utilisateur dans le cache HTTP, règle du jalon 1) ; c'est l'app qui le range dans IndexedDB.

## 6. IA du jalon 2 (via `@dailylingua/ai` uniquement)

| Objet | Quand | Mode | Quota |
|---|---|---|---|
| `graded_text` (génération + items) | à la demande, quand une case langue × niveau × thème n'a plus de texte non lu par l'apprenant | immédiat, `learner: null` (partagé) ; plafond global 30 générations par jour (disjoncteur en plus) | aucun par apprenant |
| `graded_text_review` (nouveau, second appel) | juste après la génération | immédiat | aucun |
| `writing_feedback` | `POST /api/production/{id}/feedback` | immédiat, cache de prompt | 3 / jour d'apprentissage |
| `rewrite_check` | à l'ingestion de `rewrite_submitted`, **hors transaction** : la route appelle d'abord l'IA puis ingère le résultat | immédiat | 6 / jour |

- **Génération en Batch la nuit** : reportée au jalon 3 (point à trancher A2). Au jalon 2, le stock se remplit à la demande et il est partagé ; coût ≈ 0,002 $ par texte au lieu de 0,001 $.
- **Prompts** dans `packages/ai/src/prompts/` (versionnés), paramétrés par langue cible, niveau, L1 (pour la correction), jamais par une chaîne libre de l'utilisateur dans les consignes. Le texte de l'apprenant va dans un message séparé (règle du jalon 1).
- **Portage de la correction écrite** : le prompt `src/lib/generation/writing-feedback-prompt.ts` (version `2026-10-21.1`) et le schéma `src/lib/schemas/writing-feedback.ts` sont repris dans `packages/ai` et `packages/schemas` avec la L1 en paramètre, la catégorie « calques de la L1 » ajoutée, une nouvelle version de prompt. L'ancienne app n'est pas modifiée. `feedback:eval` est étendu à deux L1 (fr, en) dans `packages/ai` ; **son exécution est payante (≈ 0,10 $) et demande ton accord** (point A3).
- Vérification de la réécriture : sortie structurée `{ fixedErrorIds: string[], newErrors: [...] }` ; la règle « au moins une erreur signalée supprimée » est appliquée en TypeScript sur cette sortie, pas laissée au modèle.

## 7. Sécurité : surfaces nouvelles et parades

| Surface | Menace | Parade |
|---|---|---|
| `POST /api/events` | XP forgée, rejeu, triche par horodatage, surcharge | aucune XP du client ; `client_event_id` unique ; fenêtre 72 h / +5 min ; plafonds TS + bornes SQL ; 600 événements/h ; taille des lots |
| `ingest_batch` | appel direct par un client | `service_role` seulement, révocations testées ; `p_user_id` jamais lu du corps |
| Concurrence | double crédit par deux lots simultanés | verrou + `ingest_seq` (§1) |
| Clés de réponse | lecture dans IndexedDB | A1 : recorrection serveur, plafonds ; jamais de clé hors séance |
| Textes générés | contenu inapproprié ou faux | statut `published` seulement après contrôles + second appel ; bouton « signaler » (`content_report`, prévu `d-architecture.md` §5) |
| Correction IA | injection dans le texte de l'apprenant | texte en message séparé, sortie Zod stricte, aucune action déclenchée par la sortie |
| Push | SSRF via `endpoint`, fuite des clés | liste fermée d'hôtes, privilèges par colonne |
| Cron | déclenchement public | `CRON_SECRET` ≥ 32 car., 401 sinon (smoke test comme l'ancienne app) |
| Réglages | JSON arbitraire dans `game_settings` | schéma fermé, fonction dédiée |

Revue `relecteur-securite` **obligatoire** sur chaque PR qui touche au schéma, à `ingest_batch`, aux routes d'événements ou au cron.

## 8. Code partagé

- `@dailylingua/schemas` : événements, paquet de séance, réglages de jeu, sortie des appels IA.
- `@dailylingua/core` : `session/` (plan, validation des étapes), `grading/` (correction des items et des cartes, tolérances), `game/` (barème, plafonds, attribution au jour, série, anneau), `notifications/` (décision d'envoi). Pur, testé, sans horloge (l'instant est passé en paramètre).
- `@dailylingua/data` : lecture de l'état, appel d'`ingest_batch`, abonnements push ; client de service injecté.
- `apps/web` : routes, écrans, IndexedDB du paquet, service worker (gestion de l'événement `push` et du clic sur la notification).

## 9. Mesures (alignées sur `h-indicateurs.md`)

Sources directes : `session` (débuts, fins, durée réelle vs format), `attempt` et `review_log` (réussite, rétention), `rewrite` (taux de réécriture réussie), `xp_ledger`, `learning_day`, `notification_log`, `ai_call`. Les événements d'interface (`ui_event`) vont dans `app.ui_event` (ajout seul, liste fermée de noms, lecture propriétaire). Script `npm run metrics:report` (lecture seule, local ou copie) : rétention J1/J7, achèvement, rétention mesurée des cartes, taux de réécriture, coût par actif. Aucun outil d'analyse tiers.

## 10. Découpage proposé

| PR | Contenu | Agents |
|---|---|---|
| **J2-PR1 — Socle de la boucle** | migrations §3 + pgTAP ; schémas d'événements ; `core` (correction, barème, jour, série, anneau, plan de séance) ; `/api/events`, `/api/session/today` ; paquet hors ligne | `migrateur-donnees` (SQL), `implementer` ×2 en parallèle (core / web), `relecteur-securite` |
| **J2-PR2 — La séance à l'écran** | écrans des six étapes, bilan, Aujourd'hui, série, réglages ; textes gradués (génération + relecture + contrôles) ; i18n | `implementer` ×2 (écrans / texte gradué), `quick-task` (messages), `qa-mobile` |
| **J2-PR3 — Expression et rappel** | portage de la correction (L1), réécriture vérifiée, erreur du jour ; notifications (abonnement, cron, service worker) ; `metrics:report` | `implementer` ×2 (correction / notifications), `relecteur-securite`, `qa-mobile` |

Critères de chaque PR : `refonte:check`, `refonte:build`, e2e WebKit 390 px clair et sombre, `db reset` + `test db` + `migration:verify`, LF, captures, CI verte.
