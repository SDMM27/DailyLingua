# Daily Lingua

Une mission linguistique quotidienne construite à partir de contenus authentiques (presse, podcasts, interviews, vidéos), adaptée au niveau, aux intérêts et au temps disponible.

Pensée d’abord pour le téléphone : web app installable sur l’écran d’accueil (PWA), avec une app native envisagée plus tard pour l’App Store et le Play Store.

> **État actuel : phase 7.** La version déployée sur Vercel est branchée sur Supabase (compte obligatoire). Sans variables Supabase (en local par exemple), l’app est la **démo** sur données fictives, rien n’est enregistré. Avec Supabase configuré, il faut un compte : connexion e-mail + mot de passe, écran d’accueil pour choisir ses langues (19 disponibles), puis vocabulaire, révisions espacées, suivi de mission, historique et préférences sont enregistrés par utilisateur (RLS). L’onglet **Lire** liste les dernières parutions de 40 sources authentiques (flux RSS / Atom) dans les langues de l’utilisateur. À la première ouverture du jour, la **mission est préparée** à partir de ces contenus : choix d’un contenu par langue, exercices rédigés par Claude (ou par un modèle de secours sans IA). Deux tâches planifiées (GitHub Actions) relèvent les flux toutes les 6 heures et préparent chaque heure la mission des utilisateurs actifs dont l’heure de génération est passée. Chaque pull request passe une CI (typecheck, lint, tests unitaires, d’intégration, pgTAP et parcours de bout en bout sur iPhone simulé) et chaque déploiement en production est vérifié automatiquement.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir l’URL affichée (par défaut http://localhost:3000).

### Sur iPhone (même réseau Wi-Fi)

Pour tester sur téléphone, utiliser **`npm run preview`** (build de production) plutôt que `npm run dev`. Le mode dev envoie environ 3,7 Mo de JavaScript non minifié et compile chaque page à la première visite, ce qui est très lent sur mobile. En production, c'est environ 175 Ko.

1. `npm run preview` affiche une ligne `Network: http://192.168.x.x:3000`.
2. Ouvrir cette adresse dans Safari sur l’iPhone.
3. Partager → **Sur l’écran d’accueil**. L’app s’ouvre alors en plein écran, sans la barre de Safari.

Si la page ne s’ouvre pas, autoriser Node.js dans le pare-feu Windows (réseau privé).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build de production / serveur de production |
| `npm test` | Tests unitaires et de composants (Vitest) |
| `npm run typecheck` | Vérification TypeScript (génère d’abord les types de routes) |
| `npm run lint` | ESLint |
| `npm run check` | Typecheck + lint + tests (les tests d’intégration Supabase sont ignorés si la base locale ne tourne pas) |
| `npm run db:start` / `db:stop` | Démarre / arrête la stack Supabase locale (Docker) |
| `npm run db:status` | Affiche les URL et les clés locales |
| `npm run db:reset` | Recrée la base : migrations + données de démo (`supabase/seed.sql`) |
| `npm run db:test` | Tests SQL pgTAP (RLS, contraintes) |
| `npm run db:types` | Régénère `src/lib/supabase/database.types.ts` depuis la base locale |
| `npm run content:check` | Vérifie le catalogue de sources sans toucher la base : flux, items, liens, pages de conditions et de licence (`-- --source <clé> --verbose`) |
| `npm run content:ingest` | Relève les flux et enregistre les nouveaux contenus dans Supabase, puis vérifie les liens (`-- --source <clé>`, `-- --no-links`) |
| `npm run content:topics` | Classe par domaine les contenus encore sans thème (`-- --backfill` : applique d’abord les thèmes fixes des sources, puis classe tout le stock) |
| `npm run mission:generate` | Prépare la mission d’un utilisateur (`-- --email <adresse>`, `--date AAAA-MM-JJ`, `--template` sans IA, `--replace` en local seulement) et affiche la trace (modèle, tokens, durée) |
| `npm run cron:run` | Lance une tâche planifiée en local, sans HTTP (`-- ingest` ou `-- missions`) et affiche son rapport |
| `npm run placement:check` | Vérifie les banques de questions du test de niveau (`-- <code>` pour une seule langue) : structure, consignes d’écriture contrôlables automatiquement |
| `npm run e2e` | Tests de bout en bout (Playwright, WebKit en iPhone 13) contre la base locale ; build + serveur sur le port 3100 |
| `npm run e2e:install` | Installe le navigateur WebKit de Playwright (une fois) |

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript** strict
- **Tailwind CSS 4** (tokens de design dans `src/app/globals.css`)
- **Zod 4** : validation aux frontières (données, formulaires)
- **Vitest** + Testing Library : tests de la logique métier et des composants
- **Playwright** (WebKit, iPhone 13) : parcours de bout en bout
- **Supabase** (PostgreSQL, Auth, RLS) : migrations SQL versionnées, CLI en dépendance de dev, stack locale via Docker
- **fast-xml-parser** (flux RSS / Atom) ; **tsx** pour les scripts de `scripts/`
- **Claude** (`@anthropic-ai/sdk`, modèle `claude-haiku-5-5`) derrière l’interface `ExerciseGenerator`, avec un générateur de secours déterministe
- **GitHub Actions** (CI, smoke test après déploiement, planification) : appelle deux routes protégées par `CRON_SECRET` (`/api/cron/ingest`, `/api/cron/missions`)

## Structure

```
src/
  app/                  Pages, layouts, manifest PWA, icônes générées
  components/
    ui/                 Primitives (Card, ProgressBar, LanguageTag…)
    layout/             Barre d’onglets (mobile) et barre du haut (desktop)
    dashboard/ mission/ vocabulary/ preferences/
  lib/
    content/            Contenus authentiques : catalogue des sources (licences), lecture des flux,
                        normalisation, vérification des liens, ingestion (sans Next.js ni React)
    domain/             Logique métier pure : dates et fuseaux, budget temps,
                        répétition espacée, statistiques, registre des langues
    schemas/            Schémas Zod et types dérivés
    data/               Accès aux données : interface, implémentation de démo, implémentation Supabase
    supabase/           Intégration Supabase : variables d’env (Zod), clients serveur / admin, types générés
    generation/         Mission du jour : choix des contenus, rédaction (Claude ou secours), écriture
    jobs/               Tâches planifiées : relève des flux, missions du jour, journal des exécutions
scripts/                Scripts en ligne de commande (content:check, content:ingest, mission:generate, cron:run)
supabase/
  config.toml           Configuration de la stack locale
  migrations/           Schéma, contraintes, index, RLS et privilèges
  seed.sql              Utilisateur de démo + données équivalentes aux mocks
  tests/database/       Tests pgTAP
```

`lib/domain` et `lib/schemas` ne dépendent ni de Next.js ni de React : ils pourront être réutilisés tels quels par une app native.

## Choix importants

- **Langues extensibles.** Toutes les langues sont décrites dans `src/lib/domain/languages.ts` (19 aujourd’hui, avec sens d’écriture et écritures « denses » CJK). Ajouter une langue = une entrée dans le registre, une ligne de migration (`public.languages`) et au moins une source dans le catalogue (un test l’exige). L’utilisateur choisit 1 à 4 langues, chacune avec un poids ; le temps quotidien est réparti proportionnellement.
- **Fuseau horaire.** Les jours sont des clés `YYYY-MM-DD` calculées dans le fuseau de l’utilisateur (Europe/Paris par défaut), ce qui évite les décalages autour de minuit et des changements d’heure.
- **Honnêteté sur les contenus.** Quand un contenu n’a pas de transcription accessible, l’app le signale et ne propose pas de quiz détaillé.
- **Accès aux données derrière une interface** (`DailyLinguaRepository`) : `getRepository()` renvoie l’implémentation de démo si Supabase n’est pas configuré, l’implémentation Supabase pour un utilisateur connecté, et redirige vers `/connexion` sinon (le `proxy.ts` le fait déjà en amont et rafraîchit la session).
- **Dates** : tous les jours calendaires sont calculés dans le fuseau de l’utilisateur et transmis explicitement ; la base n’a plus de `current_date` par défaut (migration 7), car celle du serveur est en UTC.
- **Écritures** : server actions (`src/app/actions`) qui revalident l’entrée avec Zod puis passent par le dépôt ; les écritures multiples (préférences, révision d’un mot) sont atomiques via des fonctions SQL `security invoker`.

## Base de données locale (Supabase)

Prérequis : **Docker Desktop lancé**. Ports utilisés par la stack locale : 54321 (API), 54322 (PostgreSQL), 54323 (Studio), 54324 (Mailpit), 54320 (base shadow des migrations). Aucun ne touche le port 3000.

```bash
npm run db:start      # la première fois, télécharge les images Docker (quelques minutes)
npm run db:reset      # applique les migrations et le seed
npm run db:status     # affiche les URL et les clés locales
```

### Brancher l’app sur la base locale

1. Copier `.env.example` vers `.env.local`, décommenter les trois variables Supabase.
2. Les remplir avec les valeurs de `npm run db:status` : `API_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `PUBLISHABLE_KEY` (ou `ANON_KEY`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SECRET_KEY` (ou `SERVICE_ROLE_KEY`) → `SUPABASE_SERVICE_ROLE_KEY`.
3. Redémarrer `npm run dev`.

**Avec ces variables, l’app exige un compte** (`/connexion`). En local, la confirmation d’e-mail est désactivée : crée un compte ou utilise le compte de démo ci-dessous. Les tests d’intégration (`npm test`) lisent la base comme l’utilisateur de démo et écrivent avec un utilisateur jetable (supprimé ensuite). Sans `.env.local`, ou si la base est arrêtée, ils sont ignorés.

Si le port 3000 est occupé (Docker, par exemple), `npm run dev` choisit un autre port et l’affiche ; l’URL d’authentification locale attend le port 3001 (`supabase/config.toml`).

### Compte de démo (développement local uniquement)

| | |
| --- | --- |
| E-mail | `demo@dailylingua.test` |
| Mot de passe | `demo-password-123` |

Il est créé par `supabase/seed.sql` avec : préférences (russe poids 2, italien poids 1), la mission du jour (celle de la phase 1), 24 jours d’historique, 10 mots avec leur journal de révisions. Les dates sont relatives au jour du `db:reset` : relancer `npm run db:reset` le lendemain pour avoir une mission « du jour ».

## Contenus authentiques (phase 4)

**Principe : uniquement des flux RSS / Atom publics, jamais de scraping, jamais le texte intégral.** Pour chaque article, l’app conserve le titre, le lien, la date, l’auteur, les catégories, la durée (podcasts) et une accroche courte tirée du flux (280 caractères au plus, 120 pour le chinois, le japonais et le coréen), puis renvoie vers l’éditeur. Chaque contenu affiché est crédité (source + licence).

- **Catalogue** : `src/lib/content/catalog.ts`, relu comme du code. Chaque source indique sa licence (`cc-by`, `cc-by-sa`, `cc-by-nd`, `public-domain`, `all-rights-reserved`), la page de conditions, l’usage commercial autorisé ou non, la date de vérification et une note sur ce qui a été vérifié. Dans le doute : `all-rights-reserved` et pas d’usage commercial.
- **Sources écartées** (et pourquoi) : en tête du catalogue. Notamment Il Post (flux refusé aux clients non navigateurs, conditions interdisant la redistribution) et Rai Radio 3 (plus de flux officiel depuis RaiPlay Sound).
- **Sécurité** : les liens d’un flux doivent pointer vers les domaines de la source (sinon l’item est écarté), seuls http(s) sont acceptés, les paramètres de suivi (`utm_*`…) sont retirés, les documents XML avec DTD sont refusés, les flux sont limités à 5 Mo et 20 s.
- **Vérification des liens** : requête HEAD (confirmée par GET si elle échoue), sans lire la page ; redirections suivies seulement dans les domaines de la source. Statuts `ok`, `redirected`, `broken` (masqué dans l’app) ; un résultat incertain (403 d’un filtre anti-robots, 5xx, délai) est retenté le lendemain.
- **Politique de licence** : `CONTENT_LICENSE_POLICY=all` (défaut, usage personnel) ou `commercial`, qui ne garde que les sources dont les conditions autorisent un produit payant (CC BY, CC BY-SA, CC BY-ND aujourd’hui). **À activer avant toute commercialisation**, et à revalider source par source.
- **Pas de source, pas de langue** : seules les langues ayant au moins une source autorisée par la politique sont proposées (accueil, réglages), et le serveur refuse l’ajout d’une autre. En mode `commercial`, le suédois, le polonais, le tchèque, le turc, le chinois et le coréen ne sont donc plus proposés. Une langue déjà choisie qui perd ses sources est conservée, avec un avertissement : la retirer reste le choix de l’utilisateur.
- **Ajouter une source** : trouver le flux officiel, lire les conditions, remplir `license` honnêtement, puis `npm run content:check -- --source <clé> --verbose`.

```bash
npm run content:check     # vérifie le catalogue (réseau, pas de base)
npm run content:ingest    # remplit la base locale (Supabase lancé, .env.local avec la clé service)
```

La relève automatique est faite toutes les 6 heures par la tâche planifiée de la phase 6, qui appelle la même fonction `ingest()`.

Chaque contenu reçoit 0 à 3 domaines (les `TOPICS`) : ceux que la source porte dans le catalogue (`defaultTopics`) ou, à défaut, ceux que Claude Haiku lit dans le titre et l’accroche, par lots de 20, après chaque relève (`CONTENT_TOPICS=off` le coupe ; `npm run content:topics -- --backfill` rattrape les contenus déjà en base ; `npm run content:coverage -- --topics` affiche la matrice domaine × niveau).

### Schéma

```
auth.users 1─1 profiles 1─* user_languages *─1 languages
                  │
                  ├─* vocabulary_items 1─* vocabulary_reviews        (journal des révisions)
                  │        └─ content_id ─┐
                  └─* missions            │              (unique : user_id + mission_date)
                        └─* mission_sessions *─1 contents *─1 sources
                              ├─* mission_activities 1─1 activity_progress
                              └─* quiz_answers
```

- **Partagé** (lecture pour tout utilisateur connecté, écriture réservée au rôle service) : `languages`, `sources`, `contents`.
- **Personnel** (isolé par RLS sur `auth.uid()`) : tout le reste. Les missions, sessions et activités sont **générées** côté serveur (rôle service) ; l’utilisateur n’y modifie que `started_at` / `completed_at`. Sa progression (`activity_progress`, `quiz_answers`), son vocabulaire et ses préférences sont écrits par lui.
- **Ajouter une langue** : l’ajouter dans `src/lib/domain/languages.ts` **et** insérer son code dans `public.languages` (une migration d’une ligne). Un test d’intégration vérifie que les deux listes concordent.
- **Contenus** : seules des métadonnées, un résumé (≤ 1000 caractères) et un extrait optionnel (≤ 500) sont stockés, jamais le texte intégral. L’URL est dédoublonnée après normalisation (casse, fragment, paramètres `utm_*`, slash final).
- **Nouvelle table** : les privilèges par défaut sont retirés à `anon` et `authenticated` ; une migration doit donc `grant` explicitement et créer ses politiques RLS.

### Déploiement sur un vrai projet Supabase

1. Créer le projet sur supabase.com, puis `npx supabase login` et `npx supabase link --project-ref <ref>`.
2. `npx supabase db push` applique les migrations. **Ne jamais exécuter `seed.sql` sur un projet réel** (il crée un compte au mot de passe public).
3. Renseigner les trois variables dans Vercel (Project Settings → Environment Variables), **toutes du même projet** (Project Settings → API Keys) : `NEXT_PUBLIC_SUPABASE_URL` (`https://<ref>.supabase.co`), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique `anon` ou `sb_publishable_…`) et `SUPABASE_SERVICE_ROLE_KEY` (clé secrète `service_role` ou `sb_secret_…`, en variable **non exposée**). Jamais les clés locales de `npm run db:status`. Tant qu’aucune n’est définie, Vercel reste en mode démo ; un jeu incomplet fait échouer le serveur, une clé d’un autre projet donne « Invalid API key » dans les logs. Redéployer après chaque modification.
4. **Authentification** (Dashboard → Authentication) :
   - *URL Configuration* : `Site URL` = l’URL de production (ex. `https://<projet>.vercel.app`) et, dans `Redirect URLs`, `https://<domaine>/auth/confirm`. Sans cela, le lien de l’e-mail de confirmation pointe vers `localhost`.
   - *Sign In / Providers → Email* : laisser **Confirm email** activé (c’est le défaut hébergé ; seul le local le désactive).
   - *Emails → Templates* (demande un SMTP personnalisé) : coller les modèles versionnés dans `supabase/templates/` (sans le commentaire de tête, qui donne le sujet) : `confirmation.html` dans *Confirm signup*, `recovery.html` dans *Reset password*. Leurs liens utilisent `token_hash` et marchent quel que soit le navigateur qui ouvre le mail. Avec les modèles par défaut, l’app fonctionne aussi (lien `code`), mais si le mail est ouvert dans Safari après une inscription dans l’app installée, l’utilisateur doit se reconnecter (« Adresse confirmée. Connecte-toi. »).
   - Fixer une longueur de mot de passe minimale d’au moins 8 (l’app l’exige à l’inscription).
   - Brancher un **SMTP** réel (Authentication → SMTP Settings) : le service d’e-mails par défaut de Supabase est très limité et réservé aux tests.
