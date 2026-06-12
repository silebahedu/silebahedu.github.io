function doPost(e) {
  try {
    // 0. Safety check (jika tidak ada data masuk / salah eksekusi di editor)
    if (!e) {
      return ContentService.createTextOutput("Script Aktif. Panggil via POST.").setMimeType(ContentService.MimeType.TEXT);
    }

    // !!! BACA INI: GANTI TULISAN DI BAWAH DENGAN TOKEN FONNTE MILIK ANDA !!!
    var FONNTE_TOKEN = "TOKEN_FONNTE_ANDA_DISINI";

    // ========================================================
    // ALUR PERTAMA: Menerima Pesan Balasan (Webhook) dari Fonnte
    // ========================================================
    if (e.postData && e.postData.type === "application/json") {
      var webhookData = JSON.parse(e.postData.contents);

      // Pastikan ada nomor pengirim dan pesan
      if (webhookData.sender && webhookData.message) {
        return processFonnteWebhook(webhookData, FONNTE_TOKEN);
      }
    }

    // ========================================================
    // ALUR KEDUA: Menerima Data Form dari Aplikasi Web PUSKESMAS
    // ========================================================
    // 1. Ambil data dari request halaman HTML
    var customerName      = e.parameter.customerName;
    var customerRole      = e.parameter.customerRole;
    var customerAddress   = e.parameter.customerAddress;
    var customerChild     = e.parameter.customerChild;
    var customerPhone     = e.parameter.customerPhone;
    var targetPhone       = e.parameter.targetPhone; // Nama param seragam
    var targetName        = e.parameter.targetName;
    var reason            = e.parameter.reason;

    // 2. Setup Spreadsheet aktif khusus Puskesmas
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Auto-create Headers (Kolom) jika sheet masih benar-benar kosong (baris 0)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Nama Warga",
        "Peran",
        "Alamat / Sekolah",
        "Nama Anak / Kelas",
        "Nomor HP Warga",
        "Unit Tujuan",
        "Nomor HP Unit",
        "Keluhan / Keperluan"
      ]);
      // Mempercantik style Header (Warna Tosca/Teal khas Kesehatan)
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#0d9488").setFontColor("white");
    }

    // 3. Menyimpan data masuk ke baris baru di Spreadsheet
    var timestamp = new Date();
    sheet.appendRow([
      timestamp,
      customerName,
      customerRole,
      customerAddress,
      customerChild,
      customerPhone,
      targetName,
      targetPhone,
      reason
    ]);

    // 4. Kirim Pesan Auto-Reply ke Warga
    var msgToCustomer = "Halo " + customerName + "! 👋\n\nTerima kasih telah menghubungi melalui Portal Puskesmas SiLebah EDU.\n\nPesan Anda telah diteruskan kepada *" + targetName + "* dan segera ditindaklanjuti. Mohon ditunggu ya! 🙏\n\n_- SiLebah EDU, Pusat Kesehatan_";
    sendFonnteMessage(FONNTE_TOKEN, customerPhone, msgToCustomer);

    // 5. Meneruskan Notifikasi ke Unit Puskesmas yang Dituju
    var msgToUnit = "Halo Petugas " + targetName + "! 🏥\n\nAda keluhan/pesan masuk melalui *Portal Puskesmas SiLebah EDU*!\n\n" +
                    "━━━━━━━━━━━━━━━━━━\n" +
                    "📋 *DATA PENGIRIM:*\n" +
                    "Nama   : " + customerName + " (" + customerRole + ")\n" +
                    "Info   : " + customerChild + " | " + customerAddress + "\n" +
                    "No HP  : " + customerPhone + "\n" +
                    "━━━━━━━━━━━━━━━━━━\n" +
                    "📝 *KELUHAN / KEPERLUAN:*\n_\"" + reason + "\"_\n\n" +
                    "Untuk membalas langsung ke warga ini, ketik:\n" +
                    "*BALAS " + customerPhone + " [isi balasan Anda]*";
    sendFonnteMessage(FONNTE_TOKEN, targetPhone, msgToUnit);

    // 6. Kembalikan Respon Sukses
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": "Data Puskesmas tersimpan dan pesan WhatsApp telah dikirim via Fonnte."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================================
// FUNGSI KHUSUS MENGELOLA PESAN BALASAN PETUGAS KE WARGA
// ==========================================================
function processFonnteWebhook(data, token) {
  var sender = data.sender;
  var msg = data.message.toString().trim();

  if (msg.toUpperCase().substring(0, 5) === "BALAS") {
    var parts = msg.split(" ");

    var nomorTujuan = parts[1];
    var isiBalasan  = parts.slice(2).join(" ");

    if (nomorTujuan && isiBalasan) {
      // 1. Kirim pesan balasan ke warga
      var formatPesanWarga = "📩 *Balasan dari Unit Layanan Puskesmas — Portal SiLebah EDU:*\n\n_" + isiBalasan + "_";
      sendFonnteMessage(token, nomorTujuan, formatPesanWarga);

      // 2. Beri konfirmasi ke Petugas bahwa pengiriman berhasil
      sendFonnteMessage(token, sender, "✅ Balasan Anda berhasil diteruskan ke nomor " + nomorTujuan);
    } else {
      sendFonnteMessage(token, sender, "❌ Format salah. Gunakan:\nBALAS NOMOR_HP PESANNYA\n\nContoh:\nBALAS 08123456789 Baik, segera kami proses.");
    }
  }

  return ContentService.createTextOutput(JSON.stringify({status: true})).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================================
// FUNGSI MEMANGGIL API FONNTE UNTUK KIRIM PESAN WA
// ==========================================================
function sendFonnteMessage(token, targetPhone, textMessage) {
  var url = "https://api.fonnte.com/send";

  var payload = {
    "target":  targetPhone,
    "message": textMessage
  };

  var options = {
    "method":           "post",
    "headers":          { "Authorization": token },
    "payload":          payload,
    "muteHttpExceptions": true
  };

  UrlFetchApp.fetch(url, options);
}
