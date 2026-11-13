# Jalon 1, PR 3 — Spec : coût de l'IA, hors ligne, prototype sur iPhone

Auteur : architecte. Trois lots indépendants. Références : `d-architecture.md` §6, §9 ; `g-budget.md` ; `00-audit-et-benchmark.md` §5.

## Lot D — Quotas et coût en SQL (`migrateur-donnees`)

Migration `20261114000100_app_ai_quota.sql` + `supabase/tests/database/app_ai_quota.test.sql`. Tout est réservé à `service_role` (`security definer`, `search_path` vide, `revoke` explicite) : aucun client n'appelle ces fonctions.

- `app.claim_quota(p_user_id uuid, p_kind text, p_limit integer, p_day date) returns boolean` : incrémente `app.quota_usage` de façon atomique si `used < p_limit` et rend `true` ; sinon rend `false` sans rien changer. `p_limit <= 0` → `false`. `p_kind` : 1 à 40 caractères `[a-z_]`.
- `app.release_quota(p_user_id, p_kind, p_day)` : décrémente (jamais sous 0) quand l'appel a échoué avant d'être facturé.
- `app.record_ai_call(p_purpose text, p_model text, p_prompt_version text, p_input_tokens int, p_output_tokens int, p_cache_read_tokens int, p_cache_write_tokens int, p_batch boolean, p_cost_usd numeric, p_user_id uuid, p_status text) returns bigint` : insère dans `app.ai_call` (valeurs négatives refusées, `22023`).
- `app.ai_spend(p_from timestamptz, p_to timestamptz) returns table (purpose text, model text, calls bigint, input_tokens bigint, output_tokens bigint, cost_usd numeric)` et `app.ai_spend_month(p_at timestamptz) returns numeric` (total du mois civil UTC de `p_at`).

Tests : atomicité (deux réclamations à la limite : une seule passe), jour et type distincts, refus à `authenticated` et `anon` pour chaque fonction, totaux exacts, `service_role` peut tout appeler. Mettre à jour le test générique d'`app_access` si nécessaire, régénérer `packages/data/src/database.app.types.ts`. Critères : `db reset`, `test db` (tout vert), `migrations:check`, `migration:verify`.

## Lot C — `@dailylingua/ai` : point d'appel unique (`implementer`)

Nouveau paquet `packages/ai`, mêmes conventions que les autres. Dépendances : `@anthropic-ai/sdk` (version de la racine), `zod`, `@dailylingua/schemas`. Pas de React, de Next ni de Supabase : les accès à la base sont **injectés**.

Avant d'écrire : charger le skill `claude-api` s'il est disponible, lire les types du SDK installé (`node_modules/@anthropic-ai/sdk`) pour le cache de prompt, la sortie structurée et le champ `usage`, et lire `src/lib/generation/anthropic-client.ts`, `config.ts` et `writing-feedback.ts` de l'app actuelle (bascule de clé de secours, délais, validation). Rien de mémoire.

- `src/pricing.ts` : table de prix par modèle (entrée, sortie, lecture et écriture de cache, remise Batch) en dollars par million de tokens, avec la date de relevé. Valeurs de départ : celles de `docs/plans/roadmap-plateforme.md` §6.1, à revérifier dans la documentation chargée ; si elles diffèrent, utiliser les valeurs vérifiées et le dire dans le rapport. `costUsd(model, usage, { batch })` pur et testé.
- `src/purposes.ts` : registre des objets d'appel (`writing_feedback`, `rewrite_check`, `graded_text`, `gloss`, `translation`, `roleplay`, `assessment_grading`) avec, pour chacun : `essential` (booléen : continue quand le budget est épuisé), `quotaKind`, `dailyLimit`, `maxOutputTokens`. Valeurs : `g-budget.md` §5.
- `src/call.ts` : `createAiGateway({ client, store, now, monthlyBudgetUsd, model })` où `store` est une interface (`claimQuota`, `releaseQuota`, `recordCall`, `monthSpendUsd`) et `client` l'interface minimale du SDK. `gateway.call({ purpose, promptVersion, system, messages, schema, userId })` :
  1. disjoncteur : si la dépense du mois ≥ budget et que l'objet n'est pas essentiel → erreur `budget_exhausted`, aucun appel ; à 80 % du budget, un drapeau `budgetWarning` dans le résultat ;
  2. quota : `claimQuota` avant l'appel (`quota_exceeded` sinon) ; libéré si l'appel échoue ;
  3. appel du modèle (Haiku 5.5 par défaut, identifiant dans une constante unique), consignes longues marquées pour le cache de prompt, délai et une seule reprise ;
  4. validation de la sortie par le schéma Zod (`invalid_output` sinon, appel tout de même journalisé) ;
  5. `recordCall` **toujours**, succès ou échec, avec les tokens réellement rapportés et le coût calculé.

  Le texte de l'utilisateur est placé dans un message distinct des consignes, jamais concaténé dedans.
