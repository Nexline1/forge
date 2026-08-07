# Forge — a system-prompt builder as a lead magnet

A one-question-per-screen form. Someone answers ~12 taps about their work,
their tools and their model, and walks away with a genuinely good system
prompt, install instructions for their specific tool, and an invitation to the
Bahrain AI Skool community.

No build step, no dependencies, no backend. Plain HTML, CSS and JavaScript.
The prompt is composed entirely in the visitor's browser — nothing they type
is ever transmitted except their email address.

---

## Go live in three steps

### 1. Your Skool link

`assets/js/config.js`:

```js
skoolUrl: "https://www.skool.com/your-community",
```

Until you set this, the final CTA renders as a disabled button that says
"Community link not set yet" — deliberately obvious, so it can't ship broken.

### 2. Lead capture

Follow `apps-script/README-SETUP.md` (about five minutes), then paste the
resulting `/exec` URL into the same config file:

```js
leadsEndpoint: "https://script.google.com/macros/s/AKfy..../exec",
```

Skipping this doesn't break anything — leads just fall back to the visitor's
own browser storage and a console warning.

### 3. Publish to GitHub Pages

```bash
cd "prompt-forge" && git init && git add -A && git commit -m "Forge"
```

Then create an empty repo on GitHub and push:

```bash
git remote add origin https://github.com/<you>/<repo>.git && git branch -M main && git push -u origin main
```

In the repo: **Settings → Pages → Source: Deploy from a branch → main / (root)
→ Save**. It's live at `https://<you>.github.io/<repo>/` in about a minute.

---

## Running it locally

Double-click `index.html` and it works — there's no build and no module
loading, so `file://` is fine. To serve it over HTTP instead (needed if you
want the clipboard API, which browsers restrict to secure contexts):

```bash
python -m http.server 8412 --directory prompt-forge
```

There's also a `prompt-forge` entry in the workspace's `.claude/launch.json`.

---

## Editing the content

All the substance lives in `assets/js/data/`. These are plain arrays — no
framework, no schema to learn. Change one and reload.

| File | What's in it |
|---|---|
| `domains.js` | The 16 fields (finance, clinics, legal…) and the 10 task archetypes, each with its real operating method, standards and failure modes. **This is the file that decides whether the output is good.** |
| `models.js` | Tools (Claude Code, Claude, API, ChatGPT, Gemini, editor agents), their prompt dialect, and their install steps. Also Claude model tiers and plan tiers. |
| `tools.js` | What the assistant can reach, and the usage policy + hard guardrail each one contributes. |
| `formats.js` | Output contracts, each with an example skeleton the model has to follow. |
| `behaviour.js` | Voice/rigour traits and the "never do this" guardrails. |
| `clarifiers.js` | The adaptive follow-up questions. Each has a `when()` predicate and a `priority`; the top two matches are shown. |

### Add a new field

Copy a block in `domains.js`, give it a unique `id`, and list which task ids it
offers. That's the whole change — it appears in the form immediately.

### Add a new clarifying question

Add an object to `FORGE.CLARIFIERS` with a `when(answers)` predicate, a
`priority`, and a `section` saying where its chosen line lands in the finished
prompt (`method`, `rules`, `context` or `tools`).

Raising `FORGE.MAX_CLARIFIERS` above 2 makes the form noticeably longer.
Drop-off climbs faster than prompt quality does — 2 was chosen deliberately.

---

## How the prompt gets built

`compose.js` assembles eight sections in a fixed order:

```
role → context → objective → method → tools → output → rules → never → when_unsure
```

Identity and context go first because models weight early instructions more
heavily; hard prohibitions go last, closest to the response. For Claude the
sections are wrapped in XML tags (`<context>`, `<method>`…); for ChatGPT and
Gemini they become markdown headers. That switch is the `dialect` field on
each tool in `models.js`.

Every line in the output traces back to a specific answer. Nothing is
generated at runtime by an LLM, which is why it's instant, free, and produces
the same result twice.

---

## Files

```
index.html                  markup shell
assets/css/app.css          the whole design system
assets/js/config.js         ← the only file you must edit
assets/js/data/*.js         the content library (above)
assets/js/flow.js           question graph + state machine
assets/js/compose.js        answers → system prompt
assets/js/lead.js           email capture + Apps Script POST
assets/js/ui.js             screen rendering
assets/js/app.js            navigation, keyboard, events
apps-script/Code.gs         the Google Sheets endpoint
```

---

## Notes

- **Sessions resume.** Answers persist in `localStorage`, so someone who
  closes the tab returns to the question they left. Someone who already
  unlocked once is never asked for their email again.
- **Keyboard.** Number keys pick options, Enter continues. Worth mentioning
  when you share it — it makes the whole thing take about 40 seconds.
- **Accessibility.** All text meets AA contrast, every control has a
  focus-visible ring, and `prefers-reduced-motion` is respected.
- **Model facts** in `models.js` (Opus 5, Sonnet 5, Haiku 4.5, Fable 5, and
  the API notes) were current when built. Plan advice is deliberately written
  in terms of behaviour rather than quoted usage limits, because those change.
