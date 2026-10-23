/**
 * Google Apps Script for the RSVP spreadsheet. Paste this whole file into
 * the spreadsheet → Rozšíření → Apps Script, then follow README → "Google Sheets".
 *
 * The website calls this after every saved answer. Each guest gets one row; a later
 * answer (form filled in again, or a change through the edit link) updates that row.
 * Calls without the right secret are ignored, so the public URL alone is useless.
 */

const SHEET_NAME = "Odpovědi";
const HEADERS = ["Jméno", "E-mail", "Dorazí?", "Odpověď poslána", "Poslední změna", "ID"];
const ID_COLUMN = 6;

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const secret = PropertiesService.getScriptProperties().getProperty("SECRET");
  if (!secret || data.secret !== secret) return reply({ ok: false });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet();
    const changed = new Date(data.updatedAt);
    const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, ID_COLUMN, sheet.getLastRow() - 1, 1).getValues() : [];
    const index = ids.findIndex((row) => row[0] === data.id);

    if (index === -1) {
      sheet.appendRow([data.name, data.email, data.attendance, changed, changed, data.id]);
    } else {
      const row = index + 2;
      sheet.getRange(row, 1, 1, 3).setValues([[data.name, data.email, data.attendance]]);
      sheet.getRange(row, 5).setValue(changed);
    }
    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.getRange("D:E").setNumberFormat("d. m. yyyy H:mm");
  }
  return sheet;
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this one from the editor (▶ Spustit) to authorise the script and create the tab. */
function setup() {
  getSheet();
}
