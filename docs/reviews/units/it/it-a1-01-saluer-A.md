# Relecture unité — italien — passe A

Fichier : `packages/content/src/units/it/01-saluer.ts` (unité `it-a1-01-saluer`) · Date : 2026-11-23 · Relecteur : agent relecteur-natif (claude-opus-5-5)

Notation prise en compte (`packages/core/src/units/grade.ts`, `packages/core/src/grading/`) : casse, espaces en trop, ponctuation finale et ponctuation interne (sauf apostrophe) ignorées pour `cloze`, `type` et `order` ; accents tolérés en mode « lenient » (verdict « presque »). Une espace en plus ou en moins dans un mot n'est **pas** absorbée.

## Synthèse
33 éléments relus (en-tête, dialogue, gloses, phrases-clés, résumé de grammaire, 22 items, leçons, test, conversation, typographie) · 24 sans remarque · 9 avec remarques (0 bloquante, 6 importantes, 4 mineures)

Le contenu est en italien standard, juste et naturel. Il est au bon niveau pour un débutant complet. Aucun item n'a deux bonnes réponses parmi ses options, et chaque `answer` pointe la bonne option. Les remarques portent surtout sur trois bonnes réponses refusées (i05, i10, i14) et sur une règle de prononciation mal formulée dans le résumé.

## En-tête (title, situation, canDo, grammarPointId)
Verdict : ok

## dialogue.lines (d1–d9)
Verdict : à corriger
- [mineur] dialogue.lines[7].text (d8) — Actuel : « Piacere, Anna! Ora vado. A presto! » — Proposé : « Piacere, Anna! Scusate, ora vado. A presto! » — Pourquoi : la phrase est correcte. Mais Leo part juste après avoir rencontré Anna, et un natif trouverait ce départ un peu sec sans un mot d’excuse. *Scusate* n’est pas encore vu : il faudrait le gloser (fr « excusez-moi (à plusieurs) », en « sorry, excuse me (to several people) »). Sinon, on garde la réplique telle quelle, car elle reste acceptable.
- Les autres répliques sont naturelles et leurs traductions FR et EN sont fidèles. *Lei è Anna* est bien la formule pour présenter quelqu’un. *Piacere mio!* est bien rendu en anglais par « Nice to meet you too! ». En français, « Enchantée ! » reste naturel.

