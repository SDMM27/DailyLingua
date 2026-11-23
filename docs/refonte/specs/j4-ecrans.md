# Jalon 4 — Écrans débutants : parcours, unité, fin d'unité

Maquette retenue : **variante C, « La ligne »**, `.design/j4/variant-c-ligne.html` (locale, non versionnée ; 6 écrans et leurs états, chacun en clair et en sombre, cadre 390 × 844). Les variantes A (sommaire) et B (chemin de fer) ont été écartées.

Sources : `e-direction-artistique.md` (fait foi pour le visuel, sauf les deux corrections de la section 8), `b-modele-pedagogique.md` §2 (unités A0-A2 par situations) et §5 (file de révision unique), `specs/j2-ecrans.md` (tokens, enveloppe de séance, feuilles, retours), `packages/core/src/game/rules.ts` et `caps.ts` (barème d'XP), l'app actuelle (`apps/web/src`) et `packages/i18n/messages/{fr,en}.json`.

Ce document fixe l'interface. Le contenu des unités (gabarit, dialogues, phrases-clés, banques d'exercices, tests) et le modèle de données de progression relèvent d'une spec de contenu à part. Les chemins `apps/web/...` sont relatifs à la racine du dépôt.

## 0. Décisions de cadrage

| Sujet | Décision |
|---|---|
| Direction | Variante C : le parcours est **une ligne** (trait plein à la couleur de la langue pour le chemin fait, pointillés pour la suite) ; dans l'unité, **une chose à la fois** (une réplique, un exercice). |
| Onglet « Parcours » | 4ᵉ onglet (Aujourd'hui, Parcours, Lire, Réglages), **affiché seulement si l'apprenant a un parcours débutant (A0 à A2) dans la langue cible active**. Sinon, les 3 onglets actuels. La clé `common.nav.path` existe déjà. |
| Verrous | **Aucun cadenas nulle part.** L'ordre est conseillé ; toute unité s'ouvre ; chaque unité propose « Je connais déjà : passer le test ». |
| XP des exercices | Barème « focus » existant : **2 XP juste du premier coup** (`focus.first_try`), **1 XP juste au deuxième essai** (`focus.second_try`), 0 ensuite. Plafonds de `caps.ts` appliqués (voir point à trancher n° 1). |
| XP du test | **+25 XP pour un test d'unité réussi** (nouvelle règle `unit.test_passed`, une fois par unité). Les questions du test ne rapportent pas d'XP une à une. |
| Test raté | **Aucun XP retiré** : l'XP déjà gagné dans l'unité reste acquis. Pas de bonus. Les items manqués entrent dans la file de révision, dus le lendemain. Le test se repasse quand on veut. |
| « Je peux… » | Objectifs de l'unité (2 ou 3), **validés par le test réussi**, sans XP supplémentaire. Ils apparaissent alors sous la station et dans Progrès. |
| Mascotte | **Pica n'apparaît pas** au jalon 4. |
| Étapes | Unité de situation : 6 étapes **Dialogue, Phrases-clés, Grammaire, Exercices, Conversation, Test**. Unité d'écriture : 5 étapes **Lettres, Sons, Mots, Lecture, Test**. |
| Couleur de langue | Toujours via le registre (`languageStyle()`, `src/components/ui/language-style.ts` ; accent `terracotta` pour l'italien, `indigo` pour le russe). Elle colore la ligne faite, les stations, le nom de qui parle et la méta de la station en cours, jamais un état de réussite ou d'erreur. |

### Budget de densité (DA §5), mesuré dans la maquette

| Écran | Blocs au-dessus de la ligne de flottaison | Bouton plein | Décor |
|---|---|---|---|
| Parcours | 2 (en-tête, ligne) | 1 (« Continuer », dans la station en cours) | 0 |
| Feuille d'unité | 3 (titre, objectifs, actions) | 1 (« Commencer l'unité ») | 0 |
| Dialogue | 3 (position, répliques passées, réplique en cours) ; barre et lecteur hors budget | 1 (lecture, dans le lecteur) | 0 |
| Exercice | 3 (consigne, ligne de réponse, réserve de tuiles) | 1 (« Vérifier », puis « Continuer » dans la feuille) | 0 |
| Fin d'unité | 2 (score, « Je peux » ou ligne des phrases) | 1 (pied d'action) | Le cercle du score |

## 1. Tokens

Aucun nouveau token. Tout vient du thème `dailylingua` et des tokens de rôle ajoutés pour le jalon 2 (`j2-ecrans.md` §1) : `success`, `success-soft`, `success-ink`, `error`, `error-soft`, `xp`, `xp-soft`, `border-strong`, `accent-soft`, `scrim`, `radius-sheet`, `word-new`. **Vérifier qu'ils sont présents dans la version installée de `@sdmm/design`** ; sinon, ils sont à ajouter avant ce jalon.

Couleur de langue : `--lang`, `--lang-soft`, `--on-lang` fournis par `languageStyle()` (paires claires/sombres du registre).

| Élément | Valeur |
|---|---|
| Marges latérales | 20 px (`px-5`), 16 px sous 375 px |
| Espace entre blocs | 24 px (`gap-6`) ; 32 px (`gap-8`) dans le dialogue et la fin d'unité |
| Boutons | 52 px de haut, rayon 12 px (`Button` `primary`) |
| Feuilles | rayon `--sd-radius-sheet` (20 px), double filet `ink` en tête |
| Titres serif | 30 px (titres d'écran, score), 26 px (station en cours, consigne d'exercice), 30 px (réplique en cours) |
| Texte | 16 px (corps), 14-15 px (secondaire), 12 px minimum (méta mono) |

