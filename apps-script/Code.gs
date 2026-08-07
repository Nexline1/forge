/**
 * FORGE — lead endpoint
 * Appends each unlocked lead to a Google Sheet you own.
 *
 * Setup: see README-SETUP.md in this folder.
 *
 * Note on content type: the site posts text/plain, not application/json.
 * That's deliberate — Apps Script web apps don't answer CORS preflight
 * requests, and application/json triggers one. text/plain is a "simple
 * request", so the browser sends it straight through.
 */

var SHEET_NAME = 'Leads';

var HEADERS = [
  'First seen', 'Last seen', 'Times', 'Email', 'Consent',
  'Field', 'Job', 'Tool', 'Model', 'Plan',
  'Tool access', 'Output format', 'Behaviour', 'Guardrails',
  'Company', 'Source', 'Referrer'
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty body' });
    }

    var d = JSON.parse(e.postData.contents);
    var email = String(d.email || '').trim().toLowerCase();
    if (!email || email.indexOf('@') === -1) {
      return json({ ok: false, error: 'invalid email' });
    }

    var m = d.meta || {};
    var sheet = getSheet_();
    var now = new Date();

    var row = findRowByEmail_(sheet, email);

    if (row > 0) {
      // Repeat visitor — bump the counter and refresh their latest answers.
      var times = Number(sheet.getRange(row, 3).getValue()) || 1;
      sheet.getRange(row, 2).setValue(now);
      sheet.getRange(row, 3).setValue(times + 1);
      sheet.getRange(row, 5, 1, 13).setValues([[
        d.consent ? 'yes' : 'no',
        m.domain || '', m.task || '', m.tool || '', m.model || '', m.plan || '',
        m.tools || '', m.format || '', m.traits || '', m.guards || '',
        m.org || '', d.source || '', d.ref || ''
      ]]);
      return json({ ok: true, repeat: true });
    }

    sheet.appendRow([
      now, now, 1, email, d.consent ? 'yes' : 'no',
      m.domain || '', m.task || '', m.tool || '', m.model || '', m.plan || '',
      m.tools || '', m.format || '', m.traits || '', m.guards || '',
      m.org || '', d.source || '', d.ref || ''
    ]);

    return json({ ok: true, repeat: false });

  } catch (err) {
    // Never fail loudly — the site unlocks regardless, and a thrown error here
    // just loses the row silently anyway. Log it so you can find it.
    console.error(err);
    return json({ ok: false, error: String(err) });
  }
}

/** Health check — open the /exec URL in a browser to confirm it's live. */
function doGet() {
  var sheet = getSheet_();
  return json({ ok: true, service: 'forge-leads', rows: Math.max(0, sheet.getLastRow() - 1) });
}

/* ---------- helpers ------------------------------------------------------ */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowByEmail_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var col = sheet.getRange(2, 4, last - 1, 1).getValues();   // column D = Email
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim().toLowerCase() === email) return i + 2;
  }
  return 0;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
