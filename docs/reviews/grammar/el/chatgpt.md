# Relecture grammaire — grec moderne — ChatGPT (relecture complète)

## Synthèse

18 fiches · 88 exercices · 18 fiches approuvées après correction · 0 brouillon · 133 remplacements (48 bloquants, 76 importants, 9 mineurs)

Base relue : `src/lib/grammar/courses/el.ts`. Les passages complets figurent dans le [fichier de correctifs](chatgpt-patch.json). Les correspondances exactes sur la source LF, l’absence de chevauchement, l’identité des fiches et les limites du schéma ont été vérifiées sur une copie en mémoire.

## el-a1-gender-articles

Décision : approuvé après correction.

- [bloquant] `rule[1]` — Actuel « La terminaison aide : -ος est le plus souvent masculin (ο δρόμος), -α et -η sont féminins (η μητέρα, η φίλη), -ο, -ι et -μα sont neutres (το βιβλίο,… ». Proposé « La terminaison donne un indice. Beaucoup de noms masculins finissent en -ος (ο δρόμος), de féminins en -α ou -η (η μητέρα, η φίλη), et de neutres en… ». Les terminaisons ne suffisent pas à déterminer le genre, notamment -ος et -α.
- [important] `rule[2]` — Actuel « L’article se place même devant un prénom : ο Νίκος, η Μαρία. Le nominatif est la forme du sujet : Η μητέρα είναι εδώ. Piège : il n’y a pas d’article… ». Proposé « Le prénom peut être précédé d’un article : ο Νίκος, η Μαρία. Le sujet est au nominatif : Η μητέρα είναι εδώ. Pour dire « je veux du café », on peut … ». Le prénom n’exige pas toujours un article, notamment en apostrophe.
- [important] `examples[1].note` — Actuel « "Η μητέρα είναι εδώ.", translation: "La mère est ici.", note: "Les noms féminins en -α prennent η." }, ». Proposé « "Η μητέρα είναι εδώ.", translation: "La mère est ici.", note: "Μητέρα est féminin et sujet, d’où l’article η." }, ». Le genre de μητέρα est la donnée pertinente, sans règle absolue à partir du -α.

## el-a1-eimai-echo

Décision : approuvé après correction.

