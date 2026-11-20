# Passation — refonte DailyLingua, jalon 2 (mise à jour du 2026-11-20)

## Expression et rappel — 20 novembre

- Implémentation au commit `8b2b27f` sur `codex/jalon-2-expression-rappel`, à la suite de `c9717bd` (rapport mensuel) et `e532c65` (séance et reprise hors ligne). Le worktree de départ sur C: était propre. Le worktree de vérification `refonte-j2-pr2` contenait des modifications locales. Le lot a été préparé dans une copie Git isolée sur D:, avec une copie des dépendances et des liens npm vers les paquets de cette copie.
- La production et son identifiant de correction sont enregistrés ensemble dans IndexedDB. Après acceptation de l’événement, le navigateur demande la correction au serveur. Le moteur versionné reçoit la langue maternelle du profil. Une réservation atomique protège les appels et l’ingestion rejouable attribue l’XP. En cas d’issue fournisseur incertaine, la réservation reste terminale pour éviter une seconde facturation. Le texte déjà soumis est conservé sur le serveur. À la déconnexion, les corrections résolues sont retirées du cache local et les événements en attente restent dans le journal du compte.
- L’ingestion décide de la réécriture, de l’XP et des preuves d’étape. La similarité calculée à la réception est persistée dans `production.task`. Elle exclut la production courante par son identifiant. Une copie ou une ancienne production sans preuve durable peut garder une correction lisible. L’XP dérivée et la génération de son erreur du jour exigent la preuve serveur. Une phrase déjà vérifiée ne donne pas de crédit supplémentaire. L’erreur du jour est proposée au réveil dans une séance future.
- Les réglages gèrent l’activation, l’heure, le bilan hebdomadaire et le désabonnement de l’appareil. Le cron authentifié relit le fuseau accepté, applique les règles de jour de repos et d’activité, puis réserve au plus un rappel par jour d’apprentissage et par compte. L’envoi revalide la destination HTTPS et les clés. Le transport rejette les redirections. Les réponses Push 404/410 suppriment l’abonnement expiré.
- **Décision produit à valider.** Pour desservir les heures nocturnes choisies avec le cron GitHub toutes les 15 minutes, une heure explicitement choisie entre 21 h 30 et 8 h peut déclencher jusqu’à 30 minutes après. La spécification demandait la minute exacte pour ce cas. En dehors d’un choix nocturne explicite, la plage de silence est appliquée. La réservation conserve le jour d’apprentissage du créneau, y compris s’il franchit 4 h.
- **Activation après validation.** Le workflow GitHub attend la variable `REFONTE_REMINDERS_ENABLED=true` et les secrets `REFONTE_APP_URL` et `CRON_SECRET`. L’application lit le même secret de cron et les variables VAPID décrites dans `.env.example`. `EXPRESSION_AI` est désactivé par défaut. Les comptes invités utilisent la vérification déterministe sans appel payant. Le scénario WebKit utilise un faux fournisseur Anthropic sur la boucle locale. L’accord de `feedback:eval` a été relu. Aucun appel réel, aucune dépense, aucun envoi Push réel et aucun déploiement n’ont été effectués.
- **Revue de sécurité indépendante.** Revue du diff par `relecteur-securite`, puis contre-revue favorable des correctifs. Points traités : originalité et preuve des effets dérivés, restriction des comptes invités, purge locale, clés d’abonnement et réservation quotidienne. La décision sur la fenêtre nocturne reste au propriétaire.

### Vérifications locales

