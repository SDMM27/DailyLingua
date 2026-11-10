# Relecture grammaire — japonais — Codex (relecture complète)

## Synthèse

18 fiches et 72 exercices relus · 18 fiches approuvées après correction · 0 brouillon · 108 remplacements (30 bloquants, 78 importants, 0 mineurs)

La relecture porte sur le japonais standard contemporain. Les exercices visent les formes explicitement demandées, avec les graphies usuelles en kana, en kanji et mixtes. Les extraits abrégés renvoient au [fichier de correctifs](chatgpt-patch.json).

## ja-a1-desu

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Le verbe vient toujours en fin de phrase. « A est B » se dit AはBです : は (qui se lit wa dans ce rôle) marque le thème, ce dont… ». Proposé « "Dans la phrase simple, le prédicat se place généralement à la fin. Pour identifier, emploie AはBです. は marque le thème et se pr… ». Le modèle décrit l’ordre courant. L’absence de pluriel obligatoire n’exclut pas les expressions qui marquent le nombre.
- [important] `rule[1]` — Actuel « "Négation : AはBじゃありません (à l’écrit soigné, ではありません). Question : on ajoute か à la fin, sans changer l’ordre des mots : あなたは学生ですか… ». Proposé « "Pour nier, emploie じゃありません ou じゃないです. ではありません est une autre forme, plus formelle. Pour poser une question, ajoute か : 学生（がくせい… ». Ajoute une négation polie courante, conforme aux notes de la Fondation du Japon, et indique les lectures.
- [important] `rule[2]` — Actuel « "も remplace は pour dire « aussi » : わたしも学生です。 Piège : le sujet est souvent omis quand le contexte est clair, et on évite あなた (… ». Proposé « "も prend la place de は pour dire « aussi » : わたしも学生（がくせい）です。 Quand le contexte suffit, omets le sujet. Pour t’adresser à quelq… ». Fournit la lecture A1 et distingue l’omission du sujet du choix du terme d’adresse.
- [important] `examples[0].note` — Actuel « { text: "わたしはフランス人です。", translation: "Je suis français(e).", note: "人 (じん) après un nom de pays donne l’habitant : フランス人 (ふらんす… ». Proposé « { text: "わたしはフランス人です。", translation: "Je suis français(e).", note: "フランス人 フランスじん. 人 se lit じん après un nom de pays." }, ». La lecture en kana conserve l’écriture usuelle du nom de pays.
- [important] `examples[1]` — Actuel « { text: "田中さんは先生じゃありません。", translation: "Monsieur Tanaka n’est pas professeur.", note: "田中 たなか, 先生 せんせい. Négation polie : じゃあり… ». Proposé « { text: "たなかさんは先生じゃありません。", translation: "M. ou Mme Tanaka n’est pas professeur.", note: "先生 せんせい. じゃありません marque la négation… ». Le nom propre reste lisible en kana et さん ne détermine pas le genre.
- [important] `examples[2]` — Actuel « { text: "あなたも学生ですか。", translation: "Es-tu étudiant(e) toi aussi ?", note: "学生 がくせい. も remplace は ; か en fin de phrase fait la… ». Proposé « { text: "たなかさんも学生ですか。", translation: "Tanaka, êtes-vous aussi étudiant ou étudiante ?", note: "学生 がくせい. も remplace は. か marque… ». Le dialogue montre l’adresse par le nom que recommande la règle.
- [important] `exercises[2].prompt` — Actuel « prompt: "佐藤さんは会社員です。わたし___会社員です。（Moi aussi.）", ». Proposé « prompt: "さとうさんは学生です。わたし___学生です。（Moi aussi.）", ». Évite l’introduction de 会社員 et d’un nom propre en kanji dans un exercice qui cible も.
- [important] `exercises[2].explanation` — Actuel « explanation: "も remplace は pour dire « aussi » : わたしも会社員です。", ». Proposé « explanation: "も remplace は pour dire « aussi » : わたしも学生です。", ». Aligne l’explication sur la phrase révisée.
- [bloquant] `exercises[3].instruction` — Actuel « instruction: "Transforme la phrase en question.", ». Proposé « instruction: "Ajoute か pour poser une question polie en gardant le thème et le prédicat.", ». L’ancienne consigne permet aussi de poser une question par l’intonation seule.
- [important] `exercises[3].source` — Actuel « source: "山田さんは先生です。", ». Proposé « source: "やまださんは先生です。", ». Le nom propre reste accessible en kana. Les variantes en kanji sont acceptées.

[Fondation du Japon, Irodori, notes de grammaire](https://www.irodori.jpf.go.jp/assets/data/Grammar_all.pdf)

## ja-a1-no-kosoado

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Le japonais a trois distances et un mot interrogatif : こ (près de moi), そ (près de toi), あ (loin de nous deux), ど (lequel, où… ». Proposé « "Pour montrer, emploie こ près de toi, そ près de ton interlocuteur et あ loin de vous deux. ど sert à interroger. Choisis ensuite… ». La série ど comprend plusieurs interrogatifs, et le repère spatial est celui du locuteur.
- [important] `rule[2]` — Actuel « "の relie deux noms : A の B, « le B de A », dans l’ordre inverse du français : マリアのかばん (le sac de Marie). Il marque la possessi… ». Proposé « "AのB place le nom qui précise en premier : マリアのかばん (« le sac de Marie »), わたしの本（ほん） (« mon livre »), にほんごの先生（せんせい） (« professe… ». Indique la lecture de 本 et garde une écriture accessible en A1.
- [important] `examples[1]` — Actuel « { text: "あの人は日本語の先生です。", translation: "Cette personne-là est professeur de japonais.", note: "人 ひと, 日本語 にほんご, 先生 せんせい. あの + no… ». Proposé « { text: "あの人はにほんごの先生です。", translation: "Cette personne-là est professeur de japonais.", note: "人 ひと, 先生 せんせい. あの précède le no… ». Les kanji conservés ont une lecture. にほんご reste lisible au niveau A1.
- [important] `exercises[0].prompt` — Actuel « prompt: "___本は田中さんのです。（Ce livre que j’ai en main.）", ». Proposé « prompt: "___本はたなかさんのです。（Ce livre que j’ai en main.）", ». Évite une lecture supplémentaire de nom propre en A1.

## ja-a1-masu

Décision : approuvé après correction.

- [important] `rule[2]` — Actuel « "L’objet direct prend を (qui se lit o) : パンをたべます (je mange du pain). Piège : le verbe vient toujours en dernier, après tous le… ». Proposé « "L’objet direct prend を, prononcé comme お : パンをたべます (« Je mange du pain »). Dans l’ordre courant, le thème et les compléments… ». Donne l’ordre courant sans en faire une contrainte absolue, et utilise le kana pour la lecture.
- [bloquant] `exercises[2].hint` — Actuel « hint: "boire", ». Proposé « hint: "boire, forme polie en ます", ». Une forme neutre comme 飲む convient à l’ancienne consigne.
- [bloquant] `exercises[3].instruction` — Actuel « instruction: "Mets la phrase au négatif.", source: "パンをたべます。", ». Proposé « instruction: "Mets uniquement le verbe au négatif poli en ません.", source: "パンをたべます。", ». Cible ません plutôt que d’autres négations polies possibles.

## ja-a1-particles

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Les particules suivent le mot qu’elles marquent et font le travail de nos prépositions. に : moment précis (7じに おきます, je me lè… ». Proposé « "Les particules suivent le mot qu’elles marquent. に indique notamment une heure précise (しちじにおきます, « Je me lève à 7 h ») ou un… ». Présente les emplois utiles à la leçon et remplace la romanisation par un kana.
- [important] `rule[1]` — Actuel « "で : lieu où se déroule une action (うちでたべます, je mange à la maison) et moyen (バスでいきます, j’y vais en bus). と : « avec » (ともだちといきま… ». Proposé « "で indique notamment le lieu d’une action (うちでたべます) et le moyen (バスでいきます). と signifie « avec » (ともだちといきます) ou « et » entre deu… ». Sans indication de l’après-midi, ごじ ne signifie pas nécessairement 17 h.
- [bloquant] `rule[2]` — Actuel « "Piège : le français dit « à » partout, le japonais choisit selon le sens. Une action qui se passe quelque part prend で (うちで),… ». Proposé « "Pour une action qui se déroule quelque part, emploie en général で. Pour une destination, に ou へ conviennent avec いきます. に marq… ». L’ancienne règle rendait toutes les particules obligatoires, même quand le japonais oral ou un repère comme あした ne l’exige pas.
- [important] `table.rows[5]` — Actuel « ["から / まで", "depuis / jusqu’à", "9じからごじまで"], ». Proposé « ["から / まで", "de / jusqu’à", "くじからごごごじまで"], ». Le tableau indique explicitement l’heure de l’après-midi.
- [important] `exercises[2].explanation` — Actuel « explanation: "Le lieu où se déroule une action prend で : うちで. に serait réservé à l’existence ou à la destination.", ». Proposé « explanation: "Pour le lieu où l’on mange, emploie で : うちで。 に s’utilise dans d’autres constructions, par exemple pour une desti… ». に n’est pas limité aux deux emplois cités.

## ja-a1-adjectives

Décision : approuvé après correction.

- [important] `rule[1]` — Actuel « "Devant un nom, l’adjectif en い garde son い (たかい本), celui en な prend な (しずかなまち). En fin de phrase on ajoute です : このほんはたかいです, ま… ». Proposé « "Devant un nom, l’adjectif en い garde sa forme (たかい本（ほん）), et l’adjectif en な prend な (しずかなまち). En fin de phrase affirmative p… ». Ajoute la lecture de 本 et précise que です accompagne ici l’affirmation polie.
- [important] `rule[2]` — Actuel « "Négatif : い devient くないです (たかくないです) ; な devient じゃありません (しずかじゃありません). Piège : on ne dit jamais ✗ たかいじゃありません. Exception : いい (… ». Proposé « "Pour nier un adjectif en い, remplace い par くないです ou くありません : たかくないです, たかくありません. Pour un adjectif en な, ajoute じゃないです ou じゃありま… ». Présente les variantes polies effectivement admises et évite de traiter な comme une terminaison présente devant la négation.
- [important] `examples[1]` — Actuel « { text: "ここはきれいな町です。", translation: "C’est une jolie ville, ici.", note: "町 まち. きれい est en な : きれいな + nom." }, ». Proposé « { text: "ここはきれいなまちです。", translation: "C’est une jolie ville, ici.", note: "きれい appartient au groupe en な. Devant まち, écris きれい… ». L’écriture en kana correspond au niveau de la fiche.
- [important] `examples[2]` — Actuel « { text: "あの店は高くないです。", translation: "Ce magasin n’est pas cher.", note: "店 みせ, 高 たか. 高い → 高くないです : い devient くない." }, ». Proposé « { text: "あのみせはたかくないです。", translation: "Ce magasin n’est pas cher.", note: "たかい → たかくないです. La négation change la fin de l’adjec… ». Évite une accumulation de kanji dans un exemple A1.
- [bloquant] `exercises[0].options` — Actuel « options: ["やすいくないです", "やすくないです", "やすじゃありません"], ». Proposé « options: ["たかいくないです", "たかくないです", "たかいじゃありません"], ». やすくない veut dire « pas bon marché », alors que le sens demandé est « pas cher » (たかくない).
- [important] `exercises[0].explanation` — Actuel « explanation: "やすい est un adjectif en い : le négatif poli est やすくないです. じゃありません est réservé aux adjectifs en な.", ». Proposé « explanation: "たかい signifie ici « cher ». Il perd い et prend くないです pour dire « n’est pas cher ».", ». Corrige le sens de l’adjectif et la formation.
- [important] `exercises[2].explanation` — Actuel « explanation: "Un adjectif en い garde son い devant le nom : あたらしい車.", ». Proposé « explanation: "Un adjectif en い garde sa forme devant le nom : あたらしいくるま。", ». Reste cohérent avec l’écriture du prompt A1.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["このパンはおいしくないです。", "このパンはおいしくありません。"], ». Proposé « answers: ["このパンはおいしくないです。", "このパンはおいしくありません。", "このパンは美味しくないです。", "このパンは美味しくありません。"], ». La graphie 美味しい est usuelle et les deux négations polies restent admises.

[Fondation du Japon, Irodori, négation des adjectifs](https://www.irodori.jpf.go.jp/assets/data/Grammar_all.pdf)

## ja-a1-aru-iru

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Le français a un seul « il y a » ; le japonais a deux verbes. います s’emploie pour les êtres animés (personnes, animaux), あります… ». Proposé « "Pour situer une personne ou un animal, emploie います. Pour une chose, une plante ou un événement, emploie généralement あります. Ai… ». Présente les emplois d’existence de cette fiche sans étendre la règle à tous les contextes de possession.
- [bloquant] `exercises[3].instruction` — Actuel « instruction: "Mets la phrase au négatif.", source: "うちにねこがいます。", ». Proposé « instruction: "Nie la présence du chat avec いません. Garde le lieu en tête et utilise が ou は pour le chat.", source: "うちにねこがいます。", ». Sans précision, いないです ou la mise en thème du chat en tête sont aussi possibles.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["うちにねこがいません。", "うちにねこはいません。"], ». Proposé « answers: ["うちにねこがいません。", "うちにねこはいません。", "うちに猫がいません。", "うちに猫はいません。", "家にねこがいません。", "家にねこはいません。", "家に猫がいません。", "家に猫はいません。"], ». Accepte les graphies en kana, kanji et mixtes.

## ja-a2-masu-past

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Verbes : ます devient ました (passé) et ません devient ませんでした (passé négatif) : きのうえいがをみました (hier, j’ai vu un film), なにもたべませんでした (je… ». Proposé « "Pour un verbe au passé poli, remplace ます par ました, ou ません par ませんでした : きのうえいがをみました (« Hier, j’ai vu un film »), なにもたべませんでした («… ». Le français peut traduire le passé par un imparfait habituel. Le progressif passé mérite sa forme distincte.
- [important] `rule[2]` — Actuel « "Adjectifs en い : い devient かったです (たかかったです) et くないです devient くなかったです. Piège : le passé est dans l’adjectif lui-même, pas dans… ». Proposé « "Pour les adjectifs en い, remplace い par かったです au passé affirmatif, et くないです par くなかったです au négatif. On dit aussi くありませんでした. E… ». Ajoute la variante polie attestée au négatif.
- [important] `examples[0].note` — Actuel « { text: "きのう友だちと映画を見ました。", translation: "Hier, j’ai vu un film avec un ami.", note: "友 とも, 映画 えいが, 見 み. 見ます → 見ました." }, ». Proposé « { text: "きのう友だちと映画を見ました。", translation: "Hier, j’ai vu un film avec un ami.", note: "友だち ともだち, 映画 えいが, 見ます みます. 見ました est au pa… ». Donne la lecture des mots plutôt que des fragments.
- [important] `exercises[3].instruction` — Actuel « instruction: "Mets la phrase au passé.", ». Proposé « instruction: "Mets uniquement le verbe au passé poli en ました.", ». Précise la forme voulue. Un passé d’habitude en ていました serait aussi naturel sans cette précision.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["まいあさコーヒーをのみました。", "毎朝コーヒーを飲みました。", "毎朝コーヒーをのみました。"], ». Proposé « answers: ["まいあさコーヒーをのみました。", "まいあさコーヒーを飲みました。", "毎朝コーヒーをのみました。", "毎朝コーヒーを飲みました。"], ». La graphie mixte まいあさコーヒーを飲みました était refusée.

## ja-a2-counters

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « "Nombres : いち 1, に 2, さん 3, し / よん 4, ご 5, ろく 6, しち / なな 7, はち 8, きゅう 9, じゅう 10. Puis 20 = にじゅう, 100 = ひゃく, 1000 = せん, 10 000… ». Proposé « "De 1 à 10 : いち, に, さん, よん / し, ご, ろく, なな / しち, はち, きゅう, じゅう. Puis にじゅう (20), ひゃく (100), せん (1 000), いちまん (10 000). まん est l’u… ». 10 000 se prononce いちまん quand on donne le nombre entier.
- [important] `rule[1]` — Actuel « "On ne compte pas un nom nu : on ajoute un compteur choisi d’après la forme de ce qu’on compte. つ pour les objets en général (… ». Proposé « "Quand tu comptes des personnes ou des objets, choisis un compteur adapté. つ sert à compter beaucoup de choses (ひとつ, ふたつ, jusq… ». Les compteurs expriment des catégories d’usage, parfois au-delà de la forme de l’objet.
- [important] `rule[2]` — Actuel « "Place : Nを + quantité + verbe : りんごをみっつかいました (j’ai acheté trois pommes). Le nom reste invariable. Piège : le son du compteur… ». Proposé « "Tu peux mettre la quantité après le groupe objet : りんごをみっつかいました (« J’ai acheté trois pommes »). On peut aussi dire みっつのりんご. L… ». Il existe notamment une construction avec の, et tous les compteurs ne changent pas de son.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["さんびゃく", "三百"], ». Proposé « answers: ["さんびゃく", "三百", "300", "３００", "三〇〇"], ». Les chiffres et les différentes graphies de 300 conviennent aussi dans cette phrase.
- [important] `exercises[3].explanation` — Actuel « explanation: "300 se dit さんびゃく (三百) : le h de ひゃく devient b après さん.", ». Proposé « explanation: "300 se dit さんびゃく (三百). Dans ce nombre, ひゃく se prononce びゃく.", ». La lecture est indiquée directement en kana.

## ja-a2-te-form

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Il y a trois groupes. Groupe 1 : verbes en -u comme かく, のむ, まつ, かう ; la fin change selon la dernière syllabe (voir le tableau… ». Proposé « "Groupe 1 : la fin change selon le dernier kana, comme かく → かいて ou のむ → のんで (voir le tableau). Groupe 2 : retire る et ajoute て… ». Les trois groupes se distinguent par leurs changements, sans transformer la finale en règle suffisante.
- [important] `rule[2]` — Actuel « "Piège : on apprend la forme en て avec chaque verbe, car elle sert de base à beaucoup de structures (ている, てもいい, てから…). Ne conf… ». Proposé « "La forme en て sert aussi de base à ている, てもいい et てから. Certains verbes en る suivent le groupe 1. Compare たべる → たべて et かえる (« re… ». Les verbes en る se répartissent entre deux groupes, même avec des finales similaires.

## ja-a2-te-iru

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « "V て + います exprime une action en cours (いまごはんをたべています : je suis en train de manger) et aussi un état résultant ou durable (とうきょ… ». Proposé « "V て + います peut exprimer une action en cours : いまごはんをたべています (« Je suis en train de manger »). Selon le verbe, il décrit aussi… ». すみます est une forme possible selon le contexte, tandis que すんでいます décrit le lieu de vie actuel.
- [important] `exercises[0].prompt` — Actuel « prompt: "いまテレビを___。（Je regarde la télé en ce moment.）", ». Proposé « prompt: "いまテレビを___。（Je suis en train de regarder la télé.）", ». La traduction exprime le déroulement en cours et exclut l’annonce « je vais la regarder maintenant ».
- [important] `exercises[3].instruction` — Actuel « instruction: "Demande la permission (V てもいいですか).", ». Proposé « instruction: "Demande la permission avec てもいいですか en gardant ここに.", ». Conserve le lieu dans la réponse et cible le modèle.

## ja-a2-tai-hoshii

Décision : approuvé après correction.

- [bloquant] `rule[1]` — Actuel « "Vouloir une chose : N が ほしいです (あたらしいくるまがほしいです). ほしい est un adjectif en い et son objet prend が, jamais を. Piège : たい et ほしい dé… ». Proposé « "Pour dire que tu veux une chose, emploie N が ほしいです. Pour demander ce que l’autre veut faire, dis なにがたべたいですか。 En parlant direc… ». たい et ほしい peuvent faire référence à un tiers, notamment dans une citation ou selon le point de vue.
- [important] `rule[2]` — Actuel « "Inviter : V ませんか (« ne voudrais-tu pas… ? ») et accepter : V ましょう (« faisons-le »). いっしょにたべませんか。— ええ、たべましょう。 Tous deux sont f… ». Proposé « "Propose une activité avec la base de ます suivie de ませんか : いっしょにたべませんか。 Tu peux aussi proposer ou accepter avec ましょう : ええ、たべましょ… ». ましょう s’emploie également pour proposer.
- [important] `examples[0].note` — Actuel « { text: "日本へ行きたいです。", translation: "Je veux aller au Japon.", note: "日本 にほん, 行 い. 行きます → 行きたい。" }, ». Proposé « { text: "日本へ行きたいです。", translation: "Je veux aller au Japon.", note: "日本 にほん, 行きます いきます. Enlève ます et ajoute たいです." }, ». Donne la forme et la lecture complètes.
- [bloquant] `exercises[2].hint` — Actuel « hint: "いく", ». Proposé « hint: "いく, négation polie en たい", ». La forme neutre ou une reformulation du désir sont possibles sous l’ancienne consigne.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["いっしょにえいがをみませんか。", "いっしょに映画を見ませんか。"], ». Proposé « answers: ["いっしょにえいがをみませんか。", "いっしょにえいがを見ませんか。", "いっしょにえいがを観ませんか。", "いっしょに映画をみませんか。", "いっしょに映画を見ませんか。", "いっしょに映画を観ませんか。", "一緒にえ… ». Les graphies mixtes et 観る pour un film sont légitimes.

[Université des études étrangères de Tokyo, N がほしいです](https://www.coelang.tufs.ac.jp/mt/ja/gmod/courses/c02/lesson33/step3/explanation/069.html)

## ja-a2-plain-forms

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Entre amis et en famille, on emploie le style simple. La forme du dictionnaire (たべる, のむ, いく, する, くる) remplace ます au présent :… ». Proposé « "Entre amis et en famille, on emploie souvent la forme neutre. Pour un verbe au non-passé affirmatif, elle correspond à la for… ». La forme du dictionnaire peut exprimer le futur, et les formes neutres ne se limitent pas au registre familier.
- [important] `rule[1]` — Actuel « "Négatif : groupe 2 : る → ない (たべる → たべない) ; groupe 1 : dernière syllabe en -a + ない (のむ → のまない, いく → いかない, かう → かわない) ; する → しな… ». Proposé « "Négatif : dans le groupe 2, る devient ない (たべない). Dans le groupe 1, passe à la ligne en あ avant ない (のまない, いかない), avec う → わ (か… ». Ajoute l’exception fréquente ある et explicite la règle de う.
- [important] `rule[2]` — Actuel « "Pour です, le style simple dit だ, じゃない, だった, じゃなかった. Les adjectifs en い sont déjà simples : たかい, たかくない, たかかった. Piège : le style… ». Proposé « "Pour un nom ou un adjectif en な, les formes neutres comprennent だ, じゃない, だった et じゃなかった. Dans la conversation, だ s’omet parfoi… ». La forme neutre affirmative en だ n’est pas obligatoire dans toute conversation.
- [important] `examples[1].note` — Actuel « { text: "きのうの映画、おもしろかった。", translation: "Le film d’hier était bien.", note: "映画 えいが. Passé simple d’un adjectif en い : おもしろかった… ». Proposé « { text: "きのうの映画、おもしろかった。", translation: "Le film d’hier était bien.", note: "映画 えいが. おもしろかった est le passé neutre d’un adjectif… ». Évite la confusion avec le passé simple français.
- [important] `exercises[1].prompt` — Actuel « prompt: "Passé simple de いく : ___", ». Proposé « prompt: "Passé à la forme neutre de いく : ___", ». Le passé simple français est un temps distinct.
- [important] `exercises[3].instruction` — Actuel « instruction: "Mets la phrase au style simple.", ». Proposé « instruction: "Remplace uniquement la fin polie par le verbe à la forme du dictionnaire.", ». Délimite le changement grammatical attendu.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["あしたえいがをみる。", "明日映画を見る。", "あした映画を見る。", "あしたえいがを見る。"], ». Proposé « answers: ["あしたえいがをみる。", "あしたえいがを見る。", "あしたえいがを観る。", "あした映画をみる。", "あした映画を見る。", "あした映画を観る。", "明日えいがをみる。", "明日えいがを見る。", "明日えいがを観る… ». Accepte toutes les combinaisons de graphies usuelles pour ces mots.

[Université des études étrangères de Tokyo, formes neutre et polie](https://www.coelang.tufs.ac.jp/ja/zt/gmod/contents/explanation/042.html)

## ja-b1-potential

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Deux façons de dire « pouvoir ». Neutre et écrite : forme du dictionnaire + ことができます (にほんごをはなすことができます). Forme potentielle : gr… ». Proposé « "Pour dire « pouvoir », tu peux employer le verbe du dictionnaire suivi de ことができます, ou conjuguer le verbe au potentiel. Groupe… ». Évite de réserver ことができます à l’écrit et exprime la formation en kana.
- [important] `rule[1]` — Actuel « "Le verbe potentiel est un verbe du groupe 2 et se conjugue comme tel : かけません (je ne peux pas écrire), かけました (j’ai pu écrire).… ». Proposé « "Les formes potentielles se conjuguent comme celles du groupe 2 : かけます, かけません, かけました. Pour l’élément sur lequel porte l’action… ». を se rencontre aussi hors de l’oral. L’alternance est présentée dans un contexte précis.
- [important] `rule[2]` — Actuel « "Piège : « voir » et « entendre » ont leur propre verbe pour une perception qui s’impose : やまがみえます (la montagne est visible),… ». Proposé « "Pour une perception qui se produit, emploie par exemple やまがみえます (« On voit la montagne ») ou おとがきこえます (« On entend un bruit »… ». La possibilité de voir peut aussi se traduire par 見られます, selon le sens.
- [important] `exercises[0].explanation` — Actuel « explanation: "Groupe 1 : のむ devient のめる (u → eru).", ». Proposé « explanation: "Dans le groupe 1, passe à la ligne en え (む → め) et ajoute る : のめる。", ». Remplace la translittération par des kana.
- [bloquant] `exercises[2].hint` — Actuel « hint: "ひく", ». Proposé « hint: "ひく, au potentiel poli en ます", ». La construction avec ことができます répondrait aussi à l’ancienne consigne.
- [important] `exercises[3].instruction` — Actuel « instruction: "Mets le verbe à la forme potentielle (poli).", ». Proposé « instruction: "Conjugue le verbe au potentiel poli. Pour son complément, garde を ou emploie が.", ». Distingue le potentiel conjugué de ことができます et indique les deux particules admises.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["ひらがながかけます。", "ひらがなをかけます。", "ひらがなが書けます。", "ひらがなを書けます。"], ». Proposé « answers: ["ひらがながかけます。", "ひらがなが書けます。", "ひらがなをかけます。", "ひらがなを書けます。", "平仮名がかけます。", "平仮名が書けます。", "平仮名をかけます。", "平仮名を書けます。"], ». Accepte la graphie standard 平仮名 et les combinaisons mixtes.

[Université des études étrangères de Tokyo, particules de cas](https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/053.html) · [Institut national de la langue japonaise, formes potentielles avec et sans ら](https://kotoba.ninjal.ac.jp/qa/yokuaru/qa-129/)

## ja-b1-giving-receiving

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Là où le français dit « donner », le japonais a trois verbes qui dépendent du point de vue. あげる : je donne à un autre ; くれる :… ». Proposé « "Choisis le verbe selon le point de vue. Avec あげる, on présente le don du côté de celui qui donne à quelqu’un d’autre. Avec くれる… ». あげる et もらう ne se limitent pas au sujet « je ».
- [important] `rule[2]` — Actuel « "Après une forme en て, ces verbes disent un service rendu : てあげる (je fais pour quelqu’un), てくれる (quelqu’un fait pour moi), てもら… ». Proposé « "Après une forme en て, ces verbes présentent une action comme un service : てあげる (faire pour quelqu’un), てくれる (recevoir ce serv… ». Les formes de respect s’emploient selon le rôle du tiers. てさしあげる n’est pas une formulation à conseiller par défaut devant un supérieur.
- [important] `exercises[2].prompt` — Actuel « prompt: "先生がおしえて___。（Le professeur m’a enseigné.）", ». Proposé « prompt: "先生がおしえて___。（Le professeur m’a expliqué.）", ». En français, « m’a expliqué » fonctionne dans un contexte où le contenu est implicite.
- [bloquant] `exercises[2].hint` — Actuel « answers: ["くれました"], ». Proposé « hint: "Auxiliaire くれる, au passé poli", answers: ["くれました"], ». L’ancienne consigne permet aussi くださいました en registre honorifique.
- [important] `exercises[3].instruction` — Actuel « instruction: "Redis la phrase avec もらう (sujet : moi).", ». Proposé « instruction: "Redis la phrase au passé poli avec もらう. Place « moi » en thème au début, ou laisse-le implicite.", ». Fixe le rôle et la position de la personne qui reçoit.
- [bloquant] `exercises[3].answers` — Actuel « answers: [ "わたしはともだちにほんをもらいました。", "わたしはともだちからほんをもらいました。", "ともだちにほんをもらいました。", "ともだちからほんをもらいました。", "私は友だちに本をもらいました。", "私は友だちから本を… ». Proposé « answers: ["わたしはともだちにほんをもらいました。", "わたしはともだちに本をもらいました。", "わたしはともだちからほんをもらいました。", "わたしはともだちから本をもらいました。", "わたしは友だちにほんをもらいました。", "わ… ». Accepte toutes les combinaisons de graphies usuelles, に et から, et le sujet facultatif.

[Université des études étrangères de Tokyo, donner et recevoir](https://www.coelang.tufs.ac.jp/modules/ja/gmod/contents/explanation/085.html) · [Services rendus avec la forme en て](https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/086.html)

## ja-b1-conditionals

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Quatre formes, qui se recoupent en partie. ～と : conséquence naturelle ou automatique, après la forme du dictionnaire (はるになるとあ… ». Proposé « "Ces quatre formes conditionnelles se recoupent. Avec と, la suite est souvent régulière ou automatique : はるになるとあたたかくなります (« Au… ». と ne se limite pas aux mécanismes automatiques. La formation de たら vaut aussi pour だら après une forme en だ.
- [important] `rule[1]` — Actuel « "～ば : condition générale ou souhaitée. Groupe 1 : -u → -eba (のむ → のめば) ; groupe 2 : る → れば (たべれば) ; adjectif en い : い → ければ (や… ». Proposé « "Pour former ば, passe à la ligne en え et ajoute ば dans le groupe 1 (のめば). Dans le groupe 2, remplace る par れば (たべれば). Avec un… ». なら pose aussi une hypothèse qui ne reprend pas directement les paroles de l’interlocuteur.
- [bloquant] `rule[2]` — Actuel « "Piège : avec と, la seconde partie ne peut pas exprimer une demande, un souhait ni une invitation : ✗ ひまだとあそびにきてください. Dans ce… ». Proposé « "Pour une demande ou une invitation après une condition, たら est souvent le choix le plus simple : ひまだったら、あそびにきてください。 と ne conv… ». ば ne remplace pas librement と devant une demande. La possibilité dépend du type de condition.
- [important] `table.rows[1]` — Actuel « ["たら", "forme en た + ら", "いったら"], ». Proposé « ["たら", "passé neutre + ら", "いったら, のんだら"], ». Inclut une forme en だら et aligne la terminologie sur la règle.
- [important] `table.rows[2]` — Actuel « ["ば", "-eba / ければ", "のめば, やすければ"], ». Proposé « ["ば", "conditionnel du verbe / ければ", "のめば, やすければ"], ». Présente les terminaisons en kana.
- [important] `exercises[0].explanation` — Actuel « explanation: "Une demande après la condition exclut と ; ひまだったら convient. だから signifierait « puisque c’est ainsi ».", ». Proposé « explanation: "Pour « si tu es libre », ひまだったら convient avant cette invitation. ひまだから signifierait « puisque tu es libre ».", ». だから introduirait la cause avec le nom ou l’adjectif en な.
- [important] `exercises[1].options` — Actuel « options: ["たかいば", "たかくば", "たかければ"], ». Proposé « options: ["たかいば", "たかかったば", "たかければ"], ». Écarte une forme en くば qu’on rencontre dans le registre littéraire.
- [important] `exercises[3].instruction` — Actuel « instruction: "Reformule avec ～たら.", ». Proposé « instruction: "Remplace seulement la condition en ば par la forme en たら. Garde le reste de la phrase.", ». Délimite le changement attendu et n’exclut pas la ponctuation facultative.
- [bloquant] `exercises[3].answers` — Actuel « answers: [ "おかねがあったらくるまをかいます。", "おかねがあったら、くるまをかいます。", "お金があったら車を買います。", "お金があったら、車を買います。", "おかねがあったら車を買います。", "お金があったらくるまをかいます… ». Proposé « answers: ["おかねがあったらくるまをかいます。", "おかねがあったらくるまを買います。", "おかねがあったら車をかいます。", "おかねがあったら車を買います。", "おかねがあったら、くるまをかいます。", "おかねがあったら、くるまを… ». Les trois mots s’écrivent en kana ou en kanji indépendamment. La virgule est facultative.

[Université des études étrangères de Tokyo, と・ば・たら・なら](https://www.coelang.tufs.ac.jp/mt/ja/gmod/courses/c02/lesson42/step1/explanation/083.html) · [Étude sur ば et les expressions de volonté](https://cir.nii.ac.jp/crid/1390853649812593792)

## ja-b1-kara-node

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "A から B : « A, donc B » ou « B parce que A ». La raison vient d’abord en japonais : つかれたから、はやくねます (je suis fatigué, alors je m… ». Proposé « "A から B présente une raison avant sa conséquence : つかれたから、はやくねます (« Je suis fatigué, donc je me couche tôt »). から peut suivre… ». L’ordre raison puis conséquence est celui de la construction montrée, sans en faire une règle pour toute phrase.
- [bloquant] `rule[1]` — Actuel « "A ので B : même sens, mais plus doux et plus objectif, courant en politesse ou pour s’excuser (あめなのでいきません). Avant ので on met la… ». Proposé « "ので introduit aussi une raison, souvent de façon moins directe que から. Après un nom ou un adjectif en な à la forme neutre affi… ». ですので est possible et ので convient avant une demande polie.
- [important] `table.rows[1]` — Actuel « ["ので", "parce que (doux)", "forme simple ; な devant nom"], ». Proposé « ["ので", "parce que", "neutre ou poli, p. ex. びょうきなので"], ». Présente なので après le nom, et non « な devant nom ».
- [important] `table.rows[2]` — Actuel « ["のに", "alors que", "forme simple ; な devant nom"], ». Proposé « ["のに", "alors que", "neutre, p. ex. びょうきなのに"], ». Présente la construction correcte après le nom.
- [important] `examples[2].translation` — Actuel « { text: "練習したのに、うまくできませんでした。", translation: "J’ai pratiqué, et pourtant je n’y suis pas arrivé.", note: "練習 れんしゅう. のに : surpri… ». Proposé « { text: "練習したのに、うまくできませんでした。", translation: "Je me suis entraîné, et pourtant je n’y suis pas arrivé.", note: "練習 れんしゅう. のに in… ». Le français « je me suis entraîné » rend naturellement 練習した.
- [important] `exercises[1].prompt` — Actuel « prompt: "病気___、会社を休みました。（Comme je suis malade, je me suis absenté du travail.）", ». Proposé « prompt: "病気___、会社を休みました。（Étant malade, je me suis absenté du travail.）", ». La traduction évite de suggérer une opposition de temps inexistante.
- [important] `exercises[1].explanation` — Actuel « explanation: "Après un nom, ので devient なので : 病気なので.", ». Proposé « explanation: "Après le nom 病気, ajoute な devant ので à la forme neutre affirmative : 病気なので。", ». La structure est nom + な + ので.
- [important] `exercises[2].prompt` — Actuel « prompt: "毎日練習した___、まだじょうずになりません。（Je m’entraîne tous les jours et pourtant je ne m’améliore pas.）", ». Proposé « prompt: "毎日練習している___、なかなかじょうずになりません。（Je m’entraîne tous les jours et pourtant je ne progresse guère.）", ». La forme en ている décrit l’habitude qui continue. なかなか précise le sens de la négation.
- [bloquant] `exercises[2].hint` — Actuel « answers: ["のに", "けど", "けれど", "けれども"], ». Proposé « hint: "Un connecteur d’opposition du tableau", answers: ["のに", "が", "けど", "けれど", "けれども"], ». Délimite les connecteurs testés et accepte が. La famille de けど inclut les deux formes développées.
- [important] `exercises[2].explanation` — Actuel « explanation: "のに exprime la surprise ou le regret ; けど (けれど) marque une opposition plus neutre.", ». Proposé « explanation: "のに souligne le résultat inattendu. が, けど, けれど et けれども peuvent exprimer une opposition plus neutre.", ». L’explication couvre toutes les formes acceptées.
- [important] `exercises[3].instruction` — Actuel « instruction: "Reformule avec ので.", ». Proposé « instruction: "Remplace seulement から par ので. Garde l’adjectif à la forme neutre.", ». 寒いですので est possible si le registre de la subordonnée reste libre.
- [bloquant] `exercises[3].answers` — Actuel « answers: [ "さむいので、まどをしめます。", "さむいのでまどをしめます。", "寒いので、窓をしめます。", "寒いので窓をしめます。", "寒いので、窓を閉めます。", "寒いので窓を閉めます。", ], ». Proposé « answers: ["さむいので、まどをしめます。", "さむいので、まどを閉めます。", "さむいので、窓をしめます。", "さむいので、窓を閉めます。", "さむいのでまどをしめます。", "さむいのでまどを閉めます。", "さむいので窓をしめます… ». Accepte toutes les graphies usuelles mixtes et la virgule facultative.

[Agence japonaise de gestion des incendies, exemple de demande après ので](https://www.fdma.go.jp/singi_kento/kento/items/kento207_67_sankou3.pdf)

## ja-b1-quotation

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « "と marque le contenu d’une pensée ou d’une parole ; devant lui, la proposition est à la forme simple (jamais ます). Opinion : あし… ». Proposé « "と introduit le contenu de la pensée ou de la parole. Pour rapporter indirectement, utilise normalement la forme neutre : あしたは… ». Une citation directe peut conserver ます. La règle distingue les deux constructions.
- [important] `rule[1]` — Actuel « "Piège n° 1 : il n’y a pas de concordance des temps ; la phrase citée garde le temps de la phrase d’origine. Piège n° 2 : un n… ». Proposé « "Dans くるといいました, la venue reste au non-passé et いいました situe la parole dans le passé. Un nom ou un adjectif en な à l’affirmatif… ». La règle de だ ne s’étend ni au passé ni au négatif.
- [important] `rule[2]` — Actuel « "Négation : elle porte sur la phrase citée (あしたはこないとおもいます : je pense qu’il ne viendra pas). Pour demander l’avis de quelqu’un… ». Proposé « "Tu peux nier ce que tu penses : あしたはこないとおもいます (« Je pense qu’il ne viendra pas »). Pour une citation directe, conserve les mo… ». La négation peut aussi porter sur le verbe d’opinion. L’exemple illustre la négation du contenu.
- [bloquant] `exercises[1].options` — Actuel « options: ["学生と", "学生だと", "学生なと"], ». Proposé « options: ["学生のと", "学生だと", "学生なと"], ». Évite 学生と思います, que l’on peut rencontrer avec la copule omise.
- [bloquant] `exercises[2].explanation` — Actuel « explanation: "La phrase citée est à la forme simple : くる (来る), non くます.", ». Proposé « explanation: "Dans cette citation indirecte, emploie la forme neutre non passée くる (来る). Sa forme polie est きます.", ». Corrige la référence erronée à くます.
- [important] `exercises[3].instruction` — Actuel « instruction: "Donne ton opinion avec ～と思います.", ». Proposé « instruction: "Remplace la fin en です par la construction avec と思います. Garde le contenu de la phrase.", ». Impose le modèle sans paraphrase du contenu.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["この本はおもしろいと思います。", "このほんはおもしろいとおもいます。", "この本はおもしろいとおもいます。", "このほんはおもしろいと思います。"], ». Proposé « answers: ["このほんはおもしろいとおもいます。", "このほんはおもしろいと思います。", "このほんは面白いとおもいます。", "このほんは面白いと思います。", "この本はおもしろいとおもいます。", "この本はおもしろいと思います。",… ». Ajoute 面白い et toutes les combinaisons usuelles.

[Université des études étrangères de Tokyo, ～と思います](https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents/explanation/077.html)

## ja-b1-relative-clauses

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « "Le japonais n’a ni « qui » ni « que » ni « dont » : la proposition qui décrit le nom se place avant lui, avec le verbe à la f… ». Proposé « "Pour décrire un nom par une proposition, place la proposition à la forme neutre juste avant lui. Le japonais n’a pas besoin d… ». Le japonais possède d’autres emplois de « qui » et « que ». L’absence porte sur le pronom relatif dans cette construction.
- [important] `rule[1]` — Actuel « "Dans la relative, le sujet prend が (ou の), pas は : わたしがかったほん. Le verbe est au présent (たべるひと), au passé (たべたひと) ou au négatif… ». Proposé « "Dans les relatives de cette fiche, marque le sujet avec が (わたしがかったほん). の est aussi possible dans certaines relatives. Le verb… ». La substitution de が par の dépend de la structure de la relative.
- [important] `table.rows[0]` — Actuel « ["ひとがほんをよみます", "ほんをよむひと", "la personne qui lit"], ». Proposé « ["ひとがほんをよみます", "ほんをよむひと", "la personne qui lit un livre"], ». La traduction conserve l’objet ほん.
- [important] `exercises[1].prompt` — Actuel « prompt: "わたし___すきなりょうりはカレーです。（Le plat que j’aime est le curry.）", ». Proposé « prompt: "これはわたし___すきなりょうりです。（C’est un plat que j’aime.）", ». La nouvelle phrase place clairement le sujet dans la relative et évite une interprétation en double thème.
- [bloquant] `exercises[1].options` — Actuel « options: ["は", "が", "を"], ». Proposé « options: ["に", "が", "を"], ». は pouvait être interprété comme le thème contrastif de l’ancienne phrase entière.
- [important] `exercises[1].explanation` — Actuel « explanation: "Dans une relative, le sujet prend が (ou の), pas は : わたしがすきな.", ». Proposé « explanation: "Dans cette relative, が marque le sujet わたし : わたしがすきなりょうり。", ». Explique la relation dans le contexte visé.
- [important] `exercises[2].explanation` — Actuel « explanation: "Le verbe est au passé simple : くれた, directement devant le nom.", ». Proposé « explanation: "くれた est la forme neutre du passé. Elle précède le nom ほん.", ». Évite la confusion avec le passé simple français.

[Fondation du Japon, Marugoto, relatives déterminatives](https://marugoto.jpf.go.jp/assets/docs/teacher/resource/intermediate1/intermediate1_teaching_topic.pdf)

## Doutes

Les formes potentielles sans ら sont répandues à l’oral. L’exercice sur たべる demande la forme standard enseignée dans la fiche. Aucun doute ne bloque l’approbation après correction.

## Vérification

Les 108 remplacements ont une correspondance exacte et unique dans le fichier de départ normalisé en LF. Ils ne se chevauchent pas et s’appliquent séquentiellement. Les limites des champs, les options, les trous, les variantes et les identifiants ont été vérifiés. Les 18 valeurs de `reviewedOn` restent inchangées.

## Ajustement final

La règle 3 de la fiche « Donner et recevoir » précise qu’avec てくれる, quelqu’un agit pour la personne qui parle ou son entourage, et qu’avec てもらう, le sujet bénéficie de l’action.
