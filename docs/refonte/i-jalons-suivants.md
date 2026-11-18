# i. Plan des jalons suivants

Chaque jalon est **livrable seul** : il se termine par une préversion utilisable, une PR vers `dev` (jamais fusionnée par l'orchestrateur), la CI au vert, des captures mobiles en clair et en sombre, et un rapport au format convenu. Arrêt et validation avant le suivant.

## Ce qui change par rapport à l'ordre suggéré

| Changement | Raison |
|---|---|
| Un **prototype technique sur iPhone réel** entre dans le jalon 1 (micro en PWA installée, enregistrement, Web Push, stockage hors ligne) | Trois risques techniques conditionnent les jalons 2, 5 et 7 ; les lever coûte une journée, les découvrir tard coûte un jalon |
| Le jalon 2 inclut un **texte gradué minimal** (généré, partagé, sans lecteur tactile) | Sans texte à lire, la séance en quatre volets n'existe pas ; le lecteur complet reste au jalon 3 |
| Les **notifications** passent du jalon 7 au jalon 2 | C'est le déclencheur de la boucle quotidienne ; ligues et amis restent au jalon 7 |
| Une **préversion ouverte à des volontaires** est possible dès la fin du jalon 3 | Mesurer tôt ; la bascule générale reste au jalon 8 (point à trancher) |

## Jalons

### Jalon 1 — Fondations
- Monorepo ; déplacement du domaine, des schémas et des contenus curés (historique git conservé) ; application actuelle gelée dans `legacy/`.
- Schéma `app` : identité, contenus partagés, tentatives, cartes, journal d'XP ; RLS et pgTAP.
- Authentification (comptes existants), profil avec L1, langue d'interface et langue cible ; toute L1 ; le français devient langue cible.
- Interface en français et en anglais ; test « aucune chaîne en dur » ; RTL vérifié sur un écran.
- Design system : tokens ajoutés, composants de base, clair et sombre.
- Service worker, coquille hors ligne, file d'événements.
- Point d'appel IA unique avec journal des coûts ; `cost:report`.
- Migration des données en local sur le jeu d'exemple, rejouable, avec `migration:verify`.
- CI complète (frontières d'import, pgTAP, Playwright WebKit, accessibilité, fins de ligne).
- Prototype iPhone : micro, enregistrement, push, hors ligne.

**Livrable** : on se connecte avec un compte existant migré en local, on choisit sa L1, l'interface change de langue, l'app s'ouvre hors ligne. **Répartition** : schéma, sécurité et migration conçus ici ; migrations → `migrateur-donnees` ; composants et i18n → `implementer` ; alignement des messages → `quick-task` ; revue → `relecteur-securite` ; tests → `qa-mobile`.

### Jalon 2 — Boucle quotidienne
Séance guidée en six étapes validée par le travail ; file unique FSRS avec charge plafonnée ; texte gradué minimal ; correction écrite existante portée en L1 paramétrée, avec réécriture vérifiée ; XP, anneau, série avec gel et réparation ; bilan de fin de séance ; une notification par jour ; séance du jour faisable hors ligne.
**Livrable** : un apprenant B1 fait sa séance chaque jour et voit ce qu'il a gagné. **Dépend de** : 1.

### Jalon 3 — Input
Lecteur tactile (mot → sens en L1 → carte avec sa phrase), états des mots, couverture affichée avant lecture ; génération et relecture des textes en Batch, partage par langue, niveau et thème ; audio pré-généré ; bibliothèque ; premiers textes authentiques sous licence ouverte.
**Livrable** : un A2 lit et écoute un texte entier dans l'app et en tire ses cartes. **Dépend de** : 2. *Préversion aux volontaires possible ici.*

### Jalon 4 — Débutants
Gabarit d'unité par situation ; 10 unités A1 dans deux langues pilotes (russe, italien), rédigées puis relues en deux passes ; alphabets intégrés au parcours ; carte du parcours ; « Je peux… » validés en fin d'unité.
**Livrable** : un débutant complet enchaîne ses premières unités sans aide extérieure. **Dépend de** : 2, audio du 3.

### Jalon 5 — Oral
Écoute avec anticipation, shadowing, dictée (sans coût) ; prise de parole transcrite et corrigée sous quota ; jeu de rôle écrit à tâches bornées, puis vocal si le prototype et le budget le permettent.
**Livrable** : un apprenant parle chaque semaine et reçoit un retour qui discrimine. **Dépend de** : prototype du 1, audio du 3.

### Jalon 6 — Progrès
Niveau continu par compétence ; mots prouvés ; test de niveau refondu (adaptatif, items calibrés) ; bilan étendu ; tableau de progrès et projection en fourchette ; journal d'immersion.
**Livrable** : l'apprenant voit un niveau bouger sans repasser de test. **Dépend de** : données des jalons 2 à 5.

### Jalon 7 — Social et rétention
Quêtes quotidiennes et hebdomadaires ; badges d'étapes réelles ; ligues en option (défi collectif tant que les inscrits sont peu nombreux) ; amis et défis coopératifs ; tableau de bord des dérives.
**Livrable** : les mécaniques sociales sont actives et chacune se coupe. **Dépend de** : 2, 6.

### Jalon 8 — Bascule, puis natif
Migration sur une copie de la production, puis en production sur accord ; bascule ; ancienne app en lecture seule 30 jours ; suivi des indicateurs à trois mois. Ensuite : squelette Expo sur les paquets partagés.
**Livrable** : tous les utilisateurs sont sur la nouvelle app, sans perte. **Dépend de** : tout.

## En continu

- **Contenus** : relecture des banques de test et des dossiers du bilan (suite de la phase X0), traduction des fiches curées vers l'anglais, unités débutant des autres langues — en sessions Claude Code, hors budget.
- **Évaluations de prompts** avant chaque changement de prompt, étendues à deux L1.
- **Sécurité** : revue indépendante à chaque jalon qui touche au schéma.

## Risques du plan

| Risque | Effet | Parade |
|---|---|---|
| Jalon 1 trop gros | Dérive | Découpé en trois PR : socle et données, interface et i18n, hors ligne et prototype |
| Volume de contenu débutant (19 langues) | Parcours vide dans la plupart des langues | Deux langues pilotes, puis par vagues ; les autres langues gardent la séance à partir de A2 |
| Qualité des textes générés en A1 | Input bancal | Jeu d'essai et seuils mesurés avant ouverture, relecture par échantillon |
| Peu d'utilisateurs pour les ligues | Mécanique creuse | Défi collectif sans classement |
| Limites de la voix gratuite | Oral bridé | Oral sans transcription d'abord |
