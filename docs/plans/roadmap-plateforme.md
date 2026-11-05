# Plan — de Daily Lingua à une plateforme qui rend bilingue

Statut : **proposition validée dans ses grandes lignes** (décisions du §5, 2026-11-05), rédigée le 2026-11-05 après une revue complète du code (branche `dev`, commit `a1ba264`) et de l'app. Rien n'est implémenté. Ce plan complète [product-features.md](product-features.md), [learning-paths.md](learning-paths.md) et [skills-assessment-and-choices.md](skills-assessment-and-choices.md) sans les remplacer. Les lettres A à O sont déjà prises : les phases ci-dessous vont de **P à Z**.

---

## 0. Mode d'emploi de ce document (à lire dans chaque nouvelle conversation)

Ce plan est fait pour être découpé : chaque phase peut être confiée à une conversation séparée. Dans ce cas :

1. Donner ce fichier et nommer la phase (« fais la phase Q1 de `docs/plans/roadmap-plateforme.md` »).
2. Rappeler les règles du dépôt, qui s'appliquent à toutes les phases :
   - `AGENTS.md` : Next.js 16 a des API différentes ; lire `node_modules/next/dist/docs/` avant d'écrire du code.
   - `CLAUDE.md` : mobile d'abord (largeur iPhone, safe areas, champs ≥ 16 px) ; aucune langue en dur (registre `src/lib/domain/languages.ts`) ; `src/lib/domain` et `src/lib/schemas` sans Next.js ni React ; données lues via `getRepository()` ; `await connection()` pour les pages qui dépendent du jour ; `npm run check` et `npm run build` avant de finir.
   - Une phase à la fois, validée par l'utilisateur avant la suivante. Fin de phase : fichiers modifiés, commandes lancées, tests réellement exécutés et résultats, commande pour lancer, problèmes ouverts, étape suivante. En français.
   - Licences : RSS = métadonnées + accroche courte, jamais le texte intégral d'une source « tous droits réservés » ; licence vérifiée et notée par source ; `CONTENT_LICENSE_POLICY=commercial` avant toute vente.
   - Contenu pédagogique rédigé par un modèle = **brouillon** tant que les agents relecteurs ne l'ont pas approuvé (statut `ai-reviewed`, phase X0) ; `reviewedOn` / `checkedOn` restent réservés à une relecture humaine.
   - Budget : 10 € par mois au plus pour l'API (§6). Haiku 5.5 à l'exécution ; tout nouvel appel enregistre ses tokens.
3. Chaque phase ci-dessous donne : objectif, justification pédagogique, périmètre, conception proposée, critères d'acceptation, dépendances, points à trancher. Les points « à trancher » se posent à l'utilisateur **avant** de coder.

---

## 1. Objectif et principes pédagogiques

**But produit** : apprendre n'importe quelle langue cible depuis n'importe quelle langue maternelle, de A0 jusqu'à un usage bilingue (C1+), avec une app ludique, concrète, et dont l'efficacité se mesure.

**Ce que dit la recherche, et ce que l'app doit en tirer** :

| Principe | Source principale | Conséquence pour l'app |
|---|---|---|
| **Les quatre volets** : ~25 % du temps chacun pour l'input centré sur le sens, l'output centré sur le sens, l'étude de la langue, le développement de la fluidité | Nation, *Learning Vocabulary in Another Language* ; Nation & Newton | La mission quotidienne doit couvrir les quatre, et l'app doit **mesurer** cette répartition. |
| **Input compréhensible massif** : on acquiert en comprenant beaucoup de messages un peu au-dessus de son niveau | Krashen ; Hu & Nation (2000) : ~98 % des mots connus pour lire sans aide | Il faut des **textes et audios entiers**, calibrés sur le vocabulaire connu, et pas seulement des accroches de 280 caractères. |
| **Rappel actif + espacement** | Roediger & Karpicke (effet test) ; Cepeda et al. (espacement) | Le moteur existe (Leitner). À moderniser (FSRS) et à nourrir avec des mots **en contexte**. |
| **Output poussé + rétroaction** | Swain (output) ; Long (interaction) ; Lyster & Ranta (rétroactions correctives) | Production écrite **et orale** à chaque séance, corrigée, puis réemployée (le « réécris » compte autant que la correction). |
| **Fluidité** : refaire vite ce qu'on sait déjà | Nation : 4/3/2, lecture rapide de textes faciles | Exercices chronométrés sur du matériau **facile**, pas du nouveau. |
| **Volume horaire** | FSI : ~600 à ~2 200 h selon la distance entre langues pour une maîtrise professionnelle | 20 min/jour ne suffisent pas pour devenir bilingue : l'app doit **orchestrer aussi le temps passé hors de l'app** (séries, podcasts, lectures, conversations) et le compter. |
| **Motivation durable** | Deci & Ryan (autodétermination : autonomie, compétence, lien social) | Gamifier la **régularité et les vraies réussites** (pas les clics faciles) ; montrer le progrès réel ; laisser choisir. |

