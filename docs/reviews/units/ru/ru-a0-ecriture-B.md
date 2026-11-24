# Relecture unités Écriture — russe — passe B

Fichiers : `packages/content/src/units/ru/e1-lettres-familieres.ts`, `e2-faux-amis.ts`, `e3-formes-nouvelles.ts`, `e4-chuintantes.ts`, `e5-voyelles-signes.ts` · Date : 2026-11-23 · Relecteur : agent relecteur-natif (claude-opus-5-5)

## Synthèse
5 unités relues (lettres, sons fr/en, exemples, mots, items, test) · 0 sans remarque · 5 avec remarques (0 bloquante, 8 importantes, 5 mineures)

Vérifié sans remarque : tous les accents toniques (U+0301) des mots de 2 syllabes ou plus sont présents et bien placés dans les cinq unités (коме́та, те́ма, она́, рука́, сестра́, ко́мната, рестора́н, Москва́, у́тро, у́хо, го́род, кни́га, вода́, спаси́бо, приве́т, пока́, зима́, кино́, ла́мпа, жена́, фо́то, ры́ба, хорошо́, ча́шка, шко́ла, у́лица, же́нщина, музе́й, э́то, э́тот, я́блоко, ю́бка, мя́со, семья́, друзья́, Росси́я, люблю́, объе́кт, подъе́зд ; ёлка, тётя, мёд sans accent ajouté, à juste titre). Les traductions françaises et anglaises des mots sont justes. Chaque `mcq` et `listen_mcq` a une seule bonne réponse et `answer` pointe la bonne option.

---

## ru-a0-01-lettres-familieres (E1)
Verdict : à corriger

- [important] letters[5].kind / lookalike (е) — Actuel : `kind: "same"`, `lookalike: null` — Proposé : `kind: "false-friend"`, `lookalike: "e"` — Pourquoi : е a la forme du e latin mais se lit « yé » ou mouille la consonne : c’est exactement un faux ami, et l’étiqueter « même lettre » contredit sa propre description. Réponse au `// REVIEW:` : je ne garderais pas le classement de `ru.ts`. Si l’on garde « same » pour des raisons de groupe, il faut au moins corriger `situation` (voir ci-dessous).
- [mineur] situation.fr — Actuel : « Six lettres russes ressemblent aux nôtres et se lisent presque pareil : avec elles, tu lis déjà tes premiers mots. » — Proposé : « Six lettres russes ressemblent aux nôtres et se lisent presque pareil, sauf е, qui cache un « y » : avec elles, tu lis déjà tes premiers mots. » — Pourquoi : la phrase annonce six lettres « presque pareilles » alors que е est le premier piège de l’alphabet. (en, même ajout : « …read almost the same, except е, which hides a 'y' sound: … »)

`// REVIEW:` sur les noms эм et тэ : d’accord pour les garder. Ce sont les noms standard, affichés comme étiquettes, et un débutant n’a pas à les déchiffrer.

## ru-a0-02-faux-amis (E2)
Verdict : à corriger

- [important] items[i04].options — Actuel : « ou » / « i » / « è » (answer `a`) — Proposé : `{ id: "a", text: "u" }`, `{ id: "b", text: "y" }`, `{ id: "c", text: "i" }`, answer `a` — Pourquoi : les options ne sont pas traduites. L’anglophone lit « ou » et « è », qui sont des graphies françaises et ne lui disent rien. Les translittérations sont neutres, cohérentes avec la clé latine de l’unité, et « y » devient le vrai piège (la forme). L’explication existante convient telle quelle. Réponse au `// REVIEW:` : oui, c’est un problème.
- [mineur] items[i08].explain.fr — Actuel : « Сок et нос ont les mêmes lettres que des mots latins (« cok », « hoc »), mais se lisent « sok » et « nos ». » — Proposé : « Сок et нос ressemblent à « cok » et « hoc » écrits en lettres latines, mais se lisent « sok » et « nos ». » — Pourquoi : « cok » n’est pas un mot latin ; « mots latins » fait penser à la langue latine.

Le reste est juste : р roulé « comme en italien », х « comme le j espagnol » / « Scottish loch », la réduction de о dans Москва́ (« maskva ») et она́. Les `accept` des items `type` (rot, Moskva) sont complets, car la casse est ignorée.

