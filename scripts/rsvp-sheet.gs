/**
 * RSVP back office for the Tashkeen & Anusha invitation.
 *
 * This one file is the whole thing: the endpoint the invitation posts to, the three sheets the
 * family reads, and the emails that tell them a reply came in. Paste it into a Google Sheet's
 * Apps Script editor, run setup() once, deploy it, and the invitation has somewhere to send
 * replies.
 *
 * The invitation is a static site with no server, so it cannot hold a secret. This is a public,
 * write-only endpoint: it accepts an RSVP and appends it to a Sheet, and it never reads anything
 * back out. That is the trade — anyone who digs the URL out of the page source could post a junk
 * row, so the checks below cap what a single request can write, and MAX_ROWS stops a runaway.
 * For a wedding guest list that is the right balance; do not put anything sensitive in this Sheet.
 *
 * ── Setting it up (about five minutes) ──────────────────────────────────────────────────────
 *
 *  1. Make a new Google Sheet. Call it whatever you like — "Rukhsati & Walima RSVPs".
 *  2. In that Sheet: Extensions → Apps Script. Delete the sample code.
 *  3. Paste this whole file in and press Save.
 *  4. Choose `setup` in the function dropdown and press Run. Authorise it when asked — the
 *     "unverified app" warning is expected for your own script: Advanced → Go to (project name).
 *     This builds the three sheets: RSVPs, Summary and Guest list.
 *  5. Deploy → New deployment → gear icon → Web app.
 *       Description:      RSVP endpoint
 *       Execute as:       Me
 *       Who has access:   Anyone            ← must be "Anyone", not "Anyone with Google account"
 *  6. Deploy, then copy the Web app URL. It ends in /exec.
 *  7. Paste it into RSVP_ENDPOINT in src/config.js (or VITE_RSVP_ENDPOINT in .env), then
 *     `npm run build` and push.
 *
 * To check it works, open the /exec URL in a browser: it should answer {"ok":true,…}.
 * To check it end to end, run `testPost` from the editor — it writes one obvious test row.
 *
 * ── The three sheets ────────────────────────────────────────────────────────────────────────
 *
 *  RSVPs       one row per guest reply, newest at the bottom. Written by the invitation.
 *  Summary     live counts — how many are coming, who is still to reply, what people wrote.
 *  Guest list  type or paste your guest names into column A. Every other column fills itself
 *              in: the personalised invitation link, a WhatsApp message ready to send, and
 *              that guest's reply as soon as it arrives.
 *
 * ── Getting told about replies ──────────────────────────────────────────────────────────────
 * Use the "RSVPs" menu that appears in the Sheet's menu bar (reload the Sheet once after
 * setup): email me each reply, or a digest every evening. Nothing is emailed by default.
 *
 * ── If you ever change this file ────────────────────────────────────────────────────────────
 * Deploy → Manage deployments → edit → Version: New version. Editing without a new version
 * leaves the old code running on the same URL.
 */

// ── Settings ────────────────────────────────────────────────────────────────────────────────

/** Where the invitation lives. Keep in step with SITE in src/config.js. Changing it here is
 *  only the default — the live value sits in Guest list!J2, so you can edit it in the Sheet. */
var SITE = 'https://tashkeensayyad.github.io/Wedding-Invite/';

/** The WhatsApp message the Guest list builds for each guest. {name} and {link} are filled in.
 *  This is only the default; the live copy is Guest list!J3 and you can rewrite it there. */
var INVITE_TEXT =
  'Assalamu alaikum {name}! You are warmly invited to the Rukhsati & Walima of ' +
  'Tashkeen & Anusha, Sunday 27 December 2026 at Nerunkot Hall, Qasimabad, Hyderabad. ' +
  'Your invitation is here: {link}';

var SHEET_NAME = 'RSVPs';
var SUMMARY_NAME = 'Summary';
var GUESTS_NAME = 'Guest list';

/** Columns, in order. New ones are appended at the end so an existing sheet keeps its data. */
var HEADERS = ['ID', 'Received', 'Invitation', 'Attending', 'How many', 'Names', 'Language',
               'Note', 'Contact', 'Updated', 'Replies'];
var COL = { ID: 1, RECEIVED: 2, INVITATION: 3, ATTENDING: 4, COUNT: 5, NAMES: 6, LANG: 7,
            NOTE: 8, CONTACT: 9, UPDATED: 10, REPLIES: 11 };

var MAX_TEXT = 500;      // a note or a list of names is capped at this many characters
var MAX_PARTY = 20;      // matches the counter's ceiling in the invitation
var MAX_ROWS = 5000;     // a stranger with the URL cannot grow the Sheet past this
var GUEST_ROWS = 400;    // how far down the Guest list the self-filling formulas reach

