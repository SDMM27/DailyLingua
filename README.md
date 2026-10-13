# Daily Lingua

Une mission linguistique quotidienne construite à partir de contenus authentiques (presse, podcasts, interviews, vidéos), adaptée au niveau, aux intérêts et au temps disponible.

Pensée d’abord pour le téléphone : web app installable sur l’écran d’accueil (PWA), avec une app native envisagée plus tard pour l’App Store et le Play Store.

> **État actuel : phase 1.** L’interface est complète et fonctionne sur des **données de démonstration**. Rien n’est encore enregistré : base de données en phase 2, persistance en phase 3.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir l’URL affichée (par défaut http://localhost:3000).

### Sur iPhone (même réseau Wi-Fi)

Pour tester sur téléphone, utiliser **`npm run preview`** (build de production) plutôt que `npm run dev`. Le mode dev envoie environ 3,7 Mo de JavaScript non minifié et compile chaque page à la première visite, ce qui est très lent sur mobile. En production, c'est environ 175 Ko.

1. `npm run preview` affiche une ligne `Network: http://192.168.x.x:3000`.
2. Ouvrir cette adresse dans Safari sur l’iPhone.
3. Partager → **Sur l’écran d’accueil**. L’app s’ouvre alors en plein écran, sans la barre de Safari.

Si la page ne s’ouvre pas, autoriser Node.js dans le pare-feu Windows (réseau privé).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build de production / serveur de production |
| `npm test` | Tests unitaires et de composants (Vitest) |
| `npm run typecheck` | Vérification TypeScript (génère d’abord les types de routes) |
| `npm run lint` | ESLint |
| `npm run check` | Typecheck + lint + tests |

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript** strict
- **Tailwind CSS 4** (tokens de design dans `src/app/globals.css`)
- **Zod 4** : validation aux frontières (données, formulaires)
- **Vitest** + Testing Library : tests de la logique métier et des composants
- À venir : Supabase (PostgreSQL, auth, RLS), un fournisseur de LLM derrière une interface, une tâche planifiée quotidienne

## Structure

```
src/
  app/                  Pages, layouts, manifest PWA, icônes générées
  components/
    ui/                 Primitives (Card, ProgressBar, LanguageTag…)
    layout/             Barre d’onglets (mobile) et barre du haut (desktop)
    dashboard/ mission/ vocabulary/ preferences/
  lib/
    domain/             Logique métier pure : dates et fuseaux, budget temps,
                        répétition espacée, statistiques, registre des langues
    schemas/            Schémas Zod et types dérivés
    data/               Accès aux données (interface + implémentation de démo)
```

`lib/domain` et `lib/schemas` ne dépendent ni de Next.js ni de React : ils pourront être réutilisés tels quels par une app native.

## Choix importants

- **Langues extensibles.** Toutes les langues sont décrites dans `src/lib/domain/languages.ts`. Ajouter une langue = ajouter une entrée. L’utilisateur choisit 1 à 4 langues, chacune avec un poids ; le temps quotidien est réparti proportionnellement.
- **Fuseau horaire.** Les jours sont des clés `YYYY-MM-DD` calculées dans le fuseau de l’utilisateur (Europe/Paris par défaut), ce qui évite les décalages autour de minuit et des changements d’heure.
- **Honnêteté sur les contenus.** Quand un contenu n’a pas de transcription accessible, l’app le signale et ne propose pas de quiz détaillé.
- **Accès aux données derrière une interface** (`DailyLinguaRepository`) : la phase 2 remplacera l’implémentation de démo par Supabase sans toucher aux pages.
