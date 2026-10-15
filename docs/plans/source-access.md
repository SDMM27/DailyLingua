# Plan : accès aux contenus par utilisateur

Statut : plan, non implémenté. Branche : `dev`.

## Problème

L'utilisateur reçoit une mission dont l'article est payant et qu'il ne peut pas lire.

## Constat (code actuel)

- `SourceDefinition.access` existe déjà (`src/lib/schemas/content.ts`, valeurs `free` | `metered` | `paywalled`, défaut `free`).
- Ce champ est stocké (`supabase-repository.ts`, `supabase-store.ts`) et affiché (`content-item.tsx`, `lire/sources/page.tsx`).
- **Il n'est lu par aucune logique de sélection.** `select-contents.ts`, `generate-mission.ts` et `availability.ts` filtrent sur la langue, la licence (`commercialUse`) et l'état des sources, jamais sur l'accès.
- Les missions sont générées **par langue**, puis partagées entre utilisateurs. Un choix unique pour tous ne peut donc pas tenir compte des abonnements individuels.

## Objectif

1. Ne jamais proposer une mission qu'un utilisateur ne peut pas lire.
2. Permettre à un utilisateur de déclarer les sources auxquelles il a accès.
3. Donner une sortie immédiate quand une mission est inaccessible.

## Étapes

### Étape 1 — Filtrer la sélection sur l'accès (sans schéma nouveau)

- `src/lib/content/policy.ts` : ajouter `readAccessiblePolicy` ou une fonction pure `isReadable(source, userAccess)`.
- `src/lib/generation/select-contents.ts` : exclure les contenus dont la source n'est pas lisible. Par défaut seules les sources `free` sont retenues.
- `src/lib/generation/generate-mission.ts` : passer l'ensemble d'accès au sélecteur ; la clé de cache de la mission devient `(langue, ensemble d'accès)`.
- `src/lib/content/availability.ts` : une langue sans source `free` ne doit pas être proposée à un utilisateur qui n'a que l'accès gratuit.

Tests unitaires : `select-contents.test.ts` (source `metered` exclue sans accès, incluse avec accès), `generate-mission.test.ts` (clé de cache par ensemble d'accès), `availability.test.ts`.

### Étape 2 — Bouton « Je n'ai pas accès » sur la mission

- `src/components/mission/mission-view.tsx` : bouton qui appelle une action serveur `src/app/actions/mission.ts`.
- L'action marque le contenu comme refusé pour cet utilisateur (ajouter son id à `excludeIds`, déjà présent dans `rankCandidates`) et régénère une mission avec un autre contenu lisible.
- Test : `mission-view.test.tsx` (le bouton apparaît, l'action est appelée, la mission change).

### Étape 3 — Accès déclaré par utilisateur

Schéma :
- Table `user_source_access` (`user_id`, `source_id`, `created_at`), clé primaire composite.
- Migration Supabase + mise à jour de `src/lib/supabase/database.types.ts`.
- Règle par défaut : toutes les sources `free` sont lisibles ; `metered` et `paywalled` seulement si une ligne existe.

Interface :
- `src/app/preferences/page.tsx` et `src/components/preferences/preferences-form.tsx` : liste des sources `metered`/`paywalled`, case à cocher « J'y ai accès ».
- Données lues via `getRepository()` uniquement (règle du projet).

Sécurité :
- Aucune donnée d'identifiant d'éditeur n'est stockée.
- Pas de scraping avec les cookies de l'utilisateur.
- Les lignes `user_source_access` ne sont lisibles que par leur propriétaire (RLS Supabase).

### Étape 4 — Option « texte personnel » (facultatif)

- L'utilisateur colle un texte qu'il peut lire lui-même.
- Le texte est stocké dans son compte, jamais partagé ni réutilisé pour un autre utilisateur.
- Pas de traitement éditorial ni de génération de mission partagée à partir de ce texte.

## Ordre de livraison

1 → 2 → 3. L'étape 1 règle le cas de la mission du jour sans nouveau schéma ; l'étape 2 donne une sortie à l'utilisateur ; l'étape 3 ouvre l'accès payant.

## Vérifications

Pour chaque étape : `npm run check` et `npm run build`, comme demandé dans `CLAUDE.md`. Vérifier la page mission à largeur téléphone.

## Questions ouvertes

- Faut-il une mission partagée par ensemble d'accès, ou une mission par utilisateur ? La première est plus économique ; la seconde est plus simple à raisonner.
- Les sources `metered` (abonnement possible) doivent-elles être proposées par défaut à l'utilisateur, ou seulement sur demande ?
- Politique de licence : `CONTENT_LICENSE_POLICY=commercial` doit-il aussi exclure les sources `paywalled` ?
