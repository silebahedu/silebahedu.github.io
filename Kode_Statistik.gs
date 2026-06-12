// ============================================================
// KODE_STATISTIK.GS — Rumah SiLebah EDU Activity Tracker
// ============================================================
// CARA DEPLOY (Pilih Salah Satu):
// 
// METODE A (SANGAT DIREKOMENDASIKAN - CONTAINER BOUND):
// 1. Buka Google Sheets baru atau lama Anda.
// 2. Klik menu "Ekstensi" (Extensions) di atas → pilih "Apps Script".
// 3. Hapus semua kode bawaan, lalu paste seluruh kode di bawah ini.
// 4. SPREADSHEET_ID di bawah biarkan kosong (tetap "").
// 
// METODE B (STANDALONE SCRIPT):
// 1. Buka script.google.com → klik "New Project".
// 2. Paste seluruh kode di bawah ini.
// 3. Buat Google Sheets baru di Google Drive Anda, lalu copy ID Spreadsheet-nya
//    (ID berada di URL bar: https://docs.google.com/spreadsheets/d/[ID_DI_SINI]/edit).
// 4. Masukkan ID tersebut pada variabel SPREADSHEET_ID di bawah ini.
// ============================================================

var SPREADSHEET_ID = ""; // Kosongkan jika menggunakan METODE A
var SHEET_NAME = "AktivitasRumahSiLebah";
var ADMIN_SECRET = "silebahedu2026"; // Kunci rahasia untuk GET data

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Spreadsheet tidak ditemukan! Jika Anda membuat script langsung dari script.google.com (Metode B), silakan isi variabel SPREADSHEET_ID dengan ID Google Sheets Anda.");
  }
  return ss;
}

function doPost(e) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Buat sheet baru jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(["Waktu", "Nama", "Role", "Kelas/Anak", "Fitur", "Halaman"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#ffde59").setFontColor("#1a1d24");
      sheet.setColumnWidth(1, 200);
      sheet.setColumnWidth(2, 180);
      sheet.setColumnWidth(5, 150);
    }

    // Parse data JSON dari body request
    var data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    var waktu     = data.waktu     || new Date().toLocaleString("id-ID");
    var nama      = data.nama      || "Anonim";
    var role      = data.role      || "-";
    var kelas     = data.kelas     || "-";
    var fitur     = data.fitur     || "-";
    var halaman   = data.halaman   || "-";

    sheet.appendRow([waktu, nama, role, kelas, fitur, halaman]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data logged" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var secret = e.parameter.secret;
  
  // Validasi secret key demi keamanan
  if (secret !== ADMIN_SECRET) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unauthorized access" }))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [] }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    var rows = sheet.getDataRange().getValues();
    var data = [];
    
    // index 0 adalah header, data dimulai dari baris index 1
    for (var i = 1; i < rows.length; i++) {
      data.push({
        waktu: rows[i][0],
        nama: rows[i][1],
        role: rows[i][2],
        kelas: rows[i][3],
        fitur: rows[i][4],
        halaman: rows[i][5]
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
