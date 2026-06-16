# FIFA World Cup 2026 — Web App

SvelteKit app that displays squads, groups, standings, and player rosters for the 2026 World Cup. Deployed on Vercel.

## Data

Static JSON files live in `src/data/` and are processed at request time in `+page.server.js`:

- `worldcup.json` — match results
- `worldcup.teams.json` — team metadata (flags, FIFA codes)
- `worldcup.groups.json` — group assignments
- `worldcup.squads.json` — player rosters with club info

Standings (points, goal difference, goals for) are calculated from match results in the server load function.

## Dev

```sh
npm install
npm run dev
```

```sh
npm run build    # production build
npm run preview  # preview production build locally
```

## Deploy

Deployed automatically via Vercel on push to `master`. Uses `@sveltejs/adapter-vercel`.
