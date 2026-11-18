# b. Modèle pédagogique

Fondements : `docs/plans/roadmap-plateforme.md` §1 (quatre volets de Nation, input compréhensible, rappel actif et espacement, output poussé et rétroaction, fluidité, autodétermination). Ce document dit comment ils se traduisent en produit.

## 1. Les compétences mesurées

Quatre compétences par langue cible, chacune avec un **niveau continu** (une valeur et une incertitude), affiché sur l'échelle A0 → C2 :

| Compétence | Alimentée par | Sert à régler |
|---|---|---|
| Lire | Questions de compréhension sur textes entiers, couverture lexicale, vitesse de lecture | La densité des textes proposés |
| Écouter | Questions après écoute sans texte, dictée | La vitesse et la longueur de l'audio |
| Écrire | Les 4 critères de la correction (grammaire, lexique, syntaxe, adéquation) | La consigne et l'exigence de la correction |
| Parler | Prise de parole transcrite et corrigée ; à défaut, auto-évaluation marquée « déclaré » | Les tâches orales |

S'y ajoutent deux mesures transversales : le **vocabulaire prouvé** (mots dont le rappel a réussi après un délai) et les **descripteurs « Je peux… »** validés par des preuves.

Un niveau ne monte que lorsque l'incertitude est assez faible ; il ne baisse jamais à l'écran sur une mauvaise journée (la valeur interne bouge, l'affichage attend une tendance). Un passage de palier (A2 → B1) est **confirmé par un bilan** court avant d'être fêté.

## 2. Le parcours de A0 à C2

| Étape | Ce que l'apprenant fait surtout | Input | Output | Étude | Part de contenu généré |
|---|---|---|---|---|---|
| **A0** Découverte | Écriture (si nécessaire), sons, 50 premières phrases | Dialogues très courts, audio lent | Répéter, recomposer, choisir | Alphabet, premiers blocs lexicaux | 100 % curé |
| **A1-A2** Situations | Unités par situation de communication | Dialogues puis mini-textes gradués | Phrases guidées, puis 3 à 5 phrases libres | Blocs lexicaux, grammaire A1-A2 | Curé + textes gradués générés |
| **B1** Autonomie | Séance autour du texte du jour | Textes gradués, premiers textes authentiques courts | Paragraphe écrit, prise de parole d'une minute | Grammaire B1, erreurs personnelles | Majorité générée |
| **B2** Élargissement | Lecture extensive, thèmes choisis | Authentique ouvert + gradué dense | Argumenter, résumer, jeu de rôle | Collocations, connecteurs | Moitié / moitié |
| **C1-C2** Nuance | Volume et précision | Authentique long, littérature du domaine public | Textes longs, registre, oral soutenu | Fiches de référence, registre | Authentique surtout |

**A0 → A2 : par situations.** Une vingtaine d'unités par niveau, alignées sur les descripteurs du CECR (se présenter, commander, s'orienter, raconter sa journée…). Chaque unité : dialogue audio → phrases-clés → un point de grammaire relié → exercices courts et variés → mini-conversation guidée → « Je peux maintenant… ». Le contenu est rédigé une fois par langue à partir d'un gabarit commun, relu par les agents en deux passes, versionné dans le dépôt. L'alphabet n'est plus un module à part : ses groupes de lettres sont les premières unités du parcours, et les lettres réapparaissent dans les mots des dialogues.

**À partir de B1 : le texte du jour.** Le parcours par situations s'efface progressivement ; il reste disponible comme révision.

## 3. La séance type

| Étape | Volet de Nation | Contenu | Part du temps |
|---|---|---|---|
| 1. Réveil | Étude | Révisions dues de la file unique, plafonnées | 20 % |
| 2. Lecture | Input | Texte gradué + audio ; mots touchés ; 3 à 4 questions sur le texte entier, dont une après écoute seule | 30 % |
| 3. Atelier | Étude | 5 à 8 mots du texte, un point de grammaire qu'il contient (texte à trous, transformation) | 15 % |
| 4. Expression | Output | Écrire ou dire en lien avec le texte ; correction ; **réécriture** de 1 ou 2 phrases | 25 % |
| 5. Élan | Fluidité | Relire le texte en temps limité, ou redire sa production plus vite | 10 % |
| 6. Bilan | — | Acquis du jour, erreur du jour, ce qui revient demain | — |

Règles :
- Une étape se valide par le travail fait, jamais par une case.
- La séance de 10 minutes garde les étapes 1, 2 et 4 raccourcies ; l'atelier et l'élan alternent un jour sur deux. Sur une semaine, les quatre volets sont présents, et l'app le montre.
- **Difficulté adaptative** : compréhension ≥ 90 % deux fois de suite → texte plus dense ; < 60 % → plus facile.
- Une erreur de production devient un exercice dans la séance **du lendemain**.
- La séance est préchargée (texte, audio, exercices) pour être faite hors ligne ; seule la correction de la production attend le réseau.
- Débutants : la séance est l'unité du parcours, sur le même squelette (dialogue à la place du texte).

## 4. L'input

**Trois sources de textes, par ordre de priorité juridique et pédagogique :**