- [important] `rule[1]` — Actuel « Έχω (avoir) est régulier : έχω, έχεις, έχει, έχουμε, έχετε, έχουν. Piège : pour l’âge, le grec dit « être » là où le français dit « avoir » : Είμαι … ». Proposé « Le présent de έχω (avoir) suit le modèle en -ω : έχω, έχεις, έχει, έχουμε, έχετε, έχουν. Pour l’âge, le grec emploie είμαι : Είμαι τριάντα χρονών («… ». Έχω suit le modèle au présent. La qualification est limitée au temps de la leçon.
- [important] `rule[2]` — Actuel « Pour nier, on place δεν juste devant le verbe : Δεν έχω χρόνο. Il n’y a pas de second mot comme le pas français. La question garde l’ordre de l’affi… ». Proposé « Place δεν devant le groupe verbal : Δεν έχω χρόνο. On rencontre aussi δε devant certaines consonnes, par exemple Δε θέλω. Pour une question à laquel… ». La négation peut précéder un pronom faible, et le ν de δεν peut disparaître devant certaines consonnes.
- [bloquant] `exercises[2].hint` — Actuel « έχω ». Proposé « έχω, au présent ». Είχε est aussi possible dans un contexte passé.
- [bloquant] `exercises[3].hint` — Actuel « είμαι ». Proposé « είμαι, au présent ». Ήταν est aussi possible dans un contexte passé.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative.", source: "Έχω χρόνο. ». Proposé « Ajoute « δεν » pour nier la phrase, en gardant le reste.", source: "Έχω χρόνο. ». L’ancienne consigne permet aussi Εγώ δεν έχω χρόνο et d’autres reformulations.

[Grammaire scolaire grecque, le ν final](https://www.ebooks.edu.gr/ebooks/v/html/8547/2009/Grammatiki_E-ST-Dimotikou_html-apli/index_B4e.html)

## el-a1-present-a

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « La plupart des verbes grecs se terminent en -ω à la 1re personne du singulier, et c’est cette forme que donne le dictionnaire : le grec moderne n’a … ». Proposé « Le dictionnaire donne le verbe à la 1re personne du singulier du présent : γράφω. Le grec moderne emploie souvent un verbe conjugué avec να là où le… ». La langue emploie aussi une forme verbale invariable au parfait, distincte de l’infinitif français autonome.
- [important] `rule[1]` — Actuel « On garde le radical et on change seulement la terminaison : γράφω, γράφεις, γράφει, γράφουμε, γράφετε, γράφουν. L’accent écrit reste sur la même syl… ». Proposé « Pour γράφω, le radical et l’accent restent en place : γράφω, γράφεις, γράφει, γράφουμε, γράφετε, γράφουν. À la 3e personne du pluriel, on entend aus… ». La règle doit porter sur le modèle illustré et signaler la finale usuelle -ουνε.
- [bloquant] `exercises[2].hint` — Actuel « Εμείς ___ ελληνικά.", hint: "διαβάζω ». Proposé « Εμείς ___ ελληνικά.", hint: "διαβάζω, au présent ». Διαβάσαμε et διαβάζαμε sont aussi possibles sans temps imposé.
- [bloquant] `exercises[3].hint` — Actuel « δουλεύω ». Proposé « δουλεύω, au présent ». Δουλεύατε est aussi possible sans temps imposé.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à la 1re personne du pluriel (nous). ». Proposé « Conjugue « διαβάζω » au présent avec « nous ». Garde « ένα βιβλίο » à la fin. Tu peux commencer par « Εμείς ». ». Précise le temps et l’ordre évalué.

[Grammaire scolaire grecque, conjugaison et variantes](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_C_06.html)

## el-a1-present-b

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Un second groupe de verbes se termine en -άω ou -ώ : μιλάω ou μιλώ (parler), ρωτάω (demander), περπατάω (marcher), γελάω (rire). Les deux formes de … ». Proposé « Dans le groupe à finale accentuée, certains verbes ont deux formes au présent à la 1re personne : μιλάω ou μιλώ, ρωτάω ou ρωτώ, περπατάω ou περπατώ.… ». Tous les verbes en -ώ ne suivent pas le modèle de μιλάω.
- [important] `rule[1]` — Actuel « Terminaisons en -άω : -άω, -άς, -άει, -άμε, -άτε, -άνε (μιλάω, μιλάς, μιλάει, μιλάμε, μιλάτε, μιλάνε). En -ώ : μιλώ, μιλάς, μιλά, μιλούμε, μιλάτε, μ… ». Proposé « Pour μιλάω, retiens μιλάω, μιλάς, μιλάει, μιλάμε, μιλάτε, μιλάνε. D’autres formes existent : μιλώ, μιλά ou μιλεί, μιλούμε, μιλούν. À la 3e personne … ». La grammaire scolaire donne les variantes du pluriel et le dictionnaire Triantafyllidis atteste aussi μιλεί.
- [important] `rule[2]` — Actuel « Piège pour un francophone : πεινάω (avoir faim) et διψάω (avoir soif) sont des verbes, pas « avoir » + nom. On dit Πεινάω et non « έχω πείνα ». ». Proposé « Pour dire simplement « j’ai faim » et « j’ai soif », emploie les verbes πεινάω et διψάω : Πεινάω πολύ, Διψάω. En français, les équivalents usuels as… ». La tournure avec πείνα existe notamment avec un qualificatif. Enseigne la formulation usuelle sans condamner l’autre.
- [bloquant] `exercises[2].hint` — Actuel « περπατάω ». Proposé « περπατάω, au présent ». Περπατούσε serait aussi possible dans le passé.
- [bloquant] `exercises[3].hint` — Actuel « γελάω ». Proposé « γελάω, au présent ». Γελούσατε serait aussi possible dans le passé.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase à la 3e personne du singulier. ». Proposé « Passe à « il » ou « elle » au présent. Garde « ελληνικά » à la fin. Tu peux commencer par « Αυτός » ou « Αυτή ». ». L’ordre du grec et le sujet neutre permettent d’autres lectures de la consigne initiale.
- [bloquant] `exercises[4].answers` — Actuel « answers: ["Μιλάει ελληνικά.", "Μιλά ελληνικά.", "Αυτός μιλάει ελληνικά.", "Αυτός μιλά ελληνικά.", "Αυτή μιλάει ελληνικά.", "Αυτή μιλά ελληνικά."], ». Proposé « answers: ["Μιλάει ελληνικά.", "Μιλά ελληνικά.", "Μιλεί ελληνικά.", "Αυτός μιλάει ελληνικά.", "Αυτός μιλά ελληνικά.", "Αυτός μιλεί ελληνικά.", "Αυτή … ». Le dictionnaire atteste la forme μιλεί en plus de μιλά et μιλάει.
- [important] `exercises[4].explanation` — Actuel « Μιλάω devient μιλάει (ou μιλά) ; le pronom sujet est facultatif. ». Proposé « À la 3e personne du singulier, tu peux écrire μιλάει, μιλά ou μιλεί. Le pronom sujet est facultatif. ». Explique les variantes acceptées.

[Grammaire scolaire grecque, variantes des verbes accentués](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_C_06.html) · [Dictionnaire Triantafyllidis, tableau de μιλώ](https://www.greek-language.gr/greekLang/modern_greek/tools/lexica/rimatiko/r1011.html?mode=pdf) · [Tableau de γελώ](https://www.greek-language.gr/greekLang/modern_greek/tools/lexica/rimatiko/r104.html)

## el-a1-plural

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Au pluriel, l’article défini est οι pour le masculin et le féminin, τα pour le neutre. Masculin : -ος → -οι (ο φίλος, οι φίλοι). Féminin : -α et -η … ». Proposé « Au nominatif pluriel, emploie οι pour le masculin et le féminin, et τα pour le neutre. Parmi les modèles fréquents : ο φίλος → οι φίλοι, η μητέρα → … ». Présente les finales comme des modèles. D’autres noms de même finale se déclinent autrement.
- [bloquant] `rule[2]` — Actuel « Pièges : l’accent peut se déplacer (το παιδί, τα παιδιά) et le neutre pluriel finit toujours en -α, jamais en -ς. Retiens aussi que οι sert pour les… ». Proposé « L’accent peut se déplacer : το παιδί → τα παιδιά. Beaucoup de pluriels neutres finissent en -α, mais certains finissent en -η : το λάθος → τα λάθη. … ». Le neutre pluriel ne finit pas toujours en -α.
- [important] `exercises[2].explanation` — Actuel « Les noms masculins en -ος font leur pluriel en -οι. ». Proposé « Le nominatif pluriel de ο φίλος est οι φίλοι. ». Ne généralise pas le modèle de φίλος.
- [important] `exercises[3].explanation` — Actuel « Les noms neutres en -ο font leur pluriel en -α. ». Proposé « Βιβλίο suit le modèle en -ο qui donne -α au pluriel : βιβλία. ». Le modèle de βιβλίο est enseigné comme tel.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au pluriel.", source: "Ο καλός φίλος μένει εδώ. ». Proposé « Mets tous les mots qui s’accordent au pluriel et garde l’ordre des mots.", source: "Ο καλός φίλος μένει εδώ. ». Μένουν εδώ οι καλοί φίλοι est correct avec la consigne initiale.
- [bloquant] `exercises[4].answers` — Actuel « answers: ["Οι καλοί φίλοι μένουν εδώ."], ». Proposé « answers: ["Οι καλοί φίλοι μένουν εδώ.", "Οι καλοί φίλοι μένουνε εδώ."], ». Accepte la variante courante en -ουνε.

[Grammaire scolaire grecque, flexion des noms](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_C_02.html)

## el-a1-accusative

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « L’objet direct et les noms après une préposition se mettent à l’accusatif. Au masculin, l’article ο devient τον et le nom perd son -ς : ο φίλος → το… ». Proposé « Un complément direct est à l’accusatif. Dans ο φίλος → τον φίλο, le nom perd son -ς. Le féminin η φίλη devient τη φίλη, et le neutre το παιδί reste … ». La règle scolaire exige τη φίλη et distingue ce féminin du masculin τον.
- [important] `rule[1]` — Actuel « Après la préposition σε (à, dans, en), l’article fusionne avec elle : σε + τον = στον, σε + την = στην, σε + το = στο ; au pluriel, στους, στις, στα… ». Proposé « Σε (à, dans, en) prend l’accusatif et fusionne avec l’article : στον, στη(ν), στο, et au pluriel στους, στις, στα. Le féminin garde son ν dans στην … ». Donne la contraction dans les deux contextes du ν et évite une règle sur toutes les prépositions.
- [important] `rule[2]` — Actuel « Piège : un seul mot, σε, couvre à, au, dans, en, sur, selon le contexte. Et le prénom reste précédé de l’article : Βλέπω τον Νίκο. ». Proposé « Σε peut correspondre à « à », « au », « dans », « en » ou « sur » selon le contexte. Un prénom peut prendre l’article à l’accusatif quand il est com… ». Le prénom garde l’article dans l’exemple. Cette propriété ne vaut pas pour tous ses emplois.
- [bloquant] `table.rows[1]` — Actuel « ["Féminin", "η φίλη", "τη(ν) φίλη", "τις φίλες"], ». Proposé « ["Féminin", "η φίλη", "τη φίλη", "τις φίλες"], ». Le mot φίλη commence par φ, d’où τη dans la norme scolaire.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase au pluriel.", source: "Βλέπω τον φίλο. ». Proposé « Remplace seulement « τον φίλο » par sa forme au pluriel.", source: "Βλέπω τον φίλο. ». Le pluriel pourrait aussi s’appliquer au sujet ou au sujet et au complément.

[Grammaire scolaire grecque, le ν final](https://www.ebooks.edu.gr/ebooks/v/html/8547/2009/Grammatiki_E-ST-Dimotikou_html-apli/index_B4e.html)

## el-a2-possessives

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le grec place un petit mot après le nom : το σπίτι μου (ma maison), ο φίλος σου (ton ami). Les formes sont μου, σου, του (à lui), της (à elle), μας,… ». Proposé « Pour marquer la possession, le grec emploie souvent un pronom faible après le nom : το σπίτι μου, ο φίλος σου. Choisis la forme selon le possesseur … ». Les possessifs ne s’accordent pas avec le nom possédé. Του peut reprendre un antécédent neutre.
- [important] `table.rows[2]` — Actuel « ["αυτός", "του", "το σπίτι του"], ». Proposé « ["αυτός / αυτό", "του", "το σπίτι του"], ». Complète le paradigme pour le possesseur neutre.
- [important] `table.rows[6]` — Actuel « ["αυτοί / αυτές", "τους", "το σπίτι τους"], ». Proposé « ["αυτοί / αυτές / αυτά", "τους", "το σπίτι τους"], ». Τους reprend aussi un possesseur neutre pluriel.
- [bloquant] `exercises[0].prompt` — Actuel « Ο Γιάννης έχει ένα σπίτι. Το σπίτι ___ είναι μεγάλο. ». Proposé « Ο Γιάννης έχει ένα σπίτι. Το σπίτι ___ είναι μεγάλο. (La maison de Giannis.) ». Les autres possessifs pouvaient évoquer une autre maison.
- [bloquant] `exercises[1].prompt` — Actuel « Η Ελένη έχει μια αδελφή. Η αδελφή ___ μένει εδώ. ». Proposé « Η Ελένη έχει μια αδελφή. Η αδελφή ___ μένει εδώ. (La sœur d’Eleni.) ». La consigne doit sélectionner le possesseur.
- [bloquant] `exercises[2].prompt` — Actuel « Εμείς έχουμε ένα σπίτι. Το σπίτι ___ είναι κοντά. ». Proposé « Εμείς έχουμε ένα σπίτι. Το σπίτι ___ είναι κοντά. (Notre maison.) ». La consigne doit sélectionner le possesseur.
- [important] `exercises[3].hint` — Actuel « à toi ». Proposé « pronom possessif faible, à toi ». Δικοί σου permet aussi une lecture contrastive. Cible la forme faible.
- [important] `exercises[4].instruction` — Actuel « Le possesseur devient « moi ». ». Proposé « Change seulement le possessif pour dire que la maison est à moi. ». L’ancienne consigne permettait aussi Το δικό μου σπίτι est grand.

[Grammaire scolaire grecque, accent et enclise](https://www.ebooks.edu.gr/ebooks/v/html/8547/2009/Grammatiki_E-ST-Dimotikou_html-apli/index_B4c.html)

## el-a2-aorist

Décision : approuvé après correction.

- [mineur] `title` — Actuel « Le passé simple (aoriste) : έγραψα, μίλησα, διάβασα ». Proposé « L’aoriste (passé) : έγραψα, μίλησα, διάβασα ». Évite l’assimilation au passé simple littéraire français. L’aoriste est courant à l’oral.
- [important] `rule[0]` — Actuel « L’aoriste (αόριστος) exprime une action passée et terminée : Χθες έγραψα ένα μήνυμα. Il traduit le passé composé comme le passé simple du français. … ». Proposé « L’aoriste (αόριστος) présente un fait passé comme un tout : Χθες έγραψα ένα μήνυμα. Le français le traduit souvent par un passé composé et parfois p… ». L’aoriste présente un fait comme un tout, même si l’action dure ou se répète dans une période bornée.
- [bloquant] `rule[1]` — Actuel « Le radical prend un -σ- (ou -ψ- après -φ-, -π-, -β-) : διαβάζω → διάβασα, δουλεύω → δούλεψα, γράφω → έγραψα. Les verbes en -άω ont -ησ- : μιλάω → μί… ». Proposé « Beaucoup de radicaux d’aoriste ont -σ- : διαβάζω → διάβασα. La consonne peut changer : γράφω → έγραψα, δουλεύω → δούλεψα. Parmi les verbes en -άω, c… ». La finale -ησ- ne vaut pas pour tous les verbes en -άω.
- [bloquant] `rule[2]` — Actuel « L’accent recule d’une syllabe au passé. Si le verbe est trop court pour cela, on ajoute ε- devant : γράφω → έγραψα. Cet augment tombe aux formes en … ». Proposé « Dans les modèles actifs de cette fiche, l’accent est souvent sur la troisième syllabe à partir de la fin. Un ε- initial peut porter l’accent : γράφω… ». Είχα est un imparfait. L’augment n’est pas général, et l’accent ne recule pas mécaniquement d’une syllabe.
- [mineur] `examples[3].text` — Actuel « "Δεν διάβασες το βιβλίο;", translation: "Tu n’as pas lu le livre ?", note: "δεν se place devant l’aoriste." }, ». Proposé « "Δε διάβασες το βιβλίο;", translation: "Tu n’as pas lu le livre ?", note: "Ici, δε précède l’aoriste." }, ». Modèle de perte du ν devant δ selon la règle scolaire, déjà présentée en A1.
- [important] `exercises[0].prompt` — Actuel « Χθες ___ ένα βιβλίο. ». Proposé « Χθες ___ ένα βιβλίο. (À l’aoriste.) ». Le présent de narration reste possible sans indication du temps.
- [important] `exercises[0].explanation` — Actuel « Χθες demande un temps du passé : l’aoriste διάβασα. ». Proposé « À l’aoriste, διαβάζω devient διάβασα. ». Le repère χθες n’impose pas l’aoriste à lui seul.
- [bloquant] `exercises[2].hint` — Actuel « Εγώ ___ ένα μήνυμα χθες.", hint: "γράφω ». Proposé « Εγώ ___ ένα μήνυμα χθες.", hint: "γράφω, à l’aoriste ». Έγραφα est possible pour un fait présenté en cours.
- [bloquant] `exercises[3].hint` — Actuel « ρωτάω ». Proposé « ρωτάω, à l’aoriste ». Ρωτούσε ou ρώταγε peuvent convenir dans un contexte passé.
- [important] `exercises[3].explanation` — Actuel « Les verbes en -άω prennent -ησ- à l’aoriste : ρώτησε à la 3e personne du singulier. ». Proposé « À l’aoriste, ρωτάω devient ρώτησε à la 3e personne du singulier. ». La terminaison -ησ- n’est pas la règle de tous les verbes en -άω.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à l’aoriste (passé simple). ». Proposé « Conjugue « μιλάς » à l’aoriste. Garde « ελληνικά » à la fin. Tu peux commencer par « Εσύ ». ». Évite d’assimiler le temps au passé simple français et fixe la structure.

[Grammaire scolaire grecque, augment et aoriste](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_C_06.html) · [Dictionnaire Triantafyllidis, γέλασα](https://www.greek-language.gr/greekLang/modern_greek/tools/lexica/rimatiko/r104.html)

## el-a2-future

Décision : approuvé après correction.

- [important] `summary` — Actuel « Parler de l’avenir avec θα et choisir entre l’action répétée et l’action ponctuelle. ». Proposé « Former le futur avec θα et distinguer l’action vue comme un tout de l’action en cours ou habituelle. ». L’aspect ne se réduit pas à une opposition ponctuel/répété.
- [important] `rule[0]` — Actuel « Le futur se forme avec la particule invariable θα devant le verbe conjugué : Θα μιλήσω. Il n’y a pas de terminaison de futur comme en français. La n… ». Proposé « Pour former le futur, place la particule θα devant la forme verbale : Θα μιλήσω. La négation vient avant θα : Δε θα έρθω. En français, le futur simp… ». Modèle de ν final devant θ conforme à la règle scolaire, sans exclure l’usage répandu de δεν θα.
- [bloquant] `rule[1]` — Actuel « Il y a deux formes. Le futur simple (θα + radical de l’aoriste, terminaisons du présent) exprime une action ponctuelle : Αύριο θα γράψω ένα μήνυμα. … ». Proposé « Compare deux façons de présenter une action future. Le futur simple présente le fait comme un tout : Αύριο θα γράψω ένα μήνυμα. Le futur continu gar… ». L’aspect simple peut aussi présenter un fait long ou une série bornée.
- [important] `rule[2]` — Actuel « Pour trouver le futur simple, pars de l’aoriste sans augment ni -α : έγραψα → θα γράψω, μίλησα → θα μιλήσω. Verbes courants irréguliers : θα πάω, θα… ». Proposé « Dans des verbes comme γράφω ou μιλάω, reprends le radical de l’aoriste sans l’augment et ajoute les terminaisons : έγραψα → θα γράψω, μίλησα → θα μι… ». Retirer -α n’est pas une recette générale, par exemple πήγα → θα πάω.
- [mineur] `examples[2].translation` — Actuel « "Κάθε μέρα θα διαβάζω ελληνικά.", translation: "Chaque jour, je lirai du grec.", note: "Futur continu : une action répétée." }, ». Proposé « "Κάθε μέρα θα διαβάζω ελληνικά.", translation: "Chaque jour, je lirai en grec.", note: "Futur continu : l’action est présentée comme une habitude." }, ». « Lire en grec » traduit la formulation plus naturellement.
- [mineur] `examples[3].text` — Actuel « "Δεν θα έρθει αύριο.", translation: "Il ne viendra pas demain.", note: "δεν se place devant θα." }, ». Proposé « "Δε θα έρθει αύριο.", translation: "Il ne viendra pas demain.", note: "La négation précède θα." }, ». Harmonise l’exemple avec le modèle orthographique enseigné.
- [important] `exercises[0].explanation` — Actuel « Αύριο (demain) demande le futur : θα πάω. ». Proposé « Θα πάω place l’action dans l’avenir. Αύριο signifie « demain ». ». Αύριο peut également s’employer avec un présent à valeur de futur.
- [bloquant] `exercises[1].prompt` — Actuel « Κάθε βράδυ ___ ελληνικά. ». Proposé « Κάθε βράδυ ___ ελληνικά. (Habitude, au futur continu.) ». Avec une période passée ou future bornée, les autres options peuvent aussi s’employer.
- [important] `exercises[1].explanation` — Actuel « Une action répétée (chaque soir) prend le futur continu : θα διαβάζω. ». Proposé « Pour présenter l’action comme une habitude à venir, utilise le futur continu θα διαβάζω. ». Une répétition n’impose pas le futur continu dans tous les contextes.
- [bloquant] `exercises[2].hint` — Actuel « Αύριο εγώ ___ ένα μήνυμα.", hint: "γράφω ». Proposé « Αύριο εγώ ___ ένα μήνυμα.", hint: "γράφω, au futur simple ». Αύριο autorise aussi un présent ou le futur continu.
- [bloquant] `exercises[3].hint` — Actuel « πάω ». Proposé « πάω, au futur simple ». Την Κυριακή permet aussi un présent de planification ou un récit au passé.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase au futur simple (action ponctuelle). ». Proposé « Conjugue « γράφω » au futur simple. Garde « ένα μήνυμα » à la fin. Tu peux commencer par « Εγώ ». ». Fixe la structure évaluée au lieu de laisser l’ordre ouvert.

## el-a2-subjunctive-na

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le grec moderne n’a plus d’infinitif. Là où le français dit « je veux partir », le grec dit « je veux que je parte » : Θέλω να φύγω. Le verbe après … ». Proposé « Dans les constructions de cette fiche, le grec emploie να et une forme conjuguée là où le français emploie souvent l’infinitif : Θέλω να φύγω (« Je … ». La paraphrase française « je veux que je parte » n’est pas idiomatique et le sujet de να peut être différent.
- [important] `rule[1]` — Actuel « Après να, on emploie le radical de l’aoriste pour une action ponctuelle (Θέλω να γράψω ένα μήνυμα) ou celui du présent pour une action durable ou ré… ». Proposé « Après να, la forme de γράψω présente le fait comme un tout : Θέλω να γράψω ένα μήνυμα. La forme de γράφω peut présenter une activité en cours ou hab… ». Le choix est aspectuel et non fondé sur la seule durée.
- [important] `rule[2]` — Actuel « Même construction avec μπορώ (pouvoir), ξέρω (savoir), αρχίζω (commencer) et πρέπει (devoir). Piège : πρέπει est invariable, c’est le verbe après να… ». Proposé « Tu peux employer να après μπορώ, ξέρω, αρχίζω ou πρέπει. Πρέπει est impersonnel au présent : dans Πρέπει να φύγουμε, la personne apparaît sur φύγουμ… ». Πρέπει est impersonnel et a des formes à d’autres temps, comme έπρεπε.
- [important] `table.rows[2]` — Actuel « ["πρέπει", "devoir (invariable)", "Πρέπει να δουλέψω."], ». Proposé « ["πρέπει", "devoir (impersonnel)", "Πρέπει να δουλέψω."], ». La propriété pertinente est l’emploi impersonnel.
- [important] `examples[2].note` — Actuel « "Πρέπει να φύγουμε τώρα.", translation: "Nous devons partir maintenant.", note: "πρέπει ne change pas ; φύγουμε porte la personne." }, ». Proposé « "Πρέπει να φύγουμε τώρα.", translation: "Nous devons partir maintenant.", note: "Πρέπει est impersonnel. Φύγουμε porte la marque de « nous »." }, ». Évite de laisser entendre qu’il n’existe aucune autre forme de πρέπει.
- [important] `exercises[3].explanation` — Actuel « Le verbe après να s’accorde avec le sujet : μάθουμε (ponctuel) ou μαθαίνουμε (durable). ». Proposé « Μάθουμε présente l’apprentissage comme un but à atteindre. Μαθαίνουμε présente le processus ou une activité habituelle. ». Apprendre une langue peut prendre du temps même avec μάθουμε.
- [bloquant] `exercises[4].instruction` — Actuel « Mets la phrase à la forme négative.", source: "Μπορώ να έρθω. ». Proposé « Ajoute « δεν » devant « Μπορώ » et garde le reste de la phrase.", source: "Μπορώ να έρθω. ». La négation peut aussi être portée par le verbe subordonné (Μπορώ να μην έρθω), avec un autre sens.