// Where the notification settings live. Stored per-script, so they survive redeployments.
var P_NOTIFY = 'notifyEmail';
var P_DIGEST = 'digestEmail';

// ── The endpoint ────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok: false, error: 'busy' });
  }
  try {
    if (!e || !e.postData || !e.postData.contents) return json({ ok: false, error: 'empty' });

    var body;
    try { body = JSON.parse(e.postData.contents); }
    catch (err) { return json({ ok: false, error: 'not json' }); }

    var row = normalise(body);
    if (!row) return json({ ok: false, error: 'bad payload' });

    var sheet = getSheet();
    if (sheet.getLastRow() > MAX_ROWS) return json({ ok: false, error: 'full' });

    // The page retries anything it could not confirm, and a guest can come back and change their
    // answer. Both arrive carrying the id the phone generated first — match on it and overwrite
    // in place, so neither a retry nor a change of heart grows a second row.
    var at = findId(sheet, row[COL.ID - 1]);
    var isNew = at === -1;
    if (isNew) {
      sheet.appendRow(row);
      at = sheet.getLastRow();
    } else {
      var prev = sheet.getRange(at, 1, 1, HEADERS.length).getValues()[0];
      row[COL.RECEIVED - 1] = prev[COL.RECEIVED - 1] || row[COL.RECEIVED - 1];  // keep the first time
      row[COL.REPLIES - 1] = (Number(prev[COL.REPLIES - 1]) || 1) + 1;
      sheet.getRange(at, 1, 1, HEADERS.length).setValues([row]);
    }

    notify(row, isNew);
    return json({ ok: true, row: at, updated: !isNew });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** So you can confirm the deployment is live by opening the URL in a browser. Counts only —
 *  this never hands back a name. */
function doGet() {
  var sheet = getSheet();
  var last = Math.max(0, sheet.getLastRow() - 1);
  var attending = 0;
  if (last > 0) {
    var vals = sheet.getRange(2, COL.ATTENDING, last, 2).getValues();
    for (var i = 0; i < vals.length; i++) if (vals[i][0] === 'yes') attending += Number(vals[i][1]) || 0;
  }
  return json({ ok: true, endpoint: 'rsvp', replies: last, attending: attending });
}

// ── Reading what the invitation sent ────────────────────────────────────────────────────────

function normalise(b) {
  if (!b || typeof b !== 'object') return null;
  var id = clean(b.id, 60);
  if (!id) return null;
  var attending = b.attending === 'yes' ? 'yes' : b.attending === 'no' ? 'no' : null;
  if (!attending) return null;

  var count = 0;
  if (attending === 'yes') {
    count = parseInt(b.count, 10);
    if (!(count >= 1 && count <= MAX_PARTY)) return null;
  }

  var now = new Date();                 // stamped here, so a wrong clock on a phone cannot lie
  var row = [];
  row[COL.ID - 1] = id;
  row[COL.RECEIVED - 1] = now;
  row[COL.INVITATION - 1] = clean(b.invitation, 80);
  row[COL.ATTENDING - 1] = attending;
  row[COL.COUNT - 1] = count || '';
  row[COL.NAMES - 1] = clean(b.names, MAX_TEXT);
  row[COL.LANG - 1] = b.lang === 'sd' ? 'sd' : 'en';
  row[COL.NOTE - 1] = clean(b.note, MAX_TEXT);
  row[COL.CONTACT - 1] = clean(b.contact, 40);
  row[COL.UPDATED - 1] = now;
  row[COL.REPLIES - 1] = 1;
  return row;
}

function clean(v, max) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\x00-\x1f\x7f]+/g, ' ').trim().slice(0, max);
}

function findId(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, COL.ID, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 2;   // +2: one for the header, one for 1-based rows
  }
  return -1;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── The sheets ──────────────────────────────────────────────────────────────────────────────

