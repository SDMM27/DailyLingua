# Relecture unité — italien — passe B

Fichier : packages/content/src/units/it/01-saluer.ts · Date : 2026-11-23 · Relecteur : agent relecteur-natif (claude-opus-5-5)

Notation prise en compte (`packages/core/src/units/grade.ts`, `grading/`) : casse, ponctuation finale et ponctuation interne ignorées pour `cloze`, `type` et `order` ; un écart d'accent seul est compté juste en mode tolérant ; un espace en plus ou en moins n'est **pas** absorbé.

## Synthèse
29 éléments relus (en-tête, dialogue, gloses, phrases-clés, résumé de grammaire, 22 items, conversation, test) · 22 sans remarque · 7 avec remarques (0 bloquante, 5 importantes, 7 mineures)

Jugement d'ensemble : l'italien du dialogue est correct et naturel, sans faute de langue ; aucun item n'a zéro ou deux bonnes réponses ; le niveau convient à un débutant complet (une trentaine de mots nouveaux, une seule structure grammaticale). Les remarques portent sur l'usage de *buongiorno* (heure de la journée, graphie en deux mots), l'absence d'*arrivederci* alors que l'objectif cd1 est « dire au revoir », et une règle de prononciation trompeuse dans le résumé.

## En-tête (title, situation, canDo)
Verdict : ok

Titre, situation et « Je peux… » justes en français et en anglais. Voir la remarque sur *arrivederci* dans « Gloses » : elle conditionne la couverture de cd1.

## dialogue (d1–d9)
Verdict : à corriger
- [mineur] dialogue.lines[d3].translation.fr — Actuel : « Enchantée ! Tu es d'où ? » — Proposé : « Enchantée aussi ! Tu es d'où ? » — Pourquoi : *Piacere mio* répond à *Piacere* ; la glose de *mio* le traduit déjà « Enchanté(e) aussi », et la traduction anglaise rend bien la nuance (« Nice to meet you too! »). Les deux langues doivent dire la même chose.

Le reste est correct : *Ciao! Io sono Giulia. E tu, come ti chiami?*, *Di dove sei?*, *Sei italiana?*, *Lei è Anna. È russa, di Mosca.* sont naturels. Le départ de Leo (d8) est un peu brusque, mais grammaticalement et socialement acceptable (voir Doutes).

## Gloses (dialogue.glosses)
Verdict : à corriger
- [important] dialogue.glosses[form="buongiorno"].note — Actuel : fr « À un inconnu, dans un magasin, à une personne plus âgée. Entre amis : ciao. » / en « To a stranger, in a shop, to an older person. With friends: ciao. » — Proposé : fr « Le matin et jusqu'en début d'après-midi, à un inconnu, dans un magasin, à une personne plus âgée. Le soir, on dit buonasera. Entre amis : ciao. » / en « In the morning and until early afternoon, to a stranger, in a shop, to an older person. In the evening, say buonasera. With friends: ciao. » — Pourquoi : *buongiorno* n'est pas un « bonjour » valable toute la journée comme en français ; dire *buongiorno* à 19 h est l'erreur typique du francophone, et c'est le vrai piège de ce mot.
- [important] dialogue.glosses (ajout, et objectif cd1) — Actuel : aucune forme polie pour « au revoir » ; seuls *ciao* et *a presto* sont enseignés. — Proposé : ajouter après la glose *buongiorno* : `{ form: "arrivederci", lemma: "arrivederci", meaning: { fr: "au revoir (poli)", en: "goodbye (polite)" }, note: { fr: "Pour partir, dans un magasin ou avec un inconnu. Entre amis : ciao.", en: "When leaving, in a shop or with a stranger. With friends: ciao." }, isNew: true }` (et, si la place le permet, une phrase-clé « Arrivederci! » sur le modèle de k8). — Pourquoi : l'unité enseigne le *bonjour* poli mais pas l'*au revoir* poli ; un apprenant qui entre avec *Buongiorno* dans une boutique ressortira avec *A presto!* ou *Ciao!*, ce qui ne va pas avec un commerçant. cd1 (« dire bonjour et au revoir ») n'est couvert qu'au registre familier.
- [mineur] dialogue.glosses[form="mio"].meaning — Actuel : fr « mien » / en « mine » — Proposé : fr « mon, le mien » / en « my, mine » — Pourquoi : « mien » seul est un mot rare en français moderne, peu parlant pour un débutant ; *mio* est d'abord l'adjectif « mon ».

