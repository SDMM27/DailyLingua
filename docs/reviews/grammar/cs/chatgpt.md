# Relecture grammaire — tchèque — ChatGPT (relecture complète)

## Synthèse

18 points · 18 approuvés après correction · 0 brouillon · 165 remplacements (42 bloquants, 108 importants, 15 mineurs)

Les 90 exercices ont été vérifiés. Le rapport compte les champs modifiés, dont plusieurs peuvent relever du même problème. Les extraits abrégés renvoient aux textes complets dans le [fichier de correctifs](chatgpt-patch.json).

## cs-a1-gender

Décision : approuvé après correction.

- [important] `summary` — Actuel « Deviner le genre d’un nom d’après sa terminaison et choisir ten, ta, to ou on, ona, ono. ». Proposé « Repérer le genre d’un nom à l’aide de sa terminaison et choisir ten, ta, to ou on, ona, ono. ». La terminaison fournit des indices, sans permettre de déterminer chaque genre.
- [important] `rule[0]` — Actuel « Le tchèque n’a pas d’article : kniha veut dire à la fois « un livre » et « le livre ». Chaque nom a… ». Proposé « Le tchèque n’a pas d’article : kniha peut vouloir dire « un livre » ou « le livre ». La terminaison donne… ». Les terminaisons sont des repères, avec des masculins courants en -a comme kolega et des féminins en consonne comme noc.
- [bloquant] `rule[1]` — Actuel « Les terminaisons -e / -ě et -í sont moins sûres : -e / -ě est le plus souvent féminin (růže, země) mais… ». Proposé « Les terminaisons -e et -ě existent dans les trois genres : soudce (masculin), růže et země (féminin), moře… ». Les exemples soudce et paní empêchent de prendre -e pour un marqueur féminin ou neutre et -í pour un marqueur infaillible du neutre.
- [important] `rule[2]` — Actuel « Au masculin, le tchèque distingue l’animé (personnes, animaux : muž, pes) de l’inanimé (stůl, dům). Rien… ». Proposé « Au masculin, le tchèque distingue l’animé (muž, pes) de l’inanimé (stůl, dům). Au singulier, les deux… ». La distinction animé/inanimé apparaît aussi au nominatif pluriel. Ten, ta et to accompagnent le nom dans les exemples.
- [important] `table.rows[0]` — Actuel « ["Masculin animé", "consonne", "muž, pes", "ten"] ». Proposé « ["Masculin animé","consonne, -a, -e","muž, kolega, soudce","ten"] ». Le tableau inclut deux terminaisons masculines que la règle introduit.
- [important] `examples[0]` — Actuel « { text: "Ten muž je lékař. On bydlí v Praze.", translation: "Cet homme est médecin. Il habite à Prague.",… ». Proposé « { text: "Ten muž je lékař. Bydlí v Praze.", translation: "Cet homme est médecin. Il habite à Prague.",… ». L’omission du pronom à la deuxième phrase est naturelle en l’absence de contraste.
- [important] `exercises[2].prompt` — Actuel « Kde je ten stůl? — ___ je v kuchyni. ». Proposé « A co Eva a Petr? ___ bydlí v Praze, on v Brně. ». Le contraste explicite entre les deux sujets rend le pronom naturel et exerce la reprise par ona.
- [bloquant] `exercises[2].answer` — Actuel « 0 ». Proposé « 1 ». La personne reprise est Eva, d’où ona.
- [important] `exercises[2].explanation` — Actuel « Stůl est masculin : on le reprend par on. ». Proposé « Eva est reprise par ona. Ici le pronom marque le contraste entre les deux sujets. ». L’explication suit le nouvel énoncé.
- [bloquant] `exercises[3]` — Actuel « type: "fill", prompt: "___ pes je velký.", answers: ["Ten"] … ». Proposé « type: "fill", prompt: "___ pes je velký.", hint: "ten, ta ou to … ». Des groupes comme Můj pes conviennent aussi sans indication du démonstratif attendu.
- [important] `exercises[4].instruction` — Actuel « Remplace le nom sujet par le pronom qui convient. ». Proposé « Remplace seulement « Učitelka » par le pronom sujet qui convient. ». La consigne fixe le segment à remplacer dans une langue à ordre souple.

## cs-a1-byt

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « « Être » se dit být. Au présent : jsem, jsi, je, jsme, jste, jsou. Comme en italien, le pronom sujet est… ». Proposé « « Être » se dit být. Au présent : jsem, jsi, je, jsme, jste, jsou. La forme du verbe suffit souvent à… ». L’emploi d’un pronom explicite n’est pas limité à une insistance obligatoire.
- [bloquant] `rule[1]` — Actuel « Après být, le nom ou l’adjectif reste au nominatif, sans article : Jsem student, To je dobrý film. Pour «… ». Proposé « Pour dire qui tu es, le nom ou l’adjectif est souvent au nominatif, sans article : Jsem student, Jsem… ». Být peut prendre un nom attribut à l’instrumental. Je lékařem est standard.
- [important] `rule[2]` — Actuel « Négation : ne- se soude au verbe : nejsem, nejsi, není, nejsme, nejste, nejsou. Attention : « il / elle… ». Proposé « Négation : ne- se soude au verbe : nejsem, nejsi, nejsme, nejste, nejsou. La 3e personne du singulier est… ». La question fermée peut conserver l’ordre de l’affirmation sans que cet ordre soit imposé.
- [bloquant] `exercises[3].hint` — Actuel « být (négation) ». Proposé « být, présent négatif ». Sans temps explicite, nebudeme est possible.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative. ». Proposé « Mets seulement le verbe à la forme négative. ». La consigne fixe le segment à remplacer.
- [important] `exercises[4].answers` — Actuel « ["Nejsem unavený.", "Já nejsem unavený."] ». Proposé « ["Nejsem unavený."] ». L’exercice ne demande plus d’ajouter un sujet.

[CzechEncy — attribut nominal après být](https://www.czechency.org/slovnik/SPONOV%C4%9A-SUBSTANTIVN%C3%8D%20P%C5%98%C3%8DSUDEK)

## cs-a1-present-am

Décision : approuvé après correction.

- [important] `summary` — Actuel « Former le présent des verbes en -at et de mít : dělám, děláš, dělá, děláme, děláte, dělají. ». Proposé « Former le présent de dělat et des verbes du même type, puis conjuguer mít. ». La fiche présente un modèle fréquent plutôt qu’une conjugaison unique pour tous les infinitifs en -at.
- [important] `rule[0]` — Actuel « Le présent tchèque a plusieurs familles. Les verbes en -at comme dělat (faire), znát (connaître), hledat… ». Proposé « Beaucoup de verbes en -at suivent le modèle dělat (faire) : dělám, děláš, dělá, děláme, děláte, dělají.… ». L’infinitif en -at ne suffit pas à prédire la classe, et mít a notamment la forme mají, qui ne se déduit pas d’une terminaison -ají ajoutée à má-.
- [important] `rule[1]` — Actuel « Il n’y a qu’un seul présent : Dělám úkol veut dire « je fais mon devoir » comme « je suis en train de le… ». Proposé « La même forme peut décrire une action en cours ou une habitude. Dělám úkol peut signifier « Je fais mon… ». La possibilité d’un sujet explicite dépend de la situation, et la distinction visée est celle entre cours et habitude.
- [important] `examples[1]` — Actuel « { text: "Mám dva bratry a jednu sestru.", translation: "J’ai deux frères et une sœur.", note: "Mít se… ». Proposé « { text: "Mám dva bratry a jednu sestru.", translation: "J’ai deux frères et une sœur.", note: "Avec mít,… ». L’exemple se concentre sur la forme utilisée, puisque mít n’a pas exactement le paradigme de dělat.
- [bloquant] `exercises[2].hint` — Actuel « dělat (vy) ». Proposé « dělat, présent, vy ». Co budete dělat? emploie le même verbe et la même personne avec un autre temps.
- [bloquant] `exercises[3].hint` — Actuel « mít ». Proposé « mít, au présent ». Le verbe mít pourrait aussi être employé au futur (budeme mít) sans indication du temps.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative. ». Proposé « Ajoute la négation au verbe et garde les autres mots dans le même ordre. ». Ce cadrage écarte les reformulations et fait pratiquer le préfixe.
- [important] `exercises[4].answers` — Actuel « ["Nedělám úkol.", "Já nedělám úkol."] ». Proposé « ["Nedělám úkol."] ». La réponse conserve les autres mots comme demandé.

## cs-a1-present-im

Décision : approuvé après correction.

- [important] `summary` — Actuel « Former le présent des verbes en -it et -et : mluvím, mluvíš, mluví, mluvíme, mluvíte, mluví. ». Proposé « Former le présent des verbes comme mluvit, bydlet et vidět avec les terminaisons en -í. ». Le modèle porte sur ces verbes, et vidět se termine par -ět.
- [important] `rule[0]` — Actuel « Les verbes en -it et -et comme mluvit (parler), bydlet (habiter), vidět (voir), slyšet (entendre) ont les… ». Proposé « Les verbes comme mluvit (parler), bydlet (habiter) et vidět (voir) suivent souvent ce modèle au singulier… ». Inclure -ět et éviter de déduire la conjugaison de toute terminaison -it, -et ou -ět.
- [bloquant] `rule[1]` — Actuel « À cette conjugaison, la 3e personne du singulier et celle du pluriel sont identiques (Eva mluví, Eva a… ». Proposé « Mluví sert au singulier et au pluriel : Eva mluví, Eva a Petr mluví. Certains verbes ont aussi une… ». Bydlejí et rozumějí sont standard à la 3e personne du pluriel. La règle identifiant systématiquement les deux nombres est fausse.
- [important] `rule[2]` — Actuel « Piège : l’accent aigu du tchèque marque la longueur de la voyelle, pas l’accent tonique, qui tombe… ». Proposé « L’accent aigu du tchèque marque une voyelle longue. Prononce l’accent de mot sur la première syllabe de… ». La longueur et l’accent sont distincts. Le placement absolu « toujours sur la première syllabe » occulte les groupes accentuels à préposition.
- [important] `rule[3]` — Actuel « Pour trouver la famille, regarde l’infinitif : -at → dělám, -it / -et → mluvím. Les verbes en -ovat ou… ». Proposé « L’infinitif donne un indice, mais apprends aussi la première personne avec chaque verbe : dělat → dělám,… ». Jet est un contre-exemple courant à l’équivalence -et → -ím.
- [important] `table.rows[5]` — Actuel « ["oni", "mluví", "bydlí", "vidí"] ». Proposé « ["oni","mluví","bydlí / bydlejí","vidí"] ». Le tableau donne la variante standard du pluriel.
- [important] `exercises[0].explanation` — Actuel « Sujet pluriel (ils) : la forme est bydlí, identique au singulier. ». Proposé « Bydlí est possible au singulier comme au pluriel. Au pluriel, on dit aussi bydlejí. ». L’explication précise que la réponse proposée n’est pas la seule forme de ce verbe au pluriel.
- [bloquant] `exercises[2].hint` — Actuel « mluvit ». Proposé « mluvit, au présent ». Budete mluvit convient si la question porte sur l’avenir.
- [bloquant] `exercises[3].hint` — Actuel « vidět ». Proposé « vidět, au présent ». Uvidíš relève d’un autre aspect, et viděl jsi du même verbe au passé. Le temps attendu doit être donné.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à la forme « my » (nous). ». Proposé « Passe de « je » à « nous ». Change seulement le verbe. ». La consigne borne les réordonnancements possibles.
- [important] `exercises[4].answers` — Actuel « ["Bydlíme v Praze.", "My bydlíme v Praze."] ». Proposé « ["Bydlíme v Praze."] ». La réponse change seulement le verbe.

[ÚJČ — variantes en -í et -ejí](https://m.prirucka.ujc.cas.cz/?slovo=muset) · [ÚJČ — accent de mot et accent de groupe](https://prirucka.ujc.cas.cz/?id=915)

## cs-a1-accusative

Décision : approuvé après correction.

- [important] `rule[1]` — Actuel « Féminin : -a → -u (kniha → knihu, Eva → Evu) ; -e / -ě → -i (růže → růži, země → zemi) ; les noms en… ». Proposé « Au singulier, les féminins comme kniha et Eva passent de -a à -u (knihu, Evu). Des noms en -e ou -ě… ». La règle porte sur le singulier. L’énoncé présente les modèles étudiés, sans prédire chaque nom d’après sa dernière lettre.
- [bloquant] `rule[2]` — Actuel « Masculin inanimé : identique au nominatif (stůl → stůl). Masculin animé : -a ou -e (pes → psa, bratr →… ». Proposé « Au masculin inanimé, l’accusatif singulier ressemble au nominatif : stůl. Au masculin animé, il prend… ». Kolega → kolegu est un contre-exemple fréquent à la règle -a ou -e.
- [important] `rule[3]` — Actuel « Piège : on dit Vidím toho psa (animé) mais Vidím ten stůl (inanimé). Ne mets pas -a à un objet : « je vois… ». Proposé « Compare Vidím toho psa (animé) et Vidím ten stůl (inanimé). Tu peux aussi dire Vidím stůl : le tchèque n’a… ». L’ancienne mise en garde « ne mets pas -a à un objet » contredisait les exemples d’objets directs animés.
- [mineur] `exercises[0].prompt` — Actuel « Čtu tu ___ . ». Proposé « Čtu tu ___. ». En tchèque, aucun espace avant le point.
- [bloquant] `exercises[1].options` — Actuel « ["ten", "tu", "toho", "to"] ». Proposé « ["ten","té","toho","to"] ». Tu peut être l’adverbe « ici » dans Vidím tu psa, qui devient une deuxième bonne réponse.
- [mineur] `exercises[2].prompt` — Actuel « Hledám ___ . ». Proposé « Hledám ___. ». En tchèque, aucun espace avant le point.
- [bloquant] `exercises[2].hint` — Actuel « kočka ». Proposé « kočka, au singulier ». La forme kočky conviendrait aussi si l’on cherchait plusieurs chats.
- [mineur] `exercises[3].prompt` — Actuel « Mám ___ . ». Proposé « Mám ___. ». En tchèque, aucun espace avant le point.
- [bloquant] `exercises[3].hint` — Actuel « bratr ». Proposé « bratr, au singulier ». La forme bratry conviendrait aussi si l’on parlait de plusieurs frères.
- [important] `exercises[4].instruction` — Actuel « Remplace Petr par Eva. ». Proposé « Remplace seulement « Petra » par la forme de « Eva » qui convient. ». La consigne nomme la forme réellement présente et fixe le segment.

## cs-a1-locative

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le locatif répond à « où ? » (kde ?) et ne s’emploie qu’après une préposition. Pour être quelque part : v… ». Proposé « Le locatif s’emploie après une préposition. Pour dire où tu es (kde ?), utilise souvent v / ve avec un… ». La répartition spatiale explique les premiers exemples sans exclure les associations d’usage.
- [bloquant] `rule[1]` — Actuel « Terminaisons : masculin et neutre → -e / -ě (dům → v domě, stůl → na stole, město → ve městě, Brno → v… ». Proposé « Au singulier, certains masculins et neutres prennent -e ou -ě (na stole, v domě, ve městě). D’autres… ». Park et hotel prennent -u. Les terminaisons ne se déduisent pas exclusivement du genre.
- [important] `rule[2]` — Actuel « Avant -e, certaines consonnes changent : h → z (Praha → v Praze), k → c (matka → v matce), g → z, ch → š.… ». Proposé « La consonne peut changer devant la terminaison du locatif : h → z dans Praha → v Praze, k → c dans matka →… ». Tous les groupes consonantiques ne déclenchent pas ve, comme le montrent les propres exemples.
- [important] `rule[3]` — Actuel « Piège : le français dit « à » partout ; choisis v ou na. Quelques lieux prennent na par usage : na… ». Proposé « Le français utilise souvent « à » là où le tchèque distingue v et na. Retiens quelques expressions avec na… ». Le français n’emploie pas « à » dans tous les contextes. Ces associations se mémorisent avec le nom.
- [important] `examples[2]` — Actuel « { text: "Čekám na nádraží.", translation: "J’attends à la gare.", note: "Na avec un lieu ouvert ; nádraží… ». Proposé « { text: "Čekám na nádraží.", translation: "J’attends à la gare.", note: "Avec nádraží, on dit couramment… ». La préposition relève de l’usage, pas d’une classification de la gare comme lieu ouvert.
- [important] `exercises[0].explanation` — Actuel « Une pièce ou un bureau est un espace fermé : v. Ve ne sert que devant certains groupes de consonnes. ». Proposé « Pour dire qu’Eva travaille à l’intérieur du bureau, on dit v kanceláři. Devant k- seul, on emploie ici v. ». La forme ve n’est pas réservée aux groupes consonantiques, et cette explication vise seulement l’exemple.
- [important] `exercises[1].options` — Actuel « ["ve", "v", "na"] ». Proposé « ["do","ze","na"] ». Une lecture littérale de « dans le bâtiment » pourrait faire hésiter avec v. Les distracteurs opposent désormais destination, origine et localisation.
- [mineur] `exercises[2].prompt` — Actuel « Kniha je na ___ . ». Proposé « Kniha je na ___. ». En tchèque, aucun espace avant le point.
- [bloquant] `exercises[2].answers` — Actuel « ["stole"] ». Proposé « ["stole","stolu"] ». Stolu est une autre forme du locatif de stůl. Stole reste la forme donnée en premier pour indiquer la position sur la table.
- [important] `exercises[2].explanation` — Actuel « Masculin : -e au locatif, et ů devient o : stole. ». Proposé « Stůl prend souvent la forme stole pour situer un objet sur la table. La variante stolu existe aussi au… ». L’explication ne présente plus -e comme obligatoire pour ce mot.
- [mineur] `exercises[3].prompt` — Actuel « Děti jsou ve ___ . ». Proposé « Děti jsou ve ___. ». En tchèque, aucun espace avant le point.
- [bloquant] `exercises[3].hint` — Actuel « škola ». Proposé « škola, au singulier ». Ve školách convient si les enfants sont répartis dans plusieurs écoles.
- [important] `exercises[4].instruction` — Actuel « Remplace Praze par Brno. ». Proposé « Remplace seulement « Praze » par la forme de « Brno » qui convient. ». Le remplacement porte sur la forme du nom, et l’ordre des autres mots est conservé.
- [bloquant] `exercises[4].answers` — Actuel « ["Bydlím v Brně."] ». Proposé « ["Bydlím v Brně.","Bydlím v Brnu."] ». Brně et Brnu sont deux formes standard du locatif. La première est la forme usuelle.
- [important] `exercises[4].explanation` — Actuel « Brno est un neutre : le locatif est Brně. ». Proposé « Après v, Brno est au locatif. La forme usuelle est Brně, et Brnu est aussi admis. ». L’explication présente les deux formes attestées.

[ÚJČ — vocalisation des prépositions](https://prirucka.ujc.cas.cz/?id=770) · [ÚJČ — variantes Brně et Brnu](https://m.prirucka.ujc.cas.cz/?id=%C4%8Cesko) · [CzechEncy — locatif et variantes](https://www.czechency.org/slovnik/LOK%C3%81L)

## cs-a2-present-e

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Troisième famille du présent : -u, -eš, -e, -eme, -ete, -ou. Exemple : číst (lire) → čtu, čteš, čte,… ». Proposé « Avec číst (lire), le présent est čtu, čteš, čte, čteme, čtete, čtou. Le radical čt- s’apprend avec le… ». Présenter les deux modèles et le changement de radical de číst sans numéroter artificiellement les familles.
- [important] `rule[1]` — Actuel « Les verbes en -ovat sont très nombreux et tous réguliers. À l’oral, on dit plutôt pracuju et pracujou ;… ». Proposé « Pracovat admet aussi pracuju à la 1re personne du singulier et pracujou à la 3e du pluriel. Ces variantes… ». Les deux personnes ont des variantes admises. La différence de registre compte davantage qu’une opposition stricte entre oral et écrit.
- [important] `rule[3]` — Actuel « Ces verbes se construisent directement avec l’infinitif, sans « de » ni « à » : Chci pracovat, Můžu jít =… ». Proposé « Chci et můžu peuvent être suivis directement d’un infinitif : Chci pracovat, Můžu jít. Le français peut… ». La construction à l’infinitif concerne chtít et moci, et aucun de ni à n’apparaît dans ces équivalents français.
- [important] `table.rows[5]` — Actuel « ["oni", "čtou", "pracují", "chtějí"] ». Proposé « ["oni","čtou","pracují (pracujou)","chtějí"] ». Le tableau reflète la variation de registre annoncée pour les deux personnes.
- [bloquant] `exercises[2].hint` — Actuel « pracovat ». Proposé « pracovat, au présent ». L’ancien indice autorise également le passé ou le futur.
- [bloquant] `exercises[3].hint` — Actuel « chtít ». Proposé « chtít, au présent ». L’ancien indice autorise notamment le passé chtěli jsme ou chtěly jsme.
- [important] `exercises[4].instruction` — Actuel « Remplace « já » par « oni » (ils). ». Proposé « Remplace « Já » par « Oni » en tête de phrase et accorde le verbe. ». Le pronom demandé doit être présent et l’ordre des mots reste déterminé.
- [important] `exercises[4].answers` — Actuel « ["Oni čtou knihu.", "Čtou knihu."] ». Proposé « ["Oni čtou knihu."] ». La réponse omettant le sujet ne respecte plus la consigne.

## cs-a2-possessives

Décision : approuvé après correction.

- [important] `summary` — Actuel « Choisir le possessif qui s’accorde avec la chose possédée ou avec le possesseur. ». Proposé « Choisir le possessif selon le possesseur, puis accorder les formes variables avec le nom. ». La personne ou le genre du possesseur sélectionne le possessif. Certaines formes s’accordent ensuite avec le nom.
- [important] `rule[0]` — Actuel « Můj (mon), tvůj (ton), náš (notre) et váš (votre) s’accordent avec le nom, comme ten / ta / to : můj… ». Proposé « Můj (mon), tvůj (ton), náš (notre) et váš (votre) s’accordent avec le nom. Au nominatif singulier : můj… ». Les variantes má/mé, tvá/tvé sont standard et le paradigme montré porte sur le nominatif singulier.
- [bloquant] `rule[1]` — Actuel « Jeho (son, à lui), její (son, à elle) et jejich (leur) ne changent jamais, et s’accordent avec le… ». Proposé « Jeho marque un possesseur masculin ou neutre, její un possesseur féminin, et jejich plusieurs possesseurs.… ». Její se décline. Jeho vaut également pour un possesseur neutre, par exemple dítě.
- [bloquant] `rule[2]` — Actuel « Il n’y a pas d’article : můj dům = « ma maison » ou « la maison ». On place le possessif avant le nom. ». Proposé « Il n’y a pas d’article. Můj dům veut dire « ma maison ». Dans un groupe nominal courant, le possessif… ». Můj dům signifie précisément « ma maison », et l’ordre indiqué est le modèle courant, pas le seul possible.
- [important] `rule[3]` — Actuel « Piège : le français dit son / sa selon l’objet, le tchèque selon le possesseur. « Sa maison » est jeho dům… ». Proposé « En français, « sa maison » ne précise pas qui possède. Le tchèque distingue jeho dům (sa maison à lui),… ». Le français et le tchèque ne font pas le même choix, et svůj est la forme courante quand le sujet possède l’objet.
- [important] `table.rows[0]` — Actuel « ["já (mon)", "můj", "moje", "moje"] ». Proposé « ["já (mon)","můj","moje / má","moje / mé"] ». Ajouter les deux formes standard de féminin et de neutre.
- [important] `table.rows[1]` — Actuel « ["ty (ton)", "tvůj", "tvoje", "tvoje"] ». Proposé « ["ty (ton)","tvůj","tvoje / tvá","tvoje / tvé"] ». Ajouter les deux formes standard de féminin et de neutre.
- [important] `table.rows[4]` — Actuel « ["on (son)", "jeho", "jeho", "jeho"] ». Proposé « ["on / ono (son)","jeho","jeho","jeho"] ». Jeho sert aussi pour un possesseur neutre.
- [bloquant] `exercises[3]` — Actuel « type: "fill", prompt: "Petr a ___ sestra jsou doma. (sa, à lui)", answers: ["jeho"] … ». Proposé « type: "fill", prompt: "Petr a ___ sestra jsou doma. (sa sœur à lui)", hint: "pronom possessif … ». L’ancienne consigne pouvait aussi être complétée par l’adjectif possessif Petrova.

[ÚJČ — emploi du possessif réfléchi](https://prirucka.ujc.cas.cz/?id=630)

## cs-a2-genitive

Décision : approuvé après correction.

- [important] `rule[1]` — Actuel « Singulier : masculin animé -a (Petr → Petra), inanimé le plus souvent -u (cukr → cukru, dům → domu) ;… ». Proposé « Au singulier, le génitif prend souvent -a ou -e au masculin animé (Petra, muže), -u ou -a au masculin… ». Ajouter les modèles omis les plus utiles, dont muže et lesa, sans traiter les terminaisons comme des prédictions certaines.
- [important] `rule[2]` — Actuel « Le français met « de » devant n’importe quel nom ; le tchèque change la terminaison du nom : sklenice… ». Proposé « En français, on dit « un verre d’eau » avec « de ». En tchèque, voda change de forme dans sklenice vody.… ». Le contraste porte sur la construction de quantité et sur le cas régi par bez, plutôt que sur un « de » supposé universel.
- [important] `rule[3]` — Actuel « Z devient ze devant certains groupes de consonnes : ze školy, ze Slovenska. Après les prépositions de… ». Proposé « La forme ze facilite la prononciation : ze školy, ze Slovenska, mais z Prahy. Après do, le génitif indique… ». La destination est liée à do. Les prépositions de lieu peuvent aussi exprimer la provenance et la position.
- [mineur] `exercises[0].prompt` — Actuel « Káva je bez ___ . ». Proposé « Káva je bez ___. ». En tchèque, aucun espace avant le point.
- [mineur] `exercises[1].prompt` — Actuel « Dám si sklenici ___ . ». Proposé « Dám si sklenici ___. ». En tchèque, aucun espace avant le point.
- [mineur] `exercises[2].prompt` — Actuel « Jsem z ___ . ». Proposé « Jsem z ___. ». En tchèque, aucun espace avant le point.
- [mineur] `exercises[3].prompt` — Actuel « Dnes jedu do ___ . ». Proposé « Dnes jedu do ___. ». En tchèque, aucun espace avant le point.
- [important] `exercises[4].instruction` — Actuel « Remplace « s » par « bez ». ». Proposé « Remplace « s mlékem » par l’équivalent de « sans lait ». Garde « Čaj » en tête. ». Le changement de préposition entraîne aussi le changement de cas. La consigne fixe la partie à transformer.

## cs-a2-past

Décision : approuvé après correction.

- [bloquant] `summary` — Actuel « Former le passé avec le participe en -l et l’auxiliaire jsem, qui varie selon le genre. ». Proposé « Former le passé avec l’auxiliaire být et accorder le participe en -l en genre et en nombre. ». C’est le participe qui s’accorde en genre et en nombre. L’auxiliaire marque la personne et le nombre.
- [important] `rule[0]` — Actuel « Le tchèque a un seul passé (il couvre passé composé et imparfait). Il se forme avec le participe en -l,… ». Proposé « Le passé courant se forme avec le participe en -l. Il correspond selon le contexte au passé composé ou à… ». Limiter l’observation au passé courant et dissocier l’accord du choix de l’auxiliaire.
- [bloquant] `rule[1]` — Actuel « Participe : infinitif sans -t + -l : dělat → dělal, mluvit → mluvil, pracovat → pracoval. Terminaisons :… ». Proposé « Pour les verbes comme dělat et mluvit, remplace le -t final de l’infinitif par -l : dělal, mluvil. Au… ». Le neutre pluriel est en -la. La formation à partir de l’infinitif est un modèle partiel.
- [important] `rule[2]` — Actuel « À la 3e personne, il n’y a pas d’auxiliaire : Petr dělal, Eva dělala, oni dělali. Le sujet est omis :… ». Proposé « À la 3e personne, il n’y a pas d’auxiliaire : Petr dělal, Eva dělala, oni dělali. Le sujet est souvent… ». Le pronom peut être exprimé. Já dělal jsem pose un problème d’ordre de l’auxiliaire, pas de présence du pronom.
- [important] `table.rows` — Actuel « ["já (homme)", "dělal jsem"], ["já (femme)", "dělala jsem"], ["ty (homme)", "dělal jsi"] … ». Proposé « ["já (homme)", "dělal jsem"], ["já (femme)", "dělala jsem"], ["ty (homme)", "dělal jsi"] … ». Montrer les accords féminin et neutre au pluriel. Le vy de politesse singulier a un accord au singulier, détaillé au conditionnel.
- [important] `examples[1]` — Actuel « { text: "Eva byla v Praze.", translation: "Eva a été à Prague.", note: "3e personne : pas d’auxiliaire,… ». Proposé « { text: "Eva byla v Praze.", translation: "Eva était à Prague.", note: "3e personne : pas d’auxiliaire,… ». La traduction à l’imparfait illustre naturellement une localisation passée.
- [important] `exercises[1].prompt` — Actuel « Včera jsme ___ film. ». Proposé « Včera jsme ___ film. (groupe mixte) ». Le genre du groupe précise pourquoi viděli est attendu plutôt que le féminin viděly.
- [important] `exercises[1].explanation` — Actuel « Sujet pluriel (nous) : participe en -li, viděli, avec jsme. ». Proposé « Pour un groupe mixte, le participe prend ici -li : viděli. L’auxiliaire jsme indique « nous ». ». L’accord en -li dépend du groupe, pas du pluriel seul.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au passé. ». Proposé « Mets la phrase au passé. Commence par le participe et garde « knihu » en fin de phrase. ». L’ancien exercice refuse entre autres Já jsem četl knihu malgré la consigne générale.
- [important] `exercises[4].answers` — Actuel « ["Četl jsem knihu.", "Četla jsem knihu.", "Knihu jsem četl.", "Knihu jsem četla."] ». Proposé « ["Četl jsem knihu.","Četla jsem knihu."] ». Les deux genres restent possibles avec le nouvel ordre imposé.

[ÚJČ — accord du participe](https://m.prirucka.ujc.cas.cz/?ascii=0&dotaz=1&id=tis%C3%ADcina)

## cs-a2-instrumental

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « L’instrumental répond à « avec qui ? avec quoi ? » (kým ? čím ?). On l’emploie après s / se (avec) : s… ». Proposé « L’instrumental répond à kým ? ou čím ? On l’emploie avec s / se (« avec ») et pour le moyen de transport,… ». Certaines prépositions citées régissent l’instrumental pour la position et l’accusatif pour la direction.
- [important] `rule[1]` — Actuel « Terminaisons : masculin et neutre → -em (kamarád → kamarádem, auto → autem, mléko → mlékem) ; neutre en -í… ». Proposé « Au singulier, beaucoup de masculins et neutres prennent -em (kamarádem, autem, mlékem). Nádraží prend -ím.… ». Inclure le masculin kolega et garder le repère du genre distinct de la terminaison du nom.
- [important] `rule[2]` — Actuel « S devient se devant s, z, š, ž ou un groupe de consonnes : se sestrou, se Zuzanou. « Avec moi » est se… ». Proposé « Se facilite la prononciation : se sestrou et souvent se Zuzanou ou se ženou. Certains groupes gardent s :… ». La vocalisation dépend des sons et de l’usage. Un groupe de consonnes peut garder s.
- [mineur] `exercises[0].prompt` — Actuel « Jedu do práce ___ . ». Proposé « Jedu do práce ___. ». En tchèque, aucun espace avant le point.
- [bloquant] `exercises[1].prompt` — Actuel « Pracuji s ___ . ». Proposé « Pracuji s ___. (avec un collègue) ». Kolegy est aussi un instrumental correct, au pluriel. Le singulier est précisé par la traduction.
- [mineur] `exercises[2].prompt` — Actuel « Pijeme kávu s ___ . ». Proposé « Pijeme kávu s ___. ». En tchèque, aucun espace avant le point.
- [mineur] `exercises[3].prompt` — Actuel « Mluvím s ___ . ». Proposé « Mluvím s ___. ». En tchèque, aucun espace avant le point.
- [important] `exercises[4].instruction` — Actuel « Remplace « autobus » par « vlak ». ». Proposé « Remplace seulement « autobusem » par la forme de « vlak » qui convient. ». La consigne nomme la forme effectivement présente et conserve l’ordre.

[CzechEncy — instrumental](https://www.czechency.org/slovnik/INSTRUMENT%C3%81L) · [ÚJČ — vocalisation des prépositions](https://prirucka.ujc.cas.cz/?id=770)

## cs-a2-dative

Décision : approuvé après correction.

- [bloquant] `rule[1]` — Actuel « Terminaisons : masculin et neutre → -u (bratr → bratru ; masculin animé souvent -ovi : Petrovi) ; féminin… ». Proposé « Au singulier, le datif peut prendre -u (bratru), -i (učiteli, moři) ou -ovi pour un masculin animé… ». Masculins et neutres ne prennent pas tous -u. Montrer notamment učiteli et moři, deux formes courantes.
- [bloquant] `rule[2]` — Actuel « Pronoms : formes courtes mi, ti, mu, jí, nám, vám, jim (atones, en 2e position) et formes longues mně,… ». Proposé « Sans préposition, emploie les formes atones mi, ti, mu, jí, nám, vám, jim. Pour insister, il existe… ». Après préposition, les pronoms de troisième personne prennent en général n-, donc k němu et non k jemu.
- [important] `rule[3]` — Actuel « Piège : « Prague me plaît » se dit Líbí se mi Praha. Ce qui plaît est le sujet, le verbe s’accorde avec… ». Proposé « Dans Líbí se mi ten film (« Ce film me plaît »), le film est le sujet et mi désigne la personne à qui il… ». Líbí est identique au singulier et au pluriel. La deuxième personne montre un véritable changement de forme.
- [important] `table.headers` — Actuel « ["Personne", "Forme courte", "Forme longue"] ». Proposé « ["Personne","Forme atone","Forme accentuée","Avec k / ke"] ». Distinguer les formes accentuées des formes après préposition.
- [important] `table.rows` — Actuel « ["já", "mi", "mně"], ["ty", "ti", "tobě"], ["on", "mu", "jemu"] … ». Proposé « ["já", "mi", "mně", "ke mně"], ["ty", "ti", "tobě", "k tobě"], ["on / ono", "mu", "jemu", "k němu"] … ». Le tableau présente aussi le n- des formes de troisième personne après k.
- [important] `examples[0]` — Actuel « { text: "Líbí se mi Praha.", translation: "J’aime Prague (Prague me plaît).", note: "Praha est le sujet,… ». Proposé « { text: "Líbí se mi Praha.", translation: "J’aime Prague (Prague me plaît).", note: "Praha est le sujet.… ». La personne à qui quelque chose plaît n’est pas destinataire d’un objet dans cette tournure.
- [important] `exercises[0].explanation` — Actuel « Líbit se se construit avec le datif : mi (ou mně). Mě est l’accusatif. ». Proposé « Líbit se prend le datif : mi, forme atone, ou mně pour insister. Mě est une forme de l’accusatif et du… ». L’explication décrit la distinction de cas sans limiter mě à l’accusatif.
- [mineur] `exercises[2].prompt` — Actuel « Dám dárek ___ . ». Proposé « Dám dárek ___. ». En tchèque, aucun espace avant le point.
- [mineur] `exercises[3].prompt` — Actuel « Dám to ___ . ». Proposé « Dám to ___. ». En tchèque, aucun espace avant le point.
- [bloquant] `exercises[4].instruction` — Actuel « Remplace « Evě » par le pronom « lui (elle) ». ». Proposé « Remplace « Evě » par le pronom datif atone. Commence par « Dám » et garde « knihu » sans ajout. ». L’ancienne consigne laisse l’ordre ouvert et la réponse avec tu ajoute un démonstratif absent de la source.
- [bloquant] `exercises[4].answers` — Actuel « ["Dám jí knihu.", "Knihu jí dám.", "Dám jí tu knihu."] ». Proposé « ["Dám jí knihu."] ». La seule réponse respecte la première position et conserve l’objet sans démonstratif.

[ÚJČ — variantes masculines du datif](https://m.prirucka.ujc.cas.cz/?id=%C4%8Cech)

## cs-b1-aspect

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Presque tous les verbes tchèques existent en deux aspects. L’imperfectif présente l’action comme un… ». Proposé « De nombreux verbes tchèques forment une paire d’aspect. L’imperfectif présente le déroulement, l’habitude… ». Le perfectif exprime un procès pris dans sa globalité. L’action n’est pas nécessairement déjà terminée, par exemple au futur.
- [important] `rule[3]` — Actuel « Indices : « tous les jours », « longtemps », « en train de » → imperfectif ; « enfin », « en dix minutes… ». Proposé « Les indications de durée ou d’habitude favorisent souvent l’imperfectif. Si tu veux dire qu’un résultat a… ». Les adverbes constituent des indices, pas des tests absolus. Certaines formes perfectives ont aussi des emplois non futurs, notamment dans des énoncés généraux.
- [important] `exercises[0].prompt` — Actuel « Včera jsem celý večer ___ knihu. ». Proposé « Včera jsem celý večer ___ knihu. (lecture en cours, livre non terminé) ». L’énoncé précise l’interprétation de processus que vise le choix de četl.
- [bloquant] `exercises[1].prompt` — Actuel « Za deset minut jsem ___ celý e-mail. ». Proposé « Za deset minut jsem ___ celý e-mail. (L’e-mail était prêt au bout de dix minutes.) ». Za deset minut peut aussi signifier « dix minutes plus tard », d’où une lecture possible avec psal dans l’ancien énoncé.
- [important] `exercises[1].explanation` — Actuel « « En dix minutes » indique un résultat atteint : perfectif, napsal. ». Proposé « Napsal présente l’écriture comme achevée : l’e-mail est prêt au bout de dix minutes. ». La réponse dépend du résultat exprimé, pas de la seule locution temporelle.
- [important] `exercises[3].explanation` — Actuel « « Tous les devoirs » : l’action est terminée, donc perfectif udělal / udělala. ». Proposé « L’infinitif udělat est perfectif. Ici, udělal ou udělala indique que les tâches ont toutes été faites. ». Tous les devoirs n’imposent pas à eux seuls un aspect si le contexte décrit une habitude ou un processus.
- [important] `exercises[4].instruction` — Actuel « Mets le verbe au perfectif : le dopis est terminé. ». Proposé « Remplace seulement « Psal » par son équivalent perfectif. ». Fixer le segment à remplacer dans cet exercice de transformation.
- [important] `exercises[4].answers` — Actuel « ["Napsal jsem dopis.", "Dopis jsem napsal."] ». Proposé « ["Napsal jsem dopis."] ». La réponse respecte la consigne qui conserve le reste de la phrase.

[CzechEncy — aspect verbal](https://www.czechency.org/slovnik/VID)

## cs-b1-future

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Pour un verbe imperfectif, le futur se forme avec budu + infinitif : budu dělat, budeš dělat, bude dělat,… ». Proposé « Le futur de beaucoup de verbes imperfectifs se forme avec budu et l’infinitif : budu dělat, budeš dělat,… ». Le futur analytique n’est pas le seul futur des imperfectifs. La fiche suivante exerce précisément půjdu.
- [important] `rule[1]` — Actuel « Pour un verbe perfectif, le présent a un sens de futur : napíšu (j’écrirai, et ce sera fini), koupím,… ». Proposé « La forme du présent d’un perfectif sert généralement à parler du futur : Zítra napíšu dopis (« Demain,… ». Les formes du présent des perfectifs ont généralement le sens du futur dans cette construction, sans équivalence absolue.
- [important] `rule[3]` — Actuel « Négation : ne- se soude à budu : Zítra nebudu pracovat. Piège : tu ne peux pas former un futur avec budu +… ». Proposé « Dans le futur construit avec budu, la négation se soude à l’auxiliaire : Zítra nebudu pracovat. Avec un… ». Préciser la place de ne- dans les deux constructions et retirer l’affirmation sur le français toujours au futur simple.
- [mineur] `exercises[3].prompt` — Actuel « Zítra to ___ . ». Proposé « Zítra to ___. ». En tchèque, aucun espace avant le point.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au futur. ». Proposé « Mets « číst » au futur en gardant le même aspect. Commence par l’auxiliaire et laisse « knihu » en fin de… ». L’ancienne consigne permet aussi une interprétation achevée avec Přečtu knihu ainsi que plusieurs ordres.
- [important] `exercises[4].answers` — Actuel « ["Budu číst knihu.", "Knihu budu číst."] ». Proposé « ["Budu číst knihu."] ». La réponse conserve le même verbe et place l’auxiliaire en tête.

[CzechEncy — aspect verbal et temps](https://www.czechency.org/slovnik/VID)

## cs-b1-motion

Décision : approuvé après correction.

- [important] `summary` — Actuel « Choisir entre trajet précis (jdu, jedu) et habitude ou aller-retour (chodím, jezdím). ». Proposé « Distinguer le trajet précis des déplacements répétés et choisir le verbe adapté au moyen de transport. ». L’aller-retour n’est pas le sens nécessaire du verbe des déplacements répétés.
- [important] `rule[0]` — Actuel « Le tchèque a deux verbes pour « aller » à pied (jít / chodit) et deux en véhicule (jet / jezdit). Le… ». Proposé « Pour un déplacement à pied, compare jít et chodit. En véhicule, compare jet et jezdit. Jít et jet… ». La notion d’aller-retour se déduit du contexte. Elle n’est pas le sens nécessaire du second verbe.
- [important] `rule[1]` — Actuel « Présent : jít → jdu, jdeš, jde, jdeme, jdete, jdou ; jet → jedu, jedeš, jede… ; chodit et jezdit → chodím,… ». Proposé « Présent : jít → jdu, jdeš, jde, jdeme, jdete, jdou ; jet → jedu, jedeš, jede… Chodit et jezdit donnent… ». Les deux futurs n’ont pas la même forme de préfixe visible. Enseigner directement půjdu et pojedu.
- [important] `rule[2]` — Actuel « Après ces verbes : do + génitif (lieu fermé : do školy, do Prahy), na + accusatif (na poštu, na nádraží),… ». Proposé « Pour la destination, retiens do + génitif (do školy, do Prahy), na + accusatif (na poštu, na nádraží) et k… ». Do Prahy ne désigne pas un lieu fermé. K peut indiquer un lieu comme la mer, en plus d’une personne.
- [important] `rule[3]` — Actuel « Piège : pour un aller-retour déjà fait, on dit plutôt Byl jsem v Praze (j’y suis allé et revenu) que Šel… ». Proposé « Šel jsem do práce décrit le trajet à pied, et Jel jsem do práce vlakem le trajet en train. Byl jsem v… ». La localisation passée n’implique pas en elle-même que l’aller-retour a été effectué. Šel jsem reste possible pour relater l’aller.
- [important] `exercises[0].prompt` — Actuel « Právě ___ do školy. (pěšky) ». Proposé « Právě ___ do školy pěšky. (Je suis en chemin à cet instant.) ». Právě chodím peut s’entendre comme « ces temps-ci, je vais habituellement ». La consigne indique un trajet déjà en cours.
- [bloquant] `exercises[1].prompt` — Actuel « Každý den ___ do práce autobusem. ». Proposé « Každý den ___ do práce autobusem. (Choisis le verbe des trajets répétés.) ». Chaque trajet d’une habitude peut aussi être pris séparément avec jedu. L’exercice demande explicitement le verbe des trajets répétés.
- [bloquant] `exercises[2].answers` — Actuel « ["jezdili"] ». Proposé « ["jezdili","jezdily"] ». Le participe au féminin pluriel est aussi correct pour un groupe de femmes.
- [important] `exercises[2].explanation` — Actuel « Habitude passée en véhicule : jezdili, avec jsme. ». Proposé « Jezdit décrit une habitude en véhicule. Au passé, jezdili convient à un groupe masculin animé ou mixte,… ». Expliquer les deux formes acceptées et leur accord.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase au futur. ». Proposé « Remplace seulement « Jdu » par son futur. ». La consigne fixe le verbe et l’ordre attendu.
- [important] `exercises[4].explanation` — Actuel « Le futur de jít se forme avec le préfixe pů- : půjdu. ». Proposé « Le futur de jít est půjdu. ». Donner la forme utile directement sans présenter pů- comme une règle productive de formation.

## cs-b1-clitics

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Se et si sont les pronoms réfléchis. Beaucoup de verbes sont toujours réfléchis : učit se (apprendre),… ». Proposé « Se et si sont des formes réfléchies. Se entre dans des constructions comme učit se (« apprendre »), dívat… ». Učit sans se est un autre emploi standard, avec le sens d’enseigner. La règle distingue le mot et sa construction.
- [important] `rule[1]` — Actuel « Ce sont des clitiques : de petits mots atones qui ne peuvent jamais ouvrir la phrase et se placent en 2e… ». Proposé « Ces formes sont atones. Dans une phrase simple, elles se placent généralement après le premier mot ou… ». Le placement se comprend dans la proposition et certaines combinaisons de clitiques sont fusionnées. Ses et sis sont standard.
- [important] `rule[2]` — Actuel « Ordre de plusieurs clitiques : 1 l’auxiliaire (jsem, jsi, jsme, jste) ; 2 se / si ; 3 le datif (mi, ti,… ». Proposé « Dans les suites étudiées, l’auxiliaire vient d’abord, puis se ou si, puis les pronoms compléments courts,… ». Limiter l’ordre exposé aux suites usuelles et éviter de laisser croire que deux datifs sont requis ensemble.
- [important] `rule[3]` — Actuel « Piège : en français, le pronom précède le verbe (je me lave). En tchèque, il suit le premier élément de la… ». Proposé « Dans « je me lave », le français met le pronom devant le verbe. Compare Umývám se et Včera jsem se myl :… ». Les exemples montrent pourquoi le pronom peut précéder ou suivre le verbe selon la phrase.
- [important] `examples[2]` — Actuel « { text: "Těším se na víkend.", translation: "Je me réjouis du week-end.", note: "Těšit se na + accusatif." } ». Proposé « { text: "Těším se na víkend.", translation: "J’ai hâte d’être en week-end.", note: "Těšit se na est suivi… ». La traduction française exprime l’attente avant le week-end.
- [important] `exercises[0].prompt` — Actuel « Já ___ učím česky. ». Proposé « Já ___ učím česky. (J’apprends le tchèque.) ». Sebe peut exprimer un complément réfléchi accentué avec učit « enseigner ». La traduction fixe la construction učit se.
- [important] `exercises[0].explanation` — Actuel « Učit se est toujours réfléchi, avec se. ». Proposé « Učit se signifie « apprendre ». Učit sans se signifie « enseigner ». ». Faire ressortir la distinction entre les deux constructions.
- [important] `exercises[3]` — Actuel « type: "fill", prompt: "Těším ___ na prázdniny.", answers: ["se"] … ». Proposé « type: "fill", prompt: "Těším ___ na prázdniny.", hint: "J’ai hâte d’être en vacances. … ». Le sens est maintenant explicite et l’exercice cible la construction avec se.
- [important] `exercises[4].instruction` — Actuel « Remplace « knihu » par le pronom « ji ». ». Proposé « Remplace « knihu » par « ji ». Garde « Včera » en tête et « koupil » à la fin. ». Le premier groupe et le verbe sont fixés pour tester l’ordre des seuls clitiques.
- [important] `exercises[4].answers` — Actuel « ["Včera jsem si ji koupil.", "Koupil jsem si ji včera."] ». Proposé « ["Včera jsem si ji koupil."] ». La réponse commençant par koupil ne correspond plus au nouvel ordre imposé.

[CzechEncy — place et combinaison des clitiques](https://www.czechency.org/slovnik/KLITIKON)

## cs-b1-conditional

Décision : approuvé après correction.

- [important] `rule[2]` — Actuel « Piège : le français met l’imparfait après « si » (si j’avais le temps). Le tchèque met le conditionnel… ». Proposé « En français, « si j’avais le temps » est à l’imparfait. En tchèque, on dit Kdybych měl čas. Pour dire… ». La conséquence peut avoir un autre mode dans certaines phrases, par exemple l’impératif dans Kdybys měl čas, zavolej mi.
- [important] `table.rows[2]` — Actuel « ["on / ona", "by", "chtěl by"] ». Proposé « ["on","by","chtěl by"] ». Le tableau est annoncé au masculin. Avec ona, la forme serait chtěla by.
- [important] `exercises[2].prompt` — Actuel « Kdybych měl čas, ___ s vámi. ». Proposé « Kdybych měl čas, ___ s vámi. (Conséquence au conditionnel.) ». Le nouvel énoncé impose le mode visé et non un mode déduit mécaniquement de toute hypothèse.
- [important] `exercises[2].explanation` — Actuel « Après kdybych, la principale est aussi au conditionnel : šel bych. ». Proposé « Šel bych est le conditionnel à la première personne du singulier, attendu pour cette conséquence hypothétique. ». La raison porte sur le mode demandé, non une règle absolue après kdyby.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au conditionnel de politesse. ». Proposé « Mets le verbe au conditionnel de politesse. Commence par le participe et garde « kávu » à la fin. ». Sans ordre fixé, Kávu bych si dal ou Kávu bych si dala conviennent aussi.

## cs-b1-imperative

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « On forme l’impératif à partir de la 3e personne du pluriel du présent, sans la terminaison : dělají →… ». Proposé « Apprends l’impératif de ty avec le verbe. Quelques modèles : dělat → dělej, pracovat → pracuj, mluvit →… ». La suppression mécanique de la terminaison de troisième personne ne suffit pas. Les changements de radical et les formes en -i se mémorisent par modèle.
- [important] `rule[1]` — Actuel « Pour vy, on ajoute -te : dělejte, mluvte, pište, čtěte (ě après t). Pour « faisons », -me : dělejme.… ». Proposé « Pour vy, on trouve souvent -te : dělejte, mluvte, pište. Avec čti, le pluriel est čtěte. Pour « faisons »,… ». L’ajout mécanique de -te à čti produirait une forme incorrecte.
- [bloquant] `rule[2]` — Actuel « Aspect : pour un ordre ponctuel, on préfère le perfectif (Otevři okno! Napiš mi!). Pour un conseil général… ». Proposé « Pour demander une action ponctuelle, le perfectif est courant : Otevři okno! Pour une consigne répétée,… ». L’imperfectif est usuel dans l’interdiction, mais l’impératif négatif n’exclut pas le perfectif.
- [bloquant] `rule[3]` — Actuel « Piège : le français garde le même verbe pour « ouvre » et « n’ouvre pas ». En tchèque, ne + perfectif à… ». Proposé « Un avertissement peut prendre un perfectif négatif : Nezapomeň na klíče! (« N’oublie pas tes clés ! »). Le… ». Un avertissement comme Nezapomeň est un impératif perfectif négatif courant.
- [important] `examples[1]` — Actuel « { text: "Nedělej to!", translation: "Ne fais pas ça !", note: "La négation reste à l’imperfectif : ne +… ». Proposé « { text: "Nedělej to!", translation: "Ne fais pas ça !", note: "Dans cette interdiction, on emploie… ». Éviter de répéter l’interdiction absolue du perfectif sous forme négative.
- [important] `exercises[0].prompt` — Actuel « ___ okno, prosím! (ty) ». Proposé « ___ okno, prosím! (impératif de ty) ». Une demande peut aussi prendre l’indicatif Otevřeš avec une autre intonation. L’exercice exige la forme impérative.
- [important] `exercises[1].prompt` — Actuel « ___ pomaleji, prosím! (vy) ». Proposé « ___ pomaleji, prosím! (impératif de vy) ». L’énoncé demande explicitement la forme impérative de politesse ou du pluriel.
- [important] `exercises[2].hint` — Actuel « dát ». Proposé « dát, impératif affirmatif ». La forme à produire est explicitement un impératif, et la négation n’est pas demandée.
- [important] `exercises[3].hint` — Actuel « být ». Proposé « být, impératif affirmatif ». Buďte et Nebuďte seraient possibles avec une consigne qui ne fixe pas la polarité.
- [bloquant] `exercises[4].instruction` — Actuel « Mets l’ordre à la forme négative. ». Proposé « Mets seulement le verbe à la forme négative. ». L’ordre To nedělej! était également possible dans la consigne générale.

[ÚJČ — formation de l’impératif](https://prirucka.ujc.cas.cz/?id=560) · [CzechEncy — aspect dans les avertissements](https://www.czechency.org/slovnik/VID)

## Doutes

Les variantes standard confirmées sont incluses dans les exercices concernés. Le cours présente `na stole` et `v Brně` en premier, avec `na stolu` et `v Brnu` aussi acceptés. Pour les constructions de place des clitiques et d’aspect, les règles sont limitées aux modèles étudiés. Aucun doute restant ne justifie un brouillon.

## Vérification

Chaque `find` est exact, unique dans le texte initial et compatible avec les remplacements précédents. Les 18 identifiants, les dates `reviewedOn` et les catégories sont conservés. Le cours résultant contient 90 exercices et respecte les limites des textes, tableaux, choix et trous.

## Ajustements finaux

Dans `cs-b1-conditional`, l’indice de `exercises[3]` demande l’auxiliaire du conditionnel. Sans cette précision, `jste` convient aussi. La synthèse compte les 165 remplacements initiaux. Le JSON en contient désormais 166.
