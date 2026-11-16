# Jalon 2 — Spec pédagogique : la séance et ses contenus

Auteur : didacticien (brouillon). Fait foi pour la pédagogie du jalon 2 : déroulé de la séance, exercices, texte gradué, correction, erreur du jour, file de révision, bilan. Specs sœurs : `j2-architecture.md` (données, sécurité, hors ligne : l'emporte sur les points de données), `j2-jeu-xp-serie.md` (chiffres d'XP et de série : l'emporte sur les chiffres de jeu), `j2-ecrans.md` (interface). Références : `b-modele-pedagogique.md` §3 à §7, `c-game-design.md` §2.1 et §3.1, `g-budget.md`, `prototype-iphone.md` §4.

Aucun contenu linguistique définitif ici : les exemples sont des gabarits. Aucune langue en dur : tout passe par le registre (`packages/core/src/languages.ts`) et la L1 du profil.

## 0. Périmètre

| Dans le jalon 2 | Hors jalon 2 |
|---|---|
| Séance en six étapes validées par preuve serveur ; formats 10/15/20/30 min (défaut 15) | Lecteur tactile, gloses au toucher, couleurs d'état des mots (jalon 3) |
| File unique FSRS plafonnée, reprise après absence | Audio pré-généré Azure (jalon 3) : au jalon 2, **voix de synthèse de l'appareil** |
| Texte gradué minimal généré et partagé, questions, atelier | Oral transcrit, shadowing, mode « écrire puis dire » (jalon 5) |
| Correction écrite portée (L1 en paramètre), réécriture vérifiée, erreur du jour | Niveau continu, « Je peux… » (jalon 6) |
| Bilan ; séance hors ligne sauf correction | Parcours par situations A0-A1 (jalon 4) |

Public : B1 d'abord ; A2, B2 et C1-C2 sur le même squelette (§9) ; A0-A1 : §10.

## 1. Les six étapes

### 1.1 Durée visée par étape (minutes)

Parts de `b` §3 (20/30/15/25/10 %). Le bilan (≈ 20 s) est hors budget.

| Format | Réveil | Lecture | Atelier | Expression | Élan | Total |
|---|---|---|---|---|---|---|
| 10 | 2 | 3 | 1,5 *(jours impairs)* | 3 | 1,5 *(jours pairs)* | 9,5 |
| **15 (défaut)** | 3 | 4,5 | 2 | 4 | 1,5 | 15 |
| 20 | 4 | 6 | 3 | 5 | 2 | 20 |
| 30 | 6 | 9 | 4,5 | 7,5 | 3 | 30 |

Format 10 : l'atelier et l'élan alternent selon la parité du **nombre de séances 10 min terminées** (pas du calendrier), pour que l'alternance survive aux jours manqués. Sur 7 jours, les quatre volets apparaissent. Mesure : durée réelle médiane par étape et par format, alerte si l'écart dépasse ±25 % (`b` §9).

### 1.2 Contenu, validation, saut, hors ligne

« Validée » = le serveur trouve la preuve dans les tentatives (`app.attempt`, `review_log`, événements de lecture). Le client n'envoie jamais « étape faite » comme preuve (`session_step_completed` est indicatif, cf. `j2-architecture.md` §2). Une étape ratée (mauvaises réponses) **est validée** si le travail est fait : on valide l'effort, la note sert la difficulté adaptative et FSRS.

| Étape | Exercices et nombre (10 / 15 / 20 / 30) | Preuve qui valide | Si sautée | Si échouée | Hors ligne |
|---|---|---|---|---|---|
| 1. Réveil | Micro-exercice de l'erreur d'hier (1, s'il existe) puis cartes dues, plafond §6 : 15 / 22 / 30 / 45 cartes max | ≥ 80 % des cartes prévues répondues (durée ≥ 600 ms en choix, ≥ 1 000 ms en saisie) **ou** budget de temps atteint **ou** file vide (fait serveur) | Cartes restent dues, aucune pénalité ; étape non validée | Validée ; une carte ratée revient une fois en fin d'étape (dans le budget de temps, sans XP) | Oui : cartes dues sur 2 jours en local, résultat provisoire |
| 2. Lecture | 1 écoute seule d'un segment + lecture du texte entier ; questions 3 / 4 / 4 / 4 (dont 1 après écoute seule) | Fin du texte atteinte ; durée de lecture ≥ mots ÷ 400 mots/min ; ≥ 3 questions répondues ; segment écouté (événements de fin d'énoncé de la synthèse, ≥ 95 % des phrases du segment) **ou** absence de voix constatée | Texte reste disponible toute la journée ; atelier et expression restent ouverts | Validée ; score de compréhension → §7 | Oui (texte, questions, clés dans le paquet) |
| 3. Atelier | Mots : 5 / 6 / 7 / 8 (items 5 / 6 / 10 / 12) ; grammaire : 2 / 3 / 4 / 5 items (§2.4) | Tous les items tentés (1er essai) | Mots du jour non introduits, aucune carte créée | Validée ; 2e essai autorisé une fois par item | Oui |
| 4. Expression | 1 production (longueur §4.1) ; puis réécriture de 1 (format 10) ou 2 phrases | Production acceptée par le serveur (longueur, langue détectée, similarité) **et**, si la correction est arrivée pendant la séance et contient ≥ 1 correction, réécriture(s) soumise(s) | Aucune correction demandée, pas de carte d'erreur | Validée dès soumission ; la réécriture non vérifiée ne rapporte pas d'XP mais ne bloque rien | Écriture oui ; correction en attente (§4.6) |
| 5. Élan | Relecture rythmée : 1 passage (10, 15, 20) ; 2 passages au format 30 (texte du jour + texte d'hier) | Passage parcouru jusqu'au bout ; durée ≥ mots ÷ 400 mots/min (plancher anti-défilement) | Non validée, sans conséquence | Pas d'échec possible ; la vitesse sert seulement l'XP (`c` §2.1 : ≥ 90 % du passage précédent) | Oui |
| 6. Bilan | Écran unique (§8) | — (pas d'étape à valider) | — | — | Oui, chiffres marqués « provisoire » |

Séance complète = toutes les étapes **du format choisi** validées (pour le format 10 : Réveil, Lecture, Expression + l'étape alternée du jour). Aucune vie, aucun verrou : chaque étape peut être ouverte dans n'importe quel ordre depuis la séance ; l'ordre proposé commence par le plus facile.

### 1.3 Élan : relecture rythmée

| Paramètre | Valeur |
|---|---|
| Longueur du passage | 10 : 120 mots ; 15 : 180 ; 20 : 250 ; 30 : texte entier + 180 mots du texte d'hier (plafonnée à la longueur du texte) |
| Rythme proposé | Phrase par phrase ; cible = 1,25 × la vitesse mesurée à la première lecture du même texte (bornée entre 80 et 250 mots/min ; caractères ÷ facteur pour les écritures sans espaces, §4.1) |
| Contrôle | Aucun (texte déjà compris) ; l'apprenant peut ralentir, la cible ne fait que s'afficher |

## 2. Exercices auto-corrigés

### 2.1 Règle de correction commune

Base : `normalizeGrammarAnswer` de l'ancienne app (à porter dans `@dailylingua/core/grading`) — NFC, apostrophe typographique → droite, minuscules selon la langue, espaces réduits, ponctuation finale et `¿ ¡` initiaux retirés ; accent tonique retiré et ё → е si `markStress` ; voyelles brèves retirées si `optionalVowelMarks` ; espaces retirés si `unspaced`.

| Écart entre réponse et forme acceptée | Verdict | Note FSRS (cartes) |
|---|---|---|
| Aucun après normalisation | Juste | Bien (3) ; Facile (4) si < 40 % du temps médian de l'apprenant pour ce mode |
| Seulement des diacritiques (comparaison NFD sans marques combinantes ; en allemand `ä/ae`, `ö/oe`, `ü/ue`, `ß/ss`) | **Presque juste** : compté juste, la bonne graphie est montrée | Difficile (2) |
| Idem, réglage « accents stricts » activé (défaut : désactivé) | Faux | À revoir (1) |
| Majuscules | Ignorées partout (y compris noms allemands : la graphie correcte est montrée) | — |
| Ponctuation interne | Ignorée pour `cloze` et `short_answer` ; pour `transform`, virgules et tirets ignorés, ordre des mots compté | — |
| Toute autre différence (faute de frappe comprise) | Faux | À revoir (1) |

Variantes : chaque item porte la **liste complète** `accept[]` (contractions, ordres libres, graphies alternatives : kana/kanji en japonais, `ё` écrit ou non, etc.), produite par la génération et contrôlée par la relecture (§3.5). Aucun bouton « j'avais raison » (déclaratif) : à la place « Ma réponse devrait être acceptée » → `content_report` ; variante ajoutée après vérification, la tentative est recorrigée et l'XP inscrite rétroactivement si elle est acceptée.

### 2.2 Tableau des types

| Type (`kind`) | Étape | Champs (résumé) | Clé (`text_item_key` ou carte) | Correction |
|---|---|---|---|---|
| `card_recall` mode `recognize` | Réveil | `cardId`, forme L2, phrase de contexte, 4 options de sens en L1 (`{id, text}`, ids opaques) | `optionId` | Choix exact |
| `card_recall` mode `translate` | Réveil | `cardId`, sens en L1, indice (catégorie, initiale si sangsue) | `accept[]` (lemme + variantes) | §2.1 |
| `card_recall` mode `cloze` | Réveil | `cardId`, phrase d'origine avec trou, sens en L1 | `accept[]` (forme fléchie de la phrase) | §2.1 |
| `error_fix` | Réveil (1er item) | phrase de l'apprenant, passage fautif surligné, explication courte en L1 | `accept[]` = passage corrigé + passage de la réécriture vérifiée | §2.1 sur le passage |
| `mcq` (compréhension) | Lecture | `question`, `options[4]` (ids opaques, ordre mélangé par apprenant), `listeningOnly`, `evidence` (indices de phrases) | `optionId` | Choix exact |
| `mcq` (sens du mot) | Atelier | phrase du texte, mot surligné, 4 sens en L1 | `optionId` | Choix exact |
| `cloze` | Atelier | phrase du texte avec trou, indice (lemme ou infinitif + sens L1), `grammarPointId` facultatif | `accept[]` | §2.1 |
| `transform` | Atelier | phrase source, consigne (dans la L1 : « mets au passé », etc.), `grammarPointId` | `accept[]` (phrases entières, ≥ 1) | §2.1, phrase entière |
| `fluency_pass` | Élan | `textId`, bornes du passage, vitesse cible | Aucune | Preuve temporelle seulement |

Modes de carte selon la stabilité FSRS (`b` §5) : S < 3 j → `recognize` ; 3 à 10 j → `translate` ; > 10 j → `cloze` si la carte a une phrase de contexte, sinon `translate`. Distracteurs de `recognize` : sens L1 d'autres cartes de l'apprenant de même catégorie grammaticale ; à défaut, distracteurs générés avec le texte. Cartes migrées sans sens en L1 de l'apprenant (ancienne app : français) : sens servi tel quel, marqué de sa langue.

### 2.3 Ce qui reste côté serveur

| Situation | Clé chez le client ? | Parade |
|---|---|---|
| En ligne, item de séance | Oui, dans le paquet (décision recommandée A1 de `j2-architecture.md`) ; le client affiche le retour immédiat | Le serveur **recorrige toujours** avec sa propre clé ; aucune note ni XP ne vient du client |
| Hors ligne | Oui (indispensable au retour immédiat et à l'affichage de la bonne réponse) | Résultat affiché **provisoire** (grisé) ; recorrigé à la synchronisation ; écart → le serveur fait foi et le bilan se met à jour sans message de reproche |
| Cartes | La réponse fait partie de la carte (contenu de l'apprenant) | Pas de secret à protéger ; durées minimales et plafonds d'XP |
| Hors séance (bibliothèque, jalon 3) | Non | Correction en ligne uniquement |

Dire la vérité : la clé est lisible par un utilisateur déterminé ; le gain d'une triche est borné par les plafonds (`j2-architecture.md` §4, ≈ 60 XP/jour). Les options `mcq` ont des identifiants opaques par texte et un ordre mélangé par apprenant, pour qu'une clé ne se recopie pas d'un apprenant à l'autre.

### 2.4 Composition de l'atelier

| Format | Mots | Items de mots | Items de grammaire | Total |
|---|---|---|---|---|
| 10 | 5 | 5 `mcq` sens | 2 `cloze` | 7 |
| 15 | 6 | 6 `mcq` sens | 2 `cloze` + 1 `transform` | 9 |
| 20 | 7 | 7 `mcq` + 3 `cloze` | 2 `cloze` + 2 `transform` | 14 |
| 30 | 8 | 8 `mcq` + 4 `cloze` | 3 `cloze` + 2 `transform` | 17 |

Le texte en fournit le maximum (8 mots, 5 items de grammaire, 4 `cloze` de mots) ; le format en prend les premiers, dans l'ordre fixé par la génération (mots du plus utile au moins utile). Chaque mot tenté devient une carte `word` (source `mission` → à renommer `session` si le registre des sources le permet, point 7), avec sa phrase du texte, due le lendemain.

## 3. Le texte gradué minimal

### 3.1 Paramètres par niveau

Le texte est un original (jamais une reformulation d'article), sur un thème, sans personne réelle vivante ni événement d'actualité daté. Densité : trois crans par niveau (léger, standard, dense) pour la difficulté adaptative (§7).

| Niveau du texte | Longueur en mots (léger / standard / dense) | Bande de fréquence (formes) | Couverture visée dans la bande | Mots nouveaux | Segment d'écoute |
|---|---|---|---|---|---|
| A2 | 150 / 180 / 220 | 2 000 premières | 98 / 97 / 96 % | 5 / 5 / 6 | 1er paragraphe, 40-60 mots |
| **B1** | 250 / 300 / 350 | 3 500 premières | 98 / 97 / 95 % | 5 / 6 / 7 | 60-90 mots |
| B2 | 400 / 475 / 550 | 5 000 premières | 97 / 96 / 95 % | 6 / 7 / 8 | 80-120 mots |
| C1 (sert aussi C2 au jalon 2) | 600 / 700 / 800 | 5 000 premières (limite des listes) | 95 / 94 / 92 % | 7 / 8 / 8 | 100-150 mots ; texte entier au format 30 |

- Mots comptés : tokens de mots, hors noms propres, nombres et mots nouveaux déclarés. Écritures sans espaces : caractères ÷ facteur du registre (point 3).
- Les listes de l'ancienne app comptent des **formes** (5 000 par langue, `wordfreq`) : les langues flexionnelles sont désavantagées ; seuils à calibrer sur un jeu d'essai de 20 textes par langue pilote avant ouverture (point 2). **Il n'y a pas de liste pour le français** (`src/lib/frequency/data/` : 19 langues, pas `fr`) : à ajouter avant d'ouvrir le français comme langue cible.
- Mots nouveaux : 5 à 8 lemmes hors des 2 000 premières formes (A2 : hors des 1 000), chacun présent **≥ 3 fois** dans le texte (formes fléchies acceptées, déclarées par la génération), répartis sur au moins deux paragraphes.
- Questions : la génération en fournit **5** : 1 `listeningOnly` (preuve dans le segment d'écoute), 4 de lecture (≥ 1 sens global, ≥ 1 détail, ≥ 1 inférence à partir de B1). La séance en sert 3 ou 4 (§1.2) ; la 5e est la question de repli. Questions et options **dans la langue cible**, un cran plus simples que le texte (pas de L1 nécessaire : le texte reste partagé entre toutes les L1).

### 3.2 Audio et dégradation sans voix

| Cas (détecté à l'exécution) | Comportement |
|---|---|
| Voix de l'appareil pour la langue (filtrée par `speechRegions`) | Segment d'écoute lu phrase par phrase, vitesse 0,9 (A2), 1,0 (B1+) ; réécoute 2 fois max ; texte masqué jusqu'à la réponse |
| Pas de voix, ou synthèse en erreur | Question d'écoute remplacée par la question de repli (lecture) ; preuve d'écoute non exigée ; bilan : « Écoute non faite : aucune voix pour cette langue sur cet appareil » + lien d'aide (installer une voix), affiché une fois par semaine au plus ; la compétence « Écouter » n'est pas alimentée ce jour-là |
| Hors ligne | Voix locale si elle existe (sur iPhone, la voix russe testée est locale) ; sinon même repli |

Les événements de fin d'énoncé sont déclarés par le client : la preuve d'écoute est donc plus faible que celle de lecture (assumé ; plafonnée par `c` §2.1).

### 3.3 Atelier tiré du texte

| Élément | Règle |
|---|---|
| 5 à 8 mots | Les mots nouveaux du §3.1 ; chacun avec forme de dictionnaire (accent tonique combinant si `markStress`, lecture kana si japonais, pinyin si chinois), catégorie, définition simple **dans la langue cible**, phrase d'occurrence |
| Sens en L1 | Hors du texte partagé : fiche « mots et consignes par L1 » générée une fois par `(texte, L1)`, mise en cache (objet `gloss`, ≈ 0,0007 $). Tant qu'elle manque : définition en langue cible affichée, marquée comme telle |
| Point de grammaire | Un identifiant du curriculum de la langue (`src/lib/grammar/curricula`, ex. `xx-b1-…`), de niveau ≤ niveau du texte, présent **≥ 3 fois** dans le texte (phrases déclarées). Fiche liée seulement si elle est au moins `ai-reviewed` ; sinon le nom seul |
| Items | `cloze` construits sur des phrases du texte (la forme retirée est exactement à l'endroit déclaré) ; `transform` sur des phrases du texte ou de 8 à 15 mots écrites au niveau |

### 3.4 Thèmes de départ (identifiants stables, libellés dans l'i18n)

`daily_life`, `home`, `food_cooking`, `health_wellbeing`, `work`, `studies`, `travel`, `transport`, `city_neighbourhood`, `nature_environment`, `animals`, `sport`, `music`, `cinema_series`, `books_reading`, `technology`, `shopping_money`, `family_friends`, `festivals_traditions`, `history_heritage`, `science_discoveries`, `crafts_trades`.

Exclus du texte généré au jalon 2 : politique, religion, guerre, faits divers violents (relecture impossible à grande échelle). À partir de B2, `society_debate` (sujets de société sans actualité datée) en option, point 9. L'apprenant choisit 3 thèmes ou plus (défaut : tous) ; deux jours de suite n'ont jamais le même thème.

### 3.5 Contrôles automatiques après génération (code, sans IA)

Un échec → une régénération ; deux échecs → texte écarté et case signalée dans `job_run`.

| # | Contrôle | Seuil |
|---|---|---|
| 1 | Sortie conforme au schéma Zod | Strict |
| 2 | Longueur | Dans ±15 % de la cible du cran |
| 3 | Couverture dans la bande (§3.1), hors noms propres, nombres, mots nouveaux | ≥ cible du cran |
| 4 | Mots nouveaux : nombre, rang hors bande déclarée, ≥ 3 occurrences de formes déclarées présentes dans le texte | Strict |
| 5 | Écriture : part des lettres dans le système d'écriture de la langue | ≥ 95 % ; pas d'accent tonique dans le corps du texte (`markStress` : seulement dans les formes de dictionnaire) |
| 6 | Questions : 5, dont 1 `listeningOnly` dont la preuve est dans le segment ; 4 options distinctes ; clé dans les options ; aucune option recopiant mot pour mot la phrase de preuve | Strict |
| 7 | Grammaire : identifiant existant, niveau ≤ texte, ≥ 3 occurrences déclarées et présentes | Strict |
| 8 | Items d'atelier : trou exactement à l'endroit déclaré ; `accept[]` non vide ; la forme retirée ∈ `accept[]` | Strict |
| 9 | Doublon : similarité (trigrammes de mots) avec les textes de la même case | < 40 % |
| 10 | Consigne d'expression présente, ≤ 40 mots, ne demande pas de résumer le texte | Strict |

Puis **relecture par un second appel Haiku** (`graded_text_review`) : naturel, fautes, cohérence, niveau, justesse de chaque clé et complétude de chaque `accept[]`, absence de personne réelle ou d'actualité. Signal bloquant → régénération (une fois).

### 3.6 Statut et relecture par échantillon

| Statut | Montré en production ? | Entrée |
|---|---|---|
| `generated` | Non (équivaut à `draft`) | Sortie du modèle |
| `checked` | Non | Contrôles §3.5 réussis |
| `published` | Oui, avec la mention « Texte généré, vérifié automatiquement » | Relecture Haiku sans signal bloquant |
| `retired` | Non | Échantillon rejeté, ou signalé ≥ 2 fois par des apprenants distincts |

Échantillon (exception validée : modèle plus fort, en Batch, enveloppe « Qualité » de `g` §4) : les **20 premiers textes** de chaque `(langue, niveau, version du prompt)`, puis **10 %** tirés au hasard. Rejet → `retired` (l'apprenant qui l'a lu n'est pas touché ; son XP reste). Taux de rejet > 10 % sur les 20 derniers échantillons d'une case → génération de la case suspendue, servie depuis le stock, alerte. `j2-architecture.md` §3.1 reporte cet échantillonnage au jalon 3 : point 1.

### 3.7 Partage et choix du texte

Clé de partage : `(langue, niveau, densité, thème, version du prompt)` + `variant` (plusieurs textes par clé). Choix du texte de demain, calculé à la fin de la séance du jour : (1) densité §7 ; (2) thème : parmi ceux de l'apprenant, le moins récemment lu, jamais celui d'hier ; (3) texte `published` de cette clé **non lu** par l'apprenant (`text_read`) ; (4) sinon génération à la demande (jalon 2) ; (5) sinon densité voisine, puis autre thème ; (6) en dernier recours un texte lu il y a > 30 jours (relecture utile, annoncée comme telle).

### 3.8 Gabarit des consignes de génération (`graded_text`, version `2026-11-xx.1`)

Paramètres : langue cible (code, nom natif, drapeaux du registre), niveau, densité (longueur, couverture, nombre de mots nouveaux), thème, liste des points de grammaire candidats (`id`, titre), longueur du segment d'écoute. **Pas de L1.** Le prompt système est fixe (cache) ; les paramètres vont dans le message utilisateur.

```
You write ORIGINAL graded reading texts for language learners. Never retell a real news article;
no real living person; no dated current event. Topic: {theme}. Language: {code} ({nativeName}).
Level {level}, density {density}: {minWords}-{maxWords} words; use almost only very frequent words
(at least {coverage}% among the {band} most frequent forms); introduce exactly {n} new words above
that band, each used at least 3 times, spread over two paragraphs or more.
{markStress? "Give dictionary forms with a combining acute accent on the stressed vowel; never in the text."}
{unspaced? "Count length in characters: {minChars}-{maxChars}."}
Pick ONE grammar point from <grammar> that occurs at least 3 times in your text.
Return (schema): title; paragraphs[]; listening_segment (sentence range, {segMin}-{segMax} words);
new_words[]: lemma, dictionary_form, part_of_speech, simple_definition (in {code}), forms_in_text[];
grammar: id, sentence_indices[]; questions[5]: kind (gist|detail|inference), listening_only,
question, options[4], answer_index, evidence_sentence_indices[];
workshop: word_items[], grammar_items[] (cloze|transform, sentence, gap span, instruction, accept[]);
writing_task: one prompt (≤ 40 words) asking the learner to {genre} in relation to the text,
never to summarise it.
Questions and options are in {code}, one step simpler than the text.
```

Genre de la consigne : A2 décrire ou raconter une expérience personnelle ; B1 raconter et donner son avis avec deux raisons ; B2 comparer ou argumenter ; C1 nuancer, changer de registre.

## 4. L'expression

### 4.1 Consigne et longueur minimale

Consigne : `writing_task` du texte (langue cible) + sa traduction en L1 dans la fiche par L1 (repliée par défaut). Longueur minimale (`c` §2.1) :

| Niveau | A1 | A2 | B1 | B2 | C1-C2 |
|---|---|---|---|---|---|
| Mots | 20 | 35 | 60 | 90 | 120 |

Écritures sans espaces : minimum en caractères = mots × facteur `charsPerWord` à ajouter au registre (proposé : zh 1,7 ; ja 2,5), point 3. Maximum : 2 500 caractères (existant). Le compteur s'affiche ; sous le minimum, l'envoi est possible mais la production ne compte ni pour l'étape ni pour l'XP (message clair, pas de blocage). Contrôles serveur : langue détectée = langue cible (part des tokens dans les 5 000 formes de la langue ≥ 50 %, système d'écriture), similarité < 50 % avec le texte source et les 30 dernières productions.

### 4.2 La correction existante (d'après `src/lib/generation/writing-feedback*.ts`, prompt `2026-10-21.1`)

| Élément | Ce que fait le code actuel | Portage jalon 2 |
|---|---|---|
| Entrées | langue étudiée, niveau actuel et visé, but (registre), mode `writing`/`spoken`, tâche, texte (≥ 20 caractères non blancs, ≤ 2 500) ; tâche et texte entre balises, traités comme des données | Identique + `explanationLanguage` (= L1, ou langue cible au choix à partir de B2) ; mode `writing` seul |
| 4 critères notés 1 à 5 | `grammar` (morphologie, accords, conjugaison, cas, ordre, orthographe, ponctuation), `vocabulary` (étendue, précision, collocations, pas de calque), `register` (adéquation au but et à la tâche), `coherence` (répond à la tâche, enchaînement, connecteurs) ; jugés **par rapport au niveau actuel** ; texte télégraphique plafonné à 1-2 ; texte dans une autre langue : 1 partout | Identique. Écart de vocabulaire avec `b` §1 (« lexique, syntaxe, adéquation ») : on garde le code, `b` sera aligné |
| Commentaire par critère | Une phrase en français | Une phrase **dans `explanationLanguage`** |
| Corrections | ≤ 8, les plus utiles d'abord ; `original` recopié exactement (vérifié : sinon écartée), `corrected` minimal, explication, catégorie parmi `verb`, `agreement`, `function_word`, `word_order`, `word_choice`, `spelling`, `register`, `other` | + catégorie **`l1_transfer`** (§4.3) ; explications dans la L1 |
| Point fort | Une phrase précise, citant l'apprenant | Dans la L1 |
| Version native | Texte entier réécrit au niveau **visé**, mêmes idées et structure | Identique |
| Validation | Schéma Zod strict, toute violation rejette la réponse ; effort `medium` | Identique, champs `*_fr` renommés en champs neutres + langue |
| Essais | 3 corrections par séance (échecs comptés), même texte jamais renvoyé deux fois | 3 par jour d'apprentissage (`g` §5) ; échec facturé non compté (`release_quota`) |

Tutoiement : la consigne « tu, jamais vous » devient « registre familier de la L1 quand la langue le distingue », paramétré par langue (point 6).

### 4.3 Catégorie « calques de la L1 »

Ajout au prompt : « The learner's mother tongue is {l1NativeName} ({l1}). Use `l1_transfer` when the error copies a word, construction, preposition or word order of that language; say which in the explanation. » Prévalence attendue mesurée par couple de langues (`l1`, cible) ; jeu d'évaluation étendu à deux L1 (fr, en) avant mise en service (`j2-architecture.md` §6). Une L1 sans évaluation reste servie, avec la catégorie (le risque est une étiquette fausse, pas une correction fausse).

### 4.4 Réécriture

| Règle | Valeur |
|---|---|
| Phrases proposées | Format 10 : 1 ; autres : 2 (si ≥ 2 corrections dans des phrases distinctes). Phrases contenant les corrections de plus haut rang, catégories `spelling` seules exclues si une autre existe |
| Ce qui est montré | Phrase d'origine, passages fautifs surlignés, explication en L1 ; la forme corrigée est **masquée** (bouton « Voir la correction », qui réduit l'XP, cf. `j2-jeu-xp-serie.md`) |
| Vérification 1 (code, gratuite) | Pour chaque correction de la phrase : `original` absent **et** `corrected` présent (normalisés §2.1) → erreur supprimée |
| Vérification 2 (IA, `rewrite_check`) | Si la vérification 1 ne conclut pas : appel Haiku (≈ 800/200 tokens) qui rend `{ fixedErrorIds[], newErrors[] }` |
| Acceptée si | ≥ 1 erreur signalée supprimée **et** similarité (caractères) avec la phrase d'origine ≥ 50 % (pas une autre phrase) ; décision en TypeScript sur la sortie, jamais par le modèle |
| Quota | 6 vérifications IA par jour. Au-delà : vérification 1 seule ; si elle ne conclut pas, réécriture enregistrée « non vérifiée » (pas d'XP, étape validée quand même) |
| Plusieurs essais | 2 essais par phrase |

### 4.5 Quota de correction atteint, budget épuisé

| Cas | Comportement |
|---|---|
| 3 corrections déjà utilisées ce jour | Production enregistrée, étape validée ; correction **mise en attente**, faite au début du jour d'apprentissage suivant (avant toute autre, prend 1 des 3 du jour) |
| Disjoncteur à 100 % | Correction essentielle : quota réduit à 1 par jour (`g` §5) ; même mise en attente au-delà |
| Échec du modèle | Quota libéré ; nouvel essai proposé ; sinon attente |

### 4.6 Hors ligne

Écriture et sauvegarde locales ; contrôles de longueur locaux (provisoires) ; à la synchronisation, contrôles serveur puis correction. Le résultat apparaît à la prochaine ouverture (« Ta correction est arrivée ») avec la réécriture ; elle compte le jour où elle est faite. Rien n'expire avant 72 h (fenêtre de `c` §3.2).

## 5. L'erreur du jour

| Étape | Règle |
|---|---|
| Choix (serveur, à l'arrivée de la correction) | Parmi les corrections du jour : (1) une correction dont la catégorie et le passage corrigé normalisé ont déjà été vus dans les 30 derniers jours (récurrente) ; sinon (2) la correction de plus haut rang hors `spelling` et `other` ; sinon (3) la première. Une seule par jour et par langue |
| Bilan | Montrée avec son explication en L1 et « revient demain » |
| Lendemain | 1er item du Réveil : `error_fix` sur la phrase de l'apprenant (passage surligné, forme à taper). Accepte le passage corrigé et le passage de sa réécriture vérifiée |
| Devient une carte `correction` (source `feedback`) | Si le micro-exercice est raté, **ou** dès la 2e occurrence de la même erreur en 30 jours (`b` §6). Recto : la phrase de l'apprenant ; verso : le passage corrigé + explication. Au plus 1 carte d'erreur créée par jour |
| Sans correction (hors ligne, quota) | Pas d'erreur du jour ; le lendemain, rien à la place |

Plus tard (hors jalon 2) : micro-exercice sur une phrase nouvelle utilisant la même règle (génération).

## 6. Le Réveil : file unique plafonnée

| Format | Budget de temps | Cartes max (prévues) | Nouvelles cartes par jour (toutes sources) |
|---|---|---|---|
| 10 | 2 min | 15 | 6 |
| 15 | 3 min | 22 | 9 |
| 20 | 4 min | 30 | 11 |
| 30 | 6 min | 45 | 14 |

Base : ≈ 8 s par carte en moyenne. Le plafond qui arrive en premier arrête l'étape (la carte en cours se termine). Les cartes non servies restent dues, **sans compteur affiché**.

Ordre de service : (1) erreur d'hier ; (2) cartes ratées hier (reconquête) ; (3) cartes dues, de la plus faible récupérabilité à la plus forte ; (4) nouvelles cartes migrées, dans la limite restante.

Sources des nouvelles cartes et ordre de priorité dans la limite du jour : cartes d'erreur (≤ 1) → mots de l'atelier (5 à 8, introduits pendant l'atelier, dus le lendemain) → cartes migrées jamais revues (le reste, présentées en `recognize`). Cartes migrées déjà revues : état FSRS converti (`legacy-leitner.ts`), elles sont dues normalement.

**Reprise après absence (≥ 3 jours d'apprentissage sans séance)** : séance de reprise proposée au format 10 (modifiable), Réveil plafonné à **20 cartes** quel que soit le format ; **nouvelles cartes suspendues 2 jours** (y compris les cartes migrées ; les mots de l'atelier sont travaillés mais seuls les 3 plus fréquents deviennent des cartes, point 4) ; la dette s'étale ensuite au plafond normal ; les cartes migrées jamais revues restent suspendues tant que les cartes dues dépassent le plafond du format. Aucune mention de l'absence ni du nombre de cartes en retard.

Sangsue (6 échecs) : signalée, indice ajouté (`translate` avec initiale) ; suspension proposée, jamais imposée.

## 7. Difficulté adaptative

Score de compréhension d'un texte = questions justes ÷ questions servies (écoute comprise), calculé par le serveur sur le **premier** essai.

| Condition (textes de la séance, dans l'ordre) | Texte du lendemain |
|---|---|
| ≥ 90 % sur les deux derniers textes | Cran de densité +1 |
| < 60 % sur le dernier texte | Cran −1 |
| Sinon | Même cran |
| Cran +1 depuis « dense » | Reste « dense » ; le signal est enregistré pour le niveau continu (jalon 6) ; aucun changement de niveau affiché |
| Cran −1 depuis « léger » deux fois de suite | Texte « dense » du niveau inférieur, **niveau affiché inchangé** (`b` §1 : rien ne baisse à l'écran sur une mauvaise journée) |
| Lecture sautée ou < 3 questions | Pas de mise à jour |

Départ d'un nouvel apprenant : cran « léger » de son niveau de test.

## 8. Le bilan

Un écran, un bouton « Terminer ». Tous les chiffres viennent du serveur ; hors ligne, ils sont calculés par `@dailylingua/core` et marqués « provisoire ».

| Bloc | Contenu exact | Source |
|---|---|---|
| Ce que tu as appris | Les mots de l'atelier (forme + sens en L1), « x / y rappels réussis », « compréhension : 3 / 4 », le point de grammaire (nom, lien si relu) | `attempt`, `review_log` |
| L'erreur du jour | Passage d'origine → passage corrigé, explication en L1, « revient demain en premier » ; si la correction attend : « Ta correction arrivera dès que tu seras en ligne » | `correction` |
| Ce qui revient demain | « Demain : environ N révisions (≈ M min) », N ≤ plafond du format, dont les mots d'aujourd'hui ; thème du texte de demain | Plan du lendemain |
| Volets couverts | 4 pastilles (input, output, étude, fluidité) pour la séance + 4 segments pour la semaine | `session_step` |
| XP | Lignes du journal uniquement (`xp_ledger`, règle et montant), aucune valeur calculée par l'écran ; absent si l'XP est désactivée | `j2-jeu-xp-serie.md` |
| Remarques | Au plus une : écoute non faite faute de voix ; production sans XP (trop courte, trop proche) avec la raison | Contrôles |

## 9. Les niveaux du livrable

| Niveau | Différences sur le même squelette |
|---|---|
| A2 | Texte 150-220 mots, bande 2 000, segment d'écoute 40-60 mots lu à 0,9 ; questions très simples ; expression 35 mots (décrire, raconter) ; définitions en langue cible remplacées d'office par la L1 quand elle existe |
| **B1** | Valeurs de référence de cette spec |
| B2 | Texte 400-550 mots ; expression 90 mots (argumenter) ; explications dans la langue cible au choix ; inférence obligatoire dans les questions |
| C1-C2 | Texte 600-800 mots (C2 servi par C1, `j2-architecture.md` §3.1) ; expression 120 mots ; 2 inférences ; la correction pèse surtout sur registre et cohérence (déjà dans le prompt via le niveau) |

## 10. A0-A1 au jalon 2

Le parcours par situations arrive au jalon 4. Au jalon 2, on ne leur sert **pas** de texte généré A1 par défaut (qualité non mesurée, `b` §9).

| Profil | Ce qu'on montre |
|---|---|
| A0 (et toute langue à écriture nouvelle) | Accueil honnête : « Le parcours débutant arrive bientôt. » Réveil sur les cartes migrées (écriture, mots) s'il y en a ; lien vers le module d'alphabet de l'ancienne app tant qu'elle tourne. Pas de série cassée : le Réveil seul valide un jour s'il atteint le seuil de `j2-jeu-xp-serie.md` |
| A1 | Même chose, plus, **derrière un drapeau** et seulement dans les langues pilotes (russe, italien) qui passent le jeu d'essai : séance réduite avec un dialogue généré de 80-120 mots (bande 1 000, couverture 98 %, 5 mots nouveaux), 3 questions, atelier de 5 mots, expression guidée de 20 mots (3 à 5 phrases) |

## 11. Budget du jalon 2 (estimation, à mesurer par `ai_call`)

| Poste | Volume | Coût |
|---|---|---|
| Correction + 1 à 2 vérifications IA (la vérification 1 en évite une partie) | 1 par séance | ≈ 0,002 $ par séance |
| Fiche par L1 (`gloss`) | 1 par (texte, L1) | ≈ 0,0007 $ |
| Texte + relecture Haiku, à la demande | ≤ 1 par (case, densité) et par jour où un apprenant n'a plus de texte non lu | ≈ 0,002 $ |
| Échantillon par modèle plus fort | 20 premiers puis 10 % | Dans l'enveloppe Qualité (2 €) ; l'échantillon se réduit si elle est atteinte |

À 50 actifs : ≈ 3 $ personnels + ≤ 3 $ de stock au pire (une case par apprenant), sous les 10 €. Le stock non lu d'une case sert d'abord : le coût baisse quand les apprenants d'une case sont plusieurs.

## Points à trancher

| # | Question | Recommandation |
|---|---|---|
| 1 | Échantillon par modèle plus fort dès le jalon 2 (cette spec) ou au jalon 3 (`j2-architecture.md`) ? | **Dès le jalon 2** pour les 20 premiers textes de chaque case : c'est là que les défauts d'un prompt neuf apparaissent ; 10 % ensuite au jalon 3 avec le Batch |
| 2 | Seuils de couverture sur des listes de formes (5 000 max) | Garder les seuils du §3.1 comme cibles et les **calibrer sur 20 textes par langue pilote** avant ouverture ; ajouter la liste `fr` (wordfreq, même licence) avant d'ouvrir le français |
| 3 | Longueurs dans les écritures sans espaces | Champ `charsPerWord` dans le registre (zh 1,7 ; ja 2,5), relu par un natif |
| 4 | Mots de l'atelier pendant les 2 jours de suspension après absence | 3 cartes max (les plus fréquents) plutôt que zéro : on ne perd pas le travail fait |
| 5 | Diacritiques : « presque juste » compté juste ? | Oui, note FSRS « Difficile », réglage « accents stricts » désactivé par défaut ; à revoir pour les langues où le diacritique change la lettre (tr, pl, cs, ro, sv) si les signalements le montrent |
| 6 | Adresse à l'apprenant dans les explications en L1 | Registre familier quand la L1 le distingue (tu, du, ты…), réglable plus tard |
| 7 | Source des cartes de mots de séance | Ajouter `session` au registre `cardSources` plutôt que réutiliser `mission` (identifiant hérité) |
| 8 | Densité dans la clé de partage | Colonne `density` dans `app.text` et dans l'unicité, à reporter dans `j2-architecture.md` §3.1 |
| 9 | Thème `society_debate` à partir de B2 | Reporter au jalon 3 (échantillon plus large nécessaire) |
| 10 | A1 au jalon 2 | Drapeau désactivé par défaut, ouvert langue par langue après jeu d'essai ; A0 attend le jalon 4 |
| 11 | Réécriture « non vérifiée » quand le quota est atteint | Étape validée, sans XP ; aucune vérification ni XP rétroactive (simplicité, coût) |
| 12 | Écart des critères entre `b` §1 et le code | Garder les 4 critères du code (éprouvés par `feedback:eval`) et corriger `b` |
