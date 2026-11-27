# Jalon 6 — Progrès et niveau par compétence

Le russe et l’italien sont les deux seules langues cibles des jalons restants. Les contenus, le calibrage et la recette se limitent à ces deux langues. L’extension suivra la recette de la préversion et les corrections issues des retours.

## 6.1 — Tableau de progrès

Ajouter une entrée « Progrès » dans la navigation de la préversion. La page porte sur la langue active et présente quatre compétences, les « Je peux… » validés et l’activité récente. La variante compacte place les jours d’étude en premier sur mobile, puis le tableau des compétences et les acquis. À 1280 et 1440 px, les jours d’étude et les acquis occupent la colonne gauche, avec le tableau à droite. Prévoir les libellés français et anglais.

| Affichage | Source | Règle |
|---|---|---|
| Lire, écouter, écrire, parler | `skill_estimate` | Présenter le niveau et l’origine de l’estimation. Afficher « Non mesuré » si la ligne manque, « Déclaré » à l’inscription ou « Repris de l’ancienne app » après migration. |
| « Je peux… » validés | Progression des unités et bilans réussis | Afficher le descripteur si le contenu est disponible dans la langue sélectionnée. Pour la langue principale, le titre mène à l’unité. |
| Jours d’étude récents | `learning_day` | Afficher les sept jours d’apprentissage du compte, toutes langues confondues, selon le fuseau du profil et la limite de journée déjà utilisée par la séance. |

Étendre `packages/data` en conservant la lecture avec le client authentifié et les politiques RLS. Le chargeur borne chaque requête à son usage et filtre par langue les données rattachées à un apprentissage. `getLearningProgress` garde son contrat pour les appels existants qui affichent l’XP et la série. La page fonctionne avec un compte neuf ou migré, y compris lorsque des compétences ou des unités sont absentes.

**Recette.** Vérifier l’isolation entre deux comptes et deux langues. Couvrir un compte neuf, un compte migré sans estimation orale, un bilan réussi et une semaine à cheval sur un changement de mois. Vérifier la page et son accès au clavier en français et en anglais, en clair et en sombre, à 390, 1280 et 1440 px. Relier la recette à la grille de bascule du plan de migration.

## 6.2 — Estimation continue et mots prouvés

Établir une grille des preuves à partir des données des jalons 2 à 5. Candidats à vérifier par compétence : réponses de compréhension sur un texte ou un audio, productions corrigées et tâches de rôle évaluables. Préciser pour chaque source la difficulté connue, la qualité du signal et la clé de déduplication. La durée, l’XP et l’achèvement d’une activité restent des mesures de pratique. Les niveaux déclarés et migrés servent de point de départ avec leur incertitude d’origine.

Calculer les estimations côté serveur à partir des preuves acceptées. Une tentative rejouée après une synchronisation hors ligne doit produire le même état. Une activité comportant plusieurs questions sur le même support ne doit pas peser autant que plusieurs supports indépendants. Choisir les seuils d’incertitude et de diversité des preuves après un essai sur des trajectoires simulées et des résultats de bilan. Conserver le dernier palier confirmé tant que les nouvelles preuves ne suffisent pas.

Pour les mots prouvés, réutiliser l’identité des lemmes et les états du lecteur. Définir sur des exemples la transition vers « prouvé », notamment pour un mot déjà marqué connu, un mot rencontré dans plusieurs textes et les formes fléchies d’un même lemme. Afficher le nombre de lemmes prouvés par langue.

### Grille de preuves du pilote 6.2

Audit du code au commit `9e3a184` de `dev`. Le premier lot proposé calcule les preuves de lecture et de vocabulaire pour le russe et l’italien en mode observation. Le tableau de progrès continue d’afficher les estimations actuelles jusqu’à la comparaison avec les bilans.

| Signal | Difficulté et qualité de la preuve | Unité de déduplication |
|---|---|---|
| Compréhension d’un texte de séance | `attempt.correct` est calculé à l’ingestion. Retenir les questions écrites prévues pour un texte publié de niveau connu, avec leurs premiers essais, y compris les échecs. La difficulté du texte reste une indication éditoriale. Si moins de trois questions écrites sont prévues, le support ne rentre pas dans le premier essai de calibrage. | Compte, langue, famille du support et compétence. Pour chaque question, premier essai de la première séance admissible. Une réédition du même texte conserve sa famille. |
| Compréhension orale | `text_item.listening_only` indique l’intention de l’item. La séance peut être terminée avec une voix indisponible et le contenu peut être relu. Attendre un exercice sur de l’audio présenté seul, avec une question répondue avant l’affichage du texte, et un niveau connu. | Compte, langue, famille de l’extrait et compétence. |
| Atelier oral | La dictée mêle écoute et orthographe. Le shadowing compare la transcription à une phrase déjà fournie, et l’anticipation enregistre une interaction. Ces traces documentent la pratique. | Compte, langue, phrase et exercice pour le suivi de pratique. |
| Écriture | La correction est relative au niveau courant, qui fait partie du contexte envoyé au correcteur. Une réécriture mesure l’application d’un retour sur la même production. Pour estimer le niveau, il faut une tâche de difficulté fixée et un barème évalué indépendamment du niveau courant. | Compte, langue et tâche distincte. Les réécritures se rattachent à la première production. |
| Parole et jeu de rôle | La production vocale et le jeu de rôle des PR #54 et #55 sont encore empilés sur des branches intermédiaires à cette révision de `dev`. Leur intégration précède le calibrage. Une transcription permet d’évaluer la réponse à une tâche, avec des limites pour la prononciation et la fluidité. | Compte, langue et scénario distinct. Les tours d’un même scénario forment une observation. |
| Bilan | Le bilan de fin de parcours enregistre un résultat global. Il sert de repère pour le parcours. La comparaison par compétence requiert des résultats du bilan ventilés par compétence et datés. | Compte, langue, dossier et version. Les comparaisons utilisent un bilan indépendant des preuves qui ont produit l’estimation. |

