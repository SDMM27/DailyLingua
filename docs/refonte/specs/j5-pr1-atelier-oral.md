# Jalon 5, PR 1 — Atelier oral : anticipation, répétition, dictée

Complète [j5-oral.md](j5-oral.md) (périmètre et décisions). Fait foi pour les données, la notation et l'XP de l'atelier. Aucun appel à l'API, aucune migration attendue (`app.attempt.step`, `exercise_kind` et `app.xp_ledger.reason` ne sont pas contraints en base ; à revérifier dans `app.ingest_batch` avant de coder : si une liste blanche existe, la PR devient Sensible et s'arrête avant fusion).

## 1. Phrases (`packages/content`)

- `src/oral.ts` : `oralSentences(language)` → `OralSentence[]`, triées par ordre d'unité puis d'apparition, construites depuis les unités **publiées** de `kind: "situation"` (jamais `script` ni `assessment`) :
  - chaque réplique du dialogue et chaque phrase-clé dont `audio` est non nul ;
  - dédoublonnage par `normalizeAnswer(language, text)` : la première occurrence l'emporte (une phrase-clé qui répète une réplique n'apparaît qu'une fois) ;
  - `OralSentence = { id: "<unitId>#<lineId|keyPhraseId>" (≤ 80), unitId, unitVersion, unitOrder, text, translation: L10n, audio, words: number }`.
- `getOralSentence(id)` → la phrase ou `null` (unité absente, non publiée, ou id inconnu). En local, le drapeau `UNIT_DRAFTS=show` inclut les brouillons comme pour les unités.
- Test Vitest : ids uniques, aucune unité `script`/`assessment`, aucun audio nul, dédoublonnage.

## 2. Notation (pur, `packages/core/src/oral/`)

- `compareSpoken(language, model, transcript)` → `{ ratio, tokens: { text, status: "ok" | "missing" | "wrong" | "extra" }[] }`.
  - Normalisation par mot : `normalizeAnswer(language, …)` puis `ignoreInnerPunctuation`, découpe en mots (pour les langues sans espaces du registre, découpe par caractère).
  - Alignement par distance d'édition sur les mots (substitution = `wrong`, suppression = `missing`, insertion = `extra`). Un mot à une lettre près (distance de Levenshtein 1 sur un mot de 5 lettres ou plus) compte `ok` : la reconnaissance orthographie parfois autrement un mot bien dit.
  - `ratio = ok / max(mots du modèle, mots de la transcription)`, arrondi à 2 décimales. **1 seulement si tous les mots sont `ok` et qu'il n'y a ni `extra` ni `missing`** (règle « ne jamais donner un score parfait à une phrase fausse »).
- `gradeDictation(language, model, answer, tolerance)` → `{ accuracy, diff: { text, status: "ok" | "missing" | "wrong" | "extra" }[] }` au caractère.
  - Normalisation : `normalizeAnswer`, `ignoreInnerPunctuation`, espaces réduits ; avec la tolérance `lenient` du profil, `diacriticFolds(language)` appliqué aux deux côtés (sans toucher й/ё : vérifier que le pliage du russe n'efface pas la brève ; sinon l'exclure pour le cyrillique).
  - `accuracy = max(0, 1 − levenshtein / longueur du modèle normalisé)`.
