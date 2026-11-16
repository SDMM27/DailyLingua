# Jalon 2 — Spec de jeu : XP, anneau, série, bilan, sons, notification

Auteur : game designer. Cette spec fait foi pour **les chiffres et les règles du jeu** du jalon 2 ; `j2-architecture.md` fait foi pour les données et la sécurité, `j2-seance-contenu.md` pour le contenu des étapes, `j2-ecrans.md` pour l'interface. Source des règles : `c-game-design.md` (§2.1, §3.1, §3.2, §3.7, §3.8, §3.10, §6) et les points tranchés 8 à 12 du `README.md`. Tout écart à ces documents est signalé au §12.

Hors périmètre (jalons 6-7) : quêtes, ligues, badges, amis, carte du parcours, immersion déclarée, oral transcrit. Ce qu'il faut prévoir pour eux est au §2.4.

Conventions : « jour » = jour d'apprentissage (04:00 → 03:59 locale, `learningDay()` de `packages/core/src/dates.ts`) ; « semaine » = lundi 04:00 → lundi 03:59 ; tous les plafonds sont **par utilisateur, toutes langues confondues** (un seul anneau, une seule série) ; le journal d'XP garde la langue de chaque ligne pour la répartition.

## 1. Barème du jalon 2

Version de règle : `j2.1` (colonne `rule_version`). L'identifiant de règle va dans `xp_ledger.reason`. Aucune ligne n'est négative ; une réponse fausse vaut 0, rien n'est jamais retiré.

| Règle (`reason`) | Volet | XP | Preuve vérifiée par le serveur | Plafond / rendement |
|---|---|---|---|---|
| `review.recognition` | Étude | 1 | `review_attempt` mode `recognition` ; carte **due** au `shownAt` (échéance ≤ instant) ou nouvelle dans la limite quotidienne de nouvelles cartes ; choix comparé à la clé serveur ; `answeredAt − shownAt ≥ 600 ms` ; **premier succès du jour** pour cette carte | Révisions (toutes règles `review.*`) : **120 XP/jour**. Rendement : les réussites n° 151 à 300 du jour rapportent une sur deux (151e oui, 152e non…) ; au-delà de 300, 0 |
| `review.production` | Étude | 2 | Idem, mode `production` (L1 → L2 tapée, trou) ; réponse normalisée (casse, espaces, ponctuation finale ; accents selon le réglage de tolérance) égale à une forme acceptée ; ≥ 1 000 ms | Idem |
| `review.listening` | Étude | 2 | Idem, mode `listening` : la consigne n'est **que** audio (voix de synthèse, mot non affiché) ; `audioPlays ≥ 1` dans l'événement ; réponse correcte ; ≥ 1 000 ms | Idem |
| `review.bonus.difficulty` | Étude | +1 | Succès compté ci-dessus sur une carte de stabilité FSRS < 3 j ou sangsue (≥ 6 échecs) | Dans les 120 |
| `review.bonus.reconquest` | Étude | +1 | Succès compté ci-dessus sur une carte dont la dernière note du jour J−1 était « à revoir » | Dans les 120 |
| `reading.understood` | Input | 15 | `reading_progress` atteint 100 % du texte ; `t(100 %) − t(0 %) ≥ mots × 60 000 ÷ 400` ms ; ≥ 3 `comprehension_answer` du texte reçues ; score serveur 60-89 % ; premier passage du jour sur ce texte | Input : **100 XP/jour** ; 4 textes/jour plein tarif, puis 50 % (arrondi inférieur) |
| `reading.understood_well` | Input | 20 | Idem, score ≥ 90 % | Idem |
| (multiplicateur) | — | × 1,5 | `text.word_count > 600` lu en base (arrondi supérieur : 23 ou 30) ; `meta.long = true` | Idem |
| `focus.first_try` | Étude | 2 | `focus_attempt` `try = 1` juste, corrigé avec la clé serveur ; item servi dans une séance de l'utilisateur ; premier passage du jour sur l'item | **20 XP/séance, 40 XP/jour** (l'erreur du jour a son propre plafond) |
| `focus.second_try` | Étude | 1 | `try = 2` juste, après un `try = 1` faux sur le même item ; un 3e essai vaut 0 | Idem |
| `production.corrected` | Output | 15 | Correction IA reçue ; longueur ≥ seuil du niveau d'écriture (A1 20 mots, A2 35, B1 60, B2 90, C1-C2 120) ; langue détectée par la correction = langue cible ; similarité < 0,50 avec le texte source de la séance, les versions natives déjà rendues et les 30 dernières productions (Jaccard sur trigrammes de mots normalisés) | **2/jour** (30 XP) |
| `rewrite.sentence` | Output | 5 | `rewrite_submitted` sur une phrase d'une correction de l'utilisateur ; `rewrite_check` : `fixedErrorIds` non vide (règle appliquée en TypeScript) | **2 phrases par production, 20 XP/jour** |
| `rewrite.sentence_native` | Output | 3 | Idem, mais la phrase normalisée est identique à la version native | Idem |
| `error_of_day.reworked` | Étude | 3 | `focus_attempt` juste sur un item que le **serveur** a généré depuis une erreur d'une correction des 7 derniers jours, pas encore retravaillée | **2/jour** (6 XP) |
| `fluency.pass` | Fluidité | 5 | `fluency_pass` sur un texte dont `reading.*` a été obtenu (≥ 60 %) dans les 7 derniers jours ; `endedAt − startedAt ≥ 10 s` ; vitesse ≥ 90 % de la vitesse de référence (passage précédent sur ce texte, sinon première lecture) et ≤ 400 mots/min | **2/jour** |
| `session.complete` | — | 10 | Toutes les étapes du format validées par leur preuve (`session_step.validated_at` non nul, recalcul serveur) | **1/jour** (une séance de rattrapage ne le redonne pas) |

**Rendements et règles transverses.** Carte non due (anticipée, bachotage, étapes intra-journée 1 min / 10 min) : 0. Texte relu le même jour : 0 (sauf `fluency.pass`). Item d'atelier ou carte rejoué le même jour : 0. Plafond théorique d'un jour : 120 + 100 + 40 + 30 + 20 + 6 + 10 + 10 = **336 XP** ; borne de sûreté SQL de `ingest_batch` : **400 XP/jour** (et `amount ≤ 100` par ligne, respecté : le maximum est 30).

**Explication des zéros.** Toute tentative notée qui rapporte 0 alors qu'elle est juste reçoit un motif (`not_due`, `already_counted_today`, `too_fast`, `cap_reached`, `diminishing`, `too_similar`, `too_short`, `wrong_language`, `reread`, `late`) gardé dans `attempt.result.xpReason` ; le bilan le dit en clair (« Cette production ressemble beaucoup à celle de mardi : corrigée, mais sans XP »).

**Preuve d'étape (pour `session.complete`).** Réveil : chaque carte prévue a reçu une tentative, ou la somme des `answeredAt − shownAt` atteint 90 % du budget de l'étape, ou aucune carte n'était due. Lecture : preuve de `reading.*` réunie, quel que soit le score (un score < 60 % valide l'étape sans XP). Atelier : chaque item servi a reçu ≥ 1 tentative. Expression : production acceptée (longueur, langue, similarité) **et**, si la correction signale des erreurs, ≥ 1 réécriture vérifiée. Élan : passage terminé ≥ 10 s et ≤ 400 mots/min (plus lent que la référence : étape validée, 0 XP). Les étapes absentes du format (10 min : atelier et élan un jour sur deux) ne sont pas exigées.