/** Run this once from the editor. Safe to run again at any time — it repairs whatever is
 *  missing and never touches a reply that has already been written. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buildRsvpSheet(ss);
  buildGuestSheet(ss);
  buildSummarySheet(ss);

  // the empty "Sheet1" a new spreadsheet arrives with, if it is still untouched
  var spare = ss.getSheetByName('Sheet1');
  if (spare && spare.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(spare);

  ss.setActiveSheet(ss.getSheetByName(SUMMARY_NAME));
  SpreadsheetApp.getActive().toast(
    'RSVPs, Summary and Guest list are ready. Put your guest names in column A of Guest list.',
    'Set up', 8);
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || buildRsvpSheet(ss);
}

function buildRsvpSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME, 0);

  // Headers are only ever appended to, so an older sheet keeps every reply it already holds.
  var width = Math.max(sheet.getLastColumn(), HEADERS.length);
  var have = sheet.getRange(1, 1, 1, width).getValues()[0];
  var same = true;
  for (var i = 0; i < HEADERS.length; i++) if (have[i] !== HEADERS[i]) same = false;
  if (!same) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold').setBackground('#4d0e1c').setFontColor('#f7e3b5');
  sheet.setFrozenRows(1);
  sheet.getRange(2, COL.RECEIVED, sheet.getMaxRows() - 1, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  sheet.getRange(2, COL.UPDATED, sheet.getMaxRows() - 1, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  var widths = [0, 210, 150, 150, 80, 70, 220, 70, 240, 120, 150, 60];
  for (var c = 1; c < widths.length; c++) sheet.setColumnWidth(c, widths[c]);
  sheet.getRange(2, COL.NAMES, sheet.getMaxRows() - 1, 2).setWrap(true);
  paintAttending(sheet, COL.ATTENDING);
  return sheet;
}

/** yes reads as coming, no reads as a regret — at a glance, down a long column. */
function paintAttending(sheet, col) {
  var range = sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1);
  var keep = sheet.getConditionalFormatRules().filter(function (r) {
    var rs = r.getRanges();
    return !(rs.length === 1 && rs[0].getColumn() === col && rs[0].getSheet().getName() === sheet.getName());
  });
  keep.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('yes')
    .setBackground('#e3f0e4').setFontColor('#14532d').setRanges([range]).build());
  keep.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('no')
    .setBackground('#f3ecec').setFontColor('#7a1228').setRanges([range]).build());
  keep.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('awaiting')
    .setBackground('#fdf3e0').setFontColor('#8a5a10').setRanges([range]).build());
  sheet.setConditionalFormatRules(keep);
}

/** Column A is yours to fill in. Everything else fills itself. */
function buildGuestSheet(ss) {
  var sheet = ss.getSheetByName(GUESTS_NAME);
  var fresh = !sheet;
  if (fresh) sheet = ss.insertSheet(GUESTS_NAME);

  sheet.getRange('A1:G1').setValues([[
    'Guest name', 'Invitation link', 'Send on WhatsApp', 'Reply', 'How many', 'Who is coming', 'Note',
  ]]).setFontWeight('bold').setBackground('#4d0e1c').setFontColor('#f7e3b5');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  // The settings box, off to the right, so the two things worth editing are editable in the
  // Sheet rather than in the script.
  sheet.getRange('I1').setValue('Settings').setFontWeight('bold');
  sheet.getRange('I2').setValue('Invitation URL');
  sheet.getRange('I3').setValue('Message ({name}, {link})');
  if (fresh || !sheet.getRange('J2').getValue()) sheet.getRange('J2').setValue(SITE);
  if (fresh || !sheet.getRange('J3').getValue()) sheet.getRange('J3').setValue(INVITE_TEXT);
  sheet.getRange('I1:I3').setFontColor('#7a1228');
  sheet.getRange('J2:J3').setWrap(true).setBackground('#fdf8ee');
  sheet.setColumnWidth(9, 170);
  sheet.setColumnWidth(10, 340);

  if (sheet.getMaxRows() < GUEST_ROWS + 1) sheet.insertRowsAfter(sheet.getMaxRows(), GUEST_ROWS + 1 - sheet.getMaxRows());

  // Filled down rather than as one ARRAYFORMULA: ENCODEURL does not take a range, and a guest
  // name with a space or an apostrophe in it has to survive the trip into a URL intact.
  var rows = [];
  for (var r = 2; r <= GUEST_ROWS + 1; r++) {
    var last = function (from) {                 // the newest matching reply, not the first
      return 'IFERROR(LOOKUP(2,1/(' + SHEET_NAME + '!$C$2:$C=$A' + r + '),' + SHEET_NAME + '!' + from + '),"")';
    };
    rows.push([
      '=IF($A' + r + '="","",$J$2&"?to="&ENCODEURL($A' + r + '))',
      '=IF($A' + r + '="","",HYPERLINK("https://wa.me/?text="&ENCODEURL(' +
        'SUBSTITUTE(SUBSTITUTE($J$3,"{name}",$A' + r + '),"{link}",$B' + r + ')),"send →"))',
      '=IF($A' + r + '="","",IF(' + last('$D$2:$D') + '="","awaiting",' + last('$D$2:$D') + '))',
      '=IF($A' + r + '="","",' + last('$E$2:$E') + ')',
      '=IF($A' + r + '="","",' + last('$F$2:$F') + ')',
      '=IF($A' + r + '="","",' + last('$H$2:$H') + ')',
    ]);
  }
  sheet.getRange(2, 2, rows.length, 6).setFormulas(rows);

  var widths = [0, 190, 300, 130, 110, 90, 220, 240];
  for (var c = 1; c < widths.length; c++) sheet.setColumnWidth(c, widths[c]);
  sheet.getRange(2, 6, GUEST_ROWS, 2).setWrap(true);
  sheet.getRange(2, 2, GUEST_ROWS, 1).setFontColor('#666666').setFontSize(9);
  paintAttending(sheet, 4);
  return sheet;
}

