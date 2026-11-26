# Jalon 5, PR 2 — Dire au lieu d'écrire

Complète [j5-oral.md](j5-oral.md) (décisions 1, 2, 5, 8) et s'appuie sur l'interface `speech` de la [PR 1](j5-pr1-atelier-oral.md) §6. **Niveau Sensible** (changement de prompt sur un chemin de coût IA) : arrêt avant fusion, accord du propriétaire.

## 1. Comportement

- L'étape Expression de la séance a un sélecteur **Écrire / Dire** (deux segments, ≥ 44 px). « Dire » est masqué si `createRecognizer(langue)` renvoie `null`.
- **Choix par défaut** : « Dire » si la reconnaissance existe et qu'aucune production `spoken` n'a été envoyée depuis 7 jours d'apprentissage (information servie dans le paquet de séance : `expression.suggestSpoken: boolean`) ; sinon « Écrire ». Le choix de l'apprenant pendant la séance est conservé jusqu'à la fin de la séance.
- Mode « Dire » : la consigne, un gros bouton micro ; reconnaissance continue (`continuous = true`), transcription partielle affichée en direct sous « Ce que ton téléphone a compris » ; chrono avec repère à 1 minute, arrêt automatique à 2 minutes ; l'apprenant peut arrêter, reprendre (le texte s'ajoute) ou tout effacer ; **pas de saisie au clavier dans ce mode** (passer en « Écrire » pour retoucher : le texte transcrit est alors repris dans le champ, et la production devient `writing`).
- Avant l'envoi, une ligne rappelle : « La reconnaissance peut corriger certaines fautes sans le dire ; ce qu'elle n'a pas entendu ne peut pas être corrigé. » Puis « Envoyer pour correction » ; la ligne de quota existante (corrections restantes) reste affichée.
- Écran de correction : inchangé, avec l'intitulé « Ce que ton téléphone a compris » au-dessus du texte et l'étiquette « Entraînement à l'oral ».
- **Réécriture** : chaque champ de réécriture reçoit un bouton micro facultatif qui remplit le champ par la reconnaissance (l'apprenant peut retoucher). L'événement `rewrite_submitted` est inchangé.

## 2. Données et serveur

- `production_submitted` reçoit un champ facultatif `mode: "writing" | "spoken"` (absent = `writing`, compatibilité des files hors ligne) et, pour `spoken`, `speakingMs: int 0..180 000`. Toujours strict : aucun score.
- `planIngest` écrit `app.production.mode = 'spoken'` (valeur déjà admise par la contrainte de la table) ; les preuves de `production.corrected` sont inchangées (longueur selon le niveau, langue détectée, similarité). `speakingMs` < 15 s → la production est corrigée mais `too_short` pour l'XP (une minute est demandée, 15 s est le plancher anti-envoi vide). Pas de nouvelle règle d'XP.
- `packages/data/src/writing-feedback.ts` accepte `mode in ('writing','spoken')` là où il filtre `writing`.
- Correction (`packages/ai/src/prompts/writing-feedback.ts`) : `WritingFeedbackPromptInput` reçoit `inputMode: "typed" | "speech_transcript"` ; le prompt système gagne un paragraphe constant : « When inputMode is speech_transcript, the text is an automatic transcript of the learner's speech. Ignore punctuation and capitalisation (do not score or correct them). Do not list a spelling correction when the two forms sound the same. Judge grammar, vocabulary, register and coherence as usual; never assume a form the transcript does not show. » `WRITING_FEEDBACK_PROMPT_VERSION` est incrémentée. Même `purpose` (`writing_feedback`), même quota, même cache.
- Paquet de séance : `expression.suggestSpoken` calculé par le serveur (dernière production `spoken` du compte).
- **Une migration minimale** (`20261126000200_app_writing_feedback_spoken.sql`) : `app.claim_writing_feedback_job` ne réclamait que les productions `mode = 'writing'`, une production orale restait donc sans correction (`not_found`) ; la fonction est recréée à l'identique avec `mode in ('writing', 'spoken')`. Aucune table ni colonne ne change ; `speakingMs` vit dans `production.task`.

## 3. Confidentialité

- Page de confidentialité (`apps/web`, la page existante ; à défaut, la section « Données » des Réglages) : paragraphe sur la reconnaissance vocale de l'appareil, en fr et en.

## 4. Vérifications

- Vitest : schéma de l'événement (avec et sans `mode`), ingestion `spoken` (mode écrit, `too_short` sous 15 s), filtre de `writing-feedback`, construction du message avec `inputMode`, `suggestSpoken`.
- e2e WebKit 390 px avec `SpeechRecognition` simulée : passer en « Dire », dicter, envoyer, correction affichée (IA simulée comme dans les e2e existants), réécriture au micro ; repli sans reconnaissance (sélecteur absent).
- **Évaluation du prompt** (`feedback:eval`, payante, manuelle) : à lancer par le propriétaire avant fusion, avec 4 transcriptions orales ajoutées au jeu d'évaluation (2 italiennes, 2 russes, dont des fautes d'accord et d'auxiliaire). Critère : aucune faute réelle perdue par rapport au même texte tapé, aucune correction de ponctuation.
  - Limite constatée à l'implémentation : `feedback:eval` (`scripts/writing-feedback-eval.mts`) appelle l'ancien correcteur (`src/lib/generation/`), dont `mode: "spoken"` désigne un script à dire à voix haute, non une transcription ; il n'utilise pas `inputMode` ni le nouveau prompt de `packages/ai`. Les 4 cas ajoutés (`inputMode: "speech_transcript"`, `mustCorrect`, contrôle `transcriptProblems`) doivent être adaptés pour passer par le nouveau prompt avant l'exécution payante.

## 5. Lots

| Lot | Contenu | Agent |
|---|---|---|
| C | §1 à §3, tests | implementer (un seul lot ; fichiers : `packages/schemas/src/events/*`, `packages/core/src/ingest/*`, `packages/data/src/writing-feedback.ts`, `packages/ai/src/prompts/writing-feedback.ts` et son jeu d'éval, `apps/web/src/components/today/*`, `apps/web/src/lib/session-packet/*`, `apps/web/src/lib/expression/*`, i18n) |