- Base Supabase `daily-lingua-j2-expression-qa`, API 54421 et PostgreSQL 54422. Le `db reset --local` a appliqué toutes les migrations jusqu’à `20261119000600`. Les pgTAP passent sur la base réinitialisée (45 fichiers, 1 315 assertions). Les essais précédents ont révélé un inventaire des droits à mettre à jour, puis le test de quota historique a nécessité une base réinitialisée après le scénario WebKit.
- `npm run refonte:check` passe avec les identifiants de la base isolée (811 tests Vitest réussis, dont l’intégration d’ingestion et de données, 7 ignorés dans le paquet core). `npm run migrations:check` passe. `npm run migration:verify` donne zéro écart. `npm run metrics:report -- --month 2026-11` fonctionne sur la base de test. Les coûts affichés correspondent aux jetons déclarés par le faux fournisseur.
- `npm run e2e --workspace @dailylingua/web -- expression.spec.ts` passe (2 tests WebKit à 390 px, clair et sombre). Le scénario soumet un texte hors ligne, recharge l’application, récupère la correction à la reconnexion, vérifie la réécriture et ouvre les réglages des rappels. Le faux fournisseur local reçoit un seul appel de correction par scénario. La commande de test est passée avec `E2E_WEBPACK=1`, `E2E_PORT=3359` et `E2E_EXPRESSION_AI_PORT=3360`. Le build Webpack réussit, avec l’avertissement existant de Browserslist/Serwist. Les captures sont dans `apps/web/test-results/*/correction.png`.
- `npm run refonte:build` (Turbopack) n’est pas validé sur cet hôte Windows. Le premier essai échoue sur le téléchargement de Google Fonts. La relance avec accès réseau s’arrête sur une erreur interne du processus Node/PostCSS dans `apps/web/src/app/globals.css`. Le lot a été testé en mode production avec Webpack.

**Arrêt pour validation du jalon 2.** La fusion, le déploiement, l’activation des rappels et le jalon 3 attendent l’accord du propriétaire.

## Reprise locale du 19 novembre

- Le lot « La séance à l’écran » est sur `codex/jalon-2-seance`, au commit `e532c65`. La séance, les textes gradués et la reprise après rechargement hors ligne sont branchés. La génération payante reste désactivée par défaut.
- `refonte:check` et le build Webpack passent. WebKit à 390 px a exercé le rechargement hors ligne avec le service worker et un paquet fictif. Les 11 tests de publication passent dans un PostgreSQL éphémère. Le parcours Supabase complet reste à vérifier sur une base locale à jour.
- Le lot « Expression et rappel » commence sur `codex/jalon-2-expression-rappel` avec `npm run metrics:report -- --month AAAA-MM`. Le rapport lit des agrégats réservés au rôle de service et exige une URL locale. Les trois tests pgTAP couvrent les cohortes, les comptages et les droits.
- La reprise du lot est décrite dans la section du 20 novembre.

La branche locale ci-dessus prolonge `refonte/jalon-2`. Les sections qui suivent décrivent l’état après la PR 1 et le périmètre des lots 2 et 3. Ce document complète `passation-suite-refonte.md`, dont les §1, §5 et §6 s’appliquent toujours.

## 1. À lire avant d'agir

1. `passation-suite-refonte.md` (racine) : §1, §5, §6.
2. `AGENTS.md`, `CLAUDE.md`, `~/.claude/CLAUDE.md`. Next.js 16 : lire `node_modules/next/dist/docs/` avant d'écrire du code Next.
3. Specs du jalon 2 (`docs/refonte/specs/`) :
   - `j2-points-a-trancher.md` (14 points validés), `j2-architecture.md` (fait foi pour les données et la sécurité), `j2-jeu-xp-serie.md` (fait foi pour les chiffres du jeu), `j2-seance-contenu.md`, `j2-ecrans.md`, `maquettes/j2/j2-ecrans.html` ;
   - `j2-pr1-lots.md` (lots S, C, W) et **`j2-pr1-lot-w.md`** (décisions D1-D9, §11 correctifs de sécurité) : ce que la PR 2 branche sur des écrans ;
   - `docs/refonte/prototype-iphone.md` §3-§4.
4. `docs/reviews/refonte/j2-pr1-securite.md` : revue S + W, constats acceptés ou reportés (§3 ci-dessous).

## 2. État

