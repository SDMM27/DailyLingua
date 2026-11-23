# Jalon 4 — Parcours débutant

Proposition de cadrage. Le [plan des jalons](../i-jalons-suivants.md) fixe le périmètre : gabarit d'unité par situation ; 10 unités A1 en russe et en italien, rédigées puis relues en deux passes ; alphabets intégrés au parcours ; carte du parcours ; « Je peux… » validés en fin d'unité. Le [modèle pédagogique](../b-modele-pedagogique.md) §2 donne la forme d'une unité, le [game design](../c-game-design.md) donne l'XP d'une unité (25, test ≥ 80 %, une fois par unité, 2 unités par jour).

**Livrable** : un débutant complet (A0) en russe ou en italien enchaîne ses premières unités sans aide extérieure, hors ligne, avec l'audio, et retrouve leurs mots dans ses révisions.

## 1. Qui entre dans le parcours

| Profil (langue cible) | Ce qu'il voit |
|---|---|
| A0 ou A1, langue pilote (ru, it) | « Aujourd'hui » propose **la prochaine leçon du parcours** à la place du texte du jour. Le Réveil (révisions dues) reste en tête, comme dans la séance. |
| A0 ou A1, autre langue | Inchangé (accueil honnête du jalon 2). |
| A2 et plus, langue pilote | Séance du texte du jour. Le parcours reste ouvert en révision depuis la bibliothèque, sans XP d'unité au-delà de la première réussite. |
| Fin de l'unité 10 | Bilan court (le test des unités 6 à 10, mélangé) ; s'il est réussi, le niveau affiché passe à A1 confirmé et la séance A1 réduite du jalon 2 devient disponible (drapeau par langue). |

Le choix du niveau à l'inscription ne change pas. Un apprenant peut ouvrir n'importe quelle unité : l'ordre est **suggéré, jamais verrouillé**. « Je connais déjà » ouvre directement le test de fin d'unité.

## 2. Gabarit d'unité

Une unité couvre une situation de communication et se fait en **trois leçons d'environ 10 minutes** (une leçon par jour au format 10, deux au format 20). Squelette commun aux deux langues :

| Étape | Leçon | Contenu | Validée par |
|---|---|---|---|
| Dialogue | 1 | 6 à 10 répliques entre deux voix, audio par réplique et intégral, vitesse lente ; mots touchables (lecteur du jalon 3) ; traduction derrière un toucher | Écoute intégrale + 2 questions de compréhension |
| Phrases-clés | 1 | 6 à 10 blocs lexicaux du dialogue (« Un caffè, per favore »), audio, deviennent des cartes `unit` | Chaque bloc vu et rappelé une fois |
| Grammaire | 2 | **Un** point, lié à une fiche A1 déjà relue (`ru-a1-*`, `it-a1-*`), résumé en 3 à 5 lignes dans l'unité, fiche complète derrière un toucher | Lecture + 2 items |
| Exercices | 2 | 8 à 12 items courts et variés : choix, remettre dans l'ordre, texte à trous, écoute puis choix, associer, écrire un mot (accents tolérés comme au jalon 2) | ≥ 60 % (sinon les items ratés reviennent en fin de leçon) |
| Conversation | 3 | Mini-conversation guidée **écrite et à choix** : l'interlocuteur parle (audio), l'apprenant choisit ou complète sa réplique ; pas de micro (jalon 5) ; répétition à voix haute proposée, non notée | Conversation menée au bout |
| Test | 3 | 10 items tirés des étapes précédentes, sans aide | ≥ 80 % → unité réussie, « Je peux… » validés, 25 XP |

Règles :
- Hors ligne : une unité (texte, audio, exercices, corrigés) est un paquet statique préchargé. Aucun appel IA à l'exécution dans le parcours : **coût API nul**.
- Le serveur recalcule la note du test à partir des réponses envoyées (les corrigés sont dans le paquet, donc côté client) ; l'XP ne vient que du serveur, plafonnée par `c-game-design.md`. Un test raté se repasse sans pénalité ; les items ratés reviennent dans la leçon suivante.
- Les erreurs des exercices et du test deviennent des items de Réveil le lendemain (règle de `b` §3).

## 3. L'alphabet dans le parcours (russe)

