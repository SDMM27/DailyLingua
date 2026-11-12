# Revue de sécurité — Jalon 1, PR 1 : schéma `app` et reprise des données

Relecteur : `relecteur-securite`. Branche `refonte/jalon-1` (worktree `refonte-jalon-1`), migrations `20261112000100` à `20261112000600`, tests `app_*.test.sql`, `scripts/migration-verify.mts`, `supabase/config.toml`. Revue faite sur le code lu, **sans exécuter la base** (une autre tâche l'utilisait).

## 1. Verdict

- **Fusion : non bloquante.** Aucun constat critique. Les clients ne peuvent ni écrire dans `app`, ni lire les lignes d'un autre utilisateur, ni appeler autre chose que `save_profile`. Les tests pgTAP couvrent bien les droits.
- **Production (étapes M3 à M5 de `f-plan-de-migration.md`) : bloquante** tant que E1 n'est pas réglé. La reprise ne recopie jamais une ligne déjà reprise. Si on fait une migration à blanc en production pendant que l'ancienne app sert, puis une « dernière migration incrémentale », les modifications faites entre les deux sont perdues sans bruit. E2 est à trancher avant toute exécution sur une vraie base.
- Six constats moyens à corriger avant d'écrire les premières fonctions d'écriture (jalon suivant) : M1 à M3 en priorité, car les fonctions `security definer` à venir s'appuieront sur ces garanties.

## 2. Constats

### Critique

Aucun.

### Élevée

#### E1. La reprise « rejouable » ignore les mises à jour et les suppressions faites dans `public` : perte silencieuse à la bascule

- **Où** : `20261112000600_app_data_migration.sql`. Chaque bloc ne copie que les lignes sans entrée dans `legacy_map` (`not exists … legacy_map`, l. 135-138, 167-171, 191-194, 233-236, 270-273, 307-310, 381-385, 456-459, 487-490, 517-520). Le profil n'est plus touché une fois `legacy_migrated_at` posé (l. 113). Aucune ligne `app` n'est jamais mise à jour ni supprimée quand sa source change.
- **Scénario reproductible** (sans attaquant, c'est le déroulé du plan) :
  1. M3 : `migrate_all()` en production, l'ancienne app continue de servir.
  2. Un utilisateur révise « comer » dans l'ancienne app : `vocabulary_items.box`, `due_on`, `last_reviewed_on` et `review_count` changent, et une ligne `vocabulary_reviews` est ajoutée. Il corrige aussi une traduction, renomme une liste, change ses minutes et ses jours (`user_languages`), son fuseau (`profiles`) et continue son brouillon (`production_entries.body`).
  3. M5 : « dernière migration incrémentale ». La nouvelle révision est copiée (l. 332-368), mais la carte garde l'ancien état FSRS : `due_at`, `stability`, `reps` et `lapses` sont figés à M3. La traduction, la liste, l'inscription, le fuseau et le texte restent ceux de M3.
  4. `verify_migration` signale `due_day` (l. 775-781) et `md5_production_texts`. En revanche, il ne voit ni `reps`, ni `state`, ni `last_review_at`, ni `back`, ni la liste, ni `enrollment`, ni `skill_estimate`. Ces pertes passent.
  5. Aucune réparation n'est possible : pour refaire la copie, il faut effacer les cartes, et `review_log` est en ajout seul. On ne peut l'effacer qu'en supprimant les cartes (ce que permet M1, ce qui montre bien que M1 est un trou).
- Le §7 du plan (« le travail fait dans la nouvelle app … sera repris à la prochaine migration », retrait du marqueur en M4) suppose une resynchronisation que le code ne fait pas.
- Le test `app_migration.test.sql` l. 348-352 ajoute une révision **sans mettre à jour** `vocabulary_items` (box, due_on), contrairement à ce que fait l'ancienne app. C'est pour cela qu'il reste vert.
- **Correction proposée** (au choix de l'architecte, à écrire dans la spec) :
  - (a) Mode resynchronisation : pour toute ligne `app` d'origine `legacy` que la nouvelle app n'a pas encore touchée, réaligner sur la source à chaque passage. Exemple pour les mots :
    ```sql
    update app.card c
    set front = vi.term, back = vi.translation, context = vi.example,
        list_id = ml.app_id::uuid,
        state = case when vi.status = 'known' then 'known'
                     when vi.last_reviewed_on is null then 'new' else 'review' end,
        stability = app.leitner_interval(vi.box),
        due_at = (vi.due_on + time '04:00') at time zone v_tz,
        last_review_at = case when vi.last_reviewed_on is not null
                              then (vi.last_reviewed_on + time '12:00') at time zone v_tz end,
        reps = vi.review_count,
        lapses = (select count(*) from public.vocabulary_reviews vr
                  where vr.item_id = vi.id and vr.grade = 'again'),
        legacy_box = vi.box
    from public.vocabulary_items vi
    join app.legacy_map m on m.legacy_table = 'vocabulary_items' and m.legacy_id = vi.id::text
                         and m.app_table = 'card'
    left join app.legacy_map ml on ml.legacy_table = 'vocabulary_lists'
                               and ml.legacy_id = vi.list_id::text and ml.app_table = 'card_list'
    where vi.user_id = p_user_id and c.id = m.app_id::uuid and c.user_id = p_user_id
      and not exists (select 1 from app.review_log r where r.card_id = c.id and r.origin = 'fsrs');
    ```
    Faire de même pour les trois autres types de cartes, `card_list`, `enrollment`, `skill_estimate` (source `legacy` seulement), `production` (texte) et `profile` (tant que l'utilisateur n'a pas d'activité dans `app`). Supprimer aussi les cartes `legacy` sans activité `fsrs` dont la source a disparu.
  - (b) Ou décision opérationnelle écrite : pas de `migrate_all` en production avant M5. La migration à blanc de M3 se fait sur une copie, pas sur la base servie. Les volontaires de M4 sont gelés côté ancienne app dès leur reprise.
  - Dans les deux cas, ajouter à `verify_migration` l'égalité `state`, `reps`, `last_review_at` et `back` par carte, et un contrôle `skill_estimate` et `enrollment` (minutes, jours, niveau cible).
- **Test pgTAP qui le prouve** : après le premier `migrate_all()`, faire `update public.vocabulary_items set box = 4, due_on = '2031-04-15', last_reviewed_on = '2031-03-15', review_count = 5 where id = '…07a2'` (comme l'ancienne app), puis relancer `migrate_user`. Attendre `is((select reps from app.card where front='comer'), 5)` et un `is_empty(verify_migration())`. Ces deux assertions échouent aujourd'hui (`reps` reste 4, `due_day` est signalé).

#### E2. `migrate_all()` fait tout en une transaction : épuisement de la table des verrous et verrous longs sur `public`

- **Où** : `20261112000600_app_data_migration.sql` l. 83 (`pg_advisory_xact_lock` par utilisateur) et l. 615-623 (boucle sur tous les profils, dans l'appel unique de `migrate_all`). Le script `migration-verify.mts` l. 44 l'appelle en une seule requête RPC.
- **Scénario** :
  1. Chaque `migrate_user` prend un verrou consultatif de transaction, libéré seulement à la fin de `migrate_all`. Ces verrous restent pris tous ensemble jusqu'à la fin. La table partagée des verrous compte environ `max_locks_per_transaction` (64) × (`max_connections` + transactions préparées) entrées. À partir de quelques milliers d'utilisateurs, `out of shared memory` / `You might need to increase max_locks_per_transaction` fait échouer la reprise **entière**. Le retour arrière est complet : pas de perte, mais pas de reprise non plus.
  2. Pendant toute la durée, la transaction garde un `AccessShareLock` sur chaque table `public` lue. Si un déploiement de l'ancienne app lance une migration DDL (`alter table public.…`, verrou `AccessExclusive`), celle-ci attend. Toutes les requêtes de l'ancienne app sur cette table se mettent alors en file derrière elle, et l'ancienne app est indisponible jusqu'à la fin de la reprise.
  3. Une seule ligne source refusée par une contrainte de `app` (par exemple un code de `public.languages` qui ne respecte pas `^[a-z]{2,3}$`, l. 93) annule la reprise de tous les utilisateurs.
- **Correction** : un lot par transaction, piloté par le script :
  ```sql
  create function app.migrate_batch(p_after uuid, p_limit integer default 200)
  returns table (last_user uuid, report jsonb)
  language plpgsql security definer set search_path = '' as $$ … $$;  -- boucle bornée sur public.profiles where id > p_after order by id limit p_limit
  ```
  Le script appelle `migrate_batch` en boucle (une requête PostgREST = une transaction). Il pose `set local lock_timeout = '5s'` dans la fonction et remplace les verrous par utilisateur par un verrou global unique : `pg_advisory_xact_lock(hashtextextended('app.migrate', 0))`, pris aussi par `migrate_user`.
- **Test** : un test pgTAP ne prouve pas l'épuisement. Il faut un test de charge local avec 10 000 profils générés (`generate_series`) et `migrate_all()` : on attend l'erreur actuelle, puis la réussite avec les lots. En pgTAP, on peut au moins vérifier qu'une ligne invalide d'un utilisateur ne bloque que son lot.

### Moyenne

#### M1. La garde « ajout seul » laisse effacer journaux et XP en supprimant le parent, contrairement à la spec

- **Où** : `20261112000200_app_memory.sql` l. 112-126 (« parent disparu ⇒ suppression acceptée »), combiné aux FK `on delete cascade` : `review_log.card_id` (l. 67), `attempt.session_id` (`…000300` l. 25), `xp_ledger.attempt_id` et `review_log_id` (`…000400` l. 89-90). La spec §2.2 ne prévoit d'exception que pour la suppression du **compte**.
- **Scénario** : en `service_role` (ou dans toute future fonction `security definer` qui supprime une carte ou une séance, par exemple une fonction « supprimer ce mot » côté client), `delete from app.card where user_id = $1` efface tout le `review_log` de l'utilisateur, puis par cascade l'XP issue de ces révisions. De même, `delete from app.session where user_id = $1` efface toutes les tentatives et leur XP. La garde ne lève rien. Le test `app_append_only.test.sql` l. 55-67 consacre ce comportement. Conséquences : on ne peut plus « recalculer n'importe quel état » ni « auditer une triche » (`d-architecture.md` §4). Une fonctionnalité légitime (« supprimer un mot ») ferait aussi baisser l'XP de l'utilisateur.
- **Correction** :
  ```sql
  -- Le parent ne peut plus disparaître seul ; la suppression du compte passe toujours
  -- (NO ACTION est vérifié en fin d'instruction, quand la cascade par user_id a tout emporté).
  alter table app.card add constraint card_id_user_key unique (id, user_id);
  alter table app.review_log drop constraint review_log_card_id_fkey,
    add constraint review_log_card_fkey foreign key (card_id, user_id) references app.card (id, user_id);
  alter table app.session add constraint session_id_user_key unique (id, user_id);
  alter table app.attempt drop constraint attempt_session_id_fkey,
    add constraint attempt_session_fkey foreign key (session_id, user_id) references app.session (id, user_id);
  alter table app.attempt add constraint attempt_id_user_key unique (id, user_id);
  alter table app.review_log add constraint review_log_id_user_key unique (id, user_id);
  alter table app.xp_ledger drop constraint xp_ledger_attempt_id_fkey, drop constraint xp_ledger_review_log_id_fkey,
    add constraint xp_ledger_attempt_fkey foreign key (attempt_id, user_id) references app.attempt (id, user_id),
    add constraint xp_ledger_review_log_fkey foreign key (review_log_id, user_id) references app.review_log (id, user_id);
  ```
  La garde se réduit à : `if not exists (select 1 from auth.users u where u.id = old.user_id) then return old; end if; raise …`. Une carte retirée par l'utilisateur passe à un état « supprimée » (colonne `deleted_at` ou état `suspended`) au lieu d'être effacée.
- **Test** : en `service_role`, `throws_ok($$delete from app.card where id = '…c2'$$, '23503')` et `throws_ok($$delete from app.session where id = '…d1'$$, '23503')`. Puis `lives_ok($$delete from auth.users where id = '…b1'$$)` et un comptage à zéro sur les six tables.

#### M2. Clés étrangères simples entre tables utilisateur : une ligne peut pointer vers le parent d'un autre utilisateur

- **Où** : `card.list_id` (`…000200` l. 32), `review_log.card_id` (l. 67), `attempt.session_id` (`…000300` l. 25), `correction.production_id` (`…000400` l. 24), `rewrite.correction_id` (l. 45), `xp_ledger.attempt_id` et `review_log_id` (l. 89-90). `production.session_id` n'a aucune clé étrangère (l. 8). Le schéma `public` utilisait des FK composites `(id, user_id[, language])` justement pour l'empêcher (`20261020000300_vocabulary_lists.sql` l. 36-39, `20261013000300_missions.sql` l. 12-14). C'est donc un recul.
- **Scénario** (latent, il se réalise dès qu'une fonction d'écriture fait confiance à un identifiant venu du client) : l'utilisateur A envoie `list_id` = une liste de B (identifiant obtenu par une fuite, un partage ou un journal). Sa carte est rattachée à la liste de B. Quand B supprime sa liste, la cascade supprime la carte de A **et** son `review_log` : la garde l'accepte, puisque le parent a disparu (M1). B détruit l'historique de A. Autre cas : un `xp_ledger` de A peut référencer la tentative de B, donc de l'XP gagnée sur le travail d'un autre. Enfin, `card.language` peut différer de celui de la liste.
- **Correction** : les FK composites de M1, plus :
  ```sql
  alter table app.card_list add constraint card_list_id_user_lang_key unique (id, user_id, language);
  alter table app.card drop constraint card_list_id_fkey,
    add constraint card_list_fkey foreign key (list_id, user_id, language)
      references app.card_list (id, user_id, language) on delete cascade;
  alter table app.production add constraint production_id_user_key unique (id, user_id),
    add constraint production_session_fkey foreign key (session_id, user_id)
      references app.session (id, user_id) on delete set null (session_id);   -- PG 15+
  alter table app.correction add constraint correction_id_user_key unique (id, user_id),
    drop constraint correction_production_id_fkey,
    add constraint correction_production_fkey foreign key (production_id, user_id)
      references app.production (id, user_id) on delete cascade;
  alter table app.rewrite drop constraint rewrite_correction_id_fkey,
    add constraint rewrite_correction_fkey foreign key (correction_id, user_id)
      references app.correction (id, user_id) on delete cascade;
  ```
  (Les noms de contraintes générés sont à vérifier avec `\d`.)
- **Test** : en `postgres`, `throws_ok` (23503) pour l'insertion d'une carte de u1 avec le `list_id` de u2, d'un `review_log` de u1 sur la carte de u2, d'un `xp_ledger` de u1 sur la tentative de u2, et d'une `correction` de u1 sur la production de u2.

#### M3. `service_role` ne peut ni insérer ni modifier une inscription : `app.is_valid_weekdays` sert dans un CHECK mais n'est exécutable par personne

- **Où** : `20261112000100_app_schema_and_identity.sql` l. 114 (`check (app.is_valid_weekdays(days))`) et l. 257-263 (`revoke execute … from public, anon, authenticated`). `service_role` n'a jamais reçu `execute`.
- **Scénario** : PostgreSQL vérifie le droit `EXECUTE` de l'utilisateur courant sur chaque fonction d'une expression de contrainte, à l'initialisation de l'expression. Un `insert` ou `update` sur `app.enrollment` par `service_role` (action serveur, ou `rpc` avec la clé de service) échoue donc avec `42501 permission denied for function is_valid_weekdays`. Comme tous les CHECK sont réévalués à chaque `update`, même `update … set active = false` échoue. Les tests ne le voient pas : ils écrivent en `postgres` (`app_access.test.sql` l. 15, `app_save_profile.test.sql` l. 43-53), et la reprise s'exécute en `security definer`. Ce n'est pas une faille, mais la correction « évidente » sous pression serait de tout rouvrir (`grant … to public`) : il faut la décider maintenant.
- **Correction** : `grant execute on function app.is_valid_weekdays(smallint[]) to service_role;` (fonction pure, sans risque). Ou remplacer le CHECK par une expression sans fonction utilisateur : `check (array_ndims(days) = 1 and cardinality(days) between 1 and 7 and days <@ '{1,2,3,4,5,6,7}'::smallint[])`, plus un déclencheur pour les doublons.
- **Test** : `set local role service_role; select lives_ok($$insert into app.enrollment (user_id, language, daily_minutes) values ('…a1', 'es', 20)$$, 'service_role can enroll');` puis `lives_ok($$update app.enrollment set active = false where user_id = '…a1'$$)`. Comme le constat ne se déduit que de la lecture du code, c'est le premier test à lancer.

#### M4. `legacy_record` expose au propriétaire des tables qu'il ne pouvait pas lire

- **Où** : `…000600` l. 572 (`feedback`) et `…000500` l. 68-70 (lecture propriétaire de `legacy_record`). `public.feedback` est « write-only for users » (`20261015000200_feedback.sql` l. 2-3, aucune politique `select`).
- **Scénario** : un utilisateur fait `GET /rest/v1/legacy_record?legacy_table=eq.feedback` avec `Accept-Profile: app` et relit ses retours, avec `page` et `app_version`. Ce sont ses propres données, donc l'impact est faible, mais c'est un changement de politique que personne n'a décidé. J'ai vérifié les autres tables archivées : `missions`, `mission_sessions` (avec `answerIndex` des quiz), `mission_activities`, `activity_progress`, `quiz_answers`, `profiles`, `user_languages`, `writing_feedback`, `content_refusals`, `user_source_access` et `mission_requests` étaient toutes déjà lisibles par leur propriétaire dans `public`. Aucune ligne d'un autre utilisateur n'y entre : toutes les sous-requêtes sont rattachées par FK composites dans `public`. Les en-têtes de `20261016000100_user_source_access.sql` confirment qu'aucun jeton n'y est stocké. Classé « moyenne » seulement parce que c'est le point le plus large exposé au client par ce lot.
- **Correction** : ne pas archiver `feedback` dans `legacy_record` (il reste dans `public` 90 jours, puis dans l'export). Ou bien filtrer la politique : `using (user_id = (select auth.uid()) and legacy_table <> 'feedback')`.
- **Test** : en `authenticated` (u f2), `is((select count(*) from app.legacy_record where legacy_table = 'feedback'), 0)`.

#### M5. Garanties anti-triche absentes du schéma des journaux de jeu

- **Où** : `xp_ledger` (`…000400` l. 82-93) : `amount smallint > 0` sans plafond, pas d'unicité par source, `day` non borné. `attempt` (`…000300` l. 22-38) : `occurred_at` non borné par rapport à `received_at`, `duration_ms` et `answer` sans limite. `streak_state` (l. 108-116) : `current` et `best` sans `>= 0` ni `best >= current`.
- **Scénario** (latent : aucun client n'écrit aujourd'hui, mais la grille §3 demande ces garanties au niveau de la base, car les fonctions d'écriture viendront) : un lot hors ligne rejoué avec un `client_event_id` différent mais le même `attempt_id` crédite deux fois l'XP, puisque rien n'interdit deux lignes `xp_ledger` pour la même tentative. Un `occurred_at` en 2099 ou daté de la veille fabrique un jour de série. Une réponse de plusieurs Mo passe sans erreur.
- **Correction** :
  ```sql
  create unique index xp_ledger_attempt_reason_idx on app.xp_ledger (attempt_id, reason) where attempt_id is not null;
  create unique index xp_ledger_review_reason_idx on app.xp_ledger (review_log_id, reason) where review_log_id is not null;
  alter table app.xp_ledger add constraint xp_ledger_amount_cap check (amount <= 500);
  alter table app.attempt
    add constraint attempt_occurred_bounds check (occurred_at <= received_at + interval '5 minutes'
                                                  and occurred_at >= received_at - interval '7 days'),
    add constraint attempt_answer_size check (octet_length(answer::text) <= 20000),
    add constraint attempt_duration_cap check (duration_ms <= 3600000);
  alter table app.streak_state add constraint streak_state_values check ("current" >= 0 and best >= "current");
  ```
  Les plafonds exacts viennent de `c-game-design.md`.
- **Test** : `throws_ok` (23505) sur un second `xp_ledger` pour le même `(attempt_id, reason)`, et (23514) sur une tentative datée de `received_at + 1 day`.

#### M6. Le profil créé par le déclencheur peut être écrasé par la reprise, et `is_guest` n'est jamais mis à jour

- **Où** : `…000600` l. 105-113 : `do update … where ap.legacy_migrated_at is null` écrase `native_language`, `ui_language`, `time_zone` et `reminder_time`. `…000400` l. 128-140 : `is_guest` n'est posé qu'à l'insertion.
- **Scénario 1** : un utilisateur inscrit après la création de `app` règle sa L1 sur « it » avec `save_profile`, et son fuseau. La reprise remet `fr` et le fuseau de `public` : son choix est perdu sans bruit.
- **Scénario 2** : un invité convertit son compte (Supabase passe `auth.users.is_anonymous` à `false` par `update`). `app.profile.is_guest` reste `true` pour toujours, et toute règle future fondée sur `is_guest` (quotas, accès au bilan) le traitera en invité. Pas d'élévation possible (le sens est restrictif), mais c'est une incohérence durable.
- **Correction** : dans la reprise, ne remplacer que les champs encore à leur valeur par défaut, ou ne rien remplacer si `updated_at > created_at`. Ajouter un déclencheur `after update of is_anonymous on auth.users` qui fait `update app.profile set is_guest = coalesce(new.is_anonymous, false) where user_id = new.id` (`security definer`, `search_path = ''`, exécution retirée à `public`, `anon` et `authenticated`).
- **Test** : `update auth.users set is_anonymous = false where id = '…e3'` puis `is((select is_guest from app.profile where user_id = '…e3'), false)`. Et `save_profile('it', …)` suivi de `migrate_user`, puis `is(native_language, 'it')`.

### Faible

- **F1. `alter default privileges in schema app revoke execute on functions from public` ne fait rien** (`…000100` l. 17). Un `REVOKE` limité à un schéma ne peut pas retirer un droit accordé globalement : le droit `EXECUTE` par défaut à `PUBLIC` reste en place (documentation de `ALTER DEFAULT PRIVILEGES`). Toute fonction ajoutée plus tard dans `app` sans `revoke` explicite sera appelable par `authenticated`, qui a `usage` sur le schéma. Aujourd'hui, chaque fonction a son `revoke` explicite, et le test générique `app_access.test.sql` l. 60-65 attraperait un oubli. Correction : supprimer la ligne trompeuse, ou la remplacer par un commentaire « revoke explicite obligatoire », et garder le test générique.
- **F2. Upsert de `legacy_record` sans contrôle du propriétaire** (`…000600` l. 591-593) : `do update set payload = excluded.payload` sans `where r.user_id = excluded.user_id`. Les clés actuelles (UUID d'origine, ou clés préfixées par `user_id`) excluent une collision. Si une clé non préfixée est ajoutée plus tard, les données de A pourraient aller dans une ligne lisible par B. Correction : ajouter `and r.user_id = excluded.user_id` au `where`.
- **F3. Collisions ignorées sans rapport** : `skill_estimate` `on conflict do nothing` (l. 175) n'est ni repris dans `legacy_map`, ni contrôlé par `verify_migration`. `card_list` (l. 198) ne l'est que par le comptage `card_lists`, et la carte perd alors sa liste sans bruit (`left join`, l. 230-231). Correction : contrôle `skill_estimates` dans `verify_migration`, et ligne `legacy_record` de motif « conflit ».
- **F4. `save_profile`** (`…000100` l. 206-253) : aucune limite de débit, et `ui_language` accepte n'importe quel code de 2 ou 3 lettres. Une L1 égale à la langue d'une inscription **inactive** est acceptée (l. 236), et la réactivation n'est pas vérifiée : le déclencheur `enrollment_enforce_language` ne porte que sur `language` et `user_id` (l. 149). Correction : déclencheur `before insert or update of language, user_id, active`.
- **F5. Pas de bornes de taille** sur `card.front`, `back`, `context`, `note`, `correction.feedback`, `rewrite.text` et `assessment_result.payload`. `public` en avait (120 à 500 caractères). À ajouter avant les écritures client.
- **F6. `legacy_map` survit à la suppression du compte** (pas de `user_id`, `…000500` l. 42-49) : seulement des identifiants, aucune donnée personnelle, mais ce sont des lignes orphelines. Ajouter `user_id … on delete cascade`.
- **F7. Coût de `verify_migration`** (`…000600` l. 677-689, 785-796) : `src_cards` est matérialisée sans index puis parcourue une fois par utilisateur et par type, soit un coût quadratique. `legacy_study_days()` est appelée une fois par ligne de `study_day` (l. 795). C'est sans risque en local, mais long sur une copie de production (M2). Correction : agrégats `group by user_id` joints une seule fois.
- **F8. `scripts/migration-verify.mts`** : le garde-fou tient. `new URL(url).hostname` est comparé exactement (l. 16, 27, 32). `http://localhost.evil.com`, `http://127.0.0.1.nip.io`, `http://localhost@evil.com` et `http://localhost.` sont refusées. `http://[::1]` est accepté sous la forme `[::1]`. Reste un risque très faible : avec Node ≥ 24 et `NODE_USE_ENV_PROXY=1`, une variable `HTTP_PROXY` pourrait détourner la requête « locale ». On peut ajouter `if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) refuse`.

## 3. Garanties 1 à 6

| # | Garantie | Statut | Preuve |
|---|---|---|---|
| 1 | `anon` sans accès, `authenticated` en lecture de ses lignes seulement, aucune écriture | **Tenue sous réserve** | `revoke all on schema app from public` et `usage` donné seulement à `authenticated` et `service_role` (`…000100` l. 14-15). Seuls des `grant select` sont accordés à `authenticated`, avec RLS activée et uniquement des politiques `for select … user_id = auth.uid()` sur les 20 tables. Tests `app_access` l. 51-118 (droits sur toutes les tables, dont `truncate`) et l. 136-155 (une ligne par utilisateur). Réserves : M2 (intégrité entre utilisateurs) ; privilèges par défaut et schémas exposés du projet hébergé non vérifiés (§5). |
| 2 | Seule `save_profile` est appelable, et seulement sur `auth.uid()` | **Tenue** | Chaque fonction a son `revoke … from public, anon, authenticated` (`…000100` l. 257-266, `…000200` l. 135, `…000600` l. 62-66 et 814-817). `create or replace` de `handle_new_user` conserve ses droits. `save_profile` ne prend aucun identifiant et fait `where user_id = uid` (l. 217, 246). Test générique `app_access` l. 60-65. Les fonctions de déclencheur ne sont de toute façon pas appelables par `rpc`. |
| 3 | Journaux en ajout seul, même pour `service_role` ; suppression de compte en cascade | **Tenue sous réserve** | `update` et `delete` directs bloqués, pas de `truncate` (`app_append_only` l. 35-50), cascade du compte testée (l. 73-84). Réserve M1 : la suppression du parent (carte, séance) efface journaux et XP, ce que la spec n'autorise pas. `postgres` (tableau de bord) peut toujours désactiver le déclencheur ou faire un `truncate`, ce qui est hors du modèle de menace client. |
| 4 | Reprise réservée à `service_role`, rejouable, sans modifier `public`, sans mélange | **Tenue sous réserve** | Droits : `…000600` l. 814-817, tests l. 376-382. `public` n'est que lu (aucun DML ou DDL sur `public` dans le fichier ; instantané `app_migration` l. 166-168). Pas de mélange : toutes les sources sont filtrées par `user_id = p_user_id`, et les jointures via `legacy_map` s'appuient sur les FK composites de `public` (vérifiées dans `20261013000300`, `…000400`, `…000800`, `20261015000400`, `20261020000100`, `20261020000300`). Réserves : E1 (rejouable seulement pour les insertions), E2 (échec global et verrous), F2. |
| 5 | `app.handle_new_user` ne peut pas faire échouer une inscription ni être détourné | **Tenue** | Seuls `new.id` et `new.is_anonymous` sont lus (`…000400` l. 134-137). `on conflict do nothing` sur les deux insertions. Valeurs par défaut valides (`Europe/Paris` passe `validate_time_zone`). `security definer` avec `search_path = ''`, exécution retirée. Test `app_save_profile` l. 10-33. Réserve fonctionnelle M6 (`is_guest` figé). |
| 6 | `ai_call` et `legacy_map` illisibles par les clients | **Tenue** | Aucun `grant` à `authenticated` (`…000500` l. 5-24 et 42-53), RLS activée sans politique. Tests `app_access` l. 114-118 et 131-132. |

## 4. Trous dans les tests

1. Aucun test n'écrit en `service_role` dans les tables mutables (`enrollment`, `card`, `profile`), alors que c'est le chemin d'écriture prévu. M3 passe donc inaperçu.
2. `app_append_only` l. 55-67 **consacre** la suppression des journaux par celle du parent, au lieu de la refuser (M1).
3. Aucun test d'intégrité entre utilisateurs (carte de u1 dans une liste de u2, etc.) (M2).
4. Le test incrémental de la reprise (`app_migration` l. 348-352) ajoute une révision sans mettre à jour l'élément de vocabulaire, ce qui masque E1. Aucun test de modification ou de suppression d'une source après un premier passage.
5. Aucun test d'échec en cours de reprise : une ligne invalide, puis vérification de ce qui a été écrit (E2).
6. `verify_migration` n'a pas de contrôle pour `skill_estimate`, ni pour les champs d'état des cartes (`state`, `reps`, `last_review_at`), ni pour `back` ou `enrollment` (F3, E1).
7. Le contrôle `anon` (`app_access` l. 80-84) omet `delete` et `truncate`. C'est sans effet aujourd'hui, puisque `anon` n'a pas `usage`, mais il vaut mieux l'aligner sur le contrôle `authenticated`.
8. Aucun test de conversion invité → membre (M6), ni de `save_profile` suivi de `migrate_user`.
9. Aucun test ne vérifie que `legacy_record` ne contient que des tables déjà lisibles par le propriétaire (M4).
10. Les tests valident les droits dans la base locale seulement. Rien ne rejoue ces assertions de droits (requêtes `has_table_privilege` et `has_function_privilege` en lecture seule) sur le projet hébergé après application.

## 5. Ce que je n'ai pas pu vérifier sans la base

- **M3** se déduit de la sémantique de PostgreSQL (droit `EXECUTE` vérifié à l'initialisation des expressions de contrainte) ; il n'a pas été exécuté. C'est le premier test à lancer.
- **Projet hébergé** : les privilèges par défaut posés par la plateforme (`pg_default_acl` pour `postgres` et `supabase_admin`, globaux ou par schéma) ; d'éventuels déclencheurs d'événements qui accordent des droits sur un nouveau schéma ; l'exposition de `app` (réglage « Exposed schemas » du tableau de bord : `config.toml` ne vaut que pour la base locale) ; l'exposition par `pg_graphql`, qui ne fait que respecter la RLS mais élargit la surface ; le droit de `postgres` à créer un déclencheur sur `auth.users`. À contrôler par requêtes en lecture seule sur le catalogue après M3 : `select * from pg_default_acl`, et les mêmes assertions que `app_access`.
- Le `statement_timeout` effectif de `service_role` via PostgREST, qui pourrait couper `migrate_all` à mi-course (rien n'est perdu, la transaction est annulée, mais la reprise devient impossible à grande échelle).
- Le seuil réel d'épuisement des verrous (E2), qui dépend de `max_locks_per_transaction` et `max_connections` en production.
- Si la CLI applique chaque fichier de migration dans sa propre transaction. Sinon, un échec dans `…000600` laisserait les fichiers `…000100` à `…000500` appliqués : sans danger, mais à savoir pour le retour arrière.
- **Retour arrière** : aucune migration descendante n'est écrite. `drop schema app cascade` emporte bien le déclencheur sur `auth.users` (il dépend de la fonction), mais il faut aussi retirer les versions `20261112000*` de `supabase_migrations.schema_migrations`, sinon le prochain `db push` sera incohérent. À écrire et tester avant M3. Point lié : si l'ancienne app utilise `app.profile.legacy_migrated_at` comme marqueur de redirection en M4 (plan §5), un `migrate_all` en M3 poserait ce marqueur pour tout le monde. À clarifier dans la spec de M4.
- La performance réelle de `migrate_all` et `verify_migration` sur une copie de production (F7).
