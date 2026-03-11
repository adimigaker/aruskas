// ============================================================
// ARUS KAS — Google Apps Script Backend
// ============================================================
// CARA PASANG:
// 1. Buka Google Sheet kamu
// 2. Extensions → Apps Script
// 3. Hapus semua kode yang ada, paste seluruh kode ini
// 4. Klik Save (💾)
// 5. Klik Deploy → New deployment
//    - Type: Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Klik Deploy → Copy URL yang muncul
// 7. Paste URL itu ke kolom "Apps Script URL" di pengaturan Arus Kas
// ============================================================

const SHEET_NAME = 'Transaksi';
const HEADERS    = ['Tanggal','Tipe','Jumlah','Deskripsi','Kategori','Catatan','Pembayar','ID'];

// ── GET: baca semua transaksi ──────────────────────────────
function doGet(e) {
  try {
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonOk([]);

    const rows = data.slice(1).map(r => ({
      date:     r[0] ? Utilities.formatDate(new Date(r[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
      type:     r[1] || 'expense',
      amount:   parseFloat(r[2]) || 0,
      desc:     r[3] || '',
      category: r[4] || '',
      note:     r[5] || '',
      payer:    r[6] || 'Bersama',
      id:       r[7] || '',
    })).filter(r => r.date && r.amount);

    return jsonOk(rows);
  } catch(err) {
    return jsonErr(err.toString());
  }
}

// ── POST: add / update / delete ────────────────────────────
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'add')    return handleAdd(body.tx);
    if (action === 'update') return handleUpdate(body.tx);
    if (action === 'delete') return handleDelete(body.id);

    return jsonErr('Unknown action: ' + action);
  } catch(err) {
    return jsonErr(err.toString());
  }
}

// ── ADD ────────────────────────────────────────────────────
function handleAdd(tx) {
  const sheet = getSheet();
  ensureHeaders(sheet);
  sheet.appendRow([tx.date, tx.type, tx.amount, tx.desc, tx.category, tx.note, tx.payer, tx.id]);
  return jsonOk({ success: true, action: 'added', id: tx.id });
}

// ── UPDATE ─────────────────────────────────────────────────
function handleUpdate(tx) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === tx.id) {
      const row = i + 1; // Sheets adalah 1-indexed
      sheet.getRange(row, 1, 1, 8).setValues([[
        tx.date, tx.type, tx.amount, tx.desc,
        tx.category, tx.note, tx.payer, tx.id
      ]]);
      return jsonOk({ success: true, action: 'updated', id: tx.id });
    }
  }
  return jsonErr('ID tidak ditemukan: ' + tx.id);
}

// ── DELETE ─────────────────────────────────────────────────
function handleDelete(id) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === id) {
      sheet.deleteRow(i + 1);
      return jsonOk({ success: true, action: 'deleted', id: id });
    }
  }
  return jsonErr('ID tidak ditemukan: ' + id);
}

// ── HELPERS ────────────────────────────────────────────────
function getSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