**Polices.** `apps/web/src/app/layout.tsx` charge Newsreader en sous-ensemble `latin` seulement. Pour les langues cibles en cyrillique (russe, ukrainien), ajouter **Literata** (`next/font/google`, sous-ensemble `cyrillic`, poids 400-700) et l'utiliser pour tout texte `lang="ru"` ou `lang="uk"` en serif (DA §3 : Newsreader n'a pas de cyrillique ; Literata place correctement l'accent tonique U+0301). Le chargement suit la langue cible (`unicode-range`), pas l'interface.

## 2. Composants

### À réutiliser

| Composant | Fichier | Usage au jalon 4 |
|---|---|---|
| `Button`, `buttonClass` | `apps/web/src/components/ui/button.tsx` | `primary` : « Continuer », « Commencer l'unité », « Vérifier », « Unité suivante », « Retour au parcours ». `ghost` : liens « Repasser le test maintenant », « J'avais raison », « Voir la traduction ». Appliquer l'extension `aria-disabled` de `j2-ecrans.md` §2 (jamais l'opacité 50 %). |
| `TabBar` | `apps/web/src/components/layout/tab-bar.tsx` | Ajouter l'onglet « Parcours » (`/path`, icône du chemin de la maquette) en 2ᵉ position, conditionnel (prop `showPath`, calculée côté serveur). |
| Barre de séance | En ligne dans `apps/web/src/components/today/session-panel.tsx` (bouton fermer, `role="progressbar"`, segments, pastille hors ligne) | **L'extraire** en `SessionBar` (nom prévu par `j2-ecrans.md` §2), avec `steps: string[]` (6 ou 5 libellés), `position`, `stepProgress`, `xp?`, `offline`, `variant: "segments" \| "line"`, `onPause`. Le jalon 4 utilise `variant="line"` ; la séance du jour garde ses segments. |
| Pause | Même fichier (`paused`, clés `dailySession.pauseTitle`, `leave`) | Même comportement : fermer met en pause, rien n'est perdu. |
| Panneau de mot | En ligne dans `apps/web/src/components/reader/reading-text.tsx` (section collante, mot en serif, sens, contexte, comparaison, « Ajouter à mes révisions », états `saving`, `saved`, `failed`) | **L'extraire** en `WordPanel` (`word`, `meaning`, `grammar`, `context`, `comparison?`, `onListen?`, `onAdd`, `onClose`) et `TappableText` (rendu des mots touchables), réutilisés par le lecteur et le dialogue. Ajouter le bouton « Écouter le mot » et la ligne de grammaire (méta mono, ex. « NOM MASCULIN »). |
| Audio | `apps/web/src/components/reader/reader-audio.tsx` | Reprendre son contrat d'erreur (`onError` → message `role="status"`, le texte reste lisible). Le lecteur du dialogue est un nouveau composant (voir plus bas), pas le `<audio controls>` natif. |
| Feuille montante | `BottomSheet`, spécifiée en `j2-ecrans.md` §2. **Elle n'existe pas encore dans le code** : la créer en `apps/web/src/components/ui/bottom-sheet.tsx` si le jalon 2 ne l'a pas livrée. | Feuille d'unité, feuille de retour, « Tout le texte », « Voir les 3 phrases ». Ajouter `tone: "calm"` (fond `surface`, double filet `ink`). |
| Retour d'exercice | `FeedbackSheet` (`j2-ecrans.md` §2). Aujourd'hui le retour est rendu en ligne dans `session-panel.tsx`. | Utilisé avec `tone="calm"` : pas d'aplat `success-soft` ni `error-soft` dans l'unité. |
| Anneau | `apps/web/src/components/today/goal-ring.tsx` | Sa géométrie SVG (piste, arc `pathLength=100`) sert de base au `ScoreRing`. |

### À créer

Tous en propriétés logiques, textes passés déjà traduits, aucune langue en dur. Le domaine (statut d'unité, seuil, calcul d'XP) vit dans `packages/core` sans import React ; les pages lisent via `getRepository()` et appellent `await connection()` (le statut dépend du jour pour les révisions).

| Composant | Props | Rôle |
|---|---|---|
| `PathHeader` | `language`, `level`, `done`, `total`, `hint` | Méta « Parcours · Italien », titre « Niveau A1 », phrase d'avancement |
| `PathLine` | `items: (PathZone \| PathStation)[]`, `onOpen(unitId)` | La ligne (`<ol>`), trait plein jusqu'à la station en cours, pointillés ensuite |
| `PathStation` | `unit: { id, number, title, kind: "situation" \| "writing", letters?, minutes }`, `status: "done" \| "current" \| "todo"`, `canDo?: string`, `passedByTest?: boolean`, `step?: { position, total, name }`, `offlineReady?: boolean` | Une station ; la station en cours porte le bouton « Continuer » |
| `PathZone` | `label` | Trait de correspondance et intertitre (« Écriture · A0 », « Situations · A1 ») |
| `UnitSheet` | `unit`, `status`, `goals: string[]`, `step?`, `testSize`, `passMark`, `onStart()`, `onTest()` | Feuille d'une unité ouverte d'un toucher |
| `UnitShell` | `steps`, `position`, `stepProgress`, `xp?`, `offline`, `children`, `footer`, `onPause` | Enveloppe d'unité : `SessionBar variant="line"`, zone défilante, pied d'action |
| `DialogueFocus` | `lines: { speaker, text: Token[], translation, audio? }[]`, `index`, `lang`, `onWord(token)` | Réplique en cours (30 px) et les deux précédentes en gris |
| `LinePlayer` | `state: "idle" \| "playing" \| "paused" \| "unavailable" \| "pending"`, `rate: 1 \| 0.7`, `mode: "line" \| "all"`, `onPlay`, `onPrev`, `onNext`, `onToggleRate`, `onToggleAll` | Lecteur en pied : Lent, précédente, lecture, suivante, Tout |
| `TranscriptSheet` | `lines`, `lang`, `showTranslation` | « Tout le texte » : dialogue complet, mots touchables, écoute par réplique |
| `WordOrderExercise` | `prompt`, `promptLang`, `tiles: { id, text }[]`, `placed: string[]`, `result?: { verdict, wrongIds }`, `onPlace(id)`, `onRemove(id)`, `onCheck()` | Remets la phrase dans l'ordre |
| `ScoreRing` | `correct`, `total`, `passMark`, `passed` | Cercle de score avec le trait du seuil |
| `UnitResult` | `passed`, `score`, `canDo: string[]`, `xpTest?`, `xpKept`, `missed: { text, translation }[]`, `next?: { number, title }`, `onNext`, `onBack`, `onRetake` | Écran de fin d'unité, réussi ou sous le seuil |

