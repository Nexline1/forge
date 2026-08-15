# Lead capture + welcome email — 5 minute setup

This puts every unlocked lead into a Google Sheet you own, and sends them one
plain welcome email with your community links. No third-party service, no
monthly fee, no account to create.

---

## 0. Put your links in the script

Open `Code.gs` and edit the three constants at the top:

```js
var SKOOL_URL    = 'https://www.skool.com/your-community';
var WHATSAPP_URL = 'https://chat.whatsapp.com/your-invite';
var FROM_NAME    = 'MENA AI Community';
```

This file runs on Google's servers and can't read `config.js`, so the links
have to be set in both places.

Don't want the email? Set `SEND_WELCOME_EMAIL = false` and you'll just collect
addresses.

## 1. Make the sheet

1. Go to [sheets.new](https://sheets.new) — a blank spreadsheet.
2. Name it something like **Forge — leads**.
3. Leave it empty. The script creates the tab and the header row on first run.

## 2. Add the script

1. In that sheet: **Extensions → Apps Script**.
2. Delete the placeholder `function myFunction() {}`.
3. Open `Code.gs` from this folder, copy the whole thing, paste it in.
4. Click the save icon.

## 3. Deploy it

1. **Deploy → New deployment**.
2. Click the gear next to "Select type" → choose **Web app**.
3. Set:
   - **Description:** `forge leads`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone** ← this one matters. "Anyone with Google
     account" will silently reject visitors who aren't signed in.
4. **Deploy**. Google asks you to authorise it — click through
   *Advanced → Go to (project name)* if it warns about an unverified app.
   It's your own script; that warning is expected.
5. Copy the **Web app URL**. It ends in `/exec`.

## 4. Wire it up

Open `assets/js/config.js` and paste the URL:

```js
leadsEndpoint: "https://script.google.com/macros/s/AKfy..../exec",
```

## 5. Check it works

Open the `/exec` URL in a browser tab. You should see:

```json
{"ok":true,"service":"forge-leads","rows":0}
```

Then run through the form yourself and confirm a row appears in the sheet — and
that the welcome email arrives.

To read the email copy before anyone else sees it, run `testWelcomeEmail` from
the Apps Script editor's function dropdown. It sends both the English and
Arabic versions to yourself.

### About the email

It goes out **once, on first capture only** — repeat visitors are never
re-mailed. It's sent in whichever language they used the site in.

It's plain text on purpose: no banner, no buttons, no urgency. It says the
community is free, that there's a free introductory course, that there are
people there who help, and mentions the paid comprehensive course once, plainly,
because hiding it would be worse. Edit `bodyEn_()` / `bodyAr_()` to change it.

**Sending quota:** consumer Gmail allows ~100 Apps Script emails per day,
Workspace ~1,500. `doGet` reports your remaining quota, so opening the `/exec`
URL tells you where you stand. Fine at lead-magnet volume, but worth knowing
before a launch push.

A mail failure never costs you the lead — the send is wrapped in its own
try/catch and the row records `failed` in the **Welcomed** column so you can
follow up.

---

## What gets stored

| Column | Notes |
|---|---|
| First seen / Last seen / Times | Returning visitors update in place rather than duplicating |
| Email, Consent | Consent is whether they ticked the mailing-list box |
| Language | `en` or `ar` — which version of the site they used |
| Welcomed | `yes`, `failed` or `skipped` — whether the welcome email sent |
| Field, Job, Tool, Model, Plan | Their answers — this is your segmentation |
| Tool access, Output format, Behaviour, Guardrails | Pipe-separated ids |
| Company | Only if they filled the optional "company in one line" field |
| Source, Referrer | Where they came from |

Nothing else is collected. The prompt they built is never sent anywhere — it
is composed entirely in their browser.

**Use `Consent` before you email anyone.** People who left it unticked asked
for the prompt, not for your newsletter.

---

## If a lead doesn't appear

- **Re-deploy after every code change.** Editing `Code.gs` does not update the
  live web app — you must do **Deploy → Manage deployments → edit → Version:
  New version → Deploy**. This catches everyone at least once.
- Check **Who has access** is *Anyone*, not *Anyone with Google account*.
- Open the Apps Script **Executions** tab to see whether requests are arriving
  and what they threw.
- Leads are always mirrored into the visitor's own `localStorage` under
  `forge_leads_v1`, so a misconfigured endpoint loses reporting, never the
  visitor's experience — the prompt still unlocks.
