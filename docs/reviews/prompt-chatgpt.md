# Prompt de relecture pour ChatGPT

À coller au début d'une **nouvelle** conversation ChatGPT, une conversation par langue. Joins ensuite, dans le même message :

1. `src/lib/grammar/AUTHORING.md` (règles de rédaction) ;
2. le fichier du cours, `src/lib/grammar/courses/<code>.ts` ;
3. en mode **arbitrage** seulement : les deux rapports `docs/reviews/grammar/<code>/pass-a.md` et `pass-b.md`.

Rapporte ensuite la réponse de ChatGPT dans le dépôt :
- le rapport → `docs/reviews/grammar/<code>/chatgpt.md` ;
- le bloc JSON → `docs/reviews/grammar/<code>/chatgpt-patch.json`.

État au 2026-11-10 :
- **arbitrage** (rapports déjà écrits) : `pt`, `sv` ;
- **relecture complète** : `pl`, `cs`, `uk`, `ro`, `el`, `tr`, `ar`, `zh`, `ja`, `ko`, `id`.

---

## Le prompt

```
# Rôle
Applique la grille d’un enseignant natif de la langue cible, formé à la didactique des langues et habitué à préparer des apprenants francophones aux examens du CECR. Tu relis, avant publication, des fiches de grammaire écrites par un modèle de langue pour l'application Daily Lingua. Ton avis sera présenté comme une relecture par IA. Sois exigeant et précis, et n'approuve que les fiches qui respectent la grille.

# Contexte
- Daily Lingua est une application d'apprentissage des langues pour francophones (mobile d'abord). Chaque langue a 18 points de grammaire (6 en A1, 6 en A2, 6 en B1).
- Chaque point contient : `title` et `summary` (français), `rule` (paragraphes en français), `table` facultatif, `examples` (phrase dans la langue cible + traduction et note en français), `exercises` (types `choose`, `fill`, `transform`, avec `explanation` en français), `categories`, `reviewedOn`.
- Les règles de rédaction sont dans AUTHORING.md (joint). Elles priment sur tes préférences : accent tonique, pinyin, kana, harakat, tonos, espaces, apostrophes, etc.
- L'application compare les réponses tapées sans tenir compte de la casse, des espaces en trop, de la ponctuation finale, et selon la langue de l'accent tonique, des harakat ou des espaces (voir AUTHORING.md). Une variante que cette comparaison absorbe déjà n'a pas besoin d'être listée.
- Langue cible : <LANGUE (code)>
- Mode : <RELECTURE COMPLÈTE | ARBITRAGE>
  - RELECTURE COMPLÈTE : tu relis seul les 18 points.
  - ARBITRAGE : deux relecteurs indépendants ont déjà écrit les rapports joints (passe A, passe B). Tu tranches chacune de leurs remarques (retenue ou écartée, avec une raison), puis tu relis toi-même chaque point en entier : une erreur vue par aucune passe se corrige aussi.

# Objectif
Pour chacun des 18 points : trouver les problèmes réels, proposer des corrections prêtes à appliquer, puis décider si le point peut être publié avec la mention « relu par IA ».

# Grille de relecture (pour chaque point)
1. Langue cible : orthographe, diacritiques, accords, conjugaison, cas, aspect, ordre des mots ; naturel (un natif dirait-il cette phrase ?) ; langue standard moderne ; règles propres à la langue dans AUTHORING.md (vérifie chaque accent, ton, lecture, voyelle).
2. Justesse pédagogique : la règle est vraie, sans exception importante passée sous silence au niveau visé ; le tableau est complet et exact ; la règle s'adresse à un francophone et nomme le vrai piège ; les traductions françaises sont fidèles ; le vocabulaire ne dépasse pas le niveau.
3. Exercices :
   - `choose` : UNE seule option correcte dans le contexte donné ; distracteurs plausibles mais vraiment faux ; `answer` = index (à partir de 0) de la bonne option. Vérifie systématiquement si un autre temps, une autre personne ou une autre lecture rend une deuxième option correcte : c'est l'erreur la plus fréquente.
   - `fill` et `transform` : `answers` liste TOUTES les réponses qu'un natif accepterait (variantes d'ordre des mots, deux aspects quand les deux sont corrects, formes contractées…) et aucune réponse fausse. Si l'indice ne fixe pas le temps ou la personne, plusieurs réponses sont correctes : précise l'indice ou ajoute les réponses.
   - Consigne claire ; l'indice aide sans donner la réponse ; l'explication est juste.
4. Français : correct, tutoiement, apostrophe typographique (’), espace insécable avant « : ; ? ! ».

Gravité :
- bloquant : faute de langue, règle fausse, exercice avec zéro ou deux bonnes réponses, bonne réponse refusée, `answer` qui pointe la mauvaise option ;
- important : phrase peu naturelle, explication trompeuse, variante acceptable manquante, accent ou diacritique mal placé, niveau inadapté ;
- mineur : formulation française, typographie.

# Contraintes
- Ne signale que des problèmes réels, pas des préférences de style.
- Ne change jamais un `id`, ni `reviewedOn`.
- Respecte les limites du schéma : `title` ≤ 80 caractères, `summary` ≤ 160, chaque paragraphe de `rule` ≤ 400 (1 à 6 paragraphes), phrase d'exemple ≤ 200, `prompt` ≤ 200, option ≤ 80, `explanation` ≤ 300, `hint` ≤ 60 ; 3 ou 4 options ; 3 à 5 exercices ; le `prompt` d'un `choose` ou d'un `fill` contient exactement un `___`.
- Un point est APPROUVÉ seulement si, une fois tes corrections appliquées, il ne reste aucun problème bloquant ou important et que tu le signerais comme natif. Sinon il RESTE BROUILLON : dis ce qu'il faudrait (doute d'usage, exercice à réécrire entièrement).
- Si tu n'es pas sûr d'un usage (régionalisme, variante discutée), ne l'invente pas : mets-le dans « Doutes » et laisse le point en brouillon si c'est important.

# Format de réponse
Réponds en deux parties, dans cet ordre, sans autre texte.

## Partie 1 : rapport (Markdown, en français)

# Relecture grammaire — <langue> — ChatGPT (<mode>)

## Synthèse
<n> points · <n> approuvés · <n> restent brouillons · <n> corrections (<n> bloquantes, <n> importantes, <n> mineures)

## <id du point>
Décision : approuvé | reste brouillon (<raison>)
- [bloquant|important|mineur] <champ exact, ex. exercises[2].answers> — Actuel : « … » — Proposé : « … » — Pourquoi : …
(en mode ARBITRAGE, ajoute pour chaque remarque des passes : Retenue (A, B) / Écartée (B) : raison)

## Doutes
…

## Partie 2 : correctifs (un seul bloc ```json)

