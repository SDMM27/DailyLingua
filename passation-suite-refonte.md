# Passation — suite de la refonte DailyLingua (après le jalon 1)

Brief pour une nouvelle session Claude Code (Opus 5.5) ouverte dans `C:\Users\Administrateur\Documents\DailyLingua`. Rédigé le 2026-11-15.

Message à coller pour démarrer :

```text
Lis C:\Users\Administrateur\Documents\DailyLingua\passation-suite-refonte.md en entier, puis les documents de sa section 2, et commence par la section 4.A. Parle-moi en français.
```

---

## 1. Ton rôle

Tu prends la suite de l'orchestration de la refonte complète de DailyLingua. Le jalon 0 (conception) est validé. Le jalon 1 (fondations) est codé, en trois PR ouvertes avec la CI au vert. Il reste à clore le jalon 1, puis à concevoir et livrer le jalon 2.

Tu es l'orchestrateur, comme le décrivent `refonte-fable.md` §4 et `~/.claude/CLAUDE.md` (« Délégation par modèle ») :
- **Tu fais toi-même** la conception, l'architecture, le schéma, la sécurité, l'anti-triche, les migrations, le découpage en lots, la relecture et l'intégration.
- **Tu délègues** l'implémentation d'une spec tranchée à `implementer` (Sonnet) et le travail mécanique à `quick-task` (Haiku). Tu disposes aussi des agents spécialisés de `.claude/agents/` : `designer-ux-mobile`, `game-designer`, `pedagogue-didacticien`, `migrateur-donnees`, `qa-mobile`, `relecteur-securite`, `relecteur-natif`, `arbitre-relecture`.
- **Tu annonces** chaque vague en une ligne (« conception ici ; 3 lots → implementer ; revue → relecteur-securite »).
- **Un rapport de sous-agent n'est pas une preuve** : tu lis le diff, tu lances les vérifications et tu regardes l'écran à 390 px avant de dire qu'un lot est fini.

## 2. À lire avant d'agir (dans cet ordre)

Les documents de la refonte ne sont **pas** sur la branche courante du dossier principal (`redesign/journal`). Ils sont sur les branches `refonte/*`. Lis-les dans le worktree `.claude/worktrees/refonte-jalon-1` (branche `refonte/jalon-1-pr3`, qui contient tout le jalon 1), ou avec `git show refonte/jalon-1-pr3:<chemin>`.

| # | Document | Pourquoi |
|---|---|---|
| 1 | `AGENTS.md`, `CLAUDE.md` (racine), `~/.claude/CLAUDE.md` | Règles du projet et de délégation. Next.js 16 : lis `node_modules/next/dist/docs/` avant d'écrire du code Next |
| 2 | `refonte-fable.md` (racine, branche `redesign/journal`) | Brief d'origine : décisions non négociables (§2), quand demander (§6), format des rapports (§7) |
| 3 | `docs/refonte/README.md` | Sommaire, règles en cas de divergence entre documents, les **24 points tranchés** : l'utilisateur a validé toutes les recommandations |
| 4 | `docs/refonte/i-jalons-suivants.md` | Les 8 jalons, leurs livrables, dépendances et risques |
| 5 | `docs/refonte/a-vision-et-principes.md`, `b-modele-pedagogique.md` | Boucle quotidienne et séance type, base du jalon 2 |
| 6 | `docs/refonte/c-game-design.md` | Barème d'XP, série, gels, garde-fous. **Fait foi pour les règles du jeu** |
| 7 | `docs/refonte/d-architecture.md` | Données, sécurité, hors ligne, i18n. **Fait foi pour les données et la sécurité** |
| 8 | `docs/refonte/e-direction-artistique.md` + `maquettes/maquettes.html` | **Fait foi pour le visuel** |
| 9 | `docs/refonte/f-plan-de-migration.md`, `g-budget.md`, `h-indicateurs.md` | Migration (étapes M1 à M5), coût par apprenant, indicateurs à instrumenter |
| 10 | `docs/refonte/specs/j1-*.md` | Les specs du jalon 1 : modèle de forme pour celles du jalon 2 |
| 11 | `docs/refonte/prototype-iphone.md` | Protocole de test sur iPhone, tableau de résultats encore vide |
| 12 | Corps des PR #37, #38, #39 (`gh pr view <n>`) | Ce qui a été livré, vérifications lancées, **limites connues** |
| 13 | `docs/reviews/refonte/j1-pr1-securite.md` | Revue de sécurité du schéma `app` |
| 14 | `docs/plans/roadmap-plateforme.md` | Contexte : diagnostic de l'existant, budget détaillé (§6) |

## 3. État au 2026-11-15

