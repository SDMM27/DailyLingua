# Jalon 4, PR 1 — Architecture : unités, ingestion et progression

Complète [j4-parcours-debutant.md](j4-parcours-debutant.md) (périmètre, décisions) et [j4-ecrans.md](j4-ecrans.md) (écrans, variante C). Fait foi pour les données, la notation et l'XP des unités.

**But de la PR 1** : l'unité 1 (« Saluer et se présenter ») jouable de bout en bout en italien et en russe, hors ligne, avec notation et XP décidées par le serveur, progression enregistrée et phrases-clés versées dans la file FSRS. La carte du parcours, les unités Écriture, le 4e onglet et les erreurs du lendemain sont dans la PR 2.

## 1. Contenu

### 1.1 Paquet `@dailylingua/content` (nouveau, `packages/content`)
- Sans React ni Next (même règle que `core` et `schemas`), testé par Vitest, ajouté aux frontières d'import (`packages/core/src/boundaries.test.ts` ou équivalent).
- `src/units/<lang>/<nn>-<slug>.ts` : un `export const` par unité, typé `UnitSource`.
- `src/units/index.ts` : registre `UNITS: Record<UnitId, Unit>`, construit au chargement en validant chaque source par `unitSchema.parse` et en calculant `version` = 12 premiers caractères hexadécimaux du SHA-256 du JSON canonique de la source (clés triées). Fonctions : `getUnit(id)`, `unitsFor(language)` (triées par `order`), `isPublished(unit)` (`aiReview` non nul).
- Script racine `units:check` (`scripts/units-check.mts`) : parse tout, vérifie les invariants du §1.3, affiche par unité le nombre d'items, de mots nouveaux et l'état de relecture. Il échoue sur le premier invariant violé. Ajouté à la CI.

### 1.2 Schéma (`packages/schemas/src/unit.ts`, Zod)
```
UnitId        = /^[a-z]{2}-(a0|a1)-\d{2}-[a-z0-9-]{2,40}$/   ex. "it-a1-01-saluer"
L10n          = { fr: string, en: string }                  (les deux obligatoires)
UnitSource = {
  id, language (registre), level: "A0"|"A1", order: int ≥ 1, kind: "situation"|"script",
  title: L10n, situation: L10n (1 phrase), minutes: int,
  canDo: [{ id, text: L10n }] (2–3),
  grammarPointId: string | null      (id du curriculum de grammaire, ex. "it-a1-essere-avere")
  dialogue: {
    title: string (langue cible),
    speakers: [{ id, name, voice: string }] (2),
    lines: [{ id, speaker, text, translation: L10n, audio: string|null }] (6–10),
    audio: string | null,            (dialogue entier)
    glosses: [{ form, lemma, meaning: L10n, note: L10n|null, isNew: bool }]   (mots touchables)
  },
  keyPhrases: [{ id, text, translation: L10n, lineId|null, audio: string|null }] (6–10),
  grammar: { summary: L10n (3–5 lignes), itemIds: [string] (≥2) } | null,
  items: [Item],                     (tous les items de l'unité, ids uniques dans l'unité)
  lessons: [                         (exactement 3)
    { id: "l1"|"l2"|"l3", steps: [{ step: UnitStep, itemIds: [string], threshold: number }] }
  ],
  test: { itemIds: [string] (exactement 10), passScore: 8 },
  conversation: { turns: [{ id, speaker, text, translation: L10n, audio|null, itemId: string|null }] },
  aiReview: { reviewedOn: date, passes: 2, arbiter: string } | null,
}
UnitStep = "dialogue" | "key_phrases" | "grammar" | "exercises" | "conversation" | "test"
          | "letters" | "sounds" | "words" | "reading"          (unités Écriture, PR 2)
Item (union discriminée par `kind`) :
  mcq        { id, kind, prompt: L10n|string, options: [{id, text}] (2–4), answer: optionId, audio|null, explain: L10n }
  listen_mcq { …mcq, audio: string (obligatoire) }
  order      { id, kind, prompt: L10n, tokens: [string] (2–10), distractors: [string] (0–2), answer: string (phrase), accept: [string], explain: L10n }
  cloze      { id, kind, before: string, after: string, accept: [string] (≥1), hint: L10n|null, explain: L10n }
  type       { id, kind, prompt: L10n, accept: [string] (≥1), explain: L10n }
  match      { id, kind, pairs: [{ left: string, right: L10n }] (3–5), explain: L10n }
```
`reviewedOn` humain n'existe pas ici : `aiReview` est le seul statut (jamais de relecture humaine posée par un agent).