{
  "language": "<code>",
  "approved": ["<id>", "..."],
  "drafts": ["<id>", "..."],
  "patches": [
    { "id": "<id du point>", "field": "<champ exact>", "find": "<texte actuel>", "replace": "<texte corrigé>" }
  ]
}

Règles pour `patches` :
- `find` est copié EXACTEMENT depuis le fichier joint, caractère par caractère (accents combinants, espaces insécables, apostrophes et guillemets compris), et il doit être UNIQUE dans tout le fichier : prends assez de contexte pour cela (la ligne entière si besoin).
- `replace` est le texte complet qui remplace `find`, dans la même syntaxe TypeScript (guillemets doubles, virgules, tableaux). Pour changer une liste de réponses, remplace la ligne `answers: [...]` entière.
- Un correctif par modification ; pas de chevauchement entre deux `find`.
- `approved` + `drafts` = les 18 identifiants, chacun une fois.
```

---

## Après ChatGPT

Les correctifs (`chatgpt-patch.json`) sont appliqués par :

```
npm run grammar:apply -- <code> --model "<modèle ChatGPT>" [--date AAAA-MM-JJ] [--rubric x0-chatgpt-2026-11-10] [--dry-run]
```

(`--dry-run` affiche le résumé sans écrire ; date par défaut = aujourd'hui, Europe/Paris.) Le script :
1. remplace chaque `find` par son `replace` (un `find` introuvable ou trouvé deux fois est signalé, pas appliqué) ;
2. pose `aiReview: { on: "<date>", model: "<modèle ChatGPT>", rubric: "x0-chatgpt-2026-11-10" }` sur les points `approved` ;
3. met `version` du cours à la date du jour ;
4. lance `npm run grammar:check -- <code>`.

La grille `x0-chatgpt-2026-11-10` identifie ce lot de 13 cours. Les rapports indiquent le mode utilisé pour chaque langue. Le portugais et le suédois ont deux passes indépendantes suivies d’un arbitrage. Les 11 autres cours ont une relecture complète, suivie d’une vérification de l’intégration des corrections. La grille `x0-2026-11-05` identifie le lot relu avec deux passes Claude et un arbitre.
