# Plan — répartition du temps, thèmes, bilan par compétence

Statut : **proposition validée dans ses grandes lignes**, rien n'est implémenté. Date : 2026-10-27. Ce plan fait suite à [learning-paths.md](learning-paths.md) (phases H à K) ; ses phases portent les lettres M à O. Il part de notes brutes de l'utilisateur. Les choix ont été tranchés le 2026-10-27 (section « Décisions » de chaque phase) ; les points encore ouverts sont marqués **À trancher**, avec une option par défaut (*défaut*) : si l'utilisateur n'a pas répondu, l'implémentation part de celle-là et le signale.

Décisions de l'utilisateur (2026-10-27) :

- M : minutes saisies par langue ; possibilité d'alterner les langues selon les jours de la semaine.
- N : le tri voulu est par **domaine** (sport, politique, sciences…) ; le thème se choisit **pour le lendemain** seulement.
- O : bilan complet **facultatif après le QCM, mais recommandé** ; compréhension orale sur **enregistrements de natifs** ; l'utilisateur trouve les relecteurs (et voix) pour le pilote.

Règles du projet à respecter dans chaque phase (rappel, voir `CLAUDE.md`) : mobile d'abord (largeur téléphone, zones sûres, champs ≥ 16 px) ; aucune langue codée en dur (registre `src/lib/domain/languages.ts`) ; `src/lib/domain` et `src/lib/schemas` sans import Next.js/React ; données lues seulement par `getRepository()` ; `await connection()` pour les pages qui dépendent du jour ; `npm run check` et `npm run build` avant de rendre. Une phase à la fois, validée avant la suivante ; chaque phase se termine par les fichiers modifiés, les commandes lancées, les tests réellement exécutés et leurs résultats. Le dépôt est surtout en LF : vérifier `git diff --stat` après délégation (réécritures complètes en CRLF).

Ordre proposé : **M → N → O**. M est petite ; N est moyenne ; O est la plus lourde et commence par un pilote russe + italien.

## Phase M — Répartition du temps entre les langues

### Constat

La répartition n'est **déjà pas** purement arithmétique : chaque langue a un poids (`languageGoalSchema.weight`, 1 à 10 dans le schéma, 1 à 5 dans le formulaire), `splitBudget` (`src/lib/domain/time-budget.ts`) répartit les minutes au prorata, et le formulaire (`src/components/preferences/preferences-form.tsx`, l. 241-255) affiche les minutes obtenues et une mention « prioritaire ». La note montre que ce réglage n'est pas compris ou pas trouvé : un « poids » est abstrait, et il est rangé en bas du bloc de chaque langue.

Deux autres limites :

- avec 30 minutes et 3 langues de poids 4/1/1, la petite langue reçoit 5 minutes, trop peu pour une session (contenu + production) ;
- un poids ne permet pas d'alterner (« russe tous les jours, italien deux fois par semaine »).

### Décisions

Minutes saisies par langue ; jours de la semaine par langue (alternance). La phase se fait en deux sous-phases, M1 puis M2, chacune validée.

### M1 — Minutes par langue