## el-a2-object-pronouns

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le pronom complément se place avant le verbe conjugué : Βλέπω τον Νίκο → Τον βλέπω (je le vois). Formes directes : με, σε, τον, την, το, μας, σας, τ… ». Proposé « Dans une affirmation ordinaire, le pronom faible précède le verbe : Βλέπω τον Νίκο → Τον βλέπω. Formes directes : με, σε, τον, τη(ν), το, μας, σας, … ». L’impératif affirmatif a un placement différent. Le féminin direct varie entre τη et την.
- [important] `rule[1]` — Actuel « Le pronom reste collé au verbe, même après la négation, θα ou να : Δεν σε ακούω, Θέλω να σας δω. Quand il y en a deux, l’indirect passe d’abord : Μο… ». Proposé « La négation, θα ou να viennent avant le pronom faible : Δε σε ακούω, Θέλω να σας δω. Avec deux pronoms faibles avant le verbe, l’indirect vient d’ab… ». Le pronom n’est pas soudé au verbe et την conserve son ν dans certains contextes.
- [important] `rule[2]` — Actuel « Piège : les formes τον, την, το ressemblent à l’article, mais elles se placent devant un verbe. Comme en français, le pronom précède le verbe ; il n… ». Proposé « Τον, τη(ν) et το peuvent ressembler à des articles. Compare Βλέπω τον Νίκο (article devant le nom) et Τον βλέπω (pronom devant le verbe). À l’impéra… ». La postposition existe aussi avec la forme en -οντας. Limite la comparaison aux constructions présentées.
- [mineur] `examples[1].text` — Actuel « "Δεν σε ακούω.", translation: "Je ne t’entends pas.", note: "δεν + pronom + verbe." }, ». Proposé « "Δε σε ακούω.", translation: "Je ne t’entends pas.", note: "Négation + pronom faible + verbe." }, ». Adopte le modèle de la règle du ν final devant σ.
- [mineur] `exercises[2].prompt` — Actuel « Δεν ___ ακούω, μιλάς πολύ σιγά. ». Proposé « Δε ___ ακούω, μιλάς πολύ σιγά. ». Même modèle de ν final devant le pronom.
- [bloquant] `exercises[2].answers` — Actuel « answers: ["σε"], ». Proposé « answers: ["σε", "σ’"], ». Σε peut s’élider devant ακούω : σ’ ακούω. La comparaison unifie les apostrophes.
- [important] `exercises[2].explanation` — Actuel « Le pronom direct de la 2e personne est σε, placé entre δεν et le verbe. ». Proposé « Le pronom est σε. Devant ακούω, il peut s’élider : Δε σ’ ακούω. ». Explique la variante acceptée.
- [important] `exercises[4].instruction` — Actuel « Remplace le complément par un pronom. ». Proposé « Remplace « τα παιδιά » par un pronom faible. Écris le pronom puis le verbe au présent (1re personne). ». L’ancienne consigne permet une forme tonique ou un sujet explicite.
- [bloquant] `exercises[4].answers` — Actuel « answers: ["Τα αγαπάω."], ». Proposé « answers: ["Τα αγαπάω.", "Τα αγαπώ."], ». Les deux formes actives sont courantes au présent.
- [important] `exercises[4].explanation` — Actuel « Τα παιδιά devient τα, placé devant le verbe. ». Proposé « Τα παιδιά est repris par τα devant le verbe. Les formes αγαπάω et αγαπώ sont possibles. ». Explique les deux formes acceptées.