## 2. Événements

### 2.1 Ce que le client envoie

Enveloppe et limites : `j2-architecture.md` §2 (50 événements/lot, 600/h). Ajouts demandés par cette spec, à toutes les charges notées : `tz` (fuseau IANA de l'appareil au moment de l'action), `deviceId` (uuid stable par installation) et `seq` (entier croissant par appareil). Schémas Zod **stricts** : un champ inconnu (`xp`, `score`, `correct`…) → `invalid_payload`.

| `kind` | Champs propres | Contraintes |
|---|---|---|
| `session_started` | `sessionId` | séance de l'utilisateur, jour cohérent |
| `review_attempt` | `cardId`, `mode` (`recognition`/`production`/`listening`), `answer` (id de choix ou texte ≤ 200 car.), `shownAt`, `answeredAt`, `audioPlays` (0-20) | `shownAt ≤ answeredAt ≤ occurredAt` ; `answeredAt − shownAt ≤ 10 min` (au-delà : durée ramenée à 10 min, pas de rejet) |
| `reading_progress` | `sessionId`, `textId`, `ratio` ∈ {0 ; 0,25 ; 0,5 ; 0,75 ; 1} | un événement par palier atteint ; ratios croissants dans le temps |
| `comprehension_answer` | `sessionId`, `itemId`, `answer` | item du texte servi |
| `focus_attempt` | `sessionId`, `itemId`, `try` (1-3), `answer`, `shownAt` | `try` consécutifs ; l'origine « erreur du jour » est lue côté serveur sur l'item, jamais sur l'événement |
| `production_submitted` | `sessionId`, `productionId`, `text` (≤ 4 000 car.), `composeMs` | `composeMs` sert de signal (§9), pas de preuve |
| `rewrite_submitted` | `correctionId`, `sentenceIndex`, `text` (≤ 500 car.) | correction de l'utilisateur |
| `fluency_pass` | `sessionId`, `textId`, `startedAt`, `endedAt` | `startedAt < endedAt ≤ occurredAt` |
| `session_step_completed` | `sessionId`, `step` | indicatif seulement |
| `ui_event` | `name`, `value` | liste fermée du §11 ; n'a jamais d'effet sur l'XP ni la série |

### 2.2 Ce que le serveur en déduit

Correction (clé serveur), note FSRS, `review_log`, état de carte ; validation des étapes ; lignes `xp_ledger` (`reason`, `amount`, `rule_version`, `language`, `day`, `attempt_id`/`review_log_id`, `meta` : `{ occurredDay, late, long, diminished, volet }`) ; `learning_day` des jours touchés ; `streak_state` ; progression de l'anneau et de la semaine ; éligibilité de la notification du jour.

### 2.3 Refus et marquages

| Situation | Effet |
|---|---|
| `occurredAt > receivedAt + 5 min` | refus `in_future` |
| `occurredAt` avant l'instant où le serveur a servi l'item, la carte ou le texte (paquet de séance) − 1 min | refus `before_served` (anti-antidatage) |
| `receivedAt − occurredAt > 72 h` et ≤ 7 j | **accepté** : correction, FSRS et XP appliqués, ligne marquée `late` (§3.3) |
| `receivedAt − occurredAt > 7 j` | refus `too_old` |
| `seq` croissant mais `occurredAt` qui recule de > 2 min sur le même appareil | accepté ; jour borné par le jour de l'événement précédent (§3.2) ; compteur `clock_rollback` |

