# Plan — correction « écrire puis dire », répartition du temps, thèmes, bilan par compétence

Statut : **proposition**, rien n'est implémenté. Date : 2026-10-27. Ce plan fait suite à [learning-paths.md](learning-paths.md) (phases H à K) ; ses phases portent les lettres L à O. Il part de notes brutes de l'utilisateur ; les points marqués **À trancher** attendent sa réponse. Chaque point à trancher a une option par défaut (marquée *défaut*) : si l'utilisateur n'a pas répondu, l'implémentation part de celle-là et le signale.

Règles du projet à respecter dans chaque phase (rappel, voir `CLAUDE.md`) : mobile d'abord (largeur téléphone, zones sûres, champs ≥ 16 px) ; aucune langue codée en dur (registre `src/lib/domain/languages.ts`) ; `src/lib/domain` et `src/lib/schemas` sans import Next.js/React ; données lues seulement par `getRepository()` ; `await connection()` pour les pages qui dépendent du jour ; `npm run check` et `npm run build` avant de rendre. Une phase à la fois, validée avant la suivante ; chaque phase se termine par les fichiers modifiés, les commandes lancées, les tests réellement exécutés et leurs résultats. Le dépôt est surtout en LF : vérifier `git diff --stat` après délégation (réécritures complètes en CRLF).

Ordre proposé : **L → M → N → O**. L et M sont petites ; N est moyenne ; O est la plus lourde et commence par un pilote russe + italien.

## Phase L — « Aucun retour » sur la production « écrire puis dire »

### Constat

La note dit « Aucun retour si c'est de la production orale (écrite) ». Le code actuel prévoit pourtant une correction pour le mode `spoken` :

- `src/lib/generation/writing-feedback-service.ts` (l. 66-67) ne refuse que l'ancien mode `speaking` (`not-writing`) ;
- `src/components/mission/production-task.tsx` affiche le bouton « Terminer et obtenir une correction » pour `writing` et `spoken`, dès que `onRequestFeedback` est fourni ;
- `src/components/mission/mission-view.tsx` (l. 154-155) ne le fournit que si `persist && canReviewWriting`.

Causes possibles, à vérifier dans l'ordre :

1. **Mission ancienne** : une mission générée avant la phase G garde le mode `speaking`, sans zone de texte ni correction (« Parle à voix haute, même seul·e »). Normal, mais à confirmer par la date.
2. **Mode démo** ou **invité** : `persist` faux ou `canReviewWriting` faux → pas de bouton. Le bloc « À voix haute » s'affiche alors sur le texte de l'utilisateur, ce qui peut donner l'impression d'un écran « sans retour ».
3. **Correction indisponible** (`ANTHROPIC_API_KEY` absente, erreur du modèle) : message « La correction n'est pas disponible pour l'instant ».
4. **Texte trop court** (`WRITING_FEEDBACK_LIMITS.minChars`) : bouton grisé.
5. **Session expirée** (plus vieille que la veille) : `expired`.
6. Un vrai bug non encore identifié.

### À faire

