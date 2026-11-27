# Jalon 6.3 — Journal d'immersion

Spec d'implémentation de la partie « immersion » du [§6.3](j6-progres.md#63--test-adaptatif-bilan-et-immersion). Le test adaptatif et la projection en fourchette restent à faire.

## Décisions

- **Pas d'XP dans cette version.** `app.xp_ledger` est en ajout seul (trigger `xp_ledger_append_only`) : une entrée modifiable ou supprimable ne peut pas y laisser une ligne `immersion.declared` juste. L'XP d'immersion du [game design](../c-game-design.md) (1 XP par tranche de 10 min, 6 par jour) viendra avec les quêtes du jalon 7, calculée à la clôture du jour. Les filtres `immersion.*` existants restent tels quels.
- **Saisie par le serveur.** Comme les autres écritures de `app`, le client n'a que la lecture ; la route serveur écrit avec le rôle de service en filtrant sur l'utilisateur de la session.
- **Langue** : une des langues apprises du compte (inscriptions), par défaut la langue active de la page Progrès.

## Données

Migration `supabase/migrations/20261127000100_app_immersion.sql` (horodatage après le dernier fichier de `dev`) :

```sql
create table app.immersion_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  day date not null,
  minutes smallint not null check (minutes between 1 and 600),
  kind text not null check (kind in ('video', 'audio', 'reading', 'conversation', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index immersion_entry_user_day_idx on app.immersion_entry (user_id, day desc);
-- RLS : lecture par le propriétaire seulement ; aucune écriture pour anon/authenticated ; service_role tout.
```

- Le jour ne peut pas être dans le futur selon le fuseau du profil, ni plus de 30 jours en arrière (contrôle côté serveur, pas en SQL).
- Au plus 50 entrées par compte et par jour (contrôle serveur, réponse 429).
- pgTAP `supabase/tests/database/app_immersion.test.sql` : RLS (un compte ne lit pas l'autre, `authenticated` ne peut ni insérer ni modifier ni supprimer), contraintes, cascade à la suppression du compte. Mettre à jour `app_access.test.sql` si elle énumère les tables.

## Schéma et données

- `packages/schemas/src/immersion.ts` (zod) : `immersionKind`, `immersionEntryInput` `{ language, day (YYYY-MM-DD), minutes (entier 1–600), kind }`, export dans l'index.
- `packages/data/src/immersion.ts` : `listImmersion(client, userId, from, through)` (client authentifié, borné à 60 lignes, tri jour desc puis created_at desc) ; `createImmersion`, `updateImmersion`, `deleteImmersion` (client service, filtre `user_id` toujours). Tests avec le `table-fake` existant.
- Étendre `getProgressOverview` (sans casser son contrat) ou ajouter un chargeur séparé qui renvoie, pour les 7 jours affichés : minutes en app (somme des séances `completed` de la langue, `completed_at − started_at` borné à 60 min par séance, 0 si une borne manque) et minutes déclarées de la langue.

## API

`apps/web/src/app/api/immersion/route.ts` (POST) et `apps/web/src/app/api/immersion/[id]/route.ts` (PATCH, DELETE). Reprendre exactement les gardes des routes `api/roleplay` : utilisateur de session, en-tête de compte, même origine, corps ≤ 4 Ko validé par zod, id UUID, erreurs par statut sans renvoyer le contenu. Langue refusée (400) si elle n'est pas une inscription du compte. 404 si l'entrée n'appartient pas au compte.

## Interface (page Progrès)

Écran aéré, une action principale. Sur la page `/progress`, sous les jours d'étude (colonne gauche à 1280/1440 px), une section « Immersion » :

- Ligne de synthèse sur 7 jours : « Temps d'apprentissage : 1 h 10 dans l'app · 45 min déclarées ». Le temps déclaré porte le libellé « déclaré » et un style secondaire, jamais additionné silencieusement.
- Bouton « Ajouter du temps » qui ouvre un formulaire simple (date — aujourd'hui par défaut, minutes, type en boutons radio). Champs ≥ 16 px, cibles ≥ 44 px, clavier accessible, labels liés.
- Liste des entrées des 7 derniers jours de la langue (date, type, durée) avec « Modifier » et « Supprimer » (confirmation légère). Après une action, la page se rafraîchit (`router.refresh()`).
- Libellés FR et EN dans `packages/i18n/messages/{fr,en}.json` (namespace `progress.immersion`), aucune chaîne en dur ; clair et sombre via les tokens existants.

## Tests

- Vitest : schéma, chargeur (bornes, isolation par langue), routes (garde d'auth, langue non inscrite, jour futur, entrée d'un autre compte → 404, limite de 50).
- e2e WebKit 390 px (`apps/web/e2e/progress.spec.ts` ou nouveau fichier) : ajouter, modifier, supprimer une entrée ; la synthèse suit ; changement de langue active.

## Recette

Décompte juste après modification d'une entrée et après changement de langue active ; deux comptes isolés ; semaine à cheval sur un mois.