**PR ouvertes, toutes vers `dev`, CI verte, aucune fusionnée** (seul l'utilisateur fusionne) :

| PR | Branche | Contenu |
|---|---|---|
| [#36](https://github.com/SDMM27/DailyLingua/pull/36) | `redesign/journal` → `dev` | Refonte graphique « journal du matin » de l'**ancienne** app, plus le champ `aiReview` des banques du test de niveau. Hors refonte, mais elle vise aussi `dev` |
| [#37](https://github.com/SDMM27/DailyLingua/pull/37) | `refonte/jalon-1` → `dev` | Socle monorepo (`apps/web`, `packages/{core,schemas,data,i18n,ai}`), schéma `app` avec RLS et pgTAP, reprise `public` → `app` avec `migration:verify` |
| [#38](https://github.com/SDMM27/DailyLingua/pull/38) | `refonte/jalon-1-pr2` → `refonte/jalon-1` | Application web, i18n fr/en, authentification, profil L1/L2 |
| [#39](https://github.com/SDMM27/DailyLingua/pull/39) | `refonte/jalon-1-pr3` → `refonte/jalon-1-pr2` | Point d'appel IA unique, quotas, `cost:report`, PWA (Serwist), file hors ligne, page `/lab` |

Les branches `refonte/j1-*` sont les branches de lots des sous-agents, déjà intégrées dans les trois branches ci-dessus. Ne travaille pas dessus.

**Rien n'est déployé et rien n'est appliqué à la base de production.**

## 4. Ce qu'il y a à faire

### A. Clore le jalon 1

1. **Rendre `/lab` accessible en HTTPS sur un vrai iPhone.** Le protocole l'exige et `apps/web` n'est déployé nulle part. Propose la solution la moins coûteuse, par exemple un projet Vercel de préversion pour `apps/web` pointé sur la base locale ou sur un projet de test, ou un tunnel HTTPS vers le poste. **Demande l'accord de l'utilisateur avant tout déploiement ou toute création de compte ou de service.** Il faudra aussi générer des clés VAPID, sans les committer, pour tester les notifications.
2. **Faire passer le protocole `prototype-iphone.md` par l'utilisateur.** C'est lui qui teste avec son téléphone. Donne-lui l'adresse et les étapes, puis reporte ses résultats dans le tableau du §3. Tires-en les conséquences par écrit pour les jalons 2 (notifications), 5 (oral) et 7, et mets à jour `i-jalons-suivants.md` si un plan B est nécessaire (par exemple pas de Web Push → rappel par e-mail).
3. **Traiter les limites connues qui gênent le jalon 2** (corps de la PR #39) :
   - le jour du quota est la date UTC : il doit devenir le jour d'apprentissage (04:00 locales, déjà dans `@dailylingua/core`) ;
   - un événement rejeté définitivement par le serveur bloquerait la file IndexedDB : ajouter une file des rejets, avec un test ;
   - faire confirmer à l'utilisateur les deux quotas fixés par défaut (vérification de réécriture : 6 par jour, correction de bilan : 3 par jour) ;
   - revérifier les prix de l'API sur la page officielle (le skill `claude-api` donne les identifiants et les prix).

   Fais-le en une petite PR empilée sur `refonte/jalon-1-pr3`, ou en premier lot du jalon 2. Indique ton choix.
4. **Préparer la fusion, sans la faire.** L'ordre est #37, puis rebase de #38 vers `dev`, puis #39. La branche `refonte/jalon-1` part d'un `dev` qui ne contient pas `redesign/journal` : selon la PR fusionnée la première entre #36 et #37, des conflits sont probables sur `package.json`, `eslint.config.mjs`, `tsconfig.json` et `.github/workflows/ci.yml`. Fais un essai de fusion à blanc (dans un worktree jetable, avec `git merge --no-commit`), signale les conflits à l'utilisateur et recommande un ordre. Après chaque fusion faite par l'utilisateur, rebase la PR suivante et relance la CI.
5. **Rapport de fin de jalon 1** au format §7 de `refonte-fable.md`, puis **arrêt et validation** avant le jalon 2.

Restent hors jalon 1 (noté dans la PR #38, à planifier, pas à faire maintenant) : mot de passe oublié, suppression de compte, conversion d'un invité en compte, vérification RTL sur un écran réel, audit d'accessibilité automatisé.

### B. Jalon 2 — Boucle quotidienne (après validation du jalon 1)

Périmètre (`i-jalons-suivants.md`) :
- séance guidée en six étapes, validée par le travail fait ;
- file unique FSRS avec charge plafonnée ;
- texte gradué minimal (généré, partagé, sans lecteur tactile) ;
- correction écrite existante portée avec la L1 en paramètre, avec réécriture vérifiée ;
- XP, anneau, série avec gel et réparation ;
- bilan de fin de séance ;
- une notification par jour ;
- séance du jour faisable hors ligne.

Livrable : un apprenant B1 fait sa séance chaque jour et voit ce qu'il a gagné.

Déroulé :
1. **Specs d'abord**, dans `docs/refonte/specs/j2-*.md`, sur le modèle des specs du jalon 1 :
   - la séance et ses six étapes, à partir de `b-modele-pedagogique.md` (`pedagogue-didacticien` peut en préciser le contenu) ;
   - XP, série, gels et anti-triche côté serveur, à partir de `c-game-design.md`, journal d'XP en ajout seul du schéma `app` (`game-designer` pour les chiffres, la conception de sécurité reste à toi) ;
   - les écrans (`designer-ux-mobile`, à 390 px, en clair et en sombre) ;
   - la génération et le partage du texte gradué dans le budget (`g-budget.md`), via `@dailylingua/ai` ;
   - le portage de la correction écrite (prompts et `feedback:eval` étendus à deux L1) ;
   - l'instrumentation des indicateurs de `h-indicateurs.md`.
2. **Liste des points à trancher**, chacun avec ta recommandation, puis **arrêt et validation**.
3. **Découpage en 2 ou 3 PR empilées**, avec des lots parallèles dans des worktrees isolés (jamais deux agents sur les mêmes fichiers) :
   - migrations SQL → `migrateur-donnees`, base locale uniquement ;
   - composants et logique → `implementer` ;
   - alignement des messages i18n → `quick-task` ;
   - revue → `relecteur-securite` (obligatoire : le jalon touche au schéma et à l'XP) ;
   - parcours, débordements et hors ligne → `qa-mobile`.
4. Captures mobiles en clair et en sombre, CI verte, rapport, arrêt.

### C. En continu, si l'utilisateur le demande

- **Relecture des 19 banques du test de niveau** (phase X0) : pour chaque langue, deux passes `relecteur-natif` indépendantes, puis `arbitre-relecture`. Les rapports vont dans `docs/reviews/placement/<langue>/`. Ensuite, on pose `aiReview` au niveau de la banque. La méthode est dans `docs/reviews/placement/README.md` et dans `src/lib/placement/banks/AUTHORING.md`, sur la branche `redesign/journal`, PR #36. Le champ `aiReview` n'existe que sur cette branche.
- Relecture des dossiers du bilan, traduction des fiches de grammaire vers l'anglais.

## 5. Règles à ne pas enfreindre

- **Demande toujours avant de** :
  - toucher à la base de production (migration, bascule, suppression) ;
  - engager une dépense ou ouvrir un service, même gratuit ;
  - déployer ;
  - fusionner une PR ou pousser sur `main` ;
  - revenir sur une décision de `refonte-fable.md` §2 ou du README ;
  - publier quoi que ce soit au nom de l'app.
- **Budget API** : 10 € par mois au plus. À l'exécution, Haiku 5.5 uniquement (exception validée : relecture par échantillon des textes générés avec un modèle plus fort, en Batch). Aucun appel réel à l'API sans accord : les tests utilisent un faux client.
- **Gamification « riche mais honnête »** : l'XP vient uniquement du travail utile et est validée côté serveur. Pas de vies qui bloquent, pas de monnaie achetable, pas de culpabilisation. Chaque mécanique se désactive.
- **Écrans aérés** : l'utilisateur trouve les écrans denses écrasants. Une action principale par écran, peu de blocs au-dessus de la ligne de flottaison, l'information secondaire derrière un toucher.
- **Contenus** : ne pose **jamais** `reviewedOn` ni `checkedOn` (réservés à un humain). Statuts : `draft`, puis `ai-reviewed`, puis `native-reviewed`.
- **Aucune langue en dur** : registre de langues, toute L1 acceptée.
- **Code partagé** : `packages/core` et `packages/schemas` restent sans React ni Next.
- **Mobile-first** : safe areas, champs ≥ 16 px, tests WebKit à 390 px.
- **Fins de ligne** : le dépôt est en LF. Les sous-agents convertissent parfois en CRLF : vérifie `git diff --stat` (réécritures complètes de fichiers) et `git ls-files --eol`, et nettoie avec `sed -i 's/\r$//'` avant de committer.
- **Git** : commits atomiques en anglais, une branche par jalon, PR vers `dev`. Ne modifie pas le dossier principal (branche `redesign/journal`, celle de l'utilisateur) : travaille dans les worktrees des branches `refonte/*`.
- **Serveur de dev** : l'utilisateur fait souvent tourner son propre `next dev` sur le port 3000. N'arrête pas ce processus et utilise un autre port.
- **Vérifications** : avant de finir, lance `npm run refonte:check` et `npm run refonte:build` sur la nouvelle app, et `npm run check` et `npm run build` si l'ancienne app est touchée. Base locale : `npx supabase db reset`, puis `npx supabase test db` et `npm run migration:verify`. N'affirme jamais qu'un test passe sans l'avoir lancé.
- **Lint** : `npm run lint` lancé à la racine parcourt aussi `.claude/worktrees/` et produit des milliers d'erreurs parasites. Lance le lint depuis le worktree concerné, ou ajoute `--ignore-pattern '.claude/worktrees/**'`.

## 6. Format des rapports (en français)

À la fin de chaque étape ou jalon :
- ce qui a été fait, par quel agent et avec quel modèle ;
- les fichiers modifiés ;
- les commandes lancées ;
- les tests réellement exécutés et leurs résultats ;
- comment lancer et tester ;
- le coût API mesuré ;
- les problèmes ouverts ;
- les décisions à prendre, chacune avec ta recommandation ;
- l'étape suivante.