## ru-a0-03-formes-nouvelles (E3)
Verdict : à corriger

- [important] items[i08].explain (assourdissement final) — Actuel fr : « Lis lettre par lettre : д-о-м, д-р-у-г, б-р-а-т, х-л-е-б. » — Proposé fr : « Lis lettre par lettre : д-о-м, д-р-у-г, б-р-а-т, х-л-е-б. En fin de mot, г et б s’entendent « k » et « p » : on dit à peu près « drouk » et « khliep ». » — Proposé en : « Read letter by letter: д-о-м, д-р-у-г, б-р-а-т, х-л-е-б. At the end of a word, г and б sound like 'k' and 'p': roughly 'drook' and 'khlyep'. » — Pourquoi : c’est dans cette unité que l’apprenant entend pour la première fois друг, хлеб et го́род (« gorat ») en audio. Il lira « g », « b », « d » et entendra « k », « p », « t ». Sans un mot d’explication, il croira à une erreur. E4 (муж) et E5 (мёд) en parlent ensuite, mais trop tard.

Le reste est juste : « g toujours dur » est correct pour un francophone (pas de « g doux »). La lettre п est bien comparée au « p » de « spin » (sans aspiration) et л au « dark l » de « full ». Les distracteurs de i10 (snasibo, spazibo) ciblent bien les deux pièges. `// REVIEW:` sur le nom эль : d’accord pour le garder, c’est le nom courant.

## ru-a0-04-chuintantes (E4)
Verdict : à corriger

- [important] items[i01].explain — Actuel fr : « Quatre sons qui s’écrivent avec deux lettres en français, et une seule en russe. » — Proposé fr : « En russe, chacun de ces sons s’écrit avec une seule lettre ; en français, il en faut souvent deux ou trois (ch, tch, ts). » — Actuel en : « Four sounds that take two letters in English, and only one in Russian. » — Proposé en : « In Russian, each of these sounds takes a single letter; English often needs two (sh, ch, ts). » — Pourquoi : c’est faux pour ж, qui s’écrit « j » en français (une lettre), et « tch » en a trois. En anglais, le « s » de « pleasure » n’en a qu’une.
- [important] items[i04].options — Actuel : « и = i, й = y bref » / « и = i, й = ou » / « и = n, й = i » — Proposé : `{ id: "a", text: "и = i, й = j" }`, `{ id: "b", text: "и = i, й = u" }`, `{ id: "c", text: "и = n, й = i" }`, answer `a` — Pourquoi : « bref » est un mot français et « ou » une graphie française, montrés tels quels à l’anglophone. La translittération (j, comme l’annonce déjà l’explication) est neutre. Réponse au `// REVIEW:` : oui, il faut corriger.
- [important] items[i08].explain — Actuel fr : « Ж en fin de mot se durcit : муж se dit « mouch ». » — Proposé fr : « En fin de mot, ж perd sa voix et se prononce comme ш : муж se dit « mouch ». » — Actuel en : « Ж at the end of a word hardens: муж sounds like 'moosh'. » — Proposé en : « At the end of a word, ж loses its voicing and sounds like ш: муж sounds like 'moosh'. » — Pourquoi : le phénomène est un assourdissement, pas un durcissement. La fiche vient de dire que ж est « toujours dur » : « se durcit » est donc incohérent et trompeur.
- [mineur] words[w02].translation.en — Actuel : « you (one friend) » — Proposé : « you (informal, one person) » — Pourquoi : ты s’emploie aussi avec la famille, les enfants, les collègues proches, pas seulement avec un ami. Même correction dans items[i13].explain.en (« ты = you (informal, one person) »).
- [mineur] letters[1].name — Actuel : « и краткое » — Proposé : « и кра́ткое » — Pourquoi : pour un A0, un nom de deux mots sans accent se lit mal. Le texte de l’entête limite la règle à `text` et `word`, mais l’accent aide ici aussi et ne casse aucune comparaison.

`// REVIEW:` sur i12 (`accept: ["muž", "muzh"]`) : d’accord. « muzh » est la graphie qu’un anglophone ou un utilisateur de téléphone tapera. Si la comparaison ignore les diacritiques, « muz » passera aussi, ce qui est acceptable. Les descriptions de щ (« fresh sheet », « ch doux et long ») et de ы (langue en arrière, entre « i » et « ou ») sont justes et bien adaptées à un débutant.

