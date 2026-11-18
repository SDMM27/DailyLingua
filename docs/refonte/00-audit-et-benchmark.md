# Jalon 0 — Audit de l'existant et benchmark

Date : 2026-11-12. Branche auditée : `redesign/journal` (commit `44b8b9d`). Ce document résume ce qui a été observé ; les décisions qui en découlent sont dans les documents `a` à `i`.

## 1. Comment l'audit a été fait

| Volet | Méthode | Limite |
|---|---|---|
| Code | Inventaire par un agent Explore (Sonnet), relu ; lecture directe des plans `docs/plans/` et de `learning-path.ts` | Les comptes de tests sont approximatifs (recherche par motif) |
| Parcours B2/C1 | Mode démo (`daily-lingua-demo`) à 375 × 812 : accueil, mission, vocabulaire, grammaire, alphabet, niveau | Données fictives, rien n'est enregistré |
| Parcours débutant | Lecture du code (`learning-path.ts`, `/bienvenue`, `e2e/new-user.spec.ts`) et écrans d'alphabet en démo | **Pas de parcours complet dans le navigateur** : l'essai invité n'a pas démarré dans le panneau d'audit (page non dessinée, fenêtre en arrière-plan). À refaire sur iPhone réel au jalon 1 |
| Benchmark | 3 agents Sonnet en parallèle, recherche web | Beaucoup de sources de seconde main ; chaque point non vérifié est marqué ci-dessous |

Incident rencontré : `@sdmm/design` était déclaré dans `package.json` mais absent de `node_modules` ; `npm install` l'a installé, puis il a fallu supprimer `.next/dev` (cache de build périmé). Aucun fichier suivi par git n'a changé.

## 2. État du code

**Stack.** Next.js 16.3.8, React 19.2, Supabase (`supabase-js` 2, `@supabase/ssr`), Tailwind 4, `@sdmm/design` 1.0.0, SDK Anthropic 0.133, Zod 4, Vitest 4, Playwright 1.64 (WebKit iPhone 13), pgTAP. Déploiement Vercel, tâches planifiées par GitHub Actions.

**Ce qui est solide et se garde.**
- `src/lib/domain` (25 fichiers) et `src/lib/schemas` (18 fichiers) n'importent ni Next ni React : ils sont déjà partageables avec une app native.
- 37 migrations, 30 tables, RLS sur 26, environ 36 fonctions RPC, 23 fichiers pgTAP (≈ 421 assertions). Les écritures sensibles passent déjà par des RPC ou le rôle de service.
- ≈ 1 300 tests Vitest, 5 specs Playwright, CI à deux jobs (vérifications + base locale).
- Contenus curés : 342 fiches de grammaire (19 langues, toutes `aiReview`), 19 banques de 60 questions, 6 alphabets, 12 dossiers de bilan (ru, it), catalogue de ≈ 62 sources avec licence, listes de fréquence wordfreq (19 langues).
- Appels IA centralisés (5 modules), Haiku 5.5 partout, quotas par utilisateur, jeux d'évaluation.

**Ce qui manque ou bloque.**

