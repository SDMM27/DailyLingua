# Plan : sujets et types de contenus par langue

Statut : plan, non implémenté. Phase 4 de la feuille de route « objectifs et retour écrit » (les phases 2 et 3 sont commitées : `56a6b6e`, `45d56d7`).

## Problème

`topics` et `contentTypes` sont globaux au profil (`profiles`, `save_preferences`). Un utilisateur qui apprend l'anglais professionnel (économie, technologie, articles) et l'espagnol courant (cinéma, gastronomie, podcasts) reçoit les mêmes sujets et formats pour les deux langues.

## Constat (code actuel)

- Les colonnes `topics` et `content_types` sont sur `profiles` (`20261013000100_profiles_and_languages.sql`) et écrites par la RPC `save_preferences` (dernière version : `20261015000300_language_purpose.sql`).
- `languageGoalSchema` (`src/lib/schemas/preferences.ts`) porte déjà `language`, `level`, `targetLevel`, `focus`, `weight` et `purpose`. Il n'a pas de sujets ni de formats.
- `generate-mission.ts` lit `preferences.topics` et `preferences.contentTypes` (lignes ~117 à 148). `prompt.ts` injecte les sujets dans le prompt. `supabase-store.ts` filtre déjà `listCandidates` par `contentTypes`.
- Le formulaire (`src/components/preferences/preferences-form.tsx`, lignes ~252 à 262) affiche une seule liste de sujets et une seule liste de formats.

## Objectif

1. Chaque langue a ses propres sujets et ses propres formats de contenu.
2. Un raccourci « comme pour les autres langues » évite de tout ressaisir.
3. Les missions ne mélangent jamais les sujets d'une langue à une autre.

## Étapes

### Étape 1 — Schéma et données

- `src/lib/schemas/preferences.ts` : ajouter `topics` (au moins un, valeurs de `TOPICS`) et `contentTypes` (au moins un, valeurs de `contentTypeSchema`) à `languageGoalSchema`. Retirer ces deux champs de `preferencesSchema` une fois l'étape 4 validée.
- Migration `supabase/migrations/20261015000600_language_topics.sql` :
  - ajouter `topics` et `content_types` à `user_languages` ;
  - les remplir depuis `profiles` pour les lignes existantes ;
  - ne pas supprimer les colonnes de `profiles` dans cette migration (suppression reportée à une migration ultérieure, après vérification en production).
- Réécrire `save_preferences` pour écrire les sujets et formats par langue. Une charge utile sans ces champs garde les valeurs actuelles, pour ne pas casser les anciens clients.
- Régénérer `src/lib/supabase/database.types.ts`.

### Étape 2 — Interface

- `src/components/preferences/preferences-form.tsx` : déplacer le choix des sujets et des formats dans le bloc de chaque langue.
- Ajouter une case « Mêmes sujets et formats que pour les autres langues » qui copie les valeurs de la première langue.
- Rester lisible au format téléphone : une langue par bloc repliable, aucun champ en dessous de 16 px.
- `src/app/preferences/page.tsx` et l'onboarding : même logique.

### Étape 3 — Génération

- `src/lib/generation/generate-mission.ts` : passer à la génération de chaque langue les sujets et formats de **cette** langue (`goal.topics`, `goal.contentTypes`), et non plus ceux du profil.
- `src/lib/generation/prompt.ts` : la liste des centres d'intérêt vient de la langue concernée.
- `src/lib/generation/supabase-store.ts` : `listCandidates` reçoit les formats de la langue.
- **Point à trancher** : `docs/plans/source-access.md` indique que les missions sont générées par langue puis partagées. Si c'est le cas, la clé de cache doit inclure les sujets et les formats : `(langue, sujets, formats, ensemble d'accès)`. Sinon deux utilisateurs avec des sujets différents recevraient la même mission.
- Si une langue n'a aucun contenu du format choisi, `availability.ts` le signale et propose les formats disponibles, au lieu de produire une mission vide.

### Étape 4 — Nettoyage

- Retirer `topics` et `contentTypes` de `preferencesSchema` et des types dérivés.
- Migration de suppression des colonnes de `profiles`, seulement après une semaine de production sans erreur sur `save_preferences`.

## Tests

- `src/lib/schemas/preferences.test.ts` (si présent, sinon créer) : une langue sans sujet est refusée ; le raccourci copie les valeurs.
- `src/components/preferences/preferences-form.test.tsx` : chaque langue affiche ses propres sujets ; le raccourci fonctionne.
- `src/lib/generation/generate-mission.test.ts` : deux langues avec des sujets différents produisent deux prompts différents.
- `src/lib/generation/select-contents.test.ts` : seul le format de la langue est retenu.
- `src/lib/data/supabase-repository.writes.integration.test.ts` : la migration remplit les lignes existantes et `save_preferences` écrit par langue.
- Vérification finale : `npm run check` et `npm run build`.

## Questions ouvertes

- Confirmer si les missions sont réellement partagées entre utilisateurs (voir étape 3).
- Le raccourci « comme les autres langues » est-il souhaité, ou faut-il tout saisir à chaque langue ?