5. **Suppression de compte** : elle utilise `SUPABASE_SERVICE_ROLE_KEY` côté serveur. Sans cette variable, le bouton échoue proprement sans rien supprimer.
6. Vérifier de bout en bout : inscription → e-mail → lien → écran d’accueil → ajout d’un mot → suppression du compte.

> La suppression efface le compte et toutes ses données personnelles (cascade SQL, testée). Le contenu partagé (`sources`, `contents`) reste.

## Mission du jour générée (phase 5)

**Principe : l’app décide, le modèle rédige.** Le code choisit les contenus candidats, les minutes, les activités et les identifiants ; le modèle ne fait que choisir un candidat par langue et écrire les exercices. Tout ce qu’il renvoie est revalidé (Zod) avant d’être enregistré.

1. **Réservation** : `claim_mission_generation` crée la ligne (utilisateur, jour) en état `generating`. Une deuxième demande (autre onglet, future tâche planifiée) attend au lieu de payer une seconde génération ; une tentative ratée ou abandonnée est reprise, **3 fois au plus par jour**, ce qui plafonne aussi la dépense par utilisateur.
2. **Candidats** (`src/lib/generation/select-contents.ts`) : contenus récents des sources actives autorisées par la politique de licence, liens non cassés, non utilisés depuis 30 jours ; classés par écart au niveau visé (confort / adapté / défi), type préféré, durée et fraîcheur. Cinq candidats par langue. Une langue sans contenu est sautée et son temps redonné aux autres.
3. **Rédaction** (`claude-generator.ts`, prompt dans `prompt.ts`, versionné) : sorties structurées validées par un schéma. Le modèle ne voit que **le titre et l’accroche** (jamais le texte intégral) : les questions portent sur eux seuls, les expressions et la production sont liées au sujet. Les textes des flux sont des données de tiers : ils sont balisés et le modèle a pour consigne de ne jamais suivre d’instruction qui s’y trouverait.
4. **Repli** : si Claude échoue (clé absente, refus, réponse invalide, délai), le **générateur de secours** (`template-generator.ts`) produit une mission honnête sans quiz ni expressions (une consigne de production en français). La page l’indique.
5. **Écriture** : `complete_mission_generation` enregistre sessions et activités en une transaction ; la trace (`missions.generation_meta` : source, modèle, version du prompt, tokens, durée, raison du repli) permet de suivre le coût.

