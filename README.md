# ITC Ascender Court Board

Live court assignments for the Ascender team at the International Tennis
Championship (IMG Academy). Staff and players enter the Team PIN to see which
court each of our players is on. The desk coach updates matches from a laptop
and can email all coaches with one click.

## Pages

- `/` — live board (Team PIN required). Shows only our matches. Names are first
  name + last initial. The Ascender logo appears next to each of our players.
- `/admin` — desk (admin password required). Add matches, manage the roster,
  email coaches, or upload a CSV.
- `/board` — redirects to `/`.

## First-time setup

1. Install Node.js 20 or newer.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in every value.
4. Create / update the tables: `npm run db:push`
5. Optional, if this database already had opponents stored as player records:
   `npm run db:migrate-opponents` (copies those names into text fields; does not
   delete players).
6. Optional, for testing only: `npm run db:seed` loads 49 courts and a short
   sample Ascender roster. It **deletes everything first** and asks you to type
   `RESET` to confirm. Never run it on the live event database.
7. Start the app: `npm run dev`, then open http://localhost:3000

## Desk workflow

1. **Roster (once)** — open Desk → Roster. Paste our players, one name per line.
   Remove anyone with one click (clear their match first if they are on a court).
2. **Add match** — pick our player → pick court → type the opponent → Save.
   Optional doubles: our partner (roster) + opponent's partner (text).
3. **Our matches right now** — Change court, flip Warmup / In Progress, or Clear.
4. **Email group** — paste coach addresses once and **Save to group**. They stay
   visible at the top of the desk. **Email group** opens Outlook or Gmail on
   this laptop (`mailto:`) and sends to everyone saved. **Copy matches** pastes
   the same list into a group text or WhatsApp.
5. Email / copy lines use the same short names as the board
   (`Maya R. – Hard 12 vs Jordan S. (In Progress)`), then the board link and a
   Team PIN reminder (digits are not included).

A player can only be on one court. Opponents are free text and may appear on
more than one court.

## CSV format (optional)

| Column | Required | Notes |
| --- | --- | --- |
| `court` | Yes | Must match a court name exactly, e.g. `Hard 12` |
| `player` | Usually | Our player — must already be on the roster |
| `opponent` | Usually | Free text, e.g. `Jordan Smith` |
| `status` | No | `Warmup` or `In Progress` (also accepts `Open` / `Maintenance`) |
| `partner` | Doubles | Our partner — must already be on the roster |
| `opponentPartner` | Doubles | Opponent's partner, free text |

If any row has a problem, nothing is saved and the desk lists what to fix.
Download a template from Desk → CSV upload.

## Logos

- IMG Academy Tennis wordmark:
  `public/brand/IMGA_Tennis_Wordmark_Black_Blue.jpg` (header)
- Ascender mark: `public/brand/ascender-logo.png` (next to our players on the board)

## Security notes

- The Team PIN (`EVENT_PIN`) and admin password are both slowed down and limited
  after repeated wrong tries. The limits are counted per network, so a whole
  venue Wi-Fi shares them. Limits reset if the server restarts.
- Board and admin cookies are signed with `ADMIN_SESSION_SECRET`.
- Changing `EVENT_PIN` signs every device out of the board. Changing
  `ADMIN_PASSWORD` signs every admin out.

## Going live

Contact IMG Academy support to publish the app internally.
