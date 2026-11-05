# Bilan pilote (ru, it) : écoute, essais réels, résultats

Fiche de la sous-phase O5.0 ([plan](../plans/skills-assessment-and-choices.md), section « Phase O5 »). Elle se remplit au fur et à mesure ; ses conclusions décident des changements de format **avant** la rédaction des 17 autres langues.

## 1. Écoute des 12 passages

Pour chaque passage, écouter du début à la fin du passage, sous-titres YouTube coupés, et vérifier :

- **Bornes** : le passage commence et finit sur une phrase entière, et contient les réponses aux 3 questions ;
- **Niveau** : débit et langue plausibles pour le niveau ;
- **Écran** : aucun texte incrusté (titre, étiquette, schéma) ne donne une réponse ;
- **Questions** : les réponses de référence sont justes à l'écoute (questions et réponses dans le dossier, et dans [youtube-listening-pilot.md](youtube-listening-pilot.md)).

Si tout va bien : `checkedOn: "<date de l'écoute>"` dans `src/lib/assessment/dossiers/<langue>/<niveau>-1.ts`. Sinon, noter le problème ici (et les bonnes bornes si elles sont décalées).

| Dossier | Chaîne | Passage | Écouté le | Remarques |
| ------- | ------ | ------- | --------- | --------- |
| `ru-a1-1` | Sergey Storyteller | [1:03 → 1:58](https://www.youtube.com/watch?v=it19zi5Fs2A&t=63s) (55 s) | | |
| `ru-a2-1` | Russian With Max | [5:34 → 6:12](https://www.youtube.com/watch?v=8OlKzxWUlBk&t=334s) (38 s) | | Passage déplacé et question remplacée le 2026-11-05 (étiquette « Завтрак »). Vérifier surtout la fin. |
| `ru-b1-1` | Russian Progress | [11:40 → 12:50](https://www.youtube.com/watch?v=OSnJIAqVkkk&t=700s) (70 s) | | |
| `ru-b2-1` | Russian With Max | [2:57 → 4:26](https://www.youtube.com/watch?v=sxjqV1e_2SY&t=177s) (89 s) | | |
| `ru-c1-1` | ПостНаука | [15:29 → 17:06](https://www.youtube.com/watch?v=taOi3Zm-H8g&t=929s) (97 s) | | |
| `ru-c2-1` | Tamara Eidelman | [3:41 → 5:45](https://www.youtube.com/watch?v=BBotskuyw_M&t=221s) (124 s) | | |
| `it-a1-1` | Podcast Italiano | [0:35 → 1:11](https://www.youtube.com/watch?v=8JGpPHBx7-k&t=35s) (36 s) | | Sous-titres automatiques seulement : vérifier les réponses de près. |
| `it-a2-1` | Podcast Italiano | [1:20 → 2:05](https://www.youtube.com/watch?v=lBOlnDV8aJg&t=80s) (45 s) | | Sous-titres automatiques seulement. |
| `it-b1-1` | Italiano Automatico | [3:04 → 4:01](https://www.youtube.com/watch?v=BNF7uSEayzk&t=184s) (57 s) | | Vidéo illustrée : dates incrustées possibles. |
| `it-b2-1` | Podcast Italiano | [3:07 → 4:28](https://www.youtube.com/watch?v=D2a6S69w104&t=187s) (81 s) | | Titres de parties et noms de philosophes incrustés possibles (question 2). |
| `it-c1-1` | Podcast Italiano | [0:49 → 1:52](https://www.youtube.com/watch?v=uotspWVrGVs&t=49s) (63 s) | | Texte incrusté possible. |
| `it-c2-1` | Festival del Medioevo | [7:40 → 9:15](https://www.youtube.com/watch?v=BCZDcZ8ueGA&t=460s) (95 s) | | |

## 2. Bilans réels

Prérequis : migrations `20261102000100` à `20261102000300` appliquées en production (à faire avec l'accord de l'utilisateur). Quelques bilans complets, en ru et en it, à plusieurs niveaux (l'utilisateur, les relecteurs).

| Date | Langue, dossier | Qui | Durée lecture / écoute / écriture / oral | Écoutes | Publicités | Remarques |
| ---- | --------------- | --- | ---------------------------------------- | ------- | ---------- | --------- |
| | | | | | | |

## 3. Correction : Haiku contre un humain

Pour chaque bilan réel, l'humain juge chaque réponse de compréhension (juste / partiel / faux) et note l'écrit sur les 4 critères, sans regarder le verdict du modèle, puis compare. Les désaccords rejoignent le jeu de `npm run assessment:eval`.

| Dossier | Question | Humain | Haiku | Remarques |
| ------- | -------- | ------ | ----- | --------- |
| | | | | |

## 4. Conclusions et changements de format

À remplir à la fin d'O5.0 : ce qui change dans `AUTHORING.md` et dans les 12 dossiers avant O5.1 et O5.2, puis décision de l'utilisateur (on étend, ou on ajuste encore).
