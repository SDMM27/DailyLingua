# Refonte DailyLingua — Jalon 0 : audit et conception

Date : 2026-11-12. Aucun code de production n'a été écrit. Ce dossier attend une validation avant le jalon 1.

## Sommaire

| Document | Contenu | Rédigé par |
|---|---|---|
| [00-audit-et-benchmark.md](00-audit-et-benchmark.md) | État du code, parcours observés, benchmark de 9 apps, faisabilité de l'oral | Session principale, d'après 4 agents de recherche (Sonnet) |
| [a-vision-et-principes.md](a-vision-et-principes.md) | Promesse, sept principes, boucles, ressenti à J1, J7, J30, M6 | Session principale |
| [b-modele-pedagogique.md](b-modele-pedagogique.md) | Compétences, parcours A0 → C2, séance type, input, mémoire, output, oral | Session principale |
| [c-game-design.md](c-game-design.md) | Barème d'XP, 10 mécaniques, dérives et garde-fous | Agent Opus, relu |
| [d-architecture.md](d-architecture.md) | Stack, monorepo, modèle de données, sécurité, hors ligne, i18n, natif | Session principale |
| [e-direction-artistique.md](e-direction-artistique.md) | « L'édition du jour », système visuel, mascotte, accessibilité | Agent Opus, relu |
| [maquettes/maquettes.html](maquettes/maquettes.html) | 11 écrans, clair et sombre — publiés : <https://claude.ai/artifact/5Ypg2eH5JHXgSyqf3bLycq> | Agent Opus, vérifié à l'écran |
| [f-plan-de-migration.md](f-plan-de-migration.md) | Deux schémas côte à côte, correspondance des données, contrôles, retour arrière | Session principale |
| [g-budget.md](g-budget.md) | Coût par apprenant, capacité à 10 €, mécanismes | Session principale |
| [h-indicateurs.md](h-indicateurs.md) | Tableau de bord, détection des dérives, critères de réussite | Session principale |
| [i-jalons-suivants.md](i-jalons-suivants.md) | Huit jalons livrables seuls | Session principale |

**En cas de divergence** entre deux documents : `c-game-design.md` fait foi pour les règles du jeu, `d-architecture.md` pour les données et la sécurité, `e-direction-artistique.md` pour le visuel. Les deux divergences connues (sons par défaut, nombre de gels) figurent ci-dessous aux points 9 et 10.

## Points à trancher

### Produit et pédagogie

| # | Question | Recommandation | Pourquoi |
|---|---|---|---|
| 1 | Durée de séance par défaut | **15 minutes**, réglable de 10 à 30 | Assez pour les quatre volets sur la semaine, assez court pour tenir chaque jour |
| 2 | Le contenu authentique « tous droits réservés » reste-t-il au centre de la séance ? | **Non** : le texte gradué ou ouvert porte la séance ; l'authentique protégé devient « pour aller plus loin » | On ne peut ni l'afficher en entier ni poser de vraies questions dessus |
| 3 | Langues pilotes du parcours débutant | **Russe et italien**, puis par vagues | Continuité avec les pilotes précédents ; l'une a une écriture à apprendre, l'autre non |
| 4 | Langue pivot des contenus curés | **Français conservé**, traduction vers l'anglais en premier | Les 342 fiches sont écrites et relues en français |
| 5 | Seuil d'un mot « connu » | **Stabilité FSRS ≥ 21 jours** | La feuille de route citait 60 jours en exemple ; 21 jours donne un retour plus tôt, à recaler sur les données |
| 6 | Exception à « Haiku uniquement » pour relire par échantillon les textes générés (modèle plus fort, en Batch, ≈ 2 € par mois) | **Oui** | Un modèle ne relit pas bien ce qu'il a lui-même écrit ; c'est hors du parcours de l'utilisateur. **Touche une décision de la section 2 : ton accord est nécessaire** |

### Jeu

