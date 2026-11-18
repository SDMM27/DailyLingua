# Jalon 2, PR 1 : revue de sécurité indépendante, partie 1 (lot S, SQL)

Relecteur : `relecteur-securite`. Branche `refonte/jalon-2`, migrations `supabase/migrations/20261117000100` à `20261117000600` et leurs tests pgTAP (`supabase/tests/database/app_texts`, `app_session_steps`, `app_game_journals`, `app_game_settings`, `app_notifications_reports`, `app_ingest_batch`, `app_access`).

Méthode : **revue statique uniquement**. La base locale était utilisée par un autre agent : aucun `db reset`, aucun `supabase test db`, aucun `EXPLAIN`. Tout ce qui suit est tiré du code lu ; les points de performance ne sont pas mesurés.

Références : `docs/refonte/specs/j2-architecture.md` §1 à §3 et §7, `docs/refonte/specs/j2-pr1-lots.md` (lot S), `docs/refonte/specs/j2-jeu-xp-serie.md` §3 et §9, `docs/reviews/refonte/j1-pr1-securite.md`.

## Verdict global

**Pas de bloquant dans le SQL seul.** Les règles du jalon 1 sont tenues : `search_path = ''` partout, révocations explicites, RLS sur les 15 nouvelles tables, clés composites pour l'appartenance, privilèges par colonne sur `error_item.answer` et sur les clés push, aucune politique ni aucun droit client sur `text_item_key`. `ingest_batch` vérifie l'appartenance de chaque référence (séance, carte, correction, erreur, source d'XP). Les bornes d'XP demandées par la spec sont en place.

Les faiblesses portent sur trois points :
- le fuseau, qui a deux écrivains (`save_profile` et `ingest_batch`) : l'un d'eux contourne la règle des 48 h ;
- des horodatages et des états dérivés qu'aucune borne SQL ne limite (série, `learning_day`, `review_log`, `timezone_change`) ;
- l'absence de limite de débit sur `save_game_settings`, qui écrit dans un journal en ajout seul.

Le constat I1 devient **bloquant** si la partie 2 montre que `@dailylingua/core` ou le lot W retombent sur `profile.time_zone` pour attribuer les événements. Je le vérifierai sur le lot W.

## Verdicts sur les écarts annoncés

| # | Écart | Verdict |
|---|---|---|
| 1 | `cards_created` avant `reviews` | **Accepté.** L'ordre est nécessaire pour revoir dans le même lot une carte créée en séance. L'appartenance est vérifiée des deux côtés : un identifiant de carte d'un autre utilisateur donne 23503 (l.190-193), et la mise à jour FSRS filtre sur `user_id` (l.227-238). Réserve en M6 : une carte créée accepte n'importe quel `state`, `due_at`, `source` et `payload`. |
| 2 | `session.client_id` abandonné | **Accepté** côté SQL. L'idempotence de la création de séance repose sur `unique (user_id, language, day, kind)` (000200 l.99-101). C'est au lot W de s'en servir (`on conflict`) ; je le vérifierai en partie 2. |
| 3 | Lignes d'XP sans source dédupliquées sur `(user_id, day, language, reason, md5(meta))` | **Accepté pour l'idempotence, pas pour l'anti-triche.** Le texte de `jsonb` est canonique, donc `md5(meta::text)` est stable. En revanche, toute variation de `meta` (horodatage, compteur) produit une nouvelle ligne : seule la borne de 400/jour arrête alors un double crédit. Il faut exiger dans le cœur que `meta.ref` soit dérivé d'un objet serveur (identifiant de séance, de production, de correction) et jamais d'une valeur libre du client. Un test du cœur doit le prouver : rejouer un lot ne change pas la somme du jour. |
| 4 | Retour `{ seq, duplicates }` seulement | **Accepté.** `accepted` (spec §3.4) peut être reconstruit par W. Les ignorés silencieux (cartes, lectures, fuseaux, XP sans source) ne sont pas des événements client : c'est cohérent. |
| 5 | Bornes SQL : 1 Mio, 500 éléments, clé inconnue → 22023 ; `learning_days.day` > J+1 et XP hors 1..100 → 23514 | **Accepté**, avec deux réserves. (a) La borne SQL de 1 Mio n'agit qu'après que PostgREST a lu le corps : la borne efficace est celle du lot W, à vérifier en partie 2. (b) Une erreur de type dans un élément (date ou uuid mal formé, entier hors limites, `null` sur une colonne `not null`) lève 22P02, 22007, 22003 ou 23502, pas 22023 (voir M7). |
| 6 | Ligne `ingest_state` créée à la volée | **Accepté.** La création a lieu après le verrou consultatif et après la vérification du profil (l.94-101). Elle ne crée donc ni course ni ligne orpheline. |
| 7 | `profile.time_zone` suit le dernier `timezone_change` entré en vigueur ; ligne de base au premier changement | **Contesté.** Voir I1 et I2. `save_profile` (000800 l.44-62) écrit `profile.time_zone` librement, sans journal ni règle des 48 h. La ligne de base reprend ce fuseau, que l'utilisateur a pu choisir juste avant. `effective_at` n'a aucune borne. Un changement daté dans le futur n'est jamais reporté sur le profil tant qu'un autre lot ne contient pas de changement de fuseau (l.468-475). |
| 8 | `save_game_settings` : correctif imbriqué, liste fermée de 15 clés, effet le lundi suivant pour `streak.mode` et `streak.weeklyTarget`, heure dans `reminder_time` | **Accepté avec corrections.** La validation est fermée et `auth.uid()` est seul utilisé. En revanche, il n'y a aucune limite de débit (I4), et des clés pointées sont acceptées au premier niveau : `{"ring.tier": 10, "ring": {"tier": 20}}` donne deux lignes contradictoires dans le même instant (M5). |
| 9 | Push : trois hôtes plus `*.notify.windows.com` ; un endpoint ré-enregistré passe à l'utilisateur courant ; 10 abonnements au plus ; `notification_log` | **Accepté.** La correspondance d'hôte est stricte et testée : suffixe, informations d'utilisateur, antislash, port, majuscules, sosie de l'hôte Windows (`app_notifications_reports.test.sql` l.47-61). Le joker Windows ne couvre qu'un seul label, et l'IDN ne peut viser qu'un sous-domaine de Microsoft. Réserves en M2 (la contrainte de table est plus faible que la fonction) et en M3 (le transfert d'un endpoint contourne la limite de 10). |
| 10 | `report_content` : cible visible (23503 sinon), 20 par jour d'apprentissage | **Accepté.** Textes et items publiés seulement, erreurs et corrections du seul propriétaire, verrou de profil pour la limite. Réserve mineure en M4. |
| 11 | Lecture propriétaire sur 7 tables ; garde d'ajout seul sur `setting_change`, `timezone_change`, `ui_event` | **Accepté.** Aucune de ces tables n'expose de secret. `forbid_journal_change` laisse passer la cascade de suppression du compte (règle du jalon 1). |
| 12 | Motifs de zéro non stockés ; conflit d'un `clientEventId` d'un lot antérieur détecté seulement s'il est stocké (W ajoute `app.ingest_event`) | **Accepté pour S.** Les tentatives, révisions, productions, réécritures et événements d'interface gardent leur contenu : le conflit y est détecté. Les événements sans ligne propre (`reading_progress`, `fluency_pass`, `session_step_completed`) dépendent d'`app.ingest_event` : à vérifier en partie 2. |
| — | Non couvert : deux lots concurrents, `lock_timeout` ; 40001 testé seulement avec une séquence périmée | **Noté.** Le code est correct à la lecture : verrou consultatif pris avant la lecture de `seq`, et `lock_timeout` local à la transaction, qui s'applique aussi au verrou consultatif. L'absence de test reste un risque de régression (M8). |

