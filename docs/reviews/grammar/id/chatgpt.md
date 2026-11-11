# Relecture grammaire — indonésien — Codex (relecture complète)

## Synthèse

18 fiches et 81 exercices relus · 18 approuvées après correction · 0 brouillon · 120 remplacements (27 bloquants, 90 importants, 3 mineurs)

La relecture porte sur le cours du commit `2a9f5b4` et sur l’indonésien standard. Elle signale les variantes familières lorsqu’elles éclairent un exercice. Le [fichier de correctifs](chatgpt-patch.json) donne le texte actuel et le remplacement de chaque champ.

## id-a1-basic-sentences

Décision : approuvé après correction.

- [important] `rule[0]` — Une phrase nominale ou adjectivale peut se passer de copule. Il existe aussi adalah dans certaines phrases nominales.
- [bloquant] `rule[1]` — La restriction d’adalah à l’écrit soutenu était fausse.
- [important] `rule[2]` — Précise l’absence de flexion de temps et de personne sans exclure les préfixes de voix enseignés en B1.
- [bloquant] `exercises[1].answers` — Meminum kopi est également grammatical.
- [important] `exercises[1].explanation` — Explique la variante avec meN-.
- [bloquant] `exercises[2].answers` — La consigne exige kemarin au début, ce qui exclut la réponse qui le place en fin.
- [important] `exercises[2].explanation` — Rappelle l’ordre demandé dans l’exercice.

## id-a1-pronouns

Décision : approuvé après correction.

- [important] `rule[0]` — Explicite la majuscule d’Anda et évite de présenter kamu comme interchangeable avec Anda.
- [mineur] `exercises[2].prompt` — Le modèle écrit place une virgule entre les termes de l’énumération. Le référent de mereka est explicite.
- [important] `exercises[3].instruction` — Cible aku plutôt que des pronoms familiers régionaux.

