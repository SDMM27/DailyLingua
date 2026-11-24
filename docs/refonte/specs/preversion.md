# Préversion aux volontaires (étape M4 du plan de migration)

Date : 2026-11-24. Base : `dev`. Branche : `feat/preversion`. Niveau : sensible (données reprises, authentification, déploiement).

## 1. Décisions du propriétaire

| Point | Décision |
|---|---|
| Volontaires | Le propriétaire et quelques proches, dont certains ont un compte dans l'ancienne app |
| Accès | **Ouvert à tous** : quiconque a le lien peut créer un compte (Turnstile et quotas existants ; plafond IA global de 10 $/mois déjà appliqué par le point d'appel unique) |
| Adresse | Un **second projet Vercel** (racine `apps/web`) sur un sous-domaine `*.vercel.app` gratuit |
| Branche déployée | **`dev`** : la promotion `dev → main` embarque 255 commits, dont la refonte graphique de l'ancienne app, et reste une décision à part. L'ancienne app en production n'est pas touchée |

## 2. Ce que fait le code (cette PR)

### 2.1 Reprise des données à la connexion

Un compte de l'ancienne app qui se connecte à la préversion doit y retrouver ses données **les plus récentes**.

- Nouvelle migration : fonction `app.claim_legacy_data()` (`security definer`, `search_path = ''`), exécutable par `authenticated` uniquement, révoquée pour `public` et `anon`. Elle agit sur `auth.uid()`, jamais sur un argument.
  - Sans `auth.uid()` : erreur.
  - Utilisateur invité (anonyme) : ne fait rien, renvoie `{"skipped": "guest"}`.
  - Pas de ligne `public.profiles` pour cet utilisateur : renvoie `{"skipped": "no_legacy"}`.
  - `app.profile.app_active_since` déjà posé : renvoie `{"skipped": "active"}` sans rien toucher (règle de reprise incrémentale, `f-plan-de-migration.md` §2).
  - Sinon : renvoie le résultat de `app.migrate_user(auth.uid())` (resynchronisation complète, idempotente, déjà verrouillée par verrou consultatif).
  - Limite : au plus 20 appels effectifs par utilisateur et par 24 h (réutiliser `app.event_rate` ou le mécanisme de limite existant le plus proche ; au-delà, renvoyer `{"skipped": "rate_limited"}` sans erreur).
- Tests pgTAP (`supabase/tests/database/`) : les cinq branches ci-dessus, l'appel par `anon` refusé, l'absence d'effet sur un autre utilisateur, l'idempotence (deux appels → mêmes comptes de lignes), et qu'une écriture dans la nouvelle app après la reprise (pose de `app_active_since`) empêche toute resynchronisation ultérieure.
- Appel côté `apps/web`, par le client Supabase de l'utilisateur (pas de clé de service) :
  - dans l'action `signIn` (`apps/web/src/app/actions/auth.ts`), après une connexion réussie et avant le `redirect("/")` ;
  - dans `apps/web/src/app/auth/confirm/route.ts`, après un `verifyOtp` ou un `exchangeCodeForSession` réussi.
  - Un échec de la reprise ne bloque **jamais** la connexion : il est journalisé (`console.error`, sans données personnelles) et l'utilisateur continue.
  - Fonction partagée dans `packages/data` (ex. `claimLegacyData(client)`), avec tests unitaires ; tests des deux points d'appel (réussite, échec de la reprise sans effet sur la redirection).
- Un compte repris a déjà ses inscriptions : vérifier qu'il arrive sur Aujourd'hui et **pas** sur `/welcome` (qui réécrirait son profil). Un nouveau compte sans inscription va sur `/welcome` comme aujourd'hui.

### 2.2 Retours des volontaires

Les volontaires doivent pouvoir signaler un problème depuis l'app (critère de sortie de M4 : « aucun écart signalé pendant deux semaines »).

- Nouvelle fonction `app.send_feedback(p_category text, p_message text, p_page text, p_app_version text)` (`security definer`, `authenticated` seulement) qui écrit dans la table existante **`public.feedback`** (mêmes contraintes : catégories `bug | idee | contenu | autre`, message de 3 à 2000 caractères, `page` ≤ 200, `app_version` ≤ 40), avec la même limite que l'ancienne app (20 retours par 24 h par utilisateur ; lire la migration `20261015000200_feedback.sql` et reprendre son mécanisme). Un invité peut envoyer un retour si `public.profiles` a sa ligne, sinon erreur propre.
  - La table `public.feedback` n'est pas modifiée.
  - Tests pgTAP : insertion, limite, refus pour `anon`, validation.
- Écran : une section « Signaler un problème » **dans la page Réglages existante** (`apps/web/src/app/(app)/settings/page.tsx`), dans le style des autres sections, pas de nouvelle page. Catégorie (liste), message (zone de texte, police ≥ 16 px), bouton Envoyer ; message de confirmation ou d'erreur traduit ; `page` = chemin courant, `app_version` = SHA court du déploiement (`VERCEL_GIT_COMMIT_SHA` tronqué à 7, sinon `local`).
- Textes en français et en anglais dans `packages/i18n/messages/{fr,en}.json` ; le test « aucune chaîne en dur » doit rester vert.

### 2.3 Repère « Préversion »

- Quand la variable `NEXT_PUBLIC_PREVIEW_LABEL=1` est définie, une petite mention « Préversion » (traduite) apparaît en pied de la page Réglages, à côté de la version. Rien d'autre ne change. Sans la variable, rien ne s'affiche.

### 2.4 Configuration du déploiement

- `apps/web/.env.example` : toutes les variables dont `apps/web` a besoin en production, avec un commentaire par variable (Supabase URL et clé anon, clé de service si le code l'utilise déjà, `ANTHROPIC_API_KEY` et secours, clés Azure Speech si utilisées au runtime, VAPID, `CRON_SECRET`, Turnstile, `NEXT_PUBLIC_PREVIEW_LABEL`). Les lire dans le code existant, ne pas en inventer. Aucune valeur réelle.
- Vérifier que `apps/web` se construit comme projet Vercel à racine `apps/web` dans un monorepo npm workspaces (commande d'installation depuis la racine du dépôt). Ajouter `apps/web/vercel.json` seulement si c'est nécessaire, et le justifier dans le runbook.

### 2.5 Runbook

`docs/refonte/preversion.md`, en français, pour le propriétaire. Chaque étape qui touche la production est marquée **« accord du propriétaire »** et donne la commande exacte :

1. **M2 — copie locale de la production** : sauvegarde (`supabase db dump` des schémas `public` et `auth`, fichiers hors dépôt, dossier ignoré), restauration dans la pile locale, `npm run migration:verify`, lecture du rapport ; effacement de la copie après contrôle.
2. **M3 — schéma `app` en production** : `npx supabase db push --linked` depuis `dev` (liste des migrations attendues), puis `migration:verify` contre la production (variables à fournir), rapport sans écart exigé.
3. **Projet Vercel de préversion** : création, racine `apps/web`, branche de production `dev`, variables (renvoi à `.env.example`), nom du sous-domaine.
4. **Supabase Auth** : ajouter `https://<préversion>/auth/confirm` aux Redirect URLs (le Site URL reste celui de l'ancienne app) ; vérifier les modèles d'e-mail.
5. **GitHub** : secret `REFONTE_APP_URL`, variable `REFONTE_REMINDERS_ENABLED=true` quand les rappels doivent partir.
6. **Contrôle** : parcours de fumée sur iPhone (connexion d'un compte existant, données retrouvées, séance du jour, retour envoyé et visible dans `public.feedback`).
7. **Règles pour les volontaires** : ce qu'on fait dans l'ancienne app après sa première séance dans la préversion **n'est plus repris** (pas de double écriture) ; le dire aux proches. La redirection automatique de l'ancienne app viendra avec la promotion vers `main`.
8. **Retour arrière** : supprimer le projet Vercel ; le schéma `app` peut rester (l'ancienne app ne le lit pas) ou être supprimé sur accord.
9. **Suivi** : `npm run cost:report` et `npm run metrics:report` contre la production, une fois par semaine.

## 3. Hors PR

Redirection de l'ancienne app vers la nouvelle (`migrated_at`), écran « ce que tu as déjà accompli », promotion `dev → main`, exécution réelle de M2 et M3 (faites après fusion, pas à pas, sur accord).

## 4. Critères de fin

`npm run check`, `npm run build`, `npm run refonte:check`, `npx supabase test db` verts ; e2e touchés verts ; captures à 390 px de la section Retours en clair et en sombre.
