# Lead capture — 5 minute setup

This puts every unlocked lead into a Google Sheet you own. No third-party
service, no monthly cap, no account to create.

---

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

Then run through the form yourself and confirm a row appears in the sheet.

---

## What gets stored

| Column | Notes |
|---|---|
| First seen / Last seen / Times | Returning visitors update in place rather than duplicating |
| Email, Consent | Consent is whether they ticked the mailing-list box |
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
