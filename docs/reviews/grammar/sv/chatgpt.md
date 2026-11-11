# Relecture grammaire — suédois — Codex (arbitrage)

## Synthèse

18 fiches et 90 exercices relus · 18 approuvées après correction · 0 brouillon · 91 remplacements textuels

L’arbitrage compare [la passe A](pass-a.md) et [la passe B](pass-b.md) à la version du cours dans le commit `2a9f5b4`. Le [fichier de correctifs](chatgpt-patch.json) cible ce commit. Les retouches locales ont été comparées à la version de départ et intégrées lorsque la décision les justifiait. Le nombre de remplacements compte les champs modifiés. Une même décision peut toucher plusieurs champs.

## sv-a1-en-ett

Décision : approuvé.

- Retenue (B) — `rule[0]`. Introduire `en-ord` et `ett-ord` avant que les exercices emploient ces termes.
- Retenue (A, B) — `rule[1]`. Ajouter `systern`, `nyckeln` et `fönstret` comme exemples. Les propositions sont précisées pour indiquer qu’il s’agit de certains noms en `-el` ou `-er` non accentués. La variante de A qui ajoute `-en` comme catégorie n’est pas reprise telle quelle, faute d’exemple dans cette fiche.
- Relecture complémentaire — Limiter la règle du suffixe au nom seul au singulier. La fiche sur les adjectifs introduit plus loin `den stora bilen`.

## sv-a1-present

Décision : approuvé.

- Retenue (A, B) — `exercises[1].options`. Remplacer `har` par `ha`. Avec `har`, `Vi har studenter` et `Vi är studenter` sont deux réponses correctes.
- Retenue (A, B) — `rule[1]`. Introduire `göra → gör` et `köra → kör`, en présentant le radical en `-r` comme un repère pour certains verbes. `Spara → sparar` montre pourquoi la généralisation proposée serait trompeuse.
- Relecture complémentaire — Demander le présent de `dricka` dans `exercises[3].hint`. L’ancienne consigne permet aussi `drack`.

## sv-a1-word-order

Décision : approuvé.