[Badan Bahasa — EYD V, majuscules](https://ejaan.kemendikdasmen.go.id/eyd/penggunaan-huruf/huruf-kapital/) · [Badan Bahasa — EYD V, virgule](https://ejaan.kemendikdasmen.go.id/eyd/penggunaan-tanda-baca/tanda-koma/)

## id-a1-negation

Décision : approuvé après correction.

- [bloquant] `rule[0]` — La fiche présente deux négations parmi d’autres, dont belum et jangan.
- [important] `rule[1]` — Bukan peut nier contrastivement un prédicat verbal.
- [important] `rule[2]` — Distingue négation neutre et contraste, sans interdire à tort tout emploi de bukan devant un adjectif.
- [important] `exercises[0].explanation` — Évite une règle d’exclusion trop large.
- [important] `exercises[2].prompt` — La construction contrastive est explicite et élimine l’enchaînement par une simple virgule.
- [important] `exercises[3].instruction` — La consigne vise la négation neutre étudiée et conserve l’ordre des mots.

## id-a1-noun-phrase

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Les déterminants numéraux sont un contre-exemple courant à tout vient après le nom.
- [important] `rule[1]` — Distingue prédication, description nominale et emploi du démonstratif comme sujet.
- [important] `rule[2]` — Explique le contraste avec leur exprimé par mereka.
- [important] `exercises[2].prompt` — Cible la forme indépendante saya. Le possessif familier usuel s’écrit ayahku.
- [bloquant] `exercises[2].answers` — Aku est normalement représenté par le clitique -ku dans cette construction, attaché à ayah.
- [important] `exercises[2].explanation` — Donne la variante familière dans sa graphie correcte.

[Tata Bahasa Baku Bahasa Indonesia, § 7.2.2.1.1 sur saya, aku et -ku](https://repositori.kemendikdasmen.go.id/16351/1/Tata%20Bahasa%20Baku%20Bahasa%20Ind.pdf)

## id-a1-ada-prepositions

Décision : approuvé après correction.

- [important] `rule[2]` — Ajoute l’indication orthographique pertinente et distingue les sens.
- [bloquant] `exercises[0].prompt` — Mereka pergi dari pasar peut vouloir dire qu’ils quittent le marché.
- [bloquant] `exercises[3].answers` — Terdapat teh di dapur est aussi standard.
- [important] `exercises[3].explanation` — Explique la variante de registre.
- [bloquant] `exercises[4].instruction` — Ibu tidak di rumah est également correct sans l’obligation de garder ada.

## id-a1-questions

Décision : approuvé après correction.

- [important] `rule[0]` — La fiche introduit ensuite apakah comme marqueur d’interrogation fermé, ce qui contredisait l’interdiction absolue.
- [important] `rule[1]` — Décrit les réponses usuelles sans exclure belum selon le sens.
- [important] `exercises[2].hint` — Écarte des groupes tels que di kota mana et di daerah mana sans livrer la réponse.

## id-a2-numbers-classifiers

Décision : approuvé après correction.

- [bloquant] `rule[1]` — Le classificateur est facultatif dans de nombreux groupes, y compris à l’écrit standard.
- [bloquant] `rule[2]` — Se- exprime un, sans imposer une nuance restrictive. L’absence de classificateur est admise par la grammaire officielle.
- [important] `table.rows[4]` — Se- n’implique pas « seulement un ».
- [bloquant] `exercises[2].hint` — Le contexte seul admet kilo, par exemple. L’indice cible un classificateur.
- [important] `exercises[3].instruction` — Précise la transformation sans donner sebuah.

[Badan Bahasa — Les classificateurs en indonésien standard](https://repositori.kemendikdasmen.go.id/31409/1/EDISI_18_2017.pdf)

## id-a2-plural-quantity

Décision : approuvé après correction.

- [important] `rule[0]` — Le redoublement marque parfois simplement le pluriel, sans insistance ni diversité.
- [important] `rule[1]` — La forme simple n’est pas nécessairement un singulier de sens.
- [important] `rule[2]` — Évite de généraliser à toutes les formes redoublées avec quantité.
- [important] `table.rows[0]` — Donne la phrase standard dans le tableau.
- [important] `table.rows[1]` — Un redoublement n’implique pas nécessairement des sortes différentes.
- [important] `examples[2].note` — Teman renvoie ici à plusieurs amis.
- [important] `exercises[0].prompt` — Cible l’expression neutre, sans confusion avec un redoublement emphatique.
- [important] `exercises[1].explanation` — Évite de dire qu’un groupe de trois a un sens singulier.
- [bloquant] `exercises[2].answers` — Sejumlah teman est également une formulation naturelle.
- [important] `exercises[2].explanation` — Explique les deux formes acceptées.
- [important] `exercises[3].hint` — Le sens seul peut aussi être exprimé par un autre quantificateur.

## id-a2-aspect

Décision : approuvé après correction.

- [important] `rule[0]` — Pernah n’est pas limité à un bilan de vie et ces marqueurs peuvent aussi précéder un prédicat non verbal.
- [bloquant] `rule[2]` — Tidak n’est pas interdit en contexte et pernah est compatible avec une date.
- [important] `table.caption` — Akan exprime notamment le futur.
- [important] `exercises[0].prompt` — La précision sélectionne belum plutôt qu’une réponse négative générale.
- [bloquant] `exercises[2].prompt` — Besok kami sudah ke Bali peut aussi convenir si le trajet est déjà réalisé demain.
- [important] `exercises[2].explanation` — Un repère futur n’impose pas akan.
- [important] `exercises[4].instruction` — La personne et le reste de la phrase doivent rester identiques.

## id-a2-yang

Décision : approuvé après correction.

- [important] `rule[1]` — Le contraste est un emploi de yang avec adjectif, pas une condition absolue.
- [bloquant] `rule[2]` — L’ordre et la voix d’une relative objet ne sont pas ceux de l’active Saya membaca buku. Yang ne remplace pas seul tous les relatifs français.
- [important] `examples[0]` — Distingue clairement le sujet et son attribut, et explicite le sens non genré de adik.
- [important] `exercises[2].hint` — Le trou pouvait recevoir aussi un déterminant ou un marqueur de temps, par exemple Orang itu tinggal di sini.

## id-a2-ber

Décision : approuvé après correction.

- [important] `rule[0]` — La fiche ne doit pas confondre complément et objet direct.
- [important] `rule[1]` — La présence de r dans la première syllabe ne suffit pas à prédire la forme.
- [important] `rule[2]` — La règle de registre s’applique à l’exemple ciblé.
- [important] `exercises[2].hint` — Main seul est possible dans l’usage familier.
- [important] `exercises[3].hint` — La consigne doit imposer la forme préfixée.
- [important] `exercises[4].instruction` — L’ancienne consigne livrait le mot entier.

## id-a2-comparison

Décision : approuvé après correction.

- [bloquant] `rule[1]` — Se- s’emploie aussi avec des noms, comme dans satu kelas / sekelas. La restriction portait seulement sur le comparatif.
- [important] `rule[2]` — L’adjectif peut recevoir un préfixe dans la construction d’égalité de la même fiche.

## id-b1-men-active

Décision : approuvé après correction.

- [important] `summary` — MeN- peut aussi former des verbes intransitifs.
- [bloquant] `rule[0]` — L’écrit standard ne demande pas meN- avec tous les verbes actifs transitifs.
- [important] `rule[1]` — La disparition de p, t, k et s n’est pas universelle.
- [important] `rule[2]` — Les groupes de consonnes et certaines bases d’une syllabe demandent de distinguer modèle et règle absolue.
- [important] `exercises[2].hint` — Kirim est aussi possible en registre familier.
- [important] `exercises[3].hint` — Cible la forme active préfixée.

## id-b1-passive

Décision : approuvé après correction.

- [bloquant] `summary` — Dia et mereka admettent aussi le modèle pronominal.
- [important] `rule[0]` — L’omission d’oleh dépend de la position de l’agent, et les suffixes sont conservés.
- [important] `rule[1]` — Présente le modèle avec des pronoms et sa variante attachée.
- [bloquant] `rule[2]` — La grammaire standard atteste les deux constructions pour la troisième personne.
- [important] `table.rows[1]` — Montre les deux structures pour dia.
- [important] `examples[0].translation` — Kakak ne précise pas le genre.
- [important] `examples[2]` — Le terme de parenté utilisé comme nom d’adresse ou de référence prend la majuscule.
- [important] `examples[3].translation` — Le passif décrit l’action accomplie sans affirmer que la porte reste ouverte.
- [bloquant] `exercises[3].instruction` — L’ancienne consigne permettait d’omettre l’agent ou de choisir l’autre passif.
- [mineur] `exercises[3].answers` — Majuscule pour Ibu, qui désigne ici maman.
- [bloquant] `exercises[4].instruction` — Une mise en relief avec reprise par -nya était possible sous l’ancienne consigne.

[Tata Bahasa Baku Bahasa Indonesia, § 9.5.2.1.3 sur les deux passifs](https://repositori.kemendikdasmen.go.id/16351/1/Tata%20Bahasa%20Baku%20Bahasa%20Ind.pdf) · [Badan Bahasa — EYD V, majuscules](https://ejaan.kemendikdasmen.go.id/eyd/penggunaan-huruf/huruf-kapital/)

## id-b1-kan-i

Décision : approuvé après correction.

- [important] `rule[0]` — Les suffixes se rencontrent aussi au passif et à l’impératif.
- [important] `rule[2]` — Menemukan ne se limite pas aux objets et menemui n’implique pas toujours un rendez-vous.
- [important] `table.rows[4]` — Menghadirkan existe et permet d’illustrer le contraste avec menghadiri.
- [important] `examples[0].note` — La note ne doit pas limiter le verbe aux choses.
- [important] `examples[1].note` — Le rendez-vous n’est pas une condition du verbe.
- [bloquant] `exercises[1].prompt` — Trouver une personne après l’avoir cherchée permettrait menemukan dans le contexte initial.
- [important] `exercises[1].explanation` — Explique la distinction dans ce contexte.
- [important] `exercises[4].instruction` — L’ordre des compléments et le maintien du sujet sont imposés.

## id-b1-noun-derivation

Décision : approuvé après correction.

- [important] `title` — Pendidikan et pembangunan prennent la variante nasale.
- [important] `rule[1]` — Aligne la notation peN- avec la présence d’une nasale et présente les associations comme des exemples.
- [important] `rule[2]` — Évite de confondre les noms d’agent de cette série avec les formations non nasales ou les noms d’instruments.
- [important] `table.rows[2]` — Pendidikan contient une nasale.
- [important] `table.rows[3]` — Pembangunan contient une nasale.
- [important] `table.rows[6]` — Nomme la forme plutôt que de la traiter comme une exception sans explication.
- [important] `table.rows[9]` — Aligne la ligne sur une dérivation de la série clairement illustrée.
- [important] `examples[2].note` — Corrige le nom de la formation.
- [important] `exercises[2].hint` — L’indice utilise la notation nasale enseignée.
- [important] `exercises[3].prompt` — Donne une formulation naturelle pour le registre écrit.

## id-b1-connectors

Décision : approuvé après correction.

- [important] `rule[2]` — La virgule de subordonnée initiale est prescrite dans l’écrit standard.
- [important] `table.rows[3]` — Précise où la personne reste et donne un exemple complet.
- [important] `examples[2]` — Tetap di rumah rend clairement la décision de rester à la maison.
- [mineur] `exercises[1].prompt` — Le français emploie ici un infinitif puisque le sujet est le même.
- [important] `exercises[2].prompt` — Aligne le prédicat sur le modèle retenu.
- [bloquant] `exercises[3].hint` — L’ancienne consigne autorisait aussi biarpun, kendati et plusieurs synonymes.
- [important] `exercises[4].instruction` — Fixe la ponctuation interne qui est comparée par l’application.
- [important] `exercises[4].source` — Tetap di rumah rend le sens de « rester chez soi ».
- [bloquant] `exercises[4].answers` — Retient la virgule exigée et le prédicat de la source.
- [important] `exercises[4].explanation` — Suit la norme écrite.

[Badan Bahasa — EYD V, séparation de la subordonnée initiale](https://ejaan.kemendikdasmen.go.id/eyd/penggunaan-tanda-baca/tanda-koma/)

## id-b1-time-clauses

Décision : approuvé après correction.

- [important] `rule[0]` — Waktu et saat sont aussi possibles. Bekerja garde son préfixe, et le sujet partagé peut s’exprimer.
- [important] `rule[2]` — Kapan introduit une interrogative indirecte. Il ne remplace pas ketika pour une simple subordonnée de temps.
- [important] `table.rows[0]` — L’aspect progressif correspond à « il pleuvait ».
- [important] `examples[0]` — L’exemple et la traduction indiquent la même relation temporelle.
- [important] `examples[1]` — Donne la forme standard dans une affirmation et précise le sujet.
- [important] `examples[3].note` — Bekerja n’est pas une base nue.
- [important] `exercises[0].prompt` — Aligne le registre sur celui de l’exemple.
- [bloquant] `exercises[3].answers` — Hingga peut aussi introduire le terme de l’attente.
- [important] `exercises[3].explanation` — Rend compte des deux réponses.
- [bloquant] `exercises[4].instruction` — Sinon, Dia membaca sambil makan exprime aussi la simultanéité.

## Doutes

Les classificateurs sont facultatifs dans de nombreux groupes usuels. Les exercices qui les évaluent ciblent la construction avec un classificateur. Pour le passif pronominal, le cours distingue les formes avec `saya` et `kamu` des variantes attestées avec `dia` et `mereka`. Aucun doute ne bloque l’approbation après correction.

## Vérification

Les 120 correspondances du JSON sont exactes, uniques et non chevauchantes sur le cours de départ. Chaque identifiant figure une seule fois dans les décisions.

## Ajustement final

La première règle sur les nombres et classificateurs précise qu’après un nombre, le nom garde sa forme simple, sans redoublement. Le lot initial comptait 120 remplacements. Le correctif de suivi porte le total à 121.