Côté écran, `/mission` affiche « Préparation de ta mission… » et appelle l’action serveur `prepareTodayMission` ; le jour est toujours calculé sur le serveur, dans le fuseau de l’utilisateur. Ces fonctions SQL ne sont exécutables que par le rôle service : le serveur de l’app a donc besoin de `SUPABASE_SERVICE_ROLE_KEY`.

**Configuration** (`.env.local`, jamais côté navigateur) : `ANTHROPIC_API_KEY` (sans clé, le générateur de secours est utilisé ; `ANTHROPIC_API_KEY_FALLBACK` optionnelle : seconde clé utilisée automatiquement quand la première est refusée), `MISSION_GENERATOR=claude|template`, `MISSION_MODEL` (défaut `claude-haiku-5-5`). Coût estimé avec Claude Haiku 5.5 : environ 0,002 $ par mission, soit quelques centimes par utilisateur et par mois.

```bash
npm run mission:generate -- --email demo@dailylingua.test --date 2026-10-14             # Claude si une clé est configurée
npm run mission:generate -- --email demo@dailylingua.test --date 2026-10-14 --template  # sans IA
```

## Tâches planifiées (phase 6)

- **Principe** : deux routes `GET`, appelées par un workflow GitHub Actions (`.github/workflows/scheduled-jobs.yml`) avec l’en-tête `Authorization: Bearer <CRON_SECRET>`. Sans `CRON_SECRET` (au moins 32 caractères), elles répondent 503 ; avec un mauvais secret, 401. Elles ne sont pas soumises à la connexion (exclues du `proxy.ts`). En mode démo (sans Supabase), elles ne font rien.
- **Horaires** (UTC) :