- Retenue (A, B) — Harmoniser `i dag` et `i går` avec `i morgon` et `i kväll`, dans cette fiche et dans les fiches sur la négation, le prétérit et le parfait. Les graphies soudées sont admises. La graphie séparée donne une convention cohérente au cours. La ligne du tableau illustre l’inversion avec `I dag arbetar jag hemma`. [Språkrådet — Graphies soudées et séparées](https://frageladan.isof.se/faqs/23289)
- Relecture complémentaire — `rule[0]`, `rule[1]`, `table.caption` et `table.headers`. Distinguer affirmation, question fermée et interrogation portant sur le sujet. Avec `Vem bor här?`, `vem` est le sujet. L’intitulé du tableau couvre aussi la question avec le verbe en tête.
- Relecture complémentaire — `exercises[3].hint`. Demander le présent de `göra`, car `Vad gjorde du?` convient sans indication de temps.

## sv-a1-negation

Décision : approuvé.

- Retenue (B, doute) — `rule[2]`. Ajouter le repère `inte` avec `någon`, `något` ou `några` quand le complément suit un infinitif ou un supin. `Jag kan inte köpa någon bil` donne un modèle accessible à ce niveau.
- Relecture complémentaire — `rule[0]`. Présenter `I dag arbetar jag inte` comme le modèle avec un sujet pronominal après le verbe. Un sujet nominal peut aussi suivre `inte`.
- Relecture complémentaire — `exercises[3].hint` demande d’accorder `ingen`. `Inte några` était possible avec l’ancien indice. `exercises[4].instruction` exige désormais `inte`, puisque `ej` est aussi possible à l’écrit.

## sv-a1-plural

Décision : approuvé.

- Relecture complémentaire — `title`, `rule[0–2]` et `table.rows`. Ajouter le modèle `en sko → skor → skorna` et signaler `fans` pour le pluriel en `-s`. Présenter les terminaisons comme des repères et donner `ett land → länder` en contre-exemple à la règle sur les neutres en consonne. [Språkrådet — Pluriel en -s](https://frageladan.isof.se/faqs/30933)
- Relecture complémentaire — `exercises[1].explanation` et `exercises[2].explanation`. Expliquer la flexion d’`äpple` et de `hus` sans généraliser à tous les neutres qui ont la même terminaison au singulier.

## sv-a1-pronouns

Décision : approuvé.

- Retenue (A, B) — `exercises[2]`. Remplacer `Det är ___ hus` par `___ hus är stort`. Le pluriel `hus` rendait `våra hus` correct dans l’ancienne version. Le singulier `stort` sélectionne `Vårt`.
- Retenue (A, B) — `rule[2]`. Expliquer que « sa voiture » laisse le genre du possesseur indéterminé, puis comparer `Jag ser hans bil` et `Jag ser hennes bil`.
- Écartée (B, doute) — L’absence de `hen` ne crée aucune erreur dans les formes étudiées à ce niveau.
- Relecture complémentaire — `rule[0–1]`, `exercises[0].prompt` et `exercises[0].explanation`. Définir les formes compléments par leur fonction et limiter le commentaire sur les possessifs invariables aux formes du tableau. L’exercice vise « je le vois » à l’écrit standard, où `honom` est attendu. `Han` objet s’entend à l’oral. [Språkrådet — Formes des pronoms](https://frageladan.isof.se/faqs/30951)

## sv-a2-adjectives

Décision : approuvé.

- Retenue (A, B) — `rule[2]`. Remplacer l’exemple régulier `svensk → svenskt` dans le paragraphe sur les particularités. Introduire `trött` (A, B) et `gammal → gamla` (B), avec `vit → vitt` pour éviter de laisser croire que tout adjectif en `-t` garde sa forme au neutre.
- Relecture complémentaire — `rule[1]`. Remplacer « toujours -a » par le modèle habituel, et donner les contre-exemples `bra` et `den gamle mannen`.

## sv-a2-preterite

Décision : approuvé.

- Retenue (B) — `rule[0]`. Expliquer que le prétérit peut traduire le passé composé selon le contexte. Le moment peut rester implicite, comme dans `Jag bodde i Lund`.
- Relecture complémentaire — `rule[1–2]`. Restreindre le modèle `-te / -de` au deuxième groupe faible et présenter l’alternance vocalique des verbes forts comme fréquente. `Komma → kom` garde la même voyelle.
- Relecture complémentaire — `exercises[0].prompt` et `exercises[2].prompt`. Indiquer le prétérit pour écarter la lecture narrative au présent.

## sv-a2-perfect

Décision : approuvé.

- Retenue (A, B) — `examples[0].note`. Décrire l’ordre `har + du + ätit`, ce qui indique clairement la place du sujet dans la question.
- Relecture complémentaire — `rule[1–2]`. Séparer les suffixes des verbes faibles des formes à mémoriser, dont `sett`, `haft` et `gjort`. Présenter le prétérit comme le choix habituel pour situer un fait dans une période révolue. Un repère daté peut aussi fixer le début d’une situation encore vraie avec le parfait.

## sv-a2-modals

Décision : approuvé.

- Retenue (B) — `rule[2]`. Opposer une interdiction avec `får inte` à l’absence d’obligation avec `behöver inte`. Les deux exemples complets donnent des formulations claires pour ces deux sens.
- Relecture complémentaire — `exercises[3].prompt` et `exercises[3].hint`. Employer `tala bra svenska` et demander le présent de `kunna`. `Kunde` convenait aussi dans l’exercice sans temps imposé.

## sv-a2-future

Décision : approuvé.

- Retenue (A) — `exercises[3].hint`. Remplacer l’indice qui donnait littéralement les réponses. Le nouvel indice demande le présent de `komma` dans une prévision.
- Retenue (A, B, doute) — `rule[1]` et `exercises[3].answers`. Accepter `kommer att` et `kommer`. La forme sans `att` est correcte, et la forme avec `att` reste plus fréquente dans les textes imprimés. [Språkrådet — Kommer avec ou sans att](https://frageladan.isof.se/faqs/20943)
- Relecture complémentaire — `rule[1]` montre aussi que `ska` peut annoncer une prévision. `exercises[1]` demande le marqueur de l’infinitif et explique son caractère facultatif avec `kommer`. `exercises[3].explanation` donne les deux formulations acceptées.

## sv-a2-reflexive

Décision : approuvé.

- Retenue (A, B) — `exercises[1]`. Remplacer `Per har ___ hus` par `Per äter ___ äpple`. Le pluriel `hus` autorisait `sina`, tandis que le pluriel d’`äpple` est `äpplen`.
- Retenue (A, B) — `exercises[2].prompt`. Préciser « Elle se lave ». Sans cette précision, `Hon tvättar henne` est correct lorsque le complément désigne une autre femme.
- Retenue (A) — `examples[2].note`. Rendre explicite le renvoi de `sig` au sujet `de`. L’ancienne formulation se lisait comme la locution française « au sujet de ».
- Écartée (A, doute) — `De klär sig` est correct et convient à l’illustration du pronom réfléchi. `Klä på sig` est une autre construction usuelle.
- Relecture complémentaire — `rule[2]) explique l’ambiguïté du possessif français, qui ne s’étend pas à « elle se lave » et « elle la lave ». `exercises[4].instruction` demande de remplacer le possessif seul, ce qui évite de refuser une reformulation comme `Per älskar sin egen fru`.

## sv-b1-subordinate

Décision : approuvé.

- Retenue (A, B, doute) — `rule[0]`, `exercises[0].prompt` et `exercises[3].instruction`. Indiquer que l’ordre de principale se rencontre dans certaines subordonnées en `att` à l’oral et dans l’écrit familier. Les deux exercices visent explicitement l’écrit standard. [Språkrådet — Ordre dans la subordonnée](https://frageladan.isof.se/faqs/21486)
- Relecture complémentaire — `rule[1]`. Comparer la place de la négation en français et en suédois dans la principale puis dans la subordonnée.

## sv-b1-particle-verbs

Décision : approuvé.

- Retenue (A, B) — `rule[0]). Donner `ringa dig` comme exemple de `ringa` au sens de « téléphoner », et `komma in` comme exemple de combinaison avec particule.
- Écartée (B, doute) — `Stänga av lampan` convient à l’exercice. Le fait que `släcka lampan` soit également idiomatique ne rend pas la réponse proposée incorrecte.
- Relecture complémentaire — `rule[1–2]`. Préciser que la particule est distincte à l’écrit et qu’un adverbe peut séparer le verbe de la particule, comme dans `Ge inte upp!`
- Relecture complémentaire — `exercises[1–2].prompt`. Fixer le sens des deux phrases. `Ge ut` existe, et `ringa in någon` peut signifier faire venir quelqu’un par téléphone.

## sv-b1-passive

Décision : approuvé.

- Retenue (A, B) — `exercises[2].options`. Écarter `till`, qui permettait une phrase correcte avec Anna comme destinataire. Le choix `från` de A reste un distracteur plausible pour « de ». `Vid`, proposé par B, présente un piège moins directement lié à la distinction entre l’origine et l’agent. L’énoncé précise désormais le sens « par Anna ».
- Retenue (B) — `rule[2]`. Distinguer l’action `Dörren stängs` de l’état `Dörren är stängd` en formulant cette opposition à partir de cet exemple.
- Retenue (B, doute) — `exercises[0].prompt`. Demander explicitement le passif, puisque `stänger` peut se rencontrer avec un sujet qui désigne un lieu ou un accès.
- Écartée (A, doute) — `Butiken öppnas klockan nio` illustre correctement le passif. Sa traduction devient « On ouvre le magasin à neuf heures », ce qui conserve la distinction avec l’actif intransitif.
- Relecture complémentaire — `exercises[3].hint` fixe le présent du passif en `-s`, car `öppnades` était aussi possible. `exercises[4].instruction` exige le passif en `-s`, `Brevet` en tête et le maintien de l’agent. Une construction avec `bli` répondait aussi à l’ancienne consigne.

## sv-b1-relative

Décision : approuvé.

- Relecture complémentaire — `rule[0–2]`, `examples[0–1].note` et `exercises[3].explanation`. Distinguer `som`, qui introduit la relative, du rôle du nom repris. Expliquer que la préposition reste dans la relative et peut être suivie d’autres mots, comme dans `Huset som jag har bott i sedan 2020`. Illustrer l’omission de `som` avec `Huset jag bor i`.
- Relecture complémentaire — `exercises[4].instruction`. Préciser laquelle des deux phrases doit devenir la relative. L’ancienne consigne permettait aussi `Den bil som jag har är röd`.

## sv-b1-comparison

Décision : approuvé.

- Retenue (A) — `rule[2]`. Donner `den snabbaste bilen`, puis les irréguliers `den största bilen` et `den bästa filmen`. La formulation sépare le modèle régulier des irréguliers et précise le rôle de `än`.
- Retenue (A, doute) — `rule[0]`. Présenter `mer` et `mest` comme fréquents pour les adjectifs longs et préciser que certains admettent les deux constructions. `Intressantare` est attesté. [Svenska Akademiens grammatik, vol. 3](https://svenska.se/SAG_Volym_3.pdf)
- Retenue (A, B) — `exercises[4]`. Garder la comparaison entre le chien et le chat proposée par A. La comparaison entre deux sacs proposée par B convient également. Le nouvel énoncé demande de remplacer seulement le segment de comparaison, ce qui fixe la réponse attendue.
- Relecture complémentaire — `exercises[2].prompt`. Indiquer « La meilleure » pour départager `bästa` et `bättre`, puisque `den bättre filmen` est possible lorsque deux films sont opposés.

## sv-b1-pluperfect-conditional

Décision : approuvé.

- Retenue (B) — `rule[2]). Remplacer « après om, jamais skulle » par des exemples qui distinguent l’irréel présent, l’irréel passé et l’éventualité future. `Om det skulle regna` illustre cette dernière construction sans lui attribuer une exclusivité.
- Retenue (A, doute) — `rule[2]` et `table.rows[3][0]`. Donner aussi `skulle jag ha kommit` dans la principale de l’hypothèse passée et garder le tableau centré sur la forme de la condition.

## Doutes

Les variantes de registre ou de graphie relevées par les passes sont tranchées dans les fiches concernées. Aucun doute ne bloque la publication des fiches corrigées.

## Vérification

L’exécution à blanc sur une copie du cours du commit `2a9f5b4` a reconnu les 91 remplacements. Le script a ensuite appliqué les corrections, validé le cours et posé `aiReview` sur les 18 fiches avec le modèle `Codex (GPT-6)` et la grille `x0-chatgpt-2026-11-10`. Les identifiants et `reviewedOn` sont identiques à ceux du commit de départ.

## Ajustement final

Dans `sv-a2-perfect`, la note de l’exemple `I går åt jag fisk` explique que le repas appartient à une période révolue. Le remplacement existant a été précisé et le total reste de 91.
