# g. Budget

Plafond décidé : **10 € par mois** pour l'API, tout compris. Les prix utilisés sont ceux relevés dans `docs/plans/roadmap-plateforme.md` §6.1 (vérifiés le 2026-11-05) : Haiku 5.5 à 0,10 $ et 0,50 $ par million de tokens en entrée et en sortie, Batch à −50 %, lecture du cache de prompt à environ 10 % du prix d'entrée. **Ils sont à revérifier au jalon 1, et les volumes ci-dessous sont des estimations** tant que `ai_call` n'a pas mesuré l'usage réel.

## 1. Ce qui coûte, et à qui

| Catégorie | Exemples | Qui paie |
|---|---|---|
| **Partagé** : généré une fois, servi à tous | Texte gradué, segmentation et lemmes, gloses par L1, audio, traduction d'une fiche curée | Le stock, quel que soit le nombre d'apprenants |
| **Personnel** : un appel par action d'un apprenant | Correction d'une production, vérification de la réécriture, jeu de rôle, transcription | Chaque apprenant actif |
| **Hors budget** | Rédaction et relecture des contenus versionnés (sessions Claude Code), calculs locaux (FSRS, XP, couverture) | Abonnement Claude, zéro appel |

## 2. Coût unitaire estimé

| Appel | Entrée / sortie (tokens) | Mode | Coût |
|---|---|---|---|
| Texte gradué + questions + exercices | 3 000 / 3 000 | Batch | ≈ 0,0009 $ |
| Relecture du texte (second appel) | 2 000 / 500 | Batch | ≈ 0,0002 $ |
| Segmentation, lemmes et gloses pour une L1 | 2 000 / 2 500 | Batch | ≈ 0,0007 $ |
| Correction d'une production | 3 000 / 3 000 | Immédiat, cache de prompt | ≈ 0,0017 $ |
| Vérification d'une réécriture | 800 / 200 | Immédiat | ≈ 0,0002 $ |
| Jeu de rôle écrit, 8 tours | 15 000 cumulés / 3 000 | Immédiat, cache | ≈ 0,0025 $ |
| Traduction d'une fiche curée vers une L1 | 2 500 / 2 500 | Batch | ≈ 0,0008 $ |
| Audio d'un texte (≈ 1 000 caractères) | — | Azure, offre gratuite | 0 $ dans la limite de 500 textes par mois |
| Transcription d'une prise de parole (≈ 1 min) | — | Azure, offre gratuite | 0 $ dans la limite de 5 h par mois |

## 3. Coût par apprenant actif et par mois

Hypothèse : 22 séances par mois.

| Poste | Volume mensuel | Coût |
|---|---|---|
| Corrections de production | 22 | 0,037 $ |
| Vérifications de réécriture | 22 | 0,004 $ |
| Jeux de rôle écrits | 6 | 0,015 $ |
| Textes à la demande (bibliothèque), part non partagée | 4 | 0,007 $ |
| **Total personnel** | | **≈ 0,06 à 0,07 $** |

**Stock partagé.** Un texte complet (génération, relecture, gloses pour deux L1) revient à environ 0,0025 $. Le stock n'est produit que pour les cases *langue × niveau* qui ont des apprenants actifs : avec 15 cases actives et un texte par jour, ≈ 450 textes par mois, soit **≈ 1,1 $**. Les traductions de fiches curées sont un coût unique par L1 (342 fiches ≈ 0,27 $ par L1).

**Ordre de grandeur : 0,10 $ par apprenant actif et par mois**, stock compris, pour une cinquantaine d'actifs.

## 4. Tenir 10 € : la capacité

| Enveloppe | Montant | Ce qu'elle couvre |
|---|---|---|
| Usage personnel | ≈ 5 € | ≈ 70 apprenants actifs à 0,07 $ |
| Stock partagé | ≈ 2 € | ≈ 800 textes complets par mois |
| Qualité | ≈ 2 € | Relecture par échantillon des textes générés par un modèle plus fort, en Batch (seule exception à « Haiku uniquement », hors du parcours de l'utilisateur — point à trancher) |
| Marge | ≈ 1 € | Reprises, pics |

Capacité prudente : **50 apprenants actifs par jour**, avec de la marge. Le facteur limitant n'est pas l'IA mais la voix gratuite : 5 h de transcription par mois, soit **6 minutes par apprenant et par mois** à 50 actifs. L'oral repose donc d'abord sur les activités sans transcription (anticipation, shadowing, dictée), et la prise de parole transcrite est une tâche courte, hebdomadaire, sous quota.

## 5. Mécanismes

1. **Tout appel passe par un point unique** qui écrit `ai_call` (objet, modèle, tokens, coût, utilisateur). `npm run cost:report` donne le coût du mois, par objet et par apprenant.
2. **Quotas par apprenant et par jour** : 3 corrections, 1 jeu de rôle, 2 textes à la demande, 2 minutes de transcription ; refus propre et expliqué quand le plafond est atteint. Comptes invités : quotas réduits et plafond global (existant).
3. **Partage systématique** : clé de cache = langue, niveau, thème, version du prompt. Un texte déjà en stock n'est jamais régénéré pour un autre apprenant.
4. **Batch pour tout ce qui n'est pas immédiat** : le stock du lendemain est préparé la nuit.
5. **Cache de prompt** sur les consignes longues (correction, jeu de rôle).
6. **Effort minimal suffisant**, validé par les jeux d'évaluation avant tout changement.
7. **Disjoncteur** : à 80 % du budget mensuel, alerte ; à 100 %, arrêt des générations non essentielles (bibliothèque à la demande, jeux de rôle). Les séances continuent sur le stock, les révisions ne coûtent rien, et la correction bascule sur un quota réduit. Rien ne se bloque brutalement pour l'apprenant.
8. **Plafond de dépense** réglé aussi dans la console Anthropic, par le propriétaire.

## 6. Voix : gratuit d'abord

| Besoin | Solution | Limite |
|---|---|---|
| Audio des textes et dialogues | Synthèse neuronale Azure (offre gratuite), fichier stocké une fois | 0,5 million de caractères par mois ≈ 500 textes ; droits d'usage commercial à confirmer avant toute vente |
| Audio d'un mot isolé | Même fichier que la phrase quand c'est possible ; sinon voix de l'appareil | Qualité variable |
| Transcription | Azure (offre gratuite), enregistrement non conservé | 5 h par mois, une requête à la fois |
| Évaluation de la prononciation | Reportée | Puise dans les mêmes 5 h |

Stockage : un texte audio pèse ≈ 0,3 à 0,5 Mo ; 1 Go de stockage gratuit ≈ 2 500 textes. À surveiller, avec purge des textes jamais ouverts.

## 7. Autres coûts, hors de ce plafond

Supabase et Vercel restent sur leurs offres gratuites tant que l'usage est personnel et en test ; **une exploitation commerciale impose des offres payantes** (conditions de Vercel, limites de Supabase). C'est une dépense à décider au moment de la vente, pas avant. Compte développeur Apple et Google : au jalon des apps natives.

## 8. Au-delà de 50 apprenants

Le coût marginal d'un apprenant (≈ 0,07 $ par mois, ≈ 1 à 2 $ avec de l'oral transcrit quotidien au tarif payant) est très inférieur au prix d'un abonnement. La croissance se finance donc par une offre payante, qui exigera `CONTENT_LICENSE_POLICY=commercial` et la vérification des droits sur l'audio.

## 9. Coût du jalon 0

Aucun appel à l'API de l'app : audit en mode démo, benchmark et conception dans cette session Claude Code. **Coût API mesuré : 0 €.**
