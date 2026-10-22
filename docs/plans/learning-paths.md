# Plan — grammaire, alphabets, révision du vocabulaire, parcours par niveau

Statut : **H1 (grammaire pilote) est fait, I1 (cyrillique : russe, ukrainien) est implémenté** ; le reste est une proposition. Date : 2026-10-21. Ce plan complète [product-features.md](product-features.md) (phases A à G) sans le remplacer. Les phases ci-dessous portent les lettres H à K pour ne pas se confondre avec les précédentes.

## 1. Constat

Ce qui existe déjà :

- **Répétition espacée** : système de Leitner à 7 boîtes (intervalles de 1 à 64 jours) dans `src/lib/domain/spaced-repetition.ts`, utilisé pour le vocabulaire et, depuis la phase D, pour les cartes de correction (`correction_cards`).
- **Contenu réel** : missions générées à partir de sources authentiques (vidéos, podcasts, articles), catalogue couvrant A1 à C2 dans les 19 langues.
- **Production corrigée** : retour écrit avec notes par critère (dont la grammaire) et catégories d'erreurs communes (`verb`, `agreement`, `function_word`, `word_order`, etc.).
- **Test de niveau** : adaptatif, A1 à C2 par langue (phase C).

Ce qui manque :

- **Aucune leçon de grammaire.** La grammaire n'apparaît qu'à travers une note et des commentaires. Un utilisateur qui fait une erreur de cas ou de temps reçoit une correction, pas une explication structurée.
- **Aucun module d'alphabet ou d'écriture.** Un débutant en russe, en arabe ou en coréen ne peut pas lire les textes proposés.
- **Pas de mesure de l'efficacité** : on ne sait pas si les mots révisés sont retenus une semaine plus tard.
- **Pas de parcours par niveau** : tous les niveaux voient les mêmes écrans.

## 2. Réponses aux questions

### Grammaire

Oui, c'est faisable, mais pas comme une génération libre. Une leçon générée à la demande par un modèle peut contenir des erreurs de règle, et la relecture native coûte cher. Proposition : **des points de grammaire curés**, rédigés une fois, relus par un natif, versionnés dans le dépôt (comme les banques du test de niveau). Chaque point comporte une fiche courte, 3 à 5 exercices et une fois exercé, il entre dans la répétition espacée.

Le lien avec les erreurs est le point fort : une erreur d'accord répétée dans les productions suggère la fiche correspondante. Cela s'appuie sur les catégories de la phase D, qui existent déjà.

### Vocabulaire « façon Duolingo » : est-ce efficace ?

La réponse courte : **le principe est bon, le format « jeu » seul ne suffit pas.**

- Ce qui est bien étayé par la recherche : la répétition espacée et le rappel actif (se souvenir avant de voir la réponse). Le moteur est déjà là.
- Ce qui motive, mais dont l'effet sur la maîtrise est moins prouvé : les séries de jours, les points, les ligues. Duolingo publie surtout ses propres mesures, et les études indépendantes sont rares. Il faut donc traiter la gamification comme un moyen de rester régulier, pas comme une preuve d'apprentissage.
- Ce qui manque souvent : les mots appris hors contexte se retiennent moins bien dans une phrase réelle. L'app a un avantage : les mots viennent déjà de contenus authentiques.

Recommandation : **ne pas copier Duolingo**. Améliorer le moteur existant (modes de rappel plus exigeants, phrases réelles, production écrite), garder une gamification légère et **mesurer** la rétention (phase J).

### Alphabets

Oui, à faire, mais seulement pour les langues dont l'écriture bloque la lecture :