### 1.3 Invariants vérifiés par `units:check` (et par un test Vitest)
- Ids uniques ; chaque `itemIds` référencé existe ; chaque item appartient à au moins une étape ou au test ; les 10 items du test sont des items déjà vus dans une étape (aucun item inédit au test en A0-A1).
- `lineId` et `speaker` existent ; deux locuteurs ; chaque `voice` est dans la liste blanche `CLEARED_VOICES` (`ru_RU-denis-medium`, `ru_RU-dmitri-medium`, `it_IT-paola-medium`).
- Chaque token de `order` et chaque réponse acceptée de `cloze`/`type` est composé de formes présentes dans le dialogue, les phrases-clés ou les gloses (pas de mot inconnu en A0-A1), comparaison après `normalizeAnswer`.
- `grammarPointId` existe dans le curriculum de la langue (lire `src/lib/grammar/curricula/<lang>.ts` est interdit au paquet : la liste des ids est recopiée dans `packages/content/src/grammar-points.ts`, et `units:check` vérifie la correspondance avec le curriculum hérité).
- Les chemins `audio` non nuls existent dans `apps/web/public/unit-audio/`.
- `test.passScore` = 8 et `test.itemIds.length` = 10.

## 2. Notation (pur, `packages/core/src/units/`)
- `gradeUnitItem(item, answer, tolerance)` → `{ correct: boolean, nearMiss: boolean }` en réutilisant `../grading` : `mcq`/`listen_mcq` = `gradeChoice` ; `order` = phrase recomposée (tokens joints par espace) comparée à `answer` et `accept` par `gradeTyped` ; `cloze`/`type` = `gradeTyped` ; `match` = réponse sérialisée `"0:2,1:0,…"` (indices gauche:droite) comparée à l'identité.
- `stepValidated(unit, lesson, step, attempts)` : la part d'items de l'étape justes (dernier essai par item) ≥ `threshold` (dialogue 0 avec ses 2 items de compréhension répondus, phrases-clés 1, grammaire 0,5, exercices 0,6, conversation 1 ; le contenu fixe les seuils).
- `gradeUnitTest(unit, answers)` → `{ score, total: 10, passed: score ≥ passScore, missed: itemId[] }`. Une réponse manquante compte fausse ; un item hors test ou en double rend l'envoi invalide.
- Tests Vitest : chaque type d'item, tolérance des accents (réglage `answerTolerance`), score 7, 8, 10, doublons.

## 3. Événements client (`packages/schemas/src/events/client-events.ts`)
Trois nouveaux `kind`, stricts comme les autres (aucun champ `score`, `xp`, `correct`) :
```
unit_item_attempt   { …deviceFields, unitId, unitVersion (hex 12), lesson: "l1"|"l2"|"l3", itemId (≤ 40), try: 1..3, answer, shownAt }
unit_step_completed { …deviceFields, unitId, unitVersion, lesson, step: UnitStep }
unit_test_submitted { …deviceFields, unitId, unitVersion, attemptId: uuid, startedAt, answers: [{ itemId, answer }] (1..10) }
```
`shownAt ≤ occurredAt` et `startedAt < occurredAt` vérifiés comme pour `focus_attempt` et `fluency_pass`.

