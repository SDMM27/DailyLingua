# Jalon 2 — Points à trancher

Date : 2026-11-16. Specs : `j2-architecture.md` (architecte), `j2-seance-contenu.md` (`pedagogue-didacticien`), `j2-jeu-xp-serie.md` (`game-designer`), `j2-ecrans.md` et `maquettes/j2/j2-ecrans.html` (`designer-ux-mobile`). Aucun code n'est écrit avant la validation de cette liste.

## À trancher par le propriétaire

| # | Question | Recommandation | Pourquoi |
|---|---|---|---|
| 1 | Envoyer au téléphone les réponses attendues de la séance du jour | **Oui**, dans le paquet de séance seulement | Sans elles, pas de retour immédiat ni de séance hors ligne. Le serveur recorrige tout ; un tricheur gagne au plus ≈ 60 XP par jour, plafonnés |
| 2 | Textes gradués : génération à la demande (partagée) au jalon 2, génération de nuit en Batch au jalon 3 | **Oui** | Moins de mécanique au jalon 2 ; ≈ 0,002 $ par texte au lieu de 0,001 $ |
| 3 | Relecture par échantillon des textes générés par un modèle plus fort (exception validée au jalon 0) | **Au jalon 3**, avec le Batch ; au jalon 2, statut « vérifié automatiquement » (10 contrôles + second appel Haiku) | Le pédagogue la voulait dès le jalon 2 (20 premiers textes par case). Elle demande l'infrastructure Batch ; la préversion aux volontaires n'arrive qu'après le jalon 3 |
| 4 | Lancer `feedback:eval` sur le prompt de correction porté (L1 en paramètre, deux L1 : fr, en) | **Oui, ≈ 0,10 $** | Règle : pas de changement de prompt sans évaluation ; c'est un appel réel à l'API, donc ton accord |
| 5 | Débutants A0-A1 au jalon 2 | **Accueil honnête + Réveil sur les cartes migrées** ; séance A1 réduite derrière un drapeau coupé, ouverte langue par langue après jeu d'essai ; A0 au jalon 4 | Le parcours par situations est le jalon 4 ; un texte généré A1 n'est pas fiable sans essai |
| 6 | Ajustements du barème de `c-game-design.md` | **Oui** : palier 15 min = 75 XP (défaut), 45 min masqué jusqu'au jalon 3 ; gel offert le lundi seulement si le stock est sous 2, gels gagnés jusqu'à 3, 1 gel à la création du compte ; erreur du jour = une erreur des 7 derniers jours non retravaillée ; au-delà de 150 rappels, une réussite sur deux rapporte ; séance de rattrapage sans les 10 XP de séance complète | Lève les divergences entre `c-game-design.md` et le README ; garde l'XP entière |
| 7 | Série de semaines dès le jalon 2 | **Oui** | Le choix est proposé à J3 de l'apprenant |
| 8 | Noms des étapes | **Réveil, Lecture, Atelier, Expression, Élan, Bilan** (ceux de la vision) | Ceux de la direction artistique (Révisions, Texte, Focus…) sont plus techniques |
| 9 | Mascotte au jalon 2 | **Aucune** ; choix Pica ou rien au jalon 4 | S'ajoute plus tard sans refonte |
| 10 | Langue des questions de compréhension | **L1 jusqu'à A2, langue cible à partir de B1** | Mesurer la compréhension, pas la lecture de la question |
| 11 | Erreur d'accent seule (« presque juste ») | **Comptée juste**, note FSRS « Difficile », réglage « accents stricts » coupé par défaut | À revoir pour tr, pl, cs, ro, sv si les signalements le montrent |
| 12 | Navigation | **Deux onglets** au jalon 2 : Aujourd'hui, Réglages | Aucun onglet vide |
| 13 | Nouvelle version mineure de ton paquet `@sdmm/design` (tokens `success`, `error`, `streak`, `xp`, `border-strong`, `radius-sheet`, durées de célébration, plus `accent-soft` et `scrim`) | **Oui**, publiée par toi ou par moi sur ton accord | Les écrans en ont besoin ; c'est un dépôt à part (`SDMM27/sdmm-design`) |
| 14 | Le français comme langue cible au jalon 2 | **Pas de texte gradué en français** tant que sa liste de fréquence manque (Réveil seulement) | `src/lib/frequency/data/` n'a pas de liste `fr` |

## Tranché par l'architecte (pour information)

- Lot reçu plus de 72 h après l'action : accepté jusqu'à **7 jours** (borne `attempt_occurred_bounds` déjà en base), XP inscrite au jour de réception, hors anneau et série ; refusé au-delà. La spec de jeu proposait 30 jours.
- Plafond de sûreté SQL : 400 XP par jour et par utilisateur (barème théorique : 336).
- Densité (cran 1 à 3) dans la clé de partage des textes ; source de carte `session` ; table `setting_change` en ajout seul pour que la série reste rejouable ; causes de jour `travel` et `off`.
- Pas de bouton « J'avais raison » (maquette) : le signalement d'une erreur le remplace (spec pédagogique), pour que l'apprenant ne puisse pas s'accorder un point.
- « Séance complète » comptée une fois la réécriture faite quand la correction a attendu le réseau.
- Séance de rattrapage : format 10 min, texte suivant de la file.
- Critères de la correction : on garde les 4 critères du code existant ; `b-modele-pedagogique.md` §1 sera corrigé.

## Écarts connus à reprendre pendant l'implémentation

- Les chiffres d'XP des maquettes suivent `c-game-design.md` ; ils seront recalés sur `j2-jeu-xp-serie.md`.
- Feuilles non dessinées : « Appris aujourd'hui », « Erreur du jour », « Version d'un natif » ; interface en anglais et texte agrandi à 200 % à vérifier en e2e.
- Doutes de langue à faire relire (équivalences ä/ae, facteurs de caractères par mot du chinois et du japonais, variantes kana/kanji, détection de langue entre langues voisines) : listés dans `j2-seance-contenu.md`.
