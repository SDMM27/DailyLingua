# Relecture grammaire — coréen — Codex (relecture complète)

## Synthèse

18 fiches et 84 exercices relus · 18 approuvées après correction · 0 brouillon · 139 remplacements (24 bloquants, 73 importants, 42 mineurs)

La relecture porte sur le cours du commit `2a9f5b4`. Les exercices distinguent le style poli courant et le style formel. Les espaces internes des réponses suivent l’orthographe du hangeul. Le [fichier de correctifs](chatgpt-patch.json) donne le texte de départ et le remplacement de chaque champ.

## ko-a1-copula

Décision : approuvé après correction.

- [bloquant] `rule[0]` — La forme non contractée 이에요 est aussi possible après une voyelle.
- [important] `rule[2]` — Évite de présenter l’ordre des mots comme absolu.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [bloquant] `exercises[0].prompt` — L’ancien choix autorisait la négation correcte 의사가 아니에요 et l’affirmatif non contracté.
- [important] `exercises[0].explanation` — Corrige l’identification de la voyelle et explique la contraction.
- [important] `exercises[2].prompt` — Fixe l’affirmatif et le modèle enseigné, en laissant l’apprenant choisir la forme adaptée.
- [bloquant] `exercises[2].answers` — 이어요 est une autre forme polie standard après consonne.
- [important] `exercises[2].explanation` — Rend compte des deux variantes.
- [bloquant] `exercises[3].instruction` — Sans cette précision, 선생님은 아니에요 est également possible en contexte contrastif.

