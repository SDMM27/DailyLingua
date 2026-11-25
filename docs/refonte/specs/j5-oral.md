# Jalon 5 — Oral : périmètre, décisions, découpage

Références : [plan des jalons](../i-jalons-suivants.md) (jalon 5), [modèle pédagogique](../b-modele-pedagogique.md) §6, [game design](../c-game-design.md) §2.1 (fait foi pour l'XP), [architecture](../d-architecture.md) §5 et §9 (fait foi pour les données et la sécurité), [budget](../g-budget.md) §4-6, [prototype iPhone](../prototype-iphone.md) §3-4.

**Livrable** : un apprenant parle chaque semaine et reçoit un retour qui discrimine.

## 1. Ce que l'apprenant fait

| Activité | Où | Vérification | XP (règle) | Coût API |
|---|---|---|---|---|
| **Anticipation** : le sens en L1 s'affiche, l'apprenant dit la phrase, puis l'entend | Atelier oral | Auto-évaluation, affichée « déclaré » | 0 | 0 |
| **Répéter** (shadowing) : écouter la voix native, répéter ; comparaison mot à mot avec le modèle | Atelier oral | Transcription de l'appareil comparée au modèle par le serveur | 1 par phrase si ≥ 60 % (`shadowing.sentence`), 30/jour | 0 |
| **Dictée** : écouter, taper | Atelier oral | Corrigée par le serveur, au caractère | 1 (≥ 80 %) ou 2 (≥ 95 %) (`dictation.sentence`), 30/jour | 0 |
| **Dire au lieu d'écrire** : la production de l'étape Expression, dite à voix haute | Séance, étape Expression | Transcription de l'appareil corrigée par la chaîne de correction existante | `production.corrected` (15, inchangé) | Celui d'une correction écrite, même quota (3/jour) |
| **Jeu de rôle** à tâches bornées (3 objectifs, 8 tours au plus), écrit ou à la voix | Écran Jeu de rôle | Bilan par Haiku : objectifs atteints, 3 erreurs, 3 tournures plus naturelles | `roleplay.completed` 15, 1/jour | ≈ 0,0025 $ par partie, 1/jour (g-budget §2) |

L'atelier oral se propose sur « Aujourd'hui » (carte secondaire, sous la séance) ; il dure 4 à 6 minutes : 6 phrases en anticipation puis répétition, puis 3 phrases en dictée. Une fois par semaine au moins, l'étape Expression s'ouvre en mode « Dire » si l'apprenant n'a pas parlé depuis 7 jours et que l'appareil sait reconnaître la langue ; il peut repasser en « Écrire » d'un geste.

## 2. Décisions prises sans le propriétaire

Le propriétaire a demandé d'enchaîner les jalons sans être consulté ; ces choix suivent la recommandation des documents ou, à défaut, la mienne. Chacun se renverse sans refonte.

1. **Transcription par la reconnaissance vocale de l'appareil** (`SpeechRecognition` / `webkitSpeechRecognition`), pour la répétition, la production orale et le jeu de rôle vocal. Le prototype l'a validée sur iOS 26.5 en PWA installée (russe reconnu exactement). Elle est gratuite, ne consomme pas les 5 h mensuelles d'Azure, et nous ne recevons jamais d'audio. **Azure (transcription serveur) n'est pas construit au jalon 5** : un navigateur sans reconnaissance (Firefox) obtient la répétition en auto-évaluation sans XP, et la production reste écrite. L'interface `speech` du client isole le fournisseur pour ajouter Azure plus tard.
2. **La reconnaissance ne juge jamais l'exactitude seule.** Objection retenue de la contre-expertise : le modèle de langue de la reconnaissance peut ramener une forme fautive vers une forme correcte, et la correction ne verrait plus l'erreur. Donc : la production orale est présentée comme « entraînement à l'oral », l'écran de correction dit « Ce que ton téléphone a compris » et rappelle que la reconnaissance peut lisser des fautes ; la consigne ajoutée au modèle dit seulement d'ignorer ponctuation et majuscules (pas l'orthographe) ; la confiance renvoyée par la reconnaissance n'est jamais utilisée. **Test à faire par le propriétaire** (§5) : si plus de 3 phrases fautives sur 10 ressortent corrigées, le mode « Dire » n'est plus proposé par défaut au-delà de A1, et la transcription Azure avec évaluation de prononciation remonte dans le plan.
3. **Contenu de l'atelier : les répliques et phrases-clés des unités publiées** (italien et russe, A0-A1, voix natives Azure déjà écoutées et validées). Le serveur choisit dans les unités que l'apprenant a ouvertes ou réussies, plus l'unité en cours ; un apprenant hors parcours (A2 et plus) puise dans toutes les unités de sa langue. C'est trop facile pour un B1 : limite assumée. Les phrases des textes du jour lues par la voix de l'appareil sont reportées (qualité des voix variable). Les langues sans unité publiée n'ont pas d'atelier ; elles ont la production orale et le jeu de rôle.
4. **XP de la répétition calculée sur la transcription envoyée par le client** : un client modifié peut envoyer le texte modèle. Écart borné à 30 XP par jour, une fois par phrase et par jour, et durée de parole minimale (250 ms par mot du modèle). Même logique que les corrigés des unités (`j4-pr1-architecture.md` §10).
5. **La règle « minute d'oral vérifiée » (3 XP/min) n'est pas mise en œuvre** : elle exige une durée de voix mesurée par le serveur, donc l'audio. Elle viendra avec Azure. La production orale paie comme l'écrite (`production.corrected`, mêmes preuves : longueur, langue détectée, similarité).
6. **Jeu de rôle : scénarios curés** dans `@dailylingua/content` (situation, rôle de l'IA, 3 objectifs, en fr et en), joués dans la langue cible au niveau de l'apprenant ; **1 partie par jour** (quota `roleplay` existant, 1/jour), 8 tours de l'apprenant au plus, chaque tour sous un quota technique `roleplay_turn` (10/jour). Nouvelle règle **`roleplay.completed` = 15 XP, volet output, 1/jour**, accordée par le serveur au bilan si l'apprenant a écrit au moins 3 tours, au moins le seuil de mots de son niveau en tout, et que la langue détectée est la langue cible. Le jeu de rôle **vocal** = même partie, saisie par la reconnaissance de l'appareil et répliques lues par la voix de l'appareil : aucun coût en plus, donc livré avec l'écrit.
7. **Volets** : répétition → fluidité ; dictée → input (écoute) ; jeu de rôle → output.
8. **Confidentialité** : à la première utilisation du micro, une phrase dit que la reconnaissance passe par le service vocal du téléphone (Apple ou Google selon l'appareil) et que DailyLingua ne reçoit que le texte. La page de confidentialité est mise à jour dans la PR 2.
9. **Maquettes** : variante choisie par l'orchestrateur, la plus proche de `e-direction-artistique.md` (noté dans la PR 1).

## 3. Découpage en PR (vers `dev`)

| PR | Contenu | Niveau | Spec |
|---|---|---|---|
| **5.1 Atelier oral** | Interface `speech` client, comparaison et dictée pures, événement `oral_attempt`, règles `shadowing.sentence` et `dictation.sentence`, choix des phrases, écran de l'atelier, carte « Aujourd'hui » | Sensible (borne SQL d'XP du jour relevée de 400 à 500 dans `app.ingest_batch`) : arrêt avant fusion | [j5-pr1-atelier-oral.md](j5-pr1-atelier-oral.md) |
| **5.2 Dire au lieu d'écrire** | Mode « Dire » de l'étape Expression, `production_submitted.mode`, consigne de transcription dans la correction, micro dans la réécriture, page de confidentialité | Sensible (chemin de coût IA, changement de prompt) : arrêt avant fusion | [j5-pr2-production-orale.md](j5-pr2-production-orale.md) |
| **5.3 Jeu de rôle** | Scénarios, table `app.roleplay` (RLS), routes serveur, prompts, règle `roleplay.completed`, écran écrit et vocal | Sensible (migration, coût IA) : arrêt avant fusion | [j5-pr3-jeu-de-role.md](j5-pr3-jeu-de-role.md) |

## 4. Budget

Aucun appel nouveau en 5.1. En 5.2, une production orale remplace une production écrite (même quota, ≈ 0,0017 $). En 5.3, 1 partie par jour au plus : ≈ 0,0025 $, soit ≈ 0,015 $ par apprenant et par mois à 6 parties (prévu dans g-budget §3). Le disjoncteur arrête le jeu de rôle (non essentiel) à 100 % du budget ; la production orale suit la correction écrite (quota réduit à 1).

## 5. À vérifier par le propriétaire (iPhone réel)

1. **Fidélité de la reconnaissance** : dans l'atelier ou la production orale, dire 10 phrases volontairement fausses en italien et 10 en russe (accord, auxiliaire, cas, genre). Noter combien ressortent corrigées dans « Ce que ton téléphone a compris ». Seuil de décision : 3 sur 10 (§2, point 2).
2. Reprise de la reconnaissance après verrouillage de l'écran ; reconnaissance hors ligne (le prototype ne l'a pas mesurée).
3. La première demande d'accès au micro apparaît une seule fois en PWA installée.
