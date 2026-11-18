# d. Architecture cible

## 1. Parti pris

**Réécrire la couche application, reprendre les fondations.** L'audit (`00-audit-et-benchmark.md` §2) montre que le domaine pur, la base (RLS, pgTAP), la CI et les contenus curés sont sains, alors que l'interface, l'accès aux données et le modèle de progression supposent partout « un francophone, en ligne, qui coche des cases ». La refonte construit donc une nouvelle application dans un monorepo, à côté de l'ancienne, et y **déplace** ce qui est bon.

## 2. Stack et justification

| Brique | Choix | Pourquoi | Alternative écartée |
|---|---|---|---|
| Langage | TypeScript strict partout | Un seul langage du domaine au natif | — |
| Dépôt | Monorepo npm workspaces | Partage réel du code avec Expo, sans publier de paquets | Deux dépôts : la logique divergerait |
| Web | Next.js 16 (App Router), React 19 | Déjà maîtrisé ici, rendu serveur pour les pages publiques, doc PWA et i18n officielles ; Expo partage React | Vite + SPA : plus simple hors ligne, mais on perd le serveur intégré (actions, cron, rendu des pages publiques) et l'acquis. Expo Router web : immature pour une PWA iPhone soignée |
| Données | Supabase (Postgres, Auth, Storage) | RLS et pgTAP déjà en place ; les comptes existants restent valides ; offre gratuite | Firebase : pas de SQL ni de RLS testable. Postgres nu : il faudrait refaire l'authentification |
| Style | Tailwind 4 + `@sdmm/design` | Le design system exporte déjà `./native` | — |
| Validation | Zod 4 | Schémas partagés client, serveur, natif | — |
| Mémoire | `ts-fsrs` (MIT), encapsulé dans le domaine | Implémentation de référence de FSRS en TypeScript | Écrire FSRS nous-mêmes : risque inutile |
| i18n | `next-intl`, messages ICU en JSON | Recommandé par la doc Next, compatible Server Components ; les fichiers JSON sont lisibles par l'app native | Paraglide, Lingui : valables, moins répandus |
| Hors ligne | Service worker avec Serwist + IndexedDB | Option citée par la doc Next 16, exemples Turbopack | `useOffline` de Next (expérimental) : utile en complément, insuffisant seul |
| IA | SDK Anthropic, Haiku 5.5, Batch et cache de prompt | Décision de budget | — |
| Voix | Azure Speech (offre gratuite) derrière une interface ; voix de l'appareil en secours | Gratuit d'abord ; fournisseur remplaçable | Dépendre de la reconnaissance du navigateur : inopérante en PWA installée sur iOS |
| Push | Web Push (VAPID, `web-push`) | Standard, gratuit, pris en charge par iOS ≥ 16.4 en PWA installée | Service tiers payant |
| Hébergement | Vercel + GitHub Actions (cron) | Existant | — |

Les versions exactes et l'API de chaque brique sont vérifiées dans leur documentation au jalon 1, avant d'écrire du code (règle `AGENTS.md`).

## 3. Organisation du code

```
apps/
  web/            Next.js : routes, composants, service worker
  native/         Expo (jalon 8) — vide jusque-là
packages/
  core/           domaine pur : niveaux, FSRS, XP, séries, séance, estimation, licences
  schemas/        Zod : entités, événements, entrées/sorties des appels IA
  content/        contenus curés versionnés + registre des langues + fréquences
  i18n/           messages par langue d'interface (JSON ICU), sans React
  ai/             prompts paramétrés (L1, L2, niveau), appel unique journalisé, jeux d'éval
  data/           contrats d'accès aux données + implémentation Supabase
supabase/         migrations, tests pgTAP, seed
legacy/           l'application actuelle, gelée, jusqu'à la bascule
```