1. **Textes gradués générés**, originaux, sur un thème (jamais la reformulation d'un article). Contraintes vérifiées par le code après génération : couverture ≥ 95 % dans la tranche de fréquence du niveau, 5 à 8 mots nouveaux répétés chacun au moins trois fois, longueur par niveau. Puis une relecture par un second appel (naturel, fautes). Un texte est **partagé** entre tous les apprenants de même langue, niveau et thème.
2. **Textes authentiques sous licence ouverte**, intégraux : Global Voices et Wikinews (CC BY), Wikipédia (CC BY-SA), domaine public (Wikisource, Gutenberg), Tatoeba pour les phrases. Licence vérifiée et notée par source, attribution affichée.
3. **Contenus « tous droits réservés »** : titre, source et accroche courte seulement, proposés en « pour aller plus loin » avec un lien. Ils ne portent plus la séance.

**Le lecteur.** Toucher un mot : lemme, sens dans le contexte en L1, audio, « ajouter » (la carte garde la phrase). Toucher une phrase : traduction et audio. Les mots sont teintés selon leur état (nouveau, en cours, connu). Avant d'ouvrir un texte, l'app affiche la couverture calculée sur le vocabulaire **de l'apprenant** (« tu connais 96 % de ce texte »). Aides d'écriture optionnelles selon la langue : accent tonique, furigana, pinyin, voyelles brèves.

**Le seuil de 98 %.** C'est une cible, pas un dogme : une réplication partielle de Hu & Nation ne trouve pas de différence nette entre 90, 95 et 98 %. Nous visons 95 à 98 % pour la lecture extensive, et nous acceptons 90 % quand le lecteur fournit l'aide au mot.

**Volume.** La séance apporte un texte par jour. La bibliothèque permet d'en lire davantage ; le temps de lecture y compte comme travail utile si le texte est lu jusqu'au bout et qu'une question de compréhension est réussie.

## 5. La mémoire

- **Une seule file** de révision pour tous les types de cartes : mot en contexte, bloc lexical, point de grammaire, groupe de lettres, correction personnelle.
- **FSRS** remplace Leitner : rétention cible de 90 % par défaut (réglable de 80 à 95 %), étapes dans la journée pour les nouvelles cartes, horodatage à la seconde.
- **Charge plafonnée** : la file du jour ne dépasse jamais le temps alloué à l'étape « Réveil ». Après une absence, la dette est étalée sur plusieurs jours, sans compteur anxiogène ; les nouvelles cartes sont suspendues tant que la dette n'est pas résorbée.
- **Modes de rappel** qui se durcissent avec la stabilité : reconnaître → traduire → texte à trous dans la phrase d'origine → produire → dictée → dire.
- **Sangsues** : une carte ratée six fois est signalée, reformulée (autre phrase, moyen mnémotechnique) ou suspendue.
- **« Connu »** est un état calculé (stabilité au-delà d'un seuil), pas un bouton. L'apprenant peut dire « je connais déjà » : le mot passe alors par un rappel de vérification différé avant de compter.
- La **mesure de rétention** existante est conservée et devient un indicateur de pilotage.

## 6. L'output

**L'écrit** reprend ce qui marche déjà : quatre critères, corrections minimales catégorisées, version d'un natif au niveau visé. La refonte ajoute :
- la **réécriture obligatoire** d'une ou deux phrases corrigées, vérifiée (la correction est-elle appliquée ?) ;
- des explications dans la **L1** de l'apprenant, et une catégorie « calques de la L1 » paramétrée par le couple de langues ;
- l'erreur récurrente transformée en carte dès la deuxième occurrence, et en exercice dès le lendemain.

**L'oral**, par coût croissant :

| Activité | Vérification | Coût |
|---|---|---|
| Écoute avec anticipation (produire avant d'entendre) | Auto-évaluation | Nul (audio en cache) |
| Shadowing, réécoute de soi côte à côte | Auto-évaluation | Nul |
| Dictée | Automatique (texte) | Nul |
| « Écrire puis dire » (existant) | Écrit corrigé, oral libre | Celui de la correction |
| Prise de parole transcrite et corrigée | Transcription serveur + correction | Sous quota |
| Jeu de rôle à tâches bornées (3 objectifs, fin claire) | Bilan : 3 erreurs, 3 tournures plus naturelles | Sous quota, d'abord en texte |

Le retour sur l'oral doit **discriminer** : une phrase fausse ne reçoit jamais un score parfait (leçon de Speak). Ce qui n'est pas vérifié est affiché comme « déclaré ».

## 7. La langue maternelle

- Toute L1 est acceptée (liste ISO 639-1). Les explications générées (sens des mots, corrections, consignes) sont produites dans la L1.
- Les contenus curés restent rédigés dans une langue pivot (le français, déjà écrit) ; leur traduction vers une L1 est générée une fois, mise en cache, relue par les agents, marquée « traduction automatique » jusqu'à relecture.
- Aux niveaux B2 et plus, l'apprenant peut choisir des explications **dans la langue cible**.
- Le français devient une langue cible.

## 8. Qualité des contenus

Statuts `draft` → `ai-reviewed` → `native-reviewed`. Rien de `draft` n'est montré en production. La relecture IA suit deux passes indépendantes et un arbitrage (agents `relecteur-natif` et `arbitre-relecture`) ; `reviewedOn` et `checkedOn` restent réservés à un humain. Chaque exercice porte un bouton « signaler une erreur » ; un élément signalé plusieurs fois repasse en relecture.

## 9. Ce qui reste à valider par l'usage

- Le barème de temps de la séance de 10 minutes (tient-elle vraiment en 10 minutes ?).
- Le modèle d'estimation du niveau : simple (type Elo) au départ, recalibré quand les données existent.
- La qualité des textes gradués en A1 dans les langues éloignées (japonais, arabe) : à évaluer par un jeu d'essai avant ouverture.