Repères de vocabulaire (ordre de grandeur, familles de mots, d'après Milton & Alexiou) : A1 ≈ 500-800 · A2 ≈ 1 000-1 500 · B1 ≈ 2 000-2 750 · B2 ≈ 3 250-4 000 · C1 ≈ 4 000-5 000+ · C2 ≈ 5 000-8 000+. Utile pour afficher une progression concrète (« 1 840 mots connus : cap B1 »).

---

## 2. Diagnostic de l'existant

### 2.1 Forces (à garder)

- **Architecture saine** : domaine pur et testé, registre de langues, dépôt derrière une interface, RLS, CI complète (unitaires, intégration, pgTAP, Playwright iPhone). Une base solide pour grandir.
- **Rigueur sur les licences et la qualité** : catalogue de sources documenté, brouillons cachés en production tant qu'un natif n'a pas relu, évaluations des prompts (`feedback:eval`, `assessment:eval`).
- **Correction écrite de bonne qualité** : 4 critères, corrections minimales catégorisées, version native au niveau cible, « écrire puis dire » (phase G).
- **Boucle erreurs → fiches** : les catégories d'erreurs récurrentes suggèrent des points de grammaire et créent des cartes de correction (phases D, H2).
- **Répétition espacée** avec plusieurs modes de rappel (flip, traduction, production, écoute, texte à trous) et une **mesure de rétention** à 7 jours (phase J) : rare dans les apps grand public.
- **Alphabets** (cyrillique, grec, hangeul, kana, arabe), **bilan par compétence** (pilote ru/it), répartition du temps par langue et par jour.

### 2.2 Faiblesses, par ordre d'impact sur l'apprentissage

| # | Constat | Où | Impact |
|---|---|---|---|
| 1 | **Pas de vrai input dans l'app.** La mission repose sur le titre et l'accroche RSS (≤ 280 caractères) ; `transcript_available` vaut toujours `false` ; les questions ne portent que sur l'accroche ; l'apprenant doit sortir de l'app pour lire ou écouter l'original, sans aide. | `src/lib/content/supabase-store.ts:81`, `src/lib/generation/prompt.ts:34`, `src/components/mission/content-card.tsx:43-50` | **Critique.** Le volet « input » est presque vide ; un A2 face à un article C1 de Meduza ne comprend rien et ne revient pas. |
| 2 | **Tout suppose une langue maternelle française.** UI en dur en français, `<html lang="fr">`, prompts « for French speakers », champs `*_fr`, traductions vers le français, `nameFr`, aucune colonne `native_language`. Le français n'est même pas une langue cible. | `src/app/layout.tsx:50`, `src/lib/generation/prompt.ts:32,38`, `src/lib/generation/writing-feedback-prompt.ts:20,28`, `src/lib/generation/vocabulary-translation.ts:21`, `src/lib/domain/languages.ts` | **Bloquant** pour l'objectif « quelle que soit la langue natale ». |
| 3 | **Aucun oral réel.** Pas de micro (`microphone=()` dans les en-têtes), pas d'enregistrement, pas de reconnaissance vocale, pas de conversation. Le mode « dire » est un exercice autonome non vérifié. | `src/lib/security/headers.ts:20`, `src/components/mission/speak-aloud.tsx:7` | **Critique** pour devenir bilingue : la compétence la plus demandée n'est ni entraînée ni mesurée. |
| 4 | **Aucune compréhension orale exercée.** Les podcasts et vidéos sont lus, mais aucune question ne porte sur l'audio ; la synthèse vocale dépend des voix de l'appareil (absentes pour beaucoup de langues). | `src/components/mission/content-card.tsx:53-63`, `src/components/ui/listen-button.tsx` | Élevé. |
| 5 | **Pas de parcours pour les vrais débutants.** Après l'alphabet, un A0-A1 reçoit des contenus authentiques et 18 points de grammaire ; pas d'unités guidées (dialogues, phrases-clés, situations). | `src/lib/domain/learning-path.ts` | Élevé : c'est là que la majorité des utilisateurs grand public abandonnent. |
| 6 | **La grammaire est invisible en production** : les 342 points (19 × 18) sont des brouillons `reviewedOn: null`, donc masqués par `GRAMMAR_DRAFTS` en production. Elle s'arrête à B1. | `src/lib/grammar/courses/*.ts`, `src/lib/grammar/policy.ts` | Élevé, et rapide à débloquer si on organise la relecture. |
| 7 | **Le niveau ne bouge jamais tout seul.** Les scores (quiz, corrections, révisions) n'alimentent rien ; un seul `level` par langue (+ `productionLevel`) au lieu d'un niveau par compétence ; le bilan n'existe qu'en ru/it. Le test de niveau surestime les hauts niveaux (refonte déjà prévue). | `src/lib/domain/assessment.ts:253`, `src/lib/schemas/preferences.ts:33-41` | Moyen à élevé : sans niveau juste, pas de difficulté juste. |
| 8 | **La mission se « coche ».** La progression = minutes des étapes cochées à la main, pas le travail fait ; les mots de la mission n'entrent dans le paquet que sur clic « + ». | `src/components/mission/mission-view.tsx:232-265` | Moyen : peu engageant, et la mesure du temps est fausse. |
| 9 | **Gamification quasi absente.** Seule une série de jours (désactivable) ; pas de points, objectifs, quêtes, badges, notifications, service worker, sons, animations. Le texte des préférences dit même « pas de points, pas de classement ». | `src/lib/domain/stats.ts:16-40`, `src/components/preferences/preferences-form.tsx:470-485` | Élevé pour la rétention des utilisateurs (et donc pour l'apprentissage, qui exige la régularité). |
| 10 | **Répétition espacée simple** : Leitner à jours entiers, pas d'étapes intra-journée, pas de détection des « sangsues », statut « connu » manuel, trois files séparées (vocabulaire, grammaire, corrections). | `src/lib/domain/spaced-repetition.ts` | Moyen. |
| 11 | **Pas de mesure d'efficacité globale** : on ne sait pas si les utilisateurs progressent (seulement la rétention des mots). | — | Moyen, mais indispensable pour « qu'elle fonctionne réellement ». |
| 12 | Détails : manifeste « russe et italien » (`src/app/manifest.ts`), 11 consignes de dossiers en « vous », générateur de secours sans questions ni expressions. | — | Faible. |

### 2.3 Les quatre volets aujourd'hui

| Volet | Couverture actuelle | Note |
|---|---|---|
| Input centré sur le sens | Accroche + lien externe ; vidéo/podcast sans exercice | 1/5 |
| Output centré sur le sens | Production écrite corrigée (très bien) ; oral non vérifié | 3/5 |
| Étude de la langue | Expressions, grammaire (brouillons), alphabets, cartes | 3/5 |
| Fluidité | Rien | 0/5 |

---

## 3. Feuille de route

Ordre retenu (décision du 2026-11-05, voir §5) : **gains rapides → X0 (agents relecteurs) → P → Q → U → T → V → S → R → W → X (en continu) → Y → Z**.

- **X0 d'abord** : peu coûteux, et il rend visibles en production 342 points de grammaire déjà écrits. Il sert ensuite à toutes les phases qui produisent du contenu (P4, Q, R).
- **P ensuite** : toute nouvelle fonction doit naître multilingue ; la reprendre après coûterait plus cher.
- **Q** est le plus gros gain pédagogique ; U, T et V s'appuient dessus.
- **S** après V : l'oral demande des services vocaux (voir §6), à ouvrir quand le budget le permet.

```
Jalon 1 « Fondations »     : gains rapides, X0 (agents relecteurs), P (langue de l'apprenant)
Jalon 2 « Vraie lecture »  : Q (lecteur + textes gradués), U (séance guidée), T (mémorisation v2)
Jalon 3 « Jouer, parler »  : V (gamification sobre), S (oral)
Jalon 4 « Tout niveau »    : R (parcours débutant), W (progrès et niveau continu)
Jalon 5 « Plateforme »     : Y (communauté), Z (apps, économie, mesure d'efficacité)
```

---

### Gains rapides (≤ 1 jour chacun, sans décision lourde)

1. Manifeste : description générique (« Apprends les langues… »), plus « russe et italien ».
2. Mission : cocher l'étape automatiquement quand l'exercice est fait (quiz répondu, production envoyée, expressions vues).
3. Proposer « Ajouter toutes les expressions à mes révisions » en un clic à la fin de la mission.
4. Dossiers du bilan : passer les 11 consignes en « tu ».
5. Générateur de secours : ajouter au moins 3 expressions tirées de la liste de fréquence quand Claude échoue.
6. Préférences : retirer « pas de points, pas de classement » (sera faux après V).

**Critère** : `npm run check` et `npm run build` verts, captures iPhone des écrans touchés.

---

### Phase P — Langue de l'apprenant et interface multilingue

**Objectif** : n'importe quelle langue source vers n'importe quelle langue cible.

**Pourquoi** : les explications, traductions et notes contrastives doivent être dans la langue que l'apprenant maîtrise ; les erreurs typiques dépendent du couple de langues (un hispanophone n'a pas les calques d'un francophone).

**P1 — Modèle de données (sans changer l'UI)**
- `profiles.native_language` (langue des explications) et `profiles.ui_language` (souvent la même). Défaut `fr` pour les comptes existants.
- Ajouter le **français comme langue cible** au registre (et ses sources : Global Voices fr, Wikipédia, RFI exclue pour ses conditions, chercher d'autres sources ouvertes) ; interdire cible = langue maternelle.
- Registre : remplacer `nameFr` par des noms calculés avec `Intl.DisplayNames(uiLanguage)` (+ `nativeName` déjà présent).
- Schémas : renommer les champs `*_fr` en champs neutres (`explanation`, `translation`, `note`, `hints`…) avec la langue indiquée à côté (`explanationLang`). Migration des données existantes (valeur = `fr`). Compatibilité de lecture le temps de la migration.

**P2 — Prompts paramétrés**
- `prompt.ts`, `writing-feedback-prompt.ts`, `vocabulary-translation.ts`, `assessment-grading-prompt.ts`, `content-topics.ts` : la langue des explications et le couple L1→L2 deviennent des paramètres ; la catégorie `word_choice` parle des « calques de {L1} ».
- Étendre les jeux d'évaluation (`feedback:eval`, `assessment:eval`) à au moins 2 langues maternelles (fr, en) pour vérifier qu'un changement de L1 ne dégrade pas la correction.
- Bonus « sources pour apprenants » (`select-contents.ts:37`) : remplacer « explique en français ou en anglais » par « explique dans la L1 de l'apprenant ou en anglais ».

**P3 — Interface traduite**
- Bibliothèque i18n compatible App Router et Server Components (vérifier dans la doc Next 16 ; `next-intl` est le candidat naturel) ; dictionnaires par langue dans un dossier sans dépendance React, réutilisable par une app native.
- Extraire toutes les chaînes ; `lang`/`dir` de `<html>` selon `ui_language` (arabe RTL : vérifier toute l'UI en miroir) ; dates via `Intl` avec la locale de l'utilisateur.
- Langues d'interface au départ : **fr, en**, puis es, de, pt, it, ar, zh, ja, ru (traduction par modèle + relecture native par échantillon).

**P4 — Contenus curés dans d'autres langues maternelles**
- Grammaire, alphabets, bilan : les fiches sont rédigées en français. Stratégie proposée : la règle reste stockée dans une langue **pivot** (fr), traduite à la demande par Claude dans la L1, mise en cache par (point, L1), marquée « traduction automatique » tant qu'elle n'est pas relue.
- Notes contrastives par couple (« en espagnol aussi… », « contrairement à l'anglais… ») générées et mises en cache de la même façon.

**Critères d'acceptation** : un compte avec `native_language = en` voit l'UI, les explications de mission, la correction et les traductions de vocabulaire en anglais ; un compte `es` → `fr` peut apprendre le français ; aucune chaîne française en dur ne reste (test qui scanne les composants) ; évaluations de correction ≥ au niveau actuel en fr et en en.

**Décidé le 2026-11-05** : l'apprentissage doit fonctionner depuis **n'importe quelle langue maternelle**. Concrètement :
- `native_language` accepte toute langue (liste ISO 639-1 complète), pas seulement les 19 langues cibles ;
- les explications générées (mission, correction, traductions) sont produites dans la L1 par le modèle, quelle qu'elle soit ;
- l'interface est traduite pour les langues les plus demandées ; pour une L1 sans traduction de l'interface, l'interface s'affiche en anglais, mais les explications restent dans la L1 ;
- les contenus curés existants restent rédigés en français (langue pivot, déjà écrite) ; leur traduction dans la L1 est générée une fois, mise en cache, relue par les agents (X0).

**À trancher** : bibliothèque i18n ; ordre de traduction de l'interface au-delà de fr et en.

---

### Phase Q — Lecteur intégré et input compréhensible

**Objectif** : que l'apprenant lise et écoute **dans l'app** beaucoup de textes qu'il comprend à 95-98 %, avec de l'aide au mot.

**Pourquoi** : c'est le moteur principal de l'acquisition (§1) et le point le plus faible de l'app (§2.2 n° 1).

**Q1 — Lecteur**
- Écran de lecture : texte segmenté en phrases ; toucher un mot → lemme, traduction en L1 dans le contexte, prononciation, bouton « ajouter » (la carte garde la **phrase source**) ; toucher une phrase → traduction et lecture audio ; taille de police réglable ; furigana / pinyin / accent tonique / harakat optionnels selon la langue (le registre a déjà `markStress`, `optionalVowelMarks`, `denseScript`).
- Couleur des mots selon leur état (nouveau, en cours, connu), à la manière des lecteurs d'immersion ; « marquer tous les mots non touchés comme connus » en fin de texte → alimente l'estimation de vocabulaire (W).
- Segmentation : `Intl.Segmenter` pour zh/ja/th, lemmatisation par le modèle à la création du texte (mise en cache), pas à chaque toucher.

**Q2 — Textes autorisés en entier**
- Sources réutilisables intégralement (licence à vérifier une par une dans `catalog.ts`) : Global Voices (CC BY), Wikinews (CC BY), Wikipédia (CC BY-SA, citer et partager à l'identique), VOA Learning English (domaine public, en), Wikisource / Projet Gutenberg (domaine public, littérature), LibriVox (audio domaine public), Tatoeba (phrases CC BY).
- Nouveau type de contenu `fullText` avec attribution complète ; le reste du catalogue garde la règle « accroche seulement ».

**Q3 — Textes gradués générés**
- Pour chaque mission : un **texte original** écrit par Claude sur le **sujet** du contenu authentique du jour (jamais une reformulation de l'article : on reprend le thème, pas le texte), au niveau de l'apprenant, avec ≥ 95 % de mots dans les 1 000/2 000/… plus fréquents selon le niveau (listes de fréquence déjà présentes dans `src/lib/frequency/`) et 5 à 8 mots nouveaux réutilisés plusieurs fois.
- Contrôle automatique de couverture après génération (rejeter et régénérer si < 95 %), puis contrôle par un second appel (fautes, naturel).
- Puis le contenu authentique devient l'étape « défi » (pour B2+) ou « pour aller plus loin ».
- Formats : article court, dialogue, mini-histoire en épisodes (fil rouge sur la semaine : très bon pour la motivation et le réemploi).

**Q4 — Audio de qualité**
- Synthèse vocale neuronale côté serveur pour chaque texte gradué (fournisseur à choisir : voix naturelles dans les 19+ langues, prix au caractère), fichiers mis en cache et servis depuis le stockage Supabase ; plusieurs voix, vitesse 0,75× / 1× ; lecture phrase par phrase.
- Supprime la dépendance aux voix de l'appareil (`listen-button.tsx`), qui manquent souvent.

**Q5 — Lecture extensive hors mission**
- Bibliothèque `/lire` : textes gradués et autorisés filtrés par niveau réel (couverture calculée sur **le vocabulaire de l'utilisateur**, pas seulement le CECR de la source), par thème et longueur.

**Critères** : un A2 en russe lit un texte de 150-250 mots dans l'app, écoute l'audio, touche les mots inconnus, en ajoute à ses révisions avec la phrase ; couverture mesurée ≥ 95 % ; coût par texte mesuré et noté.

**À trancher** : fournisseur de synthèse vocale ; part de textes générés vs authentiques selon le niveau ; épisodes à fil rouge ou textes indépendants.

---

### Phase U — Séance quotidienne guidée (mission v2)

**Objectif** : une séance qui s'enchaîne toute seule, couvre les quatre volets et s'adapte aux résultats.

**Déroulé type (20 min, proportions ajustées par le niveau et le budget temps)** :

| Étape | Volet | Contenu |
|---|---|---|
| 1. Échauffement (3-5 min) | Étude | Révisions dues (file unique, voir T), plafonnées |
| 2. Input (5-7 min) | Input | Texte gradué + audio (Q), questions de compréhension **sur le texte entier** et sur l'audio |
| 3. Focus (3-4 min) | Étude | 5-8 mots du texte + un micro-point de grammaire qu'il contient, exercé (texte à trous, transformation) |
| 4. Output (4-5 min) | Output | Production écrite ou orale liée au texte, corrigée ; **réécriture** obligatoire de 1-2 phrases corrigées |
| 5. Fluidité (1-2 min) | Fluidité | Relire le texte en temps limité, ou redire sa production plus vite (4/3/2 simplifié) |
| 6. Bilan | — | XP, mots appris, erreur du jour, ce qui revient demain |

- Les étapes se valident par le travail fait, plus de cases à cocher.
- **Difficulté adaptative** : si compréhension ≥ 90 % deux jours de suite → texte suivant plus dense ; si < 60 % → plus facile. Alimente W.
- Erreurs : une erreur de la production devient tout de suite un micro-exercice dans la séance du lendemain (pas seulement après 3 occurrences en 30 jours).
- Les mots du focus entrent **automatiquement** dans les révisions (désactivable).
- Hors ligne : la séance du jour est préchargée (textes + audio) pour le métro.

**Critères** : séance complète faisable sans quitter l'app ; temps réellement mesuré ; les quatre volets présents chaque semaine (indicateur dans W).

**À trancher** : place de l'ancienne mission « contenu authentique » (étape défi optionnelle ou séance séparée « Explorer ») ; nombre de langues par séance quand l'utilisateur en apprend plusieurs.

---

### Phase T — Mémorisation v2

**Objectif** : retenir plus pour moins de temps de révision.

- **FSRS** à la place de Leitner (algorithme ouvert, plus précis, ~20-30 % de révisions en moins à rétention égale dans les comparaisons publiées) ; rétention cible réglable (90 % par défaut) ; migration de l'état Leitner (boîte → stabilité initiale). Garder la mesure de rétention de la phase J pour comparer avant/après.
- **Étapes intra-journée** pour les nouvelles cartes (revoir après 1 min, 10 min) ; le domaine travaille aujourd'hui en jours entiers (`DateKey`) : ajouter un horodatage.
- **Une seule file** de révision (vocabulaire, grammaire, corrections, alphabets) avec plafond de temps quotidien et entrelacement.
- **Cartes en contexte** : recto = phrase du texte avec le mot surligné ; modes existants conservés (traduction, production, écoute, trous) ; ajouter **dictée** et **réponse orale** (après S).
- **Sangsues** : une carte ratée 6 fois est signalée et proposée en mode « mnémotechnique » (image mentale, mot-clé) ou suspendue.
- Statut « connu » automatique quand la stabilité dépasse un seuil (ex. 60 jours).
- Familles de mots et formes fléchies regroupées (ru, pl, cs, ar, tr…) pour ne pas compter 6 formes comme 6 mots.

**Critères** : migration sans perte d'historique ; tests du domaine pour FSRS ; temps de révision quotidien moyen en baisse à rétention ≥ égale (mesuré sur 4 semaines).

---

### Phase S — Oral : écouter et parler

**Objectif** : entraîner et mesurer la compréhension orale et l'expression orale.

**S1 — Micro et enregistrement**
- Autoriser le micro dans `headers.ts` (`microphone=(self)`), `MediaRecorder` (vérifier les formats sur Safari iOS), écoute de soi, comparaison avec le modèle.
- **Shadowing** : phrase native → l'apprenant répète en même temps → réécoute côte à côte. Très efficace pour la prosodie et le débit.

**S2 — Reconnaissance et prononciation**
- Transcription serveur (fournisseur à choisir, multilingue) : l'apprenant **dit** sa production au lieu de l'écrire, la transcription passe par la correction existante.
- Évaluation de prononciation par phonème/mot là où un service le permet ; à défaut, comparaison transcription ↔ texte attendu (mots mal reconnus surlignés). Tons pour le chinois : afficher la courbe de hauteur comparée.

**S3 — Compréhension orale**
- Exercices sur l'audio des textes gradués (Q4) : questions après écoute sans texte, **dictée** partielle, repérage de mots, vitesse variable.
- Questions sur les podcasts et vidéos authentiques quand une transcription autorisée existe.

**S4 — Conversation avec un partenaire IA**
- Jeux de rôle par tâche (« commander », « expliquer un problème à un médecin », « défendre un avis ») adaptés au niveau, en voix (transcription → Claude → synthèse vocale) ou en texte ; **relances** du partenaire, puis bilan : 3 erreurs à retenir, 3 tournures plus naturelles, réemploi.
- Garde-fous : durée et quota par jour (coût), refus des contenus hors sujet, rien de stocké sans consentement (page confidentialité à mettre à jour).

**Critères** : un utilisateur fait un jeu de rôle de 3 minutes en italien et reçoit un bilan ; shadowing fonctionnel sur iPhone (Safari et PWA installée) ; coût par minute mesuré.

**Budget (voir §6)** : commencer par ce qui est gratuit. La reconnaissance vocale du navigateur (`webkitSpeechRecognition` de Safari) est gratuite ; son fonctionnement dans la PWA installée sur iPhone est à vérifier en S1. Les paliers payants (évaluation de prononciation, voix neuronales au-delà du gratuit) viennent ensuite.

**À trancher** : fournisseurs (transcription, prononciation, voix) ; conservation des enregistrements ; quota gratuit.

---

### Phase V — Gamification sobre et motivation

**Objectif** : rendre l'app ludique et donner envie de revenir chaque jour, **sans récompenser ce qui n'apprend rien**.

**Ton retenu : sobre** (décision du 2026-11-05). Ni ligues, ni mascotte, ni classement entre utilisateurs, ni monnaie virtuelle. Le jeu porte sur **soi-même** : objectifs, régularité, étapes réelles franchies.

**Principes** : récompenser l'effort utile (rappels réussis, minutes d'input, productions réécrites), pas les clics ; montrer la compétence qui grandit ; laisser l'utilisateur choisir (autonomie) ; ne jamais culpabiliser.

- **Objectif du jour** en anneau (minutes utiles, choisies par l'utilisateur) et objectif de la semaine. Les « minutes utiles » ne comptent que le travail fait (texte lu jusqu'au bout, exercice répondu, production envoyée), pas le temps d'écran.
- **Série** améliorée : jour de gel (un par semaine, automatique), réparation possible dans les 24 h, et une **série de semaines** en option pour ceux qui ne veulent pas de pression quotidienne. La série reste désactivable.
- **Défis de la semaine** : 3 défis courts choisis selon les volets négligés (« dis 3 phrases à voix haute », « lis 2 textes jusqu'au bout », « réutilise 5 mots de la semaine »).
- **Étapes réelles** (badges discrets, sans collection à compléter) : 100 / 500 / 1 000 / 2 000 mots connus, premier texte lu sans aide, première conversation de 5 min, niveau CECR franchi par compétence, 10 / 50 / 100 h de pratique.
- **Carte du parcours** : les paliers A1 → C1 de chaque langue sous forme de chemin, avec la position actuelle par compétence (relié à W).
- **Fin de séance** : écran court qui montre ce qui a été appris (mots, erreur corrigée, minutes), avec une animation légère ; sons et vibrations désactivables, coupés par défaut.
- **Notifications push** : service worker + Web Push (iOS ≥ 16.4, PWA installée) ; un rappel par jour au plus, à l'heure choisie ; résumé hebdomadaire ; tout est désactivable.

**Critères** : minutes utiles et étapes calculées dans le domaine (pur, testé) et validées côté serveur (pas de triche par le client) ; notifications fonctionnelles sur un iPhone avec l'app installée ; chaque élément peut être désactivé dans les préférences ; le texte des préférences est mis à jour (« pas de classement » reste vrai).

---

### Phase R — Parcours débutant structuré (A0 → A2)

**Objectif** : qu'un vrai débutant sache se présenter, poser des questions simples et comprendre un dialogue courant en quelques semaines.

**Pourquoi** : le contenu authentique ne marche qu'à partir d'un seuil ; avant, il faut des **blocs lexicaux** (« je voudrais… », « est-ce que je peux… ») et des dialogues prévisibles.

- **Unités par situation** (programme communicatif aligné sur les descripteurs « Je peux… » du CECR) : se présenter, nombres et heure, commander, s'orienter, famille, travail, loisirs, santé, achats, passé récent, projets…
- Chaque unité : dialogue audio (Q4) → phrases-clés → 1 point de grammaire relié (H) → exercices variés et courts (associer, remettre les mots dans l'ordre, écouter et choisir, dictée, compléter, dire la phrase (S)) → mini-conversation guidée (S4) → bilan « Je peux maintenant… ».
- Contenu rédigé une fois par langue par Claude à partir d'un **gabarit commun** (même progression pour toutes les langues, adaptée à chacune), vérifié automatiquement (`*:check`), relu par un natif, versionné dans le dépôt comme la grammaire.
- Le parcours débutant **remplace** la mission authentique jusqu'à A2, puis s'efface progressivement.

**Critères** : 10 unités A1 dans 2 langues pilotes (ru, it, comme d'habitude), relues ; un débutant les enchaîne sans aide extérieure ; descripteurs « Je peux » cochés en fin d'unité.

---

### Phase W — Progrès réel et niveau continu

**Objectif** : que l'utilisateur **voie** qu'il progresse, et que l'app connaisse son niveau sans test répété.

- **Niveau par compétence** (compréhension écrite, compréhension orale, production écrite, production orale, interaction) stocké séparément ; le `level` actuel devient une vue dérivée.
- **Estimation continue** : chaque exercice noté met à jour un score par compétence (modèle de type Elo / IRT simple : la difficulté de l'item contre l'habileté de l'apprenant) ; le niveau ne monte qu'avec une marge de confiance, et le **bilan** (phase O) confirme les passages de palier.
- **Taille du vocabulaire** estimée (mots connus dans le lecteur + test rapide par échantillon de fréquences).
- **Tableau de bord** : heures par volet, mots connus, textes lus, minutes parlées, niveau par compétence, et **projection** (« à ton rythme, B2 en compréhension orale vers mars »).
- **Journal d'immersion** : saisir le temps passé hors app (série, podcast, conversation, lecture) → compte dans les heures et dans l'XP, avec suggestions de contenus de son niveau.
- Refonte du **test de niveau** (déjà prévue : adaptatif, items calibrés, confirmation aux hauts niveaux) et extension du **bilan** aux 17 autres langues (O5).

**Critères** : un utilisateur actif voit son niveau de compréhension écrite bouger après quelques semaines sans repasser de test ; les projections sont prudentes (intervalle) et expliquées.

---

### Phase X — Qualité du contenu à l'échelle (en continu)

**Objectif** : rendre visible en production le contenu déjà écrit, puis tenir la qualité quand on passe à des dizaines de langues.

**Contexte (décision du 2026-11-05)** : pas de relecteurs natifs, pas de budget pour en payer, pas encore de communauté. La relecture est donc confiée à des **agents IA relecteurs**, et la relecture humaine devient un niveau supérieur, facultatif, pour plus tard (Y).

**Ce qu'un agent relecteur peut et ne peut pas faire** : un modèle fort, avec des consignes précises, repère la grande majorité des fautes de langue, des exercices ambigus et des règles fausses. Il partage cependant certains angles morts avec le modèle qui a rédigé le contenu (tournures peu naturelles mais correctes, usages régionaux, nuances culturelles). D'où les garde-fous ci-dessous : agents indépendants, modèle plus fort que le rédacteur, désaccords tranchés à part, et signalements des utilisateurs (X3) comme boucle humaine.

#### X0 — Agents relecteurs (à faire en premier)

1. **Nouveau statut de relecture**, commun à la grammaire, aux banques du test de niveau, aux dossiers du bilan, aux alphabets et plus tard aux unités (R) et aux traductions (P4) :
   - `draft` : écrit par un modèle, non relu ;
   - `ai-reviewed` : relu et approuvé par les agents (date, modèle, version des consignes) ;
   - `native-reviewed` : relu par un humain natif (le `reviewedOn` actuel).
   - La politique d'affichage (`GRAMMAR_DRAFTS`, `src/lib/draft-policy.ts`) montre en production `ai-reviewed` et `native-reviewed`, avec une mention discrète « relu par IA » et le bouton de signalement (X3).
2. **Agent « relecteur natif » par langue**, défini comme agent Claude Code dans le dépôt (`.claude/agents/relecteur-natif.md`) : il joue un enseignant natif de la langue, certifié, qui relit un fichier de contenu selon une grille écrite :
   - langue : orthographe, accents, accord, naturel de chaque phrase, registre ;
   - pédagogie : la règle est juste et complète au niveau visé, les exemples l'illustrent, une seule bonne réponse par exercice, distracteurs plausibles mais faux, explication juste ;
   - règles propres à la langue déjà écrites dans `src/lib/grammar/AUTHORING.md`, `src/lib/placement/banks/AUTHORING.md`, `src/lib/assessment/AUTHORING.md` (accent tonique, pinyin, kana, harakat…) ;
   - sortie : un rapport par élément (`ok` / `corrigé` / `à revoir`), avec la correction proposée et sa justification, dans `docs/reviews/<langue>/<fichier>.md`.
3. **Deux passes indépendantes** : deux agents relisent sans voir le rapport de l'autre. Un élément est `ai-reviewed` seulement si les deux l'approuvent (après correction). En cas de désaccord, un troisième agent tranche ; s'il ne peut pas trancher, l'élément reste `draft`.
4. **Contrôles automatiques avant les agents** (gratuits) : `grammar:check`, `placement:check`, `assessment:check`, plus de nouvelles vérifications simples (mots absents des listes de fréquence ou de Tatoeba → à regarder de près).
5. **Où tournent les agents** :
   - **Contenu versionné dans le dépôt** (grammaire, banques, dossiers, alphabets, unités R) : dans des sessions **Claude Code**, un agent par langue en parallèle. Cette relecture ne consomme pas le budget de l'API de l'app (voir §6). Ordre : grammaire (342 points), puis banques du test de niveau, puis dossiers du bilan.
   - **Contenu généré à la volée** (textes gradués Q3, traductions P4) : un script `content:review` qui appelle l'API en **Batch** (−50 %), avec un modèle plus fort que celui qui a rédigé (Sonnet 5.5 relit ce que Haiku 5.5 écrit), puis une vérification par échantillon.
6. **Limites assumées** :
   - l'écoute des passages YouTube du bilan ne peut pas être vérifiée par un agent : elle reste à `draft`, ou passe par une transcription automatique comparée au script quand l'audio vient de nos propres fichiers ;
   - la mention « relu par IA » reste visible tant qu'aucun humain n'a relu ;
   - on mesure : taux de signalements par élément, et taux d'erreurs trouvées par la seconde passe (si la seconde passe trouve encore beaucoup, on renforce la grille).

**Critères d'acceptation** : les 18 points de grammaire russes et italiens relus par deux agents, rapports dans `docs/reviews/`, statut `ai-reviewed` posé, points visibles en production avec la mention ; même chose ensuite pour les 17 autres langues.

#### Suite de la phase X

- **X1 — Outil de relecture humaine** (pour plus tard) : page cachée qui affiche l'élément, les rapports des agents et un bouton « approuvé par un natif » (→ `native-reviewed`).
- **X2 — Relecture continue** : à chaque nouveau contenu, les agents relisent avant publication ; la CI refuse un contenu publié sans statut `ai-reviewed`.
- **X3 — Signalement par les utilisateurs** : bouton « il y a une erreur » sur chaque exercice, explication et correction ; file de traitement ; un élément signalé plusieurs fois repasse en relecture par les agents.
- **X4 — Évaluations par langue** : étendre `feedback:eval` et `assessment:eval` à chaque langue ajoutée et à chaque L1.
- **X5 — Grammaire au-delà de B1** : B2-C1 en « fiches de référence » courtes (registre, connecteurs, nuances) reliées aux erreurs.
- **X6 — Écritures restantes** : pinyin et tons pour le chinois, puis hanzi/kanji les plus fréquents (module « caractères » avec cartes et composants).

---

### Phase Y — Communauté et pratique humaine (plus tard)

- Correction par des natifs : un apprenant d'italien francophone corrige les textes d'un apprenant de français italophone (échange, modération, signalement).
- Partenaires de tandem (mise en relation par couple de langues, niveau et fuseau horaire), clubs de lecture par niveau.
- Relecteurs natifs volontaires pour X (avec reconnaissance : badge, accès premium).

**Prérequis** : P (multilingue), modération, politique de sécurité des échanges entre utilisateurs (mineurs, harcèlement).

---

### Phase Z — Plateforme, économie, preuve d'efficacité

- **Accueil** : objectif (voyage, travail, examen, famille, bilinguisme), L1, langue cible, niveau (test ou débutant), temps, heure de rappel → séance d'essai immédiate (déjà amorcé par l'essai invité).
- **Apps natives** (Expo, comme pour GeoGame) une fois P, Q, S stabilisés : le domaine et les schémas sont déjà prêts à être partagés ; notifications natives, audio en arrière-plan, hors ligne.
- **Coûts par utilisateur** : tableau des coûts (génération, correction, voix, transcription, conversation) et quotas par offre ; cache maximal (textes gradués partagés entre utilisateurs du même niveau et du même thème).
- **Offre** : gratuit (séance quotidienne, révisions) / premium (conversation IA, prononciation, langues multiples, bilans). Activer `CONTENT_LICENSE_POLICY=commercial` avant toute vente (6 langues perdent alors leurs sources : les textes gradués de Q les compensent).
- **Mesure d'efficacité** : bilan au départ et tous les 2-3 mois, rétention, minutes par volet ; tests A/B sur les choix pédagogiques (par ex. séance avec ou sans fluidité) ; publier les résultats (argument commercial honnête).
- Accessibilité (lecteurs d'écran, contrastes, tailles), RGPD (enregistrements vocaux, mineurs).

---

## 4. Tableau récapitulatif

| Phase | Effet attendu | Taille | Dépend de |
|---|---|---|---|
| Gains rapides | Confort, cohérence | S | — |
| X0 — Agents relecteurs | Grammaire visible en production, qualité tenue sans natifs | M | — |
| P — Langue de l'apprenant | Ouvre l'app à toutes les L1 | L | — |
| Q — Lecteur et input | Le plus gros gain d'apprentissage | L | P1-P2 |
| U — Séance guidée | Les quatre volets chaque jour | M | Q |
| T — Mémorisation v2 | Moins de révisions, plus de rétention | M | — (mieux après Q) |
| S — Oral | Parler et comprendre à l'oral | L | Q4 |
| V — Gamification sobre | Régularité, plaisir | M | U (minutes utiles mesurées) |
| R — Parcours débutant | Retenir les débutants | L | Q4, S1, X |
| W — Progrès et niveau | Preuve de progrès, difficulté juste | M | U, T |
| X — Qualité | Contenu visible et fiable | continu | — |
| Y — Communauté | Pratique humaine | L | P, modération |
| Z — Plateforme | Produit vendable et mesuré | L | tout le reste |

S ≈ quelques heures, M ≈ quelques jours, L ≈ une à plusieurs semaines, découpées en sous-phases validées une par une.

---

## 5. Décisions (2026-11-05)

1. **Ordre** : laissé au choix du plan. Ordre retenu : gains rapides → X0 → P → Q → U → T → V → S → R → W → Y → Z (justification au §3).
2. **Langue maternelle** : n'importe laquelle (détail dans la phase P). Le français reste la langue pivot des contenus curés déjà écrits.
3. **Budget** : 10 € par mois au plus, de la poche de l'utilisateur. Paliers et répartition au §6 ; palier 1 retenu par défaut.
4. **Gamification** : ton **sobre** (phase V réécrite en ce sens : ni ligues, ni mascotte, ni classement).
5. **Relecture** : par des **agents IA relecteurs** (phase X0), faute de relecteurs natifs et de budget. La relecture humaine devient facultative et ultérieure.

---

## 6. Budget : paliers et répartition

### 6.1 Prix utilisés (vérifiés le 2026-11-05)

| Service | Prix | Remarque |
|---|---|---|
| Claude Haiku 5.5 | 0,10 $ / 0,50 $ par million de tokens (entrée / sortie) | modèle actuel de l'app |
| Claude Sonnet 5.5 | 2 $ / 10 $ | 20 × Haiku |
| Claude Opus 5.5 | 4 $ / 20 $ | 40 × Haiku |
| API Batch | −50 % | réponses en différé (jusqu'à 24 h), parfait pour les missions préparées la nuit et les relectures |
| Cache de prompt | lecture ≈ 10 % du prix d'entrée | le long prompt système des missions se met en cache |
| Voix neuronale Azure (offre gratuite F0) | 0,5 million de caractères par mois gratuits | ≈ 500 textes gradués de 1 000 caractères |
| Transcription Azure (offre gratuite) | 5 h par mois gratuites | |
| Voix et reconnaissance du navigateur | gratuit | qualité et disponibilité variables selon l'appareil |

Les offres gratuites de Google Cloud TTS sont décrites de façon contradictoire selon les sources : à vérifier sur la page officielle avant de s'en servir. Les prix des fournisseurs changent : les revérifier avant chaque phase qui en dépend.

### 6.2 Consommation estimée de l'app

Estimation à partir de la taille des prompts actuels (`prompt.ts` ≈ 3 000 tokens de consignes) ; à confirmer en enregistrant les tokens de chaque appel (voir 6.4).

| Appel | Entrée | Sortie (réflexion comprise) | Coût Haiku 5.5 |
|---|---|---|---|
| Mission d'une langue | ≈ 5 000 tokens | ≈ 5 000 tokens | ≈ 0,003 $ |
| Correction d'une production | ≈ 3 000 | ≈ 3 000 | ≈ 0,002 $ |
| Texte gradué (Q3) | ≈ 3 000 | ≈ 3 000 | ≈ 0,002 $, **partagé** entre tous les apprenants de même langue, niveau et thème |
| Conversation IA (S4), 5 min en texte | ≈ 15 000 (cumul) | ≈ 3 000 | ≈ 0,003 $ |

**Ordre de grandeur** : un apprenant actif chaque jour (mission + une correction) coûte environ **0,15 $ par mois** avec Haiku 5.5. Le même usage coûterait environ 3 $ avec Sonnet 5.5 et 6 $ avec Opus 5.5. Pour l'usage quotidien, Haiku reste donc le bon choix ; les modèles plus forts sont à réserver aux tâches ponctuelles où la qualité compte (relecture, rédaction de contenus curés).

### 6.3 Paliers

| Palier | Coût mensuel | Ce que ça permet |
|---|---|---|
| **0 — Actuel** | ≈ 0 € (crédit restant de 5 €) | Haiku pour les missions et les corrections ; voix de l'appareil. Suffit pour toi et une dizaine de testeurs pendant des mois. Pas de textes gradués audio, pas d'oral réel. |
| **1 — Recommandé** | **10 €** | Tout le palier 0, plus : missions préparées la nuit en Batch (−50 %) ; textes gradués générés et partagés (Q) ; voix neuronales pour ces textes via l'offre gratuite Azure ; relecture des contenus générés à la volée par Sonnet 5.5 en Batch ; conversation IA en texte avec Haiku. Capacité : environ **30 à 50 apprenants actifs par jour**. |
| **2 — Oral complet** | ≈ 25-30 € | Palier 1, plus : conversation **vocale** (transcription + voix au-delà du gratuit), évaluation de la prononciation. Environ 30 apprenants actifs. |
| **3 — Produit payant** | proportionnel aux utilisateurs | Les abonnements financent l'usage : compter ≈ 0,20 $ par apprenant et par mois sans oral, ≈ 1 à 2 $ avec l'oral vocal quotidien. |

**Répartition proposée du palier 1 (10 €)** :
- environ 4 € pour l'usage quotidien des apprenants (missions, corrections, textes gradués, conversation écrite), tous en Haiku 5.5 ;
- environ 5 € pour la qualité : relecture en Batch par Sonnet 5.5 des textes générés à la volée, et rédaction de contenus curés quand Claude Code ne suffit pas ;
- environ 1 € de marge, avec une alerte de dépense dans la console Anthropic.

**Ce qui ne coûte rien sur l'API** : la relecture des contenus versionnés dans le dépôt (grammaire, banques, dossiers, unités R) et leur rédaction se font dans des sessions Claude Code, dans le cadre de ton abonnement Claude, pas sur le crédit de l'API de l'app. C'est le plus gros poste évité.

### 6.4 Règles pour tenir le budget

1. **Mesurer avant d'optimiser** : enregistrer `input_tokens` / `output_tokens` / modèle pour **chaque** appel (c'est déjà fait pour la correction et le bilan, pas pour les missions ni les thèmes), et afficher le coût du mois dans un script (`npm run cost:report`).
2. **Haiku 5.5 partout à l'exécution**, effort `low` quand c'est possible (thèmes, traductions, textes gradués) ; `medium` seulement là où l'éval montre une différence (correction).
3. **Batch pour tout ce qui n'est pas immédiat** : missions préparées la nuit, thèmes des contenus, relectures, traductions de contenus curés.
4. **Mettre en cache** : prompts système (cache de prompt), et surtout les **résultats** partagés (textes gradués, audio, traductions des fiches) : générés une fois, servis à tous.
5. **Plafonds par utilisateur** (comme le quota de traduction du vocabulaire) : corrections, minutes de conversation et textes à la demande par jour ; refus propre quand le plafond est atteint.
6. **Gratuit d'abord** pour la voix : voix neuronales dans l'offre gratuite Azure (mises en cache), voix de l'appareil en secours.
7. **Alerte** : plafond de dépense mensuel dans la console Anthropic à 10 €, et bascule automatique vers le générateur de secours quand le crédit est épuisé (le mécanisme de clé de secours existe déjà dans `anthropic-client.ts`).

---

## 7. Gabarit pour lancer une phase dans une autre conversation

```
Contexte : projet Daily Lingua (C:\Users\Administrateur\Documents\DailyLingua, branche dev).
Lis docs/plans/roadmap-plateforme.md, sections 0, 1 et la phase <X>.
Lis aussi AGENTS.md et CLAUDE.md.
Tâche : conçois puis implémente la sous-phase <X1> uniquement.
Avant de coder : pose-moi les points « À trancher » de cette phase et propose ta conception
(fichiers, schéma, migrations, tests). Attends ma validation.
Fin de phase : fichiers modifiés, commandes, tests réellement lancés et résultats,
commande pour lancer, problèmes ouverts, étape suivante. En français.
```
