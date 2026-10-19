# Plan de fonctionnalités — six idées

Statut : **en cours**. Phase A (teaser et accès sans compte) implémentée le 2026-10-19, en attente de validation : page `/decouvrir`, comptes anonymes Supabase, essai de 3 jours de mission puis compte requis (`/creer-mon-compte`), nettoyage automatique des invités inactifs depuis 30 jours. Durcissement anti-abus ajouté le 2026-10-19 (voir « Phase A — protection contre les créations en masse » plus bas). À faire avant publication : activer les connexions anonymes (*Anonymous sign-ins*) dans le projet Supabase hébergé, puis la protection CAPTCHA (étapes plus bas). Phase 1 (C, tests de niveau) implémentée le 2026-10-19, en attente de validation : banques de 60 questions pour les 19 langues, blocs de 5 questions par niveau (30 au plus), tirage aléatoire équilibré entre compétences, plus de variante courant / pro. Reste à faire avant publication : relecture native des banques.

Ce plan suit la règle du projet : une phase à la fois, chacune validée avant la suivante. Chaque phase se termine par la liste des fichiers modifiés, les commandes lancées, les tests réellement exécutés et leurs résultats.

## Phase A — protection contre les créations en masse

Trois protections contre les visiteurs qui créeraient des comptes invités en boucle (chaque mission d'invité appelle le modèle) :

1. **Limite par adresse IP du visiteur.** La connexion anonyme se fait dans le navigateur (`src/components/auth/guest-trial-form.tsx`, client `createBrowserClient` de `@supabase/ssr`), plus depuis le serveur : la limite de Supabase `anonymous_users` (30 par heure et par IP dans `supabase/config.toml`, réglable dans le tableau de bord, *Authentication → Rate Limits*) compte enfin chaque visiteur, et non plus l'IP du serveur Vercel partagée par tous.
2. **CAPTCHA Cloudflare Turnstile (optionnel).** Actif seulement si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` est défini : le formulaire charge `https://challenges.cloudflare.com/turnstile/v0/api.js` et envoie le jeton à `signInAnonymously({ options: { captchaToken } })`. La CSP (`src/lib/security/headers.ts`) n'a ni `script-src`, ni `frame-src`, ni `connect-src` : rien à ajouter tant que c'est le cas (un test le vérifie). Mise en place :
   - Cloudflare → *Turnstile* → ajouter un widget pour le domaine de production (et `localhost` pour les essais), mode *Managed*. Noter la clé de site (publique) et la clé secrète.
   - Vercel : `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<clé de site>` (Production et Preview), puis redéployer.
   - Supabase hébergé : *Authentication → Attack Protection* → activer *Enable Captcha protection*, fournisseur *Turnstile by Cloudflare*, coller la clé **secrète**. Attention : une fois activé, Supabase exige un jeton CAPTCHA aussi pour l'inscription, la connexion par mot de passe et la réinitialisation ; ces formulaires (actions serveur) n'en envoient pas encore. Avant d'activer, soit ajouter Turnstile à ces formulaires, soit accepter qu'ils soient bloqués. Activer d'abord la clé de site côté app, puis la protection côté Supabase.
   - Supabase local (`supabase/config.toml`) : section `[auth.captcha]` avec `enabled = true`, `provider = "turnstile"`, `secret = "env(SUPABASE_AUTH_CAPTCHA_SECRET)"`. Pour les essais, Cloudflare fournit des clés de test (site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`).
3. **Plafond global de missions d'invités.** Avant d'appeler le modèle, `prepareTodayMission` (`src/lib/data/supabase-repository.ts`) refuse une nouvelle mission d'invité si tous les invités ensemble en ont déjà lancé `GUEST_DAILY_MISSION_CAP` sur les dernières 24 h (300 par défaut, `off` pour aucun plafond). Le compte vient de la fonction `count_recent_guest_missions` (migration `20261019000300_guest_mission_cap.sql`, service role seulement). Une mission déjà commencée reste accessible ; les comptes complets ne sont pas concernés.

## Vue d'ensemble

| # | Idée | Existant dans le code | Effort estimé | Dépendances |
|---|------|-----------------------|---------------|-------------|
| A | Teaser et accès sans compte | `src/proxy.ts` redirige tout vers `/connexion` sauf une liste de chemins publics ; un mode démo existe déjà quand Supabase n'est pas configuré | Moyen | Aucune |
| B | Vocabulaire personnel (import de listes) | Section « Vocabulaire » avec statuts `learning` / `known` et répétition espacée | Faible à moyen | Aucune |
| C | Vrais tests de niveau | Module « test de niveau » (`/niveau`, `placement`) : la mémoire projet indique une version à 36 questions par langue, adaptative, non encore validée | Moyen (à vérifier) | Aucune |
| D | Revue de ce qui a été produit | Retour écrit (`feedback`) sur une branche non fusionnée ; rien de transverse | Moyen | C (pour la progression), retour écrit fusionné |
| E | Enregistrement audio et revue | Rien | Élevé | D (même écran de revue), choix d'un service de transcription |
| F | Section « Regarder / écouter » | Section « Lire et écouter » (`/lire`) avec sources et contenus par langue | Moyen | Règles de licence des sources |

## A. Teaser et accès sans compte

**Problème.** Aujourd'hui, tout chemin hors de `PUBLIC_PATHS` redirige vers `/connexion`. Un visiteur ne peut rien voir de l'app avant de créer un compte.

**Objectif.** Un visiteur découvre l'app avant de s'inscrire, puis peut en profiter sans compte, sans perdre son travail en cas de changement d'appareil.

**Pistes.**
1. *Page d'accueil publique (teaser)* : présentation, exemples de contenus réels ou fictifs, bouton « Essayer ». Pas de données personnelles. Ajouter `/` et les pages de teaser à `PUBLIC_PATHS`.
2. *Essai sans compte* : deux variantes à trancher.
   - **2a. Connexion anonyme Supabase** : l'utilisateur a un compte « anonyme » persistant. Il peut le transformer en compte complet plus tard sans perte. Les RLS restent valables. Demande l'activation de l'option côté projet Supabase.
   - **2b. Mode invité local** (stockage navigateur) : aucune donnée côté serveur, mais tout disparaît si le navigateur est vidé ou si on change d'appareil. Simple, mais fragile et sans progression fiable.
3. *Mission démo* : une mission d'exemple (sans appel au modèle, à partir du repli « template ») pour montrer le produit sans coût.
4. *Moment d'inscription* : demander le compte seulement quand l'utilisateur veut sauvegarder (fin de test, historique, vocabulaire).

**Points d'attention.**
- Coût : chaque visiteur anonyme peut déclencher une génération de mission (appel au modèle). Il faut une limite (une mission démo gratuite, puis compte requis).
- Abus : les comptes anonymes multiples doivent rester limités (limitation de débit à prévoir).
- Licences : le teaser ne doit montrer que des métadonnées et des extraits autorisés (voir la note de licence des contenus).
- Les pages `/connexion`, `/confidentialite`, etc. restent accessibles.

**Tests.** Un visiteur non connecté voit le teaser et n'est redirigé vers aucune page protégée sauf celles qui exigent des données personnelles. `proxy.test` (à créer) couvre la liste des chemins publics.

## B. Vocabulaire personnel (listes de mots)

**Objectif.** L'utilisateur ajoute ses propres listes (par exemple les mots d'un livre ou d'un cours) et les révise avec le même système de répétition espacée.

**Pistes.**
- Saisie manuelle (mot, traduction, exemple, langue).
- Import par collage (une ligne = `mot ; traduction`) et fichier CSV.
- Une « liste » regroupe les mots (nom, langue, description) : on peut la réviser, la désactiver ou la supprimer.
- Traduction automatique optionnelle via le modèle, avec validation de l'utilisateur avant enregistrement.
- Les mots personnels entrent dans la révision du jour avec un marquage visible (« ma liste »).

**Données.** Table `vocabulary_lists` (une par utilisateur) et lien depuis les entrées existantes. Migration avec RLS par utilisateur.

**Tests.** Import d'un CSV avec erreurs (lignes ignorées et signalées), révision d'une liste, isolation entre utilisateurs (test d'intégration RLS).

## C. Vrais tests de niveau

**Constat.** Le module de test de niveau existe sur une branche (`phase-3-placement-test`, d'après la mémoire projet, à vérifier). Les banques de questions ont été rédigées par le modèle et **doivent être relues par un natif** avant d'être publiées. Le « deux questions » que vous décrivez correspond probablement à la version actuellement en production.

**Objectif.** Un test qui donne un niveau fiable (CECR A1 à C2) par langue, en une dizaine de minutes.

**Pistes.**
- Banque suffisante par langue (36 questions par langue et par variante dans la version actuelle), tirage adaptatif : la difficulté suit les réponses.
- Compétences couvertes : grammaire, vocabulaire, compréhension. La production (écrite ou orale) pourrait être ajoutée via D ou E.
- Résultat : niveau estimé, degré de confiance, points forts et faibles, et recommandation de mission.
- Retest possible tous les X jours, avec historique de progression sur `/niveau`.

**Points d'attention.** Qualité des questions (relecture native, une par langue). Un test « maison » ne vaut pas une certification : le texte doit le dire.

**Tests.** Moteur adaptatif (domaine pur, sans React ni Next) : tests unitaires sur des suites de réponses simulées.

## D. Revue de ce qui a été produit

**Problème.** L'app génère la mission du jour, mais l'utilisateur ne revoit pas ce qu'il a écrit, ni les corrections, ni sa progression.

**Objectif.** Un journal de production : tout ce que l'utilisateur a écrit (et plus tard dit) au fil des missions, avec corrections et évolution.

**Pistes.**
- Page « Mes productions » : liste par date et par langue, texte original, correction, commentaire.
- Filtre par langue, par type d'exercice, recherche.
- Vue « évolution » : erreurs récurrentes (temps, accord, vocabulaire) et leur fréquence dans le temps.
- Transformer les erreurs récurrentes en mini-exercices, ajoutés à la révision.

**Données.** S'appuie sur la table `writing_feedback` de la branche « retour écrit ». À vérifier : la branche n'est pas encore fusionnée.

**Tests.** Affichage d'un historique vide, d'une production avec correction, filtre par langue (test de composant).

## E. Enregistrement audio et revue

**Objectif.** L'utilisateur parle dans la langue, réécoute son enregistrement et le compare à un modèle ou à une transcription corrigée.

**Pistes.**
- Enregistrement dans le navigateur (`MediaRecorder`). Sur iPhone, vérifier le support dans la PWA (historiquement limité : à tester tôt, en phase de faisabilité).
- Transcription : Claude ne fournit pas de reconnaissance vocale. Il faut un service dédié (à choisir : coût, langues couvertes, respect de la vie privée).
- Correction : la transcription est envoyée au même flux de correction que D.
- Revue : lecture, marqueurs de temps sur la transcription, réécoute d'un passage précis.

**Points d'attention.**
- Vie privée : la voix est une donnée personnelle sensible. Stockage chiffré, durée de conservation, suppression sur demande, mention dans la politique de confidentialité.
- Stockage : prévoir un bucket Supabase privé et une limite de taille et de durée (par exemple 2 minutes par enregistrement).
- Coût : transcription facturée à la minute, à intégrer dans les limites par utilisateur.

**Tests.** Test manuel sur iPhone (obligatoire), test d'intégration sur le stockage, test unitaire sur les limites de durée.

**Phase de faisabilité recommandée** avant de s'engager : prototype d'enregistrement sur iPhone et une transcription sur 5 minutes de parole, pour mesurer qualité et coût.

## F. Section « Regarder / écouter »

**Objectif.** Même logique que « Lire et écouter » : contenus par langue, filtres, catégories, avec la même présentation.

**Pistes.**
- Sources : flux RSS de podcasts et de chaînes publiques, ou transcriptions. Les vidéos et podcasts sont souvent sous licence : seuls les **métadonnées et extraits** autorisés doivent être affichés, avec un lien vers la source (cohérent avec la politique de contenu du projet).
- Lecture : lecteur intégré ou lien ouvrant la source. Une transcription synchronisée est une option plus lourde.
- Mission : un type de contenu « vidéo / audio » est ajouté au générateur, avec la même licence par source.

**Points d'attention.** La licence de chaque source est à vérifier avant ajout. Ne pas héberger de médias.

**Tests.** Même jeu de tests que `/lire` (liste, filtre par langue, contenu sans licence exclu).

## Ordre proposé

Chaque ligne est une phase, validée avant la suivante.

Ordre décidé (2026-10-19), révisé après les réponses de l'utilisateur :

1. **C — Tests de niveau** : relecture native des banques, fusion. Un test court (une quinzaine de questions) donne un niveau CECR par langue. C'est la base de la personnalisation, donc de l'incitation au compte.
2. **A — Teaser et accès sans compte** : une mission anonyme, puis invitation à créer un compte pour personnaliser (voir décisions ci-dessous).
3. **D — Revue des productions** : retour complet (points forts, points à améliorer, formulation d'un natif) et erreurs récurrentes transformées en exercices.
4. **B — Vocabulaire personnel** : saisie et collage, traduction automatique relue par l'utilisateur.
5. **F — Regarder / écouter** : YouTube en priorité, podcasts et sites d'information ensuite, sous réserve de licence.
6. **E — Audio** : précédé d'une phase de faisabilité. Sans stockage des voix (voir décision 4).

## Décisions de l'utilisateur

1. **Vocabulaire** : import par saisie ou collage. Traduction automatique oui, avec relecture avant enregistrement.
2. **Tests de niveau** : résultat CECR par langue. Une quinzaine de questions est jugée trop courte ; le plan vise un test adaptatif d'une trentaine de questions (environ 10 minutes), tiré dans une banque d'au moins 60 questions par langue pour limiter les répétitions. La production écrite ou orale reste hors du test initial ; elle viendra via D.
3. **Revue** : retour complet sur tout ce qui est produit (ce qui est bien, ce qui doit être amélioré, ce qu'un natif dirait à la place). Les erreurs récurrentes deviennent des exercices.
4. **Audio** : pas de stockage des voix. Deux options à distinguer :
   - *Réécoute simple* : le fichier reste dans le navigateur le temps de la session, sans envoi à un tiers et sans traitement. Aucune correction du texte.
   - *Transcription* : la voix est envoyée à un service de reconnaissance vocale pour produire un texte corrigeable, sans stockage de l'audio. Le fournisseur est un sous-traitant : il doit être mentionné dans la politique de confidentialité, et sa politique de conservation doit être vérifiée.
   - Choix retenu : transcription éphémère (audio non conservé, texte seul enregistré), suivie d'une correction, et réécoute pendant la session.
   - Contrainte : le fournisseur de transcription doit être choisi sans conservation ni réutilisation des données pour l'entraînement, et mentionné dans la politique de confidentialité.
5. **Regarder / écouter** : YouTube surtout, podcasts éventuellement, sites d'information possibles. Licence à vérifier pour chaque source.
6. **Accès sans compte** : l'utilisateur veut faire une mission sans compte, voir l'ensemble des fonctions, et être invité à créer un compte pour personnaliser. Recommandation : compte anonyme Supabase (2a), pour que la mission faite sans compte soit conservée lors de la création du compte. Une mission par jour pendant quelques jours (nombre à fixer, trois jours proposés), puis création de compte obligatoire, avec limitation d'abus. Préférences par défaut tant que l'utilisateur n'a pas de compte.
7. **Priorité** : ordre ci-dessus, laissé à l'appréciation du plan.

## Questions ouvertes

- ~~Nombre de jours de mission gratuite~~ : tranché, 3 jours distincts (`GUEST_TRIAL_DAYS`).
- Choix du fournisseur de transcription (phase E).

## Hors périmètre de ce document

- Choix du fournisseur de transcription et tarifs : à faire à la phase E, après le prototype.
- Modèle économique et limites payantes : à traiter avec la politique de contenu et de licence.