| Route | Planning | Rôle |
| --- | --- | --- |
| `/api/cron/ingest` | toutes les 6 h, à la minute 37 | Relève de tous les flux + vérification de liens |
| `/api/cron/missions` | toutes les heures, à la minute 7 | Prépare les missions des utilisateurs dont l’heure de génération est passée |

- **Qui reçoit une mission** : les utilisateurs dont l’heure de génération (réglages) est passée dans leur fuseau, qui ont au moins une langue, sans mission prête ce jour-là, avec des tentatives restantes (3 par jour), et **actifs** : compte créé il y a moins de 14 jours ou mission commencée dans les 14 derniers jours. Les autres ont toujours leur mission à l’ouverture de l’app (phase 5) : on ne paie pas le modèle pour des comptes abandonnés.
- **Pourquoi GitHub Actions** : Vercel Cron, sur l’offre Hobby, ne tourne qu’une fois par jour ; GitHub Actions permet un passage horaire, donc une mission prête à l’heure choisie par chacun (à l’heure près). Le travail reste fait par Vercel (limite de 300 s par appel). Coût : environ 840 minutes d’Actions par mois (chaque appel compte pour une minute), sous les 2 000 minutes gratuites d’un dépôt privé. Inutile de rendre le dépôt public (et dans un dépôt public, GitHub désactive les plannings après 60 jours sans activité).
- **Retards** : GitHub démarre parfois les plannings avec retard, ou en saute un aux heures chargées. Sans conséquence : un passage manqué est rattrapé au suivant, ou à l’ouverture de l’app.
- **Robustesse** : le verrou de la phase 5 (`claim_mission_generation`) empêche toute double génération. Trois missions sont préparées en parallèle ; les nouvelles préparations s’arrêtent vers 240 s (limite de la fonction : 300 s), et les restantes sont servies à l’ouverture de l’app.
- **Suivi** : chaque exécution est notée dans la table `cron_runs` (tâche, début, fin, statut `ok` / `partial` / `error`, compteurs, erreur), lisible seulement par le rôle service (Supabase Studio).
- **Mise en production** :
  - générer le secret : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` ;
  - l’ajouter dans Vercel (Settings → Environment Variables, environnement Production) sous `CRON_SECRET`, à côté des trois variables Supabase (voir « Déploiement sur un vrai projet Supabase ») et de `ANTHROPIC_API_KEY` (et, en option, `ANTHROPIC_API_KEY_FALLBACK`), puis redéployer ;
  - appliquer les migrations sur le projet de production : `npx supabase db push --linked` (sans quoi les tâches échouent en 500) ;
  - dans GitHub (Settings → Secrets and variables → Actions), créer les secrets `CRON_SECRET` (même valeur) et `APP_URL` (URL de production affichée dans Vercel → Domains, sans slash final) ;
  - lancer le workflow à la main (Actions → Tâches planifiées → Run workflow) et vérifier sa sortie, puis la table `cron_runs`. Un appel en échec fait échouer le workflow, et GitHub prévient par e-mail.

Exemples en local :

```bash
npm run cron:run -- ingest
npm run cron:run -- missions
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/missions
```

## Tests et déploiement (phase 7)

### Les niveaux de test

| Niveau | Outil | Où | Ce qui est couvert |
| --- | --- | --- | --- |
| Unitaires et composants | Vitest + Testing Library | `src/**/*.test.ts(x)` | Logique métier, génération, flux, tâches planifiées, en-têtes, `/api/health`, composants |
| Intégration | Vitest | `src/**/*.integration.test.ts` | Dépôt Supabase, ingestion, génération, journal des tâches (base locale ; ignorés sans base) |
| Base de données | pgTAP | `supabase/tests/database` | RLS, contraintes, fonctions SQL |
| Bout en bout | Playwright (WebKit, iPhone 13) | `e2e/` | Redirection sans compte, connexion, les cinq onglets sans erreur console ni défilement horizontal, inscription → accueil → mission → mot → suppression du compte |

Les tests de bout en bout tournent sur un build de production (`next start`, port 3100), contre la **base locale uniquement** : ils refusent de démarrer si `NEXT_PUBLIC_SUPABASE_URL` ne pointe pas vers `127.0.0.1` ou `localhost`, puisqu’ils créent et suppriment des comptes. La mission est préparée avec le générateur de secours (`MISSION_GENERATOR=template`) : aucun appel payant. Le test d’inscription crée une source et un article jetables (le seed n’a pas de source relevable), puis efface tout, compte compris, même en cas d’échec.

```bash
npm run db:start && npm run db:reset   # base locale + compte de démo
npm run e2e:install                    # une fois
npm run e2e                            # rapport HTML : npx playwright show-report
```

### Intégration continue (`.github/workflows/ci.yml`)

À chaque pull request et à chaque push sur `main`, deux jobs en parallèle :

- **check** : `npm run check` puis `npm run build` (sans Supabase, donc le build de démo) ;
- **database** : stack Supabase locale réduite (Postgres, Auth, PostgREST, passerelle), `db reset`, tests pgTAP, tests Vitest avec la base, puis tests Playwright. En cas d’échec, le rapport Playwright est joint au run (7 jours).

Un nouveau commit annule le run en cours sur la même branche. Compter environ 10 minutes d’Actions par run, en plus des ~840 minutes mensuelles des tâches planifiées (2 000 gratuites pour un dépôt privé). Pour rendre la CI obligatoire avant fusion : Settings → Branches → règle sur `main` → « Require status checks » avec les deux jobs.

### Production

- **En-têtes de sécurité** (`src/lib/security/headers.ts`, appliqués par `next.config.ts`) : `nosniff`, `Referrer-Policy`, interdiction d’affichage dans un cadre, `Permissions-Policy`, et une CSP minimale (`frame-ancestors`, `base-uri`, `form-action`, `object-src`). Pas de `script-src` : une politique à nonce imposerait le rendu dynamique de toutes les pages. HSTS est déjà ajouté par Vercel.
- **`/api/health`** (publique, jamais en cache) : `{ ok, mode, commit, time }`. Avec `Authorization: Bearer <CRON_SECRET>`, elle interroge aussi la base (5 s au plus) et ajoute `database` ; en erreur, elle répond 503. Sans le secret, elle ne touche jamais la base.
- **Smoke test après déploiement** (`.github/workflows/deploy-smoke.yml`) : l’intégration GitHub de Vercel signale chaque déploiement ; pour la production réussie, le workflow vérifie avec `curl` que le domaine de production (`APP_URL`) sert bien le nouveau commit, que la base répond, que `/connexion` et le manifeste répondent, que `/` sans session redirige vers `/connexion`, que les en-têtes de sécurité sont présents et que `/api/cron/missions` refuse un appel sans secret. Il réutilise les secrets `APP_URL` et `CRON_SECRET` de la phase 6. On peut aussi le lancer à la main (Actions → Smoke test du déploiement → Run workflow).

### Check-list de mise en production

1. Variables Vercel (Production) : les trois variables Supabase, `ANTHROPIC_API_KEY` (et, en option, `ANTHROPIC_API_KEY_FALLBACK`), `CRON_SECRET` ; `CONTENT_LICENSE_POLICY=commercial` avant toute vente.
2. Migrations : `npx supabase db push --linked` après chaque nouvelle migration, **avant** de fusionner le code qui en dépend.
3. Supabase Auth : *Site URL* et *Redirect URLs* (`https://<domaine>/auth/confirm`), modèles d’e-mail de `supabase/templates/`, confirmation d’e-mail activée, mot de passe d’au moins 8 caractères, SMTP réel (voir « Déploiement sur un vrai projet Supabase »).
4. Secrets GitHub : `APP_URL`, `CRON_SECRET`.
5. Après déploiement : le smoke test doit être vert ; vérifier une fois à la main sur iPhone l’inscription (e-mail reçu, lien vers le bon domaine), l’ajout à l’écran d’accueil et la mission du jour.

