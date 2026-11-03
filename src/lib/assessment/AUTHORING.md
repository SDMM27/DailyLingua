# Dossiers de bilan : règles de rédaction

Un dossier = une épreuve de lecture, une épreuve d'écoute (la suite, enregistrée par un natif) et une
consigne d'expression écrite, à un niveau CECR donné. Un fichier par dossier :
`src/lib/assessment/dossiers/<langue>/<niveau>-<n>.ts`, qui exporte
`export const dossier: AssessmentDossier = { ... }` (type de `@/lib/schemas/assessment`), et un baril
`dossiers/<langue>/index.ts`. Pilote : `ru` et `it`, de `a1-1` à `c2-1`.
Vérification : `npm run assessment:check -- <langue>`. Le test `dossiers/dossiers.test.ts`
(`describe.skip` tant que les brouillons sont des `TODO`) se réactive une fois les 12 dossiers écrits.

## Limites par niveau

| Niveau | Mots du texte | Mots du script oral | Secondes visées | Phrases d'expression |
| ------ | ------------- | ------------------- | --------------- | -------------------- |
| A1     | 60–90         | 25–45               | 20              | 3                    |
| A2     | 100–140       | 30–50               | 20              | 3                    |
| B1     | 160–220       | 60–90               | 35              | 4                    |
| B2     | 230–300       | 100–150             | 50              | 5                    |
| C1     | 300–400       | 120–175             | 55              | 6                    |
| C2     | 350–450       | 140–200             | 60              | 6                    |

Les mots sont comptés par `countWords` (segmentation Unicode) ; la source de vérité est
`ASSESSMENT_LIMITS` dans `src/lib/schemas/assessment.ts`.

## Identifiants

- `id` : `<langue>-<niveau en minuscules>-<n>` (`ru-b1-1`), cohérent avec la langue et le niveau du
  dossier. Ne jamais le renommer : les résultats y renvoient.
- Questions : `<id>-r1` à `<id>-r3` (lecture), `<id>-l1` à `<id>-l3` (écoute). Exactement 3 par épreuve.
- `audio.file` : `/assessment/<langue>/<id>.m4a`.

## Textes

- **Originaux**, jamais adaptés d'un article réel (politique de licence du projet). À partir de B1,
  style article de presse. Pas de marque, pas de personne réelle vivante, pas de chiffre présenté
  comme réel. Sujets neutres.
- Un dossier = un thème de `TOPICS` (`topic`). `title` dans la langue étudiée.
- Le `script` oral est **la suite** du texte écrit (pas une copie, aucune phrase commune) et se
  comprend seul. Il sonne parlé ; de légères marques d'oralité (hésitations, reprises) seulement à
  partir de B2.
- La difficulté est celle du niveau CECR visé (lexique, syntaxe), pas seulement la longueur. Pour le
  russe, les accents toniques ne sont pas marqués, sauf en A1 si cela aide.
- Pas d'espace en début ni en fin de texte.

## Questions

- 3 questions ouvertes par épreuve, **en français**, sur le sens :
  - A1-A2 : l'information explicite ;
  - B1-B2 : l'idée principale et un détail, une inférence simple ;
  - C1-C2 : l'implicite, le ton, l'intention de l'auteur.
- À partir de B1, aucune question ne se répond en recopiant une phrase du texte.
- Chaque élément de `expectedPoints` doit être essentiel et figurer dans `referenceAnswer` : le correcteur compte comme partielle une réponse à laquelle il en manque un.
- Consignes, énoncés et réponses de référence s'adressent à l'apprenant en le tutoyant, comme le reste de l'app.
- `referenceAnswer` : la réponse complète, en français. `expectedPoints` : 1 à 4 éléments notables,
  séparés, en français ; c'est ce que le correcteur cherche dans la réponse.

## Expression écrite

`writing.prompt` : consigne en français, liée au dossier (son thème, sa situation), réalisable dans le
nombre de phrases du niveau (3, 3, 4, 5, 6, 6). Ce nombre n'est pas stocké : il vient de
`ASSESSMENT_LIMITS`.

## Relecture et enregistrement

- `reviewedOn: null` et `audio: null` à la rédaction. Seul un relecteur natif renseigne `reviewedOn`
  (date de sa relecture) ; ne jamais l'inventer.
- `audio` n'est renseigné qu'avec un enregistrement et une autorisation signée (hors dépôt) :
  `speaker` (prénom ou pseudonyme seulement), `licence: "granted-commercial"`, `recordedOn`.
- Un dossier est visible en production quand `reviewedOn` ET `audio` sont renseignés ; les brouillons
  sont visibles ailleurs, ou avec `ASSESSMENT_DRAFTS=show`.
- Le script et les réponses de référence ne partent jamais vers le navigateur avant la fin de l'épreuve.

## Passages YouTube (épreuve d'écoute)

L'épreuve d'écoute peut porter sur un passage d'une vidéo YouTube au lieu d'un script enregistré :
`listening: { source: "youtube", video: { youtubeId, title, channel, start, end, checkedOn }, questions }`
(les dossiers à script ont `source: "script"`). Règles (décision et passages pilotes :
`docs/assessment/youtube-listening-pilot.md`) :

- Lecture par le lecteur intégré seulement (`youtube-nocookie.com`) : pas de téléchargement, pas de son
  seul, lecteur jamais masqué. Sous-titres YouTube coupés pendant l'épreuve (`cc_load_policy=0`,
  contrôles masqués) : choisir des passages sans texte incrusté qui donne les réponses.
- **Pas de transcription stockée** : seulement l'identifiant, `title` et `channel` (attribution affichée
  sous le lecteur), `start` et `end` en secondes entières, nos questions et nos réponses de référence.
  Il n'y a pas de script : `audio` reste `null`.
- Durée du passage (`end - start`) par niveau, contrôlée par `assessment:check` (`ASSESSMENT_LIMITS[niveau].video`) :
  A1 15–60 s, A2 20–75 s, B1 30–90 s, B2 45–120 s, C1 45–150 s, C2 45–150 s.
- `checkedOn` : date à laquelle un humain a **écouté** le passage et validé les bornes, le niveau, les
  questions et l'absence de texte à l'écran qui donne les réponses. Ne jamais l'inventer ; `null` = pas
  encore validé.
- Publication (politique « hide ») : `reviewedOn` ET `video.checkedOn` renseignés (au lieu de `audio`).
- Une vidéo supprimée, privée ou non intégrable rend le dossier indisponible : `npm run assessment:check`
  le contrôle en ligne (oEmbed), `--offline` pour sauter ce contrôle.
- Une publicité peut précéder l'extrait : l'écran le dit, et une écoute ne compte qu'au moment où le
  passage se lit.
