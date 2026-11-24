# Arbitrage unités Écriture — russe

Fichiers : `packages/content/src/units/ru/e1-lettres-familieres.ts`, `e2-faux-amis.ts`, `e3-formes-nouvelles.ts`, `e4-chuintantes.ts`, `e5-voyelles-signes.ts` · Date : 2026-11-23 · Grille : `j4-pr2.md` §1 (unités `script`) · Passes : `ru-a0-ecriture-A.md`, `ru-a0-ecriture-B.md`

## Synthèse
5 unités · 5 approuvées (`status: "reviewed"`, `aiReview` posé) · 0 restent brouillons · 28 corrections appliquées · 1 remarque écartée, 1 retenue en partie
Accord entre passes : 7 remarques vues par les deux, 11 par A seule, 7 par B seule, 2 ajoutées par l’arbitre

Les unités restent non publiées : l’audio n’est ni généré ni écouté (`units:check` le signale). Les commentaires `// REVIEW:` sont résolus : ceux dont la décision est « on garde » deviennent de simples commentaires, les autres sont retirés avec leur correction.

Vérifications : `npx tsc --noEmit -p packages/content` sans erreur ; `npm run units:check` vert (5 unités `reviewed`, 23 fichiers audio à générer avant publication, alphabet 33/33) ; `npx vitest run` dans `packages/content` : 44 tests passés. Les invariants tiennent : lettres déjà vues seulement dans les textes cyrilliques, `latin` inchangé, test à 10 items et seuil 8.

## ru-a0-01-lettres-familieres
Décision : approuvé
- Retenue (B, doute de A) letters[е].kind : « same », lookalike null → « false-friend », lookalike « e » — е a la forme du e latin et se lit « yé » ; l’écran affiche « Familière » pour `same`, alors que le badge « Faux ami » et son avertissement (« ressemble à la lettre latine « e », mais ne se lit pas pareil ») disent exactement ce qu’il faut.
- Retenue (B, reformulée) situation : « …se lisent presque pareil : avec elles… » → « Six lettres russes ressemblent aux nôtres : cinq se lisent presque pareil, et е cache un « y ». Avec elles, tu lis déjà tes premiers mots. » (en aligné) — cohérent avec le nouveau classement de е.
- Retenue (A) letters[о].sound.fr : « o » dans « mot » → « o » dans « porte » — le о accentué russe est plus ouvert que le o de « mot ».
- Écartée (doute de B) « t’yéma », « niét », « privyét » : approximation habituelle en A0, cohérente sur les cinq unités ; l’apostrophe signale déjà le mouillement.
- Les noms эм et тэ restent (accord des deux passes : étiquettes, pas mots à lire).

## ru-a0-02-faux-amis
Décision : approuvé
- Retenue (A, B) i04 : prompt « Comment se lit la lettre У ? » → « Quelle lettre latine transcrit У ? » (en « Which Latin letter transcribes У? ») ; options « ou / i / è » → « u / y / i » — options neutres pour les deux publics ; le prompt évite qu’un francophone lise « u » comme dans « lune ». Explication ajustée en conséquence.
- Retenue (A, B) i08 explain : « ont les mêmes lettres que des mots latins (« cok », « hoc ») » → « ressemblent à « cok » et « hoc » écrits en lettres latines » (en aligné) — « mots latins » évoque la langue latine.
- Retenue (A) letters[с].sound.fr : « toujours dur, jamais « z » » → « même entre deux voyelles, jamais « z » comme dans « rose » » — « dur » prend un autre sens en E4 (non mouillé), et с peut être mouillé.
- Retenue (A) letters[х].sound.fr : « un souffle rauque au fond de la gorge, comme le « j » espagnol » → « un « h » frotté au fond de la bouche, comme le « ch » allemand de « Bach » ou le « j » espagnol de « jota », en plus léger » — « rauque, gorge » pousse vers le r français raclé.
- Ajoutée (arbitre) i07 explain.fr : « le х est un souffle rauque » → « le х est un « h » frotté au fond de la bouche » — alignée sur la fiche de la lettre.
- Doute de A (х = h, pas « kh ») : aucun item `type` ne contient х aujourd’hui ; à accepter `kh` si l’on en crée un.

