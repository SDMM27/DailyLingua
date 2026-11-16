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

## 3. Tableau de résultats

Appareil : iPhone 14 Pro · iOS : 26.5 (Safari 26.5 ; l'agent utilisateur affiche encore « iPhone OS 18_7 », valeur figée par Apple) · Date : 2026-11-16 · Testeur : propriétaire du produit

Serveur : version de production sur le poste, exposée par deux tunnels Cloudflare temporaires (app et Supabase local), clés VAPID dans `apps/web/.env.local` (non commité). Compte invité.

| Vérification | Installé (écran d'accueil) | Safari (onglet) | Notes |
| --- | --- | --- | --- |
| Mode installé détecté | oui | n/a | lancée depuis l'écran d'accueil, https |
| Service worker actif | oui | oui | enregistré et aux commandes de la page |
| Quota de stockage / persistance | oui | oui | 1,7 Mo utilisés, quota estimé 39 Go, stockage déjà persistant avant la demande |
| Micro : permission | accordée une seule fois | oui | pas de nouvelle demande aux enregistrements suivants |
| Micro : format et taille | MP4/AAC | oui | formats acceptés : `audio/mp4` (AAC) et `audio/webm` (Opus) ; utilisé : `audio/mp4; codecs=mp4a.40.2`, 48 kHz ; 117 090 octets pour 5 s (≈ 23 Ko/s, ≈ 1,4 Mo par minute) |
| Micro : réécoute | oui, qualité assez bonne | oui | reprise après verrouillage de l'écran : non testée |
| Voix de synthèse : voix pour la langue | 1 (russe) | oui | 68 voix installées ; ru-RU : « Милена », locale |
| Voix de synthèse : lecture audible | oui, sonnerie coupée comprise | oui | « Доброе утро » lue en entier |
| Reconnaissance vocale : disponible | oui | oui | `webkitSpeechRecognition` |
| Reconnaissance vocale : texte reconnu | oui | oui | « Привет меня зовут Саша » (confiance 100 %) et « Я хочу хлеба » (94 %) reconnus exactement |
| Notifications : permission | accordée | n/a | |
| Notifications : abonnement | oui | n/a | point d'accès `web.push.apple.com` |
| Notifications : réception | oui | n/a | notification d'essai reçue ; écran verrouillé et app fermée, ouverture de `/lab` au toucher et délai : non notés |
| File hors ligne : envoi au retour du réseau | oui | oui | état « hors ligne » en mode avion, événements envoyés seuls au retour du réseau |
| File hors ligne : survit à la fermeture | non testé | non testé | |
| Page hors ligne affichée | non testé | n/a | |

## 4. Ce qui sort de ce test

**Rien ne bloque.** Les risques techniques que ce prototype devait lever le sont sur iOS 26.5 ; aucun plan B n'est nécessaire dans `i-jalons-suivants.md`.

**Jalon 2 (notification quotidienne).** Web Push fonctionne dans la PWA installée : le rappel passe par le push, sans canal de secours. Comme le prévoit `c-game-design.md` §3.10, la permission est demandée après un geste, après la deuxième séance terminée et seulement dans l'app installée ; dans Safari, l'app propose d'installer la PWA. Le stockage étant persistant et le quota large, la séance du jour peut être préchargée entière (texte, audio, exercices). À observer au premier envoi réel : réception écran verrouillé et app fermée, ouverture de la bonne page au toucher.

**Jalon 5 (oral).** Contrairement à l'hypothèse de `d-architecture.md` §2 (« reconnaissance du navigateur inopérante en PWA installée sur iOS »), la reconnaissance vocale du navigateur marche, dans l'app installée comme dans Safari, et a reconnu deux phrases russes sans erreur. Conséquences :
- la dictée orale, le shadowing et la réponse orale aux cartes peuvent utiliser la reconnaissance de l'appareil, à coût nul, sans puiser dans les 5 h mensuelles d'Azure ;
- Azure reste utile pour la prise de parole longue corrigée et pour les navigateurs sans reconnaissance (repli détecté à l'exécution, derrière l'interface `speech`) ;
- la confiance renvoyée (100 %, 94 %) ne mesure pas la prononciation : on note le texte reconnu comparé au modèle, jamais la confiance ;
- l'enregistrement en MP4/AAC (≈ 1,4 Mo par minute) convient à l'envoi au serveur ; il n'est jamais conservé après transcription.

À confirmer au jalon 5 : d'autres langues (japonais, arabe), la reconnaissance hors ligne, la reprise d'un enregistrement après verrouillage de l'écran.

**Jalon 7 (rétention).** Le résumé hebdomadaire du dimanche peut passer par la même notification. Rien ne change dans le plan.

**Non observé sur l'iPhone, à refaire à la prochaine occasion** (sans bloquer le jalon 2) : survie de la file à la fermeture complète de l'app en mode avion, page « Pas de connexion » et relance hors ligne depuis l'icône. Les tests e2e couvrent la page hors ligne servie réseau coupé, mais pas sur un appareil réel.