Les autres gloses sont justes (prononciations de *ciao*, *chi*, *chiami* ; distinctions *e/è*, *si/sì* ; formes féminines *italiana*, *russa*).

## Phrases-clés (keyPhrases k1–k8)
Verdict : à corriger
- [mineur] keyPhrases[k8].translation — Actuel : fr « Bonjour ! (poli : à un inconnu, dans un magasin ; entre amis, ciao) » / en « Hello! (polite: to a stranger, in a shop; with friends, ciao) » — Proposé : fr « Bonjour ! (poli, le matin : à un inconnu, dans un magasin ; entre amis, ciao) » / en « Hello! (polite, in the morning: to a stranger, in a shop; with friends, ciao) » — Pourquoi : la carte de révision qui naîtra de k8 doit porter la même restriction d'heure que la glose.

k1 à k7 : textes et traductions corrects.

## Résumé de grammaire (grammar.summary)
Verdict : à corriger
- [important] grammar.summary, ligne 5 — Actuel : fr « Prononciation : ci se dit « tchi » (ciao), chi se dit « ki » (chi, chiamo). » / en « Pronunciation: ci sounds like "chee" (ciao), chi sounds like "key" (chi, chiamo). » — Proposé : fr « Prononciation : ci se dit « tchi », et devant une autre voyelle le i ne s'entend pas (ciao = « tchao ») ; chi se dit « ki » (chi, chiamo = « kiamo »). » / en « Pronunciation: ci sounds like "chee", and before another vowel the i is silent (ciao = "chow"); chi sounds like "key" (chi, chiamo = "kyah-mo"). » — Pourquoi : l'exemple *ciao* contredit la règle telle qu'écrite : on n'y entend pas « tchi » ; un débutant risque de prononcer « tchi-ao ».
- [important] grammar.summary, ligne 2 — Actuel : fr « D'où tu viens : sono di + ville (sono di Parigi). Ta nationalité : sono francese, sono italiana. » / en « Where you're from: sono di + city (sono di Parigi). Your nationality: sono francese, sono italiana. » — Proposé : fr « D'où tu viens : sono di + ville (sono di Parigi). Pour le pays, on donne la nationalité : sono francese, et non « sono di Francia ». » / en « Where you're from: sono di + city (sono di Parigi). For the country, give your nationality: sono francese, not "sono di Francia". » — Pourquoi : *di* ne s'emploie qu'avec la ville ; le calque « je suis de France » → *sono di Francia* est le piège réel pour un francophone. La reformulation garde 5 lignes.

Lignes 1, 3 et 4 : justes.

## i01
Verdict : ok

## i02
Verdict : ok

## i03
Verdict : ok

## i04
Verdict : ok

## i05
Verdict : ok

L'indice « essere, avec io » écarte bien *mi chiamo*, qui serait sinon correct dans le trou.

## i06
Verdict : ok

## i07
Verdict : ok

## i08
Verdict : ok

## i09
Verdict : ok

## i10
Verdict : ok

## i11
Verdict : ok

## i12
Verdict : ok

## i13
Verdict : à corriger
- [mineur] items[i13].prompt.fr — Actuel : « Écris en italien : « Je suis français. » ou « Je suis française. » » — Proposé : « Écris en italien : « Je suis français » (ou « française »). » — Pourquoi : la consigne actuelle se lit comme deux phrases à écrire ; la parenthèse dit plus simplement que les deux donnent la même réponse.

`accept` (« Sono francese », « Io sono francese ») couvre les variantes naturelles.

