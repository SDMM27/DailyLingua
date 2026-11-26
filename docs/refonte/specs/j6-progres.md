# Jalon 6 — Progrès et niveau par compétence

Le russe et l’italien sont les deux seules langues cibles des jalons restants. Les contenus, le calibrage et la recette se limitent à ces deux langues. L’extension suivra la recette de la préversion et les corrections issues des retours.

## 6.1 — Tableau de progrès

Ajouter une entrée « Progrès » dans la navigation de la préversion. La page porte sur la langue active et présente quatre compétences, les « Je peux… » validés et l’activité récente. La variante compacte place les jours d’étude en premier sur mobile, puis le tableau des compétences et les acquis. À 1280 et 1440 px, les jours d’étude et les acquis occupent la colonne gauche, avec le tableau à droite. Prévoir les libellés français et anglais.

| Affichage | Source | Règle |
|---|---|---|
| Lire, écouter, écrire, parler | `skill_estimate` | Présenter le niveau et l’origine de l’estimation. Afficher « Non mesuré » si la ligne manque, « Déclaré » à l’inscription ou « Repris de l’ancienne app » après migration. |
| « Je peux… » validés | Progression des unités et bilans réussis | Afficher le descripteur et le lien vers l’unité si le contenu est disponible dans la langue cible. |
| Jours d’étude récents | `learning_day` | Afficher les sept jours d’apprentissage du compte, toutes langues confondues, selon le fuseau du profil et la limite de journée déjà utilisée par la séance. |

Étendre `packages/data` en conservant la lecture avec le client authentifié et les politiques RLS. Le chargeur borne chaque requête à son usage et filtre par langue les données rattachées à un apprentissage. `getLearningProgress` garde son contrat pour les appels existants qui affichent l’XP et la série. La page fonctionne avec un compte neuf ou migré, y compris lorsque des compétences ou des unités sont absentes.

**Recette.** Vérifier l’isolation entre deux comptes et deux langues. Couvrir un compte neuf, un compte migré sans estimation orale, un bilan réussi et une semaine à cheval sur un changement de mois. Vérifier la page et son accès au clavier en français et en anglais, en clair et en sombre, à 390, 1280 et 1440 px. Relier la recette à la grille de bascule du plan de migration.

## 6.2 — Estimation continue et mots prouvés

Établir une grille des preuves à partir des données des jalons 2 à 5. Candidats à vérifier par compétence : réponses de compréhension sur un texte ou un audio, productions corrigées et tâches de rôle évaluables. Préciser pour chaque source la difficulté connue, la qualité du signal et la clé de déduplication. La durée, l’XP et l’achèvement d’une activité restent des mesures de pratique. Les niveaux déclarés et migrés servent de point de départ avec leur incertitude d’origine.

Calculer les estimations côté serveur à partir des preuves acceptées. Une tentative rejouée après une synchronisation hors ligne doit produire le même état. Une activité comportant plusieurs questions sur le même support ne doit pas peser autant que plusieurs supports indépendants. Choisir les seuils d’incertitude et de diversité des preuves après un essai sur des trajectoires simulées et des résultats de bilan. Conserver le dernier palier confirmé tant que les nouvelles preuves ne suffisent pas.

Pour les mots prouvés, réutiliser l’identité des lemmes et les états du lecteur. Définir sur des exemples la transition vers « prouvé », notamment pour un mot déjà marqué connu, un mot rencontré dans plusieurs textes et les formes fléchies d’un même lemme. Afficher le nombre de lemmes prouvés par langue.

## 6.3 — Test adaptatif, bilan et immersion

Calibrer les items de placement par compétence et vérifier leur couverture par langue avant d’activer l’adaptation. Conserver le résultat du bilan comme mesure distincte et mesurer son écart avec l’estimation continue selon les indicateurs du projet. Les langues peu couvertes peuvent afficher des compétences non mesurées. Présenter une projection en fourchette lorsque l’historique offre assez de mesures comparables.

Permettre l’ajout, la modification et la suppression d’une entrée d’immersion avec date, langue, durée et type d’activité. Compter ces minutes dans le temps d’apprentissage, avec une distinction visible pour les activités déclarées. Vérifier le décompte après correction d’une entrée et le changement de langue active.