Pour la lecture, reconstituer chaque observation à partir de la séance et des items qu’elle a réellement proposés. Une observation est complète quand la première séance retenue a fourni un premier essai pour chaque item admissible. Une relecture du support ne complète pas les réponses manquantes. Utiliser une identité stable du support. Le premier essai et le jour d’apprentissage sont déterminés par le serveur à partir des événements acceptés. La version de la règle est distincte de l’identité de la preuve. Le format de 10 minutes sert trois questions au total, dont une d’écoute si elle existe. Mesurer la part de séances écartées par le seuil de trois questions écrites avant de le retenir, en particulier pour les formats courts.

### Simulation du seuil de lecture

Pour comparer les seuils, simuler un lot fixe de supports indépendants de même niveau. Chaque support a trois questions écrites à quatre choix et est réussi à partir de deux bonnes réponses au premier essai. Les valeurs suivantes utilisent une loi binomiale appliquée aux résultats par support.

| Seuil du lot | Réponses au hasard | Réussite par support de 70 % | Réussite par support de 80 % | Réussite par support de 90 % |
|---|---:|---:|---:|---:|
| 3 sur 3 | 0,381 % | 34,3 % | 51,2 % | 72,9 % |
| 4 sur 5 | 0,261 % | 52,8 % | 73,7 % | 91,9 % |
| 6 sur 7 | 0,009 % | 32,9 % | 57,7 % | 85,0 % |

Commencer l’observation avec **4 sur 5**, sur au moins trois jours d’apprentissage. Dans la simulation, quatre réussites sur cinq supports répartis sur trois jours passent. Le résultat résiste au rejeu exact et à la permutation de l’arrivée du même jeu de preuves. Un support répété, cinq supports le même jour, deux échecs ou une série incomplète ne franchissent pas le seuil.

Le calcul suppose des réponses indépendantes et un seul lot fixé à l’avance. Le hasard calculé par lot ne quantifie pas le risque sur plusieurs lots, ni les erreurs de classement des textes. Tester la cadence de renouvellement et les changements de palier sur des trajectoires longues avant activation. La fiche des [bilans pilotes](../../assessment/pilot-results.md) ne présente encore aucun résultat renseigné. Le jeu de données à constituer doit inclure les deux langues et des estimations prises avant les bilans. Suivre l’écart cible d’un demi-niveau du [plan d’indicateurs](../h-indicateurs.md) et conserver le dernier palier confirmé pendant ce calibrage.

### Preuve de vocabulaire

Le lecteur donne un lemme et ses formes dans les données du texte. Sa carte est actuellement identifiée par texte et position, et sa couverture compare des formes écrites. Le journal `review_log` conserve les rappels par carte. La preuve proposée repose sur une identité résolue côté serveur à partir du contenu curé, par langue et par lemme canonique. Les formes fléchies se rattachent au même lemme. Un rapprochement ambigu reste à résoudre avant de compter une preuve.

- Un mot déclaré connu garde cet état. Il devient prouvé après des rappels actifs et espacés remplissant les mêmes critères que pour les autres mots.
- Rencontrer un mot dans plusieurs textes crée des occasions de rappel. Deux cartes du même lemme le même jour ne créent qu’un jour de preuve.
- Point de départ à simuler sur les journaux disponibles : deux rappels saisis, dus et réussis sur des jours d’apprentissage distincts, puis une stabilité FSRS d’au moins 21 jours. Le seuil de stabilité reprend le choix du jalon 0 pour les mots connus. Le filtre sur le mode et le résultat fait partie de la définition proposée du mot prouvé.
- Un rappel rapproché, une carte marquée connue, un choix de sens ou un ancien journal sans résultat vérifiable ne suffit pas. Une carte sans lien fiable vers un lemme reste utilisable dans les révisions.
- Le compteur de la langue active dénombre les lemmes distincts qui satisfont ces critères. Au moment de la recette, vérifier le rejeu, deux formes russes ou italiennes du même lemme, les homographes, les cartes supprimées et l’isolation des comptes.

