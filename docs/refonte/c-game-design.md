# Refonte — C. Game design : une gamification riche mais honnête

> Document de conception. Il remplace la phase V « sobre » de `docs/plans/roadmap-plateforme.md` (§3). Les décisions fermes (riche mais honnête, XP issue du seul travail utile, calcul serveur, aucune vie ni monnaie, chaque mécanique désactivable) ne sont pas rouvertes ici. La mascotte relève de la direction artistique ; ce document indique seulement où un personnage serait utile.

## 1. Principes

**Ce que la gamification doit produire.**

1. **De la régularité** : un rituel court, sans décision à prendre (leçon de Pimsleur), qui revient presque chaque jour. L'espacement des révisions et le volume d'input n'ont d'effet que s'ils sont réguliers.
2. **De l'effort sur les volets négligés** : les quatre volets de Nation (input, output, étude, fluidité) doivent chacun approcher 25 % du travail. Les quêtes et les bonus poussent vers le volet en retard, pas vers le plus facile.
3. **Un sentiment de compétence fondé** : chaque récompense renvoie à quelque chose que l'apprenant sait faire de plus, prouvé par un rappel, une compréhension vérifiée ou une production corrigée.

**Ce qu'elle ne doit jamais produire** : la fixation sur un compteur au détriment de l'apprentissage, la compulsion (séances vides juste avant minuit), la culpabilité, l'anxiété de perte, l'avalanche de révisions après une absence, la course au temps d'écran.

**Comment chaque besoin de l'autodétermination (Deci & Ryan) est servi.**

