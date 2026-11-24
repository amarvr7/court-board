# ITC Court Board

Live court assignments for the International Tennis Championship at IMG Academy.
Students, coaches, and parents enter the event PIN to see which court each player
is on. The tournament desk updates courts from the admin page.

## Pages

- `/` — event overview
- `/board` — live board (event PIN required). Names show as first name + last initial.
- `/admin` — tournament desk (admin password required). Edit courts one at a time or
  upload the whole order of play from a CSV file.

## First-time setup

1. Install Node.js 20 or newer.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in every value.
4. Create the tables: `npm run db:push`
5. Optional, for testing only: `npm run db:seed` loads 49 courts and 60 fake players.
   It **deletes everything first** and asks you to type `RESET` to confirm.
   Never run it on the live event database.
6. Start the app: `npm run dev`, then open http://localhost:3000

## Already have a database from the first version?

The second Stadium court was renamed from "Clay Hard" to "Stadium Clay".
Run this once to rename it without losing any assignments:

```bash
npm run db:rename-stadium
```

## CSV format for the order of play

| Column | Required | Notes |
| --- | --- | --- |
| `courtName` | Yes | Must match a court name exactly, e.g. `Hard 12`, `Stadium Clay` |
| `status` | No | `Warmup`, `In Progress`, `Open`, or `Maintenance`. Blank = In Progress if players are listed, otherwise Open |
| `player1` | No | Full name, e.g. `Arthur Pendelton` |
| `player2` | No | Opponent's full name |
| `player1Partner` | Doubles only | Partner of player 1 (Team A) |
| `player2Partner` | Doubles only | Partner of player 2 (Team B) |

Rules the upload checks before saving anything:

- A player can only be on one court. If a player is still on another court that
  isn't in the file, clear that court first or include it in the file.
- Two different players with the exact same name are treated as one person.
  Add a middle initial to one of them (e.g. `Sam J. Lee`) to tell them apart.
- If any row has a problem, nothing is saved and the admin page lists what to fix.

Download a template from the admin page.

## Logo

Put the IMG Academy Tennis wordmark at
`public/brand/IMGA_Tennis_Wordmark_Black_Blue.jpg` and the header shows it automatically.

## Security notes

- The board PIN and admin password are both slowed down and limited after repeated
  wrong tries. The limits are counted per network, so a whole venue Wi-Fi shares them.
  Limits reset if the server restarts.
- Board and admin cookies are signed with `ADMIN_SESSION_SECRET`, so they can't be faked.
- Changing `EVENT_PIN` signs every device out of the board. Changing `ADMIN_PASSWORD`
  signs every admin out.

## Going live

Contact IMG Academy support to publish the app internally.