## ru-a0-05-voyelles-signes (E5)
Verdict : à corriger

- [important] items[i07].explain — Actuel fr : « Dans семья́, le ь sépare м du я : on entend à peu près « sim’-ya ». » — Proposé fr : « Dans семья́, le ь adoucit le м, et le я garde son « y » bien audible : on entend à peu près « sim’-ya ». » — Actuel en : « In семья́, ь keeps м apart from я: it sounds like 'sim-ya'. » — Proposé en : « In семья́, ь softens the м, and я keeps a clear 'y' sound: it sounds roughly like 'sim-ya'. » — Pourquoi : i03, juste avant, enseigne « ь adoucit, ъ sépare ». Dire ici que ь « sépare » brouille la distinction que l’apprenant vient d’apprendre.
- [important] letters[5].sound (ъ) — Actuel fr : « aucun son : le « signe dur », rare, sépare la consonne de la voyelle qui suit » — Proposé fr : « aucun son : le « signe dur », rare, sépare la consonne de la voyelle qui suit, qui garde son « y » : подъе́зд se dit à peu près « pad-yèst » » — Actuel en : « no sound: the 'hard sign', rare, keeps the consonant apart from the vowel after it » — Proposé en : « no sound: the 'hard sign', rare, keeps the consonant apart from the vowel after it, which keeps its 'y' sound: подъе́зд sounds roughly like 'pad-yest' » — Pourquoi : « sépare » n’a aucun sens acoustique pour un débutant. Ce qu’on entend, c’est le « y » de е après la consonne.
- [mineur] items[i12].accept — Actuel : `["mjaso", "myaso"]` — Proposé : `["mjaso", "myaso", "miaso"]` — Pourquoi : « mia… » est la transcription française usuelle de мя ; un francophone sur téléphone la tapera.
- [mineur] letters[4].name, letters[5].name, letters[1].name — Actuel : « мягкий знак », « твёрдый знак », « э оборотное » — Proposé : « мя́гкий знак », « твёрдый знак » (inchangé, ё porte l’accent), « э оборо́тное » — Pourquoi : même raison qu’en E4 ; мягкий est un mot que l’apprenant va dire.

`// REVIEW:` sur подъе́зд à la place de объе́кт : d’accord. Le mot est très courant, il n’emploie que des lettres vues, et объе́кт reste dans `words`.
`// REVIEW:` sur i11 (`accept: ["jug", "yug"]`) : d’accord (voir aussi les doutes).
Le reste est juste : э « è de père » / « e de pet », ё toujours accentué, я « pas un R à l’envers », мёд avec le д final assourdi, мя́со « mya-sa » (réduction de о), Росси́я avec deux с.

---

## Doutes

- **E1, letters[5].sound et i13** : « t’yéma » (fr) / « t-yema » (en) suggère un vrai « y » après le т, alors que е après consonne ne fait que la mouiller ([ˈtʲemə]). E2 i10 (« niét ») et E3 i12 (« privyét ») suivent la même convention. C’est l’approximation habituelle des manuels, et je la laisse passer, mais une graphie comme « t’éma » serait plus exacte. À trancher pour l’ensemble des cinq unités, par cohérence.
- **E1, letters[3].sound (о)** : « o de mot » (o fermé) ; le о russe accentué est un peu plus ouvert, entre « mot » et « porte ». L’approximation est tolérable à A0.
- **E5, i06** (« Quelle voyelle entends-tu ? », options ё/е/о, audio мёд) : on entend littéralement un [o] après un м mouillé. Un apprenant peut défendre « о ». ё reste la meilleure réponse, mais « Quelle lettre s’écrit dans ce mot ? » éviterait la discussion.
- **E5, i11** : un francophone pourrait taper « youg » ou « ioug » (transcription française de юг). La consigne demande des « lettres latines », pas une transcription française, donc je ne l’exige pas. À ajouter si l’arbitre veut être indulgent, comme pour « miaso ».
- **E5, ь « comme si un petit « y » la suivait »** : l’image est classique, mais certains débutants prononcent alors мать comme « mat-ye ». Je l’accepte pour A0.
- **E4, ы « jamais en début de mot »** : c’est vrai hors noms propres et emprunts rares (Ыныкчан). Aucun problème à A0.
