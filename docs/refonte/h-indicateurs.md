# h. Indicateurs de succès

Principe : on mesure **l'apprentissage et la régularité**, pas l'activité. Un indicateur d'engagement n'est jamais lu sans son indicateur d'apprentissage en regard.

## 1. Tableau de bord

| Famille | Indicateur | Définition | Cible initiale | Source |
|---|---|---|---|---|
| Rétention | J1 | Part des nouveaux comptes qui finissent une séance le lendemain de l'inscription | ≥ 45 % | `session` |
| | J7 | Part des nouveaux comptes actifs entre J7 et J9 | ≥ 25 % | `session` |
| | J30 | Part des nouveaux comptes actifs entre J28 et J32 | ≥ 12 % | `session` |
| | Semaines actives | Part des comptes ayant ≥ 3 jours d'étude dans la semaine | Suivi | `session` |
| Séances | Achèvement | Séances terminées / séances commencées | ≥ 75 % | `session` |
| | Durée réelle / durée choisie | Médiane | 0,8 à 1,2 | `attempt` |
| | Équilibre des volets | Part du temps hebdomadaire par volet de Nation | Aucun volet < 15 % | `attempt` |
| Mémoire | Rétention mesurée | Rappels réussis sur les cartes revues, comparés à la cible FSRS | Cible ± 3 points | `review_log` |
| | Charge de révision | Minutes de révision par jour (médiane, 90ᵉ centile) | ≤ 25 % de la séance | `review_log` |
| | Dette | Part des comptes avec plus de 3 jours de retard | < 10 % | `card` |
| Compréhension | Réussite aux questions | Médiane sur les textes de séance | 70 à 90 % (ni trop dur, ni trop facile) | `attempt` |
| | Couverture des textes servis | Part de mots connus de l'apprenant | 90 à 98 % | `text`, `lexeme_state` |
| Production | Réécriture | Corrections suivies d'une réécriture réussie | ≥ 80 % | `rewrite` |
| | Erreurs récurrentes | Fréquence d'une catégorie d'erreur à 30 jours contre les 30 jours précédents | En baisse | `correction` |
| Progrès | Niveau par compétence | Variation à 90 jours pour les comptes actifs | Positive dans ≥ 1 compétence pour 60 % | `skill_estimate` |
| | Mots prouvés | Gain mensuel médian | Suivi par niveau | `lexeme_state` |
| | « Je peux… » validés | Par mois actif | ≥ 2 | `can_do` |
| | Validité de l'estimation | Écart entre le niveau continu et le résultat du bilan | ≤ 1 demi-niveau | `assessment_result` |
| Qualité | Signalements | Par 1 000 exercices servis | < 2 | `content_report` |
| | Contenus publiés non relus | Nombre | 0 (bloqué par la CI) | CI |
| Coût | Par apprenant actif et par mois | Coût IA total / actifs mensuels | ≤ 0,15 $ | `ai_call` |
| | Dépense mensuelle | Total | ≤ 10 € | `ai_call` |
| Technique | Accessibilité | Audit automatisé (axe) sur chaque écran en clair et en sombre + revue manuelle au lecteur d'écran par jalon | AA, 0 violation bloquante | CI |
| | Synchronisation | Tentatives hors ligne perdues | 0 | `attempt` |
| | Performance | Premier affichage utile sur iPhone en 4G | < 2,5 s | Mesure de terrain |

Les cibles de rétention sont des hypothèses de départ pour un produit de cette catégorie, à recaler après les trois premiers mois de données. Avec quelques dizaines d'utilisateurs, ces chiffres sont **indicatifs** : l'app les présente et les lit comme tels.

## 2. Garde-fous : détecter une gamification qui dérive

| Signal | Lecture | Réaction |
|---|---|---|
| XP en hausse, rétention des cartes en baisse | On gagne des points sans retenir | Revoir le barème de l'action en cause |
| Séances très courtes juste avant minuit | La série est devenue le but | Adoucir la série (gel, série hebdomadaire) pour ces comptes |
| Membres de ligue : plus de temps, mais moins de production et d'oral | La ligue pousse vers le plus rentable | Plafond d'XP de ligue, rééquilibrage du barème |
| Désactivation fréquente d'une mécanique | Elle gêne | La revoir ou la retirer des réglages par défaut |
| Désinscription des notifications après un message donné | Le ton ne convient pas | Retirer le message |
| Abandon après une série perdue | La perte est mal présentée | Revoir l'écran et la réparation |

## 3. Preuve d'efficacité

- Bilan de compétences à l'inscription (facultatif mais proposé), puis tous les 60 à 90 jours : c'est la mesure externe du progrès.
- Comparaison avant et après la bascule pour la rétention des cartes (Leitner contre FSRS), à données égales.
- Aucune affirmation publique d'efficacité sans échantillon suffisant et méthode décrite.

## 4. Mesure et vie privée

Les indicateurs sont calculés à partir des tables de l'app, dans des vues agrégées réservées au rôle de service. Pas de traceur publicitaire, pas de revente, pas d'outil d'analyse tiers au-delà des statistiques d'audience déjà en place. La page de confidentialité décrit ce qui est mesuré. Un script `metrics:report` produit le tableau de bord du mois ; un écran d'administration pourra suivre.

## 5. Critères de réussite de la refonte

La refonte est réussie si, trois mois après la bascule :
1. aucune donnée d'utilisateur n'a été perdue (contrôles du plan de migration verts) ;
2. l'achèvement des séances dépasse 75 % et J7 dépasse celui de l'ancienne app ;
3. la rétention mesurée des cartes est au moins égale à l'actuelle, pour un temps de révision moindre ;
4. au moins 60 % des comptes actifs voient une compétence progresser ;
5. la dépense reste sous 10 € par mois ;
6. tous les écrans passent l'audit AA.
