/**
 * FORGE — lead endpoint + welcome email
 * Appends each unlocked lead to a Google Sheet you own, and sends one plain
 * welcome email the first time someone appears.
 *
 * Setup: see README-SETUP.md in this folder.
 *
 * Note on content type: the site posts text/plain, not application/json.
 * That's deliberate — Apps Script web apps don't answer CORS preflight
 * requests, and application/json triggers one. text/plain is a "simple
 * request", so the browser sends it straight through.
 */

/* ===== EDIT THESE THREE ==================================================== */

var SKOOL_URL    = 'PASTE_YOUR_SKOOL_INVITE_LINK_HERE';
var WHATSAPP_URL = 'PASTE_YOUR_WHATSAPP_GROUP_INVITE_LINK_HERE';
var FROM_NAME    = 'MENA AI Community';

/* Set false if you'd rather collect addresses and mail them yourself later. */
var SEND_WELCOME_EMAIL = true;

/* ========================================================================== */

var SHEET_NAME = 'Leads';

var HEADERS = [
  'First seen', 'Last seen', 'Times', 'Email', 'Consent', 'Language',
  'Field', 'Job', 'Tool', 'Model', 'Plan',
  'Tool access', 'Output format', 'Behaviour', 'Guardrails',
  'Company', 'Source', 'Referrer', 'Welcomed'
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
    var lang = (m.lang === 'ar') ? 'ar' : 'en';
    var sheet = getSheet_();
    var now = new Date();
    var row = findRowByEmail_(sheet, email);

    if (row > 0) {
      // Repeat visitor — refresh their answers, bump the counter, no second email.
      var times = Number(sheet.getRange(row, 3).getValue()) || 1;
      sheet.getRange(row, 2).setValue(now);
      sheet.getRange(row, 3).setValue(times + 1);
      sheet.getRange(row, 5, 1, 14).setValues([[
        d.consent ? 'yes' : 'no', lang,
        m.domain || '', m.task || '', m.tool || '', m.model || '', m.plan || '',
        m.tools || '', m.format || '', m.traits || '', m.guards || '',
        m.org || '', d.source || '', d.ref || ''
      ]]);
      return json({ ok: true, repeat: true });
    }

    // A mail failure must never cost us the lead row, so send inside its own
    // try and record the outcome rather than letting it throw.
    var welcomed = 'skipped';
    if (SEND_WELCOME_EMAIL) {
      try {
        sendWelcome_(email, lang);
        welcomed = 'yes';
      } catch (mailErr) {
        console.error('welcome email failed: ' + mailErr);
        welcomed = 'failed';
      }
    }

    sheet.appendRow([
      now, now, 1, email, d.consent ? 'yes' : 'no', lang,
      m.domain || '', m.task || '', m.tool || '', m.model || '', m.plan || '',
      m.tools || '', m.format || '', m.traits || '', m.guards || '',
      m.org || '', d.source || '', d.ref || '', welcomed
    ]);

    return json({ ok: true, repeat: false, welcomed: welcomed });

  } catch (err) {
    console.error(err);
    return json({ ok: false, error: String(err) });
  }
}

/** Health check — open the /exec URL in a browser to confirm it's live. */
function doGet() {
  var sheet = getSheet_();
  return json({
    ok: true,
    service: 'forge-leads',
    rows: Math.max(0, sheet.getLastRow() - 1),
    mail: SEND_WELCOME_EMAIL ? 'on' : 'off',
    quotaRemaining: MailApp.getRemainingDailyQuota()
  });
}

/* ---------- welcome email ------------------------------------------------ */
/* Plain text on purpose. No banner, no buttons, no urgency — it reads like a
   person sent it, which is the whole point. Say what's free, mention the paid
   course once because hiding it would be worse, and stop. */

function sendWelcome_(email, lang) {
  var body = (lang === 'ar') ? bodyAr_() : bodyEn_();
  var subject = (lang === 'ar')
    ? 'رابط المجتمع — ومكان المساعدة'
    : 'The community link — and where to get help';

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    name: FROM_NAME
  });
}

function bodyEn_() {
  return [
    'Hi,',
    '',
    'You just built a system prompt on Forge — here are the links we promised at the end.',
    '',
    'Community: ' + SKOOL_URL,
    'WhatsApp group: ' + WHATSAPP_URL,
    '',
    'Both are free. There is an introductory course inside to get you started, and people',
    'who will help you get better at using AI — you can just ask, that is what it is for.',
    '',
    'We also run a longer, more comprehensive course, and that one is paid. It is the only',
    'thing that costs anything. The community, the discussion, and the prompt builder you',
    'just used are free, and they stay free.',
    '',
    'If the prompt you built needs sharpening, bring it in and we will look at it together.',
    '',
    '— ' + FROM_NAME
  ].join('\n');
}

function bodyAr_() {
  return [
    'أهلاً،',
    '',
    'لقد بنيت للتو أمر نظام على Forge — وهذه الروابط التي وعدناك بها في النهاية.',
    '',
    'المجتمع: ' + SKOOL_URL,
    'مجموعة واتساب: ' + WHATSAPP_URL,
    '',
    'كلاهما مجاني. في الداخل دورة تمهيدية تبدأ بها، وأشخاص يساعدونك على إتقان',
    'استخدام الذكاء الاصطناعي — اسأل ببساطة، فهذا هو الغرض.',
    '',
    'لدينا أيضاً دورة أطول وأشمل، وهي مدفوعة. وهي الشيء الوحيد الذي له تكلفة.',
    'أما المجتمع والنقاش وأداة بناء الأوامر التي استخدمتها للتو فمجانية، وستبقى مجانية.',
    '',
    'وإن احتاج الأمر الذي بنيته إلى ضبط، أحضره معك ولنراجعه سوياً.',
    '',
    '— ' + FROM_NAME
  ].join('\n');
}

/* ---------- helpers ------------------------------------------------------ */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
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

/** Run this once from the editor to check the mail copy before going live. */
function testWelcomeEmail() {
  sendWelcome_(Session.getActiveUser().getEmail(), 'en');
  sendWelcome_(Session.getActiveUser().getEmail(), 'ar');
}
