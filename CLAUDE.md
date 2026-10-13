@AGENTS.md

# Daily Lingua

- Mobile-first: test at phone width; respect safe areas (`pb-safe`, `viewport-fit=cover`); inputs ≥ 16px to avoid iOS zoom.
- Never hard-code a language: use the registry in `src/lib/domain/languages.ts` and `languageStyle()` for colours.
- Keep `src/lib/domain` and `src/lib/schemas` free of Next.js/React imports (they may be shared with a native app).
- Pages read data only through `getRepository()` (`src/lib/data/repository.ts`).
- Pages that depend on "today" call `await connection()` first so the date isn't frozen at build time.
- Before finishing a change: `npm run check` and `npm run build`.