## i14
Verdict : à corriger
- [important] items[i14].accept — Actuel : `["Buongiorno"]` — Proposé : `["Buongiorno", "Buon giorno"]` — Pourquoi : la graphie en deux mots est correcte et admise par les dictionnaires (Treccani, Zingarelli : « buongiorno o buon giorno ») ; la comparaison n'ignore pas l'espace, donc elle est aujourd'hui refusée, et cet item est dans le test. Voir Doutes sur l'invariant des formes.
- [mineur] items[i14].explain — Actuel : fr « Buongiorno, en un seul mot. Ciao est pour les amis. » / en « Buongiorno, one word. Ciao is for friends. » — Proposé : fr « Buongiorno, qu'on écrit le plus souvent en un seul mot. Ciao est pour les amis. » / en « Buongiorno, usually written as one word. Ciao is for friends. » — Pourquoi : la version actuelle laisse croire que *buon giorno* est une faute.
- [mineur] items[i14].prompt — Actuel : fr « Écris en italien le « Bonjour ! » poli, pour une personne que tu ne connais pas. » / en « Write the polite Italian "Hello!", for someone you don't know. » — Proposé : fr « Le matin, écris en italien le « Bonjour ! » poli, pour une personne que tu ne connais pas. » / en « In the morning, write the polite Italian "Hello!", for someone you don't know. » — Pourquoi : sans moment de la journée, *buonasera* serait aussi juste ; i17 précise déjà « le matin ».

## i15
Verdict : ok

## i16
Verdict : ok

## i17
Verdict : ok

Le commentaire REVIEW est juste : *ciao* peut s'entendre d'un jeune vendeur, mais *buongiorno* reste la seule réponse à enseigner ; *A presto!* est clairement faux à l'entrée.

## i18
Verdict : ok

## i19
Verdict : ok

## i20
Verdict : ok

## i21
Verdict : ok

## i22
Verdict : ok

## conversation (c1–c7)
Verdict : à corriger
- [mineur] conversation.turns[c3].translation.fr — Actuel : « Enchantée ! Tu es d'où ? » — Proposé : « Enchantée aussi ! Tu es d'où ? » — Pourquoi : même remarque que pour d3 (*Piacere mio*).

Les répliques de l'apprenant (c2, c4, c6) correspondent bien à i20, i21 et i22.

## test
Verdict : ok

10 items, tous vus dans une étape, passScore 8. i14 en fait partie : la variante *Buon giorno* manquante y pèse davantage.

## Doutes
- **Invariant des formes et i14** : `units:check` exige que chaque réponse acceptée soit faite de formes présentes dans le dialogue, les phrases-clés ou les gloses. Ajouter « Buon giorno » demandera peut-être de gloser *buon* et *giorno*, ou une exception. À l'arbitre de choisir entre ajouter la variante et seulement adoucir l'explication.
- **Apostrophe typographique** : toutes les chaînes françaises de l'unité, comme les autres unités et le curriculum italien, utilisent l'apostrophe droite ('), alors que `src/lib/grammar/AUTHORING.md` demande l'apostrophe typographique (’) en français. Je ne l'ai pas listé élément par élément : à trancher globalement (convention du paquet ou conversion à l'affichage).
- **Fiche « sons et orthographe »** : la spec (`j4-parcours-debutant.md` §3) prévoit dans l'unité 1 une fiche c/ch, g/gh, gli, gn, sc ; le fichier ne traite que ci/chi. Ce n'est pas une faute de contenu, mais c'est peut-être un manque par rapport à la spec.
- **Départ de Leo (d8, c6)** : partir juste après qu'on lui a présenté Anna est un peu abrupt. *Ora vado* reste naturel ; un *Scusate, ora devo andare* serait plus poli, mais il ajoute un verbe nouveau. Je laisse tel quel.
- **lei / Lei** : *lei* (elle) est aussi, avec la majuscule, le « vous » de politesse. C'est inutile à ce stade, mais à signaler dans l'unité qui introduira le vouvoiement.
- **Une seule voix (Paola) pour Leo** : la réplique masculine lue par une voix féminine peut troubler à l'écoute ; c'est déjà noté dans le fichier.