- Erreurs : `AiError` à codes stables (`budget_exhausted`, `quota_exceeded`, `invalid_output`, `provider_error`, `timeout`).
- `packages/data` : ajouter `src/ai-store.ts`, implémentation de `store` par les fonctions du lot D avec un client **de service** reçu en paramètre (le paquet n'en crée pas). Les types générés ne contiennent pas encore ces fonctions : typer les appels localement et le signaler.
- `scripts/cost-report.mts` + script npm `cost:report` : dépense du mois par objet et par modèle, en lecture seule.
- Tests : uniquement avec un faux client et un faux `store` — **aucun appel réel, aucune clé**. Cas : coût, disjoncteur (essentiel / non essentiel, seuil de 80 %), quota atteint, libération sur échec, sortie invalide journalisée, reprise unique, consignes mises en cache. Ajouter `ai` aux frontières d'import.

Ne rien toucher dans `src/`, `supabase/`, `apps/`. Critères : `npm install`, `npm run refonte:check`, `npm run check` verts ; LF ; commits atomiques.

## Lot E — PWA, hors ligne et prototype iPhone (`implementer`)

Dans `apps/web` et `packages/core`. Avant d'écrire : lire le guide PWA de `node_modules/next/dist/docs/` et la documentation de Serwist pour Next.js avec Turbopack (version installée).

1. **Manifeste et installation** : `app/manifest.ts` (nom et description traduits, `display: standalone`, couleurs du thème clair), icônes, `apple-touch-icon`, métadonnées `viewport` (`viewport-fit=cover`, couleur de thème claire et sombre).
2. **Service worker** (Serwist) : pré-cache de la coquille et des polices ; page hors ligne traduite ; stratégie réseau d'abord pour les pages ; aucune donnée d'utilisateur dans le cache HTTP. Désactivé en développement.
3. **File d'événements hors ligne** :
   - `packages/core/src/offline/` : types `PendingEvent { clientEventId, kind, payload, occurredAt }`, interface `EventQueue` (`enqueue`, `peekBatch`, `ack`, `size`), logique pure de lots, de reprise avec attente croissante et d'idempotence (un `clientEventId` n'est jamais envoyé deux fois avec succès), testée avec une file en mémoire.
   - `apps/web/src/lib/offline/` : implémentation IndexedDB de `EventQueue`, indicateur de connexion, envoi au retour du réseau. Aucune tentative n'existe encore : la file est branchée sur un envoi factice et démontrée dans `/lab`.
4. **`/lab` — page de prototype** (connecté seulement, lien discret dans les réglages) : une carte par vérification, chacune avec un bouton, un résultat lisible et copiable :
   - mode installé (`display-mode: standalone`), agent utilisateur, stockage estimé et persistance ;
   - micro : permission, `MediaRecorder` (types MIME acceptés), enregistrement de 5 secondes, réécoute, taille du fichier — **rien n'est envoyé au serveur** ;
   - voix de synthèse disponibles pour la langue apprise, lecture d'une phrase d'essai ;
   - `SpeechRecognition` : présent ou non, essai ;
   - notifications : permission, abonnement Web Push avec la clé publique `NEXT_PUBLIC_VAPID_PUBLIC_KEY` si elle est définie, affichage de l'abonnement ; une route `POST /lab/push-test` (connecté, limitée à l'abonnement fourni par l'appelant, désactivée sans `VAPID_PRIVATE_KEY`) envoie une notification d'essai avec `web-push` ;
   - file hors ligne : mettre 3 événements en file, couper le réseau, rétablir, voir l'envoi.

   Tous les textes passent par `@dailylingua/i18n` (fr et en).
5. **En-têtes** : `microphone=(self)` dans la politique de permissions de `apps/web` uniquement.
6. Tests : logique de file (Vitest), manifeste, e2e Playwright : page hors ligne servie réseau coupé après une première visite (build de production), `/lab` s'affiche, pas de débordement horizontal.
7. `docs/refonte/prototype-iphone.md` : protocole de test sur iPhone réel, pas à pas (ouvrir, installer sur l'écran d'accueil, chaque carte de `/lab`, quoi noter), avec un tableau de résultats vide à remplir. Seul ajout permis sous `docs/`.

Dépendances permises : `serwist` et `@serwist/next` (ou le paquet que sa doc recommande pour Turbopack), `web-push` et ses types. Ne rien toucher dans `src/`, `supabase/`, `scripts/`. Critères : `npm install`, `refonte:check`, `refonte:build`, e2e de `apps/web`, `check` et `build` de l'app actuelle verts ; LF ; commits atomiques.
