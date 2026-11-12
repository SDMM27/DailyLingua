# Direction artistique de la refonte : « L'édition du jour »

Maquettes : `docs/refonte/maquettes/maquettes.html` (11 écrans, clair et sombre côte à côte).

## 1. Diagnostic de l'existant

**Forces à garder.** « Journal du matin » donne à DailyLingua une identité adulte, calme, tournée vers la lecture, que ses concurrents n'ont pas. Papier crème, encre presque noire et indigo tiennent de forts contrastes. Newsreader donne de la tenue aux titres, Inter reste lisible en petit, JetBrains Mono sert de ligne de métadonnées. Masthead, doubles filets et rubriques I à IV hiérarchisent sans couleur. Le surlignage au marqueur deviendra l'état des mots dans le lecteur.

**Limites.**
- *Gamification* : le système n'a ni rôle « réussite », ni « XP », ni « série », ni registre de célébration. Le calme éditorial, appliqué partout, rendrait une bonne réponse aussi neutre qu'une ligne de sommaire : pas de récompense immédiate.
- *Séance guidée* : la une est une page qu'on parcourt. Une séance est un tunnel d'étapes avec un seul geste principal par écran. Il manque une barre de séance, des retours d'exercice et un pied d'action fixe.
- *Multilingue* : Newsreader n'a ni cyrillique, ni grec, ni arabe, ni CJK. Les capitales espacées en mono n'existent pas en arabe, en chinois ou en japonais. Le masthead et les rubriques sont pensés pour le gauche-à-droite et des libellés courts.

## 2. Parti pris : le journal comme socle, l'atelier d'imprimerie comme registre de jeu

Je garde « journal du matin » et je lui ajoute un second registre : **l'atelier**. La *page* (papier, serif, filets, silence) sert à lire et à réfléchir. L'*atelier* (encre pleine, tampons, numéros, repères de calage, éditions spéciales) sert à récompenser. Le passage de l'un à l'autre est la grammaire du produit : l'atelier n'apparaît qu'aux moments de réussite et sur les surfaces de jeu, jamais pendant la lecture.

Le vocabulaire visuel découle de l'imprimerie, et chaque métaphore porte une mécanique réelle :

