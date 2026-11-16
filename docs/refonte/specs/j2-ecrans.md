# Jalon 2 — Écrans de la boucle quotidienne

Maquettes : `docs/refonte/maquettes/j2/j2-ecrans.html` (36 états, chacun en clair et en sombre côte à côte, cadre de 390 × 844). La planche a deux boutons de test, « Écran de 360 px » et « Libellés +40 % », et une fonction `auditPhones()` (console) qui liste ce qui dépasse d'un cadre.

Sources : `e-direction-artistique.md` (fait foi pour le visuel), `a-vision-et-principes.md`, `b-modele-pedagogique.md` §3 et §6, `c-game-design.md` §2.1, §3.1, §3.2, §3.7, §3.8, §3.10, `README.md` points 9, 10, 13, l'app du jalon 1 (`apps/web/src`) et `packages/i18n/messages/fr.json`.

Ce document fixe l'interface. Le contenu des étapes (types d'exercices, langue des questions, longueur des textes) relève de `j2-seance-contenu.md`, et le calcul de l'XP et de la série relève de `j2-jeu-xp-serie.md`. Les chiffres des maquettes appliquent le barème de `c-game-design.md` §2.1 ; ils sont à recaler si ces deux specs le modifient.

## 0. Décisions de cadrage

| Sujet | Décision | Pourquoi |
|---|---|---|
| Noms des étapes | Réveil, Lecture, Atelier, Expression, Élan, Bilan, numérotées I à VI | Ce sont les noms de la vision et du brief. La direction artistique (§2) disait « Révisions, Texte, Focus, Écriture, Fluidité, Bilan » : à aligner (point à trancher n° 1) |
| Onglets | Deux, comme au jalon 1 : Aujourd'hui, Réglages | « Parcours », « Lire » et « Progrès » n'ont pas encore de contenu ; un onglet vide contredit « dire la vérité » |
| Objectif du jour | Dérivé de la durée de séance : 5 XP par minute (10 min = 50, 15 = 75, 20 = 100, 30 = 150) | C'est déjà le calcul du jalon 1 (`apps/web/src/lib/goal.ts`). Un seul réglage au lieu de deux qui se contredisent |
| Langue cible des maquettes | Apprenant francophone de russe, B1, jour 24 | Langue pilote, écriture différente ; la continuité avec le jalon 0 (texte « Ярмарка ») permet de montrer les révisions tirées d'un texte déjà lu |
| Mascotte | Aucune au jalon 2 | Voir le point à trancher n° 2 |

### Budget de densité, mesuré dans la planche

| Écran | Blocs au-dessus de la ligne | Bouton plein | Décor |
|---|---|---|---|
| Aujourd'hui, avant / reprise | 3 (en-tête, bloc séance, ligne d'état) | 1 | Anneau |
| Aujourd'hui, séance faite | 3 | 0 (bouton à contour) | Anneau tamponné |
| Étapes de séance | 2 au plus (consigne ou carte, réponse) ; barre de séance et pied hors budget | 1, dans le pied ou la feuille | 0, ou le tampon « Juste » |
| Bilan | 2 (tête tamponnée, lignes de résultats) | 1 (« Terminer ») | Le tampon « Bon à tirer » |
| Feuilles (série, rappel, grille, XP) | 2 à 3 | 0 ou 1 | 0 ou le tampon dateur |
| Réglages | 1 liste groupée | 0 | 0 |

Vérifié à 390 et à 360 px, libellés normaux puis allongés de 40 % : le bloc séance et la ligne d'état restent au-dessus de la ligne de flottaison dans les six états de l'accueil, aucun élément ne dépasse de son cadre.

## 1. Tokens

Le paquet installé est `@sdmm/design` v1.0.0. Il **ne contient pas encore** les tokens de rôle de la direction artistique (§9). Les maquettes les utilisent avec leurs valeurs de la direction artistique. **Tokens à ajouter** au thème `dailylingua` (version mineure du paquet) avant les écrans :

| Token | Clair | Sombre | Usage au jalon 2 |
|---|---|---|---|
| `--sd-success` / `--sd-success-soft` | `#2f6b4f` / `#e0eee5` | `#7fc29d` / `#1b3326` | Feuille « Juste », option juste, segment validé, jour de série |
| `--sd-success-ink` | `#ffffff` | `#0f0e0c` | Texte et coche posés sur `success` |
| `--sd-error` / `--sd-error-soft` | `#a33a32` / `#f6e1de` | `#ec8f86` / `#3e1f1c` | Feuille « À revoir », ratures, étiquettes de correction |
| `--sd-streak` / `--sd-streak-soft` | `#9a4322` / `#f6e6dc` | `#e2825c` / `#3b261c` | Chiffre de série, tampon dateur |
| `--sd-xp` / `--sd-xp-soft` | `#8a5a00` / `#f6ead0` | `#e8b85a` / `#33280f` | Compteur de séance, gains, relevé |
| `--sd-border-strong` | `#8b8478` | `#6f685e` | Bords de champs, d'options, de pastilles (le jalon 1 utilise `border-muted` en attendant) |
| `--sd-accent-soft` | `#e5e9f4` | `#222a42` | Halo de focus d'un champ ou d'une option choisie. **Nouveau, absent de la direction artistique** |
| `--sd-scrim` | `rgb(15 14 12 / .42)` | `rgb(0 0 0 / .62)` | Voile sous une feuille. **Nouveau** |
| `--sd-radius-sheet` | 20 px | 20 px | Feuilles montantes |
| `--sd-dur-celebrate` / `--sd-dur-sequence` | 600 ms / 1 600 ms | idem | Tampon du bilan, séquence de fin |

Le jalon 1 affiche ses erreurs de formulaire en `danger`. La direction artistique sépare `error` (encre du correcteur, exercices) de `danger` (statut commun). Au jalon 2, `FormMessage` garde `danger` pour les formulaires de compte ; tout retour d'exercice utilise `error`.

## 2. Composants

### À réutiliser (jalon 1)

| Composant | Fichier | Usage au jalon 2 |
|---|---|---|
| `Button`, `buttonClass` | `components/ui/button.tsx` | `primary` = le seul bouton plein ; `secondary` = bouton à contour (passer `border-strong` quand le token existe) |
| `TextField`, `FormMessage` | `components/ui/field.tsx` | Champ de réponse en mode trou ou traduction (à étendre, voir `AnswerField`) |
| `GoalRing` | `components/today/goal-ring.tsx` | Anneau de l'accueil et du bilan (à étendre, voir plus bas) |
| `TabBar` | `components/layout/tab-bar.tsx` | Inchangée (deux onglets) |
| `LearningSettings` | `components/settings/learning-settings.tsx` | L'heure du rappel en sort et passe dans le groupe « Rappel » |

### À étendre

- **`GoalRing`** : ajouter `state: "open" | "closed" | "provisional"`, `stamped?: boolean`, `size?: "md" | "lg"` (88 px à l'accueil, 148 px au bilan), `showValue?: boolean` (faux si l'XP est masquée). `provisional` dessine l'arc en `border-strong` pointillé : XP gagnée hors ligne, pas encore confirmée par le serveur. Le libellé accessible devient « Objectif du jour : 53 sur 75 XP, en attente de synchronisation ».
- **`Button`** : ajouter `aria-disabled` rendu en `surface-2` / `muted` (4,68 et 6,30:1), jamais l'opacité 50 % actuelle, qui fait tomber le texte sous 4,5:1. Le bouton reste focalisable et dit pourquoi il est inactif (`aria-describedby`).

### À créer

Tous en propriétés logiques (`ps-`, `pe-`, `start-`), textes passés déjà traduits, aucune langue en dur (`languageStyle()` pour la pastille de langue).

