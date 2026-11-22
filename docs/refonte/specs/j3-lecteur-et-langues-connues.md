# Jalon 3 — Lecteur et langues déjà connues

Proposition de cadrage pour la préversion aux volontaires. Le [plan des jalons](../i-jalons-suivants.md) et le [modèle de données](../d-architecture.md) fixent le périmètre du lecteur.

## 1. Lire, comprendre et réviser

L’apprenant A2 choisit un texte dans la bibliothèque ou ouvre celui de sa séance. Avant la lecture, il voit le niveau et une estimation de la part du texte qu’il connaît. Une couverture indisponible s’affiche comme telle. Les mots et expressions touchables conservent la ponctuation et la mise en page du texte. Un toucher affiche le sens dans le contexte, dans la langue des explications. L’apprenant peut ensuite ajouter une carte à sa file de révisions avec la phrase source. Ajouter deux fois la même occurrence doit ramener à la carte existante.

La bibliothèque ne sert que des textes publiés. Les textes authentiques conservent leur source, leur licence et leur attribution. L’audio pré-généré est partagé par texte et adapté à sa langue. Un texte reste accessible si son audio est en préparation.

## 2. S’appuyer sur les langues déjà connues

Après le choix de la langue cible, proposer une sélection multiple facultative sous la question « Quelles autres langues comprends-tu ou parles-tu déjà ? ». L’action « Passer » permet de terminer l’inscription. Les réglages permettent d’ajouter ou de retirer une langue à tout moment. Une langue peut servir d’appui même si elle ne figure pas parmi les langues cibles. La langue des explications peut également servir d’appui.

Le profil conserve ces langues sous forme de codes du registre. L’absence de données laisse les comptes existants dans leur parcours actuel. La sélection des langues suffit pour le pilote, avec des indications de maîtrise à envisager selon les résultats.

Le panneau du mot affiche un exemple ou un faux ami uniquement s’il existe une comparaison relue pour la langue connue, la langue cible et le sens rencontré. L’unité éditoriale est un couple orienté associé à un sens lexical. La famille linguistique peut guider la rédaction et les liens de navigation futurs. Le niveau de départ, la couverture et les mots prouvés restent calculés à partir des preuves du parcours.

Le pilote porte sur l’espagnol vers l’italien. Par exemple, dans une phrase où l’italien *importante* signifie « important », le panneau peut signaler que l’espagnol *importante* a le même sens. Un faux ami se présente avec une courte phrase et les deux sens. En l’absence de comparaison relue, le panneau affiche le sens et l’action d’ajout aux révisions. Les observations du pilote pourront guider un deuxième lot, du russe vers l’ukrainien.

## 3. Ordre de livraison

1. **Premier parcours complet.** Publier un texte A2 de test, brancher sa segmentation, les sens contextuels et l’ajout d’une carte dans la file FSRS. Utiliser le même lecteur depuis la bibliothèque et la séance.
2. **Publication et lecture à l’échelle.** Ajouter les états de mots, la mesure de couverture, l’audio et le parcours de génération et de relecture partagé. Les volontaires doivent pouvoir lire et écouter un texte complet et retrouver sa carte dans les révisions.
3. **Pilote de comparaison.** Brancher la sélection de langues et les notes relues. Sur un petit jeu de phrases, comparer la compréhension immédiate et la reconnaissance du même sens dans une phrase nouvelle. Relever aussi si la question facultative fait abandonner l’inscription.

Les vérifications fonctionnelles couvrent le parcours à 390 px en clair et en sombre, un compte existant, un compte qui passe la sélection, l’ajout puis le retrait de l’espagnol et le retour à la même carte sans doublon. Un test vérifie qu’une note espagnole n’apparaît que pour les apprenants qui ont choisi cette langue ou l’utilisent pour les explications.

## Après le pilote

Un assistant Qwen avec recherche dans les textes et les fiches relues reste une piste facultative. Le premier usage à évaluer serait une explication de phrase avec des références au contenu consulté. Son hébergement, son coût par apprenant et sa disponibilité hors ligne pourront être évalués séparément.