Règles vérifiées par le lint (frontières d'import) : `core`, `schemas`, `content`, `i18n` n'importent ni React, ni Next, ni Supabase. `apps/web` n'accède aux données que par `packages/data`. Un seul module appelle l'API Anthropic.

## 4. Modèle de données

Nouveau schéma Postgres **`app`** dans le projet Supabase existant ; les tables actuelles restent dans `public`, intactes, jusqu'à la bascule (`f-plan-de-migration.md`).

**Principe central : les faits sont des événements en ajout seul, les états sont dérivés.** Le client envoie des *tentatives* ; le serveur les corrige et en déduit les cartes, l'XP, la série et le niveau. On peut donc recalculer n'importe quel état, rejouer une synchronisation, et auditer une triche.

| Groupe | Tables | Notes |
|---|---|---|
| Identité | `profile` (L1, langue d'interface, fuseau, réglages du jeu), `enrollment` (langue cible, objectif, minutes, jours) | Une ligne `enrollment` par langue apprise |
| Contenu partagé | `text` (gradué ou ouvert, langue, niveau, thème, licence, statut de relecture), `text_token` (segmentation, lemmes), `text_gloss` (par L1), `audio_asset`, `source`, `unit_translation` (contenu curé traduit, par L1) | Lisible par tout connecté ; écrit par le rôle de service seulement |
| Séance | `session` (plan du jour, état), `attempt` (**ajout seul** : exercice, réponse, correction, durée, `client_event_id` unique) | Le cœur de l'anti-triche |
| Mémoire | `card` (type, référence, phrase de contexte, état FSRS, échéance horodatée), `review_log` (**ajout seul**) | Remplace 4 tables actuelles |
| Vocabulaire | `lexeme_state` (par lemme : nouveau, en cours, prouvé ; preuves) | Sert au calcul de couverture |
| Production | `production`, `correction`, `rewrite` | Reprend `production_entries` et `writing_feedback` |
| Progrès | `skill_estimate` (valeur, incertitude par compétence), `can_do` (descripteur, preuves), `assessment_result`, `immersion_log` | |
| Jeu | `xp_ledger` (**ajout seul**), `streak_state`, `quest`, `user_quest`, `badge_award`, `league`, `league_member`, `friendship` | Détail des besoins dans `c-game-design.md` |
| Exploitation | `ai_call` (modèle, tokens, coût, objet, utilisateur), `quota_usage`, `push_subscription`, `content_report`, `job_run` | `ai_call` alimente le rapport de coût |
| Migration | `legacy_map` (table et identifiant d'origine → nouvel identifiant) | Rend la migration rejouable |

Les contenus curés (grammaire, unités, alphabets, banques, dossiers) **restent des fichiers versionnés** dans `packages/content` : la base ne stocke que leurs identifiants stables. C'est ce qui permet la relecture en session Claude Code, hors budget.

## 5. Sécurité

**RLS.** Activée sur toutes les tables. Lecture : ses propres lignes ; contenus partagés publiés lisibles par tout connecté. Écriture directe par le client : uniquement `profile`/`enrollment` (via RPC validée), `push_subscription`, `content_report`, `immersion_log`.

**Anti-triche.** Le client n'a **aucun** droit d'écriture sur `xp_ledger`, `streak_state`, `card`, `skill_estimate`, `badge_award`, `league_member`. Chemin unique :

1. le client envoie un lot de tentatives (réponses brutes, horodatages, identifiant d'événement) ;
2. le serveur (action serveur, rôle de service) vérifie que l'exercice appartient à une séance de cet utilisateur, corrige à partir de la clé de réponse **qu'il détient** (les bonnes réponses des exercices notés ne sont pas envoyées avant la tentative quand c'est possible, et jamais crues quand elles reviennent), applique FSRS, calcule l'XP avec `packages/core` ;
3. une fonction SQL `security definer` écrit le tout dans une transaction ; `client_event_id` unique rend l'envoi idempotent.

Garde-fous : plafonds d'XP par action et par jour, cohérence des durées (un texte de 200 mots « lu » en 4 secondes ne compte pas), horloge du serveur pour la série (avec le fuseau du profil et une tolérance pour les lots hors ligne), limites de débit par utilisateur. Les ligues n'utilisent que de l'XP vérifiée.

**Autres points.** CSP stricte (reprise), micro autorisé pour `self` seulement, clés en variables d'environnement, CAPTCHA sur l'inscription et l'essai invité (existant), stockage audio privé avec URL signées, **aucun enregistrement vocal conservé** après transcription (décision antérieure reprise), suppression de compte en cascade, page de confidentialité tenue à jour à chaque nouveau sous-traitant. Une revue de sécurité indépendante (agent `relecteur-securite`, Opus) est faite sur chaque jalon qui touche au schéma ou aux RPC, et pgTAP teste chaque politique.

## 6. Hors ligne

| Élément | Stratégie |
|---|---|
| Coquille de l'app, polices, icônes | Pré-cache du service worker |
| Séance du jour (plan, texte, gloses, audio, exercices auto-corrigés) | Préchargée à l'ouverture et à la génération ; stockée dans IndexedDB et le cache |
| File de révision | Les cartes dues des 2 prochains jours sont en local |
| Tentatives | File d'attente locale (IndexedDB), envoyée par lots au retour du réseau ; idempotente |
| Résultat affiché hors ligne | **Provisoire** : le client calcule avec le même `packages/core` et l'indique ; le serveur fait foi à la synchronisation |
| Correction de production, jeu de rôle | Nécessitent le réseau ; la production est mise en attente et corrigée ensuite |

Conflits : les événements s'ajoutent, ils ne s'écrasent pas ; l'état FSRS est recalculé dans l'ordre des horodatages. Le stockage d'iOS pouvant être purgé, rien de non synchronisé n'est gardé plus longtemps que nécessaire, et l'app le signale.

## 7. Interface dans toute langue

- **Trois langues distinctes** par utilisateur : la langue d'interface, la L1 (langue des explications) et la langue cible. Elles peuvent différer (interface en anglais, explications en vietnamien).
- Interface : `fr` et `en` au jalon 1 ; repli sur l'anglais ; `lang` et `dir` du document selon la langue ; propriétés CSS logiques partout pour le RTL ; dates, nombres et pluriels par `Intl` et ICU.
- Un test échoue si un composant contient une chaîne en dur, et un autre si une clé manque dans une langue.
- Noms des langues calculés par `Intl.DisplayNames`, plus de `nameFr`.
- Schémas : plus aucun champ `*_fr` ; chaque texte explicatif porte sa langue.
- Traduction de l'interface vers d'autres langues : par modèle en session Claude Code, alignement mécanique par l'agent `quick-task`, relecture par échantillon.

## 8. Partage avec les apps natives

Partagés tels quels : `core`, `schemas`, `content`, `i18n`, `ai` (types), `data` (contrats et client Supabase), tokens du design system (`@sdmm/design/native`). Propres à chaque plateforme : composants, navigation, stockage local (IndexedDB ↔ SQLite), audio, notifications. L'interface du stockage local et de la file d'événements est définie dans `core` pour que les deux plateformes l'implémentent.

## 9. IA et voix

Un seul point d'entrée `ai.call(objet, entrées)` : choisit le prompt versionné, applique le cache de prompt, vérifie le quota, appelle Haiku 5.5, valide la sortie par Zod, écrit `ai_call`. Tout ce qui n'est pas immédiat part en Batch (textes gradués, gloses, traductions de contenus, relecture). Disjoncteur global : au-delà du budget mensuel, les générations non essentielles s'arrêtent et l'app sert le stock existant.

La voix passe par une interface `speech` (synthèse, transcription) avec un fournisseur par défaut et un secours ; l'audio généré est stocké une fois et servi à tous.

## 10. Qualité et CI

Typecheck, lint (dont frontières d'import), Vitest (domaine et composants), tests d'intégration sur base locale, pgTAP, Playwright WebKit à 390 px en clair et en sombre avec contrôle d'accessibilité automatisé (axe) et absence de défilement horizontal, contrôle des contenus (`*:check`), contrôle des fins de ligne (LF), budget de taille du bundle. Les évaluations de prompts (`feedback:eval`, `assessment:eval`) restent manuelles car payantes, et sont exigées avant tout changement de prompt.

## 11. Risques techniques

| Risque | Parade |
|---|---|
| Micro et enregistrement en PWA installée sur iOS | Prototype sur iPhone réel au jalon 1, avant de concevoir l'oral |
| Purge du stockage local par iOS | File courte, synchronisation fréquente, état provisoire signalé |
| Next.js 16 différent des habitudes | Lecture de `node_modules/next/dist/docs/` imposée dans chaque brief |
| Droits d'usage commercial de l'audio gratuit | Point à trancher ; interface `speech` remplaçable |
| Dérive du coût IA | `ai_call` systématique, quotas, disjoncteur |
| Deux applications à maintenir pendant la refonte | L'ancienne est gelée (correctifs de sécurité seulement) |