- Seuils exportés : `SHADOWING_MIN_RATIO = 0.6`, `DICTATION_MIN_ACCURACY = 0.8`, `DICTATION_HIGH_ACCURACY = 0.95`, `MIN_SPEAKING_MS_PER_WORD = 250`, `MIN_DICTATION_MS = 1000`.
- Tests : phrase identique (1), un mot changé (accord) < 1, mot manquant, mot en trop, ordre inversé, cyrillique avec accent tonique et ё, apostrophe italienne (« l'acqua »), transcription vide (0), dictée à 79/80/94/95 %.

## 3. Événement client (`client-events.ts`)

```
oral_attempt {
  …deviceFields,
  sentenceId: string (1–80),
  unitVersion: hex 12,
  activity: "anticipation" | "shadowing" | "dictation",
  answer: string ≤ 200,              (transcription pour shadowing, texte tapé pour dictation, "" pour anticipation)
  recognizer: "device" | "none",     (shadowing : "none" = pas de reconnaissance, auto-évaluation)
  selfRating: "got_it" | "almost" | "not_yet" | null,   (obligatoire pour anticipation et pour shadowing "none", sinon null)
  shownAt, startedAt, endedAt        (startedAt/endedAt : début et fin de la prise de parole ou de la saisie)
}
```
Raffinements : `shownAt ≤ startedAt < endedAt ≤ occurredAt` ; `selfRating` présent exactement dans les cas ci-dessus ; `answer` vide pour `anticipation`. Strict comme les autres : aucun champ `score`, `xp`, `correct`, `ratio`.

## 4. Ingestion (`plan-ingest.ts`)

- L'état reçoit `oralSentences: Record<sentenceId, OralSentence>` (injecté par l'appelant depuis `@dailylingua/content`, seulement les phrases du lot ; core n'importe pas content) et, par jour touché, les phrases déjà payées par activité (dérivées des lignes `attempt` d'étape `oral` et du journal d'XP).
- **Refus définitifs** : `unknown_sentence` (absente de `oralSentences`), `unit_version_mismatch` (réutilisé), `wrong_language` si la langue de la phrase n'est pas une langue cible inscrite du profil (`enrollment`).
- Ligne `attempt` : `step = "oral"` (ajouté à `attemptStepSchema`), `exercise_kind = "oral_<activity>"`, `exercise_ref = deterministicUuid("oral:" + sentenceId)`, `session_id` null, `answer = { text, recognizer, selfRating }`, `result = { ratio | accuracy, declared: boolean, xpReason }`. Les `tokens`/`diff` ne sont pas stockés (recalculables).
- **anticipation** : aucune XP, `declared = true`.
- **shadowing** : `recognizer = "none"` → aucune XP, `declared = true`. Sinon `compareSpoken` ; si `ratio ≥ 0,6` → règle `shadowing.sentence` (1 XP), sauf : durée `endedAt − startedAt` < 250 ms × mots du modèle → 0 `too_fast` ; phrase déjà payée aujourd'hui en shadowing → 0 `already_counted_today` ; plafond **30 XP/jour** (`DAILY_CAPS.shadowing`) → 0 `cap_reached`.
- **dictation** : `gradeDictation` ; ≥ 0,95 → 2 XP, ≥ 0,8 → 1 XP (règle `dictation.sentence`), sinon 0 sans raison ; `endedAt − shownAt` < 1 000 ms → 0 `too_fast` ; une fois par phrase et par jour ; plafond **30 XP/jour** (`DAILY_CAPS.dictation`).
- Règles ajoutées à `xpRuleIds`, `RULE_XP`, `RULE_VOLET` (`shadowing.sentence` → `fluency`, `dictation.sentence` → `input`) ; `RULE_VERSION` passe à `j5.1` ; lignes du tableau de `c-game-design.md` §2.1 annotées avec l'identifiant de règle. L'XP compte pour la journée, la série et l'anneau comme toute XP vérifiée.
- `ingest-payload.ts` et sa validation stricte acceptent `step: "oral"` ; `build-state.ts` charge les tentatives `oral` des jours touchés et injecte les phrases référencées.

## 5. Choix des phrases (`apps/web`, serveur)

`buildOralPacket(userId, language, now)` dans `apps/web/src/lib/oral/` (lecture par `packages/data`, client de l'utilisateur) :
1. Unités éligibles : celles qui ont une ligne `unit_progress` pour ce compte, plus l'unité en cours (même calcul que la carte du parcours). Si aucune et niveau de l'inscription ≥ A2 : toutes les unités publiées de la langue. Si aucune et niveau < A2 : la première unité de situation.
2. Phrases de ces unités (`oralSentences`), classées par dernière tentative orale la plus ancienne (jamais faite en premier), puis par ordre d'unité ; une phrase d'au plus 12 mots.
3. **6 phrases** pour anticipation puis répétition, **3 autres** pour la dictée. Moins de 9 phrases : on réutilise les premières pour la dictée.
4. Paquet servi à la page : `{ language, sentences: [{ id, unitVersion, text, translation (langue d'explication), audio, words }], dictation: [...] }`. Le texte est envoyé (nécessaire hors ligne et pour afficher la comparaison) ; le serveur recorrige.

`getRecentOralAttempts(client, userId, language, sinceDays = 30)` dans `packages/data`.

## 6. Interface `speech` (client, `apps/web/src/lib/speech/`)

- `createRecognizer(language)` → `null` si `SpeechRecognition`/`webkitSpeechRecognition` est absent ; sinon un objet `{ start(), stop(), onPartial, onFinal, onError }` avec `lang` = étiquette BCP 47 du registre des langues (ajouter le champ au registre si absent : `it-IT`, `ru-RU`…), `interimResults = true`, `continuous = false` pour une phrase.
- Hook React `useRecognition(language)` : états `idle | listening | done | error | unavailable`, erreurs `not-allowed` (micro refusé : message et repli en auto-évaluation), `no-speech` (« On n'a rien entendu, réessaie »), autres → repli.
- Aucun audio enregistré ni envoyé par l'app ; la confiance n'est jamais lue.
- Première utilisation : feuille courte « Ton téléphone transforme ta voix en texte avec son propre service vocal (Apple ou Google) ; DailyLingua ne reçoit que le texte. » avec « Compris » ; mémorisée en local (`localStorage`).
- Tests : le hook avec une fausse `SpeechRecognition` (succès, refus, absence).

## 7. Écrans (`apps/web`)

D'après la maquette retenue (voir la PR). Textes en clés i18n fr et en.
- Route `/(app)/oral` (RSC) : `await connection()`, profil, langue cible courante ; 404 si la langue n'a aucune phrase. Lecteur client `OralWorkshop`.
- Déroulé : pour chacune des 6 phrases, **anticipation** (sens en L1, « Dis-la », puis « Écouter » révèle audio et texte, auto-évaluation en trois boutons) puis **répéter** (bouton micro ; ce que le téléphone a compris ; comparaison mot à mot, mots manquants ou différents signalés calmement ; « ≈ +1 XP » estimé si ≥ 60 %, 2 essais au plus par phrase). Puis 3 **dictées** (lecture, réécoute, vitesse 0,75×, champ ≥ 16 px, différence au caractère). Écran de fin : phrases répétées, précision moyenne de la dictée, XP confirmée par le serveur au retour de `/api/events` (même mécanisme que la fin d'unité).
- Sans reconnaissance : la répétition devient « Réécoute-toi » (l'apprenant répète, puis s'auto-évalue), marquée « déclaré », sans XP.
- Les événements passent par la file hors ligne existante. Lecture de l'audio par le composant audio des unités (MP3 mis en cache par le service worker).
- Carte « Atelier oral » sur « Aujourd'hui », sous la séance, si la langue a des phrases : « 5 minutes pour parler : 6 phrases à dire, 3 à écrire ». Un seul bouton.

## 8. Tests

- Vitest : §2, schéma de l'événement, ingestion (chaque branche du §4, plafonds, une fois par jour, refus), choix des phrases, hook.
- Intégration (base locale) : un lot `oral_attempt` écrit `attempt` et `xp_ledger` attendus.
- e2e WebKit 390 px : l'atelier avec une `SpeechRecognition` simulée (injectée par `addInitScript`), clair et sombre, sans défilement horizontal, axe.

## 9. Lots

| Lot | Contenu | Agent | Fichiers |
|---|---|---|---|
| A | §1 à §5, tests | implementer | `packages/content/src/oral*.ts`, `packages/core/src/oral/**`, `packages/core/src/game/{rules,caps}.ts`, `packages/core/src/ingest/**`, `packages/schemas/src/events/**`, `packages/data/src/oral*.ts`, `apps/web/src/lib/ingest/build-state.ts`, `apps/web/src/lib/oral/**`, `docs/refonte/c-game-design.md` |
| B | §6, §7, i18n, e2e | implementer | `apps/web/src/lib/speech/**`, `apps/web/src/app/(app)/oral/**`, `apps/web/src/components/oral/**`, `apps/web/src/components/today/*`, `packages/i18n/**`, `packages/core/src/languages.ts` (étiquette BCP 47) |

B dépend des types de A (`OralSentence`, événement). B commence après A.

## 10. Limites assumées

- Transcription fournie par le client (décision 4 de `j5-oral.md`).
- Contenu A0-A1 seulement (décision 3).
- La reconnaissance peut lisser une faute : le score de répétition peut être indulgent ; il est affiché comme « ce que ton téléphone a compris ».