**Jalon 1 : fusionné dans `dev`** (#36 → #40). **Jalon 2, PR 1 « socle de la boucle » : fusionnée dans `dev` le 2026-11-18** ([#41](https://github.com/SDMM27/DailyLingua/pull/41), merge `cd80b0b`, CI verte : typecheck/lint/tests/build, pgTAP/intégration/E2E, Vercel). **Aucune promotion vers `main`** : la réécriture n'est pas en production, aucune migration n'est appliquée à la base de prod. Ne pas promouvoir sans demande explicite du propriétaire.

Contenu de la PR 1 :
- Lot S : migrations `20261117000100`-`000600` (+ pgTAP).
- Lot C : schémas Zod des événements, du paquet, du `p_payload` ; `core` grading/game/session/ingest (`planIngest`).
- Lot W : migration `20261118000100` (registre `ingest_event`, `ingest_state.memo`, `text.writing_task`/`listening_segment`, `event_rate`) ; `packages/data` (`ingest-rows`, `ingest-write`, `session-today`) ; `apps/web` : client de service `server-only`, `lib/ingest/*`, `lib/session-packet/*`, `POST /api/events`, `GET /api/session/today`, expéditeur HTTP, file et paquet IndexedDB par utilisateur, préchargement invisible sur Aujourd'hui, suppression du paquet à la déconnexion (`SignOutForm`).
- Correctifs de sécurité : migrations `20261118000200` (fuseau verrouillé après la 1re ingestion, 50 réglages / 24 h, borne d'`effective_at`, index XP), `000300` (ligne de base du fuseau exemptée), `000400` (le profil suit un changement daté jusqu'à +5 min) ; 10 productions / 24 h glissantes (`too_many`) ; memo borné ; l'expéditeur coupe un lot en 413 ; SQLSTATE 22/23/42501 → refus définitif.

Vérifications finales (sur `f2e5408`) : `db reset` + `test db` 40 fichiers / 1271 tests PASS ; `migrations:check`, `migration:verify` OK ; `refonte:check` vert (web 223, ai 64, core 300 + 7 ignorés, data 102, i18n 15, schemas 75, intégration comprise) ; `check` 1760 ; `refonte:build`, `build` verts. Revue de code APPROVED, revue de sécurité READY, test fonctionnel OK (WebKit 390 px clair et sombre).

**Décisions prises en PR 1, à respecter :**
- `session.client_id` abandonné (D1) : le serveur crée toujours les séances ; hors ligne sans paquet, les révisions sont acceptées sans séance.
- Orchestration de l'ingestion dans `apps/web/src/lib/ingest/` (D2 : `data` n'importe pas `core`).
- Tout l'état dérivé non reconstructible vit dans `ingest_state.memo` et `app.ingest_event`, écrits par `ingest_batch` depuis `nextState` (D3).
- La clé d'une carte = le mode servi, enregistré dans `session.plan.servedCards` ; un `review_attempt` dans un autre mode est refusé (D5). Options QCM : `id` = id de la carte dont l'option est le sens.
- Sans texte publié avec `writing_task` → séance `review_only` (D6). Un apprenant A0/A1 reçoit la bande A2 : il n'aura de texte qu'une fois des textes A2 publiés.
- Corrections et `rewrite_check` : `state.corrections = {}` et `rewriteChecks = {}` jusqu'à la PR 3 (D7) ; un `rewrite_submitted` est refusé `unknown_correction`.
- Une fois `ingest_state.seq > 0`, `save_profile` ignore `time_zone` : l'écran Réglages doit le dire (PR 2).

## 3. Périmètre historique des lots du jalon 2

