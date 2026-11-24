# Préversion aux volontaires : mode d'emploi du propriétaire

Étape M4 du [plan de migration](f-plan-de-migration.md). Spec : [specs/preversion.md](specs/preversion.md).

Ce document décrit ce qu'il faut faire, dans l'ordre, pour ouvrir la nouvelle app à quelques proches sur une adresse distincte. **Rien ici n'est exécuté par le code de la PR** : chaque étape marquée **« accord du propriétaire »** touche la production, la sauvegarde de données réelles ou un service externe, et se fait pas à pas, après ton accord.

## Ce que fait déjà le code

- **Reprise à la connexion** : quand un compte de l'ancienne app se connecte à la préversion (mot de passe ou lien reçu par e-mail), ou ouvre « Aujourd'hui » plus d'une heure après la dernière reprise, la fonction `app.claim_legacy_data()` recopie ses données de `public` vers `app` (réglages, langues, cartes, productions, bilans). Elle ne le fait que tant que la personne n'a rien fait dans la nouvelle app ; au plus 20 fois par 24 h. Une erreur n'empêche jamais la connexion.
- **Retours** : Réglages > « Signaler un problème » écrit dans la table `public.feedback` (catégorie, message, page, version). Limite de 20 retours par 24 h et par personne.
- **Repère « Préversion »** : avec `NEXT_PUBLIC_PREVIEW_LABEL=1`, la mention apparaît au pied des Réglages, à côté de la version (7 premiers caractères du commit).

Un compte repris arrive sur « Aujourd'hui » (il a déjà ses inscriptions) ; un nouveau compte arrive sur `/welcome` comme avant.

## Règle à dire aux volontaires

Après sa **première séance** dans la préversion, ce qu'on fait dans l'ancienne app **n'est plus repris** : les deux apps ne s'écrivent pas l'une dans l'autre. Avant cette première séance, tout ce qui change dans l'ancienne app est repris : à chaque connexion, et aussi à l'ouverture de « Aujourd'hui » (au plus une fois par heure) pour quelqu'un qui reste connecté. Il n'est donc pas nécessaire de se déconnecter puis de se reconnecter. Il n'y a pas de double écriture à gérer, il faut seulement choisir une app. La redirection automatique de l'ancienne app vers la nouvelle viendra avec la promotion vers `main`.

## Ordre des étapes

### 1. M2 : copie locale de la production

**Accord du propriétaire** (lecture de la base de production, copie de données personnelles réelles).

La copie ne doit jamais entrer dans le dépôt : utilise un dossier **hors du dépôt**.

```bash
# 0. Dossier hors dépôt (à adapter), et lien du CLI avec le projet de production
mkdir -p ../dailylingua-sauvegardes
npx supabase link --project-ref <REF_PROJET_PRODUCTION>

# 1. Sauvegarde : données seules de public et auth (le schéma vient des migrations)
npx supabase db dump --linked --data-only --use-copy --schema public,auth -f ../dailylingua-sauvegardes/prod-data.sql

# 2. Pile locale propre, avec toutes les migrations
npx supabase start
npx supabase db reset --no-seed

# 3. Vider les tables de public que les migrations remplissent déjà (langues, sources, etc.), sinon le chargement
#    des données de production échoue sur des clés en double. Le plus sûr : toutes les tables de public.
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -c "do \$\$ declare r record; begin for r in select tablename from pg_tables where schemaname = 'public' loop execute format('truncate table public.%I restart identity cascade', r.tablename); end loop; end \$\$;"

# 4. Restauration dans la pile locale (le dump désactive les déclencheurs pendant le chargement)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f ../dailylingua-sauvegardes/prod-data.sql

# 5. Migration de tous les comptes et contrôle (variables de la pile locale)
npx supabase status -o env        # recopier API_URL et SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL=<API_URL> SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY> npm run migration:verify
```

Si `psql` n'est pas installé sur ta machine, remplace-le par `docker exec -i supabase_db_<nom_du_projet> psql -U postgres -v ON_ERROR_STOP=1 < fichier.sql` (le nom du conteneur s'affiche avec `docker ps`). Avant l'étape 4, ouvre `prod-data.sql` : si le dump contient des tables système de `auth` (par exemple `auth.schema_migrations`, `auth.flow_state`), retire-les du fichier ou relance le dump sans elles (`--exclude-table`) : la pile locale a les siennes et un doublon fait échouer le chargement. Seules `auth.users`, `auth.identities` et les tables de comptes comptent.