## 3. Écrans

### 3.1 Parcours — maquette 01 (italien) et 02 (russe)

Route `/path` (onglet « Parcours », `aria-current="page"`). Langue cible active ; si l'apprenant a plusieurs langues avec parcours, la pastille de langue de l'accueil fait foi.

**Structure** (colonne unique, `gap-6`) :
1. `PathHeader` : méta mono « Parcours · Italien » ; titre serif 30 px « Niveau A1 » ; phrase 14 px `muted` dont le début est en `ink` 600 : « **3 unités sur 10.** L'ordre est conseillé, chaque station s'ouvre. »
2. `PathLine`, liste ordonnée. Grille par station : colonne de 44 px pour le rail et la pastille, puis le contenu, `gap-x-3`, 22 px sous chaque station.
   - **Rail** : 4 px plein `--lang` du début jusqu'à la station en cours ; au-delà, 2 px pointillés `border-strong`.
   - **Faite** : pastille pleine 24 px `--lang`, coche `--on-lang`. Titre 16 px 600 « 2 · Au café », puis le « Je peux… » validé en serif italique 15 px `ink`. Si validée par le test direct, ajouter la mention « validée par le test » (13 px `muted`).
   - **En cours** : anneau 36 px, bord 5 px `--lang`, centre `bg`. Méta « Unité 4 · étape 3 sur 6 » en `--lang` ; titre serif 26 px ; ligne 14 px `muted` (étape et durée restante) ; `Button primary` « Continuer » pleine largeur de la colonne, 14 px au-dessus.
   - **Pas commencée** : rond 16 px, fond `bg`, bord 2 px `border-strong`, sans cadenas. Titre 16 px 600, durée 13 px `muted`.
   - Toute la zone texte d'une station faite ou à venir est un lien (44 px au moins) qui ouvre la `UnitSheet`. La station en cours ouvre directement l'unité par « Continuer » ; son titre ouvre aussi la feuille.
3. Barre d'onglets.

**Russe et autres écritures** : les unités d'écriture sont les premières stations de la même ligne, précédées d'un `PathZone` « Écriture · A0 » ; leur pastille porte une lettre du groupe (serif 15 px, Literata), leur sous-titre la liste des lettres (`lang="ru"`). Un second `PathZone` « Situations · A1 » marque le passage aux situations ; la numérotation des unités est continue (5, 6…). Le compte de l'en-tête inclut les unités d'écriture (« 2 unités sur 14 »).

**Défilement initial** : la station en cours est amenée dans le tiers haut de l'écran (sans animation si `prefers-reduced-motion`).

**États**
- *Chargement* : en-tête réel, puis trois stations en aplats `surface-2` (pulsation des aplats J2, aucune avec mouvement réduit). Pas de faux texte.
- *Erreur de chargement* : phrase `path.loadError` et `Button secondary` « Réessayer ».
- *Hors ligne* : la ligne s'affiche depuis le cache. Une station dont le contenu n'est pas téléchargé reste ouvrable ; sa feuille affiche `path.offlineNotDownloaded` et désactive « Commencer » (`aria-disabled`, raison liée par `aria-describedby`). Les unités sont du contenu curé du dépôt : précharger l'unité en cours et la suivante.
- *Premier jour* (aucune unité commencée) : la station 1 est « en cours » à l'étape 0, bouton « Commencer ».
- *Niveau terminé* : la dernière station est faite ; une ligne sobre sous la ligne mène au niveau suivant (`path.nextLevel`). Pas de célébration ici (l'édition spéciale de fin de niveau est hors jalon).
- *Pas de parcours débutant* : l'onglet n'existe pas ; `/path` redirige vers l'accueil.

**Clair / sombre** : le rail et les pastilles changent avec la paire de la langue (italien `#b0502b` / `#e99c78`). En sombre, la coche des pastilles faites est `#0f0e0c` (`--on-lang`).

### 3.2 Feuille d'unité — maquette 03

`BottomSheet tone="rule"`, voile `scrim`, poignée. Ordre :
1. Méta « Unité 7 · environ 25 min », titre serif 22 px « Faire les courses ».
2. Méta « À la fin, tu pourras dire », puis 2-3 objectifs « Je peux… » en serif 18 px, chacun précédé d'un cercle vide `muted` (pas de coche : ils ne sont pas encore validés).
3. `Button primary` « Commencer l'unité » (ou « Reprendre · étape 3 sur 6 » si commencée, ou « Revoir l'unité » si faite).
4. Une ligne sobre (56 px) « Je connais déjà », valeur « passer le test, 10 questions », chevron. Absente si l'unité est déjà validée.

