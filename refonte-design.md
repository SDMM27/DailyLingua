# Refonte design — DailyLingua « journal du matin »

Prompt à coller dans une nouvelle session Claude Code ouverte dans ce repo.

```text
Refonte graphique de DailyLingua selon le design « journal du matin » que j'ai validé.

SOURCES DE VÉRITÉ
- Maquettes : canevas https://claude.ai/artifact/Vbxx9FJqKA8saM3UdqQ8wu, artboards « DailyLingua-journal.dc.html » (clair) et « DailyLingua-journal-sombre.dc.html » (sombre). Lis-les avec l'outil Artifact (action read) avant de coder ; ce sont des maquettes HTML, pas du code à copier tel quel.
- Design system : paquet @sdmm/design, à installer avec `npm i github:SDMM27/sdmm-design#v1.0.0`. Lis son README (node_modules/@sdmm/design/README.md) : thème « dailylingua », intégration Tailwind 4 (`@sdmm/design/tailwind/v4.css` + `css/all-dailylingua.css`), fontsUrl('dailylingua'), classes .sd-display, .sd-ink, .sd-mark, .sd-marquee, initCountUp, initTheme/themeScript.

DIRECTION VALIDÉE
Papier crème #f5f1e8 et accent indigo, titres en serif Newsreader, corps en Inter, détails techniques en JetBrains Mono. Une de journal : masthead « Daily Lingua » révélé à l'encre avec la date du jour, filets de colonnes et rubriques en italique, bandeau « Parutions » qui défile, mots de vocabulaire surlignés au marqueur (un clic affiche la traduction), sommaire en colonnes numérotées I à IV, frise de répétition espacée. Mode clair ET sombre, avec un bouton de bascule ; le clair est le mode par défaut.

PÉRIMÈTRE
- Applique ce design à TOUTE l'app : pages publiques (/decouvrir…), auth, onboarding, mission du jour, Lire, vocabulaire, révisions, historique, préférences. Transpose l'esprit « journal » sur chaque écran, au-delà de la page d'accueil de la maquette.
- Remplace les tokens actuels de src/app/globals.css par ceux du design system. Conserve les « couleurs de langue » existantes comme palette secondaire, si elles restent lisibles.
- Ne change ni la logique, ni les données, ni les routes, ni Supabase. C'est une refonte visuelle uniquement.
- Les animations respectent prefers-reduced-motion, contraste AA, cibles tactiles ≥ 44 px, aucun scroll horizontal à 360 px, PWA intacte.

MÉTHODE
1. Explore le code et propose un plan court (composants touchés, ordre), puis attends mon accord.
2. Travaille sur une branche `redesign/journal`, en commits atomiques.
3. Garde la CI verte : typecheck, lint, Vitest, pgTAP, Playwright. Mets à jour les tests e2e qui dépendent du DOM ou des textes.
4. Vérifie chaque écran dans le navigateur, en clair et en sombre, sur desktop et mobile.
5. Ouvre une PR avec les captures avant/après et le lien de preview Vercel. Ne merge pas : je valide sur la preview.
```