| Composant | Props | Rôle |
|---|---|---|
| `TodaySessionCard` | `state: "start" \| "resume" \| "done" \| "notDownloaded" \| "loading"`, `goal: { current, target, state }`, `language`, `title?: { l1, l2 }`, `minutes`, `resume?: { step: 1-6, label }`, `tomorrow?: string`, `offline: boolean`, `readyOffline: boolean`, `reviewsDue?: number` | Le bloc séance de l'accueil, dans ses six états |
| `StatusLine` | `streak?: number`, `weekXp?: number`, `onOpen()` | Ligne d'état sous le bloc séance ; absente si la série est coupée dans les réglages et le jour 1 |
| `OfflineBadge` | `label` | Pastille « Hors ligne » (`surface-2`, texte `ink`, icône Wi-Fi barré) |
| `SessionShell` | `step: 1-6`, `stepProgress: 0-1`, `sessionXp?: number`, `offline: boolean`, `meta: string[]`, `footer?: ReactNode`, `onPause()` | Enveloppe commune : barre, ligne mono, zone défilante, pied d'action au-dessus du clavier |
| `SessionBar` | `step`, `stepProgress`, `sessionXp?`, `offline`, `onPause` | Fermer (44 px), six segments, compteur d'XP ou pastille hors ligne |
| `PauseSheet` | `resumeAt: string`, `xpKept: number`, `onContinue()`, `onLeave()` | Feuille de pause |
| `BottomSheet` | `open`, `labelledBy`, `tone?: "neutral" \| "rule" \| "success" \| "error"`, `dismissible?: boolean`, `onClose()` | Feuille montante commune (poignée, voile, piège de focus, glisser pour fermer) |
| `ChoiceList` | `options: { id, label, lang? }[]`, `value?`, `result?: { chosen, correct }`, `onChange` | Réponses à choisir (`radiogroup`) ; après vérification : juste / à revoir, avec mot et icône |
| `AnswerField` | `label`, `lang`, `value`, `state: "idle" \| "focus" \| "correct" \| "redo"`, `attempt?: 1 \| 2` | Réponse tapée, 20 px, `autocapitalize="off"`, `spellcheck="false"`, `lang` de la langue cible (clavier adapté) |
| `ExerciseCard` | `instruction`, `prompt: ReactNode`, `promptLang`, `hint?`, `source?`, `badge?` | Carte d'exercice (consigne mono, phrase serif 22-25 px, indice, « Tiré de… ») |
| `FeedbackSheet` | `verdict: "correct" \| "redo"`, `expected`, `expectedLang`, `yourAnswer?`, `explanation`, `nextReview?`, `xp?`, `attempt?`, `onContinue()`, `onDispute?()` | Retour d'exercice ; `onDispute` = « J'avais raison » |
| `StepEndSheet` | `step`, `title`, `facts: { label, value, tone? }[]`, `nextLabel`, `onNext()` | Fin d'étape (utilisée pour le Réveil ; les autres étapes enchaînent sans arrêt) |
| `ReadingView` | `title: { l2, l1? }`, `meta`, `paragraphs: string[][]`, `lang`, `currentSentence?: number` | Texte gradué à 19 px, sans mots touchables ; phrase lue sur `surface-2` |
| `ReadAloudButton` | `state: "idle" \| "playing" \| "paused" \| "unavailable"`, `onToggle()` | Voix de l'appareil (`speechSynthesis`) ; masqué si aucune voix de la langue n'est installée |
| `ListenOnlyPrompt` | `passageId`, `state`, `onPlay()` | Gros bouton d'écoute (96 px) pour la question sans texte |
| `WordList` | `words: { lemma, display, gloss, lang }[]` | Mots de l'atelier, une ligne chacun, bouton écouter |
| `GrammarNote` | `title`, `body: ReactNode` | Encadré du point du jour (double filet en tête) |
| `WritingField` | `lang`, `value`, `minWords`, `wordCount`, `onChange` | Zone d'écriture (17 px, 190 px de haut au moins), compteur de mots |
| `CorrectionText` | `segments: ({ text } \| { wrong, right, ref })[]`, `lang` | Texte de l'apprenant avec ratures et corrections numérotées |
| `CorrectionList` | `items: { ref, category, explanation }[]` | Explications en L1, une ligne par correction, étiquette de catégorie |
| `CriteriaSheet` | `total`, `max`, `criteria: { key, score, max, comment }[]`, `aiNotice` | Grille en quatre critères |
| `RewriteCheck` | `results: { sentence, applied: boolean, fix?, xp? }[]` | Résultat de la réécriture |
| `PendingState` | `kind: "waitingNetwork" \| "quota" \| "error"`, `title`, `body`, `preview?`, `primary`, `secondary?` | Écran d'attente ou d'échec de l'expression |
| `Stopwatch` | `startedAt`, `hidden`, `onToggleHidden()` | Chrono qui monte, mis à jour chaque seconde visuellement, jamais annoncé |
| `SessionSummary` | `date`, `language`, `edition: number`, `xp`, `title`, `rows: SummaryRow[]`, `tomorrow`, `onFinish()` | Écran de bilan |
| `XpLedgerSheet` | `lines: { label, detail?, xp }[]`, `total` | Relevé d'XP à points de conduite |
| `SoundOfferSheet` | `onAccept()`, `onDecline()` | Proposition unique des sons |
| `StreakSheet` | `state: "running" \| "restarted"`, `days`, `last7: { date, kind: "done" \| "freeze" \| "rest" \| "missed" \| "today" \| "future" }[]`, `freezes: { left, max: 3 }`, `record`, `previous?: { days, cards, texts }`, `repair?: { available: boolean, until: "today" \| "tomorrow" }` | Feuille de série |
| `DateStamp` | `days`, `animate` | Tampon dateur (chiffre serif 44 px) |
| `WeekStrip` | `days: last7` | Sept pastilles, forme et texte pour chaque état |
| `ReminderSheet` | `defaultTime: "19:00"`, `example: string`, `onEnable(time)`, `onLater()` | Demande de rappel, PWA installée |
| `InstallHintSheet` | `onDone()`, `onLater()` | Variante Safari non installé |
| `SettingsGameGroup` | profil et préférences de jeu | Groupes Séance, Série, Rappel, Jeu |
| `Toast` | `message`, `durationMs = 4000` | « On reprend à… » ; `role="status"`, n'intercepte pas les touchers |

## 3. Écrans

Pour chaque écran : but, action principale, contenu au-dessus de la ligne de flottaison, états, textes, accessibilité, animation. Les clés i18n proposées sont regroupées au §4.

### 3.1 Aujourd'hui (accueil) — maquettes 01 A à F

**But** : lancer la séance du jour sans rien choisir, ou voir qu'elle est faite.
**Action principale** : « Commencer la séance », ou « Reprendre · étape III sur VI ». Aucune une fois la séance faite.