| Langue | Écriture | Taille approximative | Remarque |
|---|---|---|---|
| russe, ukrainien | cyrillique | 33 à 34 lettres | Lettres très proches du latin pour certaines. Accent tonique déjà géré. |
| grec | grec | 24 lettres | |
| arabe | arabe | 28 lettres | Forme de la lettre selon sa position, écriture de droite à gauche, voyelles courtes absentes du texte courant. Module plus long. |
| coréen | hangûl | 24 lettres de base, en syllabes | Apprenable en quelques jours. |
| japonais | hiragana, katakana | 46 + 46 de base | Les kanjis relèvent d'un module séparé, plus tard. |
| chinois | pas d'alphabet | — | Le pinyin (romanisation) et les tons, puis les hanzis en module séparé. Hors périmètre v1. |

Pour les langues en alphabet latin (allemand, espagnol, etc.), pas de module dédié, mais une courte section « accents et lettres particulières » au niveau A1 (ñ, ß, ş, ł, ř, etc.).

### Niveaux

Chaque niveau doit trouver son compte. Proposition de parcours, qui ne change pas le contenu mais ce qui est mis en avant :

| Niveau | Priorité |
|---|---|
| Débutant absolu (avant A1) | Alphabet (phase I), premières structures, contenu en A1 |
| A1–A2 | Grammaire de base (phase H), vocabulaire par fréquence, contenu simple |
| B1–B2 (le cœur actuel) | Grammaire de nuance, corrections transformées en fiches (phase H2) |
| C1–C2 | Registre, collocations, expressions. La grammaire sert de référence, pas de leçon. |

Le niveau vient du test de niveau (phase C) ou de la préférence déclarée. Il n'est pas figé : un utilisateur peut changer.

## 3. Propositions

### Phase H — Grammaire

**H1 (pilote)** : russe et italien, de A1 à B1.

1. Table `grammar_points` (langue, niveau CECR, identifiant stable, titre, ordre). Contenu en fichiers versionnés, comme les banques de test, pas en saisie libre.
2. Chaque point : une fiche (règle en français, 5 à 10 lignes, un exemple annoté), 3 à 5 exercices (compléter, choisir, transformer).
3. Page `/grammaire` : liste par niveau, état (à voir, exercé, maîtrisé), entrée depuis l'accueil.
4. Répétition espacée : chaque point exercé avec succès devient une carte, même moteur que `correction_cards`.
5. Relecture native obligatoire avant publication de chaque point.

**H2 (après D et H1)** : grammaire suggérée par les erreurs. Une erreur de catégorie `agreement` ou `verb` répétée au moins 3 fois sur une langue propose la fiche correspondante. Étendre ensuite aux 19 langues, par ordre de demande.

### Phase I — Alphabets

1. Module `src/lib/domain/alphabets/` : un fichier par écriture, avec les lettres (majuscule, minuscule, nom, son, mot exemple tiré du vocabulaire réel). Pur, sans React, comme le reste du domaine.
2. Ordre : groupes de 6 à 8 lettres. Chaque lettre est une carte de répétition espacée.
3. Exercices : reconnaître (écouter → choisir la lettre), lire (mot court à épeler puis lire), comparer (lettres proches).
4. Audio : `speechSynthesis` avec les `speechRegions` du registre, comme pour l'oral existant.
5. Entrée : un test « tu lis déjà cette écriture ? » dans le test de niveau pour sauter le module.
6. **Hors v1** : tracé à la main (canvas, plus lourd, peu de gain prouvé).

Ordre des écritures : cyrillique (russe, ukrainien) → coréen → grec → japonais (kana) → arabe.

**I1 (fait)** : cyrillique, russe et ukrainien (`src/lib/alphabets`, `/alphabet`). Décisions prises :