## ru-a0-03-formes-nouvelles
Décision : approuvé
- Retenue (B) i08 explain : ajout « En fin de mot, г et б s’entendent « k » et « p » : on dit à peu près « drouk » et « khliép ». » (en : « …roughly 'drook' and 'khlyep'. ») — c’est la première fois que l’apprenant entend l’assourdissement final ; sans explication, il croira à une erreur de l’audio.
- Retenue (A) letters[г].sound.fr : « toujours dur » → « même devant е et и (jamais comme dans « girafe ») » — dit concrètement ce qu’on veut dire, sans le « dur » d’E4.
- Retenue (A) letters[л].sound.fr : « comme « l » dans « lac », mais plus sombre » → « comme le « l » anglais de « full » : plus sombre que notre « l », la langue un peu creusée » — « plus sombre » seul ne dit rien à un débutant.
- Le nom эль reste (accord des deux passes).

## ru-a0-04-chuintantes
Décision : approuvé
- Retenue (A, B) i01 explain : « Quatre sons qui s’écrivent avec deux lettres en français… » → « En russe, chacun de ces sons s’écrit avec une seule lettre ; en français, il en faut souvent deux ou trois (ch, tch, ts). » (en : « …English often needs two (sh, ch, ts). ») — faux pour ж (« j ») et « tch » ; formulation de B, plus simple en anglais.
- Retenue en partie (A, B) i04 options : « и = i, й = y bref » / « и = i, й = ou » → « и = i, й = j » / « и = i, й = u » — formes neutres. Écartée la variante « й = y » de A : dans cette même unité, y transcrit ы ; j est la translittération de `ru.ts`, et l’explication la donne déjà (« un « y » bref, transcrit j »).
- Retenue (A, B) i08 explain : « Ж en fin de mot se durcit » → « En fin de mot, ж perd sa voix et se prononce comme ш » (en : « loses its voicing and sounds like ш ») — c’est un assourdissement ; ж est déjà dur.
- Retenue (A, B) words[w02].translation.en et i13 explain.en : « you (one friend) » → « you (informal, one person) ».
- Retenue (A) letters[ж].sound : « toujours dur » → « mais plus grave, la langue plus en arrière ; il ne s’adoucit jamais, même devant е ou и » (en aligné) — relie à la notion « adoucir » vue en E1.
- Retenue (A) letters[ш].sound : même logique (« mais plus grave ; il ne s’adoucit jamais, même devant е ou и »).
- Retenue (A) letters[ы].sound : « entre « i » et « ou » » → « dis « ou », puis étire les lèvres comme pour « i » sans bouger la langue : un « i » dit la langue en arrière » (en aligné) — astuce reproductible.
- Retenue (B) letters[й].name : « и краткое » → « и кра́ткое » — aide à la lecture, sans effet sur les contrôles.
- `accept: ["muž", "muzh"]` de i12 reste (accord des deux passes).

## ru-a0-05-voyelles-signes
Décision : approuvé
- Retenue (A, B) letters[ъ].sound : ajout « dont on entend alors le « y » : подъе́зд se dit à peu près « pad-yèst » » (en : « whose 'y' you then hear: подъе́зд sounds roughly like 'pad-yest' ») — l’effet audible de ъ.
- Retenue (B) i07 explain : « le ь sépare м du я » → « le ь adoucit le м, et le я garde son « y » bien audible » (en aligné) — i03 vient d’enseigner « ь adoucit, ъ sépare ».
- Retenue (A) letters[я].sound.fr : « comme dans « yacht » » → « comme dans « yak » » — « yacht » se dit « yot » en français.
- Retenue (A) letters[ё].sound : ajout « dans les textes courants, on l’écrit souvent е » (en aligné).
- Retenue (A) words[w12].translation : « objet / object » → « objet (d’étude), site / object (of study), site » — объе́кт n’est pas l’objet du quotidien.
- Retenue (B) letters[э].name et letters[ь].name : « э оборотное » → « э оборо́тное », « мягкий знак » → « мя́гкий знак » (твёрдый garde ё).
- Ajoutée (arbitre, sur un doute de B) i06 prompt : « Quelle voyelle entends-tu ? » → « Quelle voyelle s’écrit dans ce mot ? » (en : « Which vowel is written in this word? ») — dans мёд, on entend un [o] après м mouillé ; « о » était défendable.
- Écartée (B) i12 accept « miaso » : la consigne demande la translittération ; « myaso » est accepté comme graphie anglaise courante, mais la transcription française usuelle serait « miasso », et « miaso » ne relève d’aucun système. Même raison pour « youg » (doute de B).
- подъе́зд comme exemple de ъ et `yug` accepté en i11 restent (accord des deux passes).

## À vérifier à l’écoute (avant `published`)
- E4 i07 (ы / и dans сын) et E5 i06 (ё dans мёд) : ne valent que si la voix Piper distingue nettement ces voyelles.
- E3 : vérifier que l’audio de друг, хлеб et го́род fait bien entendre l’assourdissement final annoncé par i08.