| Constat | Conséquence pour la refonte |
|---|---|
| Aucune i18n : textes en dur en français, `lang="fr"`, champs `*_fr`, prompts « for French speakers » | Toute l'interface et tous les schémas sont à paramétrer par L1 : c'est le coût principal d'un « simple » portage |
| Aucun service worker, aucun hors ligne, `public/` vide | Le hors ligne est à concevoir dès les fondations (file d'événements), pas à ajouter après |
| Leitner à jours entiers, trois tables de cartes presque identiques (`grammar_cards`, `alphabet_cards`, `correction_cards`) + `vocabulary_items` | Une table de cartes unique et FSRS horodaté |
| Pas de cache de prompt ni de Batch ; tokens journalisés pour 3 appels sur 5 | Un seul point d'appel IA qui journalise toujours |
| Progression de mission = cases cochées par le client | Passage à des tentatives corrigées par le serveur |
| `supabase-repository.ts` : 1 742 lignes, ≈ 60 méthodes | Découpage par domaine |
| Pas de micro (`microphone=()`), pas de reconnaissance, synthèse = voix de l'appareil | Oral à construire entièrement |
| Série de jours seule ; ni XP, ni objectifs, ni notifications | Gamification à construire entièrement |

## 3. Parcours observés

**Apprenant B2/C1 (démo, russe C1 + italien B2).** L'accueil « journal » est élégant et lisible. La mission propose un titre, une accroche en français, trois QCM qui portent sur l'accroche, cinq expressions, une production écrite, puis une liste d'étapes à cocher. Le texte original se lit hors de l'app (« Ouvrir sur ПостНаука »). Pour le podcast italien, l'app précise elle-même que les questions ne portent que sur le titre et l'accroche. La révision de vocabulaire (réponse tapée, modes mélangés) est le moment le plus « actif » de l'app. Rien ne marque la fin d'une séance, rien ne dit ce qui a été appris.

Ressenti : outil sérieux, mais on travaille *autour* d'un contenu qu'on n'a pas lu dans l'app. Le volet input est délégué à l'extérieur, la fluidité est absente, la récompense aussi.

**Débutant (d'après le code).** Après `/bienvenue`, un A1 dans une langue à écriture non latine est orienté vers l'alphabet (cartes par groupes de lettres, test « Tu lis déjà… ? »), puis vers 18 fiches de grammaire. La mission quotidienne reste bâtie sur des contenus authentiques, classés par fréquence lexicale de l'accroche pour limiter les dégâts. Il n'y a ni dialogue, ni phrases-clés, ni audio garanti, ni situation de communication. Un vrai débutant n'a donc rien à *faire* avec la langue pendant ses premières semaines : c'est le trou le plus grave pour la rétention.

## 4. Benchmark : ce qu'il faut retenir

Légende : **[S]** sourcé par l'agent, **[NV]** non vérifié à la source.

| App | Ce qui fait revenir | Ce qui fait progresser | Critique principale | Leçon pour nous |
|---|---|---|---|---|
| Duolingo | Série, gel de série, ligues, célébrations. Le gel augmente les actifs quotidiens ; l'animation de série améliore la rétention J7 ; les ligues : +17 % de temps d'apprentissage **[S, blog et ex-responsable croissance]** | Réception jusqu'à B1/B2 selon son propre PDG ; écrit et oral en retrait **[S]** ; presque toutes les études sont internes | Dérive des buts (XP/série avant l'apprentissage), nudges culpabilisants **[S, arXiv 2203.16175]** ; « énergie » qui se vide même sur une bonne réponse | Reprendre la série tolérante et les célébrations ; refuser tout ce qui bloque ; lier l'XP à une preuve d'apprentissage |
| Babbel | Leçons de ≈ 6 min, objectif personnel, peu de pression **[S]** | Contenu écrit par des didacticiens, tâches « can do », reprise des erreurs | Répétitif après B1, couverture CECR inégale selon la langue **[NV]** | Rigueur du contenu + descripteurs « Je peux » ; annoncer honnêtement la couverture par langue |
| Busuu | « 10 min par jour », correction par des natifs **[S]** | La seule avec de la production réellement corrigée | Retours lents et inégaux, plafond B2 **[NV]** | Correction immédiate par IA avec critères explicites ; l'humain en complément plus tard |
| LingQ | Lire ce qu'on a choisi ; mot touché → carte | Input massif | Compteur de « mots connus » déclaratif, limites changées sans prévenir **[S, forum]** | Reprendre le geste ; fonder « connu » sur la preuve (rappels réussis) ; afficher la couverture d'un texte avant lecture |
| Anki | La file due, rien d'autre | Rappel espacé ; FSRS bat SM-2 en prédiction sur 99,6 % de ≈ 10 000 collections **[S, benchmark open source — comparaison jugée imparfaite par son auteur]** | Avalanche de révisions, friction de création | Charge plafonnée, reprise douce après absence, cartes créées sans friction |
| Memrise | Vidéos de natifs | Faible preuve | Refonte de 2024 : cours communautaires et hors ligne retirés, réactions négatives **[S]** | Ne jamais retirer ce dans quoi l'utilisateur a investi ; migration sans perte |
| Clozemaster | Sessions courtes | Texte à trous sur phrases classées par fréquence | Intervalles fixes, interface chargée | Texte à trous, mais sur les phrases que l'apprenant a lues |
| Speak | Parler dès la première minute, sans témoin | Temps de parole élevé | Reconnaissance trop indulgente : un score parfait pour une phrase fausse **[S, revue d'un concurrent]** | Faire parler tôt ; un retour qui discrimine ; journal cumulatif des erreurs |
| Pimsleur | Rituel court, sans décision, utilisable sans écran | Rappel avec anticipation (produire avant d'entendre) | Monotone, vocabulaire étroit, pas d'écrit | L'anticipation coûte zéro avec de l'audio pré-généré ; l'adosser à l'écrit |

**Constat transversal.** Aucune de ces apps ne ferme la boucle complète *input compris → mots capturés → rappel espacé → production corrigée → oral*. Chacune excelle sur un maillon. L'opportunité de DailyLingua est de relier les maillons autour d'un même texte du jour, et d'afficher un progrès mesuré plutôt qu'un score d'activité.

**Preuves d'efficacité.** Aucune étude indépendante, contrôlée et de grande taille n'a été trouvée pour aucune de ces apps. Nous ne promettrons donc pas un niveau en une durée ; nous montrerons des mesures propres à chaque apprenant.

## 5. Faisabilité de l'oral dans une PWA iPhone

| Sujet | Constat | Décision de conception |
|---|---|---|
| Reconnaissance du navigateur | `webkitSpeechRecognition` existe dans Safari mais ne produit rien dans une PWA installée ; bug WebKit 225298 fermé sans correction **[S]** ; état sur iOS 26 **[NV]** | Ne pas en dépendre. Enregistrer avec `MediaRecorder`, transcrire côté serveur |
| `MediaRecorder` | Safari enregistre en `audio/mp4` ; permission micro parfois redemandée en mode installé **[S]** | Prototype sur iPhone réel dès le jalon 1 |
| Synthèse du navigateur | Voix variables selon la version d'iOS, régressions signalées **[S]** | Audio pré-généré et mis en cache ; voix de l'appareil en dernier recours |
| Azure Speech F0 | 0,5 million de caractères de voix neuronale et 5 h de reconnaissance gratuits par mois ; une seule reconnaissance à la fois **[S, page tarifaire]** | Suffit pour l'audio des textes partagés ; la reconnaissance doit rester courte et sous quota |
| Droits sur l'audio gratuit | Des réponses Microsoft réservent l'usage commercial de la sortie vocale aux offres payantes **[NV — contradictoire]** | **Point à trancher** avant toute vente (voir `i-jalons.md`) |
| Web Push | iOS ≥ 16.4, PWA installée, permission demandée depuis l'app **[S]** | Notifications possibles, à proposer après l'installation |
| Shadowing, dictée | Effets documentés sur la prosodie et la compréhensibilité, résultats non concluants sur les sons isolés ; pas de méta-analyse **[S, revue 2025]** | Les proposer comme entraînement, sans promettre un gain chiffré |

## 6. Ce que l'audit change par rapport à la feuille de route P à Z

1. Le multilingue (P), le hors ligne et la validation serveur du travail touchent **tous** les écrans : les ajouter phase par phase à l'app actuelle reviendrait à la réécrire deux fois. La réécriture est justifiée pour la couche application.
2. En revanche le domaine pur, la base (RLS, pgTAP), la CI et les contenus curés sont de bonne qualité : ils sont **repris et étendus**, pas jetés.
3. Le parcours débutant (R) et l'input dans l'app (Q) sont les deux manques qui coûtent le plus d'utilisateurs : ils passent avant le social.
