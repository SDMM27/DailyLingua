# Jalon 1, PR 4 — Spec : limites connues avant le jalon 2

Auteur : architecte. Petite PR empilée sur `refonte/jalon-1-pr3`, branche `refonte/jalon-1-pr4`. Elle lève deux limites de la PR #39 qui gêneraient le jalon 2, et date la vérification des prix. Références : `c-game-design.md` §3.1 (jour d'apprentissage, 04:00 locales), `d-architecture.md` §6 (hors ligne), `j1-pr3.md` lots C et E.

Décisions déjà prises (ne pas rouvrir) : quotas par défaut confirmés par le propriétaire le 2026-11-16 (`rewrite_check` 6 par jour, `assessment_grading` 3 par jour, les autres selon `g-budget.md` §5) ; prix revérifiés le 2026-11-16 sur la page officielle, identiques à `pricing.ts`.

## 1. Jour du quota = jour d'apprentissage (`packages/ai`)

Aujourd'hui `call.ts` prend `at.toISOString().slice(0, 10)` (jour UTC). Une correction faite à 01:00 à Paris tombe sur le jour UTC précédent ou suivant selon le fuseau, et le quota ne suit pas la journée que l'apprenant voit.

Contrainte : `@dailylingua/ai` n'importe pas `@dailylingua/core` (test des frontières, `packages/core/src/boundaries.test.ts`). Le calcul du jour est donc **injecté**.