| Besoin | Ce qui le sert | Ce qui le menacerait (et qu'on évite) |
|---|---|---|
| Autonomie | Durée de séance au choix, jours de repos choisis, série quotidienne ou hebdomadaire, un interrupteur par mécanique, relance d'une quête par jour | Objectifs imposés, ligue obligatoire, notifications non choisies |
| Compétence | XP proportionnelle au travail réussi, badges liés à des compétences prouvées, carte du parcours, bilan « tu sais maintenant… », scores discriminants (leçon de Speak) | Récompenser tout, féliciter une réponse fausse, compteurs opaques (leçon de LingQ) |
| Lien | Défis coopératifs entre amis, objectif commun de semaine, ligue optionnelle entre pairs de même volume | Classement global écrasant, exposition des erreurs, comparaison avec des inconnus beaucoup plus actifs |

**Règle d'or.** Le client n'envoie que des **tentatives** (réponses, enregistrements, textes, événements de lecture horodatés). Le serveur corrige, décide du gain et l'inscrit dans un journal d'XP en ajout seul. Aucune valeur d'XP ne transite du client vers le serveur.

## 2. Économie de l'XP

### 2.1 Barème

Une carte n'est comptée qu'une fois par jour pour l'XP (le premier succès du jour). Les étapes intra-journée (revoir après 1 min, 10 min) ne rapportent rien de plus. Une carte non due (révision anticipée, bachotage) rapporte 0 XP.

| Action utile | XP | Preuve exigée côté serveur | Plafond |
|---|---|---|---|
| Rappel réussi — reconnaissance (L2 → L1, choix) | 1 | Carte due ou nouvelle dans la limite quotidienne ; réponse corrigée par le serveur ; temps de réponse ≥ 600 ms | Révisions : 120 XP/jour au total |
| Rappel réussi — production écrite (L1 → L2 tapée, trous) | 2 | Idem ; réponse tapée comparée à la forme attendue (tolérance accents réglable) ; ≥ 1 000 ms | Idem |
| Rappel réussi — écoute ou dictée de carte | 2 | Audio réellement lu (événement de lecture), réponse correcte | Idem |
| Rappel réussi — réponse orale | 3 | Enregistrement transcrit, mot cible reconnu | Idem |
| Bonus difficulté | +1 | Carte de stabilité < 3 jours ou sangsue (≥ 6 échecs) réussie | Inclus dans les 120 |
| Reconquête | +1 | Carte ratée la veille, réussie aujourd'hui | Inclus dans les 120 |
| Texte lu jusqu'au bout, compréhension 60-89 % | 15 | Événements de défilement jusqu'à la fin ; durée ≥ nombre de mots ÷ 400 mots/min ; ≥ 3 questions répondues | 4 textes/jour à plein tarif, puis 50 % ; 100 XP/jour |
| Idem, compréhension ≥ 90 % | 20 | Idem | Idem |
| Texte long (> 600 mots) | × 1,5 | Longueur du texte côté serveur | Idem |
| Audio écouté en entier + questions sans texte | 12 (≥ 60 %) / 16 (≥ 90 %) | Événements de lecture couvrant ≥ 95 % de la piste, à vitesse ≤ 1,5× | Compté dans les 100 XP « input » |
| Exercice de focus (trous, transformation) | 2 juste du premier coup, 1 au deuxième essai | Correction serveur | 20 XP/séance, 40 XP/jour |
| Production corrigée (écrite ou orale) | 15 | Longueur ≥ seuil du niveau (A1 : 20 mots, A2 : 35, B1 : 60, B2 : 90, C1-C2 : 120) ; langue détectée = langue cible ; similarité < 50 % avec le texte source et avec ses 30 dernières productions | 2 productions/jour |
| Réécriture d'une phrase corrigée | 5 par phrase (3 si identique mot pour mot à la version native) | La phrase réécrite supprime ≥ 1 erreur signalée par la correction | 2 phrases par production, donc 20 XP/jour |
| Erreur du jour retravaillée (micro-exercice du lendemain) | 3 | Exercice réussi portant sur une erreur de la veille | 2/jour |
| Passage de fluidité | 5 | Relecture ou redite chronométrée terminée ; vitesse ≥ 90 % du passage précédent ; texte déjà compris | 2/jour |
| Minute d'oral vérifiée (production libre, jeu de rôle IA) | 3 par minute de parole de l'apprenant | Durée de voix détectée ; transcription en langue cible ; débit ≥ 30 mots/min (A1-A2) ou 60 (B1+) | 30 XP/jour (10 min de parole) |
| Phrase de shadowing | 1 | Correspondance transcription ↔ modèle ≥ 60 % | 30/jour |
| Phrase de dictée | 1 (2 si ≥ 95 % des caractères justes) | ≥ 80 % des caractères justes | 30 XP/jour |
| Unité du parcours débutant terminée | 25 | Test de fin d'unité ≥ 80 %, une seule fois par unité | 2 unités/jour |
| Descripteur « Je peux… » validé | 50 | Validation par la tâche d'évaluation (W), une seule fois | Aucun (rare par nature) |
| Séance complète | 10 | Toutes les étapes du format choisi validées par leur preuve | 1/jour |
| Quête quotidienne terminée | 10 | Conditions recalculées par le serveur sur le journal | 3/jour |
| Quête hebdomadaire terminée | 40 | Idem | 3/semaine |
| Immersion déclarée (série, podcast, conversation hors app) | 1 par tranche de 10 min | Aucune preuve possible : simple déclaration | 6 XP/jour ; exclue des ligues, des quêtes et de la validation de la série |

**Rendements décroissants (anti-farm).** Au-delà de 150 rappels dans la journée, chaque rappel vaut la moitié ; au-delà de 300, rien. Un texte relu le même jour rapporte 0 (sauf en passage de fluidité). Une production trop proche d'une précédente rapporte 0 et le bilan l'explique (« Cette production ressemble beaucoup à celle de mardi ; elle a été corrigée mais ne rapporte pas d'XP »).

**Traitement des erreurs.** Une réponse fausse vaut 0, sans pénalité : on ne retire jamais d'XP. Une erreur **corrigée par l'apprenant** vaut quelque chose, parce que c'est là que l'on apprend : la réécriture (5 XP), la reconquête d'une carte (+1), l'erreur du jour retravaillée (3 XP). Le deuxième essai d'un exercice de focus vaut 1 XP. L'XP ne baisse jamais : c'est un journal de travail fait, pas une note.

**Pourquoi l'immersion déclarée est plafonnée bas.** Le temps hors app compte énormément pour devenir bilingue (§1 de la roadmap, volume FSI), et l'app doit le rendre visible. Mais il est invérifiable : le récompenser au même tarif que le travail prouvé rendrait l'XP déclarative, donc sans valeur, et ouvrirait les ligues à la triche. Il est donc affiché dans son propre compteur (heures d'immersion, objectif hebdomadaire d'immersion facultatif), ne rapporte que 6 XP par jour au plus, et n'entre ni dans les ligues, ni dans les quêtes, ni dans la validation d'un jour de série.

### 2.2 Simulation de trois profils

Hypothèses : séance du format choisi, réussites réalistes, 6 jours actifs sur 7.

| Poste | A — Débutant A1, 10 min/jour | B — Intermédiaire B1, 20 min/jour | C — Avancé C1, 45 min/jour (séance 30 min + 15 min de jeu de rôle) |
|---|---|---|---|
| Révisions | 15 cartes, 12 réussies (8 × 1 + 4 × 2) = 16 | 30 cartes, 26 réussies (10 × 1 + 12 × 2 + 4 × 2) + 2 bonus = 44 | 50 cartes, 45 réussies (10 × 1 + 20 × 2 + 15 × 3) + 5 bonus = 100 |
| Input | Texte de 150 mots, 70 % = 15 | Texte de 400 mots, 85 % = 15 | Texte de 900 mots, 92 % = 30 |
| Focus | 5 justes du premier coup = 10 | 7 + 1 au deuxième essai = 15 | 8 items = 15 |
| Output | Production 15 + 1 réécriture 5 = 20 | Production 15 + 2 réécritures 10 = 25 | Production 15 + 2 réécritures 10 = 25 |
| Fluidité | — (absente du format 10 min) | 5 | 5 |
| Oral | — | — | 6 min de parole effective × 3 = 18 |
| Séance complète + 1 quête | 10 + 10 = 20 | 10 + 10 = 20 | 10 + 10 = 20 |
| Immersion déclarée | 0 | 30 min = 3 | 90 min = 6 (plafond) |
| **Total jour** | **81** | **127** | **219** |
| XP par minute d'app | 8,1 | 6,4 | 4,9 |
| **Semaine** (6 jours + 1 quête hebdo) | **526** | **802** | **1 354** |
| Part comptée en ligue (plafond 150/jour, sans immersion) | 526 / semaine | 770 / semaine | 900 / semaine |

**Lecture.** L'XP suit le nombre d'unités réussies (cartes rappelées, textes compris, phrases corrigées), pas les minutes. Le profil C passe 4,5 fois plus de temps que A mais gagne 2,7 fois plus d'XP, et seulement 1,7 fois plus en ligue. À titre de contrôle, un quatrième profil « écran » qui passe 45 minutes à rejouer des cartes non dues (0), relire six fois le même texte (15 la première fois, 0 ensuite) et envoyer trois productions recopiées (0) gagne **15 XP** : le temps d'écran seul ne rapporte presque rien.

## 3. Mécaniques

Chaque mécanique suit le même gabarit. Les événements cités sont détaillés au §6.

### 3.1 Objectif du jour (anneau) et de la semaine

- **But** : donner une ligne d'arrivée claire au rituel quotidien.
- **Comportement récompensé** : finir le travail prévu, quelle que soit sa forme.
- **Règles** : l'anneau se remplit en XP vérifiée (hors immersion). Paliers proposés, libellés en minutes pour rester parlants : 10 min = 50 XP, 20 min = 100 XP, 30 min = 150 XP, 45 min = 220 XP. Le palier se règle à tout moment ; un changement s'applique au lendemain. Objectif de semaine = 5 × l'objectif du jour (deux jours de marge) ; il affiche aussi les quatre volets sous forme de quatre segments.
- **Cas limites** : la journée d'apprentissage va de 04:00 à 03:59 heure locale (une séance à 00:30 compte pour la veille). Hors ligne : l'anneau avance localement de façon provisoire (grisé), le serveur confirme à la synchronisation. Plusieurs langues : un seul anneau, toutes langues confondues, avec la répartition par langue dans le détail.
- **Ce que voit l'utilisateur** : l'anneau sur l'accueil, le chiffre « 82 / 100 XP », la semaine en sept pastilles.
- **Garde-fous** : pas de bonus au-delà de 100 % de l'anneau ; aucune animation qui pousse à « dépasser » l'objectif. Si l'objectif est atteint 0 fois sur 14 jours, l'app propose (une fois) de le baisser.
- **Désactivé** : l'anneau disparaît ; la séance et son bilan restent.
- **Mesures** : `goal_set`, `goal_reached`, taux d'atteinte, palier choisi.

### 3.2 Série

- **But** : installer l'habitude quotidienne.
- **Comportement récompensé** : revenir, même brièvement, pour du vrai travail.
- **Validation d'un jour** : ≥ 20 XP vérifiées hors immersion et hors quêtes, ou une séance complète, quelle que soit sa durée. Un rappel isolé ne suffit pas (anti-séance de minuit).
- **Gel automatique** : 1 gel offert chaque lundi, stock maximal 2. Il s'applique tout seul à un jour non validé.
- **Gels gagnés** : +1 gel pour chaque semaine où l'objectif de semaine est atteint ; stock total plafonné à 3. Aucun gel ne s'achète.
- **Jours de repos choisis** : jusqu'à 2 jours fixes par semaine (par exemple le dimanche) ; ils ne cassent pas la série, ne consomment pas de gel et ne comptent pas comme jours de série.
- **Réparation** : dans les 48 h suivant un jour manqué non couvert, faire une séance complète de rattrapage en plus de celle du jour répare la série. Une réparation par période de 30 jours.
- **Série de semaines (alternative)** : une semaine est validée si l'utilisateur atteint le nombre de jours actifs qu'il a choisi (2 à 7, 4 par défaut). Pas de gel ni de réparation dans ce mode : la marge est dans la règle.
- **Cas limites** : fuseau horaire pris sur l'appareil au moment de l'action ; un seul changement de fuseau pris en compte par 48 h, et aucun voyage ne peut créer deux jours ni en effacer un. Hors ligne : l'horodatage client est accepté s'il date de moins de 72 h à la réception et qu'il est cohérent avec les tentatives précédentes ; au-delà, l'XP est inscrite mais le jour n'est pas validé rétroactivement (le gel joue s'il en reste). Plusieurs langues : une seule série par utilisateur.
- **Ce que voit l'utilisateur** : le nombre de jours, les gels disponibles en petit, le record. Animation courte à la validation du jour (amélioration de la rétention J7 observée chez Duolingo).
- **Série perdue** : jamais de message de perte ni d'écran triste. Texte affiché : « Nouvelle série : jour 1. Tes 23 jours précédents restent dans ton historique : 412 cartes réussies, 14 textes lus. » Le record reste visible sans comparaison.
- **Garde-fous** : la série n'apparaît dans aucune notification sous forme de menace ; pas de compte à rebours ; pas de mention de la série après 21 h.
- **Désactivé** : le compteur disparaît partout, l'historique est conservé, les gels sont gelés.
- **Mesures** : `streak_day_validated`, `freeze_used`, `streak_repaired`, `streak_reset`, heure de validation.

### 3.3 Quêtes quotidiennes et hebdomadaires

- **But** : orienter l'effort vers les volets négligés.
- **Règles** : 3 quêtes par jour (10 XP chacune), 3 par semaine (40 XP chacune). Une relance de quête quotidienne par jour. Les quêtes non terminées disparaissent sans trace ni reproche.
- **Algorithme de choix** : (1) calculer, sur 14 jours glissants, la part de chaque volet dans l'XP vérifiée ; (2) écart = 25 % − part ; (3) quête 1 tirée dans le volet au plus grand écart, quête 2 dans le deuxième, quête 3 dans « régularité ou découverte » ; (4) exclure les quêtes faites dans les 3 derniers jours et celles qui exigent une fonction désactivée (micro refusé, oral coupé) ; (5) cible calibrée à ≤ 40 % de l'XP médiane quotidienne des 14 derniers jours, pour qu'une quête tienne dans la séance normale. Hebdomadaires : une par chacun des deux volets les plus en retard, plus une transverse. Nouveaux comptes : catalogue « découverte » les 7 premiers jours.

| # | Quête | Volet | Type |
|---|---|---|---|
| 1 | Lis 2 textes jusqu'au bout | Input | Jour |
| 2 | Obtiens ≥ 90 % de compréhension sur un texte | Input | Jour |
| 3 | Écoute un audio en entier sans le texte | Input | Jour |
| 4 | Lis 5 textes cette semaine | Input | Semaine |
| 5 | Lis un texte de plus de 600 mots | Input | Semaine |
| 6 | Dis 3 phrases à voix haute | Output | Jour |
| 7 | Réécris 2 phrases corrigées | Output | Jour |
| 8 | Envoie une production qui réemploie 3 mots du focus | Output | Jour |
| 9 | Fais un jeu de rôle de 3 min | Output | Semaine |
| 10 | Envoie 4 productions cette semaine | Output | Semaine |
| 11 | Réussis 10 rappels en mode production | Étude | Jour |
| 12 | Reconquiers 3 cartes ratées hier | Étude | Jour |
| 13 | Termine ton échauffement sans carte sautée | Étude | Jour |
| 14 | Retravaille l'erreur du jour | Étude | Jour |
| 15 | Valide un point de grammaire avec ≥ 80 % | Étude | Semaine |
| 16 | Fais 2 passages de fluidité | Fluidité | Jour |
| 17 | Bats ta vitesse de lecture sur un texte facile | Fluidité | Jour |
| 18 | Fais 10 phrases de shadowing | Fluidité | Jour |
| 19 | Redis ta production plus vite (4/3/2) 3 fois cette semaine | Fluidité | Semaine |
| 20 | Fais 5 phrases de dictée | Fluidité / Input | Jour |
| 21 | Fais une séance complète 4 jours cette semaine | Régularité | Semaine |
| 22 | Ouvre un texte de la bibliothèque hors séance et lis-le en entier | Découverte | Jour |
| 23 | Termine une unité du parcours débutant | Découverte | Jour |
| 24 | Couvre les quatre volets dans la semaine | Régularité | Semaine |

- **Garde-fous** : jamais plus de 3 quêtes visibles ; aucune quête de temps passé ni de connexion ; aucune quête ne demande de dépasser l'objectif du jour.
- **Désactivé** : plus de quêtes ; le volet en retard reste signalé dans le bilan hebdomadaire.
- **Mesures** : `quest_assigned`, `quest_rerolled`, `quest_completed`, évolution de la part du volet ciblé après 14 jours.

### 3.4 Ligues hebdomadaires (option)

- **But** : un peu d'émulation pour ceux qui l'aiment.
- **Comportement récompensé** : la régularité du travail vérifié, plafonnée.
- **Règles** : activation volontaire uniquement, après 7 jours d'ancienneté et 3 jours de série. Cohortes de 20 (minimum 8), formées le lundi à 04:00 par tranche de volume habituel : médiane hebdomadaire d'XP de ligue sur les 3 dernières semaines, en 5 tranches (< 200, 200-499, 500-899, 900-1 399, ≥ 1 400). Seule l'XP vérifiée compte, plafonnée à 150 XP par jour, hors immersion. Durée : lundi 04:00 → dimanche 23:59, heure de Paris pour tous.
- **Alternative moins anxiogène retenue** : pas de promotion ni de relégation. Chacun est réapparié chaque semaine avec des pairs de même volume ; la fin de semaine montre le rang et une distinction « podium » (top 3) ou « régularité » (≥ 5 jours actifs), sans perte possible.
- **Peu d'utilisateurs au lancement (quelques dizaines)** : moins de 8 inscrits dans une tranche → fusion avec la tranche voisine ; moins de 16 inscrits au total → la ligue devient un **défi collectif** (objectif commun de la communauté, par exemple 5 000 XP dans la semaine), sans classement. Pas de faux joueurs.
- **Anti-triche** : XP serveur uniquement ; plafond journalier ; écart à la médiane de la cohorte > 4 écarts-types → XP de ligue mise en attente et revue ; temps de réponse anormalement réguliers ou trop courts → tentatives ignorées pour la ligue ; un compte par appareil pour la ligue.
- **Ce que voit l'utilisateur** : pseudonyme et XP de semaine des membres, sa position, le temps restant ; aucun niveau, aucune erreur.
- **Garde-fous** : pas de notification de dépassement (« X t'a dépassé ») ; quitter la ligue en un geste, à tout moment.
- **Désactivé** : l'utilisateur sort de la cohorte, son pseudonyme disparaît dès le recalcul suivant.
- **Mesures** : `league_joined`, `league_left`, rang final, rétention des cartes des participants vs non-participants.

### 3.5 Badges (étapes réelles)

- **But** : marquer des seuils de compétence prouvés. Pas de collection à compléter, pas de badge caché.
- **Règle** : chaque badge est attribué par le serveur à partir du journal ; il est définitif (un mot oublié plus tard ne retire pas un badge).

| Famille | Badges |
|---|---|
| Mots connus (prouvés par le rappel) | 100, 250, 500, 1 000, 2 000, 3 000, 5 000, 8 000 (8) |
| Niveau CECR par compétence | A1, A2, B1, B2, C1, C2 franchi, pour chacune des 4 compétences (24, comptés comme 6 badges à 4 facettes) |
| Lecture | Premier texte lu sans glossaire avec ≥ 90 % ; 10, 50, 200 textes compris ; premier texte authentique non adapté compris (5) |
| Écoute | Premier audio compris sans texte ; 10 h d'audio écouté en entier ; première dictée à ≥ 95 % (3) |
| Production | Première production sans erreur de grammaire ; 50 réécritures ; première production de 200 mots au niveau B2+ (3) |
| Oral | Première conversation IA de 5 min ; 60 min de parole cumulée ; 100 phrases de shadowing à ≥ 80 % (3) |
| Pratique | 10, 50, 100, 500 h de pratique vérifiée (4) |
| Parcours | Chaque niveau du parcours débutant terminé (A0, A1, A2) (3) |
| Descripteurs | 10, 25, 50 descripteurs « Je peux… » validés (3) |

Soit 38 badges. **Désactivé** : les badges ne sont plus montrés ni célébrés, mais restent calculés (réactivation sans perte). **Mesures** : `badge_awarded`.

### 3.6 Carte du parcours

- **But** : rendre visible un chemin long (A0 → C2) par compétence.
- **Règles** : quatre pistes parallèles (lire, écouter, écrire, parler), alimentées par le niveau continu de W. De A0 à B1, chaque niveau est découpé en 4 étapes ; de B2 à C2, en 6 étapes, plus des **jalons d'usage** qui arrivent plus souvent que les changements de niveau : premier article de presse non adapté, premier épisode de podcast sans transcription, première heure de série sans sous-titres (déclarée, donc marquée comme telle), première argumentation de 300 mots corrigée sans erreur grave.
- **Aux niveaux B2+** : la carte montre la progression de la semaine en volume (heures d'input, mots rencontrés, tournures réemployées), le prochain jalon atteignable en moins d'un mois, et une projection prudente sous forme de fourchette (« C1 en lecture : entre 5 et 9 mois à ton rythme actuel »).
- **Garde-fous** : jamais de recul visuel brutal ; si le niveau continu baisse, l'étape reste atteinte et un message propose une révision.
- **Désactivé** : la carte est remplacée par le tableau de niveaux de W.
- **Rôle utile d'un personnage** : guide qui accompagne l'avatar sur la carte et commente les jalons.
- **Mesures** : `map_viewed`, `map_step_reached`.

### 3.7 Écran de fin de séance et célébrations

- **Bilan** : XP du jour, mots appris (passés en révision), erreur du jour corrigée, ce qui revient demain, volets couverts. Durée d'affichage courte, un seul bouton « Terminer ».
- **Hiérarchie des moments** (au plus une grande célébration par séance, les autres attendent la suivante) :

| Niveau | Moment | Forme |
|---|---|---|
| 1 | Bonne réponse | Coche + son bref |
| 2 | Étape de séance validée, quête terminée | Petite animation dans la barre |
| 3 | Séance terminée, anneau complet, jour de série validé | Écran de bilan animé (≤ 3 s) |
| 4 | Objectif de semaine, série de 7/30/100 jours, badge | Carte plein écran |
| 5 | Niveau CECR franchi dans une compétence, descripteur « Je peux » validé, palier de 1 000 mots | Grande célébration, avec partage facultatif |

- **Rôle utile d'un personnage** : dans le bilan (désigner l'erreur du jour) et lors des célébrations de niveau 5.
- **Désactivé** (« célébrations réduites ») : tous les moments passent au niveau 1-2.

### 3.8 Sons et retour haptique

- **Événements** : bonne réponse, réponse fausse (son neutre, jamais punitif), étape validée, séance terminée, badge, célébration de niveau 5, début et fin d'enregistrement.
- **Réglages** : sons (activés / désactivés), volume (3 niveaux), haptique (activée / désactivée).
- **Défauts** : sons coupés par défaut ; à la fin de la première séance, une proposition unique : « Tu veux entendre un petit son à chaque bonne réponse ? ». Haptique activée par défaut dans les apps natives. Dans la PWA iOS, Safari ne prend pas en charge l'API de vibration : pas d'haptique, le réglage est masqué.
- **Garde-fous** : aucun son pendant la lecture d'un audio de leçon ; aucun son de « perte ».
- **Mesures** : `sound_toggled`, `haptics_toggled`.

### 3.9 Défis entre amis (option)

- **Formats coopératifs** : objectif commun de semaine (2 à 5 amis cumulent leur XP vérifiée vers une cible fixée à 80 % de la somme de leurs objectifs, chaque contribution plafonnée à 150 XP/jour) ; série en binôme (le jour compte quand les deux le valident ; gel partagé de 1 par semaine) ; lecture commune (même texte, on compare ses réponses après coup). Format compétitif possible en duel hebdomadaire, uniquement si les deux l'activent.
- **Confidentialité** : amis par code ou lien d'invitation, jamais par import de contacts ; visible par les amis : pseudonyme, langue cible, XP de semaine, série si activée. Jamais les erreurs, les productions ni le niveau, sauf partage explicite.
- **Désactivé** : les défis en cours se terminent sans pénalité, l'utilisateur disparaît des listes de ses amis.
- **Mesures** : `friend_invited`, `coop_goal_reached`, rétention à J30 des membres d'un défi.

### 3.10 Notifications

- **Règles** : au plus 1 notification par jour, à l'heure choisie (défaut proposé : 19:00). Aucune si la journée est déjà validée. Aucune entre 21:30 et 08:00 sauf si l'heure choisie s'y trouve. Le dimanche, le résumé hebdomadaire remplace le rappel et part même si la journée est validée. Après 5 rappels ignorés de suite, passage automatique à 1 par semaine, avec un message unique qui le dit ; après 3 semaines ignorées, arrêt complet jusqu'à réactivation.
- **Exemples autorisés** :
  - « Ton texte du jour est prêt : 6 minutes sur un marché de Lisbonne. » / "Today's text is ready: 6 minutes at a market in Lisbon."
  - « 12 cartes t'attendent, environ 3 minutes. » / "12 cards are waiting, about 3 minutes."
  - « Cette semaine : 4 textes lus et 38 mots nouveaux. Bravo. » / "This week: 4 texts read and 38 new words. Well done."
  - « Hier, tu as corrigé une tournure difficile. On la revoit aujourd'hui ? » / "Yesterday you fixed a tricky phrase. Want to see it again today?"
- **Interdit** : menace sur la série (« Ta série va s'éteindre »), culpabilité (« Tu nous manques », personnage triste), fausse urgence, compte à rebours, comparaison avec un ami, relance multiple, notification promotionnelle déguisée en rappel.
- **Web Push sur iOS** : uniquement dans la PWA ajoutée à l'écran d'accueil, iOS ≥ 16.4 ; permission demandée après un geste de l'utilisateur, jamais à l'ouverture, et seulement après la deuxième séance terminée ; service worker et clés VAPID ; dans Safari non installé, l'app propose d'installer la PWA au lieu de demander la permission.
- **Désactivé** : aucune notification ; le résumé hebdomadaire reste consultable dans l'app.
- **Mesures** : `push_permission_prompted`, `push_sent`, `push_opened`, `push_ignored_streak`, désinstallations dans les 24 h suivant un envoi.

## 4. La boucle d'engagement

| Moment | Ce qui se passe | Mécaniques dévoilées |
|---|---|---|
| **J1** | Séance de 10 min par défaut, sans choix à faire. Premier « gain honnête » : à la fin, l'utilisateur voit 5 mots qu'il sait maintenant rappeler, une phrase qu'il a réécrite correctement, et 60-80 XP expliquées ligne par ligne. Proposition des sons. | XP, bilan, anneau |
| **J2** | Retour du rituel : l'erreur d'hier devient le premier exercice. Premier jour de série validé, petite animation. Demande de permission de notification (si PWA installée) avec choix de l'heure. | Série, notification |
| **J3-J4** | Apparition des 3 quêtes quotidiennes (catalogue découverte). Choix proposé : série quotidienne ou série de semaines, jours de repos. | Quêtes, réglages de série |
| **J5-J7** | Premier gel expliqué lorsqu'il sert. Objectif de semaine et premier bilan hebdomadaire (volets couverts). Premiers badges de mots connus (100). | Objectif de semaine, gel, badges |
| **J8-J14** | Carte du parcours ouverte avec la position par compétence. Ligue proposée une fois (option), défis entre amis visibles dans les réglages. | Carte, ligue, amis |
| **J30** | Premier palier de série de 30 jours ou 4 semaines validées ; quêtes hebdomadaires calibrées sur le volet le plus faible ; bilan mensuel des volets. Si la part de l'output est < 15 %, la quête hebdomadaire d'oral est proposée. | Quêtes hebdo ciblées |
| **M6** | Le levier principal devient la compétence : descripteurs « Je peux » validés, jalons d'usage de la carte, projection prudente. L'app suggère d'alléger les mécaniques extrinsèques (« Tu peux masquer la ligue et garder seulement ta carte »). | Descripteurs, jalons B2+ |

**Reprise après absence (≥ 3 jours)** : séance de reprise de 10 min, révisions plafonnées à 20 cartes, nouvelles cartes suspendues 2 jours, aucune mention de l'absence ni du nombre de cartes en retard (leçon d'Anki). Un personnage peut accueillir ce retour avec bienveillance.

## 5. Dérives possibles

| Mécanique | Comportement toxique | Signal mesurable | Parade |
|---|---|---|---|
| XP | Chasser l'XP par les actions les plus rentables | Rétention FSRS mesurée en baisse de > 5 points sur 4 semaines alors que l'XP monte | Plafonds par action, rendements décroissants, message de bilan qui montre la rétention à côté de l'XP |
| Série | Séance minimale juste avant minuit | > 50 % des jours validés dans les 30 min avant la fin de journée, avec XP proche du seuil | Seuil de 20 XP, fin de journée à 04:00, proposition de série de semaines |
| Série | Anxiété, usage malgré la fatigue | Jours validés à < 25 XP pendant 7 jours de suite ; réglages de série ouverts puis refermés | Proposer jours de repos et gels ; aucune notification sur la série |
| Quêtes | Ne faire que les quêtes faciles | Taux de relance > 80 % ; volet ciblé qui ne progresse pas en 14 jours | Relance limitée à 1/jour ; quêtes du volet faible non relançables deux fois de suite |
| Ligues | Fixation sur le classement, compulsion | Utilisateur au plafond de 150 XP 7 jours sur 7 ; séances multiples la nuit du dimanche | Plafond journalier, pas de relégation, proposition de pause de ligue |
| Ligues | Triche | Temps de réponse < 600 ms en série, précision de 100 % sur 200 cartes | Mise en attente de l'XP de ligue, revue |
| Badges | Bachotage pour franchir un palier | Pic de nouvelles cartes avant un palier puis chute de rétention | Mots « connus » exigent une stabilité ≥ 21 jours |
| Immersion | Déclarations gonflées | > 4 h/jour déclarées 5 jours de suite | Plafond 6 XP, exclusion des ligues, compteur à part |
| Célébrations | Lassitude, bruit | Écran de bilan fermé en < 1 s dans > 80 % des cas | Réduire la fréquence des niveaux 3-4 |
| Notifications | Harcèlement perçu | Désactivation ou désinstallation dans les 24 h d'un envoi | Passage automatique à 1/semaine, puis arrêt |
| Défis amis | Pression sociale | Abandon d'un défi suivi d'une baisse d'activité | Sortie sans pénalité, pas de notification d'ami |

## 6. Besoins pour le modèle de données et le serveur

**Événements (envoyés par le client, horodatés, idempotents par identifiant client)** : `review_attempt` (carte, mode, réponse, temps), `reading_progress` (texte, positions de défilement, durées), `comprehension_answer`, `audio_playback` (segments écoutés, vitesse), `focus_attempt`, `production_submitted`, `rewrite_submitted`, `fluency_pass`, `speech_segment` (durée de voix, transcription), `shadowing_attempt`, `dictation_attempt`, `unit_test_attempt`, `can_do_task_attempt`, `immersion_declared`, `session_started`, `session_step_completed`, plus les événements d'interface listés par mécanique.

**Journaux et tables (besoins)** :

- **Journal d'XP en ajout seul** : utilisateur, langue, montant, règle appliquée, tentative source, jour d'apprentissage, éligible à la ligue (oui/non) ; corrections uniquement par écriture compensatoire signée par le serveur.
- **Tentatives** brutes et leur correction serveur (preuves).
- **Jours d'apprentissage** : un enregistrement par utilisateur et jour local, avec fuseau, XP vérifiée, validation, motif (travail, gel, repos, réparation).
- **État de série** : longueur, record, mode (jour/semaine), gels en stock, dernière réparation, jours de repos choisis.
- **Objectifs** : palier du jour, objectif de semaine, historique des changements.
- **Quêtes** : catalogue versionné, attributions, progression, relances.
- **Ligues** : cohortes hebdomadaires, appartenance, tranche, XP de ligue agrégée, signalements anti-triche.
- **Badges** : catalogue, attributions (définitives).
- **Amis et défis** : invitations, liens d'amitié, défis, contributions.
- **Notifications** : abonnements Web Push, envois, ouvertures, compteur d'ignorés.
- **Réglages de gamification** (un interrupteur par mécanique) : XP visible, anneau, série (et mode), quêtes, ligue, badges, carte, célébrations (complètes/réduites), sons, haptique, défis amis, notifications (et heure), immersion dans l'XP.

**Règles calculées côté serveur** : correction des tentatives et barème du §2.1 ; plafonds et rendements décroissants ; similarité des productions ; attribution au jour d'apprentissage (fuseau, 04:00, fenêtre hors ligne de 72 h) ; validation des jours, gels, réparation ; choix des quêtes et leur réalisation ; formation des cohortes et classement ; attribution des badges ; détection d'anomalies ; décision d'envoi des notifications. Toutes ces règles vivent dans le domaine pur (`src/lib/domain`), testées, et sont exécutées par le serveur.

## 7. Points à trancher par le propriétaire du produit

| Question | Recommandation | Argument |
|---|---|---|
| Ligues : avec ou sans relégation ? | **Sans**, avec réappariement hebdomadaire par volume | La relégation est le principal moteur d'anxiété documenté (arXiv 2203.16175) ; l'appariement par volume garde l'émulation. |
| Série quotidienne ou hebdomadaire par défaut ? | **Quotidienne**, avec gel automatique, et choix proposé à J3 | L'habitude se forme par la répétition quotidienne ; le gel augmente les actifs sans hausse des absences (Duolingo). Le choix à J3 préserve l'autonomie. |
| Sons activés ou coupés par défaut ? | **Coupés**, proposés à la fin de la première séance | Usage fréquent en public (transports) ; la proposition au bon moment garde le bénéfice pour ceux qui veulent. |
| Seuil de validation d'un jour | **20 XP ou une séance complète** | Exclut la séance de 10 secondes, reste atteignable en 3 minutes de révisions. |
| Immersion déclarée dans l'XP | **Oui, plafonnée à 6 XP/jour, hors ligues** | Valorise le temps hors app sans rendre l'XP déclarative. |
| Ligues au lancement | **Défi collectif** tant que < 16 inscrits | Pas de faux joueurs, pas de cohortes de 3 personnes. |
| XP affichée ou masquable | **Affichée par défaut, masquable** | Utile au début ; à M6, la compétence prend le relais. |
| Fin de journée | **04:00 locale** | Couvre les couche-tard sans favoriser la séance de minuit. |
| Heure de référence des ligues | **Europe/Paris pour tous** au lancement | Cohortes simples tant que la base est francophone ; à revoir au-delà de 3 fuseaux majeurs. |
| Duel compétitif entre amis | **Disponible, désactivé par défaut** | Certains l'aiment ; le format coopératif doit rester le premier proposé. |