## 4. Ingestion (`packages/core/src/ingest/plan-ingest.ts`)
L'état reçoit deux champs, remplis par `packages/data` :
```
IngestState.unitProgress: Record<UnitId, { version, steps: Partial<Record<"l1:dialogue"|…, validatedAt>>, bestScore: number|null, testAttempts: number, passedAt: string|null }>
IngestState.units: Record<UnitId, Unit>   (contenu courant, injecté par l'appelant depuis @dailylingua/content ; core n'importe pas content)
```
Règles :
- **Refus définitifs** (file des rejets existante) : `unknown_unit` (unité absente ou non publiée en production), `unit_version_mismatch` (le client recharge le paquet ; aucune notation sur une ancienne version), `unknown_item` (item absent de l'étape de cette leçon ou du test), `duplicate_test_attempt` (même `attemptId`).
- `unit_item_attempt` : noté par `gradeUnitItem` ; ligne `attempt` (`exercise_kind` = `unit_<kind>`, `exercise_ref` = `deterministicUuid("unit:" + unitId + ":" + itemId)`, `session_id` null). XP : `focus.first_try` (2) si juste au premier essai et première réussite de cet item par ce compte, `focus.second_try` (1) au deuxième ; rien ensuite ni à la répétition d'une unité déjà réussie. Plafonds : ceux de `capFocus`, le plafond « par séance » étant appliqué **par (unité, leçon)** (clé `unit:<unitId>:<lesson>` dans `focusBySession`) et le plafond journalier de 40 partagé avec la séance.
- `unit_step_completed` : le serveur recalcule `stepValidated` à partir des tentatives connues (état + lot) ; s'il est vrai et pas encore enregistré, il pose `steps["<lesson>:<step>"] = occurredAt`. Sinon refus définitif `step_not_proven`. Aucune XP.
  - À la validation de `l1:key_phrases`, les phrases-clés deviennent des cartes `source = 'unit'`, `kind` = celui des phrases (vérifier le registre `cardKinds`), recto = phrase, verso = traduction dans la langue d'explication du profil (fr ou en, repli en), contexte = réplique du dialogue. Dédoublonnage par `cardFronts`. Elles comptent dans `newCards` du jour comme les mots d'atelier, avec la même règle de plafond que l'atelier.
- `unit_test_submitted` : noté par `gradeUnitTest` ; ligne `unit_test` (§5) ; `testAttempts + 1` ; `bestScore` = max. S'il est réussi et que `passedAt` est nul : `passedAt = occurredAt`, et règle **`unit.complete`** = 25 XP, volet `null`, plafond **2 par jour d'apprentissage** (`COUNT_CAPS`), au-delà 0 avec la raison de plafond existante. Un test réussi ne demande **pas** que les étapes aient été faites (« Je connais déjà »). Les « Je peux… » de l'unité sont alors validés (dérivés de `passedAt`, pas stockés à part, pas d'XP).
- `unit.complete` s'ajoute à `XpRuleId`, `RULE_XP`, `RULE_VOLET` et au barème `RULE_VERSION` (incrémenter la version et documenter dans `c-game-design.md` la ligne existante).
- L'attribution au jour d'apprentissage, la série et l'anneau suivent les règles existantes sans changement : l'XP d'unité compte pour valider la journée comme toute XP vérifiée.

## 5. Base de données (migration `20261124000100_app_units.sql`, base locale uniquement)
```
app.unit_progress (
  user_id uuid references auth.users on delete cascade,
  unit_id text check (unit_id ~ '^[a-z]{2}-(a0|a1)-[0-9]{2}-[a-z0-9-]{2,40}$'),
  language text not null,
  version text not null check (version ~ '^[0-9a-f]{12}$'),
  steps jsonb not null default '{}',
  best_score smallint check (best_score between 0 and 10),
  test_attempts int not null default 0,
  passed_at timestamptz, passed_version text,
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_id)
)
app.unit_test (
  id uuid primary key,                       -- attemptId du client
  user_id uuid not null references auth.users on delete cascade,
  unit_id text not null, version text not null,
  client_event_id uuid not null unique,
  score smallint not null check (score between 0 and 10), passed boolean not null,
  missed text[] not null default '{}',
  created_at timestamptz not null default now()
)
```
- RLS activée sur les deux : `select` pour `auth.uid() = user_id` ; **aucun** `insert`/`update`/`delete` pour `authenticated` ni `anon`. Écriture uniquement par `app.ingest_batch` (security definer existant), étendu : `p_payload` reçoit `unit_progress` (upserts) et `unit_tests` (inserts) ; `ingest-payload.ts` et sa validation stricte sont étendus en conséquence, avec `MAX_ROWS`.
- Suppression de compte : cascade (comme les autres tables `app`).
- pgTAP : RLS (un autre compte ne lit rien, `authenticated` ne peut pas écrire), contrainte de format, upsert par `ingest_batch`, unicité de `client_event_id`.
- `database.app.types.ts` régénéré.

