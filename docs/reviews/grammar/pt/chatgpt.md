# Relecture grammaire — portugais — Codex (arbitrage)

## Synthèse

18 fiches et 89 exercices relus · 18 approuvées après correction · 0 brouillon · 123 remplacements textuels (122 à l’issue de la relecture initiale, puis 1 ajout)

Base de travail : cours portugais du commit `2a9f5b4`, relu avec les [passes A](pass-a.md) et [B](pass-b.md). Le cours enseigne d’abord le portugais brésilien et indique les variantes européennes qui affectent les règles et les réponses. Chaque remplacement du [JSON](chatgpt-patch.json) correspond à un passage exact du cours. Une même décision peut modifier plusieurs champs.

## pt-a1-articles

Décision : approuvé après correction.

- Retenue (A) — Corriger la règle et les exercices sur *jornais* et *úteis*. La distinction se fait sur la finale, sans appliquer uniformément *-is* aux mots en *-l*. L’exemple *a viagem* met en évidence un écart avec le français.
- Retenue (A, B) — Ajouter *aux* et limiter l’obligation des contractions aux articles définis.
- Retenue (B) — Traduire *as colegas do trabalho* par « mes collègues de travail ».
- Écartée (A, doute) — L’indice *em + a* est adapté à un exercice de contraction. Le *num* de l’exemple visé dans le doute B figure en fait dans la fiche sur le présent.

Correctifs par champ

- [bloquant] `rule[1]` — Introduit a viagem, utile aux francophones, et distingue jornais et úteis (A).
- [important] `rule[2]` — Circonscrit l’obligation à l’article défini et complète la liste française (A, B).
- [mineur] `examples[2].translation` — Rend naturellement le groupe as colegas do trabalho (B).
- [important] `exercises[1].explanation` — Le mécanisme varie selon la terminaison.
- [bloquant] `exercises[4].explanation` — Évite une règle qui produirait *útis (A).

## pt-a1-ser-estar

Décision : approuvé après correction.

- Retenue (A, B) — Refaire la comparaison entre *a sopa está fria* et *a sopa é fria* avec les deux formes conjuguées et leurs contextes.
- Retenue (A, B, doute) — Signaler *é perto* dans l’usage brésilien, tout en gardant *ficar* dans le choix sur le musée.

Correctifs par champ

- [important] `rule[0]` — Présente ser et estar sans exclure ficar.
- [important] `rule[1]` — Clarifie les lectures de fria et l’usage brésilien de é perto (A, B).
- [important] `rule[2]` — Há est standard au Brésil. Les verbes sont impersonnels au singulier, avec des formes qui varient selon le temps.
- [bloquant] `exercises[1].prompt` — É frio pouvait désigner un café servi froid.
- [bloquant] `exercises[2].hint` — Écarte éramos et fomos.
- [bloquant] `exercises[4].hint` — Écarte tinha, havia et houve.

## pt-a1-present-regular

Décision : approuvé après correction.

- Retenue (A) — Corriger la ponctuation portugaise et limiter le commentaire sur l’ordre des mots aux questions fermées. *É que* existe dans les questions ouvertes.
- Retenue (A, B) — Corriger « j’habite près », identifier le sujet omis et expliquer *num*, avec la variante *em um*.

Correctifs par champ

- [bloquant] `rule[0]` — Viver finit en -er et ne peut pas illustrer -ir.
- [important] `rule[2]` — Corrige la ponctuation portugaise et précise la portée de la règle (A).
- [bloquant] `table.headers` — Le troisième groupe doit avoir un verbe en -ir.
- [bloquant] `table.rows[0]` — Donne la forme régulière du verbe en -ir.
- [bloquant] `table.rows[1]` — Donne la forme régulière du verbe en -ir.
- [bloquant] `table.rows[2]` — Donne la forme régulière du verbe en -ir.
- [bloquant] `table.rows[3]` — Donne la forme régulière du verbe en -ir.
- [bloquant] `table.rows[4]` — Donne la forme régulière du verbe en -ir.
- [mineur] `examples[0]` — Corrige le français et explique la contraction et le sujet omis (A, B).
- [important] `exercises[0].prompt` — Donne un exemple du troisième groupe.
- [bloquant] `exercises[0].hint` — Le présent est imposé malgré amanhã.
- [bloquant] `exercises[0].answers` — Partem est la 3e personne du pluriel de partir.
- [important] `exercises[0].explanation` — Accorde l’explication avec le nouveau verbe.
- [bloquant] `exercises[3].hint` — Écarte bebiam et beberam.
- [bloquant] `exercises[4].answers` — Le sujet nós peut être explicite ou implicite.
- [important] `exercises[4].explanation` — Explique les deux formes acceptées.

