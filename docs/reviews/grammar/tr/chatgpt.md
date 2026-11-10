# Relecture grammaire — turc — Codex (relecture complète)

## Synthèse

18 fiches et 88 exercices relus · 18 approuvées après correction · 0 brouillon · 105 remplacements (44 bloquants, 61 importants, 0 mineurs)

La relecture porte sur le turc standard de Turquie. Les exercices révisés indiquent la forme grammaticale à produire lorsqu’une phrase accepte naturellement plusieurs temps, plusieurs constructions ou plusieurs ordres. Le [fichier JSON](chatgpt-patch.json) contient les passages complets à remplacer et leurs remplacements.

## tr-a1-harmony-plural

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Le turc n’a ni article ni genre, et il fonctionne par suffixes collés à la fin du mot. La voyelle du suffixe s’adapte à la dernière voyelle du mot : c’es… ». Proposé « Le turc n’a pas de genre grammatical ni d’article défini. Bir peut introduire un nom indéfini, comme « un » ou « une ». Beaucoup de suffixes changent de … ». Bir fonctionne aussi comme article indéfini, déjà illustré dans la fiche sur les questions.
- [bloquant] `rule[1]` — Actuel « Pour le pluriel, il n’y a que deux formes : -lar après a, ı, o, u ; -ler après e, i, ö, ü. On dit kitap → kitaplar (dernière voyelle a), ev → evler (e), … ». Proposé « Le pluriel a deux formes : -lar après a, ı, o, u et -ler après e, i, ö, ü. Observe kitap → kitaplar, ev → evler et göz → gözler. Certains emprunts font e… ». Saatler est courant et contredit l’absence d’exceptions. [TDK — Büyük Ünlü Uyumu](https://tdk.gov.tr/icerik/yazim-kurallari/buyuk-unlu-uyumu/)
- [important] `rule[2]` — Actuel « Piège : après un nombre ou après çok (beaucoup), le nom reste au singulier : üç kitap (trois livres), et non üç kitaplar. Le pluriel -lar / -ler sert qua… ». Proposé « Après un nombre, le nom compté reste au singulier : üç kitap (« trois livres »). Avec çok au sens de « beaucoup de », le singulier est courant : çok kita… ». L’ancienne règle interdisait le pluriel avec tout mot de quantité et ne distinguait pas les fonctions de çok.
- [bloquant] `exercises[3].instruction` — Actuel « Mets la phrase au pluriel. ». Proposé « Mets seulement le nom au pluriel. Garde les autres mots dans le même ordre. ». La reformulation doit cibler kitap, sans admettre des changements d’ordre que la correction refuserait.

## tr-a1-to-be

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Au présent, le turc n’a pas de verbe « être » séparé : on colle une terminaison personnelle au nom ou à l’adjectif. Ben öğrenciyim signifie « je suis étu… ». Proposé « Pour dire qui tu es ou comment tu es au présent, on ajoute généralement une terminaison au nom ou à l’adjectif : Ben öğrenciyim (« Je suis étudiant »). L… ». Le turc possède olmak. La règle porte ici sur la prédication nominale ou adjectivale.
- [bloquant] `rule[2]` — Actuel « À la 3e personne du singulier, il n’y a aucune terminaison : O öğrenci. Au pluriel, on ajoute -ler / -lar : öğrenciler. ». Proposé « À la 3e personne du singulier, la forme simple n’a pas de terminaison : O öğrenci. Au pluriel, on peut ajouter -ler ou -lar : Onlar öğrenciler. Avec onla… ». Le pluriel du prédicat peut être omis avec onlar, et -dir existe.
- [bloquant] `exercises[2].hint` — Actuel « yorgun ». Proposé « yorgun, avec la terminaison du présent ». Yorgundunuz ou yorgunmuşsunuz restent grammaticaux hors du temps visé.
- [bloquant] `exercises[3].hint` — Actuel « mutlu ». Proposé « mutlu, avec la terminaison du présent ». Mutluydun est aussi une phrase possible sans temps précisé.
- [important] `exercises[4].instruction` — Actuel « Remplace « Ben » par « Biz » et adapte la terminaison. ». Proposé « Passe à la 1re personne du pluriel. Le pronom « Biz » est facultatif. ». L’instruction et les deux réponses doivent être cohérentes.

## tr-a1-locative-ablative-dative

Décision : approuvé après correction.

- [important] `rule[2]` — Actuel « Les noms propres reçoivent une apostrophe avant le suffixe : İstanbul'da, Paris'ten, Ankara'ya. Un seul suffixe remplace les prépositions françaises : ev… ». Proposé « Avec un nom de personne ou de lieu comme İstanbul, Paris ou Ankara, sépare le suffixe de cas par une apostrophe : İstanbul'da, Paris'ten, Ankara'ya. Evde… ». Circonscrit la règle orthographique aux noms illustrés. [TDK — Kesme İşareti](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/)
- [important] `table.headers` — Actuel « ["Cas", "Question", "Normal", "Après f s t k ç ş h p"] ». Proposé « ["Cas", "Question", "Exemples", "Autres exemples"] ». Kitaba illustre une alternance lexicale, tandis que le datif ne connaît pas l’alternance d/t du locatif et de l’ablatif.
- [important] `exercises[1].prompt` — Actuel « Anahtar ___. (dans le livre) ». Proposé « Anahtar ___. (dans le panier) ». Le panier rend le contexte locatif immédiatement naturel sans changer le test sur la consonne sourde.
- [important] `exercises[1].options` — Actuel « ["kitapda", "kitapa", "kitapta"] ». Proposé « ["sepetde", "sepete", "sepette"] ». Sepette donne le locatif après la consonne sourde t.
- [important] `exercises[1].explanation` — Actuel « Après p (consonne sourde), le d du locatif devient t : kitapta. ». Proposé « Sepet signifie « panier ». Après t, consonne sourde, le d du locatif devient t : sepette. ». Nomme le mot de l’exercice et explique la forme sourde -te.
- [bloquant] `exercises[2].hint` — Actuel « çanta ». Proposé « çanta, au locatif seul ». Çantadadır convient également si la consigne permet le marqueur prédicatif -dır.
- [important] `exercises[3].hint` — Actuel « Ali (pour Ali) ». Proposé « Ali, au datif seul (« pour Ali ») ». La consigne demande la forme de cas seule, sans marqueur prédicatif.
- [bloquant] `exercises[3].answers` — Actuel « ["Ali'ye", "Aliye"] ». Proposé « ["Ali'ye"] ». Le datif du prénom Ali prend obligatoirement une apostrophe. [TDK — Kesme İşareti](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/)
- [bloquant] `exercises[4].answers` — Actuel « ["Ankara'danız", "Ankaradanız"] ». Proposé « ["Ankara'danız"] ». Le suffixe de cas du toponyme prend une apostrophe. [TDK — Kesme İşareti](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/)

## tr-a1-var-yok-mi

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Var veut dire « il y a, il existe » et yok « il n’y a pas ». On met le lieu au locatif, puis le nom sans article ni pluriel, puis var ou yok : Masada kit… ». Proposé « Var signifie « il y a » et yok « il n’y a pas ». Pour dire ce qu’on trouve dans un lieu, tu peux mettre le lieu au locatif, puis le nom et var ou yok : M… ». Le nom peut porter le pluriel ou d’autres marques, et l’ordre est un modèle courant.
- [important] `rule[1]` — Actuel « Pour une question oui/non, on ajoute la particule mi après le mot sur lequel porte la question, sans changer l’ordre des mots : Kitap var mı (y a-t-il un… ». Proposé « Pour une question oui/non, place la particule mi après le mot sur lequel porte la question : Kitap var mı? Elle s’écrit séparément et s’accorde avec la d… ». Supprime l’exemple sans point d’interrogation et la règle d’ordre trop stricte. [TDK — Soru Eki](https://tdk.gov.tr/icerik/yazim-kurallari/soru-eki-mi-mi-mu-munun-yazilisi/)
- [important] `rule[2]` — Actuel « Avec « être », la terminaison personnelle se place sur mi, pas sur le mot : Yorgun musun (es-tu fatigué ?), Öğretmen misiniz (êtes-vous professeur ?). On… ». Proposé « Avec un nom ou un adjectif au présent, les terminaisons de « je », « tu », « nous » et « vous » s’attachent à la particule : Yorgun musun? Öğretmen misin… ». La 3e personne du pluriel peut garder -lar/-ler sur le prédicat avant la particule. La portée de la règle est précisée.
- [important] `rule[3]` — Actuel « Piège : pas d’inversion ni d’« est-ce que » comme en français. La question garde l’ordre de l’affirmation ; seul mi apparaît. ». Proposé « En français, tu peux dire « est-ce que… » ou inverser le sujet et le verbe. Pour les exemples de cette fiche, garde l’ordre de l’affirmation et place mi … ». Seul mi apparaît contredisait les exemples où la terminaison personnelle change de support.
- [important] `exercises[2].hint` — Actuel « il n’y a pas ». Proposé « « Il n’y a pas » au présent, forme simple ». Yoktu et yoktur restent possibles si ni le temps ni la forme simple ne sont imposés.
- [important] `exercises[3].hint` — Actuel « mi + siniz ». Proposé « Question au présent avec « siz » ». L’indice précédent donnait directement mi et siniz. L’indication du présent écarte une forme passée comme miydiniz.
- [bloquant] `exercises[3].explanation` — Actuel « Öğretmen se termine par e : mi, puis la terminaison « vous » -siniz, donc misiniz. ». Proposé « La dernière voyelle d’öğretmen est e : écris mi suivi de -siniz, donc misiniz. ». Öğretmen se termine par n. C’est la dernière voyelle qui compte.
- [bloquant] `exercises[4].instruction` — Actuel « Transforme en question oui/non. ». Proposé « Ajoute la particule interrogative à la fin, sans modifier les autres mots. ». Bu okul mu? ou Bu mu bir okul? répondent à d’autres lectures de la consigne. La particule finale fixe la portée attendue.

## tr-a1-present-continuous

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « Le présent continu se forme sur le radical du verbe (infinitif sans -mek / -mak : gelmek → gel) avec -iyor, dont la voyelle suit l’harmonie à quatre voie… ». Proposé « Retire -mek ou -mak. Après une consonne, ajoute -ıyor, -iyor, -uyor ou -üyor : alıyor, geliyor, buluyor, görüyor. Après ı, i, u ou ü, ajoute -yor : okuyo… ». Un a/e final peut donner aussi u/ü. Les formes yiyor et diyor sont fréquentes. [TDK — Ünlü Daralması](https://tdk.gov.tr/icerik/yazim-kurallari/unlu-daralmasi/)
- [bloquant] `rule[1]` — Actuel « Les terminaisons personnelles se collent après -yor : -um, -sun, rien, -uz, -sunuz, -lar. Le pronom est facultatif. Les verbes en -t perdent leur t : git… ». Proposé « Après -yor, les terminaisons sont -um, -sun, aucune terminaison au singulier à la 3e personne, puis -uz, -sunuz, -lar. Avec onlar, le -lar peut être omis… ». Gitmek ne perd pas son t. L’alternance t/d ne concerne pas tous les verbes.
- [important] `rule[2]` — Actuel « Ce temps traduit « je fais » et « je suis en train de faire » ; il sert aussi pour un futur proche. Piège : le verbe se place toujours en dernier : Ben k… ». Proposé « Ce temps traduit souvent « je fais » ou « je suis en train de faire ». Il peut aussi indiquer une habitude ou un projet. Dans une phrase neutre, place le… ». Le verbe est généralement final dans l’ordre neutre. D’autres ordres restent possibles.
- [bloquant] `exercises[1].explanation` — Actuel « Gitmek perd son t devant une voyelle : gidiyor. À la 3e personne, il n’y a pas de terminaison. ». Proposé « Dans gitmek, t devient d devant la voyelle de -iyor : gidiyor. À la 3e personne du singulier, il n’y a pas de terminaison personnelle. ». Le t est remplacé par d, sans disparition.
- [bloquant] `exercises[2].hint` — Actuel « öğrenmek ». Proposé « öğrenmek, au présent en -iyor ». Öğreniriz ou öğreneceğiz restent possibles si le temps n’est pas fixé.
- [bloquant] `exercises[3].hint` — Actuel « yapmak ». Proposé « yapmak, au présent en -iyor ». Ne yaparsın? est une autre question correcte sans temps imposé.
- [important] `exercises[4].instruction` — Actuel « Remplace « Ben » par « Onlar » et conjugue le verbe. ». Proposé « Remplace « Ben » par « Onlar ». Garde le lieu à la même place et adapte le verbe. ». L’ordre doit rester fixe. Avec le sujet explicite, les deux accords usuels peuvent être acceptés.
- [bloquant] `exercises[4].answers` — Actuel « ["Onlar Ankara'ya gidiyorlar.", "Onlar Ankaraya gidiyorlar."] ». Proposé « ["Onlar Ankara'ya gidiyorlar.", "Onlar Ankara'ya gidiyor."] ». Accepte l’absence de -lar avec onlar et exige l’apostrophe du nom propre.
- [important] `exercises[4].explanation` — Actuel « Pour « onlar », la terminaison est -lar après -yor : gidiyorlar. ». Proposé « Avec onlar, on peut dire gidiyorlar ou gidiyor. Écris Ankara'ya avec l’apostrophe du nom de lieu. ». Les deux accords du verbe sont permis.

## tr-a1-accusative

Décision : approuvé après correction.

- [important] `title` — Actuel « L’objet défini : l’accusatif -i ». Proposé « Marquer l’objet direct avec l’accusatif -i ». L’accusatif s’emploie aussi avec certains objets indéfinis comportant bir.
- [important] `rule[0]` — Actuel « Le complément d’objet direct précis prend le suffixe -(y)i, à quatre voies : -ı, -i, -u, -ü. Après une voyelle, on ajoute y : kitabı, evi, okulu, gözü, a… ». Proposé « L’accusatif de l’objet direct a quatre voyelles possibles : -ı, -i, -u, -ü. Sur un nom simple qui finit par une voyelle, ajoute y : araba → arabayı, kedi… ». Le y n’est pas la liaison dans arabasını, où la voyelle finale appartient au possessif.
- [important] `rule[1]` — Actuel « Le suffixe s’emploie seulement quand l’objet est précis : avec bu / şu / o (ce), un possessif ou un nom propre. Un objet non précis reste nu : Kahve içiy… ». Proposé « L’accusatif marque notamment les objets identifiés : un nom précédé de bu, şu ou o, un nom propre ou un nom avec un possessif. Compare Kahve içiyorum (« … ». Décrit un contraste fréquent sans faire de la précision une condition absolue.
- [bloquant] `rule[2]` — Actuel « Piège : le turc n’a pas d’article, mais le suffixe joue un peu le rôle de « le / la ». Bir kitap (un livre) reste sans suffixe, tandis que kitabı (le liv… ». Proposé « Bir kitap okuyorum évoque un livre sans préciser lequel. Bir kitabı okuyorum peut viser un livre particulier, même avec bir. Devant la voyelle du suffixe… ». L’indéfini bir et l’accusatif peuvent coexister, et les alternances ne sont pas automatiques. [Étude sur le marquage de l’objet](https://www.mdpi.com/2226-471X/10/7/173)
- [bloquant] `exercises[3].hint` — Actuel « şarkı ». Proposé « şarkı, au singulier ». Bu peut aussi introduire un nom pluriel, donc bu şarkıları restait possible.
- [important] `exercises[4].instruction` — Actuel « Remplace « kahve » par « bu kahve » (ce café). ». Proposé « Remplace « kahve » par « bu kahve » à la même place et adapte le cas. « Ben » est facultatif. ». Fixe l’ordre demandé et reflète l’omission admise du pronom.

## tr-a2-possessive-genitive

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Pour dire « mon, ton, son… », on colle un suffixe possessif au nom : ev → evim, evin, evi, evimiz, eviniz, evleri. Après une voyelle, la voyelle du suffi… ». Proposé « Pour dire « mon, ton, son… », on ajoute un suffixe au nom : evim, evin, evi, evimiz, eviniz, evleri. Après une voyelle finale, on dit arabam, araban, ara… ». La forme -sı n’est qu’une variante du suffixe et le tableau illustre aussi -si ou -sı selon le nom.
- [important] `rule[1]` — Actuel « Le possesseur se met devant au génitif : benim, senin, onun, bizim, sizin, onların. Pour un pronom, il est facultatif : (benim) arabam. Pour un nom, il e… ». Proposé « Le possesseur se place devant le nom. On peut omettre un pronom quand le suffixe suffit : (benim) arabam. Pour nommer le possesseur, emploie le génitif :… ». Le groupe marqué au génitif peut aussi être implicite. La liste précise la forme après voyelle.
- [important] `rule[2]` — Actuel « Piège : le turc marque les deux mots : le possesseur au génitif et le possédé avec le suffixe possessif (evin kapısı, « de la maison la porte-sa »). Il n… ». Proposé « Dans evin kapısı (« la porte de la maison »), evin est au génitif et kapısı porte le suffixe possessif. Pour rendre « j’ai » et « je n’ai pas », utilise … ». La comparaison porte sur la construction possessive ordinaire, sans exclure d’autres traductions d’avoir.
- [bloquant] `exercises[4].answers` — Actuel « ["Ali'nin arabası yeni.", "Alinin arabası yeni."] ». Proposé « ["Ali'nin arabası yeni."] ». L’apostrophe est obligatoire entre le prénom et le suffixe de génitif. [TDK — Kesme İşareti](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/)

## tr-a2-past

Décision : approuvé après correction.

- [important] `rule[2]` — Actuel « Une seule forme couvre le passé composé et le passé simple français. Pour dire « j’étais » (état), on ajoute -ydi au nom : Dün evdeydim. Piège : pas d’au… ». Proposé « Le passé en -di peut traduire le passé composé ou le passé simple. Pour dire « j’étais » après un nom, un adjectif ou un lieu, utilise -di et ses variant… ». Après consonne, il n’y a pas de y, et la voyelle s’harmonise.
- [bloquant] `exercises[2].hint` — Actuel « izlemek ». Proposé « izlemek, au passé en -di ». İzliyoruz, izleyeceğiz et d’autres temps restent possibles sans borne.
- [bloquant] `exercises[3].hint` — Actuel « çalışmak ». Proposé « çalışmak, au passé en -di ». Dün peut aussi accompagner le passé en -miş ou -iyordu.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au passé. ». Proposé « Mets le verbe au passé en -di. Garde le sujet, le complément et leur ordre. ». Mets au passé seul permet plusieurs temps et des déplacements.

## tr-a2-future

Décision : approuvé après correction.

- [bloquant] `rule[2]` — Actuel « Les terminaisons sont celles de « être » : -im, -sin, rien, -iz, -siniz, -ler. Les verbes en -t perdent leur t : gitmek → gideceğim. Piège : le ğ s’écrit… ». Proposé « Les terminaisons ressemblent à celles de « être » : -im, -sin, rien à la 3e personne du singulier, puis -iz, -siniz et -ler, avec leurs variantes. Dans g… ». L’alternance de gitmek n’est pas une règle générale et t est remplacé, sans être supprimé.
- [bloquant] `exercises[2].hint` — Actuel « yapmak ». Proposé « yapmak, au futur en -ecek / -acak ». Yarın n’impose pas le futur morphologique. Yarın ne yapıyorsun? est courant.
- [bloquant] `exercises[3].hint` — Actuel « okumak ». Proposé « okumak, au futur en -ecek / -acak ». Bu akşam kitap okuyorum peut exprimer le même projet.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase au futur. ». Proposé « Mets le verbe au futur en -ecek / -acak. Garde les autres mots dans le même ordre. ». Il faut demander la forme morphologique et limiter le changement au verbe.

## tr-a2-negation

Décision : approuvé après correction.

- [important] `rule[2]` — Actuel « Piège : pas de petit mot comme « pas » après le verbe ; tout se passe à l’intérieur du verbe. Écris -miyor et non -meyor. ». Proposé « Pour nier les formes verbales étudiées ici, place le suffixe à l’intérieur du verbe. Compare geliyorum et gelmiyorum. Pour nier un nom ou un adjectif, éc… ». La règle ne doit pas contredire les négations nominales avec değil et les existentiels avec yok.
- [bloquant] `examples[2].note` — Actuel « { text: "Biz yarın çalışmayacağız.", translation: "Nous ne travaillerons pas demain.", note: "me + y + acağız : y entre deux voyelles." } ». Proposé « { text: "Biz yarın çalışmayacağız.", translation: "Nous ne travaillerons pas demain.", note: "çalış + ma + y + acağız : y relie deux voyelles." } ». Il faut -ma après a, comme le montrent çalışmayacağız et l’exercice.
- [bloquant] `exercises[3].hint` — Actuel « pas, avec la terminaison ». Proposé « Négation de « être fatigué » au présent ». Yorgun değildim ou yorgun değilmişim sont grammaticaux sans temps imposé.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative. ». Proposé « Mets seulement le verbe à la forme négative. Garde le sujet et le lieu. ». L’ordre et le sujet explicite sont fixés pour éviter les reformulations refusées.
- [bloquant] `exercises[4].answers` — Actuel « ["Ayşe Ankara'ya gitmiyor.", "Ayşe Ankaraya gitmiyor."] ». Proposé « ["Ayşe Ankara'ya gitmiyor."] ». L’apostrophe du toponyme est obligatoire. [TDK — Kesme İşareti](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/)

## tr-a2-aorist

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « L’aoriste exprime les habitudes, les vérités générales et les offres polies (Çay içer misiniz, « voulez-vous du thé ? »). Après une voyelle, on ajoute -r… ». Proposé « L’aoriste exprime notamment les habitudes, les vérités générales et les offres polies : Çay içer misiniz? Après un radical qui finit par une voyelle, ajo… ». La longueur pertinente est celle du radical et la question turque prend un point d’interrogation. [Recherche sur l’aoriste](https://www.cambridge.org/core/journals/journal-of-child-language/article/analogy-is-indispensable-but-rule-is-a-must-insights-from-turkish/912D29ED283BDF0B1F31A8BF0690E5F8)
- [important] `rule[1]` — Actuel « Les autres verbes d’une syllabe prennent -er / -ar : yapar, içer, gider, bakar, yazar, kalkar. Terminaisons : -im, -sin, rien, -iz, -siniz, -ler / -lar :… ». Proposé « Les radicaux d’une syllabe prennent en général -ar ou -er : yapar, içer, gider. Treize formes courantes font exception : alır, bilir, bulur, durur, gelir… ». La règle précédente annonçait une liste implicite, mais six exceptions étaient omises. [Recherche sur l’aoriste](https://babel.ucsc.edu/~hank/jh.papers/Aorist.pdf)
- [important] `rule[2]` — Actuel « Le négatif est particulier : -mez / -maz, avec gelmem, gelmezsin, gelmez, gelmeyiz, gelmezsiniz, gelmezler. Piège : ne confonds pas avec le présent conti… ». Proposé « Au négatif, on trouve -maz ou -mez, avec des formes particulières pour « je » et « nous » : gelmem, gelmezsin, gelmez, gelmeyiz, gelmezsiniz, gelmezler. … ». Les emplois du présent en -iyor recoupent ceux de l’aoriste. Les formes négatives sans z des 1res personnes sont explicitées.
- [bloquant] `exercises[2].hint` — Actuel « kalkmak ». Proposé « kalkmak, à l’aoriste ». Her gün erken kalkıyor peut décrire une habitude.
- [bloquant] `exercises[3].hint` — Actuel « çalışmak ». Proposé « çalışmak, à l’aoriste ». Sabahları çok çalışıyorum est une réponse naturelle sans temps imposé.
- [bloquant] `exercises[3].explanation` — Actuel « Çalışmak a deux syllabes : -ır, puis -ım : çalışırım. ». Proposé « Le radical çalış a deux syllabes. Il prend -ır, puis la terminaison -ım : çalışırım. ». Çalışmak a trois syllabes. Le calcul se fait sur çalış.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative. ». Proposé « Mets seulement le verbe à l’aoriste négatif. Garde les autres mots à la même place. ». Évite les réécritures et les changements de temps admis par une négation sans restriction.

## tr-a2-ability

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Pour « pouvoir » ou « savoir », on insère -ebil / -abil entre le radical et le temps : gel + ebil + ir + im → gelebilirim (« je peux venir »), yap + abil… ». Proposé « Pour exprimer la capacité ou la possibilité, ajoute -ebil ou -abil au radical, avec y après une voyelle : gelebilirim (« Je peux venir »), okuyabilirim (… ». Introduit la forme -(y)Abil après une voyelle et le sens de possibilité.
- [important] `rule[1]` — Actuel « Le négatif n’est pas -ebilme-, mais -e / -a (avec y après une voyelle) suivi de -me : gelemem (« je ne peux pas venir »), yapamıyorum, okuyamadım. Ne con… ». Proposé « Pour exprimer l’impossibilité, ajoute -(y)a ou -(y)e suivi de la négation : gelemem, yapamıyorum, okuyamadım. Compare gelmem (« Je ne viens pas ») et gel… ». La formule doit distinguer l’incapacité de la possibilité d’un événement négatif, et préciser -ma/-me.
- [important] `rule[2]` — Actuel « La forme polie est un grand classique pour demander quelque chose : Pencereyi açabilir misiniz (« pouvez-vous ouvrir la fenêtre ? »). Piège : un Français… ». Proposé « Pour faire une demande polie, emploie souvent la forme de possibilité à l’aoriste avec la particule interrogative : Pencereyi açabilir misiniz? (« Pouvez… ». Donne le point d’interrogation à la phrase turque et précise la forme conjuguée.
- [bloquant] `exercises[2].hint` — Actuel « açmak (pouvoir) ». Proposé « açmak, possibilité à l’aoriste ». Açabiliyor misiniz? serait une question possible sur la capacité présente, mais ce n’est pas la demande attendue.
- [bloquant] `exercises[3].hint` — Actuel « yapmak (je ne peux pas) ». Proposé « yapmak, impossibilité à l’aoriste (je) ». Yapamıyorum convient naturellement à la consigne originale.
- [important] `exercises[4].instruction` — Actuel « Exprime la possibilité avec -ebil / -abil. ». Proposé « Ajoute la possibilité au verbe en gardant l’aoriste et le reste de la phrase. « Ben » est facultatif. ». Impose le temps et permet l’omission du sujet prévue dans answers.

## tr-b1-necessity

Décision : approuvé après correction.

- [important] `rule[1]` — Actuel « On peut aussi dire « il faut que » avec lazım ou gerek : le verbe prend -me et le suffixe possessif du sujet : gitmem lazım (« il faut que j’aille »), gi… ». Proposé « Avec lazım ou gerek (« il faut »), emploie un nom verbal en -ma ou -me avec un suffixe possessif qui indique la personne : gitmem lazım (« il faut que j’… ». La voyelle du nom verbal varie. Zorunda marque une contrainte sans présupposer une source externe.
- [important] `rule[2]` — Actuel « Piège : en français, « il faut que » appelle le subjonctif ; en turc, le verbe devient un nom d’action (gitme-) avec le suffixe du sujet. Pour le passé, … ». Proposé « Après « il faut que », le français emploie le subjonctif. Dans gitmem lazım, le turc indique le sujet avec le suffixe du nom verbal. Pour situer un devoi… ». La forme au passé admet deux lectures utiles et ne prend pas toujours littéralement -ydi après une consonne.
- [important] `exercises[1].prompt` — Actuel « Yarın erken kalkmam ___. ». Proposé « Yarın erken kalkmam ___. (Il faut que je me lève tôt demain.) ». Les mots için ou ile peuvent prolonger la phrase autrement. La traduction fixe la nécessité.
- [important] `exercises[2].hint` — Actuel « kalkmak ». Proposé « kalkmak, nom verbal pour « nous » ». Fixe la forme à suffixe possessif et écarte les périphrases.
- [bloquant] `exercises[3].hint` — Actuel « gitmek (devoir) ». Proposé « gitmek, avec -meli / -malı ». Gitmeniz lazım et gitmek zorundasınız étaient aussi corrects avec « devoir » seul.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative. ». Proposé « Mets seulement le verbe en -meli à la forme négative. Garde les autres mots au même endroit. ». Une paraphrase ou un autre ordre ne doit pas être évalué par cette réponse fermée.

## tr-b1-infinitive

Décision : approuvé après correction.

- [bloquant] `rule[1]` — Actuel « Avec d’autres verbes, il prend un cas, comme un nom : sevmek réclame l’accusatif -meyi / -mayı (le k devient y) : Yüzmeyi seviyorum. Başlamak réclame le … ». Proposé « Après sevmek, emploie le nom verbal en -me ou -ma à l’accusatif : Yüzmeyi seviyorum. Après başlamak, mets ce nom verbal au datif : Çalışmaya başladım. Le… ». Meyi et meye se forment sur le nom verbal en -me/-ma. Présenter k → y comme une alternance régulière est trompeur.
- [important] `rule[2]` — Actuel « Piège : le français met l’infinitif directement après le verbe (j’aime nager). En turc, la forme dépend du verbe principal. Retiens trois modèles : -mek … ». Proposé « En français, « j’aime nager » contient un infinitif nu. Retiens les trois constructions turques de cette fiche : gitmek istiyorum, yüzmeyi seviyorum et ç… ». Le français emploie aussi une préposition selon le verbe, par exemple « commencer à ».
- [important] `exercises[1].explanation` — Actuel « Sevmek demande l’accusatif : dinlemek devient dinlemeyi. ». Proposé « Avec sevmek, mets le nom verbal en -me à l’accusatif : dinle + me + yi donne dinlemeyi. ». La segmentation montre l’accusatif, sans transformation de k en y.
- [important] `exercises[3].hint` — Actuel « yüzmek + accusatif ». Proposé « yüzmek, nom verbal à l’accusatif ». Yüzmeyi est un nom verbal fléchi plutôt qu’un infinitif en -mek avec un suffixe ajouté directement.
- [important] `exercises[3].explanation` — Actuel « L’infinitif prend l’accusatif devant sevmek : yüzmek → yüzmeyi. ». Proposé « Yüz + me + yi donne yüzmeyi. Le complément de seviyorum est à l’accusatif. ». La segmentation doit correspondre à la règle corrigée.
- [important] `exercises[4].hint` — Actuel « kazanmak ». Proposé « Radical kazan-, à l’infinitif ». L’indice donne le radical plutôt que la réponse entière et impose la forme verbale attendue.

## tr-b1-ken

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le suffixe -ken (invariable, sans harmonie) veut dire « pendant que, quand ». Il se colle à l’aoriste, à un nom ou à un adjectif : yürür + ken → yürürken… ». Proposé « -Ken est invariable. On peut l’ajouter à un nom, à un adjectif ou à une base verbale, souvent à l’aoriste : yürürken (« en marchant »), çocukken (« quand… ». La construction existe aussi avec d’autres temps et avec iken séparé. [TDK — Ek-fiilin Yazılışı](https://tdk.gov.tr/icerik/yazim-kurallari/ek-fiilin-yazilisi/)
- [bloquant] `rule[1]` — Actuel « Le sujet est le même dans les deux propositions, et la personne ne se marque que sur le verbe principal : Yürürken müzik dinlerim. Le -ken lui-même ne po… ». Proposé « -Ken ne marque pas la personne. Les deux propositions peuvent partager le même sujet : Yürürken müzik dinlerim. Elles peuvent aussi avoir des sujets diff… ». Un sujet différent est possible et attesté. [Étude sur les converbes turcs](https://www.cambridge.org/core/journals/nordic-journal-of-linguistics/article/converbs-in-heritage-turkish-a-contrastive-approach/B43F943280026F821BF994806DE204F6)
- [important] `rule[2]` — Actuel « Piège : le français emploie un gérondif ou « quand, pendant que » avec une proposition conjuguée. Le turc n’a qu’un petit suffixe, sans conjonction. Pour… ». Proposé « En français, « en marchant » et « pendant que je marche » sont deux constructions distinctes. En turc, -ken peut convenir dans les deux cas. Le temps se … ». La comparaison doit montrer le rôle du contexte plutôt que nier l’existence de iken séparé.
- [bloquant] `exercises[3].hint` — Actuel « içmek, aoriste + -ken ». Proposé « içmek, aoriste suivi de -ken soudé ». İçer iken est permis par le TDK. Le suffixe soudé doit être demandé explicitement pour n’accepter qu’içerken.

## tr-b1-participles

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le turc n’a pas de pronom relatif (qui, que). La relative se place avant le nom et son verbe devient un participe. Pour le sujet (« qui »), on emploie -e… ». Proposé « Dans les relatives de cette fiche, le verbe prend une forme participiale et le groupe relatif précède le nom. Quand ce nom est le sujet du verbe de la re… ». Le cadre est celui des relatives participiales et évite une négation absolue d’autres constructions, notamment avec ki.
- [important] `rule[1]` — Actuel « Pour les autres cas (« que »), on emploie -dik (-dık, -dik, -duk, -dük, ou -t- après consonne sourde) avec le suffixe possessif du sujet de la relative :… ». Proposé « Quand le nom est, par exemple, l’objet du verbe, emploie souvent -dik et ses variantes, avec le possessif qui indique le sujet : aldığım kitap (« le livr… ». -Dik peut traduire le présent ou le passé. Il faut également signaler que l’objet n’épuise pas les emplois de la construction.
- [important] `rule[2]` — Actuel « Piège : l’ordre est inverse de celui du français : la relative entière précède le nom. Dün aldığım kitap = « hier acheté-mon livre ». Le sujet est facult… ». Proposé « Dans les relatives en -dik, le sujet exprimé prend le génitif : Ali'nin yazdığı mektup. Il peut être omis quand il est évident : Dün aldığım kitap (« le … ». L’ancienne règle n’expliquait pas le génitif malgré Ali'nin et Senin dans les exercices.
- [important] `exercises[0].prompt` — Actuel « Kapıda ___ adam benim arkadaşım. (qui attend) ». Proposé « Kapıda ___ adam benim arkadaşım. (qui attend en ce moment) ». Le présent explicite distingue bekleyen du participe futur bekleyecek.
- [important] `exercises[3].hint` — Actuel « çalışmak ». Proposé « çalışmak, participe sujet en -en / -an ». Çalışacak est aussi grammatical dans un contexte de travail futur.
- [important] `exercises[4].hint` — Actuel « yapmak ». Proposé « yapmak, participe en -dik avec « tu » ». La consigne fixe le participe et l’accord.

## tr-b1-conditional

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « La condition réelle se forme avec -se / -sa (deux voies) collé à l’aoriste, à un nom, à un adjectif ou à var / yok, suivi de la terminaison personnelle :… ». Proposé « Pour une condition réelle, ajoute -se ou -sa à l’aoriste : gelirsem (« si je viens »), gelirsen, gelirse, gelirsek, gelirseniz, gelirlerse. On peut aussi… ». Les formes adjectivales suivent aussi l’harmonie et prennent y après une voyelle. [TDK — Ek-fiilin Yazılışı](https://tdk.gov.tr/icerik/yazim-kurallari/ek-fiilin-yazilisi/)
- [important] `rule[1]` — Actuel « La proposition conditionnelle précède la principale, sans « si » séparé (eğer est facultatif) : Yağmur yağarsa evde kalırım (« s’il pleut, je reste à la … ». Proposé « La condition se place souvent avant la principale : Yağmur yağarsa evde kalırım (« S’il pleut, je reste à la maison »). Eğer (« si ») peut s’ajouter au d… ». L’ordre est fréquent, pas obligatoire, et eğer reste possible.
- [important] `rule[2]` — Actuel « Piège : en français, « si » est suivi du présent ; en turc, tout est dans le suffixe qui se colle au verbe, avec les mêmes terminaisons personnelles. N’a… ». Proposé « En français, « si » introduit la condition. En turc, le suffixe suffit souvent, même sans eğer. Écris la condition sans virgule immédiatement après le su… ». Cohérence avec eğer facultatif et avec la ponctuation normative. [TDK — Noktalama İşaretleri](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalari/)
- [bloquant] `exercises[2].prompt` — Actuel « Sen yarın ___, ben de gelirim. ». Proposé « Sen yarın ___ ben de gelirim. ». Le TDK proscrit la virgule immédiatement après le suffixe conditionnel. [TDK — Noktalama İşaretleri](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalari/)
- [bloquant] `exercises[2].hint` — Actuel « gelmek, si ». Proposé « gelmek, aoriste suivi du suffixe de condition ». Geliyorsan ou geleceksen peuvent aussi exprimer une condition selon le contexte.
- [bloquant] `exercises[3].hint` — Actuel « var, si ». Proposé « var, avec le suffixe de condition soudé ». Var ise est une variante standard si le suffixe soudé n’est pas imposé.
- [important] `exercises[4].instruction` — Actuel « Mets les deux verbes à la forme négative. ». Proposé « Mets seulement les deux verbes à la forme négative. Garde l’ordre et les pronoms. ». Une réorganisation comme Gelmezsen ben de gelmem respecte l’ancienne consigne.

## tr-b1-converbs

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le suffixe -ip (-ıp, -up, -üp) relie deux actions qui se suivent, comme « et puis » : eve gelip yemek yedim (« je suis rentré et j’ai mangé »). Seul le d… ». Proposé « -Ip, -ıp, -up ou -üp relie des actions. Il rend souvent « et puis », comme dans Eve gelip yemek yedim (« Je suis rentré et j’ai mangé »). Il peut aussi r… ». L’enchaînement n’implique pas toujours une succession. [Étude sur les converbes turcs](https://dergipark.org.tr/en/pub/belleten/article/746382)
- [important] `rule[2]` — Actuel « Piège : le français répète « et » et la conjugaison (je me suis levé et j’ai pris…). En turc, la chaîne a le même sujet du début à la fin, et le temps n’… ». Proposé « Dans les exemples de cette fiche, le même sujet fait les deux actions et le dernier verbe porte la terminaison de temps et de personne. En français, on p… ». La règle du sujet commun décrit les exercices. Une règle absolue serait trop large. [Étude sur les sujets dans les constructions en -ip](https://open.metu.edu.tr/handle/11511/118400)
- [bloquant] `exercises[2].hint` — Actuel « almak (et puis) ». Proposé « almak, avec le suffixe -ip et ses variantes ». Aldım ve respecte aussi le sens « et puis » si la forme n’est pas imposée.
- [bloquant] `exercises[3].hint` — Actuel « koşmak (en courant) ». Proposé « koşmak, avec -erek / -arak ». Koşa koşa traduit aussi « en courant ». L’exercice doit demander le suffixe étudié.
- [important] `exercises[4].instruction` — Actuel « Relie les deux phrases avec -ip. ». Proposé « Relie les deux phrases en mettant le premier verbe en -ip. Garde le reste dans le même ordre. ». Évite de refuser des réécritures libres que la consigne précédente permettait.

## Doutes

Les variations concernant les accords du pluriel, la graphie avec *iken* et les sujets distincts dans les propositions en *-ken* sont traitées dans les fiches concernées. Aucun point bloquant ne subsiste après les corrections proposées.

## Vérification

Les 105 passages sont exacts, uniques et sans chevauchement dans la source normalisée en LF. Leur application simulée conserve les 18 identifiants et les valeurs de `reviewedOn`. Les limites de taille, les types d’exercice, les choix, les trous et les réponses normalisées ont été vérifiés.

## Audit final

Dans `tr-b1-necessity`, le troisième exercice (`exercises[2]`) emploie Bizim, au génitif, avec le nom verbal possessif. La réponse kalkmamız et son explication sont conservées. Le total de 105 remplacements annoncé plus haut correspond à la relecture initiale. Le JSON contient 106 remplacements après cet ajout.
