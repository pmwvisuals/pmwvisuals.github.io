# PMW Visuals Pinterest Autopilot

This automation publishes the existing PMW Visuals wallpaper library to Pinterest and is designed to stop when the backlog is exhausted.

## What it does

- Reads the existing `wallpapers-data.js` and `desktop-wallpapers-data.js` catalogs.
- Uses `wallpaper-pages.js` to send traffic to the matching PMW Visuals wallpaper page whenever one exists.
- Posts **mobile wallpapers first**, then desktop wallpapers.
- Rotates through categories so one board does not receive a large block of nearly identical Pins.
- Creates missing public Pinterest boards automatically.
- Generates Pinterest-friendly titles and descriptions from the existing metadata.
- Never posts more than **13 successful Pins in one Asia/Colombo calendar day**.
- Stores posted Pin IDs and failure history on the separate `automation/pinterest-state` branch to prevent duplicates.
- Retries failed wallpapers on later runs.
- Stops naturally when the queue reaches zero.

## Schedule

The workflow runs four times daily:

| Sri Lanka time | Maximum attempted success count |
| --- | ---: |
| 08:00 | 4 |
| 12:00 | 4 |
| 16:00 | 4 |
| 20:00 | remaining daily allowance, normally 1 |

The Python code independently enforces the 13/day cap, so delayed GitHub Actions runs cannot intentionally exceed the configured limit.

## Pinterest requirement

Use a Pinterest Business account and a Pinterest developer app with the permissions needed to read/write boards and Pins.

For traffic-driving public Pins, use Pinterest **Standard access**. Trial access is suitable for development but Trial-created Pins are not a replacement for public production publishing.

Required OAuth scopes:

- `boards:read`
- `boards:write`
- `pins:read`
- `pins:write`

## GitHub repository secrets

In the repository, open:

**Settings → Secrets and variables → Actions → New repository secret**

Create these secrets:

1. `PINTEREST_APP_ID`
2. `PINTEREST_APP_SECRET`
3. `PINTEREST_REFRESH_TOKEN`
4. `PINTEREST_TOKEN_KEY` — a Fernet encryption key used only to encrypt the continuously rotated refresh token stored on the private automation state branch history

Do not commit these values to the repository.

The workflow exchanges the refresh token for a fresh access token at run time. Pinterest also returns a replacement continuous refresh token; the workflow encrypts that token with `PINTEREST_TOKEN_KEY` before saving it to the automation state branch. Plain-text credentials are never committed.

## First activation

1. Merge the Pinterest Autopilot pull request into `main`.
2. Configure the three GitHub repository secrets above.
3. Make sure the Pinterest app has Standard access.
4. Open **Actions → Pinterest Autopilot → Run workflow**.
5. Leave **Publish live Pins** off for a dry run first.
6. Review the dry-run output.
7. Run it manually once with **Publish live Pins** enabled.
8. Confirm the created boards, Pin destination link, image, title, and description look correct.
9. Leave the workflow enabled. Scheduled runs will continue automatically.

## Safety behavior

- Authentication or permission errors stop the current publishing run instead of consuming the queue.
- Pinterest rate-limit responses stop the run and leave the remaining wallpapers queued.
- Ordinary image/metadata failures are logged and later items may continue.
- Posted items are recorded by stable `device:id` keys.
- The state branch is not the GitHub Pages deployment branch.

## Current catalog snapshot

At implementation time the repository contained:

- **1,103 mobile wallpapers**
- **589 desktop wallpapers**
- **1,692 wallpapers total**

At 13 Pins/day, the full existing backlog represents roughly 130 days of publishing if all items remain eligible.

The automation does not depend on new wallpapers being added. Its purpose is to exhaust the existing library and then stop.
