# Arbitrage unité — russe

Fichier : `packages/content/src/units/ru/01-saluer.ts` (unité `ru-a1-01-saluer`) · Date : 2026-11-23 · Grille : schéma `unitSchema` (`packages/schemas/src/unit.ts`) + `j4-pr1-architecture.md` §1.2-1.3 · Passes : `docs/reviews/units/ru/ru-a1-01-saluer-A.md`, `docs/reviews/units/ru/ru-a1-01-saluer-B.md` · Relecteurs : claude-opus-5-5

## Synthèse
29 éléments · 27 approuvés · 2 restent brouillons (i11, i12 : audio non généré) · 12 corrections appliquées · 0 remarque écartée
Accord entre passes : 6 remarques vues par les deux, 3 par A seule, 3 par B seule, 0 correction de contenu ajoutée par l'arbitre (1 commentaire de code ajouté : la convention de translittération)

**Statut de l'unité : `aiReview` reste `null` (brouillon).** Le texte est approuvé, mais poser `aiReview` publie l'unité (`isPublished`), et `units:check` refuse alors une unité publiée sans ses fichiers audio. C'est ce qui arrive en ce moment à l'unité italienne. Les fichiers `i11.mp3` et `i12.mp3` n'existent pas encore, et un item d'écoute ne se signe pas sans avoir été écouté. Une fois l'audio généré avec Piper et écouté (voix de i11 masculine ou non, « в » muet de здра́вствуйте dans i12), on peut poser sans nouvelle passe :
`aiReview: { reviewedOn: "<date>", passes: 2, arbiter: "arbitre-relecture" },`

## Convention retenue : translittération de « э » accentué
Translittération lettre à lettre de `src/lib/alphabets/ru.ts`, accent tonique marqué par un aigu sur la voyelle, **sauf sur è (= э), écrit sans aigu** : « èto », « Èto », et plus tard « ètot », « poèt ». On n'empile jamais deux diacritiques. L'accent reste visible dans le texte cyrillique (э́то). En début de mot, э est presque toujours accentué, donc l'information perdue est minime. La convention est écrite dans le commentaire d'en-tête du fichier ; à appliquer à toutes les unités russes et au générateur de translittération.