- `AiGatewayOptions` gagne `dayOf: (at: Date, timeZone: string) => string`, **obligatoire** (pas de valeur par défaut UTC, pour qu'un oubli ne compile pas). L'application lui passe `learningDay` de `@dailylingua/core`.
- `AiCallInput` : `userId: string | null` est remplacé par `learner: { id: string; timeZone: string } | null`. `null` = génération partagée, sans quota (comportement inchangé). Le journal (`AiCallRecord.userId`) reçoit `learner?.id ?? null`.
- Le jour du quota est `dayOf(at, learner.timeZone)`, calculé **une seule fois** avec le même `at` que le disjoncteur ; la libération utilise exactement le même `QuotaRef` (déjà le cas).
- Le jour rendu doit avoir la forme `YYYY-MM-DD` ; sinon `call` lève une `Error` de programmation avant tout appel (pas d'`AiError`, ce n'est pas une erreur de l'apprenant).
- `QuotaRef.day` : mettre à jour le commentaire (« jour d'apprentissage de l'apprenant, `YYYY-MM-DD` »). `app.claim_quota` prend déjà un `date` : aucune migration SQL.
- Note de sécurité, à écrire en commentaire : le fuseau vient du profil côté serveur, jamais d'un champ envoyé avec la requête. Changer de fuseau peut décaler d'un jour au plus la fenêtre du quota ; le risque (une poignée d'appels à 0,002 $) est accepté.
- `pricing.ts` : `PRICES_CHECKED_ON = "2026-11-16"` et commentaire de source : « page officielle des prix (platform.claude.com/docs/en/about-claude/pricing), lue le 2026-11-16 ; Haiku 5.5 : 0,10 / 0,50 $, écriture de cache 5 min 0,125 $, lecture 0,01 $ ; Batch −50 % ; seuil de cache 512 tokens sur les trois modèles ». Aucune valeur ne change.

Tests (`call.test.ts`, faux client et faux store, aucun appel réel) : adapter les tests existants au champ `learner` ; ajouter :
1. le `day` passé à `claimQuota` est celui que rend `dayOf`, appelé avec l'instant de `now()` et le fuseau de l'apprenant ;
2. avec le vrai `learningDay` recopié en test d'intégration côté `apps/web` ou `packages/data` **si** un tel test existe déjà ; sinon un cas dans `call.test.ts` avec une fonction `dayOf` qui imite 04:00 locales (00:30 à Paris le 2026-03-10 → `2026-03-09`) ;
3. `learner: null` n'appelle ni `dayOf` ni `claimQuota` ;
4. un `dayOf` qui rend autre chose que `YYYY-MM-DD` lève avant tout appel au client et au store ;
5. la libération après une erreur du fournisseur reçoit le même `day` que la réclamation.

`packages/data` (`ai-store.ts`, ses tests) ne change pas, sauf si un type l'exige.

## 2. File des rejets (`packages/core/src/offline`, `apps/web/src/lib/offline`)

Aujourd'hui un `BatchSender` qui échoue fait échouer tout le lot, qui est renvoyé plus tard. Un événement que le serveur refusera toujours (schéma invalide, séance d'un autre utilisateur, trop vieux) bloquerait donc la file pour toujours.

### Contrat d'envoi (`types.ts`)

```ts
export interface RejectedDelivery { clientEventId: string; reason: string } // reason : code stable [a-z_], 1 à 64 caractères
export interface DeliveryReport { rejected: readonly RejectedDelivery[] }
export type BatchSender = (batch: readonly PendingEvent[]) => Promise<DeliveryReport | void>;
```

- Le sender **résout** quand le serveur a traité le lot : chaque événement est soit accepté, soit listé dans `rejected` (refus **définitif**). `void` = tout accepté (rétrocompatibilité avec l'envoi factice).
- Le sender **rejette** pour un échec passager du lot entier (réseau, 5xx, 401 déconnecté) : le lot sera renvoyé, comme aujourd'hui.
- Un `clientEventId` de `rejected` qui n'est pas dans le lot envoyé est ignoré. Une `reason` hors format est remplacée par `"invalid_reason"`.

### File (`EventQueue`)

```ts
export interface RejectedEvent extends PendingEvent { reason: string; rejectedAt: string } // ISO 8601
// ajouts à EventQueue :
reject(entries: readonly { clientEventId: string; reason: string; rejectedAt: string }[]): Promise<void>;
  // déplace atomiquement de la file vers la réserve des rejets ; ids inconnus ignorés ; un id déjà rejeté n'est pas dupliqué
listRejected(limit: number): Promise<RejectedEvent[]>; // plus anciens d'abord
discardRejected(clientEventIds: readonly string[]): Promise<void>;
rejectedCount(): Promise<number>;
```

`enqueue` d'un id déjà présent dans la réserve des rejets est ignoré (idempotence : un id n'est jamais renvoyé après un refus).

### `flushQueue`

- `FlushState` gagne `rejected: ReadonlyMap<string, string>` (id → raison) : les refus reçus mais pas encore inscrits dans la réserve (si `reject()` a échoué). `INITIAL_FLUSH_STATE` l'initialise vide.
- Pour chaque lot : on envoie seulement les événements ni dans `delivered` ni dans `rejected` ; on ajoute les acceptés à `delivered` et les refusés à `rejected` ; puis `queue.reject(...)` pour les ids du lot présents dans `rejected` (horodatage `rejectedAt` = `now` reçu en paramètre, converti en ISO) ; puis `queue.ack(...)` pour les autres ids du lot. Un échec de `reject` ou de `ack` → `failed` comme aujourd'hui, les maps sont conservées et l'étape reprend au prochain appel **sans renvoyer** ces événements.
- `FlushResult` gagne `rejected: number` (refus nouvellement inscrits pendant cet appel). `sent` compte les événements acceptés seulement.
- `flushQueue` ne lit toujours aucune horloge.

### Implémentations

- `memory-queue.ts` : réserve en mémoire.
- `indexeddb-queue.ts` : `DB_VERSION = 2`, nouveau magasin `rejected` (clé `clientEventId`). La montée de version **garde** le magasin `events` existant (`oldVersion < 1` → créer `events` ; `oldVersion < 2` → créer `rejected`). `reject` agit dans **une seule** transaction sur les deux magasins.
- `event-sync.ts` : rien à changer hors des types, sauf si nécessaire.
- `/lab`, carte « Mode hors ligne » : afficher « Événements rejetés : N » ; un bouton « Mettre en file un événement refusé » qui ajoute un événement dont la charge contient `{ demoReject: true }` ; `createDemoSender` le rend dans `rejected` avec la raison `demo_rejected`. Ligne de journal « 1 événement refusé ». Textes fr et en dans `@dailylingua/i18n` (le test « aucune chaîne en dur » doit passer).

### Tests

- Vitest `packages/core` (file en mémoire) : un refus n'empêche pas l'envoi des autres ; l'événement refusé passe dans la réserve avec sa raison et n'est jamais renvoyé ; `void` = tout accepté ; id inconnu dans `rejected` ignoré ; raison invalide → `invalid_reason` ; `reject()` qui échoue une fois → `failed`, puis au prochain appel inscrit le refus **sans renvoyer** l'événement ; `enqueue` d'un id rejeté ignoré ; `discardRejected`.
- `apps/web` : si une bibliothèque IndexedDB factice est déjà installée, tester la montée v1 → v2 (événements conservés). Sinon, ne pas ajouter de dépendance : un test e2e Playwright sur `/lab` (production) qui met en file un événement refusé et voit « Événements rejetés : 1 ». Le signaler dans le rapport.

## Hors périmètre

Aucun écran de gestion des rejets pour l'apprenant (jalon 2, avec le vrai point d'envoi). Aucun changement SQL, aucun changement de `src/` (ancienne app), `supabase/`, `legacy/`.

## Critères de fin

`npm run refonte:check` et `npm run refonte:build` verts ; e2e de `apps/web` verts (pile Supabase locale déjà lancée ; ne pas utiliser le port 3000 ni 3200, déjà pris) ; `npm run check` vert ; fins de ligne LF (`git ls-files --eol`) ; commits atomiques en anglais (types et logique, file IndexedDB, `/lab` et i18n, prix et doc).