Les 5 groupes de lettres de l’ancien module (`src/lib/alphabets/ru.ts`, phase I1), regroupés, deviennent **4 unités « Écriture » (E1 à E4)** placées avant l'unité 1 et entremêlées aux premières situations : E1 et E2 avant l'unité 1, E3 avant l'unité 2, E4 avant l'unité 3. Chaque unité Écriture : lettres du groupe (son, faux amis, exemple), lecture de mots du dialogue suivant uniquement avec les lettres connues, test de lecture de 10 mots (le test « Tu lis déjà… ? » de l'ancienne app, porté). Les dialogues des unités 1 à 3 affichent une translittération repliable, qui disparaît à partir de l'unité 4.

L'italien n'a pas d'unité Écriture. Une fiche « sons et orthographe » (c/ch, g/gh, gli, gn, sc) est intégrée à l'unité 1.

## 4. Les dix situations

Mêmes situations dans les deux langues, pour comparer les pilotes ; le point de grammaire suit les fiches A1 déjà relues.

| # | Situation | « Je peux… » (exemples) | Grammaire ru | Grammaire it |
|---|---|---|---|---|
| 1 | Saluer et se présenter | … dire bonjour, mon prénom et d'où je viens | `ru-a1-gender` (он/она, sans verbe « être ») | `it-a1-essere-avere` (essere) |
| 2 | Au café | … commander une boisson et dire merci | `ru-a1-gender` (accords simples) | `it-a1-articles` |
| 3 | Les nombres et les prix | … demander et comprendre un prix | (nombres, sans cas) | `it-a1-nouns` (pluriel) |
| 4 | La famille | … présenter ma famille | `ru-a1-possessives` | `it-a1-possessives` |
| 5 | Où est… ? | … demander où se trouve un lieu | `ru-a1-prepositional` | `it-a1-prepositions` + c'è / ci sono |
| 6 | L'heure et la journée | … dire ce que je fais à quelle heure | `ru-a1-present-first` | `it-a1-present` (-are) |
| 7 | Faire les courses | … demander un produit et une quantité | `ru-a1-plural` | `it-a1-nouns` (révision) |
| 8 | Ce que j'aime | … dire ce que j'aime et ce que je n'aime pas | `ru-a1-present-second` (люблю) | `it-a1-present` (-ere, -ire) + mi piace |
| 9 | Chez moi | … décrire mon logement | `ru-a1-prepositional` (révision) | `it-a1-essere-avere` (avere) |
| 10 | Le week-end | … raconter mon samedi au présent | révision 6 et 8 | révision |

Le `pedagogue-didacticien` relit cette grille (progression, charge lexicale : 40 à 60 mots nouveaux par unité, 400 à 500 en tout, pris dans la bande 1 000 de la liste de fréquence) avant la rédaction.

## 5. Contenu, format et relecture

- **Format** : un fichier par unité et par langue, `packages/content/src/units/<lang>/<nn>-<slug>.ts` (nouveau paquet `@dailylingua/content`, sans React ni Next), validé par un schéma Zod dans `packages/schemas` (`unitSchema`) et par un script `units:check` : identifiants stables, chaque mot de l'exercice présent dans le dialogue ou les phrases-clés, chaque item du test rattaché à une étape, durée audio présente, `aiReview` posé avant publication.
- **Explications** : rédigées en français (pivot) **et** en anglais dans le fichier ; une autre L1 voit l'anglais avec la mention « explications en anglais pour l'instant » (point 2).
- **Statuts** : `draft` → `ai-reviewed` (deux passes `relecteur-natif` indépendantes, puis `arbitre-relecture`) ; jamais `reviewedOn`. Seules les unités `ai-reviewed` sont servies en production, avec la mention « relu par IA ».
- **Lot de relecture** : par langue, par lot de 5 unités (4 lots, 12 passes d'agents en tout), plus les 4 unités Écriture russes en un lot.
- **Audio** : synthèse locale avec Piper, deux voix par langue (une féminine, une masculine) pour les dialogues, vitesse normale + 0,75. MP3 mono versionnés dans `apps/web/public/unit-audio/<lang>/`, comme l'audio du lecteur. Licence de chaque voix vérifiée et notée avant usage (point 4).

## 6. Données

- Contenu des unités : **dans le dépôt**, servi comme paquet statique (versionné par hash), pas de table de contenu. C'est la règle des contenus curés du jalon 0.
- Progression : table `app.unit_progress` (apprenant, langue, unité, version, leçon atteinte, meilleur score du test, `passed_at`), RLS « propriétaire seul », écriture par une fonction serveur qui recalcule le score ; pgTAP.
- XP : règle `unit.complete` (25) ajoutée au barème, preuve = ligne `unit_progress` passée avec score serveur ≥ 80 %, unicité (apprenant, unité), plafond 2 par jour d'apprentissage. Badge « Termine une unité du parcours débutant » (`c` §147) et badge de niveau du parcours (`c` §181).
- Cartes : les phrases-clés deviennent des cartes FSRS `source = 'unit'` (déjà prévu dans le schéma), dédoublonnées comme celles du lecteur.

## 7. Écrans

Trois écrans neufs, maquettés en 2 ou 3 variantes avant le code : **carte du parcours**, **lecteur d'unité** (dialogue + un exercice), **fin d'unité** (réussite et échec). Tout reste aéré : une action principale par écran. L'entrée se fait depuis « Aujourd'hui » (prochaine leçon) et depuis la bibliothèque (« Parcours »).

## 8. Découpage en PR

| PR | Contenu | Agents |
|---|---|---|
| 1 | Schéma `unitSchema`, `units:check`, moteur de leçon et d'exercices dans `packages/core` (pur, testé), table `unit_progress`, règle XP, lecteur d'unité, **unité 1 dans les deux langues** de bout en bout (hors ligne, audio, cartes, XP) | conception et sécurité ici ; migration → `migrateur-donnees` ; moteur et écrans → `implementer` ; revue → `relecteur-securite` ; parcours → `qa-mobile` |
| 2 | Carte du parcours, unités Écriture russes, routage A0/A1 dans « Aujourd'hui », fin d'unité, « Je peux… », badges | `implementer`, `qa-mobile` |
| 3 | Unités 2 à 10 dans les deux langues, audio, deux passes de relecture et arbitrage, bilan de fin de parcours | rédaction → `pedagogue-didacticien` (gabarit fixé en PR 1) ; relecture → `relecteur-natif` ×2 + `arbitre-relecture` ; audio → `quick-task` |

La rédaction des unités 2 à 10 peut commencer dès que le gabarit de la PR 1 est fusionné, en parallèle de la PR 2.

## 9. Ce qu'on mesure (`h-indicateurs.md`)

Taux de complétion de l'unité 1 chez les A0, abandon par étape, score moyen au premier essai du test, rétention J7 des apprenants du parcours, nombre d'items signalés par unité.

## Points à trancher

| # | Question | Recommandation |
|---|---|---|
| 1 | Unités verrouillées ou ordre suggéré ? | **Ordre suggéré**, tout ouvert, « Je connais déjà » mène au test : cohérent avec « riche mais honnête », et un faux débutant ne s'ennuie pas |
| 2 | L1 autres que le français et l'anglais | Anglais en secours, avec mention ; traduction générée puis relue par agents plus tard (coût faible, mais relecture lourde pour 20 unités × N langues) |
| 3 | Une unité = une séance, ou trois leçons ? | **Trois leçons de ~10 min** : une unité complète en une fois dépasse 25 minutes pour un A0 |
| 4 | Voix de synthèse | Piper en local (coût nul), **sous réserve que la licence de chaque voix permette un usage commercial** ; sinon, voix Azure gratuite (compte à ouvrir par vous, décision du jalon 0) |
| 5 | Conversation guidée sans micro | Oui au jalon 4 (choix et complétion) ; la version parlée arrive au jalon 5 |
| 6 | Unités Écriture : 4 unités à part ou lettres réparties dans les 3 premières situations ? | **4 unités courtes entremêlées** : on garde le test de lecture qui a fait ses preuves, sans retarder le premier dialogue au-delà de deux unités |
| 7 | Rédaction des 20 unités | Rédigées dans les sessions Claude Code (hors budget API), comme les fiches de grammaire, puis deux passes de relecture IA. Aucune relecture humaine exigée pour publier, mention « relu par IA » |
| 8 | Bilan de fin de parcours (après l'unité 10) | Test mélangé des unités 6 à 10, puis niveau A1 confirmé ; c'est le premier usage de la règle « un palier est confirmé par un bilan » (`b` §1) |
| 9 | Accès au parcours : 4e onglet « Parcours » ou entrée depuis « Aujourd'hui » seulement ? | **4e onglet** tant que l'apprenant a un parcours dans sa langue (A0-A2) ; sinon 3 onglets comme aujourd'hui |
| 10 | Cadenas sur les unités à venir (`e-direction-artistique.md` §6 les prévoit) | **Supprimés**, conformément au point 1 ; corriger la DA |
| 11 | « Je peux… » d'unité et XP « Descripteur validé » (50 XP, `c-game-design.md`) | Les « Je peux… » d'unité sont des **objectifs d'unité**, validés par le test, sans les 50 XP ; les 50 XP restent réservés aux descripteurs prouvés par la tâche d'évaluation du jalon 6. Sinon une unité vaudrait 175 XP |
| 12 | XP des exercices d'unité | Barème « exercice de focus » existant : 2 juste du premier coup, 1 au deuxième, plafonds inchangés ; XP gardés si le test échoue |