### 2.4 Préparer les jalons 6-7 sans les bloquer

- Chaque règle porte son **volet** (`meta.volet`) : les quêtes (J7) calculeront la part par volet sur 14 jours depuis le seul journal.
- Les filtres sont nommés une fois dans `core` : `ringXp = règles ∖ {immersion.*}`, `streakXp = règles ∖ {quest.*, immersion.*}`, `leagueXp = league_eligible ∧ ∖ immersion.*` plafonné à 150/jour. Les règles futures (`quest.daily`, `immersion.declared`, `speech.minute`…) s'ajoutent sans toucher ces fonctions.
- `league_eligible` est posé dès maintenant (`true` pour toutes les règles du J2).
- Les badges (J7) se calculent depuis `review_log`, `xp_ledger` et `rewrite` : rien à stocker de plus.
- La hiérarchie des célébrations (§6) réserve les niveaux 4 (badge) et 5 (niveau CECR, « Je peux ») : le code de file d'attente les accepte déjà.

## 3. Jour d'apprentissage et hors ligne

### 3.1 Fuseau

- Le fuseau en vigueur est tenu par un **journal des fuseaux** (`timezone_change` : instant d'effet, fuseau), dérivé des champs `tz` reçus.
- Un nouveau fuseau n'est accepté que si le précédent changement accepté date d'au moins **48 h** (`streak_state.time_zone_changed_at`) ; sinon les événements sont attribués avec l'ancien fuseau. Le profil (`profile.time_zone`) suit le fuseau accepté.
- Aucun voyage ne crée ni n'efface un jour : les jours sont **monotones** (jamais avant le jour du dernier événement déjà attribué) et un jour calendaire « sauté » par un changement vers l'est prend la cause `travel` (neutre pour la série).

### 3.2 Attribution d'un événement à un jour

```ts
function attribute(e, ctx): { day; late } | Reject {
  if (e.occurredAt > e.receivedAt + 5 * MIN) return reject("in_future");
  if (e.receivedAt - e.occurredAt > 7 * DAY) return reject("too_old");
  if (e.occurredAt < ctx.servedAt(e) - 1 * MIN) return reject("before_served");
  const tz = ctx.timeZoneAt(e.occurredAt);            // journal des fuseaux, règle des 48 h
  let day = learningDay(e.occurredAt, tz);            // packages/core/src/dates.ts
  const floor = ctx.lastAttributedDay(e.deviceId, e.seq); // jour du précédent événement de l'appareil
  if (floor && day < floor) day = floor;              // monotone : ni retour arrière ni doublon de jour
  const late = e.receivedAt - e.occurredAt > 72 * HOUR;
  return { day, late };
}
```

### 3.3 Lot reçu en retard

| Délai à la réception | XP | Anneau, semaine, série, gel |
|---|---|---|
| ≤ 72 h | inscrite, `day` = jour de l'action | comptée ; un gel consommé par erreur sur ce jour est rendu au recalcul ; la série se recalcule |
| 72 h – 7 j | inscrite avec `day` = **jour de réception** (borne SQL `[jour serveur − 3, + 1]` respectée), `meta.occurredDay` = jour de l'action, `meta.late = true` ; plafonds appliqués sur le jour de l'action | **non comptée** : ni anneau, ni objectif de semaine, ni validation ; le gel déjà consommé le reste |
| > 7 j | refus `too_old` (les tentatives restent dans la réserve des rejets du client) | — |

Bilan ou accueil, une fois : « 34 XP synchronisées en retard ont été ajoutées à ton historique du 12 novembre. » Pas de mention de série.

## 4. Série

**But** : installer l'habitude. **Comportement récompensé** : revenir pour du vrai travail, même court.

### 4.1 Règles

| Élément | Règle chiffrée |
|---|---|
| Jour validé | `streakXp(jour) ≥ 20` (lignes non `late`), **ou** une séance `daily` complète ce jour-là, quelle que soit sa durée |
| Mode | `daily` (défaut) ou `weekly` ; proposé à J3 (première ouverture d'un 3e jour actif) ; changement effectif le lundi suivant 04:00 |
| Jours de repos (mode quotidien) | 0 à 2 jours de semaine fixes ; non travaillé = neutre (ni +1, ni gel) ; travaillé et validé = +1 ; changement effectif **le lendemain**, jamais rétroactif |
| Gel offert | lundi 04:00 : +1 si le stock est < 2 |
| Gel gagné | lundi 04:00, avant le gel offert : +1 si l'objectif de la semaine close est atteint et le stock < 3 |
| Stock | 3 au plus ; 1 gel à la création du compte (et à la bascule pour les comptes migrés) ; aucun gel ne s'achète |
| Consommation | automatique, sur le premier jour clos non validé, non neutre, si la série courante > 0 ; jour gelé = neutre (pas de +1) |
| Réparation | jour manqué M non couvert : une séance `catch_up` complète sur le jour M+1 ou M+2, ce jour étant lui-même validé par son propre travail, et les jours entre M et la réparation couverts ; M compte alors +1 ; **1 réparation par 30 jours** (`last_repair_day`) |
| Mode semaines | semaine validée si jours validés ≥ cible (2 à 7, défaut 4) ; ni gel, ni réparation, ni repos ; la semaine en cours compte dès que la cible est atteinte |
| Série coupée (`enabled = false`) | jours neutres, pas d'attribution ni de consommation de gel ; à la réactivation, la série reprend où elle était |
| Record | maximum atteint par la série courante, jamais diminué ; affiché sans comparaison |
| Jours provisoires | J−1 à J−3 restent recalculables (fenêtre de 72 h) ; un gel consommé sur ces jours est marqué « provisoire » côté données, pas à l'écran |

### 4.2 Recalcul déterministe (états dérivés)

Entrée : `learning_day` (statut brut de chaque jour : `validated`, `travel`, ou rien), `catch_up` complètes, historique des réglages daté (`setting_change` : mode, cible, repos, interrupteur, palier), objectif de semaine atteint par semaine, `today`. Aucune horloge lue : même journal → même état.

```ts
function recomputeStreak(days, history, catchUps, weekGoalMet, firstDay, today): StreakState {
  let freezes = 1, cur = 0, best = 0, lastRepair = null, curWeeks = 0;
  for (let d = firstDay; d <= today; d = addDays(d, 1)) {
    if (isoWeekday(d) === 1 && d !== firstDay) {          // lundi : clôture puis dotations
      const w = addDays(d, -7);
      if (history.enabledAt(w)) curWeeks = weekValid(w) ? curWeeks + 1 : 0; // calculé dans les deux modes
      if (history.enabledAt(d)) {
        if (weekGoalMet(w) && freezes < 3) freezes++;       // gagné
        if (freezes < 2) freezes++;                          // offert
      }
    }
    if (!history.enabledAt(d)) continue;                   // série coupée : neutre
    const s = days.status(d);
    if (s === "validated") { cur++; best = Math.max(best, cur); continue; }
    if (d === today) continue;                             // le jour en cours n'est jamais manqué
    if (s === "travel" || history.isRestDay(d)) continue;
    if (history.modeAt(d) === "weekly") {                  // marge dans la règle de la semaine
      if (!weekValid(weekOf(d)) && weekClosed(d, today)) cur = 0;
      continue;
    }
    if (cur === 0) continue;
    if (freezes > 0) { freezes--; emit("freeze_used", d); continue; }
    const r = catchUps.find((c) => c.day === addDays(d, 1) || c.day === addDays(d, 2));
    if (r && days.status(r.day) === "validated" && coveredBetween(d, r.day)
        && (lastRepair === null || diffInDays(lastRepair, r.day) >= 30)) {
      lastRepair = r.day; cur++; best = Math.max(best, cur); emit("streak_repaired", d); continue;
    }
    if (d < addDays(today, -2)) { emit("streak_reset", d, cur); cur = 0; } // sinon : réparable, en attente
  }
  return { current: cur, best, freezes, lastRepair, currentWeeks: curWeeks + (weekValid(weekOf(today)) ? 1 : 0) };
}
```

`weekValid(w)` = nombre de jours `validated` de la semaine ≥ cible en vigueur ce lundi-là. `emit` alimente les mesures, une fois par jour et par événement (idempotent au recalcul). Tests exigés : rejouer deux fois le même journal → même état ; ordre d'arrivée des lots indifférent ; voyage est-ouest et ouest-est ; changement d'heure ; lot tardif à 71 h et à 73 h.

### 4.3 Ce que voit l'utilisateur

- Compteur de jours, gels en petit (« 2 gels »), record. Mode semaines : « 6 semaines », pastilles de la semaine.
- Gel utilisé, une fois sur l'accueil : « Hier, un gel a couvert ta journée. Il t'en reste 1. » / "Yesterday a freeze covered your day. You have 1 left."
- Réparation possible, une fois, sur l'accueil (jamais dans une notification, jamais après 21:00) : « Hier n'a pas été compté. Une séance de rattrapage en plus de celle d'aujourd'hui le compte quand même. » / "Yesterday wasn't counted. A catch-up session on top of today's still counts it."
- Série remise à zéro : aucun écran dédié. À la première validation suivante, dans le bilan : « Nouvelle série : jour 1. Tes 23 jours précédents restent dans ton historique : 412 cartes réussies, 14 textes lus. » / "New streak: day 1. Your previous 23 days stay in your history: 412 cards recalled, 14 texts read." (si la série précédente < 2 jours : seulement « Nouvelle série : jour 1. »)
- **Garde-fous** : pas de compte à rebours, pas de mention de la série dans les notifications, aucune mention après 21:00, aucun mot « perdre », aucun personnage triste.
- **Désactivé** : compteur masqué partout, historique conservé, gels gelés (ni gagnés ni consommés).
- **Mesures** : `streak_day_validated` (heure locale, XP du jour), `freeze_granted` (`gift`/`earned`), `freeze_used`, `streak_repaired`, `streak_reset` (longueur), `streak_mode_changed`, `rest_days_changed`.
- **Série de semaines au jalon 2 : oui.** Le choix est proposé à J3 (`c-game-design.md` §4), donc dans la fenêtre du jalon 2 ; la règle est une simple fonction du même journal. Jours de repos : oui, même raison.

## 5. Anneau (objectif du jour) et objectif de semaine

**But** : une ligne d'arrivée claire. **Comportement récompensé** : finir le travail prévu, quelle que soit sa forme.

| Palier (libellé) | XP | Disponible au J2 |
|---|---|---|
| 10 min | 50 | oui |
| 15 min | 75 | oui (**défaut**, durée de séance par défaut) |
| 20 min | 100 | oui |
| 30 min | 150 | oui |
| 45 min | 220 | non : inatteignable sans bibliothèque (une séance de 30 min ≈ 170 XP) ; ouvert au J3 |

- Palier par défaut = celui de la durée de séance choisie. Remplissage : `ringXp` du jour, lignes non `late`, toutes langues ; détail par langue au toucher.
- Changement de palier : effectif **le lendemain** (`setting_change.effective_day = jour + 1`) ; plusieurs changements le même jour : le dernier l'emporte.
- **Objectif de semaine** = 5 × palier en vigueur le lundi 04:00, figé pour la semaine. Affiché en sept pastilles et quatre segments (part de chaque volet dans l'XP de la semaine).
- **Hors ligne** : le client calcule l'anneau avec le même `core`, trait grisé « provisoire » ; l'XP qui attend l'IA (`production.*`, `rewrite.*`) n'y entre pas tant qu'elle n'est pas confirmée (« en attente de correction ») : l'anneau ne recule donc jamais à la synchronisation, sauf triche.
- **« Baisser l'objectif »** : proposé **une seule fois par compte**, à l'ouverture suivante, si les 14 derniers jours clos (même palier tout du long, jours de repos exclus) ont 0 anneau complet **et** au moins 4 jours avec de l'XP (sinon l'absence relève de la reprise, pas de l'objectif). Proposition : palier juste en dessous ; aucune au palier de 10 min. Texte : « Ces deux semaines, tes journées tournent autour de 40 XP. Passer à un objectif de 50 XP (10 min) ? » [Oui, ajuster] [Garder 75] / "These two weeks your days have been around 40 XP. Switch to a 50 XP goal (10 min)?" [Yes, adjust] [Keep 75].
- **Garde-fous** : pas de bonus au-delà de 100 % ; l'anneau plein ne pousse pas à continuer (pas de « +20 % ! ») ; une seule célébration de niveau 3 par jour pour l'anneau.
- **Désactivé** : anneau et objectif de semaine masqués ; les gels gagnés ne s'obtiennent plus (le gel offert du lundi reste) ; séance et bilan inchangés.
- **Mesures** : `goal_set` (palier, source : défaut/réglage/proposition), `goal_reached` (heure), `week_goal_reached`, `goal_lower_proposed`, `goal_lower_accepted`.

## 6. Bilan de fin de séance

**Contenu, dans cet ordre** (un écran, défilable, un seul bouton « Terminer ») :

1. Célébration du jour (niveau 3, ≤ 3 s, fusionne séance terminée + anneau complet + jour de série validé en une seule animation).
2. **Ce que tu sais maintenant** : nouvelles cartes passées en révision (5 au plus, puis « + 3 »), la phrase réécrite correctement.
3. **Erreur du jour** : celle qui reviendra demain, en une ligne.
4. **Demain** : « 18 cartes, environ 4 minutes ».
5. **XP du jour**, ligne par ligne par règle, zéros expliqués (§1), à côté du taux de réussite des rappels (« 21 / 25 rappels réussis »). Masqué si « XP visible » est coupé.
6. Anneau, pastilles de la semaine, ligne de série (« Jour 12 ») — chacun seulement s'il est activé.
7. Volets couverts aujourd'hui (4 segments).
8. Messages à usage unique en attente (nouvelle série, XP tardive, proposition des sons après la 1re séance, demande de notification après la 2e).

**Hiérarchie du jalon 2** (au plus **une** célébration de niveau 4 par séance ; les autres attendent la séance suivante, et disparaissent si elles ont plus de 7 jours) :

| Niveau | Moments du J2 | Forme |
|---|---|---|
| 1 | Bonne réponse | Coche (+ son si activé) |
| 2 | Étape validée | Petite animation dans la barre de progression |
| 3 | Séance terminée, anneau complet, jour de série validé | Animation du bilan, ≤ 3 s, une par séance |
| 4 | Objectif de semaine atteint ; série de 7, 30, 100, 365 jours (ou 4, 12, 52 semaines) | Carte plein écran **avant** le bilan, un toucher pour passer. Priorité : objectif de semaine > palier de série |
| 5 | (jalon 6) | — |

**Célébrations réduites** : tout passe au niveau 1-2, le bilan reste. **Mesures** : `celebration_shown` (niveau, motif), `celebration_deferred`, `bilan_closed` (durée d'affichage).

### 6.1 Sons

- Événements : bonne réponse, réponse fausse (son neutre, jamais punitif), étape validée, séance terminée. Aucun son pendant la voix de synthèse ou un audio de leçon ; aucun son de « perte ».
- **Coupés par défaut.** Fin de la 1re séance, une seule fois : « Tu veux entendre un petit son à chaque bonne réponse ? » [Oui] [Non merci]. Volume 3 niveaux (défaut 2). Haptique : réglage masqué sur iOS (pas d'API de vibration en PWA), désactivée par défaut ailleurs.
- **Mesures** : `sound_offer_answered`, `sound_toggled`, `haptics_toggled`.

## 7. Notification quotidienne

### 7.1 Règles

| Règle | Valeur |
|---|---|
| Nombre | 1 par jour au plus, à l'heure choisie (défaut proposé **19:00**), fuseau accepté du profil |
| Fenêtre d'envoi | `[heure, heure + 30 min]` (cron toutes les 15 min) ; manquée → rien ce jour-là |
| Plage interdite | 21:30 – 08:00 : rien n'y part, sauf si l'heure choisie s'y trouve (alors seulement à l'heure choisie, pas en rattrapage) |
| Rien si | journée déjà validée (règle du §4.1, même si la série est coupée) ; jour de repos ; séance du jour déjà commencée dans les 2 h précédentes |
| Dimanche | le **résumé hebdomadaire** remplace le rappel et part même si la journée est validée ; s'il y a eu 0 jour actif dans la semaine, il n'y a pas de résumé, le rappel normal s'applique |
| Ignorée | non ouverte **et** aucune séance commencée avant la fin du jour d'apprentissage |
| 5 ignorées de suite | passage à 1 par semaine (le dimanche, à l'heure choisie) ; la première hebdomadaire porte le texte n° 8 |
| 3 hebdomadaires ignorées de suite | arrêt complet (`mode = paused`) jusqu'à réactivation dans les réglages ; une carte unique dans l'app le dit |
| Remise à zéro du compteur | ouverture d'une notification, ou séance commencée le jour de l'envoi |
| Retour au quotidien | jamais automatique ; proposé une fois dans l'app après 3 séances en 7 jours en mode hebdomadaire |

**Demande de permission.** Dans le bilan de la **2e séance terminée**, uniquement si l'app est lancée en mode installé (`display-mode: standalone`) : carte « Un rappel par jour, à l'heure de ton choix ? » avec sélecteur d'heure (19:00) → [Activer] déclenche la demande du système (geste de l'utilisateur) ; [Pas maintenant] → reproposée une seule fois 7 jours plus tard, puis seulement dans les réglages. Dans Safari non installé : même moment, carte « Ajoute l'app à ton écran d'accueil pour recevoir un rappel » avec les trois gestes, une fois. Jamais à l'ouverture de l'app.

### 7.2 Textes autorisés (ICU ; un identifiant par texte, jamais le même deux jours de suite)

| # | Quand (priorité décroissante) | fr | en |
|---|---|---|---|
| 1 | Production d'hier corrigée, réécriture non faite | « Ta production d'hier est corrigée : {n, plural, one {# phrase} other {# phrases}} à réécrire. » | "Yesterday's writing is corrected: {n, plural, one {# sentence} other {# sentences}} to rewrite." |
| 2 | Retour après ≥ 3 jours sans séance | « Une séance courte de 10 minutes est prête. » | "A short 10-minute session is ready." |
| 3 | Erreur d'hier à retravailler | « Hier, tu as corrigé une tournure difficile. On la revoit aujourd'hui ? » | "Yesterday you fixed a tricky phrase. Want to see it again today?" |
| 4 | Texte du jour prêt | « Ton texte du jour est prêt : {min} minutes sur {theme}. » | "Today's text is ready: {min} minutes on {theme}." |
| 5 | ≥ 5 cartes dues | « {n} cartes t'attendent, environ {min} minutes. » | "{n} cards are waiting, about {min} minutes." |
| 6 | Mots capturés la veille | « Les {n} mots d'hier reviennent aujourd'hui. » | "Yesterday's {n} words come back today." |
| 7 | Sinon | « Ta séance de {min} minutes est prête. » | "Your {min}-minute session is ready." |
| 8 | 1re notification hebdomadaire | « Désormais, un seul rappel par semaine. Ta séance est prête quand tu veux. » | "From now on, one reminder a week. Your session is ready whenever you are." |
| 9 | Résumé du dimanche | « Cette semaine : {texts} textes lus et {words} mots nouveaux. » | "This week: {texts} texts read and {words} new words." |
| 10 | Résumé du dimanche (sans texte lu) | « Cette semaine : {days} séances et {rewrites} phrases réécrites. » | "This week: {days} sessions and {rewrites} sentences rewritten." |

**Interdit** (test automatique sur les messages) : série, gel, « perdre », « dernière chance », compte à rebours, « tu nous manques », comparaison, point d'exclamation multiple, emoji.

**Mesures** : `push_permission_prompted`, `push_permission_result` (granted/denied/dismissed), `push_install_prompted`, `push_sent` (template), `push_opened`, `push_ignored`, `push_ignored_streak` (compteur), `push_mode_changed` (daily/weekly/paused/off), `push_subscription_expired` (404/410 : seul signal approchant d'une désinstallation en PWA).

## 8. Réglages et interrupteurs du jalon 2

Dans `profile.game_settings` (schéma Zod fermé) ; tout changement est aussi écrit dans `setting_change` (ajout seul, `effective_day`) pour que le recalcul soit rejouable.

| Clé | Valeurs | Défaut | Effet |
|---|---|---|---|
| `xpVisible` | bool | `true` | XP masquée partout ; l'anneau montre un pourcentage ; le calcul continue |
| `ring.enabled` / `ring.tier` | bool / 10, 15, 20, 30 | `true` / durée de séance | §5 ; effectif le lendemain |
| `streak.enabled` | bool | `true` | §4.3 |
| `streak.mode` / `streak.weeklyTarget` | `daily`/`weekly` ; 2-7 | `daily` ; 4 | effectif lundi 04:00 |
| `streak.restDays` | 0-2 jours ISO (1-7) | aucun | effectif le lendemain |
| `celebrations` | `full`/`reduced` | `full` | §6 |
| `sound.enabled` / `sound.volume` | bool / 1-3 | `false` / 2 | §6.1 |
| `haptics` | bool | `false` (masqué sur iOS) | §6.1 |
| `notifications.enabled` / `time` / `weeklySummary` | bool / HH:mm / bool | `false` jusqu'à permission / 19:00 / `true` | §7 ; `time` dans `profile.reminder_time` |
| `answerTolerance.accents` | `strict`/`lenient` | `lenient` | `review.production` |

## 9. Anti-triche du jalon 2

| Abus plausible | Parade serveur |
|---|---|
| Envoyer de l'XP, un score ou `correct: true` | schémas stricts, aucun champ de valeur accepté ; correction avec la clé serveur |
| Rejouer un lot | `client_event_id` unique ; doublon identique accepté sans effet, différent refusé |
| Même réponse sous un nouvel identifiant | carte, item, texte comptés une fois par jour (clé `user × objet × jour`) |
| Réviser des cartes non dues, bachoter | 0 XP hors échéance ; étapes intra-journée sans XP |
| Créer en masse des cartes nouvelles | limite quotidienne de nouvelles cartes appliquée par le serveur ; une carte supprimée puis recréée sur le même lemme reste la même clé du jour |
| Robot qui répond vite | 600 / 1 000 ms minimum ; signal `suspect_speed` si médiane < 800 ms et réussite ≥ 98 % sur ≥ 50 rappels du jour (gardé pour la ligue du J7, sans effet visible au J2) |
| Lire les clés du paquet hors ligne | recorrection serveur ; plafonds : gain maximal ≈ 120 + 100 + 40 XP, le même qu'un apprenant parfait |
| Défiler un texte jusqu'au bout | durée ≥ mots ÷ 400/min ; ≥ 3 questions corrigées ; texte relu = 0 |
| Copier le texte source ou une ancienne production | similarité < 0,50 ; longueur ≥ seuil ; langue détectée |
| Faire écrire par un traducteur | indétectable : plafond 2 productions/jour (30 XP) ; signal `composeMs` < 5 s pour 60 mots |
| Recopier la version native en réécriture | 3 XP au lieu de 5 ; 2 phrases/production |
| Passage de fluidité « défilé » | ≤ 400 mots/min, ≥ 10 s, texte déjà compris |
| Antidater pour sauver un jour | `before_served`, fenêtre 72 h, jours monotones, `late` hors série |
| Changer de fuseau pour gagner un jour | 1 changement / 48 h ; jours sautés neutres, jamais doublés |
| Déclarer un jour de repos après coup | effectif le lendemain, historique daté |
| Enchaîner les séances pour le bonus | `session.complete` 1/jour ; rattrapage 1/30 jours et sans bonus |
| Bricoler l'anneau provisoire | le serveur fait foi ; l'anneau affiché est remplacé à la synchronisation |

## 10. Profils simulés (barème du jalon 2 seul)

Hypothèses : une séance par jour au format choisi, 6 jours actifs sur 7, réussites réalistes, pas de séance de rattrapage.

| Poste | A — A2, 10 min (palier 50) | B — B1, 15 min (palier 75) | C — B2, 30 min (palier 150) |
|---|---|---|---|
| Révisions | 15 cartes, 12 réussies : 6 × 1 + 4 × 2 + 2 × 2 = 18, + 1 reconquête = **19** | 25 cartes, 21 réussies : 8 × 1 + 9 × 2 + 4 × 2 = 34, + 2 bonus = **36** | 45 cartes, 40 réussies : 10 × 1 + 22 × 2 + 8 × 2 = 70, + 4 bonus = **74** |
| Lecture | 150 mots, 67 % = **15** | 300 mots, 75 % = **15** | 700 mots, 100 % = 20 × 1,5 = **30** |
| Atelier (A : un jour sur deux) | 4 + 1 au 2e essai = 9 → **4,5** en moyenne | 5 + 1 = **11** | 7 + 1 = **15** |
| Expression | 15 + 1 réécriture = **20** | 15 + 2 réécritures = **25** | 15 + 2 réécritures = **25** |
| Erreur du jour | **3** | **3** | 2 × 3 = **6** |
| Élan (A : un jour sur deux) | 5 → **2,5** | **5** | 2 passages = **10** |
| Séance complète | **10** | **10** | **10** |
| **Jour** | **≈ 74** (148 % du palier) | **105** (140 %) | **170** (113 %) |
| **Semaine** (6 jours) | **≈ 444** (objectif 250) | **630** (objectif 375) | **1 020** (objectif 750) |
| Jour validé dès | ~3 min de révisions (20 XP) | idem | idem |

**Profil « farm »** (45 min) : rejoue 60 cartes non dues (0), répond en < 600 ms aux 20 dues (0) puis devine les choix à 650 ms (≈ 5 justes : 5), défile 6 fois le texte en 20 s (durée insuffisante : 0, relectures : 0), envoie trois fois le texte source recopié (similarité : 0, donc ni réécriture ni étape d'expression), refait les items d'atelier (premier passage seulement, réponses au hasard : 3), pas de séance complète (étapes non validées : 0). **Total ≈ 8 XP**, sous le seuil de 20 : le jour n'est même pas validé. Un apprenant « au plafond » qui fait tout bien ne dépasse jamais 336 XP.

**Lecture** : l'anneau se ferme avec une séance normale (113 à 148 %), sans pousser à en faire plus ; C passe 3 fois plus de temps que A pour 2,3 fois plus d'XP.

## 11. Mesures à instrumenter (alignées sur `h-indicateurs.md`)

**Événements** (`ui_event`, liste fermée, ou dérivés du journal par le serveur) : `goal_set`, `goal_reached`, `week_goal_reached`, `goal_lower_proposed`, `goal_lower_accepted`, `streak_day_validated`, `freeze_granted`, `freeze_used`, `streak_repaired`, `streak_reset`, `streak_mode_changed`, `rest_days_changed`, `celebration_shown`, `celebration_deferred`, `bilan_closed`, `sound_offer_answered`, `sound_toggled`, `haptics_toggled`, `mechanic_toggled` (clé, valeur), `push_*` (§7), `xp_zeroed` (motif du §1).

**Compteurs de `metrics:report`** et dérives (`h-indicateurs.md` §2) :

| Mécanique | Dérive | Signal | Parade |
|---|---|---|---|
| XP | chasse aux actions rentables | rétention FSRS mesurée −5 points sur 4 semaines pendant que l'XP/jour monte ; part de `xp_zeroed = cap_reached` > 20 % des tentatives | revoir le barème de l'action ; rétention affichée dans le bilan |
| Série | séance minimale de fin de journée | > 50 % des jours validés entre 23:30 et 03:59 avec XP < 30 | proposer le mode semaines ; seuil de 20 XP |
| Série | anxiété, usage malgré la fatigue | 7 jours de suite validés à < 25 XP ; réglages de série ouverts puis refermés sans changement | proposer jours de repos ; aucune notification sur la série |
| Série | abandon après remise à zéro | part des comptes sans séance dans les 7 jours suivant `streak_reset` | revoir le texte et la réparation |
| Anneau | objectif hors de portée | taux d'atteinte < 30 % sur 14 jours | proposition « baisser l'objectif » |
| Célébrations | lassitude | `bilan_closed` < 1 s dans > 80 % des cas | réduire les niveaux 3-4 |
| Mécaniques | gêne | taux de `mechanic_toggled = off` par mécanique > 15 % des actifs | revoir le défaut |
| Notifications | harcèlement perçu | `push_mode_changed = off` ou abonnement expiré dans les 24 h d'un `push_sent`, par template | retirer le texte |

Toujours lus avec : rétention J1/J7/J30, achèvement des séances, rétention mesurée des cartes, taux de réécriture réussie.

## 12. Points à trancher

| # | Question | Recommandation | Pourquoi |
|---|---|---|---|
| G1 | Palier de 15 min absent de `c-game-design.md` §3.1 alors que le README (point 1) fixe 15 min par défaut | **Ajouter 15 min = 75 XP**, défaut ; masquer 45 min jusqu'au J3 | Cohérent avec 5 XP/min ; 220 XP est inatteignable au J2 |
| G2 | Gels : « stock maximal 2 » pour l'offert (`c-game-design`) contre « stock de 3 » (README) | **Les deux** : offert si stock < 2, gagné jusqu'à 3 ; 1 gel à la création du compte | Les deux textes se lisent ainsi sans contradiction ; un gel dès J1 évite une perte avant le premier lundi |
| G3 | Lot de plus de 72 h : `j2-architecture.md` le **refuse** (`too_old`) ; `c-game-design` §3.2 dit « XP inscrite, jour non validé » | **Accepter jusqu'à 7 j** (borne `attempt_occurred_bounds` déjà en base ; tranché par l'architecte le 2026-11-16), XP inscrite au jour de réception marquée `late`, hors anneau et série ; refus au-delà | `h-indicateurs.md` vise 0 tentative hors ligne perdue ; refuser jette aussi les révisions FSRS. La borne SQL `[−3, +1]` reste respectée |
| G4 | Historique des réglages : `streak_state.rest_days` ne garde que la valeur courante | **Table `setting_change` en ajout seul** (clé, valeur, `effective_day`) | Sans elle, le recalcul de la série n'est pas rejouable |
| G5 | Causes de `learning_day` | Ajouter **`travel`** et **`off`** (série coupée) aux causes de `j2-architecture.md` §3.3 | Jours neutres distincts de `rest` |
| G6 | Corrections du journal : `amount > 0` interdit l'écriture compensatoire prévue par `c-game-design` §6 | **Garder `> 0` au J2** ; ouvrir une règle `adjust.*` négative signée serveur seulement quand un cas réel l'exige | Le J2 n'a aucun cas de retrait ; moins de surface |
| G7 | Rendement au-delà de 150 rappels : « la moitié » sur des entiers de 1 XP | **Une réussite sur deux** rapporte (151e oui, 152e non) | Même moyenne, entiers seulement, déterministe |
| G8 | Erreur du jour : « erreur de la veille » | **Erreur des 7 derniers jours, pas encore retravaillée** | Un jour sans séance ne doit pas effacer l'exercice |
| G9 | Fluidité : `c-game-design` n'a pas de borne haute | **≤ 400 mots/min et ≥ 10 s** ; référence du 1er passage = vitesse de première lecture | Sans borne, défiler vaut 5 XP |
| G10 | Ordre du bilan : `c-game-design` §3.7 cite l'XP en premier | **Acquis d'abord, XP ensuite** | Principe 5 et besoin de compétence : la récompense renvoie à ce qu'on sait faire |
| G11 | Série coupée puis réactivée | **Reprise où elle était** (jours neutres) | Couper une mécanique ne doit rien coûter (principe 6) |
| G12 | Plafonds par utilisateur ou par langue | **Par utilisateur** | Un seul anneau ; sinon apprendre deux langues double les plafonds |
| G13 | Notification : définition de « ignorée », jour de l'hebdomadaire, nouvelle demande de permission | **Non ouverte et aucune séance le jour même ; dimanche ; une seule relance 7 jours après** | Règles absentes de `c-game-design`, à figer pour coder |
| G14 | Borne SQL d'XP par jour dans `ingest_batch` (« ex. 600 ») | **400** | Plafond théorique du J2 : 336 |