function buildSummarySheet(ss) {
  var sheet = ss.getSheetByName(SUMMARY_NAME);
  if (!sheet) sheet = ss.insertSheet(SUMMARY_NAME, 0);
  sheet.clear();
  sheet.clearConditionalFormatRules();

  var R = SHEET_NAME + '!';
  var G = "'" + GUESTS_NAME + "'!";
  var rows = [
    ['Rukhsati & Walima — Tashkeen & Anusha', ''],
    ['Sunday, 27 December 2026 · Nerunkot Hall, Qasimabad, Hyderabad', ''],
    ['', ''],
    ['Coming', ''],
    ['Guests attending', '=IFERROR(SUM(' + R + '$E$2:$E),0)'],
    ['Replies saying yes', '=COUNTIF(' + R + '$D$2:$D,"yes")'],
    ['Replies saying no', '=COUNTIF(' + R + '$D$2:$D,"no")'],
    ['Largest party', '=IFERROR(MAX(' + R + '$E$2:$E),0)'],
    ['Average party size', '=IFERROR(ROUND(AVERAGE(' + R + '$E$2:$E),1),0)'],
    ['', ''],
    ['Guest list', ''],
    ['Invitations on the list', '=COUNTA(' + G + '$A$2:$A)'],
    ['Still to reply', '=COUNTIF(' + G + '$D$2:$D,"awaiting")'],
    ['Replied', '=COUNTIF(' + G + '$D$2:$D,"yes")+COUNTIF(' + G + '$D$2:$D,"no")'],
    ['', ''],
    ['Replies', ''],
    ['Total replies', '=COUNTA(' + R + '$A$2:$A)'],
    ['Came in today', '=COUNTIF(' + R + '$J$2:$J,">="&TODAY())'],
    ['Last reply', '=IFERROR(TEXT(MAX(' + R + '$J$2:$J),"d mmm yyyy, h:mm am/pm"),"—")'],
    ['Replied in Sindhi', '=COUNTIF(' + R + '$G$2:$G,"sd")'],
    ['Left a note', '=COUNTIF(' + R + '$H$2:$H,"?*")'],
    ['', ''],
    ['Notes from guests', ''],
  ];
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);

  // The notes, underneath, so they are read rather than counted.
  sheet.getRange(rows.length + 1, 1).setFormula(
    '=IFERROR(FILTER(IF(' + R + '$C$2:$C="","(no name)",' + R + '$C$2:$C)&" — "&' + R + '$H$2:$H,' +
    R + '$H$2:$H<>""),"Nothing yet.")');

  sheet.getRange('A1').setFontSize(15).setFontWeight('bold').setFontColor('#7a1228');
  sheet.getRange('A2').setFontColor('#666666');
  [4, 11, 16, 23].forEach(function (r) {
    sheet.getRange(r, 1, 1, 2).setFontWeight('bold').setFontColor('#7a1228')
      .setBorder(null, null, true, null, null, null, '#c9a35e', SpreadsheetApp.BorderStyle.SOLID);
  });
  sheet.getRange('B5').setFontSize(22).setFontWeight('bold').setFontColor('#14532d');
  sheet.getRange(1, 2, rows.length, 1).setHorizontalAlignment('left');
  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 300);
  sheet.setHiddenGridlines(true);
  return sheet;
}

// ── Being told about replies ────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi().createMenu('RSVPs')
    .addItem('Set up / repair the sheets', 'setup')
    .addSeparator()
    .addItem('Email me every reply', 'turnOnEachReply')
    .addItem('Stop emailing me every reply', 'turnOffEachReply')
    .addSeparator()
    .addItem('Email me a summary each evening', 'turnOnDigest')
    .addItem('Stop the evening summary', 'turnOffDigest')
    .addItem('Send me the summary now', 'sendDigest')
    .addToUi();
}