## Constats

### Bloquant

Aucun dans le lot S seul. I1 est à requalifier après la lecture du lot W.

### Important

#### I1. `save_profile` change le fuseau sans journal ni règle des 48 h

- **Où** : `20261112000800_app_active_since.sql` l.44-62 (`time_zone = p_time_zone`) ; `20261117000600_app_ingest_batch.sql` l.94 et l.106 (le jour serveur vient de `profile.time_zone`) ; écart 7 (ligne de base = `profile.time_zone`).
- **Problème** : `j2-jeu-xp-serie.md` §3.1 et §9 impose « 1 changement / 48 h », et dit que le profil *suit* le fuseau accepté. Or `app.save_profile`, appelable par `authenticated` (le schéma `app` est exposé par PostgREST, `config.toml` l.13), écrit `profile.time_zone` à volonté.
- **Scénario** : l'apprenant de Paris n'a rien fait le jour J. Le lendemain à 06:00, il appelle `rpc('save_profile', { p_time_zone: 'America/Los_Angeles', … })` : il est alors 21:00 le jour J à Los Angeles. Trois effets possibles :
  - (a) si le cœur attribue avec `profile.time_zone` en l'absence de journal, ou si la ligne de base l'emploie, la séance faite maintenant compte pour J et la série est sauvée ;
  - (b) le jour serveur de `ingest_batch` (l.106) et celui de W reculent d'un jour ;
  - (c) il remet ensuite `Europe/Paris`. Rien n'est journalisé et la règle des 48 h n'est jamais consultée.

  La fenêtre XP [J−3, J+1] glisse elle aussi d'un jour, à volonté.
- **Correction** :
  - Une fois l'app active (`app_active_since` non nul), `save_profile` ne doit plus écrire `time_zone` directement. Deux options : passer par `timezone_change` avec la règle des 48 h vérifiée en SQL (dernier `effective_at` ≥ 48 h, sinon 23514), ou ignorer le paramètre et laisser le fuseau aux seuls champs `tz` des événements.
  - `ingest_batch` devrait calculer le jour serveur à partir du dernier `timezone_change` entré en vigueur, et non du profil.
  - La ligne de base de l'écart 7 doit prendre le fuseau du profil à la *création* de l'app, pas sa valeur courante.
- **Test** : en tant qu'`authenticated`, appeler `save_profile` avec un autre fuseau moins de 48 h après un changement accepté, puis vérifier que `profile.time_zone` est inchangé (ou que l'appel lève 23514). En partie 2, un test du cœur avec le scénario ci-dessus doit attribuer la séance au jour J+1.

#### I2. `timezone_changes` : `effective_at` sans borne, règle des 48 h absente du SQL, journal non corrigible

- **Où** : `20261117000600_app_ingest_batch.sql` l.449-475 ; `20261117000300_app_game_journals.sql` l.95-115.
- **Problème** : une ligne datée de 1970 ou de 2100 est acceptée. La table est en ajout seul, donc une ligne fausse est définitive. Elle réécrit l'attribution passée pour tout recalcul de série qui relit le journal. Rien en SQL n'impose 48 h entre deux changements, ni un nombre maximal de lignes (500 par lot, sans limite de lots).
- **Scénario** : une erreur du cœur, ou un champ `tz` mal borné côté W, insère `(effective_at = now() - 6 days, 'Pacific/Kiritimati')`. Le prochain `recomputeStreak` réattribue six jours d'activité, ce qui peut valider des jours manqués. La ligne est impossible à retirer sans désactiver le déclencheur.
- **Correction** : dans `ingest_batch`, refuser (23514) toute ligne qui remplit l'une de ces conditions :
  - `effective_at` hors de `[now() - 7 days, now() + 5 minutes]` ;
  - `effective_at` antérieur au dernier `effective_at` existant de l'utilisateur ;
  - écart de moins de 48 h avec le changement précédent (hors ligne de base).
- **Test** : `timezone_changes` avec `effective_at = now() - interval '30 days'` donne 23514. Deux changements à 1 h d'intervalle donnent 23514. Un changement daté de 2100 donne 23514.

#### I3. États dérivés et horodatages sans borne de sûreté en SQL

- **Où** :
  - `ingest_batch` l.405-424 (`learning_days` : aucune borne basse sur `day`, `xp_verified` jamais rapproché du grand livre) ;
  - l.427-446 (`streak` : seule `best >= current >= 0` tient) ;
  - l.239-242 (`review_log.reviewed_at` sans contrainte, alors que `attempt` a `attempt_occurred_bounds`) ;
  - l.124-128 (`completed_at`, `started_at` de séance) ;
  - l.302-304 (`reworked_day`), l.318-320 (`first_read_day`), l.510-511 (`ui_event.occurred_at`).
- **Problème** : la grille demande que le client ne puisse écrire ni série ni jour validé et que ses horodatages soient bornés. Aujourd'hui, la seule garantie est le cœur TypeScript. La spec (§1) dit que SQL tient « les invariants » ; seules les bornes d'XP sont posées. Une erreur du cœur ou du lot W (par exemple un `occurredAt` client recopié) produit des données de jeu durables :
  - un `learning_day` validé il y a deux ans ;
  - une série à 10 000 ;
  - un `review_log` daté de 2099.
