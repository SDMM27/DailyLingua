# Daily Lingua

Une mission linguistique quotidienne construite à partir de contenus authentiques (presse, podcasts, interviews, vidéos), adaptée au niveau, aux intérêts et au temps disponible.

Pensée d’abord pour le téléphone : web app installable sur l’écran d’accueil (PWA), avec une app native envisagée plus tard pour l’App Store et le Play Store.

> **État actuel : phase 3.** Sans variables Supabase (c’est le cas de la version déployée), l’app est la **démo publique** sur données fictives, rien n’est enregistré. Avec Supabase configuré, il faut un compte : connexion e-mail + mot de passe, écran d’accueil pour choisir ses langues, puis vocabulaire, révisions espacées, suivi de mission, historique et préférences sont enregistrés par utilisateur (RLS).

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

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript** strict
- **Tailwind CSS 4** (tokens de design dans `src/app/globals.css`)
- **Zod 4** : validation aux frontières (données, formulaires)
- **Vitest** + Testing Library : tests de la logique métier et des composants
- **Supabase** (PostgreSQL, Auth, RLS) : migrations SQL versionnées, CLI en dépendance de dev, stack locale via Docker
- À venir : un fournisseur de LLM derrière une interface, une tâche planifiée quotidienne

## Structure

```
src/
  app/                  Pages, layouts, manifest PWA, icônes générées
  components/
    ui/                 Primitives (Card, ProgressBar, LanguageTag…)
    layout/             Barre d’onglets (mobile) et barre du haut (desktop)
    dashboard/ mission/ vocabulary/ preferences/
  lib/
    domain/             Logique métier pure : dates et fuseaux, budget temps,
                        répétition espacée, statistiques, registre des langues
    schemas/            Schémas Zod et types dérivés
    data/               Accès aux données : interface, implémentation de démo, implémentation Supabase
    supabase/           Intégration Supabase : variables d’env (Zod), clients serveur / admin, types générés
supabase/
  config.toml           Configuration de la stack locale
  migrations/           Schéma, contraintes, index, RLS et privilèges
  seed.sql              Utilisateur de démo + données équivalentes aux mocks
  tests/database/       Tests pgTAP
```

`lib/domain` et `lib/schemas` ne dépendent ni de Next.js ni de React : ils pourront être réutilisés tels quels par une app native.

## Choix importants

- **Langues extensibles.** Toutes les langues sont décrites dans `src/lib/domain/languages.ts`. Ajouter une langue = ajouter une entrée. L’utilisateur choisit 1 à 4 langues, chacune avec un poids ; le temps quotidien est réparti proportionnellement.
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

### Déploiement sur un vrai projet Supabase (plus tard)

1. Créer le projet sur supabase.com, puis `npx supabase login` et `npx supabase link --project-ref <ref>`.
2. `npx supabase db push` applique les migrations. **Ne jamais exécuter `seed.sql` sur un projet réel** (il crée un compte au mot de passe public).
3. Renseigner les trois variables dans Vercel (Project Settings → Environment Variables) ; `SUPABASE_SERVICE_ROLE_KEY` en variable **non exposée**. Tant que ce n’est pas fait, Vercel reste en mode démo.
4. **Authentification** (Dashboard → Authentication) :
   - *URL Configuration* : `Site URL` = l’URL de production (ex. `https://daily-lingua.vercel.app`) et, dans `Redirect URLs`, `https://<domaine>/auth/confirm`. Sans cela, le lien de l’e-mail de confirmation pointe vers `localhost`.
   - *Sign In / Providers → Email* : laisser **Confirm email** activé (c’est le défaut hébergé ; seul le local le désactive).
   - Fixer une longueur de mot de passe minimale d’au moins 8 (l’app l’exige à l’inscription).
   - Brancher un **SMTP** réel (Authentication → SMTP Settings) : le service d’e-mails par défaut de Supabase est très limité et réservé aux tests.
5. **Suppression de compte** : elle utilise `SUPABASE_SERVICE_ROLE_KEY` côté serveur. Sans cette variable, le bouton échoue proprement sans rien supprimer.
6. Vérifier de bout en bout : inscription → e-mail → lien → écran d’accueil → ajout d’un mot → suppression du compte.

> La suppression efface le compte et toutes ses données personnelles (cascade SQL, testée). Le contenu partagé (`sources`, `contents`) reste.
