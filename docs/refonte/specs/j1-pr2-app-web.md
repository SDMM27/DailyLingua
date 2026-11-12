# Jalon 1, PR 2 — Spec de la vague 2 : l'application `apps/web`

Auteur : architecte. Exécutant : `implementer`, puis `qa-mobile`. S'appuie sur `@dailylingua/core`, `schemas`, `i18n`, `data` et sur les fonctions `app.save_profile` et `app.save_enrollments`. Références : `d-architecture.md` §3, §5, §7 ; `e-direction-artistique.md` (dont la section « Densité ») ; `maquettes/maquettes.html` (écran 01 état C, écran 11).

## 0. Périmètre

Une nouvelle application Next.js dans `apps/web`, à côté de l'application actuelle (racine, non modifiée). À la fin de ce lot, sur la base locale : on crée un compte ou on se connecte avec un compte existant, on choisit sa langue maternelle et sa langue cible, on arrive sur « Aujourd'hui », on change la langue de l'interface. **Pas** de séance, de révision, d'XP ni de hors ligne : PR 3 et jalon 2.

**Avant d'écrire du code** : lire dans `node_modules/next/dist/docs/` les guides de la version installée (structure d'un projet App Router, `proxy`, Server Actions, `cookies`, `connection`, internationalisation, authentification), la documentation de `next-intl` installée (configuration **sans** segment de langue dans l'URL), le README de `@sdmm/design` et celui de `@supabase/ssr`. Ne rien écrire de mémoire.

## 1. Paquet et configuration

- `apps/web/package.json` : `@dailylingua/web`, privé. Dépendances aux mêmes versions que la racine pour `next`, `react`, `react-dom`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `tailwindcss`, `@tailwindcss/postcss` ; plus `next-intl`, `@sdmm/design` (`github:SDMM27/sdmm-design#v1.0.0`) et les quatre paquets `@dailylingua/*`.
- Scripts : `dev` (port 3200), `build`, `start`, `typecheck`, `lint`, `test`, `e2e`. `npm run refonte:check` les couvre ; ajouter `refonte:build` à la racine.
- `next.config.ts` : `transpilePackages` pour les `@dailylingua/*` ; en-têtes de sécurité repris de `src/lib/security/headers.ts` (les recopier dans `apps/web`, sans importer depuis `src/`).
- Variables d'environnement : les mêmes noms que l'app actuelle (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). En développement, `next.config.ts` charge `../../.env.local` s'il existe (`process.loadEnvFile`), sans jamais l'afficher. **La clé de service n'est pas utilisée par ce lot.**
- TypeScript strict, alias `@/*` → `apps/web/src/*`. Lint : `eslint-config-next` + interdiction d'importer depuis `../../src` ou `../../../src`.
- Styles : `globals.css` importe `tailwindcss`, `@sdmm/design/css/all-dailylingua.css` et `@sdmm/design/tailwind/v4.css`. Uniquement des tokens du design system. **Propriétés logiques seulement** : classes `ms-/me-/ps-/pe-/start-/end-/text-start/text-end`, jamais `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` (un test le vérifie).

## 2. Langue de l'interface

- `next-intl` sans routage par langue. La langue vient, dans l'ordre : `profile.ui_language` si connecté, cookie `dl_locale`, en-tête `Accept-Language`, puis `en` — via `resolveUiLocale` de `@dailylingua/i18n`. Messages chargés par `loadMessages`.
- `<html lang dir>` : `dir` par `textDirection(locale)` de `@dailylingua/core`.
- **Aucune chaîne visible en dur** dans `apps/web/src` : tout passe par les messages. Un test parcourt les fichiers `.tsx` et échoue sur un texte JSX littéral ou un attribut `aria-label`/`placeholder`/`title`/`alt` littéral (liste d'exceptions courte et commentée : symboles, nom « Daily Lingua »).
- Noms de langues : `languageDisplayName(code, locale)` ; dates et nombres : `Intl` avec la langue de l'interface.

## 3. Routes

Chemins neutres, en anglais (l'app est multilingue).

| Route | Accès | Contenu |
|---|---|---|
| `/sign-in` | public | E-mail et mot de passe ; lien vers la création de compte ; « Essayer sans compte » |
| `/sign-up` | public | E-mail, mot de passe (≥ 8 caractères) ; message « vérifie ta boîte » si la confirmation est requise |
| `/auth/confirm` | public | Échange du code de confirmation (même mécanisme que `src/app/auth/confirm/route.ts`) |
| `/welcome` | connecté | Installation en 4 étapes (§4) |
| `/` | connecté | « Aujourd'hui » (§5). Sans inscription active → redirection vers `/welcome` |
| `/settings` | connecté | Réglages (§6) |

`src/proxy.ts` : rafraîchit la session Supabase et redirige un visiteur non connecté vers `/sign-in` (liste de chemins publics testée). Mot de passe oublié, suppression de compte, conversion d'un invité : **hors périmètre**, à noter dans le rapport.

Authentification : `@supabase/ssr`, cookies. Server Actions validées par Zod ; messages d'erreur traduits, jamais le message brut de Supabase. CAPTCHA Turnstile : même variable `NEXT_PUBLIC_TURNSTILE_SITE_KEY` que l'app actuelle, widget affiché seulement si elle est définie (reprendre la logique de `src/components/auth/turnstile-widget.tsx` en la recopiant).

## 4. `/welcome`

Une étape par écran, une seule décision par écran, barre de progression discrète, retour possible.

1. **Ta langue maternelle** : champ de recherche + liste de toutes les langues acceptées (`isValidNativeLanguage`), nommées dans la langue de l'interface, préremplie d'après la langue du navigateur.
2. **La langue que tu apprends** : les langues cibles du registre, sauf la langue maternelle (`canLearn`). Une seule dans ce lot.
3. **Ton niveau de départ** : « Je débute » (`A0`) puis A1 à C2 avec une phrase « Je peux… » par niveau (messages). Pas de test ici.
4. **Ton temps par jour** : 10, 15, 20 ou 30 minutes (15 présélectionné).

Validation finale : `saveProfile` (langue maternelle, langue d'interface courante, fuseau du navigateur) puis `saveEnrollments` (une langue, tous les jours, `start_level`). En cas d'erreur : message clair, rien n'est perdu de la saisie. Puis `/`.

## 5. `/` — « Aujourd'hui », état du premier jour

Reproduit l'écran 01, état C, des maquettes, en respectant le budget de densité : en-tête réduit (nom, date dans la langue de l'interface), **un** bloc principal (anneau d'objectif vide, langue apprise, niveau de départ, un seul bouton), rien d'autre au-dessus de la ligne de flottaison. Les séances n'existant pas encore, le bouton est désactivé et porte un libellé honnête (« Les séances arrivent bientôt ») : pas de faux contenu. La page appelle `await connection()` avant de lire la date. Barre d'onglets : Aujourd'hui, Réglages.

## 6. `/settings`

Langue de l'interface (fr, en : effet immédiat, cookie + profil), langue maternelle, fuseau horaire (liste `Intl.supportedValuesOf('timeZone')`), heure de rappel (facultative), thème clair / sombre / système (`initTheme` du design system), déconnexion. Une section par groupe, enregistrement explicite, confirmation discrète.

## 7. Qualité

- Mobile d'abord : 390 × 844, safe areas (`viewport-fit=cover`), cibles ≥ 44 px, champs ≥ 16 px, aucun défilement horizontal à 360 px, clair et sombre, `prefers-reduced-motion`.
- Accessibilité AA : libellés de champs, erreurs reliées par `aria-describedby`, ordre de tabulation, focus visible.
- Les pages ne lisent les données que par `@dailylingua/data`, avec le client de l'utilisateur (RLS). Aucun accès direct aux tables, aucun rôle de service.
- Tests Vitest : résolution de la langue, chemins publics du proxy, validation des actions, composants des 4 étapes, test « aucune chaîne en dur », test « propriétés logiques ».
- Playwright (`apps/web/e2e`, WebKit iPhone 13, base locale, port 3200 ; reprendre l'approche de `playwright.config.ts` et `e2e/helpers.ts` en les recopiant) : création de compte → installation → « Aujourd'hui » en français ; passage en anglais dans les réglages (`lang` du document vérifié) ; reconnexion ; visiteur redirigé ; pas de débordement horizontal ; aucune erreur de console. Nettoyage du compte créé.
- CI (`.github/workflows/ci.yml`) : dans `check`, `npm run refonte:build` ; dans `database`, les e2e de `apps/web` après ceux de l'app actuelle.

## 8. Interdits

Rien dans `src/`, `e2e/`, `supabase/`, `scripts/` de la racine. Pas de nouvelle migration. Pas d'appel à une API payante. Pas de déploiement. Pas de dépendance au-delà de celles listées au §1 (une bibliothèque de test d'accessibilité pour Playwright est permise).

## 9. Critères de fin

`npm install` ; `npm run refonte:check` et `npm run refonte:build` verts ; `npm run check` et `npm run build` de l'app actuelle verts ; e2e de `apps/web` verts sur la base locale ; LF partout ; commits atomiques. Le rapport donne les commandes et leurs résultats réels, les écarts à la spec, et ce qui reste hors périmètre.