- **Scénario** : W transmet un `reviewed_at` client non borné. Les badges du jalon 7, calculés depuis `review_log` (spec du jeu §2), comptent des révisions futures.
- **Correction** (défense en profondeur, sans dupliquer le barème) :
  - `learning_days.day >= v_today - 8` (refus `too_old` à 7 jours, plus une marge) ;
  - `xp_verified` égal à la somme réelle de `xp_ledger` du jour, ou au plus égal à elle, contrôlé en SQL ;
  - une contrainte `review_log` analogue à `attempt_occurred_bounds` (`reviewed_at` entre `created_at - 7 days` et `created_at + 5 minutes`, ajoutée en `not valid` pour les lignes reprises de l'ancienne app) ;
  - `streak.last_day <= v_today + 1`, et `current` qui ne croît pas de plus que le nombre de jours écoulés depuis l'ancien `last_day` ;
  - `completed_at`, `occurred_at`, `reworked_day` et `first_read_day` dans `[now() - 8 days, now() + 5 minutes]`.

  Les bornes exactes sont à confirmer avec les cas de réparation et de rattrapage du cœur.
- **Test** : un `learning_day` à J−30 donne 23514 ; un `xp_verified` supérieur à la somme du grand livre donne 23514 ; une révision avec `reviewed_at = now() + interval '1 day'` donne 23514 ; une série passant de 3 à 50 en un lot donne 23514.

#### I4. `save_game_settings` : aucune limite de débit sur un journal en ajout seul

- **Où** : `20261117000400_app_save_game_settings.sql` l.349-372 ; `20261117000300_app_game_journals.sql` l.64-83.
- **Problème** : chaque appel qui change une valeur ajoute jusqu'à 15 lignes à `setting_change`, et jusqu'à 30 avec les clés pointées (M5). La fonction est appelable directement par PostgREST, hors de toute limite de W. Les lignes ne peuvent jamais être supprimées (garde d'ajout seul). Le lot W relit **toutes** les lignes `setting_change` de l'utilisateur à chaque ingestion (`j2-pr1-lot-w.md` l.54).
- **Scénario** : une boucle qui bascule `xpVisible` true/false 50 fois par seconde produit plus de 4 millions de lignes par jour. Le stockage grossit sans retour possible, et chaque ingestion de ce compte lit tout l'historique en tenant le verrou de l'utilisateur. On obtient une charge sur la base partagée et des 55P03/40001 pour ce compte.
- **Correction** : compter les lignes `setting_change` du jour d'apprentissage courant (index `setting_change_user_idx` à compléter par `changed_at`) et refuser au-delà de 50 (23514). En complément, W ne devrait lire que les lignes dont `effective_day` est postérieur au plus ancien jour recalculé.
- **Test** : 60 appels qui changent `xpVisible` dans la même journée font échouer le 51e changement avec 23514.

#### I5. Recherche de ligne d'XP sourcée sans index utilisable (non mesuré)

- **Où** : `ingest_batch` l.370-372 (`attempt_id is not distinct from v_id_attempt and review_log_id is not distinct from v_id_review`).
- **Problème** : `IS NOT DISTINCT FROM` ne peut pas utiliser les index partiels `xp_ledger_attempt_reason_idx` et `xp_ledger_review_reason_idx`, qui exigent `attempt_id = …`. Le seul index restant est `xp_ledger_user_day_idx (user_id, day)`, réduit ici à son préfixe `user_id`. Chaque ligne d'XP sourcée parcourt donc tout l'historique d'XP de l'utilisateur, alors que l'appelant tient le verrou consultatif.
- **Scénario** : un utilisateur actif accumule environ 20 000 lignes d'XP en un an. Un lot de 500 lignes sourcées représente environ 10 millions de lignes visitées, soit plusieurs secondes sous verrou, ce qui provoque des 55P03 (`lock_timeout` de 5 s) pour ses autres appareils. Je ne l'ai pas mesuré, faute d'accès à la base.
- **Correction** : deux requêtes selon la source, `where x.attempt_id = v_id_attempt and x.reason = r.reason` ou `where x.review_log_id = v_id_review and x.reason = r.reason`.
- **Test** : `EXPLAIN` sur la requête après la correction montre un parcours de `xp_ledger_attempt_reason_idx`. Un test de charge avec 20 000 lignes d'XP et un lot de 500 lignes doit passer sous 1 s.

### Mineur

#### M1. `text_reads` accepte un texte non publié

`ingest_batch` l.311-321 vérifie seulement la clé étrangère vers `app.text`. Un texte `generated` ou `retired` peut être inscrit comme lu, et la réussite ou l'échec indique en creux qu'un uuid de texte non publié existe. Correction : `exists (… status = 'published')`, sinon 23503. Test : `text_reads` sur un texte `generated` donne 23503.

#### M2. La contrainte de table de `push_subscription.endpoint` est plus faible que la fonction

000500 l.13 ne demande que `like 'https://%'`. Un écrit `service_role` (reprise de données, script, lot W) peut donc ranger n'importe quelle URL, que la tâche cron appellera. Correction : `check (app.is_allowed_push_endpoint(endpoint))` (la fonction est `immutable`). L'envoi doit aussi revalider l'hôte et ne jamais suivre de redirection : à vérifier en partie 2. Test : un `insert` `service_role` avec `https://evil.example/x` donne 23514.

#### M3. Le transfert d'un endpoint contourne la limite de 10

000500 l.84-87 : si l'endpoint existe déjà chez un autre utilisateur, la limite n'est pas vérifiée. L'utilisateur peut donc dépasser 10 abonnements. Il peut aussi détourner l'abonnement d'un tiers s'il connaît son endpoint, une URL secrète en principe. Dans ce cas, la victime ne reçoit plus ses rappels, et le tiers ne peut toujours pas déchiffrer les messages, faute des clés de la victime. Risque faible. Correction : appliquer la limite après le transfert (en comptant l'endpoint transféré), et remettre `last_success_at` à `null` lors du transfert.

#### M4. `report_content` : signalements répétés de la même cible

Rien n'empêche 20 signalements identiques par jour. Cela pollue la file de modération. Correction : un index unique `(user_id, target_kind, target_id)`, ou un `on conflict do nothing` qui rend l'identifiant existant.

#### M5. `save_game_settings` accepte des clés pointées au premier niveau

000400 l.334-340 : `{"ring.tier": 10}` est accepté, et `{"ring.tier": 10, "ring": {"tier": 20}}` écrit deux lignes avec le même `changed_at` (`now()`) et le même `effective_day`. Si le cœur trie par `(effective_day, changed_at)` sans `id`, le rejeu du réglage n'est pas déterministe. Correction : refuser au premier niveau toute clé qui contient un point (22023). Test : `{"ring.tier": 10}` donne 22023.

#### M6. `cards_created` : état, échéance, source et charge libres

`ingest_batch` l.199-201 accepte `state = 'known'`, une échéance en 9999, `source = 'legacy'` et un `payload` sans limite de taille (seule la limite de 1 Mio du lot s'applique). La spec dit pourtant qu'aucun état FSRS ne vient du client. Correction : forcer `state = 'new'` et `source = 'session'` pour les cartes créées par l'ingestion, et borner `payload` (par exemple ≤ 8 000 octets). Test : `cards_created` avec `state = 'review'` donne 22023, ou la carte est enregistrée en `new`.

#### M7. Codes d'erreur hors du contrat

Un élément mal typé lève 22P02, 22007, 22008, 22003, 23502 ou 23514 (contraintes de table) au lieu de 22023. Si W classe un code inconnu comme échec passager, un lot empoisonné est rejoué sans fin. Correction : au choix, W traite toute la classe 22 et la classe 23 comme des refus définitifs, ou `ingest_batch` intercepte ces erreurs (`exception when data_exception then raise … '22023'`). À vérifier en partie 2.

#### M8. Tests absents

- **Appartenance** : rien ne teste une tentative ou une production sur la séance d'un autre utilisateur, une révision sur sa carte, une réécriture sur sa correction, ni une source d'XP qui désigne sa tentative ou sa révision. À la lecture, les clés composites et les filtres `user_id` couvrent ces cas, mais aucun test ne l'établit.
- **Concurrence** : deux lots simultanés, `lock_timeout` atteint (55P03), qui demandent deux connexions (par exemple avec `dblink`).
- **Fuseaux** : `timezone_change` hors bornes (après I2).

#### M9. Les réglages et le profil ne font pas avancer `ingest_state.seq`

`save_game_settings`, `save_profile` et `save_enrollments` modifient ce que W lit à l'étape 3 (réglages, fuseau, format) sans incrémenter `seq`. Un lot peut donc être planifié sur un instantané périmé sans recevoir de 40001. L'effet reste limité, puisque les réglages s'appliquent le lendemain, sauf pour le fuseau (I1). Correction : incrémenter `ingest_state.seq` dans ces fonctions, ou prendre le même verrou consultatif.

#### M10. Coût de `validate_time_zone` (non mesuré)

Le déclencheur interroge `pg_catalog.pg_timezone_names` à chaque ligne. Cette vue lit les fichiers de fuseaux à chaque appel. Avec 500 `learning_days` et 500 `timezone_changes`, on peut atteindre environ 1 000 parcours sous verrou. Correction : borner ces tableaux à quelques dizaines d'éléments (I2, I3), ou mettre les noms valides en cache dans une table de référence.

#### M11. `app.text.checks` et `app.text.model` sont lisibles par les clients

À vérifier : si `checks` contient des réponses attendues ou des extraits de `text_item_key` (par exemple le résultat d'un contrôle « la clé est dans le texte »), il faut retirer la colonne de la lecture client avec un droit par colonne. Je n'ai pas pu le vérifier, faute d'avoir lu le générateur.

## Ce qui a été vérifié et tient

- **Fonctions** : toutes les nouvelles fonctions ont `search_path = ''`. Les quatre nouvelles fonctions client (`save_game_settings`, les deux fonctions push, `report_content`) agissent sur `auth.uid()` seulement et révoquent `public` et `anon`. `ingest_batch`, `learning_day_at`, `is_valid_game_setting` et `is_allowed_push_endpoint` sont révoquées pour `public`, `anon` et `authenticated`. Le test générique `app_access` (l.61-66) fixe la liste des six fonctions appelables par un client.
- **Secrets en base** : `text_item_key` n'a ni droit ni politique, et un test le vérifie colonne par colonne. `error_item.answer`, `push_subscription.p256dh` et `push_subscription.auth` sont exclus par privilèges de colonne, et chaque exclusion a son test.
- **RLS** : lecture par le propriétaire uniquement sur toutes les tables utilisateur. La politique de `text_item` résout bien `text_id` sur la ligne extérieure. `ingest_state` n'a ni politique ni droit.
- **Appartenance dans `ingest_batch`** : séances et étapes (filtre `user_id`, clé composite), tentatives (clé composite séance–utilisateur–langue), cartes (refus de l'identifiant d'un autre utilisateur, mise à jour filtrée), révisions (clé composite carte–utilisateur), productions (clé composite séance), réécritures (clé composite correction), erreurs du jour (filtre), sources d'XP (résolution par `client_event_id` du même utilisateur, puis clé composite).
- **Bornes d'XP** : somme du jour ≤ 400 calculée après insertion, pour chaque jour touché ; jour dans [J−3, J+1] ; montant entre 1 et 100. Le verrou consultatif empêche deux lots de sommer sur le même instantané.
- **Suppression de compte** : toutes les nouvelles tables sont en `on delete cascade` vers `auth.users`, et la garde d'ajout seul laisse passer la cascade.
- **Migrations** : ajout de colonnes avec valeur par défaut constante, donc rapide. Aucune ligne d'XP n'est reprise de l'ancienne app, si bien que `xp_ledger_sourceless_idx` ne peut pas échouer sur les données reprises ; je n'ai pas pu vérifier la base de production elle-même. `handle_new_user` conserve le profil et l'état de série. Aucune suppression de données.

## Non vérifié

- Exécution des tests pgTAP et plans d'exécution (base partagée occupée).
- Contenu de `app.text.checks` (M11).
- Comportement du cœur pour le fuseau par défaut et la ligne de base (I1) : prévu en partie 2.
- Taille maximale du corps de requête acceptée par PostgREST et par la passerelle Supabase.

---

# Partie 2 : lot W (couche de données, routes, migration `20261118000100`)

Branche `refonte/j2-web` (worktree `refonte-j2-web`), diff `refonte/jalon-2...refonte/j2-web` (68 fichiers). Spec : `docs/refonte/specs/j2-pr1-lot-w.md` (D1 à D9).

Même méthode que la partie 1 : **revue statique uniquement**, sans base ni exécution des tests.

Fichiers lus en entier :
- `supabase/migrations/20261118000100_app_ingest_ledger.sql` ; j'ai comparé le corps d'`ingest_batch` avec celui de 000600, et seuls `events`, `memo` et la purge à 14 jours diffèrent ;
- `apps/web/src/app/api/events/route.ts`, `lib/ingest/{events-route,ingest-events,card-keys,refs,next-memo}.ts`, `lib/supabase/service.ts`, `proxy.ts`, `lib/auth/public-paths.ts` ;
- `lib/session-packet/today-route.ts`, `app/api/session/today/route.ts`, `lib/offline/{http-sender,names,session-packet-store}.ts` ;
- `components/{settings/sign-out-form,pwa/event-sync-provider,today/session-prefetch}.tsx`, `src/sw/sw.ts` ;
- `packages/data/src/{ingest-write,session-today}.ts`.

Fichiers lus en partie : `packages/data/src/ingest-rows.ts` (filtres utilisateur) et `packages/core/src/ingest/plan-ingest.ts` (attribution, fuseau, XP sans source, productions).

## Ce qui tient

- **Migration** :
  - `ingest_event` et `event_rate` ont la RLS activée, sans politique ni droit client, ce que vérifie `app_access` (37 tables, liste des tables non lisibles mise à jour) ;
  - `claim_event_rate` est `security definer`, avec `search_path = ''`, n'est exécutable que par `service_role`, borne ses paramètres et sérialise par `for update` ;
  - `ingest_batch` est identique à 000600, avec en plus `events` (empreinte, 23505 si elle diffère), `memo` (≤ 256 Kio, vérifié en SQL et par la contrainte de table) et la purge du registre au-delà de 14 jours.
- **Clé de service** : `service.ts` importe `server-only`, lit la clé par un schéma à part, sans préfixe `NEXT_PUBLIC_`, et ne la sert qu'aux deux routes. Aucun composant client ne l'importe. `.env.example` ne contient aucune valeur.
- **`POST /api/events`**, dans cet ordre :
  - `Origin` vérifié, puis `Content-Type: application/json` ;
  - utilisateur validé par `auth.getUser()`, et non par la seule lecture du jeton ;
  - corps lu en flux et coupé à 64 Kio, au plus 50 événements ;
  - quota horaire réservé en SQL ;
  - ingestion, puis rapport validé par Zod ;
  - aucun message SQL dans les réponses, et `no-store` sur chaque réponse.

  `p_user_id` vient toujours de la session, jamais du corps (`ingest-events.ts`), et la charge est revalidée par `ingestBatchPayloadSchema` et bornée à 1 Mio avant l'appel.
- **`GET /api/session/today`** : la langue est validée par un schéma, puis comparée aux inscriptions actives (404 sinon). La séance est écrite une seule fois par `upsert … onConflict: user_id,language,day,kind, ignoreDuplicates`, puis relue : celui qui perd la course reçoit la ligne du gagnant. L'identifiant de séance est choisi par le serveur. La réponse est `private, no-store`, et le service worker ne met aucune réponse d'API en cache (`sw.ts`, seulement `NetworkOnly` sur les navigations).
- **Lectures avec le client de service** : chaque table de l'utilisateur est filtrée sur `user_id`. Deux exceptions sont voulues : les séances et les cartes lues par identifiant, pour que `planIngest` puisse répondre `foreign_session` ou `unknown_card`. `planIngest` contrôle ensuite `userId`.
- **Clés de réponse dans le paquet** : seulement les items du plan (`build-packet.ts`, `packetItems`), conformément à A1. La base IndexedDB des paquets est propre à chaque utilisateur et effacée à la déconnexion.

## Points de la partie 1 à fermer

| Point | Résultat |
|---|---|
| **I1** (le fuseau du profil sert-il à l'attribution ?) | **Oui : I1 passe en BLOQUANT.** Voir B1 ci-dessous. |
| Création de séance sur l'unicité `(user, language, day, kind)` | **Réglé** (`session-today.ts` l.178-199). |
| Limite de taille du corps | **Réglée** : flux coupé à 64 Kio (`readBodyLimited`), `Content-Length` ignoré, charge SQL ≤ 1 Mio vérifiée en TypeScript. |
| Classement des SQLSTATE (`ingest-write.ts`) | **Partiel** : seuls 22023, 23503, 23505 et 23514 sont définitifs ; tout le reste est passager. Voir W-I2. |
| Détection des conflits par `ingest_event` | **Réglée** : empreinte `stableStringify` → md5, 23505 si elle diffère, puis mode isolement et `server_refused`. Après la purge à 14 jours, un rejeu tombe sur `too_old` (7 jours) : aucun double crédit. |
| Dérivation de `meta.ref` | **Réglée** : `session.id:text.id`, `correction.id:index`, `production.id` (clé primaire unique), `session.id`. Toutes ces valeurs sont des objets serveur ou des identifiants uniques. Les compteurs du mémo restent le vrai garde-fou des plafonds (voir W-M3). |
| Horodatages client bornés avant la charge | **Réglé dans le cœur** : `attribute()` refuse au-delà de +5 min ou de 7 jours et avant `servedAt` ; `effective_at` d'un changement de fuseau = `occurredAt` de l'événement, donc borné. I2 et I3 restent valables comme **défense en profondeur** (Important, non bloquant). |
| Faiblesse résiduelle de D5 | Voir W-M1. |

## Verdicts sur les écarts de l'implémenteur

| # | Écart | Verdict |
|---|---|---|
| 1 | Niveau d'écriture = estimation d'écriture, sinon moyenne des autres compétences | **Accepté.** Sans effet de sécurité ; la bande reste bornée à A2..C1 et n'est jamais une chaîne libre. |
| 2 | Items autres que QCM : `key.answer` accepté aussi | **Accepté.** La clé fait foi ; l'accepter élargit seulement les bonnes réponses légitimes. |
| 3 | Base des paquets supprimée par `SignOutForm` (client) avant l'action `signOut` | **Accepté avec réserve.** C'est bien la seule manière d'atteindre IndexedDB. Mais la **file d'événements** de l'utilisateur reste sur l'appareil après la déconnexion (W-M4) : sur un téléphone partagé, les textes de production et les réponses restent lisibles. |
| 4 | `/api/*` échappe à la redirection vers la connexion | **Accepté.** Les deux seules routes d'API (`events`, `session/today`) authentifient elles-mêmes par `getUser()` et répondent 401. Toute nouvelle route sous `/api` devra en faire autant (cron au PR 3 : `CRON_SECRET`). Un test qui parcourt `app/api/**/route.ts` et vérifie la présence d'une authentification serait un bon garde-fou. |
| 7 | `Origin` accepté s'il égale l'origine de l'URL, ou si son hôte égale `x-forwarded-host` ou `Host` | **Accepté.** Une page tierce ne peut ni falsifier `Origin` ni ajouter `x-forwarded-host` : un en-tête personnalisé déclenche un contrôle préalable CORS, auquel le serveur ne répond pas. Le `Content-Type: application/json` exigé force lui aussi ce contrôle. |
| 8 | Lignes `ingest_event` rejouées absentes de `duplicates` | **Accepté.** Le client tient l'événement pour livré dans les deux cas. |
| 9 | Lot sans rien à écrire : pas d'appel à `ingest_batch` | **Accepté.** `seq` n'avance pas et il n'y a rien à protéger. |
| 10 | Taille du mémo mesurée comme `octet_length(memo::text)`, fusion avec le mémo précédent, > 256 Kio → 503, jamais tronqué | **Contesté** : le refus de tronquer est juste, mais la croissance n'est pas bornée. Voir W-I1. |
| 11 | Fenêtre de jours calculée avec le fuseau du profil ; carte supprimée → `unknown_card` | **Carte supprimée : acceptée. Fenêtre : contestée** (B1). |
| 12 | `lastSessionDay` = dernière séance commencée ou terminée | **Accepté.** |
| 13 | Un nouveau GET du paquet retire les distracteurs du vivier courant | **Accepté.** La clé d'un QCM est l'identifiant de la carte : changer les distracteurs ne révèle rien que le paquet ne donne déjà. |
| 14 | L'expéditeur HTTP traite tout code autre que 200 (400, 413, 415 compris) comme un échec passager, d'où un risque de blocage en tête de file | **Contesté.** Voir W-I2 : le blocage est permanent et atteignable par un usage légitime. |
| 16 | Quota compté sur le lot entier avant l'ingestion | **Accepté avec réserve** (W-M5) : les nouvelles tentatives après un 503 consomment le quota. |

## Constats

### Bloquant

#### B1 (I1 de la partie 1, confirmé). Le fuseau du profil, libre via `save_profile`, sert à l'attribution et au jour serveur : la règle « 1 changement / 48 h » se contourne

- **Où** :
  - `supabase/migrations/20261112000800_app_active_since.sql` l.44-62 : `save_profile` écrit `time_zone` à volonté ; la fonction est appelable par `authenticated` via PostgREST, puisque `app` est exposé ;
  - `packages/core/src/ingest/plan-ingest.ts` l.117 (`serverDay`), l.223 et l.231 (`timeZoneAt(journal, …, this.s.profile.timeZone)`) ;
  - `packages/core/src/game/attribution.ts` l.74-75 : journal vide → fuseau du profil ;
  - `plan-ingest.ts` l.226 : la ligne de base du journal reprend le fuseau du profil ;
  - `apps/web/src/lib/session-packet/today-route.ts` l.99 : le jour de la séance servie ;
  - `ingest-events.ts` l.101 et `ingest_batch` : le jour serveur et la fenêtre XP.
- **Scénario** : un apprenant à Paris n'a rien fait le jour J. Le lendemain (J+1) vers 06:00, heure de Paris :
  1. il appelle `rpc('save_profile', {…, p_time_zone: 'Pacific/Honolulu'})`. Il est 18:00 le jour J à Honolulu ;
  2. il ouvre Aujourd'hui. `GET /api/session/today` crée la séance `daily` du **jour J**, avec `served_at = now` ;
  3. il fait la séance. Ses événements portent `tz = 'Pacific/Honolulu'`, égal au fuseau « en vigueur ». `acceptsTimeZoneChange` rend donc `false` : **rien n'est journalisé**, la règle des 48 h n'est jamais consultée, et `attribute()` place tout au jour J. Le plancher monotone ne s'y oppose pas, puisque le dernier jour de l'appareil est J−1. Le jour J est validé et la série sauvée ;
  4. il remet `Europe/Paris` et recommence le lendemain.

  Tant que les événements suivent le fuseau du profil, le journal reste vide indéfiniment. C'est exactement la triche « Changer de fuseau pour gagner un jour » que `j2-jeu-xp-serie.md` §9 déclare parée.
- **Correction** (les deux parties sont nécessaires) :
  1. **SQL** : dès que `app_active_since` n'est plus nul, `save_profile` ne doit plus écrire `time_zone`. Deux options : ignorer le paramètre, ou passer par `timezone_change` en vérifiant les 48 h en SQL (23514). À l'activation (premier `save_profile` ou première ingestion), écrire une ligne de base `timezone_change(effective_at = profile.created_at, time_zone)`, afin que le journal ne soit **jamais vide**.
  2. **Cœur** : `timeZoneAt` ne retombe plus sur `profile.timeZone` quand le journal est vide (il échoue ou prend la ligne de base) ; `serverDay` (core, W, `today-route`, `ingest_batch`) est calculé à partir du journal, pas du profil.
- **Tests** :
  - pgTAP : après activation, `save_profile` avec un autre fuseau laisse `profile.time_zone` inchangé (ou lève 23514), et la ligne de base existe ;
  - cœur : le scénario ci-dessus, avec `profile.timeZone` modifié entre deux lots, attribue la séance à J+1 et ne journalise aucun changement avant 48 h ;
  - route : `GET /api/session/today` après le changement de profil ne crée pas de séance pour J.

### Important

#### W-I1. Le mémo grossit sans borne (productions jamais réglées), et le dépassement bloque l'ingestion pour toujours

- **Où** :
  - `apps/web/src/lib/ingest/next-memo.ts` l.201-207 : une production n'est retirée du mémo qu'une fois `settled` ;
  - `plan-ingest.ts` l.700-735 : `settled` n'est posé qu'en présence d'une correction, or `state.corrections = {}` au PR 1 (D7). Même au PR 3, une production dont l'apprenant ne demande jamais la correction ne sera jamais réglée ;
  - `plan-ingest.ts` l.612-618 : la **création** des productions n'a aucun plafond. Seule l'XP est plafonnée à 2 par jour.
- **Scénario** :
  - *Abus.* Un compte, invité compris (création gratuite), envoie 600 `production_submitted` par heure, soit le quota horaire, chacun de 4 000 caractères, sur une de ses séances. Chaque production ajoute environ 130 octets au mémo : 256 Kio sont dépassés après environ 2 000 productions, soit 3 à 4 heures. `buildNextMemo` lève alors `MemoTooLargeError`, traduite en 503. Tous les lots suivants de ce compte échouent, sans retour possible sans intervention manuelle. En parallèle, `app.production` grossit de 2,4 Mo par heure et par compte (57 Mo par jour), et les comptes invités se multiplient sans frais.
  - *Usage légitime.* Avec 2 productions par jour jamais corrigées, le même mur est atteint en 2 à 3 ans.
- **Correction** :
  1. Plafonner la **création** dans le cœur, par exemple 5 productions par jour d'apprentissage (refus `cap_reached` ou `invalid_payload`), et une production par séance et par étape.
  2. Dans `buildNextMemo`, retirer aussi les productions non réglées plus anciennes que `MEMO_SETTLED_PRODUCTION_DAYS` (après la fenêtre de correction, la production ne peut plus rien rapporter).
  3. Dépasser 256 Kio doit rester une erreur, mais elle doit être journalisée en alerte, pas rendue en 503 indéfiniment.
- **Tests** : `next-memo` avec 3 000 productions non réglées anciennes donne un mémo sous 256 Kio ; `planIngest` avec 10 `production_submitted` le même jour n'en accepte que 5.

#### W-I2. Des échecs définitifs passent pour des échecs passagers : la file d'événements se bloque pour toujours

- **Où** :
  - `apps/web/src/lib/offline/http-sender.ts` l.29 : tout code autre que 200 est rejeté comme passager, et la file réessaie le même lot (écart 14) ;
  - `packages/core/src/offline/flush.ts` l.12 : lots de 20 événements ;
  - `packages/data/src/ingest-write.ts` l.25-31 : seuls 22023, 23503, 23505 et 23514 sont définitifs ; 22P02, 22007, 22003, 23502, 42501 (garde d'ajout seul), P0001… deviennent `unavailable`, donc 503 ;
  - `ingest-events.ts` l.207-212 : une `MemoTooLargeError` ou une autre erreur levée pendant l'isolement donne aussi 503.
- **Scénario** : un apprenant en japonais reste hors ligne trois jours. Sa file contient 5 `production_submitted` de 4 000 caractères (12 Ko chacun en UTF-8) et des `reading_progress` avec leurs positions. Le premier lot de 20 dépasse 64 Kio : la route répond 413, l'expéditeur réessaie le même lot indéfiniment, et **aucun événement suivant ne part plus jamais**. Séries, XP et révisions sont perdus. C'est la tête de file que D9 voulait justement éviter. Il en va de même pour un SQLSTATE hors de la liste, ou pour W-I1.
- **Correction** :
  1. Expéditeur : sur un 413, couper le lot en deux et réessayer ; un événement seul qui reçoit 413 ou 400 va dans la réserve des rejets, avec la raison `invalid_payload`. Un 415 ou un 403 répétés relèvent d'une erreur de configuration : les journaliser.
  2. Côté serveur, classer **toute la classe 22 et toute la classe 23**, plus 42501, comme `refused` (ce qui déclenche l'isolement), et ne garder `unavailable` que pour les classes 08, 40, 53, 55, 57 et les erreurs réseau.
  3. Pendant l'isolement, un événement qui lève une erreur non SQL (par exemple `MemoTooLargeError`) doit être refusé `server_refused`, pas faire échouer tout le lot en 503.
- **Tests** : `http-sender` avec un faux `fetch` qui répond 413 sur un lot de 20 puis 200 sur des lots de 10 : tout est livré. `ingestErrorCode('22P02') === 'refused'`. `ingestEvents` avec un magasin qui lève 23502 sur un seul événement : les autres passent.

### Mineur

**W-M1. Faiblesse résiduelle de D5 : une carte jamais servie peut être révisée à volonté.**
- **Où** : `card-keys.ts` l.77-80 ; `filterReviewModes`.
- **Problème** : la carte n'est dans aucun paquet, donc son mode est déduit de sa stabilité. Le client lit lui-même ses cartes (RLS propriétaire sur `app.card`, recto et verso compris) : il peut répondre juste en mode `production` sur n'importe quelle carte, à tout moment, échue ou non. Le gain est borné par les plafonds de révision (`DAILY_CAPS.review`) et le risque reste celui d'A1.
- **Correction** : ne rapporter de l'XP qu'aux révisions de cartes servies dans un paquet des 2 derniers jours (`servedAt` non nul) ou échues à `answeredAt`. Les autres sont acceptées pour FSRS, avec 0 XP et le motif `not_served`.
- **Test** : `planIngest` avec une `review_attempt` sur une carte non servie et non échue donne 0 XP.

**W-M2. Oracle d'existence.** Séances et cartes sont lues sans filtre utilisateur (`ingest-rows.ts` l.283 et l.401). La réponse distingue `foreign_session` de `unknown_session`, et révèle donc qu'un uuid de séance appartient à un autre compte. Les clés de réponse des items d'une séance étrangère sont chargées en mémoire, mais jamais renvoyées. Risque négligeable (uuid aléatoires) ; il suffirait de rendre `unknown_session` dans les deux cas.

**W-M3. Mémo illisible ignoré sans bloquer.**
- **Où** : `ingest-events.ts` l.84-90.
- **Problème** : si le mémo ne passe pas le schéma, l'ingestion repart d'un mémo vide. Les compteurs du jour (`counted`, `rewards`, `readingTexts`) sont alors remis à zéro, et certains plafonds du jour se rouvrent. Le mémo est écrit par le serveur après validation par schéma, donc le risque est faible.
- **Correction** : en cas de mémo illisible, reconstruire de façon prudente (considérer les plafonds du jour atteints) et lever une alerte.

**W-M4. File d'événements conservée après la déconnexion** (écart 3, `sign-out-form.tsx`). La base `dailylingua-events-<userId>` garde en clair, sur l'appareil, les productions et les réponses du compte déconnecté. Sur un appareil partagé, ce sont des données personnelles lisibles par l'utilisateur suivant (outils de développement). Correction : à la déconnexion, si la file n'est pas vide, prévenir (« X activités non synchronisées seront perdues ») et proposer de la vider, ou la vider après une tentative de livraison.

**W-M5. Quota consommé par les nouvelles tentatives** (écart 16). Pendant une panne de base, chaque nouvelle tentative du même lot consomme jusqu'à 50 du quota de 600 par heure. Le quota peut s'épuiser sans qu'aucun événement ne soit ingéré, et le client reçoit ensuite 429. Effet limité au compte lui-même. Correction : rendre le quota (ou ne pas le décompter) quand l'ingestion échoue en passager.

**W-M6. Amplification par le mode isolement.** Un lot refusé en SQL déclenche jusqu'à 50 × (lecture complète de l'état + appel `ingest_batch`). Le quota horaire borne l'effet à environ 600 appels par heure et par compte. Correction : borner l'isolement à 20 événements (taille réelle des lots) et journaliser les comptes qui le déclenchent souvent.

**W-M7. `GET` à effet de bord.** `GET /api/session/today` crée la séance. Une navigation de premier niveau provoquée par un site tiers (cookies `SameSite=Lax` envoyés) peut créer la séance du jour. Effet nul, puisque la séance aurait été créée à l'ouverture de l'app, mais cela fixe `served_at` plus tôt. Acceptable ; à documenter.

## Verdict final S + W

**Pas prêt à livrer en l'état : 1 bloquant.**

| Gravité | S | W | Total |
|---|---|---|---|
| Bloquant | 0 | 1 (B1, ex-I1) | **1** |
| Important | 4 (I2 à I5) | 2 (W-I1, W-I2) | **6** |
| Mineur | 11 (M1 à M11) | 7 (W-M1 à W-M7) | **18** |

Bloquant à corriger avant la fusion :
- **B1** : contournement de la règle des 48 h par `save_profile` et le repli sur `profile.timeZone` (SQL `save_profile` plus cœur `timeZoneAt` et `serverDay`).

Importants recommandés avant la mise en production du PR 1 :
- **W-I1** : création des productions plafonnée, mémo élagué ;
- **W-I2** : découpage des lots sur 413 et classement complet des SQLSTATE. Ces deux points touchent la disponibilité de l'ingestion pour des apprenants honnêtes.

Peuvent suivre dans un lot de durcissement : I2 à I5 (bornes SQL de défense en profondeur, limite de débit des réglages, index de la recherche XP).

Non vérifié : exécution des tests pgTAP et Vitest, plans d'exécution, tests de bout en bout du blocage en tête de file.

---

# Vérification des correctifs (branche `refonte/j2-secfix`)

Vérification ciblée des seuls points corrigés : `git diff refonte/jalon-2...refonte/j2-secfix`, commits c96cc72, 81709a8 et b6534ad. Ce n'est pas une nouvelle revue complète.

Lecture statique uniquement : je n'ai lancé ni les tests ni la base. Décisions de référence : `j2-pr1-lot-w.md` §11.

| Point | Verdict | Détail |
|---|---|---|
| **B1** (`save_profile`) | **Corrigé** côté `save_profile`, mais **une régression bloquante apparaît avec I2** (voir R1) | `20261118000200` l.16-68 : dès que `ingest_state.seq > 0`, le fuseau reçu est validé puis ignoré. Les grants sont inchangés. |
| **I2** (bornes de `effective_at`) | **Corrigé**, avec régression R1 | `ingest_batch` l.639-642 : un `effective_at` hors de [now − 8 j, now + 5 min] donne 23514. Testé (−9 j, +10 min, −7 j). |
| **I4** (débit de `save_game_settings`) | **Corrigé** | Plus de 50 lignes `setting_change` sur 24 h donnent 23514. Le contrôle a lieu avant l'écriture, donc un appel peut encore ajouter 15 à 30 lignes, soit environ 80 au maximum : acceptable. |
| **I5** (recherche XP indexable) | **Corrigé** | l.549-553 : une branche par type de source, avec `attempt_id = …` ou `review_log_id = …`. Les index partiels uniques sont donc utilisables (plan d'exécution non vérifié). |
| **W-I1** (mémo, plafond des productions) | **Partiel** | Mémo : **corrigé**. Les productions des 4 derniers jours sont gardées, 30 au plus : le mémo est borné quel que soit le comportement du client. Plafond de 10 par jour : **contournable**, voir R2. |
| **W-I2** (tête de file, SQLSTATE) | **Corrigé** | Expéditeur : un 413 coupe le lot en deux, récursivement ; un 413 sur un seul événement, un 400 ou un 415 donnent `invalid_payload` ; 401, 403, 429 et 5xx restent passagers. Serveur : toute la classe 22, toute la classe 23 et 42501 sont `refused`, donc isolés. Reste mineur : pendant l'isolement, une erreur non SQL fait encore échouer tout le lot en 503. Le mémo étant désormais borné, la cause principale (`MemoTooLargeError`) a disparu. |
| Écart : test pgTAP où le changement futur passe de +1 jour à +2 min | **Accepté** | C'est la conséquence directe de la borne de +5 min. |
| Écart : la borne de 4 jours remplace la règle des 10 jours pour les productions réglées | **Accepté pour le PR 1**, à revoir au PR 3 | Au PR 3, une correction demandée plus de 4 jours après la production retrouvera une production absente du mémo : `planIngest` devra la relire depuis `app.production`, ou refuser explicitement. |

## R1 (BLOQUANT, nouveau). La ligne de base du journal est datée de la création du profil, que la borne I2 refuse

- **Où** :
  - `packages/core/src/ingest/plan-ingest.ts` l.226 : au premier changement accepté, le cœur ajoute au journal `{ effectiveAt: profile.createdAt, timeZone: zoneInForce }` ;
  - l.134 : cette ligne part dans `payload.timezone_changes` ;
  - `20261118000200` l.639-642 : `effective_at < now() - 8 days` donne 23514.
- **Effet** : pour tout compte créé il y a plus de 8 jours, ce qui inclut tous les comptes repris de l'ancienne app (`created_at` hérité), **le premier changement de fuseau fait refuser le lot**. Avec le nouveau classement (W-I2), le lot passe en isolement. L'événement qui porte le nouveau `tz` est refusé `server_refused`, et chaque événement suivant émis dans ce fuseau déclenche le même changement, puis le même refus.
- **Scénario** : un apprenant parisien inscrit depuis un mois part à Tokyo. **Tous** ses événements faits sur place sont refusés pour toujours, et perdus : révisions, séances, série. Ce n'est pas une faille, mais c'est une perte de données silencieuse pour des apprenants honnêtes, introduite par le correctif.
- **Pourquoi les tests ne l'ont pas vu** : `app_ingest_hardening.test.sql` envoie des `timezone_changes` à la main (−1 h, −7 j) ; aucun test ne fait passer un changement produit par `planIngest` à travers le SQL pour un compte de plus de 8 jours.
- **Correction** (une des deux) :
  - en SQL, accepter hors borne la seule ligne de base, c'est-à-dire `effective_at = profile.created_at` quand l'utilisateur n'a encore aucun `timezone_change` ;
  - ou, mieux, écrire la ligne de base dès l'activation : `save_profile` quand `seq = 0`, ou première ingestion, avec `effective_at = created_at`, en SQL et hors de la borne. Le cœur n'aurait alors plus à l'émettre, et le journal ne serait jamais vide.
- **Tests** :
  - pgTAP : un utilisateur dont le profil a 30 jours, un `ingest_batch` avec `[{effective_at: created_at, tz: A}, {effective_at: now() - 1 h, tz: B}]` est accepté ;
  - intégration (`loop.integration.test.ts`) : un compte de 30 jours envoie un événement avec un autre `tz`, l'événement est accepté et le journal compte 2 lignes.

## R2 (Important). Le plafond de 10 productions par jour se contourne en antidatant de 5 à 7 jours

- **Où** : `apps/web/src/lib/ingest/ingest-events.ts`, `capProductions`.
- **Problème** : le compte par jour vient de `state.productions`, c'est-à-dire du mémo. Or le mémo ne garde que les productions des 4 derniers jours. Un `production_submitted` daté de J−5 à J−7, encore accepté puisque le refus `too_old` est à 7 jours, trouve donc toujours un compteur à 0 pour ce jour-là.
- **Scénario** : chaque lot passe 10 productions pour J−5, 10 pour J−6 et 10 pour J−7. Avec le quota de 600 événements par heure, le compte stocke de nouveau environ 600 textes de 4 000 caractères par heure dans `app.production`. Les comptes invités ne coûtent rien. Le mémo, lui, reste borné, donc ce n'est plus une panne : il reste une dépense de stockage.
- **Correction** : compter en base, avec `select count(*) from app.production where user_id = $1 and created_at > now() - interval '24 hours'` (index `production_user_idx`), ou compter par jour de **réception** plutôt que par jour d'`occurredAt`. On peut aussi refuser `production_submitted` au-delà de 72 h.
- **Test** : 3 lots de 10 `production_submitted` datés de J−5, J−6 et J−7 : au plus 10 sont acceptés sur 24 h.

## Réponse à la question : reste-t-il un autre moyen que le journal de changer le fuseau d'attribution ?

**Non, après la première ingestion.** Un seul résidu mineur demeure avant elle.

- **`save_profile`** : neutralisé dès que `seq > 0`.
- **`migrate_user` (resynchronisation)** :
  - `20261112000900` l.214-226 : le profil n'est réécrit que si `app_active_since is null` ;
  - `ingest_batch` appelle `mark_active`, de même que toutes les fonctions client, donc après une ingestion la resynchronisation ne touche plus le fuseau ;
  - `migrate_user` n'est appelable que par `service_role`, depuis `scripts/migration-verify.mts`, jamais depuis l'app.
- **`GET /api/session/today`** : calcule son jour avec `profile.time_zone`. Une fois `seq > 0`, celui-ci n'est plus modifié que par `ingest_batch` depuis le journal, lui-même soumis à la règle des 48 h du cœur et désormais borné en SQL. C'est cohérent.
- **`ingest_batch`** : le jour serveur et la fenêtre XP viennent du profil, avec la même conclusion.
- **Résidu (Mineur)** : tant que `seq = 0`, `save_profile` change encore le fuseau, et la première ingestion l'utilise par repli (journal vide). Un utilisateur repris de l'ancienne app, avec un historique, peut donc choisir **une seule fois** un fuseau avant sa première ingestion. Le gain est d'un jour au plus, et une seule fois, puisque le fuseau est ensuite verrouillé et que tout changement passe par le journal. La correction recommandée pour R1 (ligne de base écrite à l'activation) le ferme aussi.
- **Point d'attention** : `seq` n'avance que si un lot écrit quelque chose (écart 9). Un lot entièrement refusé laisse `seq = 0`, et donc `save_profile` encore libre, mais sans gain possible : rien n'a été attribué.

## Verdict

**NOT READY.**

- Bloquant : **R1**. La borne I2 refuse la ligne de base du journal émise par le cœur : tous les changements de fuseau des comptes de plus de 8 jours sont perdus.
- Important : **R2** (plafond des productions contournable par antidatage), à corriger dans ce PR ou juste après. Il ne bloque pas seul.
- Corrigés : B1 (côté `save_profile`), I2, I4, I5, W-I2, et W-I1 pour la partie mémo.

Une fois R1 corrigé et couvert par le test d'intégration ci-dessus, le PR peut passer en **READY**, R2 étant suivi dans un ticket si on ne le corrige pas tout de suite.

## Vérification R1/R2 (commits f24602b et 4bb2915)

Lecture statique, sans exécuter les tests.

### R1 : corrigé

- **Corps de la fonction** : `20261118000300_app_ingest_baseline.sql`. Comparé ligne à ligne avec `ingest_batch` de `20261118000200`, il n'en diffère que par trois variables (`v_tz_empty`, `v_p_created`, `v_p_tz`), lues une fois juste avant la boucle `timezone_changes`, et par la condition d'exemption. Les révocations et le grant `service_role` sont inchangés.
- **Fuseau lu avant le lot** : `profile.time_zone` n'est modifié qu'après la boucle (« le profil suit le journal ») ; les sections précédentes n'y touchent pas. `v_p_tz` est donc bien le fuseau d'avant le lot.
- **Tentatives d'abus** :
  - *Ligne de base forgée dans un autre fuseau* : elle exige `time_zone = profile.time_zone`, donc 23514 (testé).
  - *Ligne ancienne qui n'est pas exactement à `created_at`* : 23514 (testé).
  - *Deux lignes de base* : même `effective_at`, donc l'unicité `(user_id, effective_at)` joue ; une copie identique est ignorée et un autre fuseau donne 23505.
  - *Ligne de base plus une autre ligne ancienne* : seule la ligne de base est exemptée, l'autre donne 23514 (testé).
  - *Ligne de base alors que le journal n'est pas vide* : 23514 (testé).
- **Pourquoi l'exemption n'ouvre rien** : la ligne exemptée dit « depuis la création du compte, le fuseau était celui du profil ». C'est exactement le repli que `timeZoneAt` appliquait déjà au journal vide : elle ne réécrit aucune attribution passée. Elle ne s'applique qu'une fois, et `created_at` n'est modifiable que par `service_role`.
- **Tests** : pgTAP (profil de 30 jours, ligne de base plus changement récent accepté, 2 lignes journalisées, profil à jour) et `loop.integration.test.ts`, qui fait passer un vrai `planIngest` par le SQL. C'est ce qui manquait.

### R2 : corrigé

- **Comptage en base** : `readIngestRows` compte les `app.production` du compte avec `created_at` dans les 24 dernières heures (`count: exact, head`, index `production_user_idx (user_id, created_at)`). `capProductions` y ajoute, dans l'ordre du lot, les `production_submitted` non encore connus. Au-delà de 10, la raison est `too_many`. Antidater ne sert plus à rien : c'est l'heure de réception qui compte.
- **Deux lots simultanés** : chacun peut lire le même compte avant le verrou. Le second reçoit alors 40001, et `processWithRetry` relit tout l'état, donc le compte aussi. Le mode isolement relit à chaque événement. Le plafond tient.
- **Cas limite, accepté** : un `production_submitted` gardé par le plafond puis refusé par `planIngest` consomme une place dans le lot en cours. Le plafond en devient plus strict, jamais plus lâche.

### Résidu connu (Mineur, inchangé)

Tant que `seq = 0`, `save_profile` peut encore choisir le fuseau, une seule fois, avant la première ingestion : au plus un jour de gain. C'est déjà noté plus haut. Il se fermera si la ligne de base est un jour écrite à l'activation.

### Verdict final du PR : READY

Le seul bloquant restant (R1) est corrigé et testé, et R2 l'est aussi. Restent ouverts, non bloquants, à suivre dans un lot de durcissement :
- **I3** : bornes SQL de défense en profondeur ;
- **les mineurs de S et de W** ;
- **l'isolement** : une erreur non SQL fait encore échouer le lot en 503.

Réserve : verdict établi sans avoir exécuté les suites pgTAP et Vitest ; il suppose qu'elles passent sur la base partagée.