Lis le rapport affiché : **aucune ligne d'écart, aucun utilisateur en échec** est le seul résultat acceptable. Joins-le à ta décision pour M3.

Après contrôle, **efface la copie** : `npx supabase db reset` puis suppression du dossier `../dailylingua-sauvegardes`.

### 2. M3 : schéma `app` en production

**Accord du propriétaire** (modification de la base de production).

Depuis la branche `dev` à jour :

```bash
git switch dev && git pull --ff-only
npx supabase db push --linked --dry-run     # liste ce qui serait appliqué : rien n'est écrit
npx supabase db push --linked               # seulement si la liste est celle attendue
```

Liste attendue : exactement les **36 fichiers `app_*`** de `20261112000100_app_schema_and_identity.sql` à `20261125000300_app_claim_legacy_data_lock.sql`, et rien d'antérieur (la production a déjà toutes les autres migrations, jusqu'à `20261108000100_grant_show_streak.sql` comprise). Si la liste diffère, arrête-toi.

**Accord du propriétaire : exposer le schéma `app` à l'API de données.** `db push` ne le fait pas, et sans cela chaque appel de la nouvelle app échoue (erreur PGRST106, « invalid schema »). Dans Supabase : Project Settings > Data API > **Exposed schemas** : ajouter `app` en gardant `public` et `graphql_public` (la pile locale le fait déjà, `supabase/config.toml` ligne 13). Enregistrer. Vérification, sans donnée personnelle (la liste des langues est lisible par tout compte connecté, mais pas en anonyme : on attend donc une réponse d'autorisation, pas une erreur de schéma) :

```bash
curl -s -o /dev/null -w "%{http_code}
" "https://<REF_PROJET_PRODUCTION>.supabase.co/rest/v1/language?select=code"   -H "apikey: <CLE_ANON>" -H "Accept-Profile: app"
```

`401` ou `403` (permission refusée) : le schéma est exposé, c'est bon. `406` avec le message `PGRST106` : le schéma n'est pas encore exposé. Le vrai test de bout en bout est l'étape 6 (connexion d'un compte existant).

Contrôle après la poussée. **Attention** : `npm run migration:verify` refuse volontairement toute base qui n'est pas locale (il lance la migration de tous les comptes, ce qu'on ne fait jamais depuis un script contre la production). Pour la production :

- le schéma `app` est créé vide : les données d'un compte sont reprises **une par une**, à sa première connexion (étape « Ce que fait déjà le code ») ;
- pour vérifier la perte éventuelle d'un compte déjà repris, exécute dans l'éditeur SQL de Supabase (rôle propriétaire) : `select * from app.verify_migration();` Chaque ligne renvoyée est un écart. **Les comptes qui n'ont pas encore été repris apparaissent aussi** (rien n'est encore copié pour eux) : n'examine que ceux des volontaires qui se sont déjà connectés à la préversion.

Rapport sans écart pour les comptes déjà repris : condition pour continuer.

### 3. Projet Vercel de préversion

