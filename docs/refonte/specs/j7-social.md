# Jalon 7 — Social et rétention

Spec d'implémentation du [jalon 7](../i-jalons-suivants.md#jalon-7--social-et-rétention). Règles de jeu : [game design](../c-game-design.md) §2.1, §3.3, §3.4, §3.5, §3.9, §5. Indicateurs : [h-indicateurs.md](../h-indicateurs.md) §2. Style : [direction artistique](../e-direction-artistique.md) ; écrans aérés, une action principale.

Quatre lots, une PR vers `dev` par lot, dans l'ordre. **Livrable** : les mécaniques sociales sont actives et chacune se coupe.

## Principes communs

- **Le serveur décide.** Le client n'envoie jamais d'XP, de progression de quête ni de badge. Tout est recalculé depuis `app.xp_ledger` et les tables existantes, par le rôle de service.
- **`app.xp_ledger` reste en ajout seul.** Aucune ligne n'est écrite pour une donnée encore modifiable. Les nouvelles règles sont hors de `xpRuleIds` (elles ne viennent pas de l'ingestion) : `quest.daily`, `quest.weekly`, `immersion.declared`, `rule_version = 'j7.1'`. Les filtres de `packages/core/src/game/filters.ts` les traitent déjà par préfixe : `quest.*` compte pour l'anneau, pas pour la série ; `immersion.*` ne compte ni pour l'anneau, ni pour la série, ni pour les ligues.
- **Calcul paresseux, sans tâche planifiée.** Les tâches planifiées GitHub tournent depuis `main` et celles de la refonte sont coupées. Chaque calcul (attribution et règlement des quêtes, clôture des jours d'immersion, badges) est idempotent et lancé pour l'utilisateur courant : après une ingestion réussie (`api/events`, au mieux : une erreur est journalisée, l'ingestion n'échoue pas) et au chargement des pages qui l'affichent. Un compte inactif n'a donc rien à calculer.
- **Un interrupteur par mécanique**, dans `profile.game_settings`, réglable dans la page Réglages, enregistré par `app.save_game_settings` (remplacer `app.is_valid_game_setting` par une version qui accepte les nouvelles clés booléennes, en partant de sa dernière définition, `20261118000200_app_ingest_hardening.sql`). Clés : `quests.enabled` (vrai par défaut), `immersionXp.enabled` (vrai), `badges.enabled` (vrai), `league.enabled` (faux), `friends.enabled` (faux). Étendre le schéma zod, `resolveGameSettings` et `flattenGameSettings`.
- **Ton.** Rien n'est perdu, aucune relance, aucun reproche. Une quête non faite disparaît sans trace. Pas de notification sociale. Sons coupés par défaut (déjà le cas).
- Libellés FR et EN dans `packages/i18n/messages/{fr,en}.json`, aucune chaîne en dur, clair et sombre, champs ≥ 16 px, cibles ≥ 44 px.
- Migrations additives, horodatages `20261128000100` et suivants (une autre session prépare une migration du jalon 6.3 : `git fetch` avant de pousser, horodatages distincts). RLS : lecture par le propriétaire, aucune écriture pour `authenticated`, écritures par fonctions `security definer` réservées à `service_role` ou par le client de service. pgTAP pour chaque table.

## Lot 1 — Quêtes et XP d'immersion

### 1.1 Clôture d'un jour d'immersion

**Règle de clôture.** Un jour d'immersion D est **modifiable** tant que D ≥ aujourd'hui − 3 (jour d'apprentissage du profil), comme la fenêtre de retard de l'ingestion (72 h). Il est **clos** à partir de aujourd'hui − 4. Un jour clos ne se modifie plus : les routes `api/immersion` refusent création, modification et suppression avec `409 day_closed` (la fenêtre passe de 30 à 3 jours : une récompense 8 jours après l'activité ne servirait à rien ; les entrées plus anciennes restent visibles, en lecture seule). L'XP du jour n'est écrite qu'à la clôture, une fois pour toutes.

- Table `app.immersion_close (user_id, day, minutes, xp, closed_at, primary key (user_id, day))`, en ajout seul (`app.forbid_journal_change`). Elle marque aussi un jour clos sans XP (moins de 10 minutes), pour qu'un changement de fuseau ne rouvre pas un jour déjà soldé : les routes refusent un jour qui y figure.
- Fonction `app.close_immersion_days(p_user uuid, p_through date)` (`security definer`, `service_role` seulement) : refuse `p_through > current_date - 3` ; pour chaque jour ≤ `p_through` qui a des entrées et n'est pas dans `immersion_close`, somme les minutes (toutes langues), si `immersionXp.enabled` est faux, ne fait rien pour ce compte (le jour reste créditable si l'interrupteur est rallumé : rien n'est perdu) ; sinon insère la clôture et, si `xp = least(6, minutes / 10) > 0`, une ligne `xp_ledger` (`reason 'immersion.declared'`, `day = D`, `language` null, `league_eligible false`, `rule_version 'j7.1'`, `meta {"minutes": n}`). Retourne le nombre de jours clos. Rejouée, elle n'écrit rien.
- Appelée avec `p_through = aujourd'hui − 4` après l'ingestion et au chargement de `/progress`.
- Affichage : la ligne de synthèse de l'immersion ajoute « +N XP » pour les jours clos de la semaine affichée ; un jour modifiable n'affiche pas encore d'XP (« XP comptée au bout de 3 jours »).

### 1.2 Quêtes

**Catalogue v1** (`packages/core/src/game/quests.ts`, version `quests.v1`). Toute quête se mesure en lignes de `xp_ledger` de la période (hors `quest.*` et `immersion.*`), pour être vérifiable et recalculable. Les quêtes du game design qui exigent une donnée absent du journal (audio sans texte, réemploi de mots du focus, vitesse de lecture, 4/3/2) sont différées.

| Id | Libellé | Volet | Période | Mesure | Cible |
|---|---|---|---|---|---|
| `read_2` | Lis 2 textes jusqu'au bout | input | jour | `reading.understood*` | 2 |
| `read_well` | Comprends un texte à 90 % ou plus | input | jour | `reading.understood_well` | 1 |
| `dictation_5` | Fais 5 phrases de dictée | input | jour | `dictation.sentence` | 5 |
| `produce_1` | Envoie une production | output | jour | `production.corrected` | 1 |
| `rewrite_2` | Réécris 2 phrases corrigées | output | jour | `rewrite.sentence*` | 2 |
| `recall_production_10` | Réussis 10 rappels en production | study | jour | `review.production` | 10 |
| `reconquest_3` | Reconquiers 3 cartes ratées hier | study | jour | `review.bonus.reconquest` | 3 |
| `error_of_day` | Retravaille l'erreur du jour | study | jour | `error_of_day.reworked` | 1 |
| `fluency_2` | Fais 2 passages de fluidité | fluency | jour | `fluency.pass` | 2 |
| `shadowing_10` | Fais 10 phrases de shadowing | fluency | jour | `shadowing.sentence` | 10 |
| `session_1` | Termine ta séance | régularité | jour | `session.complete` | 1 |
| `unit_1` | Termine une unité du parcours | découverte | jour | `unit.complete` | 1 |
| `read_5_week` | Lis 5 textes cette semaine | input | semaine | `reading.understood*` | 5 |
| `produce_4_week` | Envoie 4 productions cette semaine | output | semaine | `production.corrected` | 4 |
| `roleplay_week` | Fais un jeu de rôle | output | semaine | `roleplay.completed` | 1 |
| `recall_production_40_week` | Réussis 40 rappels en production | study | semaine | `review.production` | 40 |
| `fluency_4_week` | Fais 4 passages de fluidité | fluency | semaine | `fluency.pass` | 4 |
| `session_4_days_week` | Termine ta séance 4 jours cette semaine | régularité | semaine | jours distincts avec `session.complete` | 4 |
| `four_volets_week` | Couvre les quatre volets dans la semaine | régularité | semaine | volets distincts (`RULE_VOLET`) | 4 |

**Choix** (pur, déterministe, graine = utilisateur + période) :
1. Part de chaque volet dans l'XP des 14 derniers jours (règles à volet non nul seulement) ; écart = 25 % − part.
2. Jour : quête 1 dans le volet au plus grand écart, quête 2 dans le deuxième, quête 3 dans « régularité ou découverte ». Semaine : une quête pour chacun des deux volets les plus en retard, plus une transverse (régularité).
3. Exclure les quêtes attribuées dans les 3 jours précédents (jour) ; les quêtes d'oral (`shadowing_10`, `roleplay_week`) et `unit_1` si la règle mesurée n'a aucune ligne sur 30 jours (fonction non utilisée ou micro refusé) ; si un volet n'a plus de candidate, prendre le volet suivant.
4. Compte de moins de 7 jours (première ligne d'XP) : quêtes du jour `session_1`, `read_2`, `recall_production_10` ; pas de quête de semaine la première semaine.
5. Cibles fixes en v1 (calibrées pour tenir dans une séance de 15 min) ; la cible ≤ 40 % de l'XP médiane du game design est différée jusqu'aux premières données.

**Données.** `app.quest_assignment (id uuid, user_id, period text check in ('day','week'), period_start date, slot smallint 1..3, quest_id text, target smallint, catalog_version text, rerolled_from text null, completed_at timestamptz null, created_at, unique (user_id, period, period_start, slot))`. État dérivé (modifiable par le service : relance, achèvement), lecture par le propriétaire. La semaine commence le lundi (jour d'apprentissage).

**Attribution** : au chargement de l'accueil et après une ingestion, si `quests.enabled`, créer les quêtes manquantes du jour et de la semaine (insertion `on conflict do nothing`).

**Règlement** : pour chaque quête non achevée dont la période contient un jour ≥ jour serveur − 3 (borne du journal), compter les lignes de la période ; si la cible est atteinte, appeler `app.complete_quest(p_assignment uuid)` (`security definer`, `service_role`) qui, dans une transaction, pose `completed_at` si nul et insère la ligne `quest.daily` (10 XP, `day = period_start`) ou `quest.weekly` (40 XP, `day` = jour d'achèvement), `language` null, `meta {"quest": id}`, `league_eligible true`. L'index unique `xp_ledger_sourceless_idx` empêche un double crédit en cas de course.

**Relance** : une par jour, sur une quête du jour non achevée ; elle tire une autre quête du même volet (ou de n'importe quel volet si aucune), `rerolled_from` garde l'ancienne. Route `POST /api/quests/reroll` (`{ assignmentId }`) avec les gardes habituelles (session, même origine, corps ≤ 1 Ko, UUID) ; `409` si déjà relancée ou achevée.

**Interface (accueil).** Sous l'action principale, une section discrète « Quêtes du jour » : trois lignes (libellé, progression « 1 / 2 », coche quand achevée, sans pourcentage ni couleur d'alerte), un lien « Changer » sur une seule quête non achevée tant que la relance du jour est disponible. Les quêtes de semaine sont dans la page Progrès, même forme. Aucune quête affichée si l'interrupteur est coupé. Réglages : « Quêtes » et « XP d'immersion » (avec la phrase « 1 XP par 10 min déclarées, 6 au plus par jour, comptée au bout de 3 jours »).

**Tests.** Vitest : choix (écarts, exclusions, nouveaux comptes, déterminisme), mesure, règlement idempotent, relance, clôture d'immersion (bornes, plafond 6, jour clos refusé, fuseau). pgTAP : RLS des deux tables, `complete_quest` et `close_immersion_days` refusés à `authenticated`, double appel sans double crédit, `p_through` trop récent refusé. e2e WebKit 390 px : quêtes visibles, relance, interrupteur.

## Lot 2 — Badges d'étapes réelles

Attribués par le serveur, définitifs, aucun badge caché ni collection à compléter. Calcul paresseux (après ingestion, au chargement de `/progress`) par une fonction pure `awardBadges(facts, already)` dans `packages/core/src/game/badges.ts`.

**Catalogue v1** (`badges.v1`) — seulement ce que les données prouvent aujourd'hui :

| Famille | Badges | Fait mesuré | Portée |
|---|---|---|---|
| Mots connus | 100, 250, 500, 1 000, 2 000, 3 000, 5 000, 8 000 | Cartes de la langue avec stabilité FSRS ≥ 21 jours (game design §5, anti-bachotage) | par langue |
| Niveau par compétence | A1 … C2 franchi en lecture, écoute, écriture, oral | `app.skill_estimate` en lecture seule (aucune modification de l'estimation) : badge quand le niveau estimé atteint la bande | par langue et compétence |
| Lecture | premier texte compris à ≥ 90 % ; 10, 50, 200 textes compris | lignes `reading.understood*` | par langue |
| Écoute | première dictée à ≥ 95 % | ligne `dictation.sentence` de 2 XP | par langue |
| Production | 50 réécritures | lignes `rewrite.sentence*` | par langue |
| Oral | 100 phrases de shadowing validées ; premier jeu de rôle terminé | `shadowing.sentence`, `roleplay.completed` | par langue |
| Pratique | 10, 50, 100, 500 h de pratique vérifiée | somme des durées de séances terminées (`sessionMinutes`, bornée à 60 min) | tous comptes confondus |

Différés (données absentes) : texte authentique, audio sans texte, 10 h d'audio, production sans erreur, 200 mots en B2+, conversation de 5 min, minutes de parole, parcours débutant par niveau, descripteurs « Je peux ».

**Données.** `app.badge_award (id, user_id, badge_id text, language text null, awarded_at, meta, unique (user_id, badge_id, coalesce(language, '')))`, en ajout seul, lecture par le propriétaire, insertion par le service (`on conflict do nothing`).

**Interface (page Progrès).** Section « Étapes » : badges obtenus de la langue active (nom et date, « Nouveau » pendant 7 jours), puis pour chaque famille la prochaine étape (« Prochaine : 250 mots connus — 182 aujourd'hui »). Pas de grille de cases vides. Interrupteur « Badges » : coupé, la section disparaît, le calcul continue (réactivation sans perte).

**Tests.** Vitest : seuils, définitif (un fait qui baisse ne retire rien), portée par langue, idempotence. pgTAP : RLS, ajout seul. e2e : section visible, interrupteur.

## Lot 3 — Ligue en option, amis et défis coopératifs

Données personnelles visibles par d'autres comptes : niveau **sensible**, revue Opus, accord humain avant fusion. Écran nouveau `/social` : deux maquettes du `designer`, choix de la plus aérée si le propriétaire ne répond pas.

**Pseudonyme.** `app.social_profile (user_id pk, pseudonym text unique, created_at)` : 3 à 20 caractères (lettres, chiffres, espace, tiret), choisi par l'utilisateur à la première activation sociale, jamais son nom ni son adresse. Seul ce qui est listé ci-dessous est visible par d'autres comptes, toujours par des fonctions `security definer` qui ne renvoient que ces champs.

**Ligue (défi collectif).** Activation volontaire (`league.enabled`), après 7 jours d'ancienneté et 3 jours de série. `app.league_membership (user_id pk, joined_at, left_at)`. La semaine va du lundi 04:00 au lundi 04:00, heure de Paris. Tant que les membres actifs sont moins de 16 (le cas aujourd'hui), la ligue est un **défi collectif sans classement** : objectif commun = 80 % de la somme des objectifs de semaine des membres (5 × XP du palier d'anneau), XP de ligue de chacun = somme par jour de `leagueXp` (plafond 150, hors immersion). `app.league_week_summary()` renvoie aux membres seulement : nombre de participants, total, objectif, sa propre contribution. Aucun pseudonyme, aucun rang. Le mode classé (cohortes de 20 par tranche de volume) est **différé** jusqu'à 16 membres actifs : la fonction le signale par un champ `mode`. Quitter : un geste, effet immédiat.

**Amis.** Par code d'invitation seulement, jamais par contacts. `app.friend_invite (code pk, inviter, created_at, expires_at (7 jours), used_by, used_at)` ; `app.friendship (user_a, user_b, created_at, check (user_a < user_b))`. Routes : créer un code (5 actifs au plus), accepter un code, retirer un ami. `app.friends_overview()` renvoie, pour les amis dont `friends.enabled` est vrai : pseudonyme, langue cible active, XP de ligue de la semaine, série si l'ami l'affiche. Jamais erreurs, productions ni niveau.

**Défi coopératif de semaine.** 2 à 5 amis. `app.coop_challenge (id, created_by, week_start, created_at)` ; `app.coop_member (challenge_id, user_id, joined_at, left_at)`. Le créateur invite des amis ; chacun rejoint ou non (opt-in). Objectif = 80 % de la somme des objectifs de semaine des membres présents, recalculé quand quelqu'un rejoint ou part ; contributions plafonnées à 150 XP par jour. `app.coop_challenge_summary(id)` réservé aux membres : pseudonymes, contributions, total, objectif. Fin de semaine : le défi se clôt sans pénalité ; « Objectif atteint ensemble » si c'est le cas. Duel, série en binôme et lecture commune : différés.

**Couper.** `friends.enabled` faux : défis quittés sans pénalité, invisible des listes de ses amis. `league.enabled` faux : sortie de la ligue.

**Tests.** pgTAP : un compte ne lit ni les amitiés, ni les invitations, ni les défis des autres ; les fonctions ne renvoient que les champs listés ; un non-membre n'obtient rien ; code expiré ou déjà utilisé refusé ; pas d'amitié avec soi-même. Vitest : objectifs, plafonds, mode collectif. e2e : activer, inviter et accepter avec deux comptes, rejoindre un défi, couper.

## Lot 4 — Tableau de bord des dérives

Les signaux de [h-indicateurs.md](../h-indicateurs.md) §2 et du game design §5, calculés en agrégats seulement (jamais d'identifiant d'utilisateur dans la sortie), par une fonction `app.drift_report(p_from date, p_through date)` réservée au rôle de service et une section « Dérives » ajoutée à `npm run metrics:report`. Pas d'écran (le rapport suffit tant que les comptes sont peu nombreux).

| Signal | Mesure | Seuil d'alerte |
|---|---|---|
| XP en hausse, rétention en baisse | XP hebdomadaire et taux de rappels réussis sur 4 semaines | rétention − 5 points alors que l'XP monte |
| Séances de minuit | Part des jours validés dont la dernière ligne d'XP arrive dans les 30 min avant 04:00 avec XP < 30 | > 50 % des jours validés d'un compte |
| Série anxieuse | Comptes avec 7 jours validés de suite à < 25 XP | > 0 |
| Quêtes faciles | Taux de relance ; volet ciblé sans hausse de part en 14 jours | relance > 80 % |
| Ligue compulsive | Membres au plafond de 150 XP 7 jours sur 7 | > 0 |
| Immersion gonflée | Comptes à > 4 h déclarées 5 jours de suite | > 0 |
| Mécanique coupée | Désactivations par clé de `setting_change` | ≥ 30 % des comptes actifs |
| Notifications | Désactivation dans les 24 h d'un envoi | > 0 |
| Défis | Départ d'un défi suivi d'une baisse d'activité de moitié | > 0 |

Avec quelques dizaines de comptes, le rapport l'écrit en tête : « chiffres indicatifs ». Tests : Vitest du formatage, pgTAP de l'accès (refusé à `authenticated`) et d'un jeu de données qui déclenche chaque signal.
