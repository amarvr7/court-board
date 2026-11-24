# Changes in this version

## Security
- Board PIN cookie is now a signed token. Setting a cookie by hand no longer unlocks the board.
- Wrong PINs wait 1 second and are limited to 30 per network every 15 minutes.
- Wrong admin passwords are limited to 10 per network every 15 minutes.
- No more built-in "2026" PIN. If `EVENT_PIN` isn't set, the board shows "Board not open yet".
- Clerk sign-in and the open `/sign-up` page are removed. `/admin` uses the admin password only.
- `.env.local` is not included in this zip.

## Data safety
- `npm run db:seed` now asks you to type RESET before it deletes anything.
- New `npm run db:rename-stadium` renames "Clay Hard" to "Stadium Clay" in an existing database.

## Features and fixes
- Doubles: each court can have a partner on each side (Team A / Team B), on the board,
  the admin page, and the CSV upload (`player1Partner`, `player2Partner`).
- A player can only be on one court. Admin dropdowns show where a player already is.
- CSV upload checks every row first. If anything is wrong, nothing is saved and the
  admin page lists each problem.
- Single-word names are kept as-is (no more invented "Player" last name).
- Moved shared code out of API route files so `next build` passes cleanly.
- Removed the old `middleware.ts` (it only existed for Clerk).

## Look and wording
- Stadium courts are "Stadium Hard" and "Stadium Clay".
- Header shows the IMG Academy Tennis logo once the file is in `public/brand/`.
- Color classes renamed from `emerald-*` to `brand-*` (same IMG blue as before).
- Admin wording is plain language ("Save to board" instead of database terms).
- README rewritten for this project.