### Mise en œuvre et décision avant activation

Faire tourner le calcul côté serveur sur les journaux acceptés. Pour chaque lot, dédupliquer d’abord par événement, puis par question et support ou par lemme et jour. Borner la lecture des journaux et calculer sur un ensemble d’événements stable. Si les résultats sont persistés, la clé inclut compte, langue, compétence ou lemme et version du calcul. Rejouer le même lot doit produire les mêmes résultats. Comparer notamment deux comptes, deux langues et la réception tardive d’événements hors ligne. Les journaux existants gardent leurs règles d’accès. Le calcul n’a besoin ni d’un appel IA ni du contenu des productions.

Avant de modifier `skill_estimate`, valider avec le pilote le seuil de promotion, l’incertitude à afficher, la cadence des nouvelles observations et le traitement des signaux contradictoires ou trop anciens. Recommandation : commencer avec une estimation visible de **Lire** seulement après comparaison avec des bilans indépendants. Étendre aux autres compétences quand leurs sources ont été calibrées. Les niveaux déclarés et migrés restent les points de départ, avec leur incertitude d’origine.

#### Rapport d’observation local

```sh
npm run --silent progress:observe -- --user UUID --language it --from 2026-11-01 --through 2026-11-26
```

Utiliser une base Supabase locale ou une copie servie en local, avec `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans l’environnement local. La période couvre au plus 90 jours. Le rapport JSON contient les résultats par niveau des cinq premiers supports complets, le nombre de séances avec trop peu de questions écrites et le nombre de lemmes prouvés. Chaque rapport porte sur un compte et une langue. Il ne contient ni réponses ni texte de production et n’effectue aucune écriture.

Le journal de rappel existant ne conserve pas séparément la preuve que la carte était due ni le jour d’apprentissage attribué. Le rapport ne retient que les rappels FSRS saisis, notés Good ou Easy, espacés d’au moins un jour et associés à une ligne de validation `review.production`. Cette ligne sert à vérifier les conditions du rappel et sa date. Le nombre de points ne mesure aucune compétence. Les rappels réussis mais plafonnés sont sous-comptés. La stabilité est celle de la carte au moment du rapport. Le compteur de cette première version couvre les cartes du lecteur dont le sens est vérifiable dans le texte d’origine.

Les supports au texte identique après normalisation des espaces et d’Unicode sont regroupés. Une réédition qui change le texte devra être reliée éditorialement à son support avant activation. Des définitions divergentes pour un même lemme sont traitées comme ambiguës. Un identifiant éditorial commun permettrait de confirmer les paraphrases et de distinguer les homographes.

#### Comparer les observations à des bilans indépendants

Pour chaque volontaire, conserver le JSON de `progress:observe` avant son bilan. Utiliser un UUID aléatoire pour l’apparier au bilan, avec une paire au maximum par volontaire et par langue. Le bilan doit fournir une mesure indépendante de la **lecture** sur l’échelle continue de 0 à 7. Conserver aussi les observations qui ne franchissent aucun seuil afin de mesurer la couverture.

```sh
npm run --silent progress:calibrate -- paires.json
```

Le fichier contient un tableau d’objets au format ci-dessous. Le champ `observation` accepte le rapport entier. L’exemple ne montre que les champs nécessaires au calcul.

```json
[
  {
    "participant": "00000000-0000-4000-8000-000000000001",
    "observation": {
      "version": 1,
      "language": "it",
      "observedAt": "2026-11-20T10:00:00Z",
      "reading": { "bands": [{ "level": "B1", "meetsThreshold": true }] }
    },
    "assessment": {
      "language": "it",
      "assessedAt": "2026-11-21T10:00:00Z",
      "readingValue": 3.25
    }
  }
]
```

Le rapport donne, pour chaque langue, le nombre de paires exploitables, le nombre d’observations sans résultat, l’erreur absolue moyenne et le nombre de comparaisons à un demi-niveau ou moins. Pour la comparaison, une bande d’observation est représentée par son milieu (B1 = 3,5). Si plusieurs bandes franchissent le seuil, le calcul retient la plus élevée. Le seuil d’observation, la taille du pilote et la couverture par niveau restent à examiner avant d’utiliser ces résultats pour choisir une règle de promotion.

## 6.3 — Test adaptatif, bilan et immersion

Calibrer les items de placement par compétence et vérifier leur couverture par langue avant d’activer l’adaptation. Conserver le résultat du bilan comme mesure distincte et mesurer son écart avec l’estimation continue selon les indicateurs du projet. Les langues peu couvertes peuvent afficher des compétences non mesurées. Présenter une projection en fourchette lorsque l’historique offre assez de mesures comparables.

Permettre l’ajout, la modification et la suppression d’une entrée d’immersion avec date, langue, durée et type d’activité. Compter ces minutes dans le temps d’apprentissage, avec une distinction visible pour les activités déclarées. Vérifier le décompte après correction d’une entrée et le changement de langue active.