1. **Minutes par langue au lieu d'un poids.** Le formulaire affiche, pour chaque langue, un sélecteur de minutes (pas de 5, de 10 à 120) ; le total d'un jour est la somme des langues de ce jour, affichée en tête (« 35 min par jour »). Plus de stepper « Poids » ni de champ « Durée quotidienne » séparé. Minimum 10 minutes par langue (en dessous, une session n'a pas de sens), au plus 120 par jour.
2. **Stockage sans casser l'existant.** `weight` porte désormais les minutes de la langue : sa borne passe à 1..120 (migration : contrainte `check (weight between 1 and 10)` de `user_languages`, `languageGoalSchema`, RPC `save_preferences` si elle borne aussi). `dailyMinutes` reste en base et dans le schéma, mais n'est plus saisi : le serveur le recalcule comme la somme des minutes (garde-fou pour le code qui le lit encore, dont `store.claim`). `splitBudget` ne change pas : avec des poids égaux aux minutes, il rend exactement les minutes saisies.
3. **Reprise des préférences existantes.** Une migration convertit les poids actuels en minutes : `splitBudget(daily_minutes, poids)`, arrondi à 5, minimum 10 (fonction SQL ou script, au choix, testé sur les données d'exemple). Fonction pure équivalente `weightsToMinutes` dans `src/lib/domain/time-budget.ts`, testée, utilisée pour les données de démonstration et les éventuelles charges utiles anciennes.
4. **Préréglages** au-dessus des langues, quand il y en a au moins deux : « Équilibré », « Surtout <langue 1> » (≈ 2/3 – 1/3 du total actuel), qui remplissent les minutes ; l'utilisateur ajuste ensuite.
5. La mention « prioritaire » reste (langue qui a le plus de minutes).

Tests : `weightsToMinutes` (arrondi, minimum, somme) ; validation (10 à 120 par langue, au plus 120 par jour) ; `splitBudget` avec des poids-minutes ; composant : préréglage, total affiché ; test d'intégration de `save_preferences` avec des minutes > 10.

### M2 — Alterner les langues selon les jours

1. **Données.** `languageGoalSchema.days` : jours ISO de la semaine où la langue est travaillée (`1` = lundi … `7` = dimanche), au moins un, sans doublon ; absent = tous les jours (les charges utiles anciennes restent valides). Colonne `user_languages.days smallint[] not null default '{1,2,3,4,5,6,7}'` avec contrainte (valeurs 1..7, non vide), RPC `save_preferences` mise à jour.
2. **Jour de la semaine** dans le fuseau de l'utilisateur : fonction pure `isoWeekday(key: DateKey)` dans `src/lib/domain/dates.ts` (les `DateKey` sont déjà des dates locales). `goalsForDate(goals, date)` renvoie les langues du jour.
3. **Validation par jour.** Pour chaque jour de la semaine, la somme des minutes des langues de ce jour ≤ 120. Un jour peut n'avoir **aucune** langue (jour de repos), mais au moins un jour de la semaine doit en avoir une.
4. **Écran.** Dans le bloc de chaque langue, sept puces L M M J V S D (toutes cochées par défaut). Sous la liste des langues, une ligne « Semaine » qui montre, pour chaque jour, les langues et le total (« Lun : russe, italien · 40 min », « Dim : repos »), pour voir l'effet d'un coup.
5. **Génération.** `generate-mission.ts` ne prend que `goalsForDate(goals, date)` ; le budget de la mission (`store.claim`, `splitBudget`) est la somme des minutes de ces langues, et non plus `preferences.dailyMinutes`. Celui-ci devient le total du jour le plus chargé (toujours ≤ 120, donc la contrainte actuelle tient), recalculé par le serveur. Jour sans langue : aucune mission. `list_due_mission_users` (dernière version : `supabase/migrations/20261020000200_list_due_users_definer.sql`) ou le code qui l'appelle saute un utilisateur sans langue ce jour-là (pas d'appel au modèle).
6. **Alternance écrit / « écrire puis dire ».** `chooseProductionMode(date, index)` alterne aujourd'hui selon `(jour + rang de la langue) % 2`. Avec des jours choisis, une langue travaillée lundi et mercredi tomberait toujours sur le même mode. La nouvelle règle compte les **jours travaillés de cette langue** depuis une date de référence fixe (fonction pure, à partir des `days` de la langue) et alterne sur ce compte ; tests sur lundi-mercredi, lundi-mardi et tous les jours.
7. **Accueil et série de jours (J3).** Jour sans langue : l'accueil affiche « Jour de repos » avec, s'il y en a, les révisions de vocabulaire, de corrections et de grammaire (elles restent quotidiennes, elles ne dépendent pas des jours choisis). `computeStreak` (`src/lib/domain/stats.ts`) ne casse pas la série sur un jour de repos : il reçoit l'ensemble des jours travaillés et saute les autres. Attention : la série doit dépendre des jours **tels qu'ils étaient** à la date passée ; pour rester simple, on utilise les jours actuels (un changement de jours peut donc modifier la série affichée, accepté et noté dans le code).
8. **Données d'exemple** : la démo (`src/lib/data/mock/preferences.ts`) et `supabase/seed.sql` gardent tous les jours pour une langue et alternent pour l'autre, pour que l'écran « Semaine » se voie.

Tests : schéma (`days` vide, doublon, hors 1..7, absent) ; `isoWeekday`, `goalsForDate` ; validation par jour ; génération : jour de repos sans appel au modèle, budget du jour ; alternance des modes ; `computeStreak` avec jours de repos ; composant : puces et ligne « Semaine » ; intégration : `save_preferences` et `list_due_mission_users`.

## Phase N — Trier les contenus, choisir le thème de la mission

### Constat

- **Tri par type** : `/lire` filtre déjà par type (Tout / Lire / Regarder / Écouter, `?type=`), combinable avec la langue (phase F). Ce qui manque n'est pas clair : tri par niveau, par durée, par source, par date ? Ou ce filtre ailleurs (historique, mission) ?
- **Thèmes** : les contenus **n'ont pas de thème**. Les sujets choisis dans les préférences (`TOPICS`, 12 libellés, par langue) sont seulement envoyés au modèle dans le prompt (`src/lib/generation/prompt.ts`, l. 103-108), qui choisit parmi des candidats non étiquetés. On ne peut donc ni filtrer `/lire` par thème, ni garantir un thème pour la mission.
- La mission du jour est **générée à l'avance** par la tâche horaire (GitHub Actions). Choisir le thème « du jour » au moment où l'on ouvre l'app veut dire remplacer une session déjà générée (nouvel appel au modèle). Le mécanisme existe en partie : `replaceInaccessibleContent` / `replaceSession` (`src/lib/data/repository.ts`, l. 118-124), avec une limite de remplacements par jour.

### Décisions

Le « tri » voulu est un filtre par **domaine** (les thèmes `TOPICS` : sport, politique, sciences…). Le thème de la mission se choisit **pour le lendemain** seulement : pas de régénération le jour même. Reste à trancher N1.

### Proposition

1. **Étiqueter les contenus par thème** (N1).
   - Colonne `contents.topics text[]` (valeurs de `TOPICS`), migration ; index GIN.
   - Chaque source du catalogue (`src/lib/content/catalog.ts`) gagne `defaultTopics` facultatif (une chaîne de cuisine → `gastronomie`).
   - À l'ingestion, si la source n'a pas de thème fixe : classement du titre et de l'accroche par Claude Haiku 5.5 (effort `low`, par lots de 20, 1 à 3 thèmes parmi les 12, ou aucun). Les accroches sont déjà envoyées à Claude pour les missions : pas de changement de licence ni de confidentialité. Coût faible (texte court, une fois par contenu) ; `CONTENT_TOPICS=off` le coupe.
   - Script `npm run content:topics -- --backfill` pour les contenus déjà en base.
   - **À trancher N1** : classement par Haiku (*défaut*) ou seulement par source (gratuit, mais grossier : un site d'information couvre tous les thèmes).
2. **Filtre par domaine sur `/lire`** (N2) : `?theme=`, combinable avec la langue et le type ; puces horizontales défilantes au format téléphone, libellés de `TOPICS`. Chaque carte de contenu affiche ses domaines. L'ordre reste « plus récent d'abord ».
3. **Thème de la mission de demain** (N3), sans coût de génération en plus : sur l'écran de mission et sur l'accueil, par langue, « Demain, plutôt : <domaine> » (liste des domaines qui ont des contenus à son niveau, ou « Au hasard de mes sujets », valeur par défaut). Enregistré pour la date suivante dans une table `mission_requests(user_id, date, language, topic)` (RLS par utilisateur, une ligne par langue et par date, modifiable tant que la mission de cette date n'est pas générée ; ensuite, le choix affiché est figé et le dit). `generate-mission.ts` lit la demande et ne garde que les candidats de ce domaine ; s'il n'y en a aucun au bon niveau, repli sur tous les candidats et la mission l'indique (« Pas de contenu <domaine> à ton niveau aujourd'hui »). Avec M2, « demain » est le prochain jour où la langue est travaillée. Les lignes de plus de 30 jours sont purgées (tâche existante ou `on delete` du compte).
4. Tests : sélection des candidats par domaine et repli ; schéma `topics` ; classement (réponse du modèle hors liste rejetée) ; filtre `/lire` ; demande refusée pour une date déjà générée ; RLS de `mission_requests` (pgTAP).

Point d'attention : par langue et par niveau, certains thèmes auront peu de contenus (`npm run content:coverage` gagne une matrice thème × niveau par langue). Le choix d'un thème vide doit être désactivé, pas proposé puis refusé.

## Phase O — Bilan par compétence (refonte du test de niveau)

C'est la refonte annoncée du test de niveau (le test actuel surestime les hauts niveaux, voir mémoire du projet). Elle remplace l'idée de patcher le moteur actuel.

### Ce que proposent les notes

Un test en étapes : compréhension écrite, compréhension orale, expression écrite, expression orale, trois questions chacune ; réponses ouvertes (en français ou dans la langue étudiée) plutôt que des QCM, jugés trop faciles ; un seul document par test (un article de presse : une partie lue, une partie entendue, une production liée) ; puis la question de l'affichage : un niveau moyen ou un niveau par compétence.

### Décisions

- Le QCM reste le seul passage obligatoire ; le bilan complet est **facultatif mais recommandé** : proposé à la fin du QCM (bouton principal « Faire mon bilan complet », secondaire « Plus tard »), rappelé sur l'accueil tant qu'il n'est pas fait (carte refermable, qui revient une fois au bout de 14 jours, pas plus).
- Compréhension orale sur **enregistrements de natifs** (pas de synthèse vocale). Conséquence : un dossier n'est publié que lorsque son audio est enregistré et relu ; voir O2.
- L'utilisateur trouve les relecteurs du pilote (russe, italien), qui peuvent aussi être les voix.
- Restent ouverts : O2 (profil sans moyenne, *défaut*) et O4 (oral en auto-évaluation, *défaut*).

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
- **O2 — Audio enregistré par des natifs.**
  - *Ce que reçoit la voix* : pour chaque dossier, le script de la partie orale (texte exact), avec la durée visée par niveau et des consignes simples : débit naturel pour le niveau (lent et articulé en A1-A2, naturel en C1-C2), pièce calme, téléphone posé à 20-30 cm, pas de musique. Le script peut contenir de légères marques de l'oral (hésitations, reprises) à partir de B2. Un document `docs/assessment/recording-guide.md` (en français) explique tout cela au natif.
  - *Droits* : chaque voix signe une autorisation écrite (cession du droit d'utiliser l'enregistrement dans l'app, y compris dans une version payante, sans limite de durée, avec ou sans mention de son nom). Le dossier garde `audio.speaker` (prénom ou pseudonyme), `audio.licence` (`granted-commercial`) et `audio.recordedOn`. Pas d'autorisation, pas de publication. **L'utilisateur garde les autorisations signées hors du dépôt** (données personnelles).
  - *Format* : la voix envoie un fichier quelconque (mémo vocal) ; `npm run assessment:audio -- <fichier> <id du dossier>` le normalise (ffmpeg : mono, 44,1 kHz, volume normalisé, silences de début et de fin coupés, AAC `.m4a` ~64 kb/s, lisible sur iPhone) et vérifie la durée par rapport à la cible du niveau (±30 %). Fichiers servis comme fichiers statiques depuis `public/assessment/<langue>/<id>.m4a` (quelques centaines de Ko chacun ; à déplacer vers Supabase Storage si le volume grandit).
  - *Publication* : un dossier est visible quand `reviewedOn` (texte relu) **et** `audio` sont renseignés ; `npm run assessment:check` le vérifie et signale les dossiers sans audio. Brouillons visibles en local avec `ASSESSMENT_DRAFTS=show` ; sans audio, la compréhension orale y affiche le script à la place, marqué « brouillon ».
  - *Lecteur* : composant client avec compteur d'écoutes (3 au plus, contrôlé côté client et enregistré avec les réponses), sans barre de position (on ne réécoute pas un passage précis), pas de vitesse réglable ; le script n'est jamais envoyé au navigateur avant la fin de l'épreuve.
  - *Repli* : une langue sans enregistrement publié pour un niveau propose le bilan sans compréhension orale, et le profil l'indique (« non évaluée »).
- **O3 — Données.** Tables `assessments` (utilisateur, langue, dossier, réponses, résultat par compétence, confiance, version du prompt, date) et colonne `user_languages.production_level` (facultative ; à défaut, le niveau unique). RLS par utilisateur ; quota de corrections par jour (comme `writing_feedback`). La génération de mission lit `production_level` pour la consigne de production.
- **O4 — Écrans.** `/niveau/[langue]/bilan` : quatre étapes avec progression, réponses enregistrées au fur et à mesure (reprendre plus tard), puis le profil par compétence. Lien depuis `/niveau` et l'accueil (« Refais ton bilan », 60 jours après le précédent).
- **O5 — Extension** aux 17 autres langues, après validation du pilote et relecture native.

Confidentialité : la politique mentionne l'envoi des réponses du bilan à Anthropic pour correction (comme les productions écrites). Les enregistrements sont servis par l'app elle-même : aucun tiers. Les voix sont des personnes : leurs prénoms ou pseudonymes seulement dans le dépôt, autorisations hors du dépôt.

Coût : un appel Haiku par bilan (textes courts) ; l'audio ne coûte rien à l'usage mais demande du temps humain (pilote : 1 enregistrement par niveau et par langue, soit 6 par langue et 12 en tout ; un second dossier par niveau, pour refaire le bilan, viendra ensuite). À mesurer pendant le pilote.

### À trancher

- **O2** : affichage d'un profil par compétence sans moyenne (*défaut*), ou aussi un niveau global ?
- **O4** : expression orale en auto-évaluation pour la v1 (*défaut*), ou attendre la phase E pour faire l'oral enregistré ?

Tranchés le 2026-10-27 : QCM obligatoire puis bilan facultatif recommandé ; enregistrements de natifs ; relecteurs et voix trouvés par l'utilisateur.
