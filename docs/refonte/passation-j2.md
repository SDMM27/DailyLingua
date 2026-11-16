# Passation — refonte DailyLingua, jalon 2 (2026-11-16)

Brief pour une nouvelle session Claude Code (Opus 5.5) ouverte dans `C:\Users\Administrateur\Documents\DailyLingua`. Il **complète** `passation-suite-refonte.md` (racine, branche `redesign/journal`) : son §1 (rôle d'orchestrateur), son §5 (règles à ne pas enfreindre) et son §6 (format des rapports) restent valables tels quels.

## 1. À lire avant d'agir

1. `passation-suite-refonte.md` (racine du dossier principal) : §1, §5, §6.
2. `AGENTS.md`, `CLAUDE.md`, `~/.claude/CLAUDE.md`. Next.js 16 : lire `node_modules/next/dist/docs/` avant d'écrire du code Next.
3. Dans le worktree `.claude/worktrees/refonte-jalon-2` (branche `refonte/jalon-2`) :
   - `docs/refonte/specs/j2-points-a-trancher.md` : **les 14 points sont validés par le propriétaire** ;
   - `docs/refonte/specs/j2-architecture.md` : fait foi pour les données et la sécurité ;
   - `docs/refonte/specs/j2-jeu-xp-serie.md` : fait foi pour les chiffres du jeu ;
   - `docs/refonte/specs/j2-seance-contenu.md`, `j2-ecrans.md`, `maquettes/j2/j2-ecrans.html` ;
   - `docs/refonte/specs/j2-pr1-lots.md` : **contrats des lots de la PR 1, à exécuter maintenant** ;
   - `docs/refonte/prototype-iphone.md` §3-§4 : résultats du test iPhone.
4. Les documents de fond si besoin : `docs/refonte/README.md`, `c-game-design.md`, `d-architecture.md`, `i-jalons-suivants.md`.

## 2. État

**Jalon 1 : validé par le propriétaire.** PR ouvertes vers `dev`, CI verte, **aucune fusionnée** (seul le propriétaire fusionne) :

| PR | Branche → base |
|---|---|
| #36 | `redesign/journal` → `dev` (hors refonte, branche du propriétaire) |
| #37 | `refonte/jalon-1` → `dev` |
| #38 | `refonte/jalon-1-pr2` → `refonte/jalon-1` |
| #39 | `refonte/jalon-1-pr3` → `refonte/jalon-1-pr2` |
| #40 | `refonte/jalon-1-pr4` → `refonte/jalon-1-pr3` (quota au jour d'apprentissage, file des rejets, résultats iPhone, prix revérifiés le 2026-11-16) |

**Ordre de fusion validé** : #36 d'abord, puis #37 → #40, toujours « Create a merge commit » (pas de squash). Fusion à blanc faite : seul `package-lock.json` est en conflit (dépendance `@sdmm/design` ajoutée par #36), `npm install` le régénère ; `check` et `refonte:check` passent sur le résultat combiné. **Après chaque fusion du propriétaire** : après #36, fusionner `dev` dans `refonte/jalon-1`, régénérer le verrou, pousser, attendre la CI ; après #37, recibler #38 vers `dev` (`gh pr edit 38 --base dev`) ; de même pour #39 puis #40. Le dépôt ne supprime pas les branches fusionnées, donc GitHub ne recible pas seul.

**Jalon 2 : specs validées, code pas commencé.**
- Branche d'intégration `refonte/jalon-2` (tirée de `refonte/jalon-1-pr4`), worktree `.claude/worktrees/refonte-jalon-2`, non poussée.
- Worktrees des lots, propres, `npm ci` fait : `.claude/worktrees/refonte-j2-sql` (branche `refonte/j2-sql`) et `.claude/worktrees/refonte-j2-core` (branche `refonte/j2-core`). Les deux sous-agents lancés ont été arrêtés avant d'écrire quoi que ce soit.
- Worktree `.claude/worktrees/refonte-jalon-1-pr4` (branche de #40). Le worktree `refonte-jalon-1` est revenu sur `refonte/jalon-1-pr3` et contient un `apps/web/.env.local` de test (clés VAPID, adresse de tunnel périmée) : non commité, à supprimer ou à garder pour un prochain test.
- Tunnels Cloudflare et serveur de test arrêtés. `cloudflared` reste installé (`C:\Program Files (x86)\cloudflared\`).

**Décisions prises en route (déjà écrites dans les specs) :** lot reçu en retard accepté jusqu'à 7 jours (borne `attempt_occurred_bounds` en base) ; plafond SQL 400 XP par jour ; pas de bouton « J'avais raison » (signalement à la place) ; `@dailylingua/ai` reçoit le calcul du jour par injection (`dayOf`), il n'importe pas `@dailylingua/core`.

**Accords déjà donnés par le propriétaire, à utiliser au bon moment :** `feedback:eval` sur le prompt de correction porté (≈ 0,10 $, appel réel) ; une version mineure de `@sdmm/design` (dépôt `SDMM27/sdmm-design`) avec les tokens listés dans `j2-ecrans.md`.

## 3. Ce qu'il y a à faire, dans l'ordre

1. **Lancer en parallèle les lots S et C** de `j2-pr1-lots.md` :
   - S → `migrateur-donnees`, dans `refonte-j2-sql`, base **locale** seulement ;
   - C → `implementer`, dans `refonte-j2-core`.
   Chaque brief renvoie à `j2-pr1-lots.md` (source de vérité), demande LF, commits atomiques, et la liste des écarts. Critères : S : `db reset`, `test db`, `migrations:check`, `migration:verify` ; C : `refonte:check`, `check`.
2. **Relire chaque lot** (diff, fins de ligne, relancer soi-même les vérifications), puis fusionner `refonte/j2-sql` et `refonte/j2-core` dans `refonte/jalon-2`.
3. **Écrire la spec du lot W** (données + routes : lecture de l'`IngestState`, appel d'`ingest_batch` avec reprise sur `40001`, `POST /api/events`, `GET /api/session/today`, branchement de la file d'événements, paquet de séance dans IndexedDB), puis la confier à `implementer`.
4. **Revue `relecteur-securite`** obligatoire sur S + W, corrections, puis `qa-mobile` si des écrans sont touchés.
5. **Ouvrir la PR 1 du jalon 2** vers `refonte/jalon-1-pr4` (ou vers `dev` si la pile du jalon 1 est fusionnée), CI verte, rapport au format du §6 de `passation-suite-refonte.md`.
6. Ensuite, les PR 2 (écrans de la séance, textes gradués) et PR 3 (correction portée, réécriture, notifications, `metrics:report`) selon `j2-architecture.md` §10, puis captures 390 px clair et sombre, rapport et **arrêt pour validation** du jalon 2.

## 4. Rappels

- Ports : le propriétaire fait souvent tourner `next dev` sur 3000 ; 3200 est le port par défaut de `apps/web` ; lancer les e2e avec `E2E_PORT=3300`, avec `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` exportés depuis `npx supabase status -o env` (jamais écrits dans un fichier commité).
- `npx supabase db reset` vide la base locale partagée : prévenir si le propriétaire teste quelque chose.
- Le lint lancé à la racine parcourt `.claude/worktrees/` : le lancer depuis le worktree concerné.
- Aucun appel réel à l'API sans accord, sauf l'évaluation déjà accordée ci-dessus.
