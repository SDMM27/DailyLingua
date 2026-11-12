# f. Plan de migration

Objectif : passer de l'application actuelle à la nouvelle **sans perdre une seule donnée d'utilisateur**, avec un retour arrière possible à chaque étape. Aucune action de ce plan ne touche la production sans accord explicite du propriétaire.

## 1. Stratégie : deux schémas, une seule base, un seul système de comptes

- La nouvelle application écrit dans un schéma Postgres **`app`**, créé dans le projet Supabase existant.
- Les tables actuelles (`public`) ne sont **ni modifiées ni supprimées** pendant toute la refonte.
- Les comptes (`auth.users`) sont communs : aucun utilisateur n'a à recréer un compte ni à changer de mot de passe.
- L'ancienne application reste en ligne sur l'adresse actuelle jusqu'à la bascule ; la nouvelle tourne sur une adresse de préversion.

Alternative écartée : un nouveau projet Supabase. Elle obligerait à migrer les comptes et les mots de passe, complique le retour arrière et consomme un second projet gratuit. Elle reste possible si le propriétaire préfère une séparation totale (point à trancher).

## 2. Correspondance des données

| Données actuelles (`public`) | Destination (`app`) | Transformation |
|---|---|---|
| `profiles` | `profile` | L1 = `fr`, langue d'interface = `fr` ; fuseau, heure de génération, `show_streak` → réglages |
| `user_languages` | `enrollment`, `skill_estimate` | `level` → lire et écouter ; `production_level` (ou `level`) → écrire ; parler = « non mesuré » ; minutes, jours, objectif repris |
| `vocabulary_items`, `vocabulary_lists` | `card` (type mot), `lexeme_state`, listes | Boîte Leitner → état FSRS initial (voir §3) ; `due_on` conservé ; phrase d'exemple → contexte |
| `vocabulary_reviews` | `review_log` | Note, mode, date repris tels quels ; marqués `origine = leitner` |
| `grammar_cards`, `alphabet_cards`, `correction_cards` | `card` (types grammaire, écriture, correction) | Même règle de conversion |
| `production_entries`, `writing_feedback` | `production`, `correction` | JSON de correction conservé avec sa version de prompt |
| `placement_tests`, `assessments` | `assessment_result` | Réponses et résultats conservés en l'état |
| `missions`, `mission_sessions`, `mission_activities`, `activity_progress`, `quiz_answers` | `legacy_mission` (archive en lecture seule) + jours d'étude pour la série | L'historique reste consultable ; il ne se rejoue pas dans le nouveau format |
| `feedback`, `content_refusals`, `user_source_access`, `mission_requests` | Tables équivalentes | Copie directe |
| `sources`, `contents` | `source`, références de contenus | Ré-ingérés par le catalogue ; les identifiants cités par l'historique sont conservés |
| Quotas (`*_usage`, `*_quota`) | Non migrés | Compteurs journaliers sans valeur historique |
| Comptes invités | Migrés comme les autres | Purge des inactifs inchangée |