**Au-dessus de la ligne** : en-tête réduit (nom, date du jour d'étude) ; bloc séance (anneau, langue, titre du texte en L1 et en L2, durée, mention « Prête hors ligne », bouton) ; ligne d'état (série, XP de la semaine, chevron). En dessous : « Révisions dues » et « Erreur d'hier », une ligne chacune ; la correction en attente apparaît ici quand elle arrive (« Correction prête · réécrire 2 phrases »).

| État | Ce qui change |
|---|---|
| Avant la séance (A) | Anneau vide, « La séance du jour suffit à fermer l'anneau. », durée, « Prête hors ligne » quand le texte, l'audio et les exercices sont en cache |
| Reprise (B) | Anneau partiel, « 22 XP de plus ferment l'anneau. », phrase « Tu t'es arrêté à l'atelier, exercice 3 sur 6. Rien n'est perdu. », bouton « Reprendre · étape III sur VI » |
| Faite (C) | Anneau fermé et tamponné « Bon à tirer » (fixe, l'animation a eu lieu au bilan), titre factuel, « Demain : … », bouton à contour « Revoir le bilan » |
| Hors ligne, séance en cache (D) | Pastille « Hors ligne » en tête du bloc, « Prête hors ligne. Seule la correction de ton texte attendra le réseau. » L'XP gagnée hors ligne fait avancer l'anneau en pointillé (`provisional`) |
| Hors ligne, séance absente (E) | Titre « Le texte du jour arrive avec le réseau. », bouton plein « Faire mes 20 révisions » (les cartes dues sont en cache). S'il n'y a ni séance ni carte : pas de bouton plein, phrase « Rien à faire hors ligne pour l'instant. Tout se télécharge dès ton retour en ligne. » |
| Chargement (F) | En-tête réel, bloc et ligne en aplats `surface-2` (pulsation de 1,6 s, coupée si mouvement réduit), `aria-busy`, texte masqué « Un instant… » |
| Séance en préparation (en ligne, texte en cours de génération) | Comme A, mais la mention devient « Texte en préparation… » et le bouton reste actif : la séance commence par le Réveil pendant que le texte se termine |
| Erreur de chargement | Bloc remplacé par « Impossible de charger la séance pour le moment. » et un bouton à contour « Réessayer » ; la ligne d'état reste si elle est en cache |
| Jour 1 | Pas de ligne d'état (dévoilée au jour 2, direction artistique §5) |
| Série coupée dans les réglages | Ligne d'état sans la série ; si l'XP est aussi masquée, la ligne disparaît sans laisser de place vide |

**Accessibilité** : `h1` caché « Aujourd'hui » ; le titre du texte est le `h2` du bloc (`aria-labelledby`). Anneau en `progressbar` (« Objectif du jour : 53 sur 75 XP »). Le titre en L2 porte son `lang`. Ligne d'état : un lien unique au nom complet (« Série : 23 jours de suite. 412 XP cette semaine. Voir le détail »). Ordre de focus : date, bouton de séance, ligne d'état, lignes sous la flottaison, onglets. La pastille hors ligne est un `role="status"` annoncé une fois au passage hors ligne.

**Animation** : aucune à l'arrivée. Au retour du bilan, l'arc est déjà fermé (pas de seconde célébration).

### 3.2 Séance — enveloppe commune — maquette 02

**But** : avancer étape par étape sans décision, pouvoir s'arrêter à tout moment sans rien perdre.
**Action principale** : celle de l'étape, dans le pied d'action fixe (52 px, pleine largeur, au-dessus du clavier et de `safe-area-inset-bottom`).

**Structure** : barre de séance (fermer, six segments, compteur d'XP de la séance) ; ligne mono « Étape II sur VI · Lecture · Question 2 sur 4 » ; zone défilante ; pied d'action. La route est `/session` ; l'étape et l'exercice courants sont dans l'état local persistant (IndexedDB), pas dans l'URL, pour que la reprise et le hors ligne marchent sans le serveur.

| État | Comportement |
|---|---|
| Pause | Fermer ouvre `PauseSheet` : « Séance en pause », où l'on reprendra, XP déjà acquise, « Continuer la séance » (plein), « Quitter pour l'instant » (contour). Glisser la feuille vers le bas vaut « Continuer » |
| Quitter | Retour à l'accueil en état « Reprise ». Aucune alerte de confirmation |
| Reprise | Ouverture sur l'exercice exact, toast « On reprend à l'atelier, exercice 3 sur 6. » pendant 4 s |
| Hors ligne | La pastille « Hors ligne » remplace le compteur d'XP ; la ligne mono ajoute « Hors ligne ». Tout continue sauf l'envoi de l'expression |
| Reprise le lendemain (après 04:00) | La séance d'hier n'est pas reprise : l'accueil propose celle du jour ; le travail d'hier reste compté pour hier (journée d'étude, game design §3.1) |
| Erreur d'enregistrement local (quota du navigateur) | Bandeau `FormMessage` « Cet appareil n'a plus de place pour garder tes réponses hors ligne. » ; la séance continue en ligne |
| XP masquée (réglage) | Pas de compteur dans la barre |

**Accessibilité** : la barre de segments est un `progressbar` (`aria-valuenow` = étape, `aria-valuetext` = « Étape 2 sur 6, Lecture »). Fermer : `aria-label` « Mettre la séance en pause ». À chaque nouvelle étape, le focus va au titre ou à la consigne de l'étape (`tabindex="-1"`), annoncé par la région `polite` de la ligne mono. Ordre : fermer, consigne, contenu, pied d'action. Le compteur d'XP n'est pas une région vivante (il change trop souvent) ; les gains sont annoncés par les feuilles de retour.

**Animation** : changement d'étape, glissement de 24 px dans le sens de lecture (inversé en RTL), 250 ms `ease-out` ; le segment terminé se remplit d'encre (`.sd-ink`, 400 ms). Mouvement réduit : fondu de 100 ms, segment rempli d'un coup.

### 3.3 I · Réveil — maquettes 03 A à E

**But** : rappeler ce qui est dû, en commençant par l'erreur d'hier.
**Action principale** : « Vérifier », puis « Continuer » dans la feuille de retour.

**Au-dessus de la ligne** : la carte d'exercice et la zone de réponse (options ou champ).

| Mode | Présentation |
|---|---|
| Reconnaître (L2 → L1) | Phrase cible avec le mot souligné, trois ou quatre options en L1, choix puis « Vérifier » (pas de validation au toucher, pour éviter les erreurs de doigt) |
| Traduire (L1 → L2) | Phrase ou groupe en L1 en serif, champ de 20 px en langue cible |
| Trou | Phrase cible avec le trou, indice (lemme et sens), champ |
| Erreur d'hier | Pastille « Ton erreur d'hier » en tête de la carte, rappel de ce qui avait été écrit ; toujours la première carte du jour |

| État | Comportement |
|---|---|
| Juste | `FeedbackSheet` en `success-soft` à double filet : tampon « Juste », gain d'XP, forme complète, une phrase sur le mot, « Prochaine révision : dans 9 jours », bouton « Continuer » en `success` |
| À revoir | Feuille en `error-soft` : « À revoir » (mono, icône de rature), réponse attendue entière, ta réponse avec la partie à revoir barrée, une phrase d'explication en L1, « Elle revient en fin d'étape, puis demain », « Continuer » et le lien « J'avais raison » |
| J'avais raison | La réponse est acceptée, la carte est notée juste, l'XP correspondante est créditée ; un toast « Noté. Merci. » ; le signalement est journalisé pour revue |
| Deuxième essai | Pas au Réveil (une carte ratée revient en fin d'étape) |
| Fin d'étape (D) | `StepEndSheet` : « Réveil fait : 20 cartes revues. », justes du premier coup, ce qui revient demain, XP de l'étape, « Passer à la lecture » |
| Aucune carte due | L'étape est sautée ; la ligne mono de la Lecture dit « Rien à réviser aujourd'hui » et le segment I se remplit sans animation |
| Plafond de temps atteint (20 % de la séance) | La carte en cours se termine, puis `StepEndSheet` avec « Les 6 cartes restantes passent à demain. » |
| Reprise après absence (≥ 3 jours) | Au plus 20 cartes ; aucune mention de l'absence ni du retard |

**Accessibilité** : options en `radiogroup` de `radio` (flèches pour changer, Espace pour choisir). L'état après vérification est porté par un mot (« Ta réponse », « Réponse juste ») et une icône, pas par la couleur. Les feuilles de retour sont des `role="status"` (région `polite`) qui reçoivent le focus sur leur titre ; « Continuer » est le premier élément suivant. Phrases cibles avec `lang`. La touche Entrée du clavier vaut « Vérifier », puis « Continuer ».

**Animation** : feuille montante 250 ms `ease-out`. Juste : tampon `.sd-stamp` 300 ms et « +1 XP » qui monte de 8 px. À revoir : rature tracée en 200 ms (`.sd-strike`), aucune secousse. Mouvement réduit : apparition en fondu de 100 ms, tampon sans échelle ni rotation.

### 3.4 II · Lecture — maquettes 04 A à C

**But** : lire et écouter un texte gradué en entier, puis montrer qu'on l'a compris.
**Action principale** : « Aux questions » (pendant la lecture), puis « Vérifier » (questions).

**Au-dessus de la ligne** : titre en L2 (et en L1 en italique), métadonnées (« 95 mots · environ 2 min »), le texte. Pas de toucher-un-mot au jalon 2 (lecteur tactile au jalon 3).

| État | Comportement |
|---|---|
| Lecture | Texte à 19 px, interligne 1,7. Pied : bouton à contour « Écouter » et bouton plein « Aux questions », actif quand le bas du texte a été atteint (preuve de lecture, game design §2.1) ; sinon le bouton reste actif et fait défiler jusqu'à la fin |
| Écoute en cours | Le bouton devient « Pause » (`aria-pressed`) ; la phrase lue passe sur `surface-2`, sans défilement automatique si l'utilisateur a fait défiler à la main |
| Voix absente | « Écouter » est masqué ; une ligne discrète sous les métadonnées : « Pas de voix russe sur ce téléphone : la lecture se fait sans le son. » ; la question d'écoute seule est remplacée par une question écrite |
| Question écrite (B) | Question en L2 (au niveau B1 ; langue des questions selon `j2-seance-contenu.md`), trois options, lien « Revoir le texte » qui ouvre le texte en feuille plein écran sans quitter la question |
| Écoute seule (C) | Gros bouton d'écoute, « Écoute le passage, sans le texte », « Voix de ton téléphone · réécoute autant que tu veux » ; les options restent visibles ; « Vérifier » inactif tant que le passage n'a pas été écouté une fois |
| Retours | Mêmes feuilles que le Réveil ; l'XP du texte n'est créditée qu'à la fin des questions (« Texte lu, compréhension 3 sur 4 : +15 XP » dans la feuille de la dernière question) |
| Texte en préparation | Écran d'attente « Ton texte se prépare… » avec aplats de chargement ; s'il dépasse 20 s : « Il arrive. En attendant, on peut faire l'atelier sur les mots d'hier. » (bouton à contour) |

**Accessibilité** : le texte est un `article` avec `lang="ru"`, titre `h1`. La phrase lue porte `aria-current="true"` ; aucune annonce pendant la lecture. Bouton d'écoute seule : `aria-label` « Écouter le passage ». « Revoir le texte » ouvre une feuille modale qui rend le focus à la question à la fermeture.

**Animation** : aucune pendant la lecture (direction artistique §4). Le surlignage de la phrase change sans transition.

### 3.5 III · Atelier — maquettes 05 A à C

**But** : fixer 5 à 8 mots du texte et le point de grammaire qu'il contient.
**Action principale** : « S'exercer avec ces mots », puis « Vérifier ».

**Au-dessus de la ligne** : liste des mots (un bloc), ou encadré de grammaire et exercice.

| État | Comportement |
|---|---|
| Mots (A) | `WordList` : mot accentué en serif, sens en L1, bouton écouter. Phrase : « Ils entrent dans tes révisions dès demain. » |
| Grammaire et trou (B) | `GrammarNote` (titre, deux phrases d'explication en L1, exemples tirés du texte), puis l'exercice. L'encadré reste visible pendant tous les exercices de grammaire ; il se replie en une ligne « Le point du jour » quand le clavier est ouvert |
| Transformation (C) | Phrase source, flèche, phrase à compléter |
| Deuxième essai | Après une première réponse à revoir, la feuille propose « Réessayer » (plein) et montre l'indice ; au deuxième essai, la réponse est donnée. « Juste au deuxième essai » rapporte 1 XP, dit dans la feuille |
| Reprise (B) | Toast « On reprend à l'atelier, exercice 3 sur 6. » |
| Séance de 10 min | L'atelier alterne avec l'élan un jour sur deux ; un jour sans atelier, le segment III porte la mention « Demain » dans la ligne mono et se remplit en hachures |

**Accessibilité** : liste `ul` ; chaque bouton d'écoute est nommé « Écouter « каток » ». L'encadré de grammaire est un `aside` nommé par son titre. Le reste comme au Réveil.

**Animation** : celles des retours (§3.3).

### 3.6 IV · Expression — maquettes 06 A à G

**But** : produire un texte à partir de celui du jour, lire sa correction, réécrire de mémoire ce qui était faux.
**Action principale** : « Envoyer pour correction », puis « Réécrire deux phrases », puis « Vérifier ma réécriture », puis « Continuer vers l'élan ».

**Au-dessus de la ligne** : la consigne et la zone d'écriture ; puis la correction (lignes « Grille » et « Version d'un natif », texte raturé, explications).

| État | Comportement |
|---|---|
| Écriture (A) | Consigne en serif 20 px, conseil d'une ligne, zone de 17 px (`lang` cible, `autocorrect="off"`, `spellcheck="false"`), compteur « 30 mots » et « À partir de 60, il compte pour l'XP ». Envoi possible dès une phrase : écrire moins n'est jamais bloqué. Brouillon sauvegardé localement à chaque frappe (anti-rebond 500 ms) |
| Envoi en cours | Bouton « Correction en cours… » (`aria-disabled`), aplats sous la zone ; la correction prend en général moins de 15 s |
| En attente du réseau (B) | « Ton texte est gardé. », explication, aperçu de trois lignes, « 62 mots · en attente d'envoi », bouton « Continuer vers l'élan ». Au retour du réseau, l'envoi part seul ; la correction arrive sur l'accueil (ligne sous la flottaison) et la réécriture se fait à ce moment-là |
| Correction (C) | Lignes « Grille de correction · 16 sur 20 · détail » et « Version d'un natif » ; texte avec ratures (`del` en `error`) et corrections (`ins` soulignées en `success`), appels numérotés ; une explication par correction, en L1, avec son étiquette (Cas, Forme, Calque, Orthographe, Ordre, Registre…) |
| Grille (D) | Feuille : quatre critères notés sur 5 (cases pleines et chiffre en toutes lettres), une phrase de commentaire en L1 chacun, « Correction automatique par IA » |
| Aucune erreur | « Rien à corriger dans ce texte. » ; la réécriture est remplacée par une phrase plus naturelle à recopier de mémoire (« Pour aller plus loin ») ; pas d'XP de réécriture |
| Réécriture | Les une ou deux phrases à réécrire sont masquées ; consigne « Réécris les deux phrases corrigées, de mémoire » ; zone de 17 px ; « Vérifier ma réécriture » |
| Vérification (E) | Feuille : une ligne par phrase, « appliquée » (coche, +5 XP) ou « à revoir » (rature, forme attendue, « Elle ouvrira ta séance de demain »), lien « Corriger la phrase 2 » (un essai de plus) |
| Quota atteint (F) | « Les corrections d'aujourd'hui sont faites. », explication (deux par jour au plus), texte gardé et corrigé demain matin, « Continuer vers l'élan » |
| Budget IA du mois atteint | Même écran, texte : « Les corrections automatiques reprennent le 1er décembre. Ton texte est gardé. » ; à valider avec `g-budget.md` |
| Erreur (G) | « La correction n'a pas abouti. », texte gardé, « Réessayer » (plein) et « Continuer sans attendre » (contour) ; nouvelle tentative automatique en arrière-plan |
| Texte trop proche d'un précédent | La correction est faite ; une ligne sous la grille : « Ce texte ressemble beaucoup à celui de mardi : il est corrigé mais ne rapporte pas d'XP. » |
| Hors sujet ou mauvaise langue | « Ce texte n'a pas l'air d'être en russe. On le corrige quand même ? » avec « Corriger » et « Réécrire » (contour) |

**Accessibilité** : la zone d'écriture a un `label` visible (« Ton texte ») et le compteur en `aria-describedby`, annoncé seulement au seuil (`polite`, « 60 mots atteints »). Le texte corrigé est lisible en continu par un lecteur d'écran : chaque correction est rendue « угле, corrigé en углу » (texte masqué), suivie de l'appel de note. Les états d'attente, de quota et d'erreur portent leur titre en `h2` et l'erreur en `role="alert"`.

**Animation** : à l'arrivée de la correction, les ratures se tracent une à une (`.sd-strike`, 200 ms chacune, décalage 70 ms, 1,5 s au plus au total, passable d'un toucher) ; mouvement réduit : ratures affichées d'un coup.

### 3.7 V · Élan — maquettes 07 A à C

**But** : relire le texte du jour plus vite qu'à la première lecture.
**Action principale** : « Démarrer », puis « J'ai fini », puis « Voir le bilan ».

| État | Comportement |
|---|---|
| Consigne (A) | Titre « Relis le texte, un peu plus vite. », consigne, rappel du temps de première lecture |
| En cours (B) | Chrono qui **monte** dans un bandeau `surface-2`, bouton « Masquer » (préférence mémorisée) ; texte sans surlignage ; « J'ai fini » |
| Résultat (C) | Temps en grand, « Soit 58 mots par minute, contre 43 à la première lecture. », ligne « Passage de fluidité : +5 XP » |
| Pas plus rapide | « 2 min 20, soit 41 mots par minute. Le passage compte pour l'entraînement ; l'XP demande d'être au moins aussi rapide que 90 % de la dernière fois. » Pas de rouge, pas de comparaison chiffrée négative |
| Abandon | Fermer met en pause ; la relecture recommence au début à la reprise |
| Séance de 10 min | Alternance avec l'atelier (§3.5) |

**Accessibilité** : le chrono est un `role="timer"` avec `aria-live="off"` (jamais annoncé) ; « Masquer » est un bouton à bascule. Le résultat reçoit le focus et est annoncé (`polite`).

**Animation** : aucune ; le chrono change de chiffre sans transition.

### 3.8 VI · Bilan — maquettes 08 A à C

**But** : voir honnêtement ce que la séance a apporté et ce qui revient demain.
**Action principale** : « Terminer ».

**Au-dessus de la ligne** : date, langue et numéro d'édition ; anneau de 148 px tamponné « Bon à tirer · 94 XP » ; titre factuel ; quatre lignes (XP gagnés, Appris aujourd'hui, Erreur du jour, Série). Pied : « Demain : 16 révisions, dont « было холодно », puis un nouveau texte. » et « Terminer ».

| État | Comportement |
|---|---|
| Normal (A) | Une seule célébration : le tampon sur l'anneau. La série affiche son nouveau total sans animation propre |
| Relevé d'XP (B) | Feuille ligne par ligne, avec le détail de chaque ligne et une phrase sur les règles (« Une carte ne rapporte qu'une fois par jour. L'XP ne baisse jamais. ») |
| Appris aujourd'hui | Feuille : les mots passés en révision (lemme, sens) et le point de grammaire |
| Erreur du jour | Feuille : la phrase, la correction, l'explication en L1, « Elle reviendra demain en premier exercice. » |
| Correction en attente | La ligne « Erreur du jour » devient « Correction de ton texte · en attente du réseau » ; « Séance complète » n'est pas encore comptée et le relevé le dit (« compté quand ta réécriture sera faite ») |
| Anneau non fermé | Pas de tampon ; l'anneau montre l'arc, le titre reste factuel (« Séance faite : 3 étapes sur 6 aujourd'hui. ») |
| Célébrations réduites (réglage) | Tampon posé sans animation |
| XP masquée | Ligne « XP gagnés » absente, anneau sans chiffre ; le relevé reste accessible depuis les réglages |
| Première séance (C) | Après « Terminer », une feuille unique : « Un petit son à chaque bonne réponse ? », deux boutons à contour de même poids, « Non merci » en premier |
| Deuxième séance | Après « Terminer », la demande de rappel (§3.10) ; jamais les deux feuilles le même jour |
| Série +1, 7 jours, 30 jours | La carte plein écran du niveau 4 (game design §3.7) n'est pas au jalon 2 ; la ligne « Série » suffit |

**Accessibilité** : le titre est le `h1` ; l'anneau tamponné est une `img` nommée « Objectif du jour atteint, bon à tirer : 94 XP » (équivalent textuel de la célébration). Les lignes sont des boutons qui ouvrent leur feuille. Ordre : titre, lignes, phrase de demain, « Terminer ».

**Animation** : séquence de 1,6 s au plus : l'arc se ferme (600 ms), les quatre repères s'alignent (`.sd-register`, 250 ms), le tampon tombe (`.sd-stamp`, 450 ms, ressort). Un toucher n'importe où la termine. Le chiffre d'XP du tampon ne compte pas (une seule signature). Mouvement réduit ou célébrations réduites : état final affiché, fondu de 100 ms. Son (si activé) : cloche de composteur, une fois.

### 3.9 Série — maquettes 09 A et B

**But** : voir où en est la série et ce qui la protège, sans pression.
**Action principale** : aucune dans l'état normal ; « Faire l'édition de rattrapage » (contour) si elle est possible.

**Contenu** : tampon dateur (« 24 jours de suite ») ; « Les sept derniers jours » en pastilles avec une légende en mots ; lignes « Relâches en réserve · 2 sur 3 » et « Record · 31 jours » ; une phrase : « Une relâche est offerte chaque lundi. Elle couvre toute seule un jour sans séance. »

| État | Comportement |
|---|---|
| En cours (A) | Pastille pleine `success` et coche (séance faite), contour pointillé et icône de page (relâche), fond `surface-2` et tiret (repos choisi, jalon ultérieur), contour simple (à venir), anneau `ink` autour d'aujourd'hui |
| Relâche utilisée hier | À l'accueil, la ligne d'état ajoute une seule fois « · une relâche a couvert jeudi » ; aucun écran dédié |
| Recommencée (B) | « Nouvelle série : jour 1. Tes 23 jours précédents restent dans ton historique : 412 cartes réussies, 14 textes lus. » ; encadré pointillé « Édition de rattrapage » si elle est disponible (« Une séance de plus, aujourd'hui ou demain, en plus de celle du jour : ta série de 23 jours reprend. Possible une fois par mois. ») ; record |
| Rattrapage choisi | Une seconde séance, courte (10 min), démarre ; au bilan, la ligne « Série » dit « 24 jours, série reprise » |
| Rattrapage indisponible | L'encadré n'apparaît pas ; on ne dit pas pourquoi |
| Après 21 h | La feuille s'ouvre normalement si on la demande ; aucune mention de série ne s'affiche spontanément (game design §3.2) |
| Série désactivée | La feuille n'existe pas ; la ligne d'état ne la montre plus |
| Hors ligne | Les jours non synchronisés portent « en attente » (texte masqué et pastille en pointillé fin) |

**Accessibilité** : feuille `role="dialog"` nommée « Série ». Chaque pastille a un texte masqué (« Jeudi 12 : relâche ») ; les initiales des jours sont masquées aux lecteurs d'écran ; la liste est un `ol`. Le tampon dateur est du texte réel.

**Animation** : à l'ouverture le jour où la série vient d'augmenter, le tampon dateur s'abat (400 ms, ressort) ; les autres fois, il est fixe. Mouvement réduit : fondu de 100 ms.

### 3.10 Rappel quotidien — maquettes 10 A et B

**But** : proposer un rappel par jour, au bon moment, sans insister.
**Action principale** : « Activer le rappel » (PWA installée) ; aucune dans la variante Safari.

**Déclenchement** : une seule fois, après « Terminer » de la deuxième séance terminée, jamais à l'ouverture de l'app. Si l'utilisateur répond « Pas maintenant », la proposition ne revient pas d'elle-même : le réglage reste dans « Réglages › Rappel ».

| État | Comportement |
|---|---|
| PWA installée, iOS ≥ 16.4 (A) | Titre « Un rappel par jour ? », règles en une phrase, champ d'heure (`input type="time"`, 20 px, 19:00 par défaut ou l'heure déjà saisie au jalon 1), exemple de notification en texte, « Activer le rappel », « Pas maintenant », « Ton iPhone te demandera ensuite ton accord. » « Activer » déclenche `Notification.requestPermission()` dans le même geste |
| Autorisation accordée | Feuille fermée, toast « Rappel prévu chaque jour à 19:00. » |
| Autorisation refusée | Toast « Rappel non activé. Tu peux l'autoriser plus tard dans les réglages de ton iPhone. » ; le réglage affiche « Bloqué par l'iPhone » et la marche à suivre |
| Heure de nuit choisie (21:30-08:00) | Acceptée (c'est un choix explicite) ; note sous le champ : « Il arrivera à cette heure-là, même la nuit. » |
| Safari non installé (B) | « Pour recevoir un rappel, ajoute Daily Lingua à l'écran d'accueil. », trois gestes numérotés avec les libellés exacts de Safari, « Ta progression te suit : rien à refaire. », « J'ai compris » (contour), « Plus tard » (lien). Aucune demande d'autorisation |
| Navigateur sans Web Push | La proposition n'apparaît pas ; le réglage dit « Ce navigateur ne permet pas les rappels. » |

**Accessibilité** : `role="dialog"` nommé par le titre ; focus initial sur le titre ; le champ d'heure a un `label` visible ; l'exemple est marqué « Exemple » et lu comme du texte. Les libellés de Safari sont entre balises `kbd` stylées, avec l'icône de partage dessinée (pas de capture d'écran).

**Animation** : feuille montante 250 ms ; rien d'autre.

### 3.11 Réglages du jalon 2 — maquette 11

**But** : régler la séance et couper toute mécanique.
**Action principale** : aucune (chaque réglage s'enregistre seul, toast « Réglages enregistrés. »).

**Liste** (groupes dans cet ordre) :

| Groupe | Réglage | Contrôle | Défaut | Note |
|---|---|---|---|---|
| Séance | Durée de la séance | Segments 10 / 15 / 20 / 30 (44 px chacun) | 15 | « Vaut dès demain. Objectif du jour : 75 XP. » (objectif dérivé) |
| Série | Série | Interrupteur | Activée | Sous-titre : « Un jour compte dès ta séance faite. Relâches : 2 sur 3. » Désactivée : historique gardé, relâches gelées |
| Rappel | Rappel quotidien | Interrupteur | Selon la réponse à la proposition | « Un par jour au plus, jamais la nuit » ; bloqué par l'iPhone : texte et marche à suivre au lieu de l'interrupteur |
| Rappel | Heure | Ligne qui ouvre le sélecteur d'heure | 19:00 | Reprend `reminderTime` du jalon 1 |
| Jeu | Afficher l'XP | Interrupteur | Activé | Coupé : plus de compteur de séance, anneau sans chiffre, relevé du bilan masqué. L'XP continue d'être comptée |
| Jeu | Célébrations animées | Interrupteur | Activé | « Fixes si ton iPhone réduit les animations. » |
| Jeu | Sons | Interrupteur | **Coupé** | Activé : ligne « Volume » à trois niveaux apparaît dessous |
| — | Vibrations | Masqué dans la PWA iOS | — | Safari ne les permet pas |

Puis, sous la ligne de flottaison, les groupes du jalon 1 : Affichage, Apprentissage (sans l'heure de rappel, déplacée), Compte, lien « Outils de test ».

**Accessibilité** : chaque interrupteur est un `role="switch"` porté par toute la ligne (cible de 52 px au moins), nommé par le titre et décrit par le sous-titre. Les segments de durée forment un `radiogroup`. Les en-têtes de groupe sont des `h2`.

**Animation** : bascule 150 ms `ease-out` ; aucune en mouvement réduit.

## 4. Textes d'interface (clés proposées)

Clés existantes reprises : `today.goal.*`, `today.session.start`, `today.session.resume`, `common.actions.*`, `errors.network`, `settings.reminder.*`, `settings.saved`. `today.session.resume` reçoit l'étape en chiffres romains déjà formatés (`{current}` = « III »). Toutes les quantités passent par le pluriel ICU ; les chiffres par `Intl.NumberFormat` de la locale.

### today

| Clé | fr | en |
|---|---|---|
| `today.goal.toClose` | {count} XP de plus ferment l'anneau. | {count} more XP closes the ring. |
| `today.goal.closed` | Anneau fermé : {xp} XP. | Ring closed: {xp} XP. |
| `today.goal.pending` | en attente de synchronisation | waiting to sync |
| `today.session.textOfDay` | {language} · texte du jour | {language} · today's text |
| `today.session.length` | {count} min, du réveil au bilan. | {count} min, from warm-up to wrap-up. |
| `today.session.readyOffline` | Prête hors ligne | Ready offline |
| `today.session.readyOfflineLong` | Prête hors ligne. Seule la correction de ton texte attendra le réseau. | Ready offline. Only your writing's correction will wait for a connection. |
| `today.session.resumeAt` | Tu t'es arrêté à {step}, exercice {current} sur {total}. Rien n'est perdu. | You stopped at {step}, exercise {current} of {total}. Nothing is lost. |
| `today.session.doneTitle` | Séance faite : {summary}. | Session done: {summary}. |
| `today.session.tomorrow` | Demain : {reviews, plural, one {# révision} other {# révisions}}{error, select, none {} other {, dont « {error} »}}, puis un nouveau texte. | Tomorrow: {reviews, plural, one {# review} other {# reviews}}{error, select, none {} other {, including "{error}"}}, then a new text. |
| `today.session.seeSummary` | Revoir le bilan | See the wrap-up again |
| `today.session.notDownloadedTitle` | Le texte du jour arrive avec le réseau. | Today's text will arrive once you're online. |
| `today.session.notDownloadedBody` | Il se télécharge dès ton retour en ligne. Tes révisions sont déjà là. | It downloads as soon as you're back online. Your reviews are already here. |
| `today.session.reviewsOnly` | Faire mes {count} révisions | Do my {count} reviews |
| `today.session.nothingOffline` | Rien à faire hors ligne pour l'instant. Tout se télécharge dès ton retour en ligne. | Nothing to do offline for now. Everything downloads once you're back online. |
| `today.session.preparing` | Texte en préparation… | Text being prepared… |
| `today.session.loadError` | Impossible de charger la séance pour le moment. | The session can't be loaded right now. |
| `today.status.streak` | {count, plural, one {# jour de suite} other {# jours de suite}} | {count, plural, one {# day in a row} other {# days in a row}} |
| `today.status.weekXp` | {count} XP cette semaine | {count} XP this week |
| `today.status.aria` | Série : {streak}. {weekXp}. Voir le détail | Streak: {streak}. {weekXp}. See details |
| `today.status.freezeUsed` | une relâche a couvert {day} | a rest day covered {day} |
| `today.below.title` | Aussi aujourd'hui | Also today |
| `today.below.reviews` | Révisions dues | Reviews due |
| `today.below.reviewsValue` | {count} cartes, dans la séance | {count} cards, in the session |
| `today.below.yesterdayError` | Erreur d'hier | Yesterday's mistake |
| `today.below.correctionReady` | Correction prête · réécrire {count} phrases | Correction ready · rewrite {count} sentences |
| `common.offline` | Hors ligne | Offline |

### session (enveloppe et retours)

| Clé | fr | en |
|---|---|---|
| `session.steps.wake` / `read` / `workshop` / `express` / `momentum` / `summary` | Réveil / Lecture / Atelier / Expression / Élan / Bilan | Warm-up / Reading / Workshop / Writing / Momentum / Wrap-up |
| `session.stepOf` | Étape {roman} sur VI · {name} | Step {roman} of VI · {name} |
| `session.stepAria` | Étape {current} sur 6, {name} | Step {current} of 6, {name} |
| `session.counter` | {kind, select, card {Carte} question {Question} other {Exercice}} {current} sur {total} | {kind, select, card {Card} question {Question} other {Exercise}} {current} of {total} |
| `session.xpAria` | XP de la séance : {count} | Session XP: {count} |
| `session.pause.button` | Mettre la séance en pause | Pause the session |
| `session.pause.title` | Séance en pause | Session paused |
| `session.pause.body` | Tout ce que tu as fait est gardé sur ce téléphone. Tu reprendras ici : {where}. | Everything you've done is kept on this phone. You'll pick up here: {where}. |
| `session.pause.xpKept` | Les {count} XP déjà gagnés restent acquis. | The {count} XP you've earned stay yours. |
| `session.pause.continue` | Continuer la séance | Continue the session |
| `session.pause.leave` | Quitter pour l'instant | Leave for now |
| `session.resumeToast` | On reprend à {step}, exercice {current} sur {total}. | Picking up at {step}, exercise {current} of {total}. |
| `session.storageFull` | Cet appareil n'a plus de place pour garder tes réponses hors ligne. | This device has no room left to keep your answers offline. |
| `session.check` | Vérifier | Check |
| `session.next` | Continuer | Continue |
| `session.yourAnswer` | Ta réponse | Your answer |
| `session.correctAnswer` | Réponse juste | Correct answer |
| `feedback.correct` | Juste | Correct |
| `feedback.redo` | À revoir | Review again |
| `feedback.nextReview` | Prochaine révision : {when} | Next review: {when} |
| `feedback.comesBack` | Elle revient en fin d'étape, puis demain | It comes back at the end of this step, then tomorrow |
| `feedback.secondTry` | Au deuxième essai. | On the second try. |
| `feedback.retry` | Réessayer | Try again |
| `feedback.dispute` | J'avais raison | I was right |
| `feedback.disputeThanks` | Noté. Merci. | Noted. Thanks. |
| `feedback.xpGain` | +{count} XP | +{count} XP |

### Étapes

| Clé | fr | en |
|---|---|---|
| `session.wake.recognize` | Que veut dire le mot souligné ? | What does the underlined word mean? |
| `session.wake.translate` | Traduis en {language} | Translate into {language} |
| `session.wake.gap` | Complète la phrase | Complete the sentence |
| `session.wake.yesterdayError` | Ton erreur d'hier | Yesterday's mistake |
| `session.wake.youWrote` | Hier, tu avais écrit « {text} ». | Yesterday you wrote "{text}". |
| `session.wake.source` | Tiré de « {title} », lu le {date}. | From "{title}", read on {date}. |
| `session.wake.endTitle` | Réveil fait : {count, plural, one {# carte revue} other {# cartes revues}}. | Warm-up done: {count, plural, one {# card reviewed} other {# cards reviewed}}. |
| `session.wake.endFirstTry` | Justes du premier coup | Right first time |
| `session.wake.endTomorrow` | Reviendront demain | Coming back tomorrow |
| `session.wake.endXp` | Gagnés dans l'étape | Earned in this step |
| `session.wake.capped` | Les {count} cartes restantes passent à demain. | The remaining {count} cards move to tomorrow. |
| `session.wake.none` | Rien à réviser aujourd'hui | Nothing to review today |
| `session.wake.toReading` | Passer à la lecture | Go to the reading |
| `session.read.meta` | {words} mots · environ {minutes} min | {words} words · about {minutes} min |
| `session.read.listen` / `pause` | Écouter / Pause | Listen / Pause |
| `session.read.toQuestions` | Aux questions | To the questions |
| `session.read.noVoice` | Pas de voix {language} sur ce téléphone : la lecture se fait sans le son. | No {language} voice on this phone: reading works without sound. |
| `session.read.fromText` | D'après le texte | According to the text |
| `session.read.reviewText` | Revoir le texte | See the text again |
| `session.read.listenOnly` | Écoute le passage, sans le texte | Listen to the passage, without the text |
| `session.read.listenOnlyHint` | Voix de ton téléphone · réécoute autant que tu veux | Your phone's voice · replay as often as you like |
| `session.read.listenAria` | Écouter le passage | Play the passage |
| `session.read.preparing` | Ton texte se prépare… | Your text is being prepared… |
| `session.workshop.wordsTitle` | {count, plural, one {Un mot du texte} other {{count} mots du texte}} | {count, plural, one {One word from the text} other {{count} words from the text}} |
| `session.workshop.wordsNote` | Ils entrent dans tes révisions dès demain. | They join your reviews from tomorrow. |
| `session.workshop.practice` | S'exercer avec ces mots | Practise these words |
| `session.workshop.listenWord` | Écouter « {word} » | Listen to "{word}" |
| `session.workshop.pointOfDay` | Le point du jour | Today's point |
| `session.workshop.transform` | Transforme : {task} | Transform: {task} |
| `session.express.prompt` | Consigne | Task |
| `session.express.yourText` | Ton texte | Your text |
| `session.express.words` | {count, plural, one {# mot} other {# mots}} | {count, plural, one {# word} other {# words}} |
| `session.express.xpThreshold` | À partir de {count}, il compte pour l'XP | From {count} on, it counts for XP |
| `session.express.send` | Envoyer pour correction | Send for correction |
| `session.express.sending` | Correction en cours… | Correcting… |
| `session.express.waitTitle` | Ton texte est gardé. | Your text is saved. |
| `session.express.waitBody` | Il partira en correction dès que le réseau reviendra. Pas besoin d'attendre : continue la séance. La correction et la réécriture t'attendront sur l'accueil. | It will be sent for correction as soon as you're back online. No need to wait: carry on. The correction and the rewrite will be waiting on the home screen. |
| `session.express.waitMeta` | {count} mots · en attente d'envoi | {count} words · waiting to send |
| `session.express.grid` | Grille de correction | Marking grid |
| `session.express.gridValue` | {score} sur {max} · détail | {score} of {max} · details |
| `session.express.native` | Version d'un natif | A native speaker's version |
| `session.express.criteria.task` / `grammar` / `vocabulary` / `coherence` | Consigne / Grammaire / Vocabulaire / Cohérence | Task / Grammar / Vocabulary / Coherence |
| `session.express.score` | {score} sur {max} | {score} of {max} |
| `session.express.aiNotice` | Correction automatique par IA | Automatic correction by AI |
| `session.express.category.case` / `form` / `calque` / `spelling` / `order` / `register` | Cas / Forme / Calque / Orthographe / Ordre / Registre | Case / Form / Calque / Spelling / Word order / Register |
| `session.express.fixedAria` | {wrong}, corrigé en {right} | {wrong}, corrected to {right} |
| `session.express.toRewrite` | Réécrire {count, plural, one {une phrase} other {# phrases}} | Rewrite {count, plural, one {one sentence} other {# sentences}} |
| `session.express.rewritePrompt` | Réécris {count, plural, one {la phrase corrigée} other {les # phrases corrigées}}, de mémoire | Rewrite {count, plural, one {the corrected sentence} other {the # corrected sentences}} from memory |
| `session.express.checkRewrite` | Vérifier ma réécriture | Check my rewrite |
| `session.express.rewriteChecked` | Réécriture vérifiée | Rewrite checked |
| `session.express.rewriteApplied` | Phrase {n} : appliquée. | Sentence {n}: applied. |
| `session.express.rewriteRedo` | Phrase {n} : à revoir. | Sentence {n}: review again. |
| `session.express.rewriteTomorrow` | Elle ouvrira ta séance de demain. | It will open tomorrow's session. |
| `session.express.fixSentence` | Corriger la phrase {n} | Fix sentence {n} |
| `session.express.nothingToFix` | Rien à corriger dans ce texte. | Nothing to fix in this text. |
| `session.express.quotaTitle` | Les corrections d'aujourd'hui sont faites. | Today's corrections are done. |
| `session.express.quotaBody` | Tu as déjà eu deux textes corrigés aujourd'hui, c'est le maximum par jour. Celui-ci est gardé : il sera corrigé demain matin, et sa réécriture ouvrira ta prochaine séance. | You've already had two texts corrected today, the daily maximum. This one is saved: it will be corrected tomorrow morning, and its rewrite will open your next session. |
| `session.express.budgetBody` | Les corrections automatiques reprennent le {date}. Ton texte est gardé. | Automatic corrections resume on {date}. Your text is saved. |
| `session.express.errorTitle` | La correction n'a pas abouti. | The correction didn't go through. |
| `session.express.errorBody` | Ton texte est gardé sur ce téléphone, rien n'est perdu. Réessaie maintenant, ou continue : on réessaiera tout seuls et la correction t'attendra sur l'accueil. | Your text is saved on this phone, nothing is lost. Try again now, or carry on: we'll retry on our own and the correction will be waiting on the home screen. |
| `session.express.continueWithout` | Continuer sans attendre | Continue without waiting |
| `session.express.tooSimilar` | Ce texte ressemble beaucoup à celui de {day} : il est corrigé mais ne rapporte pas d'XP. | This text is very close to the one from {day}: it's corrected but earns no XP. |
| `session.express.toMomentum` | Continuer vers l'élan | Continue to momentum |
| `session.momentum.title` | Relis le texte, un peu plus vite. | Read the text again, a little faster. |
| `session.momentum.body` | À voix haute ou dans ta tête, aussi vite que tu peux en comprenant. Le chrono part quand tu touches « Démarrer ». | Aloud or in your head, as fast as you can while understanding. The timer starts when you tap "Start". |
| `session.momentum.firstRead` | Première lecture | First reading |
| `session.momentum.start` / `finish` | Démarrer / J'ai fini | Start / I'm done |
| `session.momentum.timer` / `hideTimer` / `showTimer` | Chrono / Masquer / Afficher | Timer / Hide / Show |
| `session.momentum.result` | Soit {wpm} mots par minute, contre {before} à la première lecture. | That's {wpm} words per minute, against {before} on the first reading. |
| `session.momentum.notFaster` | Le passage compte pour l'entraînement ; l'XP demande d'être au moins aussi rapide que 90 % de la dernière fois. | The run counts as practice; XP needs at least 90% of last time's speed. |
| `session.momentum.xpLine` | Passage de fluidité | Fluency run |
| `session.momentum.toSummary` | Voir le bilan | See the wrap-up |

### Bilan, série, rappel, réglages

| Clé | fr | en |
|---|---|---|
| `summary.edition` | {date} · {language} · N° {number} | {date} · {language} · No. {number} |
| `summary.ringAria` | Objectif du jour atteint, bon à tirer : {xp} XP | Daily goal reached, ready to print: {xp} XP |
| `summary.stamp` | Bon à tirer | Ready to print |
| `summary.rows.xp` / `learned` / `error` / `streak` | XP gagnés / Appris aujourd'hui / Erreur du jour / Série | XP earned / Learned today / Mistake of the day / Streak |
| `summary.rows.correctionPending` | Correction de ton texte · en attente du réseau | Your text's correction · waiting for a connection |
| `summary.finish` | Terminer | Finish |
| `summary.ledger.title` | D'où viennent tes {xp} XP | Where your {xp} XP come from |
| `summary.ledger.rule` | Une carte ne rapporte qu'une fois par jour. L'XP ne baisse jamais. | A card earns only once a day. XP never goes down. |
| `summary.ledger.total` | Total | Total |
| `summary.sound.title` | Un petit son à chaque bonne réponse ? | A small sound for each right answer? |
| `summary.sound.body` | Discret, et muet quand ton téléphone est en mode silencieux. Tu pourras changer d'avis dans les réglages. | Subtle, and silent when your phone is on silent. You can change your mind in Settings. |
| `summary.sound.yes` / `no` | Activer les sons / Non merci | Turn sounds on / No thanks |
| `streak.title` | Série | Streak |
| `streak.days` | jours de suite | days in a row |
| `streak.last7` | Les sept derniers jours | The last seven days |
| `streak.day.done` / `freeze` / `rest` / `today` / `future` / `pending` | {day} : séance faite / {day} : relâche / {day} : repos / Aujourd'hui / {day} : à venir / {day} : en attente | {day}: session done / {day}: rest day / {day}: day off / Today / {day}: upcoming / {day}: pending |
| `streak.key.done` / `freeze` | séance faite / relâche | session done / rest day |
| `streak.freezes` | Relâches en réserve | Rest days in reserve |
| `streak.freezesValue` | {left} sur {max} | {left} of {max} |
| `streak.record` | Record | Best |
| `streak.freezeRule` | Une relâche est offerte chaque lundi. Elle couvre toute seule un jour sans séance. | A rest day is given every Monday. It covers a day without a session on its own. |
| `streak.restartTitle` | Nouvelle série : jour {count}. | New streak: day {count}. |
| `streak.restartBody` | Tes {days} jours précédents restent dans ton historique : {cards} cartes réussies, {texts} textes lus. | Your previous {days} days stay in your history: {cards} cards right, {texts} texts read. |
| `streak.repairTitle` | Édition de rattrapage | Catch-up edition |
| `streak.repairBody` | Une séance de plus, {when, select, today {aujourd'hui} other {aujourd'hui ou demain}}, en plus de celle du jour : ta série de {days} jours reprend. Possible une fois par mois. | One more session, {when, select, today {today} other {today or tomorrow}}, on top of today's: your {days}-day streak resumes. Possible once a month. |
| `streak.repairAction` | Faire l'édition de rattrapage | Do the catch-up edition |
| `reminder.title` | Un rappel par jour ? | One reminder a day? |
| `reminder.body` | À l'heure que tu choisis. Jamais plus d'un, aucun si ta séance est déjà faite, jamais la nuit. | At the time you choose. Never more than one, none if your session is done, never at night. |
| `reminder.time` | Heure du rappel | Reminder time |
| `reminder.example` | Exemple | Example |
| `reminder.enable` | Activer le rappel | Turn on the reminder |
| `reminder.later` | Pas maintenant | Not now |
| `reminder.osNote` | Ton iPhone te demandera ensuite ton accord. | Your iPhone will then ask for your permission. |
| `reminder.nightNote` | Il arrivera à cette heure-là, même la nuit. | It will arrive at that time, even at night. |
| `reminder.granted` | Rappel prévu chaque jour à {time}. | Reminder set for {time} every day. |
| `reminder.denied` | Rappel non activé. Tu peux l'autoriser plus tard dans les réglages de ton iPhone. | Reminder not turned on. You can allow it later in your iPhone's settings. |
| `reminder.unsupported` | Ce navigateur ne permet pas les rappels. | This browser doesn't support reminders. |
| `reminder.install.title` | Pour recevoir un rappel, ajoute Daily Lingua à l'écran d'accueil. | To get a reminder, add Daily Lingua to your Home Screen. |
| `reminder.install.body` | Sur iPhone, les rappels ne marchent que depuis l'icône de l'app. Trois gestes : | On iPhone, reminders only work from the app's icon. Three steps: |
| `reminder.install.step1` | Touche {share} dans la barre de Safari. | Tap {share} in Safari's toolbar. |
| `reminder.install.step2` | Choisis {addToHome}. | Choose {addToHome}. |
| `reminder.install.step3` | Touche {add}, puis ouvre Daily Lingua depuis son icône. | Tap {add}, then open Daily Lingua from its icon. |
| `reminder.install.keep` | Ta progression te suit : rien à refaire. | Your progress comes with you: nothing to redo. |
| `reminder.install.done` | J'ai compris | Got it |
| `reminder.install.later` | Plus tard | Later |
| `settings.groups.session` / `streak` / `reminder` / `game` | Séance / Série / Rappel / Jeu | Session / Streak / Reminder / Game |
| `settings.sessionLength.label` | Durée de la séance | Session length |
| `settings.sessionLength.hint` | Vaut dès demain. Objectif du jour : {xp} XP. | Applies from tomorrow. Daily goal: {xp} XP. |
| `settings.streak.label` | Série | Streak |
| `settings.streak.hint` | Un jour compte dès ta séance faite. Relâches : {left} sur {max}. | A day counts once your session is done. Rest days: {left} of {max}. |
| `settings.reminder.daily` | Rappel quotidien | Daily reminder |
| `settings.reminder.dailyHint` | Un par jour au plus, jamais la nuit | One a day at most, never at night |
| `settings.reminder.blocked` | Bloqué par l'iPhone : Réglages › Notifications › Daily Lingua | Blocked by the iPhone: Settings › Notifications › Daily Lingua |
| `settings.game.showXp` / `showXpHint` | Afficher l'XP / Compteur de séance, anneau chiffré, relevé du bilan | Show XP / Session counter, ring number, wrap-up breakdown |
| `settings.game.celebrations` / `celebrationsHint` | Célébrations animées / Tampons et anneau. Fixes si ton iPhone réduit les animations. | Animated celebrations / Stamps and ring. Still if your iPhone reduces motion. |
| `settings.game.sounds` / `soundsHint` | Sons / Coupés. Muets en mode silencieux. | Sounds / Off. Silent when your phone is on silent. |
| `settings.game.volume` | Volume | Volume |

Libellés de Safari à citer tels quels selon la langue d'interface (fr : « Partager », « Sur l'écran d'accueil », « Ajouter » ; en : "Share", "Add to Home Screen", "Add") : à vérifier sur iPhone à chaque nouvelle langue d'interface.

## 5. Accessibilité transverse

- **Contrastes calculés** (formule WCAG 2.1, à partir des valeurs hexadécimales), paires nouvelles du jalon 2 :

| Paire | Clair | Sombre | Seuil |
|---|---|---|---|
| `ink` / `success-soft` (texte de la feuille « Juste ») | 14,35 | 11,82 | 4,5 |
| `ink` / `error-soft` (texte de la feuille « À revoir ») | 13,71 | 12,91 | 4,5 |
| `error` / `error-soft` (« À revoir ») | 5,22 | 6,24 | 4,5 |
| `accent-strong` / `error-soft` (« J'avais raison ») | 6,92 | 8,39 | 4,5 |
| `muted` / `surface-2` (bouton inactif, chrono, aperçu de notification) | 4,68 | 6,30 | 4,5 |
| `ink` / `surface-2` (pastille hors ligne) | 13,95 | 15,09 | 4,5 |
| `bg` / `ink` (toast) | 15,25 | 16,81 | 4,5 |
| `streak` / `surface` (tampon dateur) | 6,41 | 6,51 | 4,5 |
| `success-ink` / `success` (coche des jours de série) | 6,29 | 9,28 | 3 |
| `border-strong` / `surface` (options, pastilles) | 3,62 | 3,28 | 3 |
| `border-strong` / `bg` (champ d'heure dans une feuille) | 3,29 | 3,51 | 3 |
| `accent` / `surface` (bord de l'option choisie, bouton d'écoute) | 8,47 | 7,54 | 3 |

  Écart relevé : `border-strong` sur `success-soft` ne tient que 3,09 (clair) et 2,47 (sombre). Il n'est utilisé nulle part : une option juste prend le bord `success` (6,53 en sombre). Dans les feuilles colorées, les métadonnées passent en `ink` plutôt qu'en `muted`.
- La couleur ne porte jamais seule le sens : « Juste » et « À revoir » sont écrits, l'option juste a une coche, l'option à revoir est barrée, les critères ont des chiffres, les jours de série ont une icône et un texte masqué.
- Cibles : 44 px au moins partout (segments de durée portés de 36 à 44 px par rapport au jalon 0 ; interrupteurs portés par toute la ligne).
- Champs : réponses en 20 px, écriture en 17 px, heure en 20 px ; jamais sous 16 px.
- Dynamic Type jusqu'à 200 % : le pied d'action passe sous le contenu (non fixe) au-delà de 150 %, pour ne pas manger l'écran.
- RTL (maquette 03 E) : barre de séance, segments, flèches et chevrons en miroir ; texte cible latin isolé en `dir="ltr"` ; chiffres de la locale (`١٢`) ; « XP » isolé dans `<bdi>`. Les textes arabes de la maquette sont à faire relire par un natif.
- Focus visible : contour `ink` de 2 px. Feuilles : piège de focus, Échap et glissement ferment (sauf feuilles de retour, qui se ferment par « Continuer »), focus rendu à l'élément d'origine.

## 6. Mouvement

| Moment | Animation | Durée | `prefers-reduced-motion` ou célébrations réduites |
|---|---|---|---|
| Pression, bascule | Couleur, échelle 0,98 | 150 ms | Couleur seule |
| Changement d'étape | Glissement de 24 px dans le sens de lecture | 250 ms | Fondu 100 ms |
| Feuille montante | Translation verticale | 250 ms | Fondu 100 ms |
| Réponse juste | Tampon « Juste », « +n XP » qui monte de 8 px | 300 ms | Fixe, fondu 100 ms |
| Réponse à revoir | Rature tracée | 200 ms | Rature affichée |
| Fin d'étape | Segment rempli d'encre | 400 ms | Rempli d'un coup |
| Ratures de la correction | Une à une, décalées de 70 ms | 1,5 s au plus, passable | Toutes affichées |
| Bilan | Arc, repères, tampon | 1,6 s au plus, passable d'un toucher | État final, fondu 100 ms |
| Série +1 (feuille) | Tampon dateur qui s'abat | 400 ms | Fondu 100 ms |
| Chargement | Pulsation des aplats | 1,6 s en boucle | Aucune |

Aucun mouvement pendant la lecture ni pendant l'élan. Une seule signature forte par écran.

## 7. États couverts dans les maquettes

| Écran | Couverts dans la planche | Décrits ici seulement |
|---|---|---|
| Aujourd'hui | avant, reprise, faite, hors ligne avec séance, hors ligne sans séance, chargement | préparation du texte, erreur de chargement, jour 1, mécaniques coupées, rien à faire hors ligne |
| Enveloppe | pause, reprise (toast, en 05 B), hors ligne (en 06 B) | quitter, lendemain, stockage plein, XP masquée |
| Réveil | juste, à revoir, trou sur l'erreur d'hier, fin d'étape, RTL | « J'avais raison », aucune carte due, plafond de temps, reprise après absence |
| Lecture | lecture avec voix, question écrite, écoute seule | voix absente, texte en préparation, retours |
| Atelier | mots, grammaire et trou, juste au deuxième essai | séance de 10 min (atelier sauté) |
| Expression | écriture, attente du réseau, correction, grille, réécriture vérifiée, quota, erreur | envoi en cours, aucune erreur, budget du mois, texte trop proche, mauvaise langue |
| Élan | consigne, en cours, résultat | pas plus rapide, abandon |
| Bilan | bilan, relevé d'XP, proposition des sons | correction en attente, anneau non fermé, XP masquée, feuilles « Appris » et « Erreur du jour » |
| Série | en cours, recommencée avec rattrapage | rattrapage indisponible, hors ligne, désactivée |
| Rappel | PWA installée, Safari non installé | accordé, refusé, heure de nuit, navigateur sans Web Push |
| Réglages | liste du jalon 2 et groupes du jalon 1 | rappel bloqué par l'iPhone, volume (sons activés) |

**Manquent** (à dessiner si l'implémentation bute dessus) : les feuilles « Appris aujourd'hui » et « Erreur du jour » du bilan, la feuille « Version d'un natif », l'état « Dynamic Type 200 % », une interface en anglais complète, et le parcours débutant A0-A1 au jalon 2 (dialogue à la place du texte), qui dépend de `j2-seance-contenu.md`.

## 8. Points à trancher

| # | Question | Recommandation | Pourquoi |
|---|---|---|---|
| 1 | Noms des étapes : ceux de la vision (Réveil, Lecture, Atelier, Expression, Élan, Bilan) ou ceux de la direction artistique (Révisions, Texte, Focus, Écriture, Fluidité, Bilan) | **Ceux de la vision**, utilisés dans les maquettes | Ils disent le geste plutôt que le contenu et se traduisent sans jargon ; « Focus » et « Fluidité » sont opaques pour un débutant |
| 2 | Mascotte au jalon 2 | **Aucune** (option C de la direction artistique) ; décider entre Pica et rien au jalon 4 (débutants), où un personnage a le plus d'utilité | Le jalon 2 a déjà une signature (le tampon) et l'écran du propriétaire doit rester calme. Les deux usages utiles du game design (désigner l'erreur du jour, célébrations de niveau 5) n'existent pas encore ou tiennent en une ligne. L'ajouter plus tard ne demande aucune refonte |
| 3 | Objectif du jour et durée de séance : un réglage ou deux | **Un seul** : la durée fixe l'objectif à 5 XP par minute (déjà le cas au jalon 1) | Deux réglages en minutes qui ne correspondent pas (séance de 15 min, objectif de 20 min) seraient incompréhensibles. Le palier de 45 min du game design n'a pas de durée de séance correspondante : à retirer ou à garder pour plus tard |
| 4 | « Séance complète » (+10 XP) quand la correction attend le réseau | **Comptée quand la réécriture est faite**, même le lendemain avant 04:00 ; le jour de série, lui, est validé par les 20 XP déjà gagnés | Respecte la règle « validée par le travail » sans pénaliser le hors ligne |
| 5 | Langue des questions de compréhension | **L1 jusqu'à A2, langue cible à partir de B1** | À confirmer par `j2-seance-contenu.md` ; les maquettes montrent un B1 |
| 6 | Écoute seule : passage du texte déjà lu ou passage nouveau | **Une phrase du texte reformulée** (même vocabulaire, autre tournure) | Sinon la question se résout de mémoire visuelle. Dépend de `j2-seance-contenu.md` |
| 7 | Vérifier à la sélection ou avec un bouton (mode reconnaître) | **Bouton « Vérifier »** | Évite les erreurs de doigt, cohérent avec les autres modes ; coûte un toucher |
| 8 | Proposition du rappel quand l'app n'est pas installée | **Montrer la marche d'installation une fois**, après la deuxième séance, puis seulement dans les réglages | Ne pas insister ; c'est le seul moyen d'avoir un rappel sur iPhone |
| 9 | Heure du rappel par défaut | **19:00** (game design), ou l'heure déjà saisie au jalon 1 si elle existe | Respecte un choix déjà fait |
| 10 | Afficher l'XP désactivé : que montre l'anneau | **L'arc sans chiffre**, libellé accessible « Objectif du jour : à moitié » | L'objectif reste lisible sans transformer l'écran en score |
| 11 | Tokens nouveaux `accent-soft` et `scrim` | **Les ajouter au thème `dailylingua`** avec ceux de la direction artistique | Utilisés par le focus des champs et toutes les feuilles ; absents de la direction artistique |
| 12 | Onglets au jalon 2 | **Deux** (Aujourd'hui, Réglages) | Pas d'onglet vide ; « Lire » arrive au jalon 3 avec la bibliothèque |
