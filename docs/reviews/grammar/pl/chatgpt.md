# Relecture grammaire — polonais — Codex (relecture complète)

## Synthèse

18 fiches · 89 exercices · 18 approuvées après correction · 0 brouillon · 138 remplacements (68 bloquants, 63 importants, 7 mineurs)

Les propositions complètes figurent dans le [fichier de correctifs](chatgpt-patch.json). Les nombres ci-dessus comptent les champs modifiés. Plusieurs champs peuvent découler du même problème.

## pl-a1-gender

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Tout nom polonais a un genre, et la terminaison le révèle presque toujours : consonne → masculin… » — Proposé « La terminaison donne souvent un indice sur le genre d’un nom au singulier : consonne → masculin (stół,… » — Ces terminaisons sont des indices, et la règle concerne le singulier. Certains noms, comme drzwi, s’emploient uniquement au pluriel.
- [important] `rule[1]` — Actuel « Les exceptions sont peu nombreuses. Quelques noms masculins finissent en -a (mężczyzna, kolega) et… » — Proposé « Certains noms masculins finissent en -a (mężczyzna, kolega). Certains féminins finissent par une… » — Les féminins terminés par une consonne forment une catégorie courante.
- [important] `examples[1]` — Actuel « { text: "Oto nasza książka. Ona jest bardzo stara.", translation: "Voici notre livre. Il est très… » — Proposé « { text: "Ten zeszyt jest nowy, a ta książka? Ona jest bardzo stara.", translation: "Ce cahier est… » — La reprise pronominale s’inscrit dans un contraste naturel.
- [important] `examples[2]` — Actuel « { text: "Popatrz, okno jest otwarte. Ono jest duże.", translation: "Regarde, la fenêtre est ouverte.… » — Proposé « { text: "Popatrz na to dziecko. Ono już śpi.", translation: "Regarde cet enfant. Il dort déjà.", note:… » — La reprise par ono est naturelle avec un enfant déjà identifié dans le discours.
- [important] `exercises[1].prompt` — Actuel « Gdzie jest okno? ___ jest duże. » — Proposé « Jakie jest to okno? — ___ jest duże. » — Une réponse sur la taille ne répondait pas à la question sur l’emplacement.
- [bloquant] `exercises[3].prompt` — Actuel « Gdzie jest twoja książka? — ___ jest na stole. » — Proposé « Gdzie jest twoja książka? — ___ jest na stole.", hint: "Pronom sujet » — Le trou ouvert permet de répéter książka ou d’utiliser un autre sujet. L’indice cible on, ona, ono.
- [bloquant] `exercises[4].instruction` — Actuel « Remplace le nom sujet par le pronom qui convient. » — Proposé « Remplace seulement le nom sujet par le pronom qui convient. » — Une réorganisation comme « W domu śpi on » changerait la focalisation sans enfreindre la consigne initiale.

## pl-a1-byc

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Być (« être ») a un présent irrégulier à apprendre par cœur : jestem, jesteś, jest, jesteśmy,… » — Proposé « Być (« être ») a un présent irrégulier : jestem, jesteś, jest, jesteśmy, jesteście, są. La terminaison… » — Le pronom exprimé sert aussi à organiser le discours ou à marquer un contraste.
- [important] `rule[1]` — Actuel « Pour montrer ou présenter quelque chose, on dit to jest (au pluriel to są), toujours invariable : To… » — Proposé « Pour présenter quelqu’un ou quelque chose, utilise to jest au singulier et to są au pluriel : To jest… » — Seul to est invariable. La forme du verbe varie avec le nombre dans ces exemples.
- [important] `examples[2]` — Actuel « { text: "To są moi koledzy.", translation: "Ce sont mes collègues.", note: "To są devant un pluriel." }, » — Proposé « { text: "To są moi koledzy.", translation: "Ce sont mes copains.", note: "To są devant un pluriel." }, » — Sans contexte professionnel, koledzy désigne ici des copains ou camarades.
- [bloquant] `exercises[2].hint` — Actuel « być » — Proposé « być, au présent » — L’infinitif seul laisse le choix du temps ou du mode.
- [bloquant] `exercises[3].hint` — Actuel « być » — Proposé « być, au présent » — L’infinitif seul laisse le choix du temps ou du mode.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative. » — Proposé « Ajoute la négation sans déplacer les mots ni ajouter de pronom. » — « Ja nie jestem zmęczony » est une négation correcte, mais refusée par l’application.

## pl-a1-present-am

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Beaucoup de verbes polonais ont un infinitif en -ać et une conjugaison en -am : czytać → czytam,… » — Proposé « Beaucoup de verbes en -ać suivent le modèle de czytać. Retire seulement le -ć de l’infinitif et ajoute… » — Retirer -ać puis ajouter -m produit la forme incorrecte czytm.
- [important] `table.rows[2]` — Actuel « ["on / ona", "czyta", "ma"], » — Proposé « ["on / ona / ono","czyta","ma"], » — La forme du présent s’applique aussi au neutre.
- [important] `examples[0]` — Actuel « { text: "Czytam każdy wieczór.", translation: "Je lis chaque soir.", note: "Un seul présent : « je lis… » — Proposé « { text: "Teraz czytam książkę. Zwykle czytam wieczorem.", translation: "Je suis en train de lire un… » — Co wieczór ou wieczorem est plus idiomatique que chaque soir à l’accusatif dans cet exemple. Les deux phrases illustrent effectivement la règle.
- [bloquant] `exercises[2].hint` — Actuel « znać » — Proposé « znać, au présent » — L’infinitif seul laisse le choix du temps ou du mode.
- [bloquant] `exercises[3].hint` — Actuel « mieć » — Proposé « mieć, au présent » — L’infinitif seul laisse le choix du temps ou du mode.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase à la forme « my ». » — Proposé « Mets le verbe à la 1re personne du pluriel. Laisse « gazetę » à la fin. Le pronom « my » est facultatif. » — Le polonais permet aussi l’objet en tête. La nouvelle consigne définit l’ordre évalué.

## pl-a1-present-e

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Deux autres grandes familles. Groupe -ę, -esz, -e, -emy, -ecie, -ą (pisać → piszę, piszesz, pisze,… » — Proposé « Deux modèles : pisać donne piszę, piszesz, pisze, piszemy, piszecie, piszą. Robić donne robię, robisz,… » — Le sous-modèle en -ysz prend -ymy, -ycie et -ą, que l’ancienne liste ne donnait pas.
- [important] `rule[1]` — Actuel « La 1re personne du singulier finit toujours en -ę (voyelle nasale)et la 3e du pluriel en -ą ou -ią. Le… » — Proposé « Dans ces modèles, la 1re personne du singulier finit en -ę. La 3e du pluriel finit en -ą ou -ią. Le… » — L’affirmation sur -ę concerne ces modèles. La fiche précédente a enseigné czytam. Correction de l’espace manquante après la parenthèse.
- [important] `table.rows[2]` — Actuel « ["on / ona", "pisze", "robi"], » — Proposé « ["on / ona / ono","pisze","robi"], » — La forme du présent s’applique aussi au neutre.
- [mineur] `examples[1]` — Actuel « { text: "Co robisz wieczorem?", translation: "Que fais-tu ce soir ?", note: "Robić : robisz, à la 2e… » — Proposé « { text: "Co robisz dziś wieczorem?", translation: "Que fais-tu ce soir ?", note: "Robić : robisz, à la… » — Dziś rend explicite « ce soir », par opposition à une question sur les habitudes du soir.
- [bloquant] `exercises[2].hint` — Actuel « robić » — Proposé « robić, au présent » — L’infinitif seul laisse le choix du temps ou du mode.
- [bloquant] `exercises[3].hint` — Actuel « pisać » — Proposé « pisać, au présent » — L’infinitif seul laisse le choix du temps ou du mode.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase à la 3e personne du singulier (« il »). » — Proposé « Mets le verbe à la 3e personne du singulier (« il »). Laisse « zakupy » à la fin. Le pronom « on » est… » — Un autre ordre des mots peut conserver le sens, mais serait refusé.

## pl-a1-accusative

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Le complément direct prend l’accusatif. Seuls certains noms changent. Féminin en -a → -ę (książka →… » — Proposé « À l’affirmatif, des verbes comme mieć, widzieć et kupować prennent un complément à l’accusatif. Au… » — Le cas du complément dépend du verbe et de la négation. Certains masculins animés ne se forment pas par simple ajout de -a.
- [important] `rule[1]` — Actuel « Masculin inanimé et neutre ne changent pas : widzę stół, mam okno (l’accusatif est identique au… » — Proposé « Au singulier, les masculins inanimés et les neutres gardent la forme du nominatif : widzę stół, mam… » — L’animé est une catégorie grammaticale. Le repère sur l’identité avec le nominatif ne s’étend pas sans réserve aux noms de choses.
- [bloquant] `rule[2]` — Actuel « Piège : le français n’a pas de cas, mais il faut pourtant marquer l’objet. Après lubić, mieć, widzieć,… » — Proposé « En français, « le livre » garde la même forme en sujet et en objet. En polonais, compare Książka leży… » — Le conseil « ne laisse jamais la forme du dictionnaire pour un féminin » est faux pour des féminins comme noc.
- [important] `exercises[0].explanation` — Actuel « Kot est un masculin animé : l’accusatif prend la forme -a, kota. » — Proposé « Kot est un masculin animé. Son accusatif singulier est kota, comme au génitif. » — L’explication illustre la forme du nom sans donner -a comme terminaison obligatoire.

## pl-a1-locative

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Pour dire où on est, w (« dans ») et na (« sur, à ») sont suivis du locatif. Masculin et neutre le… » — Proposé « Pour indiquer où l’on est, w (« dans, à ») et na (« sur, à ») sont suivis du locatif. Au singulier,… » — Na stole se termine en -e. Les féminins en -a n’ont pas une terminaison unique.
- [important] `rule[1]` — Actuel « La consonne finale peut s’adoucir devant -e : Polska → w Polsce, książka → w książce, szkoła → w… » — Proposé « La consonne finale peut alterner : Polska → w Polsce, książka → w książce, szkoła → w szkole, poczta →… » — Les exemples ne relèvent pas tous d’un simple adoucissement. Les pays n’agissent pas comme sujet du verbe dire en français.
- [important] `table.rows[2]` — Actuel « ["miasto", "w mieście", "t → ci"], » — Proposé « ["miasto","w mieście","a → e, st → ść (écrit ści devant e)"], » — La transformation comporte une alternance de voyelle et du groupe st.
- [important] `table.rows[3]` — Actuel « ["Polska", "w Polsce", "sk → sc"], » — Proposé « ["Polska","w Polsce","k → c"], » — Le s reste inchangé.
- [important] `table.rows[5]` — Actuel « ["poczta", "na poczcie", "na, et t → c"], » — Proposé « ["poczta","na poczcie","na, et t → ć (écrit ci devant e)"], » — La consonne est ć, écrite ci devant e, et non c.
- [important] `exercises[0].explanation` — Actuel « Après w, on met le locatif : Polska devient Polsce (sk → sc). » — Proposé « Ici, w indique le lieu de résidence et demande le locatif : Polska devient Polsce (k → c). » — Le cas après w dépend de son emploi. La consonne s reste inchangée.
- [important] `exercises[1].prompt` — Actuel « Kasia jest ___. » — Proposé « Kasia jest ___. (Kasia est au bureau de poste.) » — Le contexte de lieu distingue na poczcie de w poczcie au sens de « dans le courrier ».

## pl-a2-plural

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le pluriel varie selon le genre. Féminin -a → -y ou -i (kobieta → kobiety, książka → książki ; -i… » — Proposé « Au nominatif pluriel, beaucoup de féminins en -a prennent -y ou -i (kobiety, książki), d’autres -e… » — Les formes en -e sont courantes, notamment pokoje et ulice. Les modèles en -y et -i ne couvrent pas tous les noms.
- [bloquant] `rule[1]` — Actuel « Le polonais distingue le masculin-personnel (hommes, ou groupes avec au moins un homme) : student →… » — Proposé « Les noms masculins de personnes ont des formes propres : student → studenci, Polak → Polacy, kolega →… » — La distinction ne change pas toutes les formes du verbe. Par exemple, les deux classes partagent są au présent.
- [important] `exercises[1].explanation` — Actuel « Le possessif moi est la forme masculin-personnel : il ne s’emploie qu’avec des hommes, donc studenci. » — Proposé « Moi est le possessif au masculin-personnel pluriel. Parmi les quatre noms, seul studenci appelle cette… » — La forme peut aussi s’employer pour un groupe mixte, par exemple moi rodzice.
- [bloquant] `exercises[4].answers` — Actuel « answers: ["To są moi koledzy."], » — Proposé « answers: ["To są moi koledzy.","To moi koledzy."], » — Le verbe être peut s’omettre dans cette présentation avec to.
- [important] `exercises[4].explanation` — Actuel « To jest devient to są, mój devient moi et kolega devient koledzy. » — Proposé « Mój devient moi et kolega devient koledzy. On peut dire to są ou simplement to devant le groupe nominal. » — L’explication doit rendre compte de la variante sans verbe.

## pl-a2-genitive

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Le génitif s’emploie après nie ma (« il n’y a pas ») et dans la négation d’un objet direct : Mam czas… » — Proposé « Après nie ma (« il n’y a pas »), on emploie le génitif. Il remplace aussi l’accusatif de l’objet quand… » — La négation ne met pas au génitif un complément que le verbe régit déjà au datif ou à un autre cas.
- [important] `rule[1]` — Actuel « Singulier : féminin -a → -y ou -i (woda → wody, praca → pracy). Masculin inanimé souvent -u (czas →… » — Proposé « Au singulier, les féminins en -a prennent souvent -y ou -i (woda → wody, praca → pracy). Les masculins… » — Mężczyzna est un animé dont le génitif n’est pas en -a. Les terminaisons sont des modèles fréquents.
- [important] `rule[2]` — Actuel « Piège : en français, la négation ne change pas le nom (« je n’ai pas de temps »). En polonais, l’objet… » — Proposé « En français, « un livre » devient « pas de livre » sans modifier le nom. En polonais, compare mam… » — L’exemple au datif délimite la règle. La négation française modifie le déterminant, pas la forme du nom.
- [mineur] `examples[2]` — Actuel « { text: "To jest dom mojego brata.", translation: "C’est la maison de mon frère.", note: "Possession :… » — Proposé « { text: "To jest dom mojego brata.", translation: "C’est la maison de mon frère.", note: "Possession :… » — Mojego est ici un possessif.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative. » — Proposé « Mets la phrase à la forme négative en commençant par « Nie mam ». » — Samochodu nie mam est grammatical, avec l’objet mis en relief.

## pl-a2-past

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Le passé se construit sur l’infinitif sans -ć, avec -ł (masculin), -ła (féminin), -ło (neutre), -li… » — Proposé « Pars des formes de la 3e personne : czytał, czytała, czytało, czytali, czytały. Pour ja et ty, ajoute… » — L’ancienne règle omet le e de czytałem et czytałeś et présume un radical calculable depuis l’infinitif.
- [important] `rule[1]` — Actuel « Le genre de celui qui parle compte : un homme dit czytałem, une femme czytałam. Au pluriel, un groupe… » — Proposé « Le genre compte : un homme dit czytałem, une femme czytałam. Un groupe masculin ou mixte dit… » — Le pluriel non masculin-personnel inclut les animaux et les choses.
- [bloquant] `rule[2]` — Actuel « Piège : le français a le passé composé avec avoir/être, le polonais n’a pas d’auxiliaire. Les verbes… » — Proposé « Le passé courant se forme sans auxiliaire, là où le français emploie souvent avoir ou être. Certains… » — Les verbes en -ć ne sont pas tous réguliers au passé. Iść est un contre-exemple courant.
- [important] `table.headers` — Actuel « headers: ["Personne", "Masculin", "Féminin"], » — Proposé « headers: ["Personne","Masculin / masc.-personnel","Féminin / autres pluriels"], » — Les masculins désignant des animaux ou des choses ne suivent pas le modèle masculin-personnel au pluriel.
- [mineur] `examples[0]` — Actuel « { text: "Wczoraj byłam w kinie.", translation: "Hier, je suis allée au cinéma.", note: "Une femme dit… » — Proposé « { text: "Wczoraj byłam w kinie.", translation: "Hier, j’étais au cinéma.", note: "Une femme dit byłam,… » — Le verbe polonais exprime ici la présence au cinéma. La traduction proposée conserve ce sens.
- [mineur] `exercises[0].explanation` — Actuel « Anna est féminin : -ła, donc była. » — Proposé « Le sujet Anna est féminin. On emploie była, avec -ła. » — « Anna est féminin » est mal accordé et désigne la personne plutôt que le sujet grammatical.
- [bloquant] `exercises[2].hint` — Actuel « dzwonić » — Proposé « dzwonić, au passé » — Wczoraj indique hier, mais n’impose pas à lui seul une forme du passé dans un récit au présent.
- [mineur] `exercises[2].explanation` — Actuel « Kasia est féminin : dzwonić → dzwoniła. » — Proposé « Kasia est un sujet féminin. Au passé, dzwonić donne dzwoniła. » — L’accord porte sur le sujet grammatical.
- [bloquant] `exercises[3].hint` — Actuel « być » — Proposé « być, au passé » — L’indice précise le temps visé plutôt que de s’appuyer uniquement sur wczoraj.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au passé (c’est un homme qui parle). » — Proposé « Mets le verbe au passé (un homme parle). Laisse « książkę » à la fin. Le pronom « ja » est facultatif. » — Un autre ordre des mots peut conserver le sens, mais serait refusé.

## pl-a2-instrumental

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Pour dire son métier, sa nationalité ou sa fonction avec być, on met l’attribut à l’instrumental :… » — Proposé « Après być, un nom qui indique le métier, la nationalité ou la fonction se met à l’instrumental :… » — Limiter la règle d’attribut au nom et préciser le sens de z. Le z de provenance régit le génitif, comme dans z Polski.
- [bloquant] `rule[2]` — Actuel « Piège : en français, « il est médecin » se dit avec un nom nu. En polonais, on met l’instrumental : on… » — Proposé « Compare On jest lekarzem (« Il est médecin ») avec To jest lekarz (« C’est un médecin »). Dans la… » — Il est faux que seul to jest permette le nominatif. Un adjectif attribut seul s’accorde normalement au nominatif.
- [important] `exercises[1].explanation` — Actuel « Après z, l’instrumental féminin prend -ą : siostrą. » — Proposé « Z signifie ici « avec » et demande l’instrumental : siostra → siostrą. » — Le cas dépend du sens de la préposition.
- [important] `exercises[3].explanation` — Actuel « Mleko → mlekiem après z. » — Proposé « Z signifie ici « avec ». Mleko devient mlekiem à l’instrumental. » — Le génitif est possible avec z au sens de provenance ou de matière.

## pl-a2-dative

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le datif répond à « à qui ? » : Daję prezent bratu, Pomagam mamie. Noms : masculin -owi ou -u (bratu,… » — Proposé « Le datif répond à « à qui ? » : Daję prezent bratu, Pomagam mamie. Au singulier, on trouve -owi ou -u… » — Siostrze se termine graphiquement par -e avec alternance de r. Le neutre en -u gagne à être illustré.
- [bloquant] `rule[1]` — Actuel « Les pronoms ont deux formes : courte et inaccentuée (mi, ci, mu, jej, nam, wam, im) après le verbe,… » — Proposé « Ja, ty et on/ono ont des formes brèves (mi, ci, mu) et longues (mnie, tobie, jemu). La forme brève… » — Les formes courtes ne viennent pas toujours après le verbe. Les autres personnes du tableau n’ont pas deux formes distinctes dans les emplois illustrés.
- [important] `rule[2]` — Actuel « Piège : en français, « ça me plaît » a « me » comme complément. En polonais, le sujet est la chose qui… » — Proposé « Pour « j’aime cette maison », tu peux dire Podoba mi się ten dom, comme « cette maison me plaît ». Ten… » — Le français « ça me plaît » suit déjà la même structure. Le piège vient du calque de « j’aime » ou de « j’ai froid ».
- [bloquant] `exercises[4].instruction` — Actuel « Remplace le nom par un pronom. » — Proposé « Remplace seulement « mamie » par le pronom correspondant, à la même place. » — Daję kwiaty jej est possible si l’on met le destinataire en relief.

[Poradnia Językowa UW, formes longues et brèves des pronoms](https://poradniajezykowa.uw.edu.pl/porady/dlugie-i-krotkie-formy-zaimkow/) · [Wielki słownik języka polskiego PAN, flexion de brat](https://wsjp.pl/haslo/podglad/2206/brat/4919173/w-rodzinie)

## pl-a2-motion

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le polonais a deux verbes pour « aller ». À pied : iść (trajet précis, maintenant) et chodzić… » — Proposé « À pied, iść décrit un déplacement dans une direction, par exemple Idę do szkoły. Chodzić convient… » — Le polonais dispose de plus de deux verbes de mouvement. Chodzić convient aussi à une promenade en cours, même unique.
- [important] `rule[1]` — Actuel « Lieu d’arrivée : do + génitif (do szkoły, do pracy, do kina). Moyen de transport : instrumental, sans… » — Proposé « Pour la destination, do se construit avec le génitif : do szkoły, do kina, do mamy. On dit aussi na +… » — Do n’est pas la seule préposition possible pour une destination.
- [important] `rule[2]` — Actuel « Piège : le français n’a qu’« aller ». Ne dis pas chodzę pour un trajet unique. Les conjugaisons se… » — Proposé « Le français emploie souvent le même verbe, « aller ». Compare Idę do szkoły (« Je suis en route pour… » — Le trajet unique dans une direction et le déplacement sans direction unique sont deux axes de distinction, en plus de l’habitude.
- [bloquant] `exercises[0].prompt` — Actuel « Teraz ___ pieszo do pracy. » — Proposé « W tej chwili ___ pieszo do pracy. Jestem już w połowie drogi. » — Teraz peut signifier « désormais » et autorise alors chodzę. Le milieu d’un trajet en cours fixe idę.
- [bloquant] `exercises[1].prompt` — Actuel « Codziennie ___ do szkoły autobusem. » — Proposé « Codziennie ___ do szkoły autobusem. (Je parle de moi.) » — Le remplacement d’un distracteur exige d’indiquer la personne. La première personne est également celle attendue par l’explication.
- [bloquant] `exercises[1].options` — Actuel « options: ["jadę", "jeżdżę", "idę", "chodzę"], » — Proposé « options: ["jeździsz","jeżdżę","idę","chodzę"], » — Jadę est possible pour un trajet présenté comme planifié et répété. Avec jeździsz, le choix vise la 1re personne.
- [important] `exercises[2].prompt` — Actuel « Dzisiaj my ___ pieszo do kina. » — Proposé « Czy ___ dziś razem pieszo do kina? » — Dzisiaj my est marqué sans contraste. Le sujet ressort de l’indice révisé.
- [bloquant] `exercises[2].hint` — Actuel « iść » — Proposé « iść, my, au présent » — La personne est précisée dans l’indice pour sélectionner idziemy après la suppression de my dans la phrase.
- [bloquant] `exercises[3].hint` — Actuel « jeździć » — Proposé « jeździć, au présent » — L’infinitif seul laisse le choix du temps ou du mode.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase à l’habitude (au lieu d’un trajet précis). » — Proposé « Remplace seulement le verbe par celui d’un trajet habituel. » — L’ajout de codziennie ou un changement d’ordre des mots était permis par la consigne initiale.

## pl-b1-aspect

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « La plupart des verbes polonais existent en deux versions : imperfectif (czytać) et perfectif… » — Proposé « Beaucoup de verbes polonais vont par paires : czytać (imperfectif) et przeczytać (perfectif).… » — Le perfectif peut aussi s’employer pour des actes répétés, chacun envisagé dans son ensemble. L’imperfectif peut mentionner un fait passé sans indiquer s’il était achevé.
- [bloquant] `rule[2]` — Actuel « Piège : le français marque cette nuance avec l’imparfait et le passé composé, pas par deux verbes.… » — Proposé « Le français peut employer le même passé composé dans deux sens : « J’ai lu toute la soirée »… » — L’aspect ne se traduit pas systématiquement par l’opposition imparfait/passé composé.
- [important] `table.rows[1]` — Actuel « ["pisać", "napisać", "écrire / avoir écrit"], » — Proposé « ["pisać","napisać","écrire / terminer d’écrire"], » — L’infinitif perfectif peut s’employer pour un achèvement futur. « Avoir écrit » ajoute une valeur temporelle que l’infinitif polonais n’exprime pas.
- [important] `table.rows[2]` — Actuel « ["robić", "zrobić", "faire / avoir fait"], » — Proposé « ["robić","zrobić","faire / mener à bien"], » — Glose aspectuelle, sans imposer une lecture de passé.
- [important] `table.rows[3]` — Actuel « ["kupować", "kupić", "acheter / avoir acheté"], » — Proposé « ["kupować","kupić","acheter (activité / acte complet)"], » — Glose aspectuelle, sans imposer une lecture de passé.
- [important] `table.rows[4]` — Actuel « ["jeść", "zjeść", "manger / avoir mangé"], » — Proposé « ["jeść","zjeść","manger / finir de manger"], » — Glose aspectuelle, sans imposer une lecture de passé.
- [important] `table.rows[5]` — Actuel « ["dawać", "dać", "donner / avoir donné"], » — Proposé « ["dawać","dać","donner (activité / acte complet)"], » — Glose aspectuelle, sans imposer une lecture de passé.
- [bloquant] `exercises[0].prompt` — Actuel « W końcu ___ ten list! » — Proposé « Wreszcie ___ ten list! (J’ai enfin fini d’écrire cette lettre.) » — W końcu peut introduire une action en cours ou passée sans achèvement, et le sujet n’était pas imposé.
- [important] `exercises[0].explanation` — Actuel « W końcu insiste sur le résultat : perfectif napisałem. » — Proposé « Le sens demandé inclut l’achèvement et le locuteur parle de lui-même. On emploie napisałem. » — L’adverbe seul ne suffit pas à décider de l’aspect.
- [bloquant] `exercises[1].prompt` — Actuel « Codziennie rano ___ gazetę. » — Proposé « Codziennie rano ___ gazetę. (Habitude au présent.) » — Le contexte futur est possible avec przeczytam, par exemple dans une promesse. Le présent fixe czytam.
- [bloquant] `exercises[2].hint` — Actuel « zrobić » — Proposé « zrobić, 1re personne du singulier » — Le sujet n’était pas indiqué. Zrobił ou zrobiła convenaient aussi.
- [bloquant] `exercises[3].hint` — Actuel « pić » — Proposé « pić, 1re personne du singulier au présent » — Sans personne ni temps indiqué, pije, pijemy ou piłem pouvaient convenir.
- [bloquant] `exercises[4].instruction` — Actuel « Mets le verbe au perfectif (action terminée). » — Proposé « Remplace seulement « robiłem » par la forme perfective correspondante, en gardant le temps et la personne. » — Un autre ordre des mots peut conserver le sens, mais serait refusé.

[Marek Łaziński, Wykłady o aspekcie polskiego czasownika](https://www.bijp.uw.edu.pl/files/Lazinski2020.pdf)

## pl-b1-future

Décision : approuvé après correction.

- [important] `summary` — Actuel « Former le futur imperfectif avec będę et le futur perfectif avec le présent du perfectif. » — Proposé « Former le futur composé avec będę et le futur simple des verbes perfectifs. » — Le perfectif n’a pas de présent au sens temporel.
- [important] `rule[0]` — Actuel « Deux manières de faire le futur. Imperfectif (action qui dure, habitude) : będę + infinitif ou będę +… » — Proposé « À l’imperfectif, forme le futur avec będę + infinitif (będę czytać) ou będę + la forme en -ł (będę… » — La notion d’action unique ne caractérise pas tous les futurs perfectifs.
- [important] `rule[1]` — Actuel « Będę se conjugue ainsi : będę, będziesz, będzie, będziemy, będziecie, będą. Après będę, l’infinitif… » — Proposé « Być au futur : będę, będziesz, będzie, będziemy, będziecie, będą. Tu peux dire będę czytać ou employer… » — Les deux variantes sont standard. La forme en -ł varie également au pluriel.
- [important] `rule[2]` — Actuel « Piège : przeczytam n’est pas un présent mais un futur, et le perfectif ne se combine jamais avec będę… » — Proposé « Przeczytam signifie « je lirai en entier ». Ne combine pas le futur de być avec l’infinitif d’un… » — Le futur simple du perfectif et le présent à valeur future de l’imperfectif sont deux constructions distinctes.
- [important] `examples[2]` — Actuel « { text: "Za godzinę napiszę do ciebie.", translation: "Dans une heure, je t’écrirai.", note: "Action… » — Proposé « { text: "Za godzinę napiszę do ciebie.", translation: "Dans une heure, je t’écrirai.", note: "Napiszę… » — L’action n’est pas encore achevée au moment où le locuteur parle.
- [important] `exercises[0].explanation` — Actuel « Le perfectif n’a pas de futur avec będę : son présent a le sens du futur, obejrzę. » — Proposé « Obejrzeć est perfectif. Son futur à la 1re personne se forme en un seul mot : obejrzę. » — La forme est un futur et le perfectif n’a pas de présent temporel.
- [mineur] `exercises[2].prompt` — Actuel « Jutro my ___ zakupy. » — Proposé « Jutro ___ zakupy. » — L’ordre de la phrase est neutre sans my explicite. L’indice précise la personne.
- [bloquant] `exercises[2].hint` — Actuel « zrobić » — Proposé « zrobić, my, au futur » — La personne doit rester explicite après la suppression de my dans la phrase.
- [bloquant] `exercises[3].hint` — Actuel « być » — Proposé « być, au futur » — Le présent jest(eście) peut aussi désigner un arrangement futur avec un repère daté. L’exercice demande la forme du futur.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au futur avec « będę ». » — Proposé « Mets au futur composé. Commence par « będę », puis mets la forme de « czytać », et enfin « książkę ». » — Les trois formes données étaient justes. L’ancienne consigne permettait aussi un pronom initial ou un autre ordre des mots.

[Université de Varsovie, description du futur simple et composé](https://www.gwarypolskie.uw.edu.pl/indexc532.html?Itemid=58&id=262&option=com_content&task=view)

## pl-b1-imperative

Décision : approuvé après correction.

- [important] `summary` — Actuel « Former l’impératif (czytaj, pisz, bądź) et employer nie + imperfectif pour interdire. » — Proposé « Former l’impératif (czytaj, pisz, bądź) et choisir l’aspect dans les ordres et les interdictions. » — L’imperfectif domine pour interdire, mais il n’est pas obligatoire dans tous les impératifs négatifs.
- [important] `rule[0]` — Actuel « L’impératif de ty se forme à partir de la 3e personne du pluriel ou du radical. Exemples : czytaj… » — Proposé « Apprends d’abord la forme de ty. Avec un verbe comme czytać, pars de czytają et enlève le ą final :… » — Le radical ou la troisième personne ne suffit pas à expliquer toutes les formes. Le modèle et les exemples indiquent quoi retenir.
- [bloquant] `rule[1]` — Actuel « Pour wy on ajoute -cie (czytajcie, piszcie), pour « nous » on ajoute -my (czytajmy, piszmy). Le… » — Proposé « Pour wy, ajoute -cie, et pour my, ajoute -my : czytajcie, czytajmy. Le perfectif est fréquent quand on… » — Des impératifs négatifs perfectifs sont standard, notamment pour éviter un résultat précis.
- [important] `rule[2]` — Actuel « Piège : le français emploie l’infinitif ou le présent pour la politesse (« veuillez… »). En polonais,… » — Proposé « Pour adoucir une demande, ajoute proszę : Czytaj ten tekst, proszę. La formule proszę + infinitif est… » — « Veuillez » est un impératif français, et la règle ancienne rejetait à tort les impératifs négatifs perfectifs.
- [important] `examples[0]` — Actuel « { text: "Marek, czytaj ten tekst, proszę.", translation: "Marek, lis ce texte, s’il te plaît.", note:… » — Proposé « { text: "Marku, czytaj ten tekst, proszę.", translation: "Marek, lis ce texte, s’il te plaît.", note:… » — Le vocatif standard correspond à la forme utilisée dans l’exercice.
- [mineur] `examples[1]` — Actuel « { text: "Dzieci, bądźcie cicho!", translation: "Les enfants, soyez silencieux !", note: "Être →… » — Proposé « { text: "Dzieci, bądźcie cicho!", translation: "Les enfants, silence !", note: "Być donne bądźcie à… » — Traduction plus idiomatique d’un ordre dans ce contexte.
- [bloquant] `exercises[0].prompt` — Actuel « Marku, ___ ten tekst, proszę. » — Proposé « Marku, ___ ten tekst, proszę. (Impératif de ty.) » — L’infinitif peut servir d’ordre dans certains contextes. La consigne demande la forme de l’impératif.
- [bloquant] `exercises[2].hint` — Actuel « jeść » — Proposé « jeść, impératif de ty » — Jedzcie et jedzmy étaient possibles sans destinataire précisé.
- [important] `exercises[2].explanation` — Actuel « Impératif de ty : jeść → jedz. Après nie, on emploie l’imperfectif. » — Proposé « Jeść donne jedz à l’impératif de ty. Cette interdiction porte sur une manière de manger et s’emploie à… » — L’explication évite de faire de l’imperfectif une règle sans exception après nie.
- [bloquant] `exercises[3].hint` — Actuel « pomóc » — Proposé « pomóc, impératif de ty » — Pomóżcie était aussi possible si l’on s’adressait à plusieurs personnes.
- [bloquant] `exercises[4].instruction` — Actuel « Transforme le constat en ordre adressé à ty. » — Proposé « Remplace seulement le verbe par l’impératif adressé à « ty ». » — La nouvelle consigne exclut les autres réécritures d’un ordre.

[Marek Łaziński, Wykłady o aspekcie polskiego czasownika, § 5.4, p. 181](https://www.bijp.uw.edu.pl/files/Lazinski2020.pdf)

## pl-b1-numbers

Décision : approuvé après correction.

- [important] `summary` — Actuel « Choisir le cas du nom selon le nombre : 1, 2 à 4, 5 et plus. » — Proposé « Accorder le nom avec un nombre dans un sujet ou un complément à l’accusatif. » — Le cas du nom dépend aussi de la fonction du groupe et du type de nom.
- [bloquant] `rule[0]` — Actuel « Le nombre décide du cas du nom. Après 1, le nom reste au singulier (jeden stół). Après 2, 3, 4 (et… » — Proposé « Dans un sujet ou un objet à l’accusatif, hors masculin-personnel, 1 seul garde le nom au singulier :… » — L’objet dans Mam dwa koty est à l’accusatif, même si sa forme coïncide avec le nominatif. Il faut aussi enseigner dwa/dwie et le traitement de 12–14.
- [important] `rule[1]` — Actuel « À partir de 5 (et 12-21, 25-31…), le nom passe au génitif pluriel (pięć stołów, pięć książek, pięć… » — Proposé « Dans les mêmes fonctions, les autres nombres (5–21, 25–31, etc.) demandent le génitif pluriel : pięć… » — Les numéraux ne régissent pas le génitif pluriel de la même manière dans les cas obliques. Les terminaisons du génitif pluriel varient.
- [bloquant] `rule[2]` — Actuel « Piège : le français garde simplement le pluriel. Ne dis pas pięć koty. Pour le masculin-personnel, on… » — Proposé « Au masculin-personnel, compare Dwóch studentów przyszło (génitif pluriel) et Dwaj studenci przyszli… » — Les deux constructions avec un nom masculin-personnel sont standard et entraînent des accords différents.
- [important] `table.caption` — Actuel « Nombre et cas du nom » — Proposé « Nombre et cas hors masculin-personnel » — Le tableau vise le sujet et l’objet à l’accusatif pour les noms non masculins-personnels.
- [important] `table.rows[0]` — Actuel « ["1", "nominatif singulier", "jeden stół"], » — Proposé « ["1 seul","singulier, cas du groupe","jeden stół"], » — 21 finit par un sans prendre le singulier.
- [bloquant] `table.rows[1]` — Actuel « ["2, 3, 4", "nominatif pluriel", "dwa koty, trzy książki, cztery okna"], » — Proposé « ["2, 3, 4","pluriel, cas du groupe","dwa koty, trzy książki, cztery okna"], » — Le cas du groupe peut être le nominatif ou l’accusatif.
- [bloquant] `table.rows[3]` — Actuel « ["22, 23, 24", "nominatif pluriel", "dwadzieścia dwa stoły"], » — Proposé « ["22, 23, 24…","pluriel, cas du groupe","dwadzieścia dwa stoły"], » — Le cas du groupe peut être le nominatif ou l’accusatif.
- [bloquant] `examples[0]` — Actuel « { text: "Mam dwa koty i trzy książki.", translation: "J’ai deux chats et trois livres.", note: "2-4 :… » — Proposé « { text: "Mam dwa koty i trzy książki.", translation: "J’ai deux chats et trois livres.", note: "Avec… » — L’ancienne note attribuait le nominatif à un objet direct.
- [bloquant] `exercises[0].explanation` — Actuel « Après 2, 3 ou 4, le nom est au nominatif pluriel : dwa koty. » — Proposé « Mam demande ici l’accusatif : dwa koty est à l’accusatif pluriel, de même forme que le nominatif. » — Il faut distinguer le cas syntaxique de la forme.
- [bloquant] `exercises[2].explanation` — Actuel « Après trzy, le nominatif pluriel : książki. » — Proposé « Avec mam, trzy książki est à l’accusatif pluriel. Sa forme coïncide ici avec le nominatif. » — Il faut distinguer le cas syntaxique de la forme.
- [bloquant] `exercises[4].explanation` — Actuel « Après cztery, le nominatif pluriel : samochód → samochody. » — Proposé « Avec mam, on emploie l’accusatif pluriel : cztery samochody. Il a ici la même forme que le nominatif. » — L’objet est à l’accusatif.

[Université de Silésie, exercices sur l’accord avec les numéraux](https://www.bristol.us.edu.pl/pomoce_dydaktyczne/po_polsku_bez_bledu.pdf)

## pl-b1-conditional

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le conditionnel se forme avec la forme en -ł du passé, suivie de by et de la terminaison personnelle :… » — Proposé « Ajoute by et la terminaison personnelle à la forme en -ł : czytałbym (homme), czytałabym (femme),… » — La particule est mobile. La forme simple sert dans les deux valeurs temporelles, sans présenter la règle comme une interdiction d’autres formes.
- [bloquant] `rule[1]` — Actuel « Emplois : politesse (Chciałbym kawę, Czy mógłbyś mi pomóc ?), souhait (Chciałbym pojechać do Polski),… » — Proposé « Le conditionnel sert à demander poliment (Chciałbym kawę, Czy mógłbyś mi pomóc?), à exprimer un… » — Le verbe de la subordonnée introduite par gdybym prend la forme en -ł sans un second marqueur du conditionnel.
- [bloquant] `rule[2]` — Actuel « Piège : en français, l’imparfait suit « si » (« si j’avais le temps »). En polonais, on garde gdybym +… » — Proposé « Pour « Si j’avais le temps, j’irais au cinéma », retiens gdybym miał czas, poszedłbym do kina. Après… » — Jeśli ou jeżeli peut aussi introduire une proposition conditionnelle. L’exercice enseigne le modèle avec gdybym sans déclarer ces autres constructions incorrectes.
- [important] `table.headers` — Actuel « headers: ["Personne", "Masculin", "Féminin"], » — Proposé « headers: ["Personne","Masculin / masc.-personnel","Féminin / autres pluriels"], » — Au pluriel, l’opposition grammaticale porte sur le masculin-personnel et les autres pluriels.
- [bloquant] `exercises[0].prompt` — Actuel « Marta mówi: ___ pojechać do Polski. » — Proposé « Marta mówi o sobie: ___ pojechać do Polski. » — Sans o sobie, Marta peut aussi dire Chciałaby au sujet d’une autre personne.
- [bloquant] `exercises[1].prompt` — Actuel « Gdybym miał czas, ___ do kina. » — Proposé « Gdybym miał czas, ___ do kina. (Si j’avais le temps, j’irais au cinéma.) » — Poszedłby est grammatical si la personne qui irait au cinéma est un autre homme.
- [bloquant] `exercises[2].hint` — Actuel « móc, ty » — Proposé « móc, ty, au conditionnel » — Możesz est également une demande polie, mais le mode demandé est le conditionnel.
- [bloquant] `exercises[2].answers` — Actuel « answers: ["mógłbyś", "mogłabyś"], » — Proposé « answers: ["mógłbyś","mogłabyś","byś mógł","byś mogła"], » — Byś peut précéder le verbe après Czy, sous forme d’un mot séparé.
- [important] `exercises[2].explanation` — Actuel « Politesse avec ty : mógłbyś (homme) ou mogłabyś (femme). » — Proposé « Pour ty, on dit mógłbyś ou mogłabyś. On peut aussi placer byś avant le verbe : Czy byś mógł mi pomóc? » — L’explication doit rendre compte de l’ordre également admis.
- [bloquant] `exercises[3].hint` — Actuel « chcieć » — Proposé « chcieć, au conditionnel » — Chcemy conviendrait sans mode indiqué.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["chcielibyśmy", "chciałybyśmy"], » — Proposé « answers: ["chcielibyśmy","chciałybyśmy","byśmy chcieli","byśmy chciały"], » — My byśmy chcieli et My byśmy chciały sont aussi des réponses correctes.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au conditionnel de politesse. » — Proposé « Remplace seulement « Chcę » par une forme du conditionnel en un mot. » — L’exercice accepte les deux genres. L’ancienne consigne admettait aussi les formes disjointes et d’autres ordres.

[Rada Języka Polskiego, règles de graphie de by, section 26](https://rjp.pan.pl/app/uploads/2025/06/2-zalacznik-do-komunikatu-Zasady-pisowni-06-24-wersja-ostateczna-jednolita.pdf)

## pl-b1-relative

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Który remplace « qui, que, dont, où » et suit deux règles. Son genre et son nombre sont ceux du nom… » — Proposé « Który introduit des relatives qui correspondent souvent à « qui », « que », « dont » ou « où ». Son… » — Le complément ne se met pas toujours à l’accusatif. Par exemple, słuchać demande le génitif.
- [bloquant] `rule[1]` — Actuel « Exemples : Mam brata, który mieszka w Lyonie (sujet, nominatif masculin). To jest książka, którą… » — Proposé « Mam brata, który mieszka w Lyonie (sujet au nominatif). To jest książka, którą czytam (objet à… » — Une virgule avant lequel au sens de « w, którym » serait incorrecte. La frontière est celle de la relative.
- [important] `table.rows[1]` — Actuel « ["Accusatif", "którego / który", "którą", "które", "których / które"], » — Proposé « ["Accusatif","którego (animé) / który (inanimé)","którą","które","których (masc.-pers.) / które"], » — Les deux formes du masculin et du pluriel ne sont pas interchangeables.
- [important] `table.rows[3]` — Actuel « ["Locatif", "którym", "której", "którym", "których"], » — Proposé « ["Locatif","którym","której","którym","których"], ["Datif","któremu","której","któremu","którym"],… » — Compléter le tableau avec les deux cas étudiés en A2 qui peuvent également être régis dans une relative.
- [bloquant] `exercises[4].instruction` — Actuel « Relie les deux phrases avec « który ». » — Proposé « Garde « Mam brata ». Remplace « Mój brat » par « który » et rattache la seconde phrase comme relative. » — Un autre ordre des mots peut conserver le sens, mais serait refusé.

## Doutes

Le cours vise le polonais standard contemporain. Les variantes d’ordre des mots et de flexion pertinentes sont acceptées ou délimitées par la consigne de l’exercice. Aucun doute n’impose de garder une fiche en brouillon.

## Vérification

Les recherches exactes sont uniques dans le cours de départ et leurs plages ne se chevauchent pas. La reconstruction conserve les 18 identifiants et les champs `reviewedOn`. Les fiches reconstruites respectent les limites de longueur, les dimensions des tableaux et le format des exercices.

## Ajustements finaux

Dans `pl-a1-accusative`, les indices de `exercises[3]` et `exercises[4]` demandent le singulier pour écarter les accusatifs pluriels `kawy` et `gazety`. La synthèse compte les 138 remplacements initiaux. Le JSON en contient désormais 140.
