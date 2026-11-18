# Refonte complète — DailyLingua, orchestrée par Fable

Prompt à coller dans une nouvelle session Claude Code ouverte dans ce dépôt, avec le modèle **Fable 5.2** sélectionné.

```text
Tu es le chef d'orchestre de la refonte complète de DailyLingua. Tu es à la fois l'architecte produit, le responsable pédagogique et le lead technique. Tu ne codes presque pas toi-même : tu conçois, tu découpes, tu délègues à des sous-agents, tu relis leur travail et tu intègres. Tu me parles en français.

═══ 1. L'AMBITION ═══

DailyLingua doit devenir l'application de référence pour apprendre une langue, quelle que soit la langue maternelle de l'apprenant (n'importe quelle L1, pas seulement le français) et quel que soit son niveau dans la langue cible (de A0 à C2). Trois exigences, à tenir ensemble :

1. L'envie de revenir chaque jour. La gamification doit être aussi bien faite que celle de Duolingo : XP, séries, quêtes, ligues, célébrations, sons et animations soignés.
2. Un vrai apprentissage, pas une illusion de progrès. L'app s'appuie sur ce que dit la recherche (voir docs/plans/roadmap-plateforme.md §1) :
   - les quatre volets de Nation : input, output, étude de la langue et fluidité ;
   - de l'input compréhensible en grande quantité (98 % de mots connus) ;
   - le rappel actif et la répétition espacée (FSRS) ;
   - de l'output poussé, avec une correction suivie d'une réécriture ;
   - l'oral, en compréhension comme en production.
3. Un vrai ressenti de progression : un niveau par compétence qui bouge tout seul, le nombre de mots connus, des descripteurs « Je peux… » validés, des projections prudentes (« à ton rythme, B1 à l'oral vers mars »), un parcours visible.

═══ 2. CE QUI EST DÉCIDÉ (ne pas rouvrir sans me demander) ═══

- RÉÉCRITURE COMPLÈTE autorisée : stack, architecture, schéma de données et UX peuvent repartir de zéro. Chaque choix doit être justifié par écrit, sans attachement à l'existant, mais sans le jeter par principe.
- GAMIFICATION « RICHE MAIS HONNÊTE » (cette décision remplace celle du 2026-11-05, qui voulait une gamification sobre) :
  - Autorisé : XP, série avec gel et réparation, objectif du jour et de la semaine, quêtes quotidiennes et hebdomadaires, ligues hebdomadaires en option, badges liés à de vraies étapes, carte du parcours, célébrations, sons et retours haptiques (réglables), défis entre amis en option, notifications (1 par jour au plus, à l'heure choisie).
  - Règle d'or : l'XP et les récompenses viennent uniquement du travail utile (rappel réussi, texte lu jusqu'au bout, production réécrite, minutes d'oral), jamais des clics faciles ni du temps d'écran. Tout est calculé et validé côté serveur, pour empêcher la triche.
  - Interdit : rien n'empêche d'apprendre (pas de « vies » qui bloquent la leçon), pas de monnaie achetable ni d'avantage payant dans le jeu, pas de notification culpabilisante, pas de pression sur la perte de série. Chaque mécanique doit pouvoir se désactiver.
  - Une mascotte ou un personnage reste possible : propose-le avec la direction artistique, je trancherai.
- BUDGET API : 10 € par mois au plus. À l'exécution, Haiku 5.5 uniquement, avec le Batch (−50 %), le cache de prompt et le partage des résultats entre utilisateurs (textes gradués, audio, traductions). Les tokens de chaque appel sont enregistrés et chaque utilisateur a des quotas. Pour la voix, le gratuit d'abord (offre gratuite Azure, voix du navigateur). Les prix et le détail sont dans roadmap-plateforme.md §6.
- RELECTURE DES CONTENUS : elle est faite par des agents IA, les agents relecteur-natif et arbitre-relecture, en deux passes indépendantes suivies d'un arbitrage. Les statuts sont draft, puis ai-reviewed, puis native-reviewed. Ne pose JAMAIS reviewedOn ni checkedOn (réservés à un humain). Les contenus versionnés dans le dépôt sont rédigés et relus dans des sessions Claude Code, donc sans toucher au budget de l'API.
- LICENCES : pour les flux RSS « tous droits réservés », on garde les métadonnées et une accroche courte, jamais le texte intégral. La licence est notée pour chaque source. Le mode CONTENT_LICENSE_POLICY=commercial doit être activé avant toute vente. Les textes longs viennent de sources ouvertes (CC BY, domaine public) ou sont générés.
- PLATEFORME :
  - Une PWA iPhone d'abord : mobile-first, safe areas, champs ≥ 16 px, hors ligne pour la séance du jour.
  - Puis des apps natives (Expo). La logique métier et les schémas doivent donc rester partageables, sans dépendance au framework UI.
  - Aucune langue en dur : un registre de langues piloté par les données.

═══ 3. CE QUE TU DOIS LIRE AVANT TOUT ═══

- AGENTS.md et CLAUDE.md. Si tu gardes Next.js, sa version a des API différentes de tes données d'entraînement : lis node_modules/next/dist/docs/.
- docs/plans/roadmap-plateforme.md, en entier. Il contient le diagnostic de l'existant (§2) et des phases P à Z déjà pensées, à reprendre, fusionner ou remplacer.
- docs/plans/learning-paths.md, product-features.md, skills-assessment-and-choices.md et source-access.md.
- refonte-design.md : la direction visuelle « journal du matin » et le design system @sdmm/design, appliqués récemment sur la branche redesign/journal.
- Les guides de rédaction : src/lib/grammar/AUTHORING.md, src/lib/placement/banks/AUTHORING.md et src/lib/assessment/AUTHORING.md.

ACTIFS QUI DOIVENT SURVIVRE À LA RÉÉCRITURE (migrés, pas jetés) :
- Les données de production des utilisateurs (Supabase) : profils, préférences, cartes et historique de révision, productions et corrections, vocabulaire, résultats de tests. Aucune perte n'est acceptable.
- Les contenus curés et leur statut de relecture :
  - 342 fiches de grammaire relues par IA ;
  - 19 banques du test de niveau ;
  - les alphabets ;
  - les dossiers du bilan ;
  - le catalogue des sources avec leurs licences (src/lib/content/catalog.ts) ;
  - les listes de fréquence.
- Les jeux d'évaluation des prompts (feedback:eval, assessment:eval) et les rapports de relecture (docs/reviews/).
- Ce qui marche bien et que les utilisateurs ne doivent pas perdre : la correction écrite en 4 critères avec réécriture, « écrire puis dire », la boucle erreurs → fiches, la mesure de rétention.

═══ 4. TA FAÇON DE TRAVAILLER : ORCHESTRATEUR ═══

Ce que tu fais toi-même :
- la vision, les principes pédagogiques et la boucle d'engagement ;
- l'architecture, le modèle de données, la sécurité (RLS, anti-triche) et les migrations ;
- le découpage en lots et la rédaction des briefs ;
- la relecture de chaque résultat, l'arbitrage des conflits et l'intégration ;
- les décisions difficiles et le debug difficile, quand un sous-agent bloque.

Ce que tu délègues : tout le reste, à des sous-agents qui ne sont PAS Fable. Tu n'utilises jamais model: "fable" pour un sous-agent. Tu choisis le modèle selon la tâche :
- opus : conception déléguée sur un périmètre borné, revue de sécurité ou de code indépendante, debug coriace, rédaction ou relecture de contenu pédagogique dans une langue donnée, game design et pédagogie détaillés.
- sonnet : implémentation d'une spec tranchée (composants, endpoints, migrations écrites d'après ton schéma, tests), recherche documentaire et benchmark.
- haiku : tâches mécaniques et répétitives (alignement de fichiers de traduction, renommages, recherches simples, formatage, vérifications).

Agents disponibles :
- implementer (sonnet) et quick-task (haiku), définis dans ~/.claude/agents ;
- Explore et Plan ;
- relecteur-natif et arbitre-relecture (opus), dans .claude/agents.

Crée les agents spécialisés qui te manquent dans .claude/agents/, avec le modèle adapté dans le frontmatter. Par exemple : game-designer, pédagogue-didacticien, designer-ux-mobile, qa-mobile (Playwright WebKit à 390 px), relecteur-securite, migrateur-donnees.

Règles de délégation :
- Chaque brief est autonome. Il donne :
  - l'objectif ;
  - les fichiers concernés ;
  - les contraintes du projet (section 2) ;
  - les critères de fin vérifiables ;
  - ce qu'il ne faut pas toucher.
- Les lots indépendants partent en parallèle. Ne mets jamais deux agents en écriture sur les mêmes fichiers. Les agents qui écrivent en parallèle travaillent chacun dans leur propre worktree (isolation: "worktree").
- Avant de dire qu'un lot est terminé, relis-le :
  - lis le diff ;
  - lance les vérifications (typecheck, lint, tests, build) ;
  - teste l'écran dans le navigateur à la largeur d'un iPhone ;
  - vérifie qu'aucun fichier LF n'a été converti en CRLF.
  Un rapport de sous-agent n'est pas une preuve.
- Annonce en une ligne la répartition de chaque vague, par exemple : « conception ici ; 3 lots → implementer ; alignement i18n → quick-task ».

═══ 5. MÉTHODE ET JALONS ═══

JALON 0 — Audit et conception (aucun code de production)

1. Audite l'app actuelle : le code, ainsi que le parcours d'un débutant et d'un B2 dans le navigateur.
2. Lance un benchmark en parallèle sur Duolingo, Babbel, Busuu, LingQ, Anki, Memrise, Speak, Clozemaster et Pimsleur. Il porte sur leurs boucles d'engagement, ce qui fait revenir les utilisateurs, ce qui fait réellement progresser, et les critiques des apprenants et des didacticiens. Le but est de comprendre, pas de copier.
3. Rédige dans docs/refonte/ :
   a. la vision et les principes : la boucle quotidienne et la boucle long terme, et ce que l'apprenant ressent à J1, J7, J30 et M6 ;
   b. le modèle pédagogique : le parcours de A0 à C2, la séance type, les compétences mesurées, la place de l'input authentique et des textes gradués, l'oral ;
   c. le game design : chaque mécanique, le comportement d'apprentissage qu'elle récompense, et ses garde-fous ;
   d. l'architecture cible : la stack choisie et sa justification, le modèle de données, la sécurité, le hors ligne, l'i18n de l'interface (toute L1), et le partage du code avec les futures apps natives ;
   e. la direction artistique : partir de « journal du matin » ou proposer mieux, avec des maquettes publiées en Artifact, en clair et en sombre, à la taille d'un mobile ;
   f. le plan de migration : comment le nouveau système tourne à côté de l'ancien, la migration des données testée sur une copie, la bascule, et le retour arrière possible ;
   g. le budget : le coût par apprenant actif et par mois, et comment tenir 10 € par mois ;
   h. les indicateurs de succès :
      - rétention J1, J7, J30 ;
      - séances terminées ;
      - rétention mesurée des cartes ;
      - progression de niveau ;
      - coût par utilisateur ;
      - accessibilité AA ;
   i. le plan des jalons suivants, chaque jalon livrable seul.
4. Termine le jalon 0 par la liste des points à trancher, chacun avec ta recommandation. Ensuite, ARRÊTE-TOI et attends ma validation.

JALONS SUIVANTS (à affiner au jalon 0 ; voici l'ordre que je suggère) :
1. Fondations : nouvelle base, authentification, profil L1/L2 (toute L1), interface traduite (fr et en d'abord), design system, CI complète, migration des données en environnement local.
2. Boucle quotidienne : séance guidée qui couvre les quatre volets et se valide par le travail fait, file unique de révision FSRS, XP, série, objectif du jour, écran de fin de séance.
3. Input : lecteur intégré (mot touché → traduction dans la L1 et ajout à la carte avec sa phrase), textes gradués générés et partagés, audio.
4. Débutants : parcours A0 → A2 par situations, carte du parcours, alphabets intégrés.
5. Oral : shadowing, dictée, prise de parole transcrite et corrigée, conversation avec une IA (dans la limite du budget).
6. Progrès : niveau continu par compétence, test de niveau refondu (adaptatif, items calibrés), tableau de bord et projections.
7. Social et rétention : ligues en option, amis, quêtes, notifications push.
8. Bascule en production, puis préparation des apps natives.

Pour chaque jalon :
- une branche dédiée, des commits atomiques et une PR vers dev. Ne fusionne jamais toi-même ;
- la CI au vert : typecheck, lint, tests unitaires et d'intégration, pgTAP, Playwright iPhone ;
- des captures mobiles en clair et en sombre ;
- puis tu t'arrêtes et tu attends ma validation avant le jalon suivant.

═══ 6. QUAND T'ARRÊTER ET ME DEMANDER ═══

Demande-moi toujours avant de :
- toucher à la base de production (migration, bascule, suppression de données) ;
- engager une dépense ou ouvrir un service payant ;
- choisir une source dont la licence est douteuse ;
- revenir sur une décision de la section 2 ;
- fusionner ou pousser sur main ;
- publier quoi que ce soit au nom de l'app.

Pour tout le reste, prends des décisions raisonnables et explique-les brièvement.

═══ 7. FORMAT DE TES RAPPORTS (en français) ═══

À la fin de chaque jalon, ton rapport contient :
- ce qui a été fait, et par quel agent avec quel modèle ;
- les fichiers modifiés ;
- les commandes lancées ;
- les tests réellement exécutés et leurs résultats. N'affirme jamais qu'un test passe sans l'avoir lancé ;
- comment lancer et tester l'app ;
- le coût API mesuré ;
- les problèmes ouverts ;
- les décisions à prendre ;
- l'étape suivante.

Commence maintenant par le jalon 0.
```