[Institut national de la langue coréenne — 이에요 et 예요](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=327163) · [Règles de la langue standard](https://korean.go.kr/kornorms/m/m_regltn.do)

## ko-a1-topic-subject

Décision : approuvé après correction.

- [bloquant] `rule[2]` — Les interrogatifs ne prennent pas tous la particule de sujet.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[0].prompt` — On peut aussi s’identifier avec 제가 quand la question porte sur l’identité.
- [important] `exercises[1].prompt` — La consigne fixe la fonction évaluée.
- [important] `exercises[2].prompt` — Le thème serait possible dans un contexte qui l’oppose à d’autres meubles.
- [important] `exercises[3].prompt` — Cible la fonction dans cet échange.
- [important] `exercises[3].explanation` — Aligne l’explication sur le rôle syntaxique.

## ko-a1-object-particle

Décision : approuvé après correction.

- [important] `rule[1]` — L’ordre usuel n’est pas le seul possible.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [bloquant] `exercises[0].options` — 커피는 마셔요 est une phrase grammaticale avec un objet thématisé.
- [bloquant] `exercises[2].prompt` — Le trou sans indication peut aussi recevoir 는, 도 ou 만.
- [important] `exercises[3].instruction` — Précise la particule attendue et l’omission autorisée.

## ko-a1-place-particles

Décision : approuvé après correction.

- [important] `rule[1]` — Présente le rôle de lieu ou de destination plutôt que l’existence d’une action au sens large.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[0].prompt` — Fixe le rôle de lieu, car le nom peut avoir d’autres rôles syntaxiques.
- [important] `exercises[2].prompt` — Écarte 께, qui marque un destinataire honoré.
- [important] `exercises[3].hint` — La consigne exige le niveau de langue et le temps.

## ko-a1-present-polite

Décision : approuvé après correction.

- [important] `rule[1]` — La forme non contractée 하여요 est standard.
- [important] `rule[2]` — Les contractions ne sont pas systématiquement obligatoires.
- [important] `exercises[1].explanation` — Le radical se termine par une consonne, même si sa voyelle est ㅣ.
- [bloquant] `exercises[2].hint` — La phrase permet aussi un temps passé ou futur sans cette précision.
- [bloquant] `exercises[2].answers` — La forme non contractée est standard et doit être acceptée.
- [important] `exercises[2].explanation` — Explique les deux réponses.
- [bloquant] `exercises[3].hint` — Fixe le temps et le registre.

[Institut national de la langue coréenne — 하여요 et 해요](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=306903)

## ko-a1-numbers-counters

Décision : approuvé après correction.

- [important] `rule[1]` — Le schéma est fréquent. Certains groupes s’organisent autrement, par exemple 두 명의 학생.
- [important] `rule[2]` — Précise la différence entre vingt exactement et des nombres comme 스물다섯.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[1].explanation` — 칠 ne se limite pas aux minutes.

## ko-a2-past

Décision : approuvé après correction.

- [important] `rule[0]` — Le coréen possède d’autres formes qui situent ou envisagent le passé, notamment -았었-.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[0].prompt` — Le repère temporel ne suffit pas à imposer une flexion dans tous les récits.
- [important] `exercises[2].hint` — Fixe le temps plutôt que de s’appuyer uniquement sur 어제.
- [important] `exercises[3].hint` — Fixe le temps et le registre.
- [bloquant] `exercises[3].answers` — La forme non contractée est standard.
- [important] `exercises[3].explanation` — Explique les deux formes.
- [important] `exercises[4].instruction` — Fixe la construction et l’omission autorisée.

## ko-a2-future

Décision : approuvé après correction.

- [important] `rule[2]` — La supposition n’est pas limitée à la 3e personne, et le coréen a d’autres manières de parler de l’avenir.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [bloquant] `exercises[2].hint` — 내일 학교에 가요 est également correct sans construction imposée.
- [bloquant] `exercises[3].hint` — 뭐 해요? avec le repère du soir peut aussi interroger sur un projet.
- [bloquant] `exercises[4].instruction` — Impose le futur évalué et conserve les variantes de thème.

## ko-a2-negation

Décision : approuvé après correction.

- [important] `rule[1]` — Le découpage ne vaut pas pour tous les verbes en 하다. Le modèle distingue 못 하다 de 못하다, soudé dans certains sens.
- [important] `rule[2]` — Les formes longues ne sont pas réservées au style soutenu.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [bloquant] `exercises[0].options` — La réponse initiale doublait 운동 dans 저는 운동을 운동 안 해요. La phrase attendue est 저는 운동을 안 해요.
- [important] `exercises[0].explanation` — Explique pourquoi le nom ne se répète pas.
- [bloquant] `exercises[3].instruction` — Sans restriction sur l’objet, 커피 안 마셔요 est naturel à l’oral.

[Institut national de la langue coréenne — distinction entre 못 하다 et 못하다](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=322012)

## ko-a2-want-can

Décision : approuvé après correction.

- [important] `rule[0]` — La répartition par personne décrit un usage courant, pas une interdiction absolue. L’espace avant 하다 est requise.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[3].hint` — Écarte une lecture avec 수도, qui ajoute une particule.
- [important] `exercises[4].instruction` — Fixe le registre et le sens de la transformation.

[Institut national de la langue coréenne — espacement de 가고 싶어 하다](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=331547)

## ko-a2-honorific-request

Décision : approuvé après correction.

- [important] `rule[1]` — 잡수세요 concerne manger, pas boire. 께서 est possible sans être toujours obligatoire.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[3]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[1].prompt` — Le sens fixe le verbe, puisque plusieurs options portent une marque honorifique.
- [important] `exercises[2].hint` — Cible la terminaison enseignée plutôt qu’une autre tournure de demande.
- [mineur] `exercises[3].prompt` — 많이 indique la quantité, et non la manière de manger.
- [important] `exercises[3].hint` — Délimite la terminaison attendue.
- [important] `exercises[4].instruction` — Délimite le changement et les deux variantes acceptées.

## ko-a2-connectors

Décision : approuvé après correction.

- [bloquant] `rule[0]` — -고 n’empêche pas de marquer le temps sur le premier verbe.
- [bloquant] `rule[2]` — Une demande après -아서 est possible dans une suite d’actions. Les formes en -었어서 existent avec certaines nuances.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [bloquant] `exercises[1].options` — 피곤했어서 peut s’employer avec une nuance d’aspect. Le choix révisé teste la flexion.
- [important] `exercises[1].explanation` — Explique le modèle sans interdire toute forme en -었어서.
- [bloquant] `exercises[2].hint` — 가고 peut aussi relier deux actions en l’absence de suffixe imposé.
- [important] `exercises[3].prompt` — Le sens seul laisse le choix de plusieurs connecteurs.
- [bloquant] `exercises[4].instruction` — L’ordre inverse et l’omission des particules sont possibles avec l’ancienne consigne.

[Institut national de la langue coréenne — nuance de -었어서](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=316097) · [Institut national de la langue coréenne — constructions causales avec -아서 et -(으)니까](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=327684)

## ko-b1-formal-polite

Décision : approuvé après correction.

- [important] `rule[1]` — Présente la forme interrogative standard sans interdire les reprises interrogatives à l’oral.
- [important] `rule[2]` — Le niveau de langue peut changer selon le contexte. Le style formel n’est pas toujours le plus naturel avec un inconnu.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[3]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[2].hint` — Fixe le temps et le registre.
- [important] `exercises[3].instruction` — Délimite les mots à conserver et le thème facultatif.
- [important] `exercises[4].instruction` — Délimite les mots à conserver et le thème facultatif.

## ko-b1-contrast

Décision : approuvé après correction.

- [important] `rule[1]` — Distingue le modèle des adjectifs de l’exception 있다 / 없다.
- [important] `rule[2]` — Donne des exemples dans les deux familles.
- [mineur] `table.rows[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `table.rows[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `table.rows[3]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `table.rows[4]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `table.rows[5]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `table.rows[6]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `table.rows[7]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[0].prompt` — Le suffixe -고 peut aussi coordonner les qualités, avec un contraste laissé au contexte.
- [important] `exercises[0].options` — Les distracteurs testent les connecteurs et la forme de l’adjectif.
- [important] `exercises[1].prompt` — Indique le contexte, sans lecture de discours rapporté.
- [important] `exercises[1].options` — 온데 peut correspondre à une tournure de discours rapporté. Le nouveau choix teste la terminaison.
- [important] `exercises[1].explanation` — Retire l’affirmation selon laquelle 온데 serait une forme adjectivale de 오다.
- [important] `exercises[3].prompt` — D’autres terminaisons peuvent aussi mettre les deux faits en relation.
- [important] `exercises[4].instruction` — Fixe l’ordre à conserver et l’omission autorisée.

## ko-b1-conditional

Décision : approuvé après correction.

- [important] `rule[2]` — La forme au passé ne se réduit pas au regret.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[2].prompt` — La phrase peut aussi accueillir d’autres connecteurs avec une nuance différente.
- [important] `exercises[3].prompt` — Impose la condition plutôt qu’une justification.
- [important] `exercises[4].instruction` — Fixe l’ordre et la forme de la demande.

## ko-b1-adnominal

Décision : approuvé après correction.

- [important] `rule[1]` — Le contraste est aussi aspectuel. Le ㄹ tombe devant ㄴ dans -는 et -(으)ㄴ.
- [mineur] `examples[0]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[3]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[2].prompt` — Précise la forme demandée pour écarter une interprétation à venir.
- [bloquant] `exercises[2].explanation` — La voyelle ㅡ est présente dans 큰.
- [important] `exercises[3].hint` — Fixe la forme à produire, plutôt qu’une autre lecture du complément.
- [important] `exercises[4].instruction` — L’ancienne consigne pouvait aussi recevoir une phrase avec un autre ordre.

## ko-b1-obligation-cause

Décision : approuvé après correction.

- [important] `rule[2]` — Évite de présenter -기 때문에 comme la construction à privilégier devant un ordre.
- [mineur] `examples[1]` — Respecte l’espace insécable devant la ponctuation française.
- [mineur] `examples[2]` — Respecte l’espace insécable devant la ponctuation française.
- [important] `exercises[2].hint` — Fixe la construction demandée.
- [bloquant] `exercises[2].answers` — 하여야 est la forme pleine correspondant à 해야.
- [important] `exercises[2].explanation` — Explique les deux réponses.
- [important] `exercises[4].instruction` — Fixe le sens, la forme polie et les variantes prévues.

## ko-b1-irregular-verbs

Décision : approuvé après correction.

- [important] `rule[0]` — La règle doit inclure les deux formes courantes en 와요.
- [important] `rule[1]` — Distingue les modèles et décrit la place de la consonne dans 몰라요.
- [important] `rule[2]` — Le modèle en 르 ne se déclenche pas devant toutes les terminaisons commençant par une voyelle.
- [bloquant] `exercises[2].hint` — D’autres temps sont possibles avec la même phrase.
- [important] `exercises[3].hint` — Fixe le registre et la terminaison.
- [important] `exercises[4].instruction` — Exclut un changement de thème ou de registre.

[Institut national de la langue coréenne — irréguliers en ㅂ](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=305614)

## Doutes

Les formes de discours rapporté et les variantes régionales ou très familières ne sont pas l’objet des exercices corrigés. Le cours conserve les formes standard pertinentes, dont les variantes non contractées `공부하여요` et `하였어요`. Les emplois aspectuels ou modaux de `-었어서` sont attestés. L’exercice A2 cible une cause simple et emploie d’autres distracteurs. [Institut national de la langue coréenne — emplois de -었어서](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=316097)

## Ajustement final

Dans le quatrième exercice de la fiche sur l’honorifique, l’indice demande un verbe distinct de 먹다. L’explication précise pourquoi 드세요 et 잡수세요 répondent à la consigne. Le lot initial comptait 139 remplacements. Le correctif de suivi porte le total à 140.