Chaque ligne migrée est inscrite dans `app.legacy_map` (table et identifiant d'origine → nouvel identifiant). La migration est donc **rejouable** : relancée, elle ne crée pas de doublon et ne traite que ce qui a changé.

## 3. De Leitner à FSRS

L'état d'une carte Leitner (boîte, dernière révision, échéance) est converti ainsi : la stabilité initiale vaut l'intervalle de la boîte (1, 2, 4, 8, 16, 32 ou 64 jours), la difficulté prend la valeur par défaut de FSRS, l'échéance existante est **conservée telle quelle**. Aucune carte ne devient due plus tôt à cause de la migration, et l'apprenant ne voit pas d'avalanche le jour de la bascule. FSRS affine ensuite à chaque révision. Le statut « connu » manuel est conservé, et passera par un rappel de vérification différé.

La mesure de rétention existante est figée avant la bascule, pour comparer avant et après.

## 4. XP, série et étapes à la bascule

- **Série** : recalculée à partir des jours d'étude réels (missions et révisions), avec les règles actuelles. Personne ne repart de zéro.
- **Étapes réelles** (mots prouvés, textes écrits, heures) : attribuées d'après l'historique, sans animation en rafale — un seul écran « ce que tu as déjà accompli ».
- **XP** : pas d'XP rétroactive inventée. Le total repart de zéro pour tous, les étapes rappellent l'acquis. (Point à trancher : une XP d'origine calculée sur l'historique vérifiable est possible.)

## 5. Étapes

| Étape | Où | Ce qui est fait | Critère de passage |
|---|---|---|---|
| M1 | Local | Schéma `app`, fonctions de migration SQL, tests pgTAP sur le jeu d'exemple (`seed.sql`) enrichi de cas limites | Tests verts, migration rejouée deux fois sans différence |
| M2 | Local, **sur une copie de la production** | Sauvegarde de la production restaurée en local ; migration ; rapport de contrôle | Voir §6 ; **demande d'accord pour faire la sauvegarde** |
| M3 | Production, schéma `app` seulement | Création du schéma et migration à blanc, l'ancienne app continuant de servir | **Accord explicite** ; rapport de contrôle identique à M2 |
| M4 | Préversion | La nouvelle app est ouverte à des volontaires sur une adresse distincte. Leurs données sont migrées ; un marqueur `migrated_at` dans leur profil redirige l'ancienne app vers la nouvelle pour éviter une double écriture | Aucun écart signalé pendant deux semaines |
| M5 | Bascule | Fenêtre courte : ancienne app en lecture seule, dernière migration incrémentale, changement de domaine | **Accord explicite** ; contrôles §6 verts |
| M6 | Après | L'ancienne app reste accessible en lecture seule 30 jours ; `public` est conservé 90 jours puis archivé (export) | **Accord explicite** avant toute suppression |

## 6. Contrôles de non-perte

Un script `migration:verify` compare, pour chaque utilisateur :
- le nombre de cartes par type, de révisions, de productions, de corrections, de tests et de bilans ;
- la somme de contrôle des textes des productions et des termes de vocabulaire ;
- l'échéance de chaque carte (identique) ;
- la série recalculée (identique à celle affichée par l'ancienne app) ;
- l'absence de ligne `public` sans entrée dans `legacy_map`.

Tout écart bloque le passage à l'étape suivante. Le rapport est joint à la demande de validation.

## 7. Retour arrière

| Moment | Retour arrière |
|---|---|
| Avant M5 | Rien à faire : l'ancienne app n'a jamais cessé de fonctionner. On peut supprimer le schéma `app` |
| Volontaires (M4) | Retrait du marqueur `migrated_at` ; le travail fait dans la nouvelle app est conservé dans `app` et sera repris à la prochaine migration |
| Après M5, pendant 30 jours | Le domaine repointe vers l'ancienne app. Le travail fait depuis la bascule est réinjecté dans `public` par un script inverse limité aux révisions de cartes et aux productions (les seules données que l'ancienne app sait lire) ; il est écrit et testé **avant** M5 |
| Au-delà | Restauration depuis la sauvegarde |

## 8. Contenus curés

Ils ne passent pas par la base : les fichiers de `src/lib/grammar`, `placement/banks`, `alphabets`, `assessment/dossiers`, `frequency` et `content/catalog.ts` sont **déplacés** dans `packages/content` avec leur historique git (`git mv`), leurs statuts (`aiReview`, `reviewedOn`, `checkedOn`) et leurs identifiants inchangés. Les scripts `grammar:check`, `placement:check`, `assessment:check` suivent et tournent en CI. Les champs `*_fr` sont renommés mécaniquement en champs neutres avec leur langue (`fr`), sans toucher au texte : les statuts de relecture restent donc valides. Les rapports `docs/reviews/` et les jeux d'évaluation sont conservés tels quels.

## 9. Responsabilités

Conception et scripts de migration : session principale. Écriture des fonctions SQL d'après la table du §2 : agent `migrateur-donnees`. Revue indépendante : agent `relecteur-securite`. Exécution en production : uniquement sur accord, pas à pas, avec le propriétaire.