## pt-a1-present-irregular

Décision : approuvé après correction.

- Retenue (A) — *Quero* est régulier à cette personne, contrairement à *quer* à la troisième.
- Retenue (A, B) — Corriger la note sur *fazemos* en citant les deux formes *faço* et *faz*.

Correctifs par champ

- [bloquant] `rule[0]` — Quero est régulier, quer et faz s’écartent du modèle (A).
- [important] `rule[2]` — Évite d’exclure une construction d’âge telle que estou com vinte anos.
- [bloquant] `examples[3].note` — Faz s’écarte aussi du modèle (A, B).
- [bloquant] `exercises[2].hint` — Le temps doit être imposé.
- [bloquant] `exercises[3].hint` — Le temps doit être imposé.
- [bloquant] `exercises[4].hint` — Le temps doit être imposé.

## pt-a1-adjectives-possessives

Décision : approuvé après correction.

- Retenue (A, B) — Ajouter *francês → francesa* et *trabalhador → trabalhadora*. Corriger également le pluriel de *fácil*, relevé par A. La version B conserve le raccourci trompeur sur *-l*.
- Retenue (A) — Gloser *seu* et *sua* comme déterminants, avec les équivalents « son / sa », « ton / ta » et « votre ».

Correctifs par champ

- [bloquant] `rule[0]` — Corrige le pluriel et montre les féminins en -esa et -ora (A, B).
- [mineur] `rule[2]` — Gloses de déterminants (A).

## pt-a1-gostar

Décision : approuvé après correction.

- Retenue (A, B) — Donner *de comboio* comme variante européenne de *de trem*.
- Écartée (A, doute) — L’indice *de + a* est utile puisque l’exercice vise la contraction.

Correctifs par champ

- [important] `summary` — La préposition est requise pour le complément étudié, même si le verbe peut s’employer seul.
- [bloquant] `rule[0]` — Gosto seul est possible avec un complément implicite.
- [important] `examples[0].note` — Aligne la note sur les compléments exprimés.
- [mineur] `examples[3].note` — Rend le contraste de vocabulaire (A, B).
- [important] `exercises[0].explanation` — Restreint l’obligation au complément exprimé.
- [bloquant] `exercises[3].answers` — Le sujet peut être omis, surtout au Portugal.
- [bloquant] `exercises[4].hint` — Écarte notamment adorei.

## pt-a2-preterito-perfeito

Décision : approuvé après correction.

