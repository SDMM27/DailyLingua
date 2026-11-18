# Design « journal du matin »

Référence de la refonte graphique (branche `redesign/journal`). Maquette validée : canevas Claude Design,
artboards « DailyLingua-journal » clair et sombre. Design system : `@sdmm/design`, thème `dailylingua`.

## Principes

- **Une de journal.** Papier crème, encre, accent indigo. Titres en serif Newsreader (`sd-display` ou
  `font-serif`), corps en Inter, métadonnées en JetBrains Mono capitales (`kicker`).
- **Un seul gabarit.** Le contenu de chaque page vit dans `<main class="page-x">` (layout) : même bord
  gauche et droit que le masthead, sur toute l'app. Ne jamais recentrer une page dans un `max-w-md` /
  `max-w-xl` / `max-w-3xl` isolé au milieu de l'écran. Pour occuper la largeur sur desktop : colonnes
  (`Columns`, grilles `md:grid-cols-2`, `lg:grid-cols-3`...) séparées par des filets. Un texte long garde une
  mesure lisible (`max-w-[68ch]`) mais reste calé à gauche sur la grille.
- **Filets plutôt que bulles.** Sections séparées par `border-t border-ink` (filet fort) ou
  `border-line` (filet fin), colonnes par `border-l border-line`. Les encadrés (`Card`) restent pour les
  éléments interactifs ou à part ; pas de cartes empilées partout, pas de barre colorée à gauche des
  cartes, pas d'ombres.
- **Rubriques en italique.** Titres de section : `SectionTitle` (serif italique gras sur filet). Petits
  intitulés : `Eyebrow` (mono capitales, accent).
- **Numérotation romaine** (I, II, III, IV) pour les étapes et sommaires, en serif 800, couleur accent.
- **Une seule animation signature par écran** (`sd-ink`, `sd-mark`, `sd-marquee`...), toutes coupées
  sous `prefers-reduced-motion` par le design system.

## Tokens (Tailwind)

| Usage | Classe |
| --- | --- |
| Fond de page / papier | `bg-paper` (= `bg-bg`) |
| Encadré | `bg-surface` |
| Fond enfoncé, piste | `bg-surface-sunk` (= `bg-surface-2`) |
| Texte, filet fort | `text-ink`, `border-ink` |
| Texte secondaire | `text-ink-soft` |
| Métadonnées | `text-muted` |
| Filet fin | `border-line` |
| Action principale | `bg-accent text-accent-ink` |
| Texte coloré (liens, actifs) | `text-accent-strong` — jamais `text-accent` pour du texte |
| Touche secondaire | `bg-accent-2` (rare) |
| Surligneur | `bg-marker` ou `.sd-mark` |
| Statuts | `success`, `danger` (+ `-soft`) |
| Couleurs de langue | `languageStyle(lang)` uniquement |

Le sombre est automatique (`data-theme` + bascule dans le masthead) : ne jamais écrire de couleur en dur ni
de `dark:` sauf nécessité.

## Composants partagés (`src/components/ui`)

- `buttonClass.primary | secondary | quiet` : boutons (pilule accent, contour encre, texte). Remplace les
  `bg-ink text-paper` des actions principales.
- `PageHeader` (eyebrow, title, children = chapeau, aside = action à droite), `SectionTitle`, `Eyebrow`,
  `Card`, `Columns` (colonne principale + colonne latérale à filet), `ProgressBar`, `LanguageTag`, `Pill`,
  `DemoNotice`, `Ticker` (bandeau « Parutions »).
- Utilitaires CSS : `page-x`, `kicker`, `rule-double`, `dropcap`, `sd-display`, `sd-ink`, `sd-mark`.

## Contraintes

- Refonte visuelle uniquement : ni logique, ni données, ni routes, ni textes visibles, ni noms accessibles
  (les tests Vitest et Playwright s'appuient dessus).
- Mobile d'abord : 360 px sans scroll horizontal, cibles ≥ 44 px, champs ≥ 16 px, safe areas.
- Contraste AA en clair et en sombre.
