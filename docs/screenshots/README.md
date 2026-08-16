# Capturing the README visuals

The main `README.md` already references the image files below by their final
filenames — drop them into this folder with these exact names and the gallery
lights up with no further edits.

This takes about ten minutes end to end.

## Setup

```bash
npm run db:start
npm run dev
```

Open **http://localhost:3000** in a normal browser window (not a narrow
editor pane) sized to at least **1440 × 900** so the dashboards don't wrap
awkwardly. Use your OS screenshot tool (`Win + Shift + S` on Windows,
`Cmd + Shift + 4` on macOS) and save each capture as a **PNG**, trimmed to the
browser viewport — no OS chrome, no browser tab bar.

## Shot list

| # | Filename | URL | Log in as | What to capture |
|---|---|---|---|---|
| 1 | `landing.png` | `/` | — | The hero section down through the therapy pill row. No need to scroll further. |
| 2 | `login.png` | `/login` | — | The login form with the **Demo accounts** card visible underneath it. |
| 3 | `patient-dashboard.png` | `/patient` | `patient@chikitsa.dev` | Full page: greeting, today's instructions, the four stat cards, and the progress chart. Scroll so the chart is visible. |
| 4 | `constitution-assessment.png` | `/patient/constitution` | `patient@chikitsa.dev` | Scroll to the questionnaire and answer 5–6 questions first, so the **live reading** panel on the right shows real bars instead of the empty state. This is the most important screenshot — it's the one that shows the scoring engine working, not just a static form. |
| 5 | `doctor-dashboard.png` | `/doctor` | `doctor@chikitsa.dev` | The stat row plus the recent therapy plans table. |
| 6 | `therapist-dashboard.png` | `/therapist` | `therapist@chikitsa.dev` | The stat row plus the today's-roster timeline. |
| 7 | `admin-dashboard.png` | `/admin` | `admin@chikitsa.dev` | The session volume chart and the collection-rate gauge side by side. |
| 8 | `admin-inventory.png` | `/admin/inventory` | `admin@chikitsa.dev` | The stock table — make sure at least one **Low stock** or **Expiring** badge is visible in frame. |
| 9 | `assistant-chat.png` | `/patient/assistant` | `patient@chikitsa.dev` | Ask something (e.g. "What does Pitta mean?"), let it finish streaming, then capture the conversation with the **Demo mode** / **Live** badge visible at the bottom. |
| 10 | `dark-mode.png` | `/patient` | `patient@chikitsa.dev` | Click the moon icon in the header, then capture the same dashboard as #3 in dark mode. |

All ten are referenced in the README. If you only have time for a few, do
**#3, #4, #7, #9** first — those four carry the most signal (real data,
the live-scoring engine, the analytics, and the AI feature).

## Recording the demo clip

A 60–90 second walkthrough is worth more than any single screenshot. Use
Windows' built-in **Xbox Game Bar** (`Win + G` → record) or **OBS Studio**,
capture at 1440×900 or your native resolution, export as MP4, and keep it
under two minutes.

**Script — read this out loud once before recording so the pacing feels natural, not narrated-at-the-camera:**

1. **(0:00–0:10)** Start on the landing page (`/`). Scroll slowly through the
   hero and the feature cards.
2. **(0:10–0:20)** Go to `/login`. Point out the demo accounts card. Log in
   as the patient.
3. **(0:20–0:35)** On the patient dashboard, hover the progress chart and the
   dosha comparison. This is where "the app has real, computed data" lands.
4. **(0:35–0:55)** Open **My Constitution** and answer a handful of
   assessment questions live, so the viewer watches the bars update in real
   time as you click — this is the single best 20 seconds in the whole demo.
5. **(0:55–1:10)** Open **Ask Ayurveda** and send a question. Let the answer
   stream in fully before cutting.
6. **(1:10–1:25)** Log out, log back in as `doctor@chikitsa.dev`. Show the
   patient list and one therapy plan.
7. **(1:25–1:40)** Log in as `admin@chikitsa.dev`. Show the analytics charts,
   then the inventory page with a low-stock badge visible.
8. **(1:40–1:50)** Close on the landing page again, or fade out.

### Where to host it

GitHub renders video and GIF files dropped directly into a README **if they
are uploaded through the GitHub web UI** (drag the MP4 into a new issue or
a PR comment, let it upload, then copy the
`https://github.com/user-attachments/assets/...` URL it generates — you can
discard the issue/comment afterward, the asset link stays valid). Paste that
URL into the `<!-- DEMO VIDEO -->` marker near the top of `README.md` in
place of the HTML comment. Do not commit a raw `.mp4` file into the git
repository itself — GitHub's normal size limits make that painful, and the
user-attachments CDN is what every polished project README actually uses.

If you'd rather keep it lightweight, converting the same recording to a
looping GIF (e.g. with [gifski](https://gif.ski/) or ScreenToGif) and
committing it as `docs/screenshots/demo.gif` works too and is simpler to
review inline — just keep it under ~10MB or GitHub won't render it inline.