- Retenue (A, B) — Nommer le *pretérito perfeito* sans l’assimiler au passé simple français.
- Retenue (A, B) — Distinguer *fui ao cinema* (*ir*) et *fui professor* (*ser*), et préciser le sens de *fomos* dans l’exemple.
- Vérification complémentaire — L’accent de *falámos* est facultatif selon l’accord orthographique. [Accord orthographique, base IX, § 4](https://diariodarepublica.pt/dr/legislacao-consolidada/resolucao-assembleia-republica/1991-859540312)

Correctifs par champ

- [mineur] `summary` — Évite de confondre le temps usuel avec le passé simple littéraire français (A, B).
- [important] `rule[1]` — L’accent des formes comme falámos est facultatif selon l’accord orthographique.
- [bloquant] `rule[2]` — Fui ao cinema ne peut venir ici que de ir (A, B).
- [mineur] `examples[1].note` — Lève l’ambiguïté de la note (A, B).
- [bloquant] `exercises[0].hint` — Ontem eu trabalhava muito peut convenir selon le contexte.
- [bloquant] `exercises[2].hint` — No sábado peut aussi annoncer un samedi à venir.

## pt-a2-imperfeito

Décision : approuvé après correction.

- Retenue (B, doute) — Fixer l’imparfait dans la consigne sur le grand-père. *Foi* est également possible si le locuteur envisage la vie du grand-père comme une période terminée.
- Écartée (B, doute) — Garder *cachorro*, conforme à la base brésilienne. Le verbe et sa flexion sont l’objet de l’exercice.

Correctifs par champ

- [bloquant] `rule[1]` — Les repères temporels seuls ne déterminent pas le temps.
- [important] `rule[2]` — Évite un décompte absolu qui masque notamment les composés comme manter.
- [bloquant] `exercises[0].prompt` — Le perfeito joguei peut aussi décrire une série d’actions répétées envisagée comme terminée.
- [important] `exercises[0].explanation` — Une habitude peut aussi être vue comme une série terminée.
- [bloquant] `exercises[1].prompt` — Toca existe dans un récit au présent.
- [important] `exercises[1].explanation` — La locution de repente n’impose pas le temps.
- [bloquant] `exercises[2].hint` — Moramos peut aussi résumer une période terminée.
- [bloquant] `exercises[3].hint` — Le sens seul permet é ou foi (doute B).
- [bloquant] `exercises[4].answers` — Le sujet peut être implicite.

## pt-a2-reflexive

Décision : approuvé après correction.

- Retenue (A, B) — Remplacer « tout adverbe » par quelques déclencheurs et opposer *lembrar-se de* au français « se rappeler quelque chose ». Signaler *não lembro do nome* dans l’usage brésilien.

Correctifs par champ

- [important] `rule[1]` — La place est décrite pour la construction illustrée, avec ses variations.
- [bloquant] `rule[2]` — Seuls certains adverbes attirent le clitique. Le contraste est avec se rappeler quelque chose (A, B).
- [bloquant] `exercises[1].prompt` — Ela me chama Marta peut dire qu’elle appelle quelqu’un d’autre Marta.
- [important] `exercises[3].hint` — Cible le clitique plutôt qu’une lecture avec lembrar employé seul.

## pt-a2-object-pronouns

Décision : approuvé après correction.

- Retenue (A, B) — Garder le nouveau contexte négatif proposé par B et exprimer le complément direct *o recado*. Cela laisse *lhe* comme seule réponse parmi les options.
- Retenue (A) — Séparer le direct *eu vi ele* de l’indirect *eu dei o livro para ele*, avec les clitiques attendus à l’écrit standard.
- Retenue (A, B) — Remplacer « tout adverbe » par des déclencheurs identifiés et compléter l’exemple négatif avec un complément direct. Expliquer aussi la chute de la consonne et la finale nasale, relevées par A.
- Écartée (A, doute) — *Ele me ligou ontem* est un bon exemple de placement en portugais du Brésil. *Ele ligou para mim* est une autre construction possible.

Correctifs par champ

- [important] `rule[0]` — Distingue les substitutions des deux types de complément (A).
- [bloquant] `rule[1]` — Tout adverbe n’attire pas le pronom au Portugal (A, B).
- [bloquant] `rule[2]` — Dão finit en -ão, fi-lo illustre la chute de la consonne et l’exemple négatif contient son complément direct (A, B).
- [important] `exercises[0].prompt` — Lhe peut avoir des emplois directs régionaux au Brésil. L’exercice vise a en portugais écrit.
- [bloquant] `exercises[1].prompt` — Exprime le complément direct et ne laisse que lhe comme réponse (A, B).
- [important] `exercises[1].explanation` — Accorde l’explication à la nouvelle phrase (B).
- [bloquant] `exercises[3].instruction` — Impose le clitique plutôt qu’une tournure familière avec un pronom tonique.
- [bloquant] `exercises[4].instruction` — Impose le clitique plutôt qu’une tournure familière avec un pronom tonique.

## pt-a2-periphrases

Décision : approuvé après correction.

- Retenue (A) — Accepter *a fazer* avec *fazendo* et adapter l’explication. Traduire *acordar* par « se réveiller ».
- Vérification complémentaire — *Ter que* et *ter de* coexistent. La règle donne les préférences d’usage. [Ciberdúvidas — relevé de corpus sur ter de et ter que](https://ciberduvidas.iscte-iul.pt/artigos/rubricas/idioma/ter-de-x-ter-que/5707)

Correctifs par champ

- [important] `rule[2]` — Les deux constructions d’obligation ne sont pas propres à un seul pays.
- [mineur] `examples[2].translation` — Acordar signifie se réveiller (A).
- [bloquant] `exercises[0].options` — Agora eu vou estudando est aussi possible. Les distracteurs révisés testent l’accord.
- [bloquant] `exercises[1].hint` — Iremos viajar était aussi possible.
- [important] `exercises[2].explanation` — Les deux usages ne s’excluent pas d’un pays à l’autre.
- [bloquant] `exercises[3].answers` — L’exercice doit accepter la périphrase courante au Portugal (A).
- [important] `exercises[3].explanation` — Explique les deux formes acceptées (A).

## pt-a2-prepositions

Décision : approuvé après correction.

- Retenue (A) — Traduire *vou para casa* par « je rentre à la maison » et enseigner l’opposition lieu / destination.
- Retenue (A, B) — Distinguer *chegar a* dans l’écrit soigné de *chegar em*, fréquent à l’oral brésilien.
- Retenue (A, doute) — Préciser le sens de *perto da estação* et expliquer la préposition *de* dans le dernier exercice.

Correctifs par champ

- [mineur] `rule[1]` — Distingue le lieu et la destination dans des gloses naturelles (A).
- [important] `rule[2]` — Distingue les registres et évite de présenter la contraction comme obligatoire avec tous les pays (A, B).
- [important] `table.rows[4]` — Longe de exprime l’éloignement.
- [important] `exercises[4].prompt` — La distance jugée proche ou loin dépend du contexte (doute A).
- [important] `exercises[4].explanation` — Centre l’exercice sur l’expression avec sa préposition.

## pt-b1-subjunctive

Décision : approuvé après correction.

- Retenue (A, B) — Distinguer les radicaux *faço → faça* et *tenho → tenha* du changement orthographique *chegar → chegue*.
- Retenue (A, B) — Donner *tenho certeza de que* à l’écrit soigné et *tenho a certeza de que* pour l’usage européen.
- Retenue (B, doute) — Limiter l’exemple de *talvez* à sa position initiale dans la proposition.

Correctifs par champ

- [important] `rule[0]` — Décrit le contexte de talvez sans généraliser (doute B).
- [important] `rule[1]` — Distingue la reprise du radical de l’ajustement de l’orthographe (A, B).
- [important] `rule[2]` — Préposition de à l’écrit soigné, avec article au Portugal (A, B).
- [bloquant] `exercises[2].hint` — Cible un temps déterminé du subjonctif.
- [bloquant] `exercises[3].hint` — Écarte une lecture passée comme tenha sabido.
- [bloquant] `exercises[4].answers` — Le sujet peut être omis en contexte, notamment au Portugal.

## pt-b1-imperative

Décision : approuvé après correction.

- Retenue (A, B) — Distinguer le paradigme standard avec *você* et l’usage oral variable de *fala* ou *vem*. [Étude de la variation de l’impératif brésilien](https://periodicos.ufsc.br/index.php/workingpapers/article/download/1984-8420.2015v16n1p142/30770/0)
- Retenue (A) — Former généralement *tu* sur la deuxième personne sans *-s*, et traiter *faz* et *sê* séparément. Expliquer le subjonctif négatif surtout avec *tu*.
- Retenue (B) — Rattacher le vouvoiement français de *Abra a porta* à l’adresse polie, en mentionnant la traduction avec tutoiement.
- Retenue (A, doute) — Remplacer le vocatif *Tu,* par une consigne qui précise la personne. Écartée (B, doute) — *Com a gente* est naturel dans la base brésilienne de l’exemple.

Correctifs par champ

- [important] `rule[0]` — Mentionne la variation orale sans l’étendre à tous les usages brésiliens (A, B).
- [bloquant] `rule[1]` — La 3e personne n’est pas la règle de formation de tu (A).
- [important] `rule[2]` — Explique le vrai piège avec tu et distingue les registres (A).
- [mineur] `examples[0].note` — Précise l’interlocuteur choisi pour la traduction (B).
- [important] `examples[2].note` — Corrige le renvoi à la 3e personne.
- [important] `exercises[1].prompt` — L’infinitif et des formes populaires peuvent servir d’ordres en d’autres contextes.
- [important] `exercises[2].prompt` — Impose la personne et le mode sans vocatif artificiel.
- [important] `exercises[3].prompt` — Remplace le vocatif jugé artificiel par une consigne claire (doute A).
- [bloquant] `exercises[3].explanation` — La formation par la 3e personne était trompeuse.

## pt-b1-future-conditional

Décision : approuvé après correction.

- Retenue (A, B) — Donner directement les terminaisons du conditionnel, corriger la ponctuation portugaise et illustrer l’imparfait de politesse au Portugal.
- Retenue (B) — Demander le futur simple avec *viajar* et *fazer*. Le présent et la périphrase sont aussi possibles dans le contexte d’origine.

Correctifs par champ

- [important] `rule[1]` — Donne directement les terminaisons et l’emploi de l’imparfait de politesse (A, B).
- [bloquant] `exercises[0].hint` — Viajamos ou vamos viajar sont aussi possibles avec amanhã (B).
- [important] `exercises[2].prompt` — Le contexte pouvait aussi suggérer une décision prise par la personne qui parle.
- [bloquant] `exercises[3].hint` — Faz ou vai fazer restent possibles sans temps imposé (B).

## pt-b1-personal-infinitive

Décision : approuvé après correction.

- Retenue (A, B) — Corriger les deux paragraphes qui contredisaient *ao chegarmos*. L’infinitif personnel peut suivre une préposition avec le même sujet. L’infinitif simple reste attendu après *quero* et *posso* avec le même sujet. *Para que* avec le subjonctif reste standard.

Correctifs par champ

- [important] `summary` — L’infinitif personnel peut aussi partager le sujet de la principale.
- [bloquant] `rule[0]` — Le même sujet est possible après une préposition (A, B).
- [bloquant] `rule[2]` — Para que avec subjonctif est standard. La règle sur le même sujet dépend de la construction (A, B).
- [important] `exercises[0].prompt` — Écarte l’infinitif non fléchi entendu dans certains usages parlés.
- [important] `exercises[1].hint` — Impose la construction visée.
- [important] `exercises[2].prompt` — Fixe l’identité du sujet de sair.
- [bloquant] `exercises[3].answers` — La terminaison -em peut suffire à identifier le sujet en contexte.
- [important] `exercises[3].explanation` — Explique les deux formes acceptées.

## pt-b1-por-para

Décision : approuvé après correction.

- Retenue (A) — Faire choisir entre *por* et *para* avant la contraction, avec un trajet qui passe dans un tunnel.
- Retenue (A, B) — Corriger la ponctuation et distinguer *por que* au Brésil de *porque* dans la question au Portugal. [Ciberdúvidas — Por que et porque](https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/ainda-sobre-por-que-no-brasil-e-o-porque-em-portugal/35804)

Correctifs par champ

- [mineur] `rule[1]` — Corrige « La passive » et conserve les usages enseignés.
- [important] `rule[2]` — Distingue les deux graphies interrogatives et corrige la ponctuation (A, B).
- [important] `exercises[2].prompt` — Le registre écrit fixe para plutôt que pra.
- [important] `exercises[2].hint` — Limite le choix à *por* et *para* et écarte ainsi *a fim de*.
- [important] `exercises[3].prompt` — Le trajet à travers le tunnel sélectionne clairement pelo.
- [important] `exercises[3].hint` — L’apprenant doit encore choisir la préposition (A).

## pt-b1-relatives

Décision : approuvé après correction.

- Retenue (A, B) — Présenter d’abord *que* pour « qui » et « que ». Les compléments comme *em que* et *de que* conservent la préposition.
- Retenue (B) — Remplacer *que* par *qual* comme distracteur. *Com que* avec une personne peut convenir, alors que *qual* exige ici l’article. [Ciberdúvidas — Choix du relatif après une préposition](https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/o-conjuntivo-numa-construcao-relativa-uma-pessoa-com-quem-possas-partilhar-o-tempo/35848)

Correctifs par champ

- [bloquant] `rule[0]` — Que seul ne rend pas le complément de lieu ou de que (A, B).
- [important] `rule[1]` — Quem est fréquent pour une personne. Que peut aussi reprendre un antécédent humain après une préposition courte (B).
- [important] `rule[2]` — Explique pourquoi l’article français disparaît après cujo.
- [important] `examples[1].note` — La note reste cohérente avec la règle sur les relatifs humains.
- [bloquant] `exercises[1].options` — Com que est possible avec un antécédent humain. Com qual exigerait ici l’article (B).
- [important] `exercises[1].explanation` — Explique pourquoi le distracteur est faux.
- [bloquant] `exercises[3].answers` — Aquilo que ele disse est aussi grammatical et rend le sens demandé.
- [important] `exercises[3].explanation` — Explique la variante.
- [bloquant] `exercises[4].instruction` — L’ancienne consigne permet aussi Comprei a casa que é grande.

## Doutes

Les variantes de registre et de région qui affectent les réponses ont été prises en compte dans les fiches concernées. Aucun doute ne bloque la publication après application des correctifs.