## dialogue.glosses
Verdict : à corriger
- [important] glosses[buongiorno].note — Actuel : fr « À un inconnu, dans un magasin, à une personne plus âgée. Entre amis : ciao. » / en « To a stranger, in a shop, to an older person. With friends: ciao. » — Proposé : fr « À un inconnu, dans un magasin, à une personne plus âgée, du matin au début de l’après-midi (ensuite : buonasera). Entre amis : ciao. » / en « To a stranger, in a shop, to an older person, from morning to early afternoon (later: buonasera). With friends: ciao. » — Pourquoi : c’est le vrai piège pour un francophone. On dit « bonjour » jusqu’au soir, alors qu’un Italien passe à *buonasera* dès le milieu de l’après-midi. Sans cette précision, l’apprenant dira *buongiorno* à 17 h.
- Les autres gloses sont justes. Les notes sur *e*/*è*, *si*/*sì*, *ch* = « k », *francese* invariable et *italiana*/*italiano* sont utiles et exactes.

## keyPhrases (k1–k8)
Verdict : à corriger
- [mineur] keyPhrases[7].translation (k8) — Actuel : fr « Bonjour ! (poli : à un inconnu, dans un magasin ; entre amis, ciao) » / en « Hello! (polite: to a stranger, in a shop; with friends, ciao) » — Proposé : fr « Bonjour ! (poli) » / en « Hello! (polite) » — Pourquoi : cette traduction sert de verso à une carte FSRS. Une parenthèse aussi longue alourdit la carte, et la nuance est déjà dans la glose et dans i04. C’est la forme qu’emploie i04.

## grammar.summary
Verdict : à corriger
- [important] grammar.summary (fr, ligne 5) — Actuel : « Prononciation : ci se dit « tchi » (ciao), chi se dit « ki » (chi, chiamo). » — Proposé : « Prononciation : c devant e ou i se dit « tch » (ciao = « tchao », piacere = « piatchéré ») ; ch se dit « k » (che = « ké », chi = « ki », chiamo = « kiamo »). » — Pourquoi : dans *ciao*, le *i* ne se prononce pas : on dit « tchao », pas « tchi-ao ». Écrire « ci se dit tchi (ciao) » est donc trompeur. Par ailleurs, *piacere* (ce = « tché ») et *che* (« ké ») reviennent sans cesse dans l’unité et ne sont expliqués nulle part.
- [important] grammar.summary (en, ligne 5) — Actuel : « Pronunciation: ci sounds like "chee" (ciao), chi sounds like "key" (chi, chiamo). » — Proposé : « Pronunciation: c before e or i sounds like "ch" in "church" (ciao = "chow", piacere = "pyah-cheh-reh"); ch sounds like "k" (che = "keh", chi = "key", chiamo = "kyah-mo"). » — Pourquoi : même défaut qu’en français, puisque *ciao* ne se dit pas « chee-ao ».
- Les lignes 1 à 4 sont justes et adaptées au niveau, dans les deux langues.

## i01
Verdict : ok

## i02
Verdict : ok

## i03
Verdict : ok

## i04
Verdict : ok

## i05
Verdict : à corriger
- [important] items[i05].accept — Actuel : `["sono"]` — Proposé : `["sono", "mi chiamo"]` — Pourquoi : *Io mi chiamo Leo* est parfaitement correct et naturel, et c’est la formule que l’unité vient de faire répéter. L’indice « essere, avec io » oriente vers *sono*, mais il peut rester replié, et refuser une bonne réponse décourage. Les deux formes sont dans les gloses, donc l’invariant de `units:check` reste respecté. Autre solution : garder `["sono"]` et afficher la consigne « essere » dans l’énoncé lui-même.

## i06
Verdict : ok

## i07
Verdict : ok

## i08
Verdict : à corriger
- [mineur] items[i08].tokens — Actuel : `["chiamo", "Leo", "Mi"]`, distracteur `["ti"]` — Proposé : garder les tokens, mais mettre le distracteur en majuscule : `["Ti"]` — Pourquoi : *Mi* a une majuscule et *ti* non, ce qui désigne d’office le premier mot et écarte le distracteur sans réflexion. La notation ignore la casse, donc le changement ne coûte rien. Même remarque pour i09 (`mi` contre `Come`), mais là, le mot capitalisé *Come* ne trahit pas le distracteur : rien à changer.

## i09
Verdict : ok

## i10
Verdict : à corriger
- [important] items[i10].accept — Actuel : `[]` — Proposé : `["Sei di dove?"]`, et explain fr « Mot à mot : « De où es-tu ? ». L’ordre le plus courant est Di dove sei ? ; à l’oral, on entend aussi Sei di dove ? » / en « Literally "From where are you?". The usual order is Di dove sei?; in speech you also hear Sei di dove? » — Pourquoi : la consigne française « Tu es d’où ? » pousse l’apprenant à calquer *Sei di dove?*. Or cet ordre s’entend couramment à l’oral familier en Italie. Ce n’est pas une faute, il serait donc injuste de le refuser. La notation ignore la casse, donc la majuscule du token *Di* ne bloque pas. Si l’arbitre préfère n’accepter que l’ordre standard, il faut au moins changer la consigne en « D’où es-tu ? » (en : inchangé).

## i11
Verdict : ok

## i12
Verdict : ok

## i13
Verdict : ok
(*Sono francese* et *Io sono francese* sont listés. Un *Sono francese, di Parigi* plus long serait refusé, mais il dépasse la consigne : acceptable.)

## i14
Verdict : à corriger
- [important] items[i14].accept — Actuel : `["Buongiorno"]` — Proposé : `["Buongiorno", "Buon giorno"]`, et explain fr « Buongiorno (on l’écrit aujourd’hui en un seul mot). Ciao est pour les amis. » / en « Buongiorno (usually written as one word today). Ciao is for friends. » — Pourquoi : *buon giorno* en deux mots est une graphie correcte (Treccani donne les deux), et un débutant l’écrira souvent. La notation ne fusionne pas les espaces, donc cette réponse est refusée aujourd’hui. Attention : *buon* et *giorno* ne sont pas dans les gloses, et l’invariant de `units:check` refuserait cette variante. Il faudrait soit gloser les deux mots dans la note de *buongiorno*, soit assouplir l’invariant (voir Doutes).

## i15
Verdict : ok

## i16
Verdict : ok

## i17
Verdict : ok
(Le contexte « le matin, dans une boutique » rend *Buongiorno!* seule bonne réponse défendable. Le commentaire REVIEW sur *ciao* est juste et ne remet pas l’item en cause.)

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

## lessons
Verdict : ok
(Les seuils sont conformes à la spec. Chaque item est rattaché à une étape.)

## test
Verdict : ok
(Il y a 10 items, tous déjà vus. Le test mêle choix, ordre, écoute, saisie et trou, avec une difficulté adaptée.)

## conversation.turns (c1–c7)
Verdict : ok
(c6 reprend « Ora vado. A presto! ». Ici, le départ est naturel, car Anna n’apparaît pas dans la conversation.)

## Typographie française (tout le fichier)
Verdict : à corriger
- [mineur] tous les champs `fr` — Actuel : apostrophe droite (« t'appelles », « D'où », « d'où ») et espace ordinaire avant `: ? !` — Proposé : apostrophe typographique ’ (« t’appelles », « D’où ») et espace insécable avant `: ; ? !` — Pourquoi : c’est la règle du projet pour le texte français (`src/lib/grammar/AUTHORING.md`). L’apostrophe droite reste dans l’italien, mais aucune n’y figure ici.

## Doutes
- **Fiche « sons et orthographe »** : `j4-parcours-debutant.md` §3 prévoit d’intégrer à l’unité 1 italienne une fiche sur c/ch, g/gh, gli, gn et sc. Le fichier n’en contient qu’une ligne (c/ch) dans le résumé de grammaire. Je ne sais pas si cette fiche doit vivre dans ce fichier ou ailleurs : c’est à l’arbitre ou à l’orchestrateur de le vérifier.
- **i14, *Buon giorno*** : la variante est correcte, mais elle se heurte à l’invariant « chaque réponse acceptée est faite de formes vues ». Faut-il ajouter une glose (ex. une entrée `form: "buon giorno"` ou une mention dans la note) ou laisser l’explication « en un seul mot » faire foi ? Je penche pour accepter la variante.
- **i10, *Sei di dove?*** : cet ordre est familier mais très répandu à l’oral, surtout dans le Centre et le Sud. Je ne le considère pas comme régional au sens strict. Si l’arbitre juge qu’un contenu A1 ne doit accepter que l’ordre standard, il faut alors changer la consigne française pour ne pas induire le calque.
- **d8, départ de Leo** : remarque de goût (mineure). La réplique est correcte en l’état.
- **Voix** : la même voix féminine (Paola) lit Leo, ce qui est signalé en REVIEW. L’italien n’est pas en cause, mais un débutant qui entend une voix de femme dire « Sono francese » pourrait croire que la forme est féminine. La glose précise que *francese* est invariable, donc le risque est faible.
