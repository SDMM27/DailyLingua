# Prototype iPhone : protocole de test de `/lab`

Objectif : savoir, sur un iPhone réel, ce que la PWA peut faire (installation, micro, voix, reconnaissance vocale, notifications, hors ligne) avant de bâtir dessus les exercices oraux et les rappels. Rien de ce qui est enregistré ou essayé n'est envoyé au serveur ; l'abonnement push n'est pas stocké.

Références : `00-audit-et-benchmark.md` §5 (ce qu'on sait et ce qu'on ignore de l'oral et du push sur iOS), `d-architecture.md` §6 (hors ligne).

## 1. Préparer le serveur

La page tourne sur la **version de production** (`npm run build` puis `npm run start` dans `apps/web`) : le service worker est désactivé en développement. iOS exige **https** pour le micro, le service worker et le push : utiliser un déploiement de test ou un tunnel https vers le port 3200.

### Clés VAPID (notifications)

Les clés ne sont jamais commitées. Les générer une fois :

```
npx web-push generate-vapid-keys
```

La commande affiche une clé publique et une clé privée. Les poser dans l'environnement du serveur (variables de l'hébergeur, ou `apps/web/.env.local`, ignoré par git) :

| Variable | Valeur | Remarque |
| --- | --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | clé publique | lue à l'exécution par `/lab` ; publique |
| `VAPID_PRIVATE_KEY` | clé privée | secrète ; sans elle `/lab/push-test` ne fait rien (503) |
| `VAPID_SUBJECT` | `mailto:…` ou `https://…` (facultatif) | adresse de contact transmise aux services push ; par défaut l'origine du site |

Sans clé publique, la carte « Notifications » ne teste que la permission.

## 2. Protocole pas à pas (iPhone, iOS 16.4 ou plus)

1. Ouvrir l'adresse du serveur dans **Safari**, se connecter (ou créer un compte et finir l'installation).
2. Installer sur l'écran d'accueil : bouton Partager, « Sur l'écran d'accueil », Ajouter. Fermer Safari.
3. Lancer l'app **depuis l'icône** (c'est la seule façon d'avoir le mode installé et le push). Aller dans Réglages, « Outils de test ».
4. Ouvrir chaque carte, une à la fois, toucher son bouton, puis **copier le résultat** (bouton « Copier le résultat ») et le coller dans le tableau du §3.

| Carte | Quoi faire | Quoi noter |
| --- | --- | --- |
| Installation et stockage | « Vérifier » | « Lancée depuis l'écran d'accueil » doit valoir oui ; service worker « aux commandes » ; quota ; stockage persistant avant et après la demande |
| Micro | « Enregistrer 5 secondes », accepter la permission, parler, réécouter | permission demandée à chaque fois ou une fois ; format utilisé (MP4/AAC attendu) ; taille ; durée mesurée ; qualité à l'écoute ; l'enregistrement redémarre-t-il après un verrouillage d'écran ? |
| Voix de synthèse | « Écouter une phrase » (essayer aussi en changeant la langue apprise dans les réglages) | nombre de voix pour la langue ; voix choisie, locale ou en ligne ; la phrase est-elle audible (sonnerie coupée comprise) ; erreur éventuelle |
| Reconnaissance vocale | « Essayer », dire une phrase | interface disponible ou non, dans l'app installée **et** dans Safari ; texte reconnu ; confiance ; code d'erreur |
| Notifications | « Activer les notifications » (accepter), puis « Envoyer une notification d'essai » | permission ; abonnement obtenu ; réponse du serveur ; la notification arrive-t-elle écran verrouillé, app fermée ; toucher la notification ouvre-t-il `/lab` ; délai |
| Mode hors ligne | « Mettre 3 événements en file » en ligne (3 envoyés), puis **mode avion**, remettre 3 événements, constater 3 en attente, puis couper le mode avion | les 3 partent-ils seuls ; en combien de temps ; survivent-ils à la fermeture complète de l'app pendant le mode avion (rouvrir l'app, constater « Événements en attente ») |

5. Hors ligne, page de secours : app installée, mode avion, ouvrir « Réglages » : la page « Pas de connexion » doit s'afficher à la place d'une page blanche. Noter aussi si l'app se relance hors ligne depuis l'icône.
6. Refaire les cartes Micro, Voix et Reconnaissance **dans Safari** (non installé) pour comparer.

## 3. Tableau de résultats (à remplir)

Appareil : ______ iOS : ______ Date : ______ Testeur : ______

| Vérification | Installé (écran d'accueil) | Safari (onglet) | Notes (copier le résultat) |
| --- | --- | --- | --- |
| Mode installé détecté | | n/a | |
| Service worker actif | | | |
| Quota de stockage / persistance | | | |
| Micro : permission | | | |
| Micro : format et taille | | | |
| Micro : réécoute | | | |
| Voix de synthèse : voix pour la langue | | | |
| Voix de synthèse : lecture audible | | | |
| Reconnaissance vocale : disponible | | | |
| Reconnaissance vocale : texte reconnu | | | |
| Notifications : permission | | n/a | |
| Notifications : abonnement | | n/a | |
| Notifications : réception écran verrouillé | | n/a | |
| File hors ligne : envoi au retour du réseau | | | |
| File hors ligne : survit à la fermeture | | | |
| Page hors ligne affichée | | | |

## 4. Ce qui sort de ce test

Les cases remplies décident : voix de synthèse seule ou aussi reconnaissance vocale côté navigateur (sinon enregistrement puis reconnaissance côté serveur, hors de ce prototype), push possible ou rappels par un autre canal, durée de vie de la file hors ligne.