| Mécanique | Traduction visuelle |
| --- | --- |
| Jour d'étude | Une *édition* numérotée (« N° 214 ») |
| Objectif du jour | Anneau en forme de *repère de calage* ; fermé, il reçoit le tampon « Bon à tirer » |
| Série | *Tampon dateur* avec le nombre de jours ; le gel s'appelle *relâche* (jour sans parution prévu) |
| Réparation de série | *Édition de rattrapage*, proposée sans dramatiser |
| Badge | *Tampon* d'étape réelle (« 500 mots connus », « A2 en lecture ») |
| Quêtes | *Petites annonces* encadrées de pointillés |
| Carte du parcours | *Chemin de fer* (le plan page à page d'un magazine) : une vignette de page par unité |
| Montée de niveau, fin de cahier | *Édition spéciale* : bandeau défilant, gros titre |
| Ligue (option) | *Tableau des résultats* des pages sportives, divisions nommées par formats de presse |

Les étapes de la séance reprennent la numérotation romaine des rubriques (I Révisions, II Texte, III Focus, IV Écriture, V Fluidité, VI Bilan). Le libellé « XP » reste tel quel : il est compris partout et se traduit mal.

**Alternatives écartées.**
1. **Basculer en « app de jeu »** (couleurs saturées, 3D, mascotte omniprésente). Plus d'énergie immédiate, mais on perd l'identité, on ressemble aux leaders du marché et on fatigue les B2-C2 venus pour lire. Ce registre pousse aussi à la sur-récompense.
2. **Journal pur, gamification en chiffres sobres.** Cohérent mais insuffisant : sans retour sensoriel (mouvement, son, haptique), la répétition quotidienne ne devient pas une habitude.
3. **« Carnet de voyage »** (passeport, tampons de pays). Séduisant mais touristique : il éloigne de la lecture, et la symbolique des frontières se prête mal à un public de toutes langues maternelles. J'en garde le tampon, qui existe aussi dans l'imprimerie.

## 3. Système

### Couleurs : rôles sémantiques

Les neutres et l'accent restent ceux du thème `dailylingua`. Ajouts :

| Rôle | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `success` / `success-soft` | `#2f6b4f` / `#e0eee5` | `#7fc29d` / `#1b3326` | Réponse juste, étape validée |
| `error` / `error-soft` | `#a33a32` / `#f6e1de` | `#ec8f86` / `#3e1f1c` | « Encre du correcteur » : erreur, rature |
| `streak` / `streak-soft` | `#9a4322` / `#f6e6dc` | `#e2825c` / `#3b261c` | Série (texte) ; `accent-2` `#b0502b` reste pour les aplats |
| `xp` / `xp-soft` | `#8a5a00` / `#f6ead0` | `#e8b85a` / `#33280f` | Gains d'XP |
| `border-strong` | `#8b8478` | `#6f685e` | Bords de champs et de contrôles (3:1) |

L'erreur n'est jamais un rouge d'alarme : c'est l'encre du correcteur, qui raye et propose. Il n'y a pas de couleur « danger » liée à la série.

**États des mots dans le lecteur** (couleur doublée d'une forme) :
- *nouveau* : marqueur jaune (`#fbe6a0` / `#4b3c13`) et soulignement pointillé ;
- *en cours* : fond indigo pâle (`#dfe4f3` / `#2a3358`) et soulignement plein ;
- *connu* : aucune marque ;
- *mot touché* : contour accent de 2 px.

Le texte d'un mot surligné reste toujours en `ink`.

**Palette de langues** : les dix accents existants (`indigo` à `graphite`) sont conservés. En clair, `ochre` passe de `#9a6a12` à `#8a5e0e` : sur le fond `bg`, l'ancien ne tient que 4,19:1, le nouveau 5,05:1. Une langue ne colore que des éléments d'identité (salutation, pastille, nœud courant) et jamais un état de réussite ou d'erreur.

### Typographie

| Rôle | Latin | Repli par écriture |
| --- | --- | --- |
| Titres, texte à lire | Newsreader 600-700 | Cyrillique, grec : Literata ; arabe : Noto Naskh Arabic ; chinois : Noto Serif SC/TC ; japonais : Noto Serif JP ; hangeul : Noto Serif KR |
| Interface | Inter 400-600 | Cyrillique, grec : Inter ; arabe : Noto Sans Arabic ; CJK : Noto Sans SC/TC/JP/KR |
| Métadonnées | JetBrains Mono 500, capitales espacées +0,1 em | Pour les écritures sans casse (arabe, CJK, hangeul) : police d'interface en 600, sans capitales ni espacement |

Polices chargées par sous-ensemble (`unicode-range`) selon la langue cible et l'interface ; `expo-font` côté natif. Le repli cyrillique doit placer correctement l'accent tonique combinant (U+0301) : Georgia échoue, Literata et PT Serif réussissent. Interligne du lecteur : 1,7 pour l'arabe, 1,8 pour le CJK. L'italique y devient du gras.

Échelle à 375-430 px : 34 / 28 / 22 / 18 (serif), 16 (corps), 14 (secondaire), 12 (minimum, métadonnées), lecteur à 19 px. Les champs font au moins 16 px pour éviter le zoom iOS. Toutes les tailles suivent la taille de texte du système (Dynamic Type) jusqu'à 200 %.

### Grille, espacements, safe areas

- Marges latérales de 20 px (16 px sous 375 px), colonne unique, base d'espacement de 4 px (8, 12, 16, 24, 32).
- `viewport-fit=cover` : le haut respecte `safe-area-inset-top` (54 px sur iPhone récents). La barre d'onglets et les pieds d'action ajoutent `safe-area-inset-bottom` (34 px).
- Les cibles tactiles font au moins 44 × 44 px. Le bouton principal fait 52 px de haut, en pleine largeur dans les pieds d'action.
- Les libellés sont prévus pour s'allonger de 40 % : pas de largeur fixe, retour à la ligne autorisé sur deux lignes, quatre onglets seulement.
- Toute la mise en page utilise des propriétés logiques (`inline-start`, `margin-inline`) pour que le miroir RTL soit automatique. Les flèches et les icônes directionnelles se retournent. Les chiffres, les horloges et les logos ne se retournent pas.

### Élévation et filets

Le journal hiérarchise par filets plutôt que par ombres :
- filet simple `line` entre éléments ;
- double filet sous le masthead et en tête des retours d'exercice ;
- une seule ombre douce, réservée à ce qui flotte (bulle de mot, feuille de retour).

Rayons : 12 px pour les boutons, 14 px pour les cartes, 20 px pour les feuilles.

### Iconographie et illustration

Les icônes sont dessinées au trait de 1,75 px sur une grille de 24 px, aux extrémités arrondies. On évite les métaphores de jeu vidéo (pas de flamme, d'éclair ni de cœur) au profit d'objets d'atelier : tampon dateur, repère de calage, fleuron pour l'XP, page cornée.

Illustrations en aplats de deux encres au plus, avec un léger décalage de repérage assumé ; réservées aux états vides, aux situations débutantes et aux éditions spéciales.

## 4. Mouvement, son, haptique

**Principes.**
- Le mouvement confirme une action : il ne décore pas.
- Une seule signature forte par écran.
- Rien ne bloque : toute célébration se passe d'un toucher.
- Aucun mouvement pendant la lecture.

**Durées et courbes** (tokens existants) :
- 150 ms `ease-out` pour les états (pression, bascule) ;
- 250 ms `ease-out` pour les transitions d'étape (glissement de 24 px dans le sens de lecture, inversé en RTL) ;
- 250-400 ms `ease-spring` pour les récompenses ;
- 600 ms pour une célébration. La séquence de fin de séance dure 1,6 s au plus, et le comptage des XP est passable d'un toucher.

| Moment | Animation | Son | Haptique |
| --- | --- | --- | --- |
| Bonne réponse | Tampon « Juste » (`.sd-stamp`, 300 ms), « +2 XP » qui monte de 8 px | « Tchac » de tampon, doux | Impact léger |
| Erreur | Rature tracée à la plume (200 ms), sans secousse | Aucun | Aucune |
| Fin d'étape | Le segment de la barre se remplit d'encre (`.sd-ink`, 400 ms) | Feuille tournée | Impact léger |
| Anneau fermé | L'arc se complète, les quatre repères s'alignent, tampon « Bon à tirer » | Cloche de composteur | Notification « succès » |
| Série +1 | Le tampon dateur s'abat, le chiffre roule (`initCountUp`) | « Tchac » | Impact moyen |
| Badge | Le tampon tombe de 1,8× à 1× avec rotation | « Tchac » grave | Impact moyen |
| Montée de niveau | Édition spéciale : bandeau défilant (`.sd-marquee`), gros titre révélé à l'encre | Presse qui roule (1 s) | Notification « succès » |

**`prefers-reduced-motion`** : tampons et marqueurs apparaissent sans échelle ni rotation, en fondu de 100 ms au plus, et le bandeau défilant devient fixe. Le sens est porté par le texte (« Juste », « Bon à tirer »), jamais par le seul mouvement.

**Réglages.** Les sons, les vibrations et les célébrations animées ont chacun un interrupteur. Les sons respectent le mode silencieux d'iOS. Volume par défaut : bas.

## 5. Composants clés

- **Barre de séance** : fermer (44 px), six segments, compteur d'XP de la séance en `xp`, puis une ligne mono « Étape II sur VI · Texte ». Fermer met en pause : rien n'est perdu.
- **Carte d'exercice** : consigne en métadonnée, phrase cible en serif 22-25 px, indice, source citée (« Tiré de… »). Champ de 16 px au bord `border-strong`, « Vérifier » fixé au-dessus du clavier.
- **Retour correct ou incorrect** : feuille montante à double filet. Juste : `success-soft`, tampon « Juste », XP, prochaine révision. À revoir : `error-soft`, réponse attendue en entier, explication en une phrase, bouton « J'avais raison ». Le mot « faux » n'apparaît jamais.
- **Lecteur et bulle de mot** : texte à 19 px, phrase lue sur `surface-2`. La bulle donne le mot, le lemme et le genre, la traduction en langue maternelle, la forme dans la phrase, l'écoute et « Ajouter aux révisions » (avec la phrase). Audio phrase par phrase, vitesse 0,6-1,2×, répétition.
- **Anneau d'objectif** : arc indigo, quatre repères de calage, valeur au centre. Fermé, tampon « Bon à tirer ». On lit « 12 XP de plus ferment l'anneau », jamais « il te manque ».
- **Compteur de série** : tampon dateur, jours, relâches en réserve. Une série cassée affiche « Nouvelle série, jour 1 » et propose une fois le rattrapage. Aucun compte à rebours.
- **Carte de quête** : petite annonce en pointillés, verbe d'action, barre, récompense, tampon une fois faite. Toujours du travail utile, jamais la seule présence.
- **Badge** : tampon circulaire, intitulé factuel, date. Les badges à venir montrent leur critère exact.
- **Nœud du parcours** : vignette de page cornée de 64 px. Fait : coche. Courant : couleur de langue. À venir : pointillés et cadenas, contournables par un test. Bilan : étoile « Édition spéciale ».
- **Fin de séance** : une une datée et numérotée, titre factuel, anneau tamponné, relevé d'XP à points de conduite, série, mots appris, erreur du jour, programme de demain. Un seul bouton.
- **Jauge par compétence** : règle A0-C2 en 7 cases, bande hachurée d'incertitude, niveau en toutes lettres (« B1, début »).

## 6. Mascotte

**Piste A, « Pica »** : un caractère mobile en plomb, petit bloc d'encre dont la lettre gravée change selon la langue apprise (Я, ع, あ, ß). Il apporte les nouvelles de la rédaction. On le voit dans l'onboarding, les états vides, la fin de séance et les éditions spéciales, mais jamais dans un exercice ni dans une notification. Ton : sobre, précis, chaleureux (« Texte réécrit sans faute. On l'imprime. »). Animation peu coûteuse : il s'encre, il tamponne.

**Piste B, « Pli »** : un oiseau en origami plié dans une page de journal, messager entre les langues. Il apparaît aux mêmes endroits et porte les mots ajoutés aux révisions. Ton plus tendre et plus enfantin, qui accroche mieux les débutants A0 et parle moins aux C1.

Dans les deux cas, la mascotte ne fait jamais certaines choses : pleurer, bouder, supplier, compter les jours manqués, apparaître dans une relance, commenter une erreur.

**Option C : pas de mascotte.** La personnalité passe par la « voix de la rédaction » et les tampons.

**Recommandation : Pica**, avec un rôle limité. Il s'adapte à toute langue sans biais culturel, prolonge directement la métaphore de l'imprimerie et reste discret pour les apprenants avancés. Si le propriétaire hésite, l'option C est un bon point de départ : Pica peut s'ajouter plus tard sans refonte.

## 7. Accessibilité AA

Contrastes calculés selon la formule de luminance relative du WCAG 2.1. Ils ont été calculés à partir des valeurs hexadécimales, pas estimés.

| Paire (texte / fond) | Clair | Sombre |
| --- | --- | --- |
| `ink` / `bg` | 15,25 | 16,81 |
| `ink` / `surface` | 16,79 | 15,73 |
| `ink` / `surface-2` | 13,95 | 15,09 |
| `muted` / `bg` | 5,12 | 7,02 |
| `muted` / `surface` | 5,63 | 6,56 |
| `muted` / `surface-2` | 4,68 | 6,30 |
| `accent` / `surface` | 8,47 | 7,54 |
| `accent-strong` / `bg` | 7,70 | 10,93 |
| `accent-ink` / `accent` | 8,68 | 7,62 |
| `success` / `surface` | 6,15 | 8,68 |
| `success` / `success-soft` | 5,25 | 6,53 |
| `error` / `surface` | 6,39 | 7,60 |
| `error` / `error-soft` | 5,22 | 6,24 |
| `xp` / `surface` | 5,79 | 9,83 |
| `xp` / `xp-soft` | 4,97 | 7,88 |
| `streak` / `streak-soft` | 5,40 | 5,12 |
| `streak` / `surface` | 6,41 | 6,51 |
| `ink` / mot nouveau | 13,86 | 9,36 |
| `ink` / mot en cours | 13,53 | 10,68 |
| Texte sur bouton `success` | 6,29 (blanc) | 9,28 (`#0f0e0c`) |
| `border-strong` / `surface` (non-texte) | 3,62 | 3,28 |

Écarts relevés et corrigés :
- `accent-2` sur `streak-soft` ne fait que 4,29:1, d'où le token `streak` dédié au texte ;
- `ochre` est corrigé (voir la section 3) ;
- en sombre, `muted` sur un mot nouveau tombe à 3,91:1 : dans un surlignage, on n'écrit qu'en `ink`.

Les filets `line` (1,47:1) sont décoratifs ; les contrôles utilisent `border-strong`. Les dix couleurs de langue dépassent 4,6:1 sur `surface` dans les deux modes.

**Règles complémentaires.**
- La couleur ne porte jamais seule le sens : état des mots par soulignement, retour par tampon écrit, critères avec chiffres, jauges avec niveau en toutes lettres.
- Lecteurs d'écran :
  - les mots du lecteur sont des boutons nommés « ярмарка, mot nouveau » ;
  - l'anneau est un `progressbar` (« 18 sur 30 XP ») ;
  - les retours sont annoncés en région `polite` ;
  - les célébrations ont un équivalent textuel.
- Le texte cible porte son `lang`. Les nombres et les mots latins dans une interface RTL sont isolés (`<bdi>`). Les chiffres suivent la locale (`Intl.NumberFormat`).
- Le focus est visible : contour `ink` de 2 px.

## 8. Conséquences pour `@sdmm/design`

**À ajouter (version mineure) :**
- tokens de rôle `success`, `error`, `streak`, `xp` (avec leurs `-soft`), `border-strong` ;
- tokens `word-new`, `word-learning` ;
- les dix accents de langue (paires clair/sombre et `-soft`) ;
- `--sd-radius-sheet` (20 px) ;
- durées `--sd-dur-celebrate` (600 ms) et `--sd-dur-sequence` (1 600 ms) ;
- une table `scriptFonts` (familles de repli par écriture) exportée par `fontsUrl(theme, scripts)`.

Ces tokens peuvent rester propres au thème `dailylingua`. Les statuts communs `live`/`wip`/`danger` sont conservés pour les autres produits ; `error` n'est pas `danger`.

**Nouveaux utilitaires de mouvement :** `.sd-strike` (rature à la plume) et `.sd-register` (repères qui s'alignent), à côté de `.sd-stamp`, `.sd-ink` et `.sd-mark`, déjà adaptés.

**Commun avec le natif :** tous les tokens passent par `getTheme()` et `nativewindPreset()`. Sons en fichiers, haptiques nommés par intention (`light`, `medium`, `success`) pour `expo-haptics` comme pour le web, composants en propriétés logiques.

## 9. Points à trancher

1. **Mascotte** : Pica (recommandé), Pli ou aucune.
2. **Nom de l'XP** : garder « XP » partout (recommandé) ou le localiser par langue d'interface.
3. **Ligue sans relégation** : seuls les cinq premiers montent, personne ne descend. Je le recommande : c'est la seule forme de ligue compatible avec « pas de pression ». Elle est désactivée par défaut.
4. **Relâches (gel)** : recommandé, deux en réserve, regagnées par sept jours d'étude, et posées automatiquement les jours non prévus au planning.
5. **Sons activés par défaut** : recommandé oui, volume bas, en respectant le mode silencieux.
6. **Objectif du jour en XP ou en minutes** : recommandé en XP, puisque l'XP ne vient que du travail utile, avec équivalence en minutes affichée dans les réglages.
7. **Texte cible en serif** : recommandé Newsreader + Literata pour le cyrillique et le grec. Alternative : Inter pour tout le lecteur, plus neutre mais moins « journal ».