## 6. Données et lecture (`packages/data`)
- `getUnitProgress(client, userId, language)` et `getUnitProgressOne(client, userId, unitId)` via le client de l'utilisateur (RLS).
- `build-state.ts` (apps/web/src/lib/ingest) charge `unitProgress` pour les unités référencées par le lot, et injecte `units` depuis `@dailylingua/content` (seulement les unités référencées).

## 7. Application (`apps/web`)
- Route `/(app)/parcours/[lang]/[unit]` (RSC) : `await connection()`, profil, garde « langue cible du profil et unité publiée (ou drapeau `UNIT_DRAFTS=show` en local) », progression, puis lecteur d'unité client. La leçon courante = première leçon non validée.
- Lecteur d'unité (client) d'après `j4-ecrans.md` : étapes, items, retour immédiat **local** (le client a les corrigés pour le hors-ligne) et envoi des événements par la file existante (`@dailylingua/core/offline`). L'XP affichée en cours d'unité est une estimation marquée comme telle jusqu'au retour du serveur, comme dans la séance.
- Fin d'unité : score local immédiat, puis état confirmé par le serveur au retour de `/api/events` (réussite, XP accordée ou plafonnée).
- Hors ligne : la page de l'unité et ses MP3 sont mis en cache par le service worker (Serwist) à la première ouverture ; le lecteur affiche « audio en préparation » si un MP3 manque (cas de la PR 1).
- « Aujourd'hui » : pour un profil A0/A1 dont la langue cible a au moins une unité publiée, la carte principale propose la prochaine leçon du parcours (Réveil inchangé au-dessus). Sinon, comportement actuel.
- Textes d'interface : clés i18n fr et en (`packages/i18n`), test « aucune chaîne en dur » existant.

## 8. Audio (`scripts/units-audio.mts`)
Script local (jamais en CI) : pour chaque réplique, phrase-clé et item audio dont le MP3 manque, appelle Piper avec la voix du locuteur, convertit en MP3 mono (ffmpeg, déjà utilisé par `assessment:audio`), écrit `apps/web/public/unit-audio/<lang>/<unitId>/<id>.mp3` et met à jour le champ `audio` de la source. Refuse une voix hors de `CLEARED_VOICES`. Copie le MODEL_CARD de chaque voix dans `apps/web/public/unit-audio/voices/`. La génération attend l'installation de Python ≥ 3.9 et de Piper (accord de l'utilisateur).

## 9. Lots
| Lot | Contenu | Agent | Dépend de |
|---|---|---|---|
| A | §1, §2 : schéma, paquet content (registre, version, `units:check`), notation pure, tests | implementer | — |
| B | §3, §4, §5, §6 : événements, ingestion, migration, pgTAP, data | implementer (conception de sécurité ici, revue `relecteur-securite`) | A |
| C | §7 : écrans d'après `j4-ecrans.md`, i18n, Aujourd'hui, hors ligne | implementer | A (types) ; B pour l'intégration |
| D | Contenu de l'unité 1 it et ru, puis deux relectures et arbitrage | rédaction : agent pédagogue ; relecture : `relecteur-natif` ×2 + `arbitre-relecture` | A (format) |
| E | §8 : script audio | implementer | A |

## 10. Limites assumées de la PR 1
- Les corrigés sont dans le paquet client (nécessaire hors ligne) : un tricheur peut obtenir 8/10. Parade : notation serveur, 25 XP une seule fois par unité, 2 unités par jour ; l'écart reste borné à 25 XP par unité.
- Une modification de contenu change la version : les événements hors ligne sur l'ancienne version sont refusés, et l'apprenant refait l'étape en cours (rien d'autre n'est perdu).
- Pas d'audio généré tant que Piper n'est pas installé.
