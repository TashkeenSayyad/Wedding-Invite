/**
 * RSVP endpoint for the Tashkeen & Anusha invitation.
 *
 * The invitation is a static site with no server, so it cannot hold a secret. This is a public,
 * write-only endpoint: it accepts an RSVP and appends it to a Sheet, and it never reads anything
 * back out. That is the trade — anyone who digs the URL out of the page source could post a junk
 * row, so the checks below cap what a single request can write. For a wedding guest list that is
 * the right balance; do not put anything sensitive in this Sheet.
 *
 * ── Setting it up (about five minutes) ──────────────────────────────────────────────────────
 *
 *  1. Make a new Google Sheet. Call it whatever you like — "Rukhsati & Walima RSVPs".
 *  2. In that Sheet: Extensions → Apps Script. Delete the sample code.
 *  3. Paste this whole file in and press Save.
 *  4. Deploy → New deployment → gear icon → Web app.
 *       Description:      RSVP endpoint
 *       Execute as:       Me
 *       Who has access:   Anyone            ← must be "Anyone", not "Anyone with Google account"
 *  5. Deploy. Google will ask you to authorise it; the "unverified app" warning is expected for
 *     your own script — Advanced → Go to (project name).
 *  6. Copy the Web app URL. It ends in /exec.
 *  7. Paste it into RSVP_ENDPOINT in src/App.jsx, then `npm run build` and push.
 *
 * To check it works, open the /exec URL in a browser: it should say {"ok":true,...}.
 *
 * ── If you ever change this file ────────────────────────────────────────────────────────────
 * Deploy → Manage deployments → edit → Version: New version. Editing without a new version
 * leaves the old code running on the same URL.
 */

var SHEET_NAME = 'RSVPs';
var HEADERS = ['ID', 'Received', 'Invitation', 'Attending', 'How many', 'Names', 'Language'];
var MAX_TEXT = 500;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok: false, error: 'busy' });
  }
  try {
    if (!e || !e.postData || !e.postData.contents) return json({ ok: false, error: 'empty' });
    var body = JSON.parse(e.postData.contents);
    var row = normalise(body);
    if (!row) return json({ ok: false, error: 'bad payload' });

    var sheet = getSheet();
    // The page retries anything it could not confirm, so the same reply can arrive twice. Match on
    // the id the phone generated and overwrite in place, rather than growing a duplicate row.
    var at = findId(sheet, row[0]);
    if (at === -1) sheet.appendRow(row);
    else sheet.getRange(at, 1, 1, row.length).setValues([row]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// So you can confirm the deployment is live by opening the URL in a browser.
function doGet() {
  return json({ ok: true, endpoint: 'rsvp', rows: Math.max(0, getSheet().getLastRow() - 1) });
}

function getSheet() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = doc.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findId(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 2;   // +2: one for the header, one for 1-based rows
  }
  return -1;
}

function normalise(b) {
  if (!b || typeof b !== 'object') return null;
  var id = clean(b.id, 60);
  if (!id) return null;
  var attending = b.attending === 'yes' ? 'yes' : b.attending === 'no' ? 'no' : null;
  if (!attending) return null;

  var count = 0;
  if (attending === 'yes') {
    count = parseInt(b.count, 10);
    if (!(count >= 1 && count <= 20)) return null;
  }
  return [
    id,
    new Date(),                       // stamped here, so a wrong clock on a phone cannot lie
    clean(b.invitation, 80),
    attending,
    count || '',
    clean(b.names, MAX_TEXT),
    clean(b.lang, 8),
  ];
}

function clean(v, max) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\x00-\x1f\x7f]+/g, ' ').trim().slice(0, max);
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