function turnOnEachReply() { setNotify(P_NOTIFY, 'You will get an email for each reply.'); }
function turnOffEachReply() { clearNotify(P_NOTIFY, 'No more emails for each reply.'); }
function turnOnDigest() {
  setNotify(P_DIGEST, 'A summary will arrive each evening.');
  removeTriggers('sendDigest');
  ScriptApp.newTrigger('sendDigest').timeBased().atHour(20).everyDays(1).create();
}
function turnOffDigest() {
  clearNotify(P_DIGEST, 'The evening summary is off.');
  removeTriggers('sendDigest');
}

function setNotify(key, message) {
  var email = Session.getEffectiveUser().getEmail();
  PropertiesService.getScriptProperties().setProperty(key, email);
  SpreadsheetApp.getActive().toast(message + ' (' + email + ')', 'RSVPs', 6);
}
function clearNotify(key, message) {
  PropertiesService.getScriptProperties().deleteProperty(key);
  SpreadsheetApp.getActive().toast(message, 'RSVPs', 5);
}
function removeTriggers(fn) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === fn) ScriptApp.deleteTrigger(t);
  });
}

/** Never lets a failed email lose a reply — the row is already written by the time this runs. */
function notify(row, isNew) {
  try {
    var to = PropertiesService.getScriptProperties().getProperty(P_NOTIFY);
    if (!to) return;
    var who = row[COL.INVITATION - 1] || row[COL.NAMES - 1] || 'A guest';
    var coming = row[COL.ATTENDING - 1] === 'yes';
    var subject = (isNew ? '' : 'Updated: ') + who + ' — ' +
      (coming ? row[COL.COUNT - 1] + ' coming' : 'unable to attend');
    var lines = [
      who + (coming ? ' is coming.' : ' cannot make it.'),
      coming ? 'How many: ' + row[COL.COUNT - 1] : '',
      row[COL.NAMES - 1] ? 'Names: ' + row[COL.NAMES - 1] : '',
      row[COL.NOTE - 1] ? 'Note: ' + row[COL.NOTE - 1] : '',
      row[COL.CONTACT - 1] ? 'Contact: ' + row[COL.CONTACT - 1] : '',
      '',
      SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    ];
    MailApp.sendEmail(to, subject, lines.filter(String).join('\n'));
  } catch (err) { /* an email that will not send is not worth failing the reply over */ }
}

/** The evening summary. Also on the RSVPs menu, so it can be sent by hand at any time. */
function sendDigest() {
  var to = PropertiesService.getScriptProperties().getProperty(P_DIGEST) ||
           Session.getEffectiveUser().getEmail();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheet();
  var last = Math.max(0, sheet.getLastRow() - 1);
  var heads = 0, yes = 0, no = 0, today = 0;
  var midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  var recent = [];
  if (last > 0) {
    var vals = sheet.getRange(2, 1, last, HEADERS.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i];
      if (v[COL.ATTENDING - 1] === 'yes') { yes++; heads += Number(v[COL.COUNT - 1]) || 0; }
      if (v[COL.ATTENDING - 1] === 'no') no++;
      var when = v[COL.UPDATED - 1] || v[COL.RECEIVED - 1];
      if (when instanceof Date && when >= midnight) {
        today++;
        recent.push('· ' + (v[COL.INVITATION - 1] || v[COL.NAMES - 1] || 'a guest') + ' — ' +
          (v[COL.ATTENDING - 1] === 'yes' ? v[COL.COUNT - 1] + ' coming' : 'cannot attend') +
          (v[COL.NOTE - 1] ? ' — "' + v[COL.NOTE - 1] + '"' : ''));
      }
    }
  }
  var body = [
    'Rukhsati & Walima — RSVPs so far',
    '',
    heads + ' guests attending, across ' + yes + ' repl' + (yes === 1 ? 'y' : 'ies') + '.',
    no + ' unable to attend.',
    today + ' came in today.',
    '',
  ].concat(recent.length ? ['Today:'].concat(recent, ['']) : []).concat([ss.getUrl()]);
  MailApp.sendEmail(to, 'RSVPs: ' + heads + ' attending', body.join('\n'));
}

// ── A test you can run from the editor ──────────────────────────────────────────────────────

/** Writes one obvious test row, then tells you where it landed. Delete the row afterwards. */
function testPost() {
  var res = doPost({ postData: { contents: JSON.stringify({
    id: 'test-' + Date.now(), invitation: 'Test Guest', attending: 'yes', count: 3,
    names: 'Test Guest, Someone, Someone Else', note: 'Delete this row.', contact: '',
    lang: 'en',
  }) } });
  Logger.log(res.getContent());
}