1. **PR 2 — La séance à l'écran** (`j2-architecture.md` §10) : écrans des six étapes, bilan, Aujourd'hui, série, réglages ; génération des textes gradués (génération + relecture Haiku + contrôles, plafond 30/jour, `writing_task` et `listening_segment` à remplir, `text_item.prompt.card` pour les mots de l'atelier, voir `j2-pr1-lot-w.md` §5) ; i18n ; `qa-mobile`. Le contexte React `enqueue` de `EventSyncProvider` est prêt pour les écrans.
2. **Dettes de la PR 1 à traiter dans la PR 2** (remarques non bloquantes) :
   - `session-packet-store.ts` : fermer la connexion IndexedDB (`onversionchange` → `close()`), sinon la base du paquet (clés de réponse) n'est supprimée qu'à la fermeture de l'onglet après déconnexion ;
   - `ingest-events.ts` : écarter du rapport les `clientEventId` qui ne sont pas des UUID (sinon 503 et file bloquée sur un client bogué) ; signaler `server_refused` au-delà de 50 en isolement ;
   - D5 : prendre le mode servi dans la séance nommée par l'événement avant la séance la plus récente (`build-state.ts`) ;
   - `events-route.ts` : un corps illisible en cours de lecture → 503 plutôt que 400 ;
   - Réglages : expliquer que le fuseau suit l'appareil une fois l'app utilisée ;
   - optionnel : écrire la ligne de base du journal des fuseaux à l'activation (ferme la petite fenêtre « choisir un fuseau avant la 1re ingestion »).
3. **PR 3 — Expression et rappel** : portage de la correction (L1), `rewrite_check`, erreur du jour (`error_item`, `errorOfTheDay` du paquet), notifications (abonnement, cron, service worker), `metrics:report`. Brancher `readCorrections`/`rewriteChecks` ; après l'enregistrement d'une correction, appeler l'ingestion avec `events` vide pour payer `production.corrected` (écart 12). Le memo ne garde les productions que 4 jours : recharger les plus anciennes depuis `app.production` si besoin. Revue `relecteur-securite` obligatoire (push : revalider l'hôte, pas de redirection).
4. Captures 390 px clair et sombre, rapport, **arrêt pour validation** du jalon 2.

**Reporté par la revue (défense en profondeur, à reprendre si l'occasion se présente)** : I3 (bornes SQL de l'état dérivé et des horodatages), M1-M11 et W-M1/2/5/6/7 du rapport de revue ; test de deux lots concurrents (verrou consultatif) ; limite de 600 événements/h non testée de bout en bout.

**Accords déjà donnés par le propriétaire** : `feedback:eval` sur le prompt de correction porté (≈ 0,10 $, appel réel) ; une version mineure de `@sdmm/design` (dépôt `SDMM27/sdmm-design`) avec les tokens listés dans `j2-ecrans.md`.

## 4. Rappels

- Ports : le propriétaire fait souvent tourner `next dev` sur 3000 ; 3200 est le port par défaut de `apps/web` ; e2e avec `E2E_PORT=3300`, variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` exportées depuis `npx supabase status -o env` (jamais écrites dans un fichier commité). `SUPABASE_SERVICE_ROLE_KEY` est maintenant lue par `apps/web` (routes d'ingestion seulement) : à prévoir dans l'environnement de déploiement.
- Base locale partagée : **un seul agent à la fois** lance `db reset` / `test db` / les tests d'intégration (deux exécutions simultanées font échouer les tests de l'ancienne app avec « Database error checking email »). Si `app_ai_quota` ou `app_resync` échouent au premier `test db`, refaire `db reset`.
- `migrations:check` refuse toute modification d'une migration commitée, même non fusionnée : passer par une nouvelle migration (`create or replace`).
- Le lint lancé à la racine parcourt `.claude/worktrees/` : le lancer depuis le worktree concerné.
- `package-lock.json` est commité en CRLF : ne pas commiter sa réécriture en LF. Les sous-agents écrivent parfois en CRLF : vérifier `git ls-files --eol`.
- Les tests pgTAP envoient le `p_payload` à la main : pour tout changement d'`ingest_batch`, ajouter un test d'intégration qui passe par `planIngest` (c'est ainsi que R1 avait échappé aux tests).
- Worktrees `refonte-j2-sql`, `refonte-j2-core`, `refonte-j2-web` : propres, leurs branches sont fusionnées ; peuvent être supprimés.
- Aucun appel réel à l'API sans accord, sauf l'évaluation déjà accordée.
