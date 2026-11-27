# Jalon 8 — Bascule, puis natif

Sources : [jalons suivants](../i-jalons-suivants.md) (« Jalon 8 »), [plan de migration](../f-plan-de-migration.md), [indicateurs](../h-indicateurs.md).

**Livrable** : tous les utilisateurs sont sur la nouvelle application, sans perte. **Règle absolue** : aucune étape qui lit ou écrit les données de production, rend l'ancienne application en lecture seule ou change le domaine n'est lancée sans l'accord explicite du propriétaire, donné dans la conversation, étape par étape.

## 1. Ce qui existe déjà (jalon 1 et suivants)

- Schéma `app` en production (migrations additives), `public` intact.
- `app.migrate_user(uuid)`, `app.migrate_all()` : reprise rejouable, inscrite dans `app.legacy_map`, resynchronisation complète tant que `profile.app_active_since` est nul.
- `app.verify_migration()` : contrôles de non-perte du §6 du plan (comptes, sommes de contrôle, échéances, lignes sans correspondance).
- `npm run migration:verify` : migration et contrôle sur la base **locale** seulement (refuse tout autre hôte).
- `app.claim_legacy_data` : reprise à la demande d'un compte qui se connecte à la nouvelle app.
- Tests pgTAP : `app_migration`, `app_resync`, `app_claim_legacy_data`.

## 2. Ce que ce jalon ajoute (sans toucher la production)

| Lot | Contenu | Touche la prod ? |
|---|---|---|
| 8.1 | Cette spec | Non |
| 8.2 | Navigation sur PC (barre latérale à partir de 1024 px, écrans plus larges, lecteur à longueur de ligne bornée) | Code de l'app seulement (mise en ligne par Vercel) |
| 8.3 | `migration:rehearse` (répétition complète, mode à blanc par défaut) et `migration:rollback` (script inverse, à blanc par défaut), refusant tout hôte non local | Non |
| 8.4 | Écrans manquants pour les usages essentiels (voir §4) | Code de l'app ; **nouveaux écrans : maquettes à choisir par le propriétaire** |
| 8.5 | Squelette Expo sur les paquets partagés | Non (après la bascule) |

## 3. Étapes de la bascule

| Étape | Où | Ce qui est fait | Qui décide |
|---|---|---|---|
| R0 | Local | `npm run migration:rehearse -- --dry-run` sur le jeu d'exemple, puis sans `--dry-run` ; deux passages, aucune différence | Session |
| R1 | Local, **copie de la production** | Le propriétaire produit une sauvegarde (`supabase db dump --data-only` ou export du tableau de bord) et la restaure dans une pile locale **jetable** ; `migration:rehearse` ; rapport joint | **Accord** pour faire la sauvegarde ; le fichier ne quitte pas la machine et n'est jamais commité |
| R2 | Local, copie | `migration:rollback -- --since <date>` après des écritures simulées dans la nouvelle app ; les révisions et productions reviennent dans `public` | Session |
| M3 | Production, schéma `app` | `migrate_all` à blanc puis réel, `verify_migration` vide | **Accord explicite** |
| M4 | Préversion | Volontaires, marqueur `migrated_at` | **Accord** |
| M5 | Bascule | Ancienne app en lecture seule, dernière reprise incrémentale, `verify_migration` vide, changement de domaine | **Accord explicite** après les deux conditions du §4 et un rapport R1 vert |
| M6 | +30 jours / +90 jours | Ancienne app accessible en lecture seule 30 jours ; `public` conservé 90 jours, puis export et archive | **Accord explicite** avant toute suppression |

### Ancienne application en lecture seule (M5, 30 jours)

Préparé mais non activé : une variable d'environnement de l'ancienne app (`LEGACY_READ_ONLY=1`) masque les actions d'écriture et affiche un bandeau vers la nouvelle adresse ; côté base, une migration révoque `insert/update/delete` sur les tables `public` pour `authenticated` (réversible par la migration inverse). Les deux sont écrits et testés en local avant M5 et appliqués seulement le jour de la bascule, sur accord.

### Retour arrière

| Moment | Action |
|---|---|
| Avant M5 | Rien : l'ancienne app sert toujours. |
| M4 | Retrait de `migrated_at`. |
| M5 à M5 + 30 j | Domaine repointé vers l'ancienne app, levée de la lecture seule, `migration:rollback` réinjecte dans `public` les révisions de cartes et les productions faites depuis la bascule (seules données que l'ancienne app sait lire). Testé en R2. |
| Au-delà | Restauration depuis la sauvegarde. |

## 4. Les deux conditions avant la bascule générale

Audit du 2026-11-28 de `apps/web` (dev, après le jalon 7) contre la grille §6.1.

| Usage | Ancienne app | Nouvelle app | État |
|---|---|---|---|
| Grammaire et alphabet | `/grammaire`, `/alphabet` | Fiches dans les unités du parcours seulement ; pas de liste de fiches ni d'alphabet | **Manquant** |
| Vocabulaire | `/vocabulaire` (mots, listes, ajout, révision) | Cartes migrées et révisées dans la séance ; aucun écran pour retrouver, ajouter ou modifier ses mots et listes | **Manquant** |
| Historique et productions | `/historique`, `/productions` | Correction visible juste après l'écriture ; aucun écran pour rouvrir une production passée ou une mission archivée (`legacy_mission`) | **Manquant** |
| Niveau et bilan | `/niveau` | Bilan d'unité dans le parcours ; test de niveau refondu et résultats repris non exposés | **Manquant** |
| Lecture et sources | `/lire` | `/library`, `/library/[id]` avec source | Couvert (à recetter) |
| Navigation sur PC | — | Tout l'écran confiné à 448 px, barre d'onglets en bas | **Manquant** → lot 8.2 |

Conséquence : **M5 est bloqué** tant que les quatre usages manquants n'ont pas d'écran. Ce sont de nouveaux écrans : le circuit prévoit deux maquettes par écran et le choix du propriétaire. Ordre proposé : vocabulaire, historique et productions, niveau et bilan, grammaire et alphabet.

Recette avant M5 : un compte repris et un compte neuf, à 390, 1280 et 1440 px ; captures jointes au rapport de bascule.

## 5. Suivi des indicateurs à trois mois

- Avant M5 : figer la rétention Leitner actuelle (`metrics:report` sur la copie R1), et J7 de l'ancienne app.
- Chaque mois pendant trois mois : `metrics:report` et `metrics:report -- --drift` ; lecture des critères de réussite du document h §5 (aucune perte, achèvement > 75 %, J7 ≥ ancienne app, rétention ≥ actuelle pour moins de temps, 60 % des actifs progressent, < 10 €/mois, AA).
- Les chiffres restent indicatifs avec quelques dizaines d'utilisateurs.

## 6. Décisions attendues du propriétaire

1. Faire la sauvegarde de production pour R1 (et où la restaurer).
2. Lancer les maquettes des quatre écrans manquants.
3. Puis seulement : M3, M4, M5, M6, chacune sur accord.