[Grammaire scolaire grecque, élision, accent et ν final](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_B_02.html)

## el-a2-comparatives

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le comparatif se forme avec πιο devant l’adjectif, qui s’accorde toujours avec le nom. Le second terme est introduit par από : Η Ελένη είναι πιο ψηλ… ». Proposé « Pour comparer deux personnes ou choses, tu peux mettre πιο devant l’adjectif accordé : Η Ελένη είναι πιο ψηλή από τον Νίκο. Certains adjectifs ont a… ». Les comparatifs synthétiques réguliers existent, notamment ψηλότερος.
- [important] `rule[1]` — Actuel « Le superlatif ajoute l’article, qui s’accorde lui aussi : ο πιο ψηλός, η πιο ψηλή, το πιο ψηλό. Le français emploie le plus, la plus : le grec répèt… ». Proposé « Pour dire « le plus haut » ou « la plus grande », ajoute l’article accordé : ο πιο ψηλός, η πιο ψηλή, το πιο ψηλό. Tu peux préciser le groupe avec u… ». Από όλους ne constitue pas une traduction générale de « de ».
- [bloquant] `exercises[3].answers` — Actuel « answers: ["καλύτερα"], ». Proposé « answers: ["καλύτερα", "πιο καλά"], ». Les deux adverbes comparatifs conviennent après νιώθω.
- [important] `exercises[3].explanation` — Actuel « Après un verbe, « mieux » est un adverbe : καλύτερα. ». Proposé « Dans cette phrase, « mieux » se rend par l’adverbe καλύτερα ou la tournure πιο καλά. ». L’explication accompagne les deux réponses et se limite à la phrase.