## Bêta privée : compte, confidentialité, retours

- **Mot de passe oublié** : `/connexion` → `/mot-de-passe-oublie` (même message que le compte existe ou non, pour ne pas révéler les adresses inscrites) → e-mail → `/auth/confirm` → `/nouveau-mot-de-passe`. Le paramètre `next` des liens n’accepte que des chemins internes (`src/lib/security/safe-next-path.ts`). En local, les mails arrivent dans Mailpit (http://127.0.0.1:54324).
- **Confidentialité** : `/confidentialite`, publique, décrit ce que l’app stocke et ce qui est envoyé au modèle (jamais l’e-mail, les productions écrites ni le vocabulaire). À relire et à mettre à jour à chaque nouvelle donnée collectée ou nouveau sous-traitant. `CONTACT_EMAIL` (facultatif, lu au build) y affiche une adresse de contact.
- **Retours** : `/retour` (lien depuis Préférences et la page d’erreur). Table `feedback` en écriture seule pour l’utilisateur (lecture dans Supabase Studio), 20 retours par 24 h au plus, effacés avec le compte. **Pousser la migration en production (`npx supabase db push --linked`) avant de fusionner.**

## Test de niveau

Un test adaptatif par langue (`/niveau`, lien depuis Préférences, dernière étape de l’accueil et carte du tableau de bord tant qu’une langue n’a pas été évaluée), à choix multiple, tiré de banques de questions rédigées à la main : `src/lib/placement/banks/<code>.ts`, 18 questions par variante, deux variantes selon l’usage (**Courant** et **Pro**, proposée d’après l’usage de la langue). Règles d’écriture : `src/lib/placement/banks/AUTHORING.md`.

- **Algorithme** (`src/lib/domain/placement.ts`) : le test part du niveau déclaré, pose 2 questions par niveau (une troisième si elles se partagent), monte tant que le niveau est réussi et descend tant qu’il est raté, et s’arrête à la première frontière réussi / raté. Résultat : un niveau CECR et une confiance (élevée, moyenne, faible selon le nombre de niveaux de la frontière qu’il a fallu départager). « Je ne sais pas » compte comme faux.
- **Enregistrement** : le client n’envoie que ses réponses ; le serveur les rejoue sur la banque et calcule lui-même l’estimation (`src/app/actions/placement.ts`). L’apprenant peut modifier le niveau avant d’enregistrer ; le niveau retenu devient son niveau actuel pour cette langue (RPC `record_placement_test`, atomique). Le test peut être passé : seule la date est enregistrée. L’estimation n’est qu’une aide à l’auto-évaluation, la table `placement_tests` ne la protège pas davantage.
- **Banques** : `npm run placement:check` (ou `-- ru it`) vérifie leur structure ; un test unitaire exige une banque valide pour chaque langue du registre. Changer une question : mettre à jour `version` de la banque.