1. Reproduire avec l'utilisateur (date de la mission, langue, compte invité ou complet, capture d'écran). Lire `writing_feedback` et `mission_activities` de la session en base.
2. Corriger la cause trouvée. Quelle qu'elle soit, rendre la raison visible : quand la correction n'est pas proposée, une ligne explique pourquoi (« Crée ton compte pour obtenir une correction », « Mode démonstration », « Correction possible jusqu'au lendemain de la mission », etc.) au lieu d'un écran muet. Fonction pure `feedbackAvailability(...)` qui renvoie la raison, testée.
3. Si la cause est l'interprétation (« écrire puis dire » vécu comme de l'oral sans retour sur l'oral) : c'est attendu tant que la phase E (enregistrement) est reportée ; le dire dans le bloc « À voix haute » (« Ta prononciation n'est pas évaluée »).

**À trancher L1** : la note veut-elle dire « il n'y a pas de retour, c'est un bug » (*défaut*) ou « il ne faut pas de retour sur ce type de production » ?

Tests : `feedbackAvailability` pour chaque cas ; composant : message affiché à la place du bouton pour un invité, en démo et pour une session expirée.

## Phase M — Répartition du temps entre les langues

### Constat

La répartition n'est **déjà pas** purement arithmétique : chaque langue a un poids (`languageGoalSchema.weight`, 1 à 10 dans le schéma, 1 à 5 dans le formulaire), `splitBudget` (`src/lib/domain/time-budget.ts`) répartit les minutes au prorata, et le formulaire (`src/components/preferences/preferences-form.tsx`, l. 241-255) affiche les minutes obtenues et une mention « prioritaire ». La note montre que ce réglage n'est pas compris ou pas trouvé : un « poids » est abstrait, et il est rangé en bas du bloc de chaque langue.

Deux autres limites :

- avec 30 minutes et 3 langues de poids 4/1/1, la petite langue reçoit 5 minutes, trop peu pour une session (contenu + production) ;
- un poids ne permet pas d'alterner (« russe tous les jours, italien deux fois par semaine »).

### Proposition (*défaut*)

1. **Minutes par langue au lieu d'un poids.** Le formulaire affiche, pour chaque langue, un sélecteur de minutes (pas de 5) ; le total quotidien devient la somme, affichée en tête (« 35 min par jour »). Plus de stepper « Poids ». Minimum 10 minutes par langue (en dessous, une session n'a pas de sens), total 10 à 120 comme aujourd'hui.
2. **Stockage sans casser l'existant.** `weight` reste la part relative, mais sa borne passe à 1..120 (migration : contrainte de `user_languages.weight` et `languageGoalSchema`), et le formulaire écrit `weight = minutes` et `dailyMinutes = somme`. `splitBudget` ne change pas : avec des poids égaux aux minutes, il rend exactement les minutes saisies. Les préférences existantes (poids 1..5) restent valides ; à la première ouverture, le formulaire convertit les poids en minutes avec `splitBudget` (arrondi à 5, minimum 10) et l'utilisateur enregistre.
3. **Préréglages** au-dessus des langues, quand il y en a au moins deux : « Équilibré », « Surtout <langue 1> » (≈ 2/3 – 1/3), qui remplissent les minutes ; l'utilisateur peut ensuite ajuster.
4. Tests : `splitBudget` avec des poids-minutes ; conversion poids → minutes (arrondi, minimum) ; validation (minimum 10 par langue, total ≤ 120) ; composant : préréglage, total affiché.

**À trancher M1** : minutes par langue (*défaut*) ou garder un réglage relatif mais plus parlant (curseur de pourcentage) ?
**À trancher M2** : faut-il aussi des **jours** par langue (alternance) ? Plus utile qu'une session de 5 minutes, mais touche la génération (`generate-mission.ts`, `chooseProductionMode`), la série de jours (J3) et les révisions. *Défaut* : non dans cette phase, à reprendre si l'utilisateur le veut.

## Phase N — Trier les contenus, choisir le thème de la mission

### Constat

- **Tri par type** : `/lire` filtre déjà par type (Tout / Lire / Regarder / Écouter, `?type=`), combinable avec la langue (phase F). Ce qui manque n'est pas clair : tri par niveau, par durée, par source, par date ? Ou ce filtre ailleurs (historique, mission) ?
- **Thèmes** : les contenus **n'ont pas de thème**. Les sujets choisis dans les préférences (`TOPICS`, 12 libellés, par langue) sont seulement envoyés au modèle dans le prompt (`src/lib/generation/prompt.ts`, l. 103-108), qui choisit parmi des candidats non étiquetés. On ne peut donc ni filtrer `/lire` par thème, ni garantir un thème pour la mission.
- La mission du jour est **générée à l'avance** par la tâche horaire (GitHub Actions). Choisir le thème « du jour » au moment où l'on ouvre l'app veut dire remplacer une session déjà générée (nouvel appel au modèle). Le mécanisme existe en partie : `replaceInaccessibleContent` / `replaceSession` (`src/lib/data/repository.ts`, l. 118-124), avec une limite de remplacements par jour.

### Proposition

1. **Étiqueter les contenus par thème** (N1).
   - Colonne `contents.topics text[]` (valeurs de `TOPICS`), migration ; index GIN.
   - Chaque source du catalogue (`src/lib/content/catalog.ts`) gagne `defaultTopics` facultatif (une chaîne de cuisine → `gastronomie`).
   - À l'ingestion, si la source n'a pas de thème fixe : classement du titre et de l'accroche par Claude Haiku 5.5 (effort `low`, par lots de 20, 1 à 3 thèmes parmi les 12, ou aucun). Les accroches sont déjà envoyées à Claude pour les missions : pas de changement de licence ni de confidentialité. Coût faible (texte court, une fois par contenu) ; `CONTENT_TOPICS=off` le coupe.
   - Script `npm run content:topics -- --backfill` pour les contenus déjà en base.
   - **À trancher N1** : classement par Haiku (*défaut*) ou seulement par source (gratuit, mais grossier : un site d'information couvre tous les thèmes).
2. **Filtre par thème sur `/lire`** (N2) : `?theme=`, combinable avec la langue et le type ; puces horizontales défilantes au format téléphone. Le tri reste « plus récent d'abord » sauf réponse à N3.
   - **À trancher N3** : quel tri manque exactement (niveau, durée, date, source) ?
3. **Thème de la mission** (N3), deux niveaux, au choix de l'utilisateur :
   - **Thème de demain** (*défaut*, sans coût) : sur l'écran de mission, « Demain, plutôt : <thème> » ; enregistré pour la date suivante (table `mission_requests(user_id, date, language, topic)`), lu par `generate-mission.ts`, qui ne garde que les candidats du thème (repli sur tous les candidats si aucun n'est au bon niveau, avec un message).
   - **Changer de thème aujourd'hui** : « Autre thème » sur une session, remplace la session par une autre du thème choisi, en réutilisant `replaceSession` et sa limite quotidienne. Interdit quand une activité de la session est déjà faite (correction demandée, réponses données).
   - **À trancher N4** : les deux (*défaut*), ou seulement l'un ?
4. Tests : sélection des candidats par thème et repli ; schéma `topics` ; classement (réponse du modèle hors liste rejetée) ; filtre `/lire` ; remplacement refusé quand la session est commencée ; limite quotidienne.

Point d'attention : par langue et par niveau, certains thèmes auront peu de contenus (`npm run content:coverage` gagne une matrice thème × niveau par langue). Le choix d'un thème vide doit être désactivé, pas proposé puis refusé.

## Phase O — Bilan par compétence (refonte du test de niveau)

C'est la refonte annoncée du test de niveau (le test actuel surestime les hauts niveaux, voir mémoire du projet). Elle remplace l'idée de patcher le moteur actuel.

### Ce que proposent les notes

Un test en étapes : compréhension écrite, compréhension orale, expression écrite, expression orale, trois questions chacune ; réponses ouvertes (en français ou dans la langue étudiée) plutôt que des QCM, jugés trop faciles ; un seul document par test (un article de presse : une partie lue, une partie entendue, une production liée) ; puis la question de l'affichage : un niveau moyen ou un niveau par compétence.

### Points critiques

1. **Licence : pas d'article de presse.** L'app ne stocke que les métadonnées et une accroche de 280 caractères (politique de contenu, `src/lib/content/catalog.ts`). Lire une partie d'un article et en faire lire une autre par une voix de synthèse suppose d'en avoir le texte entier et de le transformer : interdit pour les sources « tous droits réservés », et la CC BY-ND (The Conversation) interdit les adaptations. Les documents du bilan doivent être **des textes originaux**, écrits pour l'app, dans le style d'un article.
2. **Un seul document ne peut pas couvrir A1 à C2.** Un texte B1 ne dit rien d'un C1 et décourage un A1. Il faut d'abord situer la personne, puis lui donner un document à son niveau, et regarder si elle le réussit, le dépasse ou échoue.
3. **Documents générés à la volée : non.** Un texte « niveau B1 » écrit par un modèle est approximativement B1 ; la mesure ne serait pas stable d'un test à l'autre. Comme pour la grammaire et les banques actuelles : documents écrits une fois, relus, versionnés dans le dépôt, avec leurs questions et leurs réponses de référence.
4. **Trois questions par compétence, c'est peu** pour une mesure fiable (une erreur d'inattention change le résultat d'un tiers). Acceptable pour un bilan indicatif si le résultat porte un indice de confiance, comme aujourd'hui.
5. **Réponse dans la langue étudiée qui compterait aussi pour l'expression écrite** : à éviter. On mélangerait deux mesures, et la personne qui répond en français serait pénalisée sur une compétence qu'elle n'a pas choisi de montrer. La compréhension est notée sur le sens seulement, quelle que soit la langue de réponse ; l'expression écrite a sa propre tâche.
6. **Expression orale** : il faut enregistrer et transcrire (phase E, reportée le 2026-10-21 pour le coût et la confidentialité). Les craintes de la note sont fondées : micro du téléphone, bruit, et surtout une transcription automatique corrige ou rate l'accent d'un apprenant, donc la prononciation est mal mesurée. En v1 : **auto-évaluation guidée** de l'oral (descripteurs « je peux… » du CECR, en français, 6 à 8 affirmations), affichée comme telle (« déclaré »). L'oral enregistré viendra avec la phase E.
7. **Durée** : quatre épreuves, c'est 20 à 25 minutes. Trop long pour l'inscription. Le bilan complet doit être facultatif, et refaisable plus tard pour mesurer les progrès.
8. **Volume de rédaction** : 19 langues × 6 niveaux, au moins 2 documents par case (pour pouvoir refaire le bilan) = 228 dossiers, chacun avec texte, script audio, questions, réponses de référence et relecture native. D'où le pilote russe + italien.

### Réponse à la question « moyenne ou niveau par compétence »

L'app utilise le niveau pour deux choses différentes, ce qui tranche la question :

- le **niveau de réception** (compréhension écrite et orale) choisit la difficulté des **contenus** (articles, vidéos, podcasts) ;
- le **niveau de production** (expression écrite, et orale quand elle existera) règle la **consigne de production** et la correction (`targetLevel`, attentes du prompt).

Proposition : garder un niveau par compétence en base, en utiliser deux dans le moteur (réception, production), et ne **pas** afficher de moyenne. À l'écran, un profil en langage courant, le CECR en petit :

> **Comprendre un texte** — tu suis l'essentiel d'un article sur un sujet courant (B1)
> **Comprendre à l'oral** — tu saisis les idées principales si l'on parle clairement (A2)
> **Écrire** — tu racontes et donnes ton avis en phrases simples reliées (A2)
> **Parler** — déclaré : tu te débrouilles dans les situations courantes (A2)

Le « niveau » de la langue dans les préférences (`goal.level`) reste un seul champ pour ne pas tout casser ; il prend la valeur du niveau de réception, et le niveau de production est stocké à part (voir O2).

### Déroulé proposé (*défaut*)

1. **Étape 1 — repérage (5 min)** : le test adaptatif actuel (QCM grammaire et vocabulaire, `src/lib/domain/placement.ts`), raccourci : la lecture en QCM en est retirée (elle passe à l'étape 2). Il donne un niveau provisoire. C'est le seul passage obligatoire à l'inscription, comme aujourd'hui.
2. **Étape 2 — dossier au niveau provisoire (15 à 20 min)**, facultatif, proposé à la fin de l'étape 1 et depuis `/niveau` (« Faire mon bilan complet ») :
   - **Compréhension écrite** : un texte original (120 mots en A2, 350 en C1), 3 questions ouvertes ; réponse en français ou dans la langue, au choix pour chaque question.
   - **Compréhension orale** : la suite du dossier, entendue seulement (20 s en A1-A2, 45 à 60 s en B2-C2 : 20 s ne permettent pas d'évaluer un C1), **3 écoutes au plus**, 3 questions ouvertes.
   - **Expression écrite** : une consigne liée au dossier, 3 phrases (A1-A2) à 5-6 phrases (B2-C2) ; la longueur et la complexité attendues dépendent du niveau.
   - **Expression orale** : auto-évaluation (voir point 6).
3. **Correction** par Claude Haiku 5.5 (effort `medium`), un appel pour tout le dossier : pour chaque question de compréhension, juste / partiel / faux d'après la réponse de référence et les éléments attendus ; pour l'expression, les critères de la correction écrite existante (grammaire, lexique, syntaxe, adéquation) rapportés à des descripteurs CECR. Sortie validée par un schéma Zod ; `npm run assessment:eval` avec un jeu de réponses étiquetées à la main (comme `feedback:eval`).
4. **Décision par compétence** : réussite nette → le niveau du dossier est confirmé, et on propose un second dossier un niveau au-dessus (facultatif) ; échec net → niveau inférieur ; entre les deux → niveau du dossier, confiance moyenne. Fonction pure dans `src/lib/domain/assessment.ts`.

### Sous-phases

- **O1 — Format et pilote de contenu.** Schéma `assessmentDossierSchema` (`src/lib/schemas/assessment.ts`) : langue, niveau, thème, texte, script audio, questions (énoncé en français, réponse de référence, éléments attendus), consigne d'expression, `reviewedOn`. Dossiers dans `src/lib/assessment/dossiers/<langue>/`, `npm run assessment:check` (longueurs par niveau, 3 questions par épreuve, ids stables). Pilote : russe et italien, A1 à C2, 1 dossier par niveau (12 dossiers), brouillons cachés en production tant que `reviewedOn` est nul (comme `GRAMMAR_DRAFTS`).
- **O2 — Audio.** Voir **À trancher O3**. Fichiers audio produits une fois par dossier (script `npm run assessment:audio`), servis comme fichiers statiques ou depuis Supabase Storage ; lecteur avec compteur d'écoutes (3 au plus, contrôlé côté client et enregistré avec les réponses).
- **O3 — Données.** Tables `assessments` (utilisateur, langue, dossier, réponses, résultat par compétence, confiance, version du prompt, date) et colonne `user_languages.production_level` (facultative ; à défaut, le niveau unique). RLS par utilisateur ; quota de corrections par jour (comme `writing_feedback`). La génération de mission lit `production_level` pour la consigne de production.
- **O4 — Écrans.** `/niveau/[langue]/bilan` : quatre étapes avec progression, réponses enregistrées au fur et à mesure (reprendre plus tard), puis le profil par compétence. Lien depuis `/niveau` et l'accueil (« Refais ton bilan », 60 jours après le précédent).
- **O5 — Extension** aux 17 autres langues, après validation du pilote et relecture native.

Confidentialité : la politique mentionne l'envoi des réponses du bilan à Anthropic pour correction (comme les productions écrites), et, si l'audio vient d'un service de synthèse, que la synthèse est faite à l'avance (aucune donnée de l'utilisateur envoyée).

Coût : un appel Haiku par bilan (textes courts) ; l'audio est produit une fois par dossier, pas par utilisateur. À mesurer pendant le pilote.

### À trancher

- **O1** : étape 1 (QCM) gardée comme repérage obligatoire et dossier facultatif (*défaut*), ou bilan complet à l'inscription ?
- **O2** : affichage d'un profil par compétence sans moyenne (*défaut*), ou aussi un niveau global ?
- **O3** : voix de la compréhension orale : synthèse de l'appareil (`speechSynthesis`, gratuite mais qualité très variable et voix absentes sur certains appareils : la mesure dépendrait du téléphone) ; synthèse dans le cloud produite une fois par dossier (*défaut* : qualité stable, coût unique ; fournisseur et licence de la voix pour un usage commercial à vérifier) ; ou enregistrements par des natifs (meilleur, mais il faut des natifs) ?
- **O4** : expression orale en auto-évaluation pour la v1 (*défaut*), ou attendre la phase E pour faire l'oral enregistré ?
- **O5** : qui relit les dossiers du pilote (russe, italien) ?
