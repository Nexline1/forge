# Forge — a system-prompt builder as a lead magnet

Five questions. Someone answers them, and walks away with a genuinely good
system prompt, install instructions for their specific tool, and an invitation
to the MENA AI Community.

Fully bilingual — English and Arabic, with RTL layout. No build step, no
dependencies, no backend. Plain HTML, CSS and JavaScript.

---

## Go live in four steps

### 1. Your links

`assets/js/config.js`:

```js
skoolUrl:    "https://www.skool.com/your-community",
whatsappUrl: "https://chat.whatsapp.com/your-invite",
```

Until `skoolUrl` is set, the final CTA renders as a **disabled** button reading
"Community link not set yet" — deliberately obvious, so it can't ship broken.

### 2. Lead capture + welcome email

Follow `apps-script/README-SETUP.md` (about five minutes). Paste the same two
links into the top of `apps-script/Code.gs` as well — that file runs on
Google's servers and can't read `config.js`. Then paste the resulting `/exec`
URL back into `config.js`:

```js
leadsEndpoint: "https://script.google.com/macros/s/AKfy..../exec",
```

Skipping this doesn't break anything — leads fall back to the visitor's own
browser storage and a console warning, and no email is sent.

### 3. Publish to GitHub Pages

```bash
cd "prompt-forge" && git init && git add -A && git commit -m "Forge"
```

Then create an empty repo on GitHub and push:

```bash
git remote add origin https://github.com/<you>/<repo>.git && git branch -M main && git push -u origin main
```

In the repo: **Settings → Pages → Source: Deploy from a branch → main / (root)
→ Save**. Live at `https://<you>.github.io/<repo>/` in about a minute.

**This is what "always on" means.** The files sit on GitHub's servers and are
served 24/7 whether your laptop is on or not. Nothing runs on your machine.

### 4. Bump the cache when you change anything

`sw.js` caches the app so repeat visits are instant and work offline. After
editing any file, change the version at the top:

```js
var CACHE = "forge-v2";   // was forge-v1
```

Returning visitors keep the old copy until this changes.

---

## Running it locally

Double-click `index.html` — no build, no modules, `file://` works. To serve
over HTTP (needed for the clipboard API and the service worker):

```bash
python -m http.server 8412 --directory prompt-forge
```

There's also a `prompt-forge` entry in the workspace's `.claude/launch.json`.

---

## How the prompt is generated

**No AI is called.** Nothing hits Claude, ChatGPT or any API.

`assets/js/data/` is a hand-written library of prompt fragments — roughly 400
sentences. The finance entry, for instance, literally contains *"Show the
arithmetic for anything derived. A number without its calculation is not
usable."*

The five answers **select** fragments; `compose.js` assembles them in a fixed
order:

```
role → context → objective → method → tools → output → rules → never → when_unsure
```

Identity and context go first because models weight early instructions more
heavily; hard prohibitions go last, closest to the response. For Claude the
sections are wrapped in XML tags; for ChatGPT and Gemini they become markdown
headers (the `dialect` field on each tool in `models.js`).

That's why it's instant, free forever, works offline, and produces the identical
result twice. **The intelligence is in the writing, done once, up front.**

### Five questions, not twelve

Prompt quality lives in the fragment library, not in how many questions get
asked. So `flow.js` → `applyDefaults()` derives the rest — output format, tone,
tool access, guardrails, and seven of the eight clarifying questions — from the
domain, task and tool the visitor already picked.

The derived answers are *better* than the old twelve-question version in one
respect: that build showed at most two clarifiers and threw the rest away, while
this one applies every clarifier whose condition matches.

Anything the visitor changes in the **Refine** panel is flagged in
`answers.touched` and never recomputed underneath them.

---

## Language

**The interface is bilingual. The generated prompt is always English.**

This is deliberate, not an unfinished translation. Models follow English
instructions more reliably — nuance, negation and format contracts hold up
better. It costs the user nothing, because the prompt carries a line telling the
model to *reply* in whichever language the person writes in. On the Arabic
interface that `bilingual` trait is enabled automatically.

English prompt, Arabic conversation. The result screen explains this in Arabic
rather than hiding it.

### Editing the Arabic

All of it is in one file: `assets/js/data/ar.js`, keyed by the `id` of each
English entry. Miss an id and that entry simply stays English — `FORGE.f()`
falls back — so a partial translation degrades gracefully instead of rendering
blanks. Interface chrome (buttons, headings, gate copy) lives in
`assets/js/i18n.js`.

---

## Editing the content

| File | What's in it |
|---|---|
| `data/domains.js` | 16 fields and 10 task archetypes, each with real method steps, standards and failure modes. **This file decides whether the output is good.** |
| `data/models.js` | Tools, their prompt dialect, install steps; Claude model tiers and plan tiers. |
| `data/tools.js` | What the assistant can reach — each contributes a usage policy *and* a hard guardrail. |
| `data/formats.js` | Output contracts, each with an example skeleton. |
| `data/behaviour.js` | Voice/rigour traits and the "never do this" guardrails. |
| `data/clarifiers.js` | Conditional prompt rules. `stakes` is asked; the rest are derived. |
| `data/ar.js` | Every Arabic translation. |

**Add a field:** copy a block in `domains.js`, give it a unique `id`, list which
task ids it offers, and add a `label` to `ar.js`. It appears immediately.

---

## Files

```
index.html                  markup shell
sw.js                       offline cache (bump CACHE on every deploy)
manifest.webmanifest        installable-app metadata
assets/css/app.css          the whole design system, incl. RTL
assets/js/config.js         ← the only file you must edit
assets/js/i18n.js           interface strings + language resolver
assets/js/data/*.js         the content library (above)
assets/js/flow.js           five questions + the defaults engine
assets/js/compose.js        answers → system prompt
assets/js/lead.js           email capture + Apps Script POST
assets/js/ui.js             screen rendering
assets/js/app.js            navigation, keyboard, refine panel
apps-script/Code.gs         Google Sheets endpoint + welcome email
```

---

## Notes

- **Sessions resume.** Answers persist in `localStorage`; someone who closes the
  tab returns to where they left off, and someone who already unlocked is never
  asked for their email again.
- **Keyboard.** Number keys pick options, Enter continues. Worth mentioning when
  you share it — it makes the whole thing take about ten seconds.
- **"Build it now"** appears from question 2 and fills the rest with defaults.
- **Accessibility.** All text meets AA contrast, every control has a
  focus-visible ring, and `prefers-reduced-motion` is respected.
- **Model facts** in `models.js` were current when built. Plan advice is written
  in terms of behaviour rather than quoted usage limits, because those change.