- Une carte de révision par groupe de lettres (5 groupes par langue), et non par lettre : une série d'exercices correspond à une carte, comme pour la grammaire (table `alphabet_cards`, RPC `record_alphabet_practice`, même moteur Leitner que `grammar_cards`).
- Les exercices sont générés à partir des données des lettres (lettre → transcription, transcription → lettre, lecture d'un mot, écoute d'un mot), pas rédigés. Graine `groupe:jour` : la série est la même toute la journée.
- Transcription savante lettre à lettre, une forme latine unique par lettre, pour pouvoir relire un mot à partir d'elle.
- Relecture native de l'alphabet entier : drapeau `reviewedOn` (null = brouillon) et variable `ALPHABET_DRAFTS` (show / hide), comme `GRAMMAR_DRAFTS`.
- Entrée depuis l'accueil pour les apprenants A1 tant que l'alphabet n'est pas complet, puis pour les révisions dues.
- Test « Tu lis déjà cette écriture ? » : 10 mots à lire (2 par groupe, tirés selon le jour), il en faut 9 justes ; un score suffisant crée une carte `known` pour chaque groupe sans carte (les cartes existantes ne bougent pas), sans passer par les révisions de découverte. Accès depuis `/alphabet` (tant que l’alphabet n’est pas complet) et depuis l’intro du test de niveau.

### Phase J — Révision du vocabulaire : modes et mesure

1. **Modes de rappel** en plus de la reconnaissance : écrire la traduction, écouter et taper, phrase à trou dans une vraie phrase de contenu.
2. **Mesure** : une fois par semaine, une révision « surprise » de 10 mots appris il y a 7 jours et jamais revus. Le taux de rappel par mode est enregistré. C'est la seule façon de savoir si le système fonctionne pour cet utilisateur.
3. **Gamification légère** (à décider, voir section 5) : série de jours, sans points ni ligues. Activable et désactivable.

### Phase K — Parcours par niveau (transversal)

Pas une phase de développement isolé. C'est un fichier de configuration qui indique, pour chaque niveau, quels modules sont mis en avant, quel contenu est proposé en premier et quels rappels s'affichent sur l'accueil. Il est appliqué au fur et à mesure que H, I et J arrivent. Le premier pas : définir la table niveau → modules, puis l'utiliser sur l'accueil.

## 4. Ordre proposé

Une phase validée avant la suivante, comme pour le reste du projet.

1. **H1 — Grammaire pilote** (ru, it, A1–B1). Le plus visible pour le niveau intermédiaire.
2. **I — Alphabets** (cyrillique d'abord). Débloque les débutants en russe, ukrainien, puis les autres écritures.
3. **J — Modes de révision et mesure de rétention.** Commencer la mesure tôt : elle prend des semaines à produire des données.
4. **H2 — Grammaire suggérée par les erreurs.** Dépend de D (déjà fait) et de H1.
5. **K — Parcours par niveau**, appliqué progressivement.

Phase G (écrire puis dire, déjà conçue) passe avant H si elle est validée en premier : elle n'a pas de dépendance avec ce plan.

## 5. Décisions à prendre

1. **Grammaire** : leçons curées (recommandé, coût contrôlé, qualité relue) ou générées par IA à la demande ?
2. **Gamification** : série de jours seule (recommandé), ou aussi points et ligues pour une expérimentation ?
3. **Langues pilotes de la grammaire** : russe et italien (recommandé, vos deux langues principales), ou une autre paire ?
4. **Chinois** : les hanzis entrent-ils dans le périmètre, ou seulement plus tard ?
5. **Fréquence des mots** pour le niveau A1–A2 : une liste de fréquence doit avoir une licence compatible avec un usage commercial. À vérifier avant de l'utiliser.

## 6. Risques

- **Coût de relecture native** : chaque point de grammaire et chaque banque d'alphabet doit être relu. C'est le principal goulot, plus que le développement.
- **Contenu généré par IA** : déjà le cas pour les banques du test de niveau ; même règle ici (relecture avant publication).
- **Licences** : listes de fréquence, illustrations de lettres, sons. Vérifier avant publication.
- **iOS** : `speechSynthesis` n'a pas les mêmes voix selon les versions de Safari ; tester les langues pilotes sur iPhone avant de généraliser.
- **Mesure** : des données de rétention sur peu d'utilisateurs ne prouvent rien. Présenter les résultats comme indicatifs jusqu'à un volume suffisant.