| # | Question | Recommandation | Pourquoi |
|---|---|---|---|
| 7 | Ligues | **En option, désactivées par défaut, sans relégation** ; défi collectif sans classement tant qu'il y a moins de 16 inscrits | La relégation est le principal moteur d'anxiété documenté ; pas de faux joueurs |
| 8 | Série par défaut | **Quotidienne**, avec gel automatique ; série de semaines proposée à J3 | L'habitude se forme chaque jour ; le choix préserve l'autonomie |
| 9 | Gels de série | **Un offert chaque lundi, d'autres gagnés par l'objectif de semaine, stock de 3 au plus** | Version du game design ; la direction artistique en montrait 2 en réserve — les maquettes seront alignées |
| 10 | Sons par défaut | **Coupés, proposés à la fin de la première séance** | Usage fréquent en public ; la direction artistique proposait « activés à bas volume » |
| 11 | XP à la bascule pour les comptes existants | **Pas d'XP rétroactive** ; série et étapes réelles reprises de l'historique | Une XP inventée contredirait la règle d'or |
| 12 | Immersion déclarée (temps hors app) | **Comptée à part, 6 XP par jour au plus, hors ligues et hors série** | Invérifiable, mais essentielle à rendre visible |
| 13 | Mascotte | **Pica** (caractère d'imprimerie dont la lettre change selon la langue), rôle limité ; ou aucune au départ | Sans biais culturel, cohérent avec l'imprimerie ; peut s'ajouter plus tard sans refonte |

### Direction artistique

| # | Question | Recommandation | Pourquoi |
|---|---|---|---|
| 14 | Direction | **Garder « journal du matin » comme socle, avec le registre « atelier d'imprimerie » pour le jeu** (tampons, éditions, « bon à tirer ») | Garde l'identité, donne de la récompense sans casser le calme de la lecture |
| 15 | Police du texte en langue cible | **Serif, avec Literata pour le cyrillique et le grec** | Newsreader n'a pas de cyrillique et le repli actuel place mal l'accent tonique |
| 16 | Deux couleurs à corriger pour le contraste AA (ocre de langue, texte de série) | **Oui** | Ratios actuels de 4,19 et 4,29 pour 4,5 requis |

### Technique

| # | Question | Recommandation | Pourquoi |
|---|---|---|---|
| 17 | Base de la nouvelle app | **Même projet Supabase, nouveau schéma `app`** | Les comptes restent valides, retour arrière trivial ; un nouveau projet obligerait à migrer les mots de passe |
| 18 | Cadre web | **Garder Next.js 16** dans un monorepo | Acquis, rendu serveur, partage de React avec Expo |
| 19 | Emplacement de l'ancienne app pendant la refonte | **Gelée dans `legacy/`** du même dépôt, correctifs de sécurité seulement | Un seul dépôt, une seule CI |
| 20 | Bibliothèques : `next-intl`, Serwist, `ts-fsrs` | **Oui**, versions vérifiées au jalon 1 | Citées par la doc Next ou de référence dans leur domaine |
| 21 | Fournisseur de voix | **Azure, offre gratuite**, derrière une interface remplaçable | Gratuit d'abord. **Ouvrir un compte Azure est une action de ta part** ; les droits d'usage commercial de l'audio gratuit sont à confirmer avant toute vente |
| 22 | Enregistrements vocaux | **Jamais conservés** après transcription | Décision antérieure reprise |
| 23 | Préversion à des volontaires dès la fin du jalon 3 | **Oui**, sur une adresse distincte | Mesurer tôt ; suppose une première migration en production, donc ton accord le moment venu |
| 24 | Branche de travail | **`refonte/jalon-1` tirée de `dev`**, PR vers `dev` | La branche courante `redesign/journal` porte des changements en cours qui ne sont pas les miens |

## Problèmes ouverts

1. **Parcours débutant non testé dans le navigateur** : l'essai invité n'a pas démarré dans le panneau d'audit. Le constat repose sur le code et les tests e2e. À refaire sur iPhone réel au jalon 1.
2. **Benchmark** : sources souvent de seconde main, avis Reddit non lus, prix des concurrents non vérifiés. Les points incertains sont marqués dans `00-audit-et-benchmark.md`.
3. **Prix de l'API** : repris de la feuille de route (relevés le 2026-11-05), non revérifiés aujourd'hui. Les volumes du budget sont des estimations.
4. **Oral sur iOS** : état de la reconnaissance et du micro en PWA installée non confirmé sur la version actuelle d'iOS.
5. **Maquettes** : conformes à la direction artistique, pas encore alignées sur deux règles du game design (points 9 et 10). Elles n'ont pas été vérifiées dans l'aperçu de l'artifact sur téléphone.
6. **Longueur** : `c-game-design.md` dépasse la longueur visée ; rien n'a été coupé.
