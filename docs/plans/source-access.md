# Plan : accès aux contenus par utilisateur

Statut : étapes 1, 2 et 3 réalisées, étape 4 (facultative) à faire. Branche : `dev`.

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

### Étape 2 — Bouton « Je n'ai pas accès » sur la mission (réalisée)

Les missions sont **par utilisateur** (une ligne `missions` par utilisateur et par jour) : le refus d'un contenu ne concerne que lui, et il n'y a pas de clé de cache à faire dépendre de l'accès.

Ce qui a été construit :

- Migration `20261015000600_content_refusals.sql` :
  - table `content_refusals` (`user_id`, `content_id`, `reason` = `no_access`, `created_at`), clé primaire `(user_id, content_id)` : un refus par contenu et par utilisateur, définitif. RLS : le propriétaire lit et insère, sans modifier ni supprimer. Les lignes servent aussi de signal pour corriger le catalogue ;
  - colonne `missions.session_replacements` : nombre de remplacements **réservés** sur la mission du jour (une tentative réservée compte même si la génération échoue, comme `generation_attempts`) ;
  - colonne `mission_sessions.replacing_since` : non nulle tant qu'un remplacement de la session est en cours (une réservation de plus de 3 minutes est considérée abandonnée) ;
  - fonction `reserve_session_replacement` (service role uniquement), appelée **avant** le modèle : sous verrou de la mission, vérifie qu'elle est `ready`, qu'aucun remplacement de la session n'est en cours et que la limite n'est pas atteinte, puis marque la session et incrémente le compteur. Elle empêche N requêtes parallèles (ou des clics répétés) d'appeler toutes le modèle. Erreurs : `P0002` session introuvable ou à un autre utilisateur, `55000` mission non prête, `DL002` remplacement déjà en cours, `DL001` limite atteinte ;
  - fonction `release_session_replacement` : lève la marque quand la génération échoue après réservation (l'utilisateur peut réessayer, le créneau reste consommé) ;
  - fonction `replace_mission_session` (service role uniquement) : exige une session réservée (`55000` sinon), dans une transaction verrouille la mission, vérifie qu'elle est `ready`, supprime l'ancienne session (progression, réponses, production et correction partent en cascade), insère la nouvelle à la même position et dans la même langue et ajoute la trace de génération sous `generation_meta.replacements`. Erreurs : `P0002` session introuvable, `55000` mission non prête ou session non réservée.
- Limite : **3 remplacements par jour** (`MAX_SESSION_REPLACEMENTS_PER_DAY`), appliquée de façon atomique par `reserve_session_replacement` avant tout appel au modèle (plus de pré-contrôle sans verrou côté application).
- `generateMission` exclut aussi les contenus refusés (`MissionStore.listRefusedContentIds`).
- `replaceMissionSession` (`src/lib/generation/replace-session.ts`) réutilise les briques de `generateMission` (candidats lisibles, requête d'une session, génération avec repli sur le gabarit, planification) pour une seule langue, avec les minutes de l'ancienne session. Résultats : `ready`, `no-content`, `limit`, `not-found`, `failed`.
- Dépôt : `replaceInaccessibleContent(sessionId)` lit la session avec le client de l'utilisateur (RLS, preuve de propriété), enregistre le refus **même si rien ne peut remplacer le contenu**, puis appelle le remplaçant (service role). Action serveur `reportNoAccess`, qui rafraîchit la page quand le contenu est remplacé.
- Interface : `NoAccessButton` sous le lien « Ouvrir sur … » de chaque contenu, avec confirmation (la progression de cette langue est effacée) ; masqué en démonstration.
- Tests : `replace-session.test.ts`, `generate-mission.test.ts`, `no-access-button.test.tsx`, `actions/mission.test.ts`, et le test d'intégration d'écriture (base locale).

### Étape 3 — Accès déclaré par utilisateur (réalisée)

L'accès est **par source** : une source est lisible par un utilisateur si elle est `free` ou s'il l'a déclarée. Le niveau d'accès (`metered` / `paywalled`) ne suffit plus à lui seul ; abonné à un éditeur, on ne l'est pas aux autres.

Ce qui a été construit :

- Migration `20261016000100_user_source_access.sql` : table `user_source_access` (`user_id`, `source_id`, `created_at`), clé primaire `(user_id, source_id)`, index sur `source_id`, cascade à la suppression du profil ou de la source. RLS : le propriétaire lit, insère et supprime ses lignes (aucune mise à jour), les autres ne voient rien, `anon` n'a aucun droit. **Aucun identifiant d'éditeur n'est stocké**, ni cookie ni jeton : c'est une simple déclaration, jamais vérifiée. `database.types.ts` mis à jour.
- `isSourceReadable(source, declaredSourceIds)` (`src/lib/content/policy.ts`). `DEFAULT_READABLE_ACCESS` / `isReadable` ne servent plus qu'à `availableLanguages` (une langue n'est proposée que si elle a une source gratuite).
- `MissionStore.listCandidates(language, { contentTypes?, declaredSourceIds, limit })` remplace l'option `access`, et `MissionStore.listDeclaredSourceIds(userId)` (service role) lit les déclarations. `generateMission` et `replaceMissionSession` chargent ces identifiants eux-mêmes ; l'option `readableAccess` disparaît.
- Implémentation Supabase de `listCandidates` : pas de filtre `or` à travers la table imbriquée. Une requête sur les sources `free`, plus, si l'utilisateur a déclaré des sources, une seconde sur `source_id in (...)` (mêmes autres filtres : langue, lien cassé, source active avec clé, licence, types) ; fusion, dédoublonnage par id, tri `published_at` décroissant (sans date en dernier), puis limite.
- Dépôt : `listPaidSources()` (sources actives `metered` / `paywalled` des langues de l'utilisateur, avec `declared`, ordre du registre des langues puis nom ; en démonstration, issues du catalogue, jamais déclarées) et `setSourceAccess(sourceId, hasAccess)` (insertion idempotente ou suppression ; refuse une source gratuite, inactive ou inconnue ; lecture seule en démonstration). Schémas `paidSourceSchema` et `sourceAccessInputSchema` dans `src/lib/schemas/content.ts`.
- Action serveur `setSourceAccess` (`src/app/actions/preferences.ts`).
- Interface : section « Mes abonnements » de `/preferences` (composant `SourceAccessList`) : une ligne par source (langue, nom, « accès limité » ou « payant »), case « J'y ai accès » enregistrée immédiatement, état optimiste avec retour en arrière et message en cas d'échec ; masquée s'il n'y a aucune source payante, désactivée en démonstration. `preferences-form.tsx` n'est pas modifié.
- Tests : `policy.test.ts`, `generate-mission.test.ts`, `replace-session.test.ts`, `source-access-list.test.tsx`, `actions/source-access.test.ts` et deux tests d'intégration (`user-source-access.integration.test.ts` pour la migration, la RLS et le dépôt ; `supabase-store.integration.test.ts` pour la fusion des sources déclarées).

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

- ~~Mission partagée par ensemble d'accès ou par utilisateur ?~~ Sans objet : les missions sont par utilisateur.
- Les sources `metered` (abonnement possible) doivent-elles être proposées par défaut à l'utilisateur, ou seulement sur demande ?
- Politique de licence : `CONTENT_LICENSE_POLICY=commercial` doit-il aussi exclure les sources `paywalled` ?