Unité faite : les objectifs portent une coche `success` et la date (« Validée le 12 nov. ») ; le bouton devient « Revoir l'unité » ; la ligne de test devient « Repasser le test ».

### 3.3 Enveloppe d'unité — maquettes 04 et 05

`UnitShell` plein écran, sans barre d'onglets (comme la séance : règle `main:has([data-daily-session]) + nav`, à étendre à `[data-unit]`).

**Barre** (`SessionBar variant="line"`) : fermer 44 px à gauche ; au centre, sur une ligne, le nom de l'étape en 13 px 600 `ink` et « 1 / 6 » en mono `muted`, puis un trait de 3 px (`surface-2`, rempli `accent` à `((position - 1) + stepProgress) / total`) ; à droite, l'XP gagné dans l'unité en `xp` (masqué si `settings.game.xpVisible` est faux ; remplacé par la pastille « Hors ligne » hors ligne, comme au J2).

Unité d'écriture : mêmes règles avec 5 étapes (Lettres, Sons, Mots, Lecture, Test).

Fermer → feuille de pause (`unit.pauseTitle`, `unit.pauseBody`), « Continuer » et « Quitter pour l'instant ». La reprise se fait à l'étape et à l'item exacts.

### 3.4 Étape Dialogue — maquette 04

Contenu (`gap-8`) :
1. Ligne de position : méta « Al bar · réplique 4 sur 8 » à gauche ; à droite, bouton à contour de 44 px « Tout le texte » (icône liste), qui ouvre la `TranscriptSheet`.
2. Les deux répliques précédentes : nom 12 px 600, texte serif 17 px, tout en `muted`. Elles restent touchables (le mot s'ouvre dans le panneau).
3. Réplique en cours : nom en méta `--lang` ; texte serif 30 px, interligne 1,35 ; mots touchables. Dessous, 14 px plus bas : bouton rond 52 px « Réécouter la réplique » (bord `border-strong`, icône `accent-strong`) et lien « Voir la traduction ». La traduction s'affiche sous la réplique en 17 px `muted` et le lien devient « Masquer la traduction ». Le choix persiste pour l'unité.

**Mots touchables** (`TappableText`) : chaque mot ou expression figée (`per favore`, `buona giornata`) est un bouton. Les mots nouveaux de l'unité portent le marqueur `word-new` avec soulignement pointillé ; le mot touché a un contour `accent` de 2 px ; le texte reste `ink`. Toucher ouvre le `WordPanel` au-dessus du lecteur : mot serif 24 px, grammaire en méta, sens en 17 px 600, contexte 14 px `muted`, boutons « Écouter le mot » et « Fermer » (44 px), puis `Button primary` « Ajouter à mes révisions » (états `reader.saving`, `reader.saved`, `reader.failed`). La carte garde la réplique comme contexte.

**Lecteur** (`LinePlayer`, pied sur `surface`, filet `line`, `safe-area-inset-bottom`) : « Lent » (bascule, affiche `0,7×` ou `1×`, `aria-pressed`), réplique précédente, lecture 56 px `accent` (lit la réplique en cours), réplique suivante, « Tout » (bascule : enchaîne toutes les répliques depuis la première ; la réplique lue devient la réplique en cours). Pendant la lecture de tout le dialogue, les répliques défilent une à une (fondu 100 ms en mouvement réduit).

**Fin de l'étape** : quand la réplique 8 sur 8 a été affichée, « Continuer » (`Button primary`) apparaît au-dessus de la rangée du lecteur et mène aux phrases-clés. L'étape se valide par le passage sur toutes les répliques, sans XP (l'XP ne récompense que les réponses).

**États**
- *Audio en préparation* : bouton de lecture désactivé (`aria-disabled`), message `reader.audioPending` sous la rangée.
- *Audio indisponible* (échec de chargement, hors ligne sans cache) : message `dialogue.audioUnavailable` (`role="status"`), contrôles de lecture désactivés ; le texte, la traduction et les mots touchables restent utilisables, « Suivante » reste actif.
- *Hors ligne, audio en cache* : rien ne change, pastille hors ligne dans la barre. « Ajouter à mes révisions » est mis en file (synchronisation J2) et affiche directement « Ajouté à tes révisions. ».
- *Panneau ouvert* : il recouvre le bas de la zone de texte ; la réplique en cours reste visible au-dessus.

### 3.5 Exercice « Remets la phrase dans l'ordre » — maquette 05

Contenu (`gap-7`) :
1. Méta « Remets la phrase dans l'ordre · 3 sur 8 », puis la phrase en L1 en serif 26 px.
2. Ligne de réponse : zone de 136 px de haut au moins, tuiles alignées en bas, filet `ink` de 2 px en dessous.
3. Réserve de tuiles : `flex-wrap`, `gap-2.5`.

**Tuiles** : boutons de 52 px de haut, rayon 10 px, fond `surface`, bord 1,5 px `border-strong` et ombre basse de 2 px de la même couleur, serif 22 px `lang` de la langue cible. Toucher une tuile de la réserve la place à la fin de la ligne ; toucher une tuile de la ligne la renvoie à sa place dans la réserve. Une tuile placée laisse dans la réserve un emplacement en pointillés de même taille (la réserve ne bouge pas). Un mot intrus peut figurer dans la réserve.

**Pied** : `Button primary` « Vérifier », actif dès qu'une tuile est placée.

**Retours** (`FeedbackSheet tone="calm"` : fond `surface`, double filet `ink`, rôle `status`) :
- *Juste, premier essai* : coche `success` et « Juste » en serif 22 px gras ; à droite, pastille « +2 XP » (`xp` sur `xp-soft`) ; une phrase d'explication 14 px ; `Button primary` « Continuer ». Les tuiles de la ligne prennent le bord `success`.
- *Premier essai à revoir* (non dessiné) : « À revoir » (méta `error` + trait de rature), sans la réponse ; une phrase d'indice (« Regarde la place de *cosa* ») ; `Button primary` « Réessayer ». La feuille se ferme, les tuiles mal placées gardent leur bord `error`, la ligne reste modifiable.
- *Juste au deuxième essai* : comme « Juste », pastille « +1 XP ».
- *Deuxième essai à revoir* (maquette 05 B) : « À revoir » ; la phrase attendue entière en serif 22 px, la partie corrigée soulignée en `success` ; une phrase d'explication (`ink`, 14 px) ; « Elle revient en fin d'étape. » ; `Button primary` « Continuer » ; lien « J'avais raison ». Les tuiles déplacées ont le bord `error` ; pas de fond rose, pas de secousse, jamais le mot « faux ».
- XP à 0 (plafond atteint ou XP masqué) : la pastille d'XP n'apparaît pas.

**Clair / sombre** : en sombre, les bords `success` (`#7fc29d`) et `error` (`#ec8f86`) restent sur `surface` (8,34 et 7,60:1).

### 3.6 Fin d'unité — maquette 06

Écran après le test (étape 6 sur 6 ou 5 sur 5), aussi après un test direct « Je connais déjà ». Pas de barre d'unité ; pied d'action fixe.

**Réussi** (score ≥ seuil ; seuil = 80 %, soit 8 sur 10) :
1. Bloc centré : `ScoreRing` de 156 px (piste `surface-2` 7 px, arc `success` proportionnel au score, trait du seuil `ink` à l'extérieur du cercle, à 80 % du tour) ; au centre, « 9/10 » en serif 34 px et « SEUIL 8 » en méta. Titre serif 30 px « Unité validée ». Pastille « +25 XP · test réussi » (`xp` sur `xp-soft`, mono 15 px), absente si l'XP est masqué ou déjà gagné pour cette unité.
2. Méta « Au café · je peux maintenant », puis les « Je peux » validés en serif 18 px avec coche `success`.
3. Pied : `Button primary` « Unité suivante » (absent si c'était la dernière unité du niveau : « Retour au parcours » devient le bouton plein), lien « Retour au parcours ».

**Sous le seuil** :
1. `ScoreRing` avec l'arc en `accent` (jamais `error`), même trait de seuil. Titre « Pas encore validée ». Phrase 14 px `muted`, 30 caractères de large au plus : « Il manquait une réponse. Les 3 phrases manquées reviennent demain dans tes révisions ; tes 14 XP restent acquis. » Le nombre de réponses manquantes, le nombre de phrases et l'XP sont calculés ; la proposition sur l'XP disparaît si l'XP de l'unité est 0 (test direct).
2. Ligne sobre « Voir les 3 phrases » qui ouvre une feuille : chaque phrase en serif 19 px et sa traduction en 14 px `muted`.
3. Pied : `Button primary` « Retour au parcours », lien « Repasser le test maintenant ».

Effets : réussi, l'unité passe « faite », ses « Je peux » sont validés, la station suivante devient « en cours » si aucune autre ne l'est. Sous le seuil, l'unité reste dans son état (en cours, ou à venir si c'était un test direct). Dans les deux cas, chaque item manqué devient une carte de la file unique, due le lendemain.

**Mouvement** : l'arc se trace en 600 ms (`--sd-dur-celebrate`), une fois, passable d'un toucher ; avec mouvement réduit ou « Animer le bilan » coupé, état final en fondu de 100 ms. Pas de tampon, pas de son en cas d'échec.

## 4. Textes d'interface

Clés nouvelles, à ajouter dans `packages/i18n/messages/fr.json` et `en.json`. Les clés existantes réutilisées sont listées à la fin.

### path

| Clé | fr | en |
|---|---|---|
| `path.meta` | Parcours · {language} | Path · {language} |
| `path.level` | Niveau {level} | Level {level} |
| `path.progress` | {done, plural, one {# unité} other {# unités}} sur {total}. | {done} of {total} units. |
| `path.hint` | L’ordre est conseillé, chaque station s’ouvre. | The order is a suggestion; every stop is open. |
| `path.hintWriting` | L’écriture d’abord, puis les situations. | Writing first, then everyday situations. |
| `path.zoneWriting` | Écriture · {level} | Writing · {level} |
| `path.zoneSituations` | Situations · {level} | Situations · {level} |
| `path.unitTitle` | {number} · {title} | {number} · {title} |
| `path.currentMeta` | Unité {number} · étape {step} sur {steps} | Unit {number} · step {step} of {steps} |
| `path.currentMetaWriting` | Écriture {number} · étape {step} sur {steps} | Writing {number} · step {step} of {steps} |
| `path.minutes` | {minutes} min | {minutes} min |
| `path.remaining` | {step}. Environ {minutes} min. | {step}. About {minutes} min. |
| `path.continue` | Continuer | Continue |
| `path.start` | Commencer | Start |
| `path.passedByTest` | validée par le test | passed by test |
| `path.a11yDone` | {title}, validée. {canDo} | {title}, completed. {canDo} |
| `path.a11yCurrent` | {title}, en cours, étape {step} sur {steps} | {title}, in progress, step {step} of {steps} |
| `path.a11yTodo` | {title}, pas commencée, environ {minutes} min | {title}, not started, about {minutes} min |
| `path.loadError` | Impossible de charger le parcours pour le moment. | We can’t load your path right now. |
| `path.offlineNotDownloaded` | Cette unité se téléchargera au retour du réseau. | This unit will download when you’re back online. |
| `path.nextLevel` | Passer au niveau {level} | Go to level {level} |

### unitSheet

| Clé | fr | en |
|---|---|---|
| `unitSheet.meta` | Unité {number} · environ {minutes} min | Unit {number} · about {minutes} min |
| `unitSheet.goals` | À la fin, tu pourras dire | By the end, you’ll be able to say |
| `unitSheet.goalsDone` | Validée le {date} | Completed on {date} |
| `unitSheet.start` | Commencer l’unité | Start the unit |
| `unitSheet.resume` | Reprendre · étape {step} sur {steps} | Resume · step {step} of {steps} |
| `unitSheet.review` | Revoir l’unité | Review the unit |
| `unitSheet.skip` | Je connais déjà | I already know this |
| `unitSheet.skipValue` | passer le test, {count} questions | take the test, {count} questions |
| `unitSheet.retake` | Repasser le test | Retake the test |

### unit (enveloppe)

| Clé | fr | en |
|---|---|---|
| `unit.steps.dialogue` | Dialogue | Dialogue |
| `unit.steps.keyPhrases` | Phrases-clés | Key phrases |
| `unit.steps.grammar` | Grammaire | Grammar |
| `unit.steps.exercises` | Exercices | Exercises |
| `unit.steps.conversation` | Conversation | Conversation |
| `unit.steps.test` | Test | Test |
| `unit.writingSteps.letters` | Lettres | Letters |
| `unit.writingSteps.sounds` | Sons | Sounds |
| `unit.writingSteps.words` | Mots | Words |
| `unit.writingSteps.reading` | Lecture | Reading |
| `unit.writingSteps.test` | Test | Test |
| `unit.stepCount` | {position} / {total} | {position} / {total} |
| `unit.progress` | Étape {position} sur {total}, {name} | Step {position} of {total}, {name} |
| `unit.pause` | Mettre l’unité en pause | Pause the unit |
| `unit.pauseTitle` | Unité en pause | Unit paused |
| `unit.pauseBody` | Tu reprendras à l’étape {step}. Rien n’est perdu. | You’ll pick up at step {step}. Nothing is lost. |
| `unit.xp` | XP de l’unité : {xp} | Unit XP: {xp} |

### dialogue

| Clé | fr | en |
|---|---|---|
| `dialogue.position` | {title} · réplique {line} sur {total} | {title} · line {line} of {total} |
| `dialogue.transcript` | Tout le texte | Full text |
| `dialogue.transcriptTitle` | Le dialogue en entier | The whole dialogue |
| `dialogue.showTranslation` | Voir la traduction | Show translation |
| `dialogue.hideTranslation` | Masquer la traduction | Hide translation |
| `dialogue.replay` | Réécouter la réplique | Replay this line |
| `dialogue.play` | Écouter la réplique {line} | Play line {line} |
| `dialogue.pause` | Pause | Pause |
| `dialogue.previous` | Réplique précédente | Previous line |
| `dialogue.next` | Réplique suivante | Next line |
| `dialogue.slow` | Lent | Slow |
| `dialogue.slowA11y` | Vitesse lente ({rate}) | Slow speed ({rate}) |
| `dialogue.all` | Tout | All |
| `dialogue.allA11y` | Écouter tout le dialogue | Play the whole dialogue |
| `dialogue.audioUnavailable` | Audio indisponible pour ce dialogue. Tu peux le lire. | Audio isn’t available for this dialogue. You can read it. |
| `dialogue.wordNew` | {word}, mot nouveau | {word}, new word |
| `dialogue.listenWord` | Écouter le mot | Play the word |

### wordOrder et retours

| Clé | fr | en |
|---|---|---|
| `wordOrder.instruction` | Remets la phrase dans l’ordre | Put the sentence in order |
| `wordOrder.count` | {index} sur {total} | {index} of {total} |
| `wordOrder.answer` | Ta phrase | Your sentence |
| `wordOrder.bank` | Mots à placer | Words to place |
| `wordOrder.placed` | {word} placé en position {position} | {word} placed in position {position} |
| `wordOrder.removed` | {word} retiré de la phrase | {word} removed from the sentence |
| `wordOrder.empty` | Emplacement libre | Empty slot |
| `exercise.retry` | Réessayer | Try again |
| `exercise.comesBack` | Elle revient en fin d’étape. | It comes back at the end of this step. |
| `exercise.dispute` | J’avais raison | I was right |
| `exercise.xp` | +{xp} XP | +{xp} XP |

### unitResult

| Clé | fr | en |
|---|---|---|
| `unitResult.score` | {correct}/{total} | {correct}/{total} |
| `unitResult.passMark` | Seuil {passMark} | Pass mark {passMark} |
| `unitResult.scoreA11y` | {correct} réponses justes sur {total}, seuil à {passMark} | {correct} of {total} correct, pass mark {passMark} |
| `unitResult.passed` | Unité validée | Unit complete |
| `unitResult.xpTest` | +{xp} XP · test réussi | +{xp} XP · test passed |
| `unitResult.canDo` | {title} · je peux maintenant | {title} · I can now |
| `unitResult.next` | Unité suivante | Next unit |
| `unitResult.back` | Retour au parcours | Back to the path |
| `unitResult.notYet` | Pas encore validée | Not passed yet |
| `unitResult.missing` | {count, plural, one {Il manquait une réponse.} other {Il manquait # réponses.}} | {count, plural, one {One more correct answer was needed.} other {# more correct answers were needed.}} |
| `unitResult.missedBack` | {count, plural, one {La phrase manquée revient} other {Les # phrases manquées reviennent}} demain dans tes révisions | {count, plural, one {The missed sentence comes back} other {The # missed sentences come back}} in your reviews tomorrow |
| `unitResult.xpKept` | ; tes {xp} XP restent acquis. | ; you keep your {xp} XP. |
| `unitResult.seeMissed` | {count, plural, one {Voir la phrase} other {Voir les # phrases}} | {count, plural, one {See the sentence} other {See the # sentences}} |
| `unitResult.retake` | Repasser le test maintenant | Retake the test now |

La phrase d'échec se compose de `missing`, `missedBack` puis `xpKept` (ou d'un point final si l'XP est nul). Faire relire les deux langues comme une seule phrase.

**Clés existantes réutilisées** : `common.nav.path`, `common.actions.continue`, `common.actions.close`, `common.actions.retry`, `common.loading`, `dailySession.check` (« Vérifier »), `dailySession.correct` (« Juste »), `dailySession.wrong` (« À revoir »), `dailySession.leave`, `dailySession.offline`, `reader.add`, `reader.saving`, `reader.saved`, `reader.failed`, `reader.audioPending`, `settings.game.xpVisible`.

## 5. Accessibilité

- **Cibles** : 44 × 44 px au moins (stations par toute leur zone texte, boutons ronds 52-56 px, tuiles 52 px, bascules du lecteur 56 × 48 px). Boutons pleins de 52 px.
- **Ordre du focus**
  - Parcours : titre de l'écran (`h1`, `tabIndex=-1`, focus à l'arrivée) → stations dans l'ordre de la ligne (le bouton « Continuer » juste après le titre de la station en cours) → onglets.
  - Feuille d'unité : piège de focus ; focus sur le titre de la feuille ; Échap et glissement ferment ; le focus revient à la station.
  - Dialogue : fermer → « Tout le texte » → répliques passées → réplique en cours (mots) → réécouter → traduction → lecteur (Lent, précédente, lecture, suivante, Tout) → « Continuer ». Le panneau de mot reçoit le focus à l'ouverture et le rend au mot à la fermeture.
  - Exercice : consigne → tuiles placées → réserve → « Vérifier ». À l'ouverture du retour, le focus va sur le titre de la feuille (« Juste », « À revoir »), qui ne se ferme que par « Continuer ».
  - Fin d'unité : titre (« Unité validée » ou « Pas encore validée ») → contenu → pied.
- **ARIA**
  - Ligne : `<ol aria-label>` ; station en cours `aria-current="step"` ; libellé complet de chaque station (`path.a11y*`) ; pastilles et rail `aria-hidden`.
  - Barre : `role="progressbar"` avec `aria-valuemin=1`, `aria-valuemax` = 6 ou 5, `aria-valuetext` = `unit.progress`.
  - Mots touchables : boutons nommés par le mot, avec « mot nouveau » si marqué (`dialogue.wordNew`) ; `aria-pressed` sur le mot ouvert. Le panneau est une région `aria-live="polite"`.
  - Bascules « Lent », « Tout », « Voir la traduction » : `aria-pressed`. Lecteur : le bouton lecture change de nom (« Écouter la réplique 4 » / « Pause »).
  - Tuiles : boutons ; chaque placement ou retrait est annoncé dans une région `polite` (`wordOrder.placed`, `wordOrder.removed`). La ligne de réponse est une liste `aria-label="Ta phrase"`, la réserve une liste `aria-label="Mots à placer"` ; les emplacements vides sont `aria-hidden`.
  - Retours : `role="status"` ; le verdict est écrit, la couleur ne porte jamais seule le sens (coche, mot « Juste », trait de rature).
  - Score : `role="img"` avec `unitResult.scoreA11y`.
- **Langue** : tout texte cible porte `lang` (`it`, `ru`…) pour la synthèse et le choix de police ; les traductions portent la langue de l'apprenant. Les noms de personnages ne sont pas traduits.
- **Cyrillique** : texte cible en Literata (serif) et Inter (interface) ; accent tonique U+0301 affiché si `markStress` est vrai dans le registre (`packages/core/src/languages.ts`). Les lettres seules (pastilles, listes de lettres) sont lues lettre par lettre : `aria-label` avec les lettres séparées par des virgules.
- **Champs** : aucun champ texte dans ces écrans ; tout futur champ fait 16 px au moins.
- **Mouvement réduit** (`prefers-reduced-motion` ou « Animer le bilan » coupé) : défilement vers la station en cours sans animation ; changement de réplique et d'étape en fondu de 100 ms ; feuille en fondu ; arc du score affiché d'un coup ; pas de rebond sur les tuiles.
- **Dynamic Type** jusqu'à 200 % : la réplique en cours passe sur plusieurs lignes, le lecteur reste en pied ; au-delà de 150 %, le pied d'action de la fin d'unité n'est plus fixe (règle J2).
- **Contrastes calculés** (WCAG 2.1, valeurs hexadécimales), paires nouvelles :

| Paire | Clair | Sombre | Seuil |
|---|---|---|---|
| Langue italien / `bg` (méta de la station en cours) | 4,62 | 8,72 | 4,5 |
| Langue russe / `bg` | 7,70 | 9,05 | 4,5 |
| `on-lang` / langue italien (coche des stations) | 5,21 | 8,72 | 3 |
| `border-strong` / `bg` (rail pointillé, stations à venir) | 3,29 | 3,51 | 3 |
| `success` / `surface-2` (arc du score) | 5,11 | 8,34 | 3 |
| `accent` / `surface-2` (arc sous le seuil) | 7,04 | 7,24 | 3 |
| `error` / `surface` (bord des tuiles à revoir) | 6,39 | 7,60 | 3 |
| `xp` / `xp-soft` (pastille d'XP) | 4,97 | 7,88 | 4,5 |

  L'italien clair sur `bg` est juste au-dessus du seuil : ne pas descendre sous 12 px ni l'utiliser en dessous de `font-weight: 500`. Pour toute autre langue, vérifier la paire avec `bg` (le registre ne garantit que `surface`, DA §8).

## 6. Clair et sombre

Mêmes tokens que la séance ; rien n'est spécifique à un thème hormis :
- la couleur de langue prend la paire sombre du registre (rail, pastilles, nom de qui parle) ;
- en sombre, le marqueur des mots nouveaux est `#4b3c13` : on n'y écrit qu'en `ink` (DA §8) ;
- le voile des feuilles passe à `rgb(0 0 0 / .62)` ;
- la piste du score (`surface-2`) reste visible sur `bg` dans les deux thèmes, mais l'arc et le texte portent le sens.

## 7. États couverts

| Écran | Dans la maquette | Décrits ici seulement |
|---|---|---|
| Parcours | italien (3 faites, 1 en cours), russe avec écriture | chargement, erreur, hors ligne non téléchargé, premier jour, niveau terminé, pas de parcours |
| Feuille d'unité | unité à venir | unité commencée, unité faite, hors ligne |
| Dialogue | réplique 4, panneau ouvert | traduction affichée, audio en préparation, audio indisponible, « Tout le texte », dernière réplique avec « Continuer » |
| Exercice | juste, à revoir après deux essais | premier essai à revoir, juste au deuxième essai, XP plafonné ou masqué |
| Fin d'unité | 9/10, 7/10 | dernière unité du niveau, test direct raté (XP nul), XP masqué, feuille des phrases manquées |

## 8. Corrections de la direction artistique

À faire dans `docs/refonte/e-direction-artistique.md` (et à signaler dans la maquette 06 de `maquettes.html`, qui montre encore un cadenas) :

1. **§6, « Nœud du parcours »** : remplacer « À venir : pointillés et cadenas, contournables par un test » par « À venir : pointillés, sans cadenas. Toute unité s'ouvre ; un test direct (« Je connais déjà ») la valide. » Retirer aussi la vignette de page cornée : le nœud devient une **station** sur une ligne (pastille pleine faite, anneau à la couleur de langue en cours, petit rond à venir).
2. **§2 (tableau des mécaniques) et §5 (« Parcours »)** : « Carte du parcours → chemin de fer (une vignette de page par unité) » devient « Carte du parcours → **la ligne** : un trait à la couleur de la langue pour le chemin fait, des pointillés pour la suite, une station par unité ; aucune unité verrouillée ». Au §5, « Parcours : le chemin de fer du cahier en cours » devient « Parcours : la ligne du niveau en cours ».

## 9. Points à trancher

| # | Question | Recommandation |
|---|---|---|
| 1 | Plafonds « focus » de `caps.ts` (20 XP par séance, 40 par jour) appliqués aux exercices d'unité | Les appliquer tels quels : une unité fait 8 à 10 exercices (16 à 20 XP). Le plafond du jour limite deux unités par jour, ce qui n'empêche pas d'apprendre et reste honnête (l'XP n'est pas affiché quand il vaut 0). |
| 2 | Lien entre la séance du jour et l'unité pour un débutant (`b-modele-pedagogique.md` §3 : « la séance est l'unité ») | Bloc séance de l'accueil = « Continuer l'unité 4 · étape 3 sur 6 » pour un apprenant en parcours débutant. À dessiner dans une passe sur l'accueil, hors de ce lot. |
| 3 | Repasser le test aussitôt après un échec | Autorisé (« Repasser le test maintenant ») ; les +25 XP ne se gagnent qu'une fois par unité, quel que soit le nombre de tentatives. |
| 4 | Étapes des unités d'écriture | Lettres, Sons, Mots, Lecture, Test (5) ; le contenu de chaque étape relève de la spec de contenu. |
| 5 | Durées affichées (« 20 min ») | Estimées par le gabarit de l'unité ; à recaler sur les durées mesurées quand elles existent. |

**Tranché (orchestrateur, 2026-11-23)** : 1 → plafonds appliqués comme dans `j4-pr1-architecture.md` §4 (le plafond « par séance » s'applique par unité et par leçon, le plafond de 40 par jour est partagé avec la séance) ; 2 → en PR 1, une carte simple « Continuer · leçon n » dans « Aujourd'hui », qui reprend la ligne de la variante C ; 3, 4 et 5 → recommandations retenues. Les corrections de la DA (§8) sont faites dans la PR 2, avec la carte du parcours. La maquette retenue est locale (`.design/j4/variant-c-ligne.html`) et publiée en privé ; elle n'est pas versionnée.