## Typographie française (tout le fichier)
- Retenue (A, B) textes `fr` : apostrophe droite → apostrophe typographique ’ ; espace ordinaire avant `: ; ? !` → espace fine insécable U+202F (même choix que pour l'italien). Les textes russes et anglais ne sont pas touchés. Les guillemets « » gardent leurs espaces actuelles : la règle du projet (`AUTHORING.md`) ne vise que `: ; ? !`.

## En-tête (title, situation, canDo)
Décision : approuvé
- (typographie seulement, voir plus haut)

## dialogue (d1 à d9)
Décision : approuvé
- Retenue (A, B) `lines[5].transliteration` (d6) : « Zdórovo! A kto è́to? » → « Zdórovo! A kto èto? » — aigu empilé sur è, illisible ; convention ci-dessus.
- Retenue (A, B) `lines[6].transliteration` (d7) : « È́to Ánna. Oná tóže iz Moskvý. » → « Èto Ánna. Oná tóže iz Moskvý. » — même raison.
- Doutes non retenus : « Здо́рово ! » un peu plat à Moscou (A) et départ rapide de Léo en d8 (A) ne sont pas des fautes de langue. Les commentaires REVIEW sur les voix et sur d8 sont conservés pour la génération audio.

## dialogue.glosses
Décision : approuvé
- Retenue (A, B) gloss `э́то`.meaning : « c'est, ce » / « this is, it » → « c’est, voici » / « this is, that's » — « ce » renvoie au démonstratif э́тот / э́та, qui varie, ce qui contredit la note « Ne change jamais ».
- Retenue (B) gloss `а`.meaning : « et, et puis » / « and » → « et (pour enchaîner ou opposer) » / « and (to move on or contrast) » — а n'exprime pas la succession, il sert à relancer ou à opposer.

## keyPhrases
Décision : approuvé

## grammar.summary
Décision : approuvé
- Retenue (B) ligne 1 fr/en : « le russe n'a pas de verbe « être » » → « le russe ne dit pas le verbe « être » » ; « Russian has no verb "to be" » → « Russian leaves out the verb "to be" » — быть existe (был, бу́ду) ; seul le présent est omis.
- Retenue (A ; B en doute) ligne 4 fr/en : ajout de « Un prénom d’homme reste masculin : Ле́о → он. » / « A man's name stays masculine: Ле́о → он. » — Ле́о, en -о, contredit sinon la règle « consonne → masculin » dès le dialogue.

## i01
Décision : approuvé

## i02
Décision : approuvé
- Retenue (A, B) prompt et options : « Anna est de… » + « Пари́жа. » / « Москвы́. » → « D’où vient Anna ? » / « Where is Anna from? » + « Из Пари́жа. » / « Из Москвы́. » (answer inchangé : b) — un génitif isolé n'est pas une réponse russe possible et sépare la forme du bloc « из Москвы́ » enseigné ; même format que i01.

## i03 à i06
Décision : approuvé

## i07
Décision : approuvé
- Retenue (B) explain : « Меня́ va seulement avec зову́т. » → « Pour dire ton prénom, меня́ va avec зову́т. » (en : « To give your name, меня́ goes with зову́т. ») — « seulement » est faux dès у меня́, меня́ нет.

## i08
Décision : approuvé
- Retenue (A, B) accept : `["Тебя как зовут?"]` → `["Тебя как зовут?", "Как зовут тебя?"]` — ordre courant à l'oral, qu'un natif ne corrige pas. Avec trois jetons, le refuser pénaliserait une bonne réponse, y compris au test. Commentaire REVIEW remplacé.

## i09
Décision : approuvé
- Retenue (A, B) accept : `[]` → `["Зовут меня Лео."]` — tournure correcte et très usitée pour se présenter (« Зову́т меня́ Ива́н »). Commentaire REVIEW remplacé. Tous les mots figurent déjà dans le dialogue, donc aucune glose n'est à ajouter.

## i10
Décision : approuvé

## i11
Décision : reste brouillon (audio `i11.mp3` non généré ; texte approuvé, à signer après écoute)
- Retenue (A) explain : « Ты… est une question. » → « Ты из Москвы́ ? = Tu es de Moscou ? En russe, c’est l’intonation seule qui fait la question. » (en : « Ты из Москвы́? = Are you from Moscow? In Russian, the intonation alone makes it a question. ») — l'ancienne explication laissait croire que ты marque la question.
- Retenue (A) prompt : « Écoute. Qu'est-ce qu'il dit ? » / « What does he say? » → « Écoute. Qu’est-ce que tu entends ? » / « What do you hear? » — le genre de la voix n'est pas établi ; formule neutre, comme i12.

## i12
Décision : reste brouillon (audio `i12.mp3` non généré ; texte approuvé, à signer après écoute)

## i13 à i22
Décision : approuvé
- Doute non retenu (A) i13 : ne pas accepter « Здоро́во » (salut familier, non enseigné, homographe de здо́рово).

## lessons et test
Décision : approuvé — les 10 items du test sont vus dans une étape ; i08 accepte désormais les deux ordres naturels.

## conversation
Décision : approuvé

## Vérifications
- `npx tsc --noEmit -p packages/content` : échoue, mais uniquement dans `packages/core/src/game/rules.ts` (clé `unit.complete` absente). Cela vient du travail en cours d'un autre agent sur `packages/schemas/src/events/`, pas de ce fichier ; aucune erreur dans `units/ru/01-saluer.ts`.
- `npm run units:check` : `✓ ru-a1-01-saluer … draft, not published (2 audio file(s) to generate before publishing)`. Le script sort globalement en échec à cause de `it-a1-01-saluer`, publiée sans audio (hors de ce périmètre).
- `npx vitest run` (packages/content) : 2 fichiers, 32 tests, tous verts.