[Centre de la langue grecque, comparatifs et adverbes](https://www.greek-language.gr/certification/files/document/rsrh_content/13/B2-BOOK-FINAL.pdf)

## el-b1-imperfect

Décision : approuvé après correction.

- [bloquant] `rule[1]` — Actuel « Formation : radical du présent + augment + -α, -ες, -ε, -αμε, -ατε, -αν : γράφω → έγραφα. À nous et vous, l’augment tombe : γράφαμε, γράφατε. Les ve… ». Proposé « Dans le modèle de γράφω, l’imparfait garde le radical du présent et prend -α, -ες, -ε, -αμε, -ατε, -αν. L’augment ε- précède le radical dans έγραφα,… ». L’augment se place devant le radical et la règle ne s’applique pas à tous les verbes de la même façon.
- [important] `rule[2]` — Actuel « Piège : le critère n’est pas la durée mais le point de vue. Une action unique et terminée est à l’aoriste, même si elle a été longue : Έμεινα δύο ώρ… ». Proposé « La durée seule ne choisit pas le temps. Έμεινα δύο ώρες présente le séjour de deux heures comme un tout. L’imparfait peut montrer une action unique … ». Une action unique peut être à l’imparfait si le récit la montre en cours.
- [important] `exercises[0].prompt` — Actuel « Όταν ήμουν παιδί, ___ κάθε μέρα στο πάρκο. ». Proposé « Όταν ήμουν παιδί, ___ κάθε μέρα στο πάρκο. (Décris l’habitude à l’imparfait.) ». Une répétition bornée peut aussi être envisagée à l’aoriste.
- [important] `exercises[0].explanation` — Actuel « Une habitude dans le passé demande l’imparfait : έπαιζα. ». Proposé « Pour décrire cette habitude à l’imparfait, emploie έπαιζα. ». Le type d’action ne suffit pas à imposer l’imparfait.
- [important] `exercises[1].prompt` — Actuel « Εγώ μια φορά ___ στην Ιταλία. ». Proposé « Εγώ μια φορά ___ στην Ιταλία. (Un voyage achevé, à l’aoriste.) ». Πήγαινα est possible si le trajet est montré en cours.
- [important] `exercises[1].explanation` — Actuel « Une seule fois : aoriste, πήγα. Avec εγώ, πήγαμε ne convient pas. ». Proposé « Pour présenter ce voyage comme un fait achevé, emploie πήγα avec εγώ. ». Μια φορά n’impose pas l’aoriste à elle seule.
- [bloquant] `exercises[2].hint` — Actuel « μένω ». Proposé « μένω, à l’imparfait ». Μείναμε peut convenir pour un séjour passé présenté comme achevé.
- [bloquant] `exercises[3].hint` — Actuel « μιλάω ». Proposé « μιλάω, à l’imparfait ». Μίλησες reste possible s’il s’agit d’une occurrence passée.
- [bloquant] `exercises[3].answers` — Actuel « answers: ["μιλούσες"], ». Proposé « answers: ["μιλούσες", "μίλαγες"], ». La grammaire scolaire reconnaît les deux séries à l’imparfait, dont -αγες en registre familier.
- [important] `exercises[3].explanation` — Actuel « Les verbes en -άω ont l’imparfait en -ούσα : μιλούσες. ». Proposé « Avec εσύ, μιλούσες est la forme neutre de l’imparfait de μιλάω. La variante μίλαγες est familière. ». Le modèle en -ούσα n’est pas général à tous les verbes en -άω.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à l’imparfait (habitude dans le passé). ». Proposé « Mets « διαβάζω » à l’imparfait. Tu peux placer « κάθε μέρα » au début, après le verbe ou à la fin. ». La consigne définit les placements évalués.
- [bloquant] `exercises[4].answers` — Actuel « answers: ["Κάθε μέρα διάβαζα ένα βιβλίο.", "Διάβαζα ένα βιβλίο κάθε μέρα."], ». Proposé « answers: ["Κάθε μέρα διάβαζα ένα βιβλίο.", "Διάβαζα ένα βιβλίο κάθε μέρα.", "Διάβαζα κάθε μέρα ένα βιβλίο."], ». L’adverbe peut aussi figurer entre le verbe et le complément.

[Grammaire scolaire grecque, variantes de l’imparfait](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_C_06.html)

## el-b1-imperative

Décision : approuvé après correction.

- [bloquant] `rule[0]` — Actuel « L’impératif a deux formes : le singulier (tu) et le pluriel (vous, ou politesse). Il se tire du radical de l’aoriste : γράφω → γράψε / γράψτε, κάνω … ». Proposé « L’impératif a une forme pour « tu » et une pour « vous ». Le radical dépend de l’aspect : γράψε (un ordre portant sur un acte) ou γράφε (écris régul… ». Il existe un impératif de présent et un impératif d’aoriste. Le radical n’est pas toujours celui de l’aoriste.
- [important] `rule[1]` — Actuel « À l’affirmatif, le pronom suit le verbe : Πες μου (dis-moi), Πάρτε το (prenez-le). Pour interdire, on n’utilise pas l’impératif mais μην suivi de la… ». Proposé « À l’impératif affirmatif, le pronom suit le verbe : Πες μου, Πάρτε το. Pour interdire, on emploie μη(ν) suivi de la 2e personne du subjonctif : Μην … ». Introduit μη avant μ conformément à la règle du ν final.
- [important] `rule[2]` — Actuel « Pour être poli, ajoute παρακαλώ et emploie le pluriel. Piège : comme en français, le pronom suit le verbe à l’affirmatif, mais il le précède dès que… ». Proposé « Pour t’adresser poliment à quelqu’un, tu peux employer la forme en « vous » et ajouter παρακαλώ : Πείτε μου, παρακαλώ. Compare Πάρε το et Μην το πάρ… ». L’usage de παρακαλώ et du pluriel est possible sans être obligatoire pour toute formulation polie.
- [important] `table.rows[6]` — Actuel « ["ακούω", "άκου", "ακούστε", "écouter"], ». Proposé « ["ακούω", "άκου / άκουσε", "ακούστε", "écouter"], ». Άκουσε est aussi un impératif courant.
- [bloquant] `exercises[0].prompt` — Actuel « ___ εδώ, Νίκο! ». Proposé « ___ εδώ, Νίκο! (Emploie l’impératif.) ». Un ordre peut être formulé avec Έρχεσαι ou Θα έρθεις. Seul Έλα est morphologiquement à l’impératif.
- [bloquant] `exercises[2].hint` — Actuel « περιμένω ». Proposé « περιμένω, à l’impératif (tu) ». Περίμενες ou Θα περιμένεις ne sont pas exclues par l’ancienne consigne.
- [bloquant] `exercises[3].hint` — Actuel « λέω (vous) ». Proposé « λέω, à l’impératif (vous) ». Λέτε μου et Θα μου πείτε peuvent exprimer la demande avec d’autres constructions.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à l’impératif négatif (tu). ». Proposé « Formule l’interdiction à la 2e personne du singulier. Commence par « Μην » et garde « εκεί » à la fin. ». Le grec n’a pas d’impératif négatif morphologique. La consigne précise la construction.
- [important] `exercises[4].explanation` — Actuel « L’interdiction se forme avec μην + subjonctif : Μην πας εκεί. ». Proposé « Après μην, πας présente un départ comme un tout. Πηγαίνεις peut convenir pour une action en cours ou une habitude. ». Explique pourquoi les deux aspects peuvent être acceptés.

[Grammaire scolaire grecque, paradigmes de l’impératif](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_C_06.html) · [Centre de la langue grecque, les modes](https://www.greek-language.gr/digitalResources/modern_greek/tools/lexica/glossology_edu/iframe.html?heading=4&id=173)

## el-b1-genitive

Décision : approuvé après correction.

- [bloquant] `rule[1]` — Actuel « Formes des noms : -ος → -ου (του φίλου), -ης → -η (του μαθητή), -α et -η → -ας et -ης (της μητέρας, της φίλης), -ο → -ου (του βιβλίου), -ι → -ιού (τ… ». Proposé « Quelques modèles : φίλος → φίλου, μαθητής → μαθητή, μητέρα → μητέρας, φίλη → φίλης, βιβλίο → βιβλίου, παιδί → παιδιού. Au pluriel, retiens φίλων et … ». Le génitif singulier de δάσκαλος admet deux accentuations, selon le registre.
- [important] `rule[2]` — Actuel « Piège : le français a un seul « de » ; en grec, on choisit l’article d’après le genre du possesseur, pas de l’objet : το βιβλίο του δασκάλου, la mai… ». Proposé « L’article du génitif dépend du possesseur, même si le nom possédé a un autre genre : το βιβλίο του δασκάλου, το σπίτι της δασκάλας. Pour un destinat… ». Précise le groupe nominal destinataire sans prétendre éliminer d’autres constructions.
- [bloquant] `exercises[2].answers` — Actuel « answers: ["δασκάλου"], ». Proposé « answers: ["δασκάλου", "δάσκαλου"], ». La forme avec maintien de l’accent est attestée dans la grammaire scolaire.
- [important] `exercises[2].explanation` — Actuel « Le génitif de δάσκαλος est δασκάλου, avec déplacement de l’accent. ». Proposé « Les deux génitifs sont possibles : δασκάλου en style soigné, et δάσκαλου en style neutre ou familier. ». Explique les deux accentuations.
- [important] `exercises[4].instruction` — Actuel « Mets le possesseur au pluriel (les enfants). ». Proposé « Remplace seulement « του παιδιού » par son génitif pluriel (« des enfants »). ». La consigne n’évalue que le génitif, sans permutation des mots.

[Grammaire scolaire grecque, δάσκαλου et δασκάλου selon le registre](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_C_02.html)

## el-b1-middle-verbs

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Beaucoup de verbes courants se conjuguent à la voix moyenne, en -ομαι ou -άμαι, même s’ils ont un sens actif en français : έρχομαι (venir), κάθομαι … ». Proposé « Certains verbes courants ont des terminaisons dites non actives, même quand leur sens est actif : έρχομαι (venir), κάθομαι (être assis, rester), σκέ… ». Terminologie plus sûre pour l’ensemble des formes. Κάθομαι peut décrire une position ou le fait de rester.
- [important] `rule[1]` — Actuel « Terminaisons en -ομαι : -ομαι, -εσαι, -εται, -όμαστε, -εστε, -ονται. En -άμαι : -άμαι, -άσαι, -άται, -όμαστε, -άστε, -ούνται (κοιμάμαι, κοιμάσαι, κο… ». Proposé « Pour έρχομαι, les terminaisons sont -ομαι, -εσαι, -εται, -όμαστε, -εστε, -ονται. Pour κοιμάμαι, retiens κοιμάμαι, κοιμάσαι, κοιμάται, κοιμόμαστε, κο… ». Les finales ne décrivent pas tous les verbes non actifs. La variante κοιμούμαι est attestée.
- [important] `rule[2]` — Actuel « La même voix exprime le passif et le réfléchi : Το σπίτι χτίζεται (la maison est en construction), Πλένομαι (je me lave). Piège : « avoir peur » se … ». Proposé « Ces terminaisons peuvent aussi exprimer le passif ou une action sur soi : Το σπίτι χτίζεται (« La maison est en construction »), Πλένομαι (« Je me l… ». Relie la forme non active à ses différents emplois sémantiques.
- [mineur] `examples[0].translation` — Actuel « "Έρχομαι από τη δουλειά.", translation: "Je rentre du travail.", note: "έρχομαι n’a pas de forme active." }, ». Proposé « "Έρχομαι από τη δουλειά.", translation: "Je viens du travail.", note: "Έρχομαι signifie « venir » et a une forme non active." }, ». La phrase exprime la provenance sans imposer l’idée d’un retour.
- [mineur] `examples[1].translation` — Actuel « "Τα παιδιά κοιμούνται νωρίς.", translation: "Les enfants dorment tôt.", note: "3e personne du pluriel : -ούνται." }, ». Proposé « "Τα παιδιά κοιμούνται νωρίς.", translation: "Les enfants se couchent tôt.", note: "À la 3e personne du pluriel, κοιμάμαι donne κοιμούνται." }, ». Traduction idiomatique de l’heure de coucher.
- [bloquant] `exercises[2].hint` — Actuel « κάθομαι ». Proposé « κάθομαι, au présent ». Καθόμασταν et καθίσαμε sont possibles dans un contexte passé.
- [bloquant] `exercises[3].hint` — Actuel « σκέφτομαι ». Proposé « σκέφτομαι, au présent ». Σκεφτόταν ou σκέφτηκε sont possibles sans temps imposé.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase à la 3e personne du pluriel (ils). ». Proposé « Passe à la 3e personne du pluriel. Tu peux commencer par « Αυτοί » ou « Αυτές ». Garde « νωρίς » à la fin. ». Les réponses incluent le féminin. La consigne doit le permettre explicitement.

[Centre de la langue grecque, verbes déponents et variantes](https://www.greek-language.gr/greekLang/modern_greek/bibliographies/modern_dict/show.html?id=138)

## el-b1-relative

Décision : approuvé après correction.

- [important] `rule[1]` — Actuel « Pour « à qui » ou « dont », le grec garde που et ajoute un pronom faible dans la relative : Ο φίλος που του έδωσα το βιβλίο (l’ami à qui j’ai donné … ». Proposé « Pour traduire « à qui » ou « dont », une construction courante garde που et ajoute un pronom faible : ο φίλος που του έδωσα το βιβλίο, η γυναίκα που… ». Le pronom de reprise existe en grec et correspond à une construction, sans exclure les autres relatifs.
- [important] `rule[2]` — Actuel « Ο οποίος (η οποία, το οποίο) est plus formel, s’accorde en genre et en nombre et prend le cas de sa fonction. On l’emploie surtout après une préposi… ». Proposé « Ο οποίος, η οποία, το οποίο appartiennent à un registre plus soigné. La forme s’accorde avec l’antécédent en genre et en nombre, et prend le cas req… ». Indique que le cas est régi dans la relative, indépendamment du cas de l’antécédent.
- [important] `examples[1].note` — Actuel « "Το βιβλίο που διαβάζω είναι πολύ καλό.", translation: "Le livre que je lis est très bon.", note: "Pas de pronom qui répète le livre." }, ». Proposé « "Το βιβλίο που διαβάζω είναι πολύ καλό.", translation: "Le livre que je lis est très bon.", note: "Ici, που introduit la relative sans pronom de rep… ». La note décrit l’exemple, sans généralisation sur tous les usages.
- [bloquant] `exercises[1].options` — Actuel « options: ["που", "που του", "του που", "που τον"], ». Proposé « options: ["που τους", "που του", "του που", "που τον"], ». Dans l’usage spontané, που seul peut reprendre un complément oblique. La réponse avec του reste seule dans les options.
- [important] `exercises[1].explanation` — Actuel « « À qui » se dit που + pronom indirect : που του έδωσα. ». Proposé « Dans cette construction, « à qui » est rendu par που et le pronom faible του : που του έδωσα. ». Présente la construction enseignée sans exclure d’autres façons de dire « à qui ».
- [important] `exercises[4].instruction` — Actuel « Relie les deux phrases avec « που ». ». Proposé « Commence par « Ξέρω τον Νίκο ». Ajoute la relative avec « που » et garde « μένει στην Αθήνα ». ». L’ancienne consigne autorise plusieurs organisations du texte.
- [bloquant] `exercises[4].answers` — Actuel « answers: ["Ξέρω τον Νίκο που μένει στην Αθήνα."], ». Proposé « answers: ["Ξέρω τον Νίκο, που μένει στην Αθήνα.", "Ξέρω τον Νίκο που μένει στην Αθήνα."], ». La virgule est naturelle si la relative ajoute une information sur Nikos. Sans virgule, elle peut identifier de quel Nikos on parle.

## el-b1-perfect

Décision : approuvé après correction.

- [important] `rule[0]` — Actuel « Le parfait (παρακείμενος) se forme avec έχω conjugué suivi d’une forme invariable en -ει tirée de l’aoriste : έχω γράψει, έχεις φάει, έχει πάει. Cet… ». Proposé « Le parfait (παρακείμενος) se forme avec έχω conjugué et une forme invariable fondée sur le radical perfectif : έχω γράψει, έχεις φάει, έχει πάει. Ce… ». La forme du dictionnaire est τρώω. Φάω est une forme dépendante, notamment après θα ou να.
- [important] `rule[2]` — Actuel « Piège : le passé composé français correspond souvent à l’aoriste en grec. Avec un repère précis (χθες, πέρσι), on emploie l’aoriste, jamais le parfa… ». Proposé « Le passé composé français se traduit souvent par un aoriste : Χθες είδα τη Μαρία. Quand tu situes un événement achevé à un moment passé comme hier, … ». Évite d’interdire toute mention du passé avec le parfait, par exemple un repère de début avec από.
- [mineur] `examples[2].text` — Actuel « "Έχεις δει αυτό το φιλμ;", translation: "As-tu déjà vu ce film ?", note: "Question sur une expérience." }, ». Proposé « "Έχεις δει αυτή την ταινία;", translation: "As-tu déjà vu ce film ?", note: "Question sur une expérience." }, ». Ταινία est le terme courant pour un film en tant qu’œuvre. Le ν est conservé devant τ.
- [bloquant] `exercises[0].prompt` — Actuel « Δεν ___ φάει ακόμα. ». Proposé « Εγώ δεν ___ φάει ακόμα. (Au parfait.) ». Avec θα, Δεν θα φάει ακόμα est aussi grammatical. L’énoncé précise le sujet et le temps.
- [bloquant] `exercises[0].options` — Actuel « options: ["είμαι", "έχω", "θα"], ». Proposé « options: ["είμαι", "έχω", "έχει"], ». Remplace le futur grammatical par un distracteur d’accord.
- [important] `exercises[2].prompt` — Actuel « Χθες ___ στο σινεμά. ». Proposé « Χθες ___ στο σινεμά. (Fait passé, à l’aoriste.) ». Le présent de narration n’est plus une lecture possible de la consigne.
- [important] `exercises[2].explanation` — Actuel « Avec χθες (repère précis dans le passé), on emploie l’aoriste : πήγα. ». Proposé « Pour raconter ce fait achevé, emploie l’aoriste de πάω : πήγα. ». Le repère χθες ne commande pas seul le temps.
- [important] `exercises[4].instruction` — Actuel « Mets la phrase au parfait avec έχω. ». Proposé « Mets seulement « πήγε » au parfait et garde l’ordre des mots. ». Un sujet omis ou postposé est possible en grec, mais le reste de la phrase est ici fixé.

[Grammaire scolaire grecque, temps composés](https://ebooks.edu.gr/ebooks/v/html/8547/2334/Grammatiki-Neas-Ellinikis-Glossas_A-B-G-Gymnasiou_html-apli/index_C_06.html)

## Doutes

Les variantes de registre attestées sont indiquées dans les fiches concernées et acceptées dans les réponses lorsque la consigne les permet. Les exemples avec δε, μη et τη suivent la règle du ν final de la grammaire scolaire. Aucun doute ne justifie de maintenir une fiche en brouillon.

## Audit final

Dans `el-a2-aorist`, le deuxième exercice (`exercises[1]`) demande explicitement l’aoriste, comme le premier. Le présent de narration πάμε est ainsi écarté et la réponse attendue reste πήγαμε. Le total de 133 remplacements annoncé plus haut correspond à la relecture initiale. Le JSON contient 134 remplacements après cet ajout.