**Accord du propriétaire** (création d'un projet, variables secrètes).

Dans Vercel, **Add New > Project**, dépôt `SDMM27/DailyLingua`, puis :

| Réglage | Valeur |
|---|---|
| Project Name | par exemple `daily-lingua-preversion` (donne `daily-lingua-preversion.vercel.app`) |
| Root Directory | `apps/web` |
| Framework Preset | Next.js (détecté) |
| Include source files outside of the Root Directory | **activé** (réglage par défaut : les paquets `packages/*` en ont besoin) |
| Settings > Git > Production Branch | **`dev`** |
| Settings > Deployment Protection | désactivée pour Production (l'accès est ouvert à quiconque a le lien ; sinon Vercel répond 401) |
| Environment Variables | celles de [`apps/web/.env.example`](../../apps/web/.env.example), avec `NEXT_PUBLIC_PREVIEW_LABEL=1` |

Valeurs minimales pour démarrer : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (inscriptions ouvertes à tous : garde le CAPTCHA), `ANTHROPIC_API_KEY` (et `ANTHROPIC_API_KEY_FALLBACK`), `CRON_SECRET`, les trois variables VAPID si les rappels doivent partir, et `NEXT_PUBLIC_PREVIEW_LABEL=1`. Le plafond de 10 $ par mois pour l'IA est déjà appliqué par le point d'appel unique du code.

Pas de `apps/web/vercel.json` : il n'est pas nécessaire. Le projet est un workspace npm détecté par Vercel à partir du `package-lock.json` racine, `next.config.ts` fixe déjà `outputFileTracingRoot` et `turbopack.root` à la racine du dépôt, et les commandes par défaut (`npm install` puis `next build`) suffisent. Le `vercel.json` de la racine concerne l'ancien projet et n'est pas lu quand la racine du projet est `apps/web`. Si le premier déploiement échoue à l'installation, règle dans le tableau de bord (pas dans un fichier) **Install Command** = `cd ../.. && npm ci`, et signale-le.

L'ancienne app en production (projet existant, branche `main`) n'est pas touchée.

Deux effets de bord à connaître :

- le workflow `deploy-smoke.yml` se déclenche à chaque déploiement « Production » **de n'importe quel projet Vercel du dépôt** ; il teste toujours `APP_URL` (l'ancienne app), donc un déploiement de la préversion lance un contrôle de l'ancienne app, sans lien avec la préversion ;
- chaque poussée sur `dev` redéploie la préversion.

### 4. Supabase Auth

**Accord du propriétaire** (réglage d'authentification de la production).

Authentication > URL Configuration :

- **Redirect URLs** : ajouter `https://<préversion>.vercel.app/auth/confirm` ;
- **Site URL** : ne pas changer (c'est celle de l'ancienne app).

Authentication > Email Templates : **vérifier sans modifier** le modèle « Confirm signup ». Les modèles sont partagés avec l'ancienne app. Avec le modèle par défaut, le lien fonctionne dans le navigateur qui a créé le compte ; ouvert ailleurs, la personne arrive sur « Connecte-toi » avec son adresse déjà confirmée (comportement voulu de `/auth/confirm`).

### 5. GitHub

**Accord du propriétaire** (secret et variable du dépôt).

```bash
gh secret set REFONTE_APP_URL --body "https://<préversion>.vercel.app"
gh variable set REFONTE_REMINDERS_ENABLED --body true     # seulement quand les rappels doivent partir
```

Le secret `CRON_SECRET` du dépôt doit avoir la même valeur que la variable `CRON_SECRET` du projet Vercel de la préversion. Sans `REFONTE_REMINDERS_ENABLED=true`, le workflow des rappels ne fait rien.

### 6. Contrôle de fumée sur iPhone

Avant d'inviter qui que ce soit :

1. ouvrir l'adresse dans Safari, ajouter à l'écran d'accueil, ouvrir depuis l'icône ;
2. se connecter avec **un compte existant de l'ancienne app** : on arrive sur « Aujourd'hui », les langues et les cartes sont là ;
3. faire la séance du jour jusqu'au bout ;
4. Réglages > « Signaler un problème » : envoyer un retour de test, puis le retrouver dans la table `public.feedback` (Supabase > Table editor ; la colonne `app_version` contient les 7 caractères affichés dans les Réglages) ;
5. créer un compte neuf : on arrive sur `/welcome`, puis sur « Aujourd'hui » après le choix d'une langue.

### 7. Inviter les volontaires

Envoyer le lien et la règle ci-dessus (« ce qu'on fait dans l'ancienne app après sa première séance ici n'est plus repris »).

### 8. Retour arrière

- Supprimer le projet Vercel de la préversion : l'ancienne app n'a jamais cessé de fonctionner.
- Le schéma `app` peut rester (l'ancienne app ne le lit pas) ou être supprimé, **sur accord explicite**. Ce que les volontaires ont fait dans la nouvelle app reste dans `app` et sera repris à la prochaine migration.
- Retirer `REFONTE_APP_URL` et `REFONTE_REMINDERS_ENABLED` pour arrêter les rappels.

### 9. Suivi hebdomadaire

**Accord du propriétaire** (lecture de la production avec la clé de service ; à fournir sur la ligne de commande, jamais dans un fichier du dépôt).

```bash
NEXT_PUBLIC_SUPABASE_URL=<URL_PRODUCTION> SUPABASE_SERVICE_ROLE_KEY=<CLE_DE_SERVICE> npm run cost:report
```

`npm run metrics:report` **refuse volontairement une base non locale**. Pour la production, exécute dans l'éditeur SQL de Supabase : `select app.metrics_report('2026-11-01');` (premier jour du mois voulu) et lis le JSON (`j1`, `j7`, `sessions`, `recall`, `rewrites`, `activeLearners`, `costUsd`).

Lire aussi les retours : `select created_at, category, page, app_version, message from public.feedback order by created_at desc;`

Critère de sortie de M4 : aucun écart signalé pendant deux semaines.
