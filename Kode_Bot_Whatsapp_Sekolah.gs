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
    // ALUR KEDUA: Menerima Data Form dari Aplikasi Web SEKOLAH
    // ========================================================
    // 1. Ambil data dari request halaman HTML
    var customerName      = e.parameter.customerName;
    var customerRole      = e.parameter.customerRole;
    var customerAddress   = e.parameter.customerAddress;
    var customerChild     = e.parameter.customerChild;
    var customerPhone     = e.parameter.customerPhone;
    var targetGuruPhone   = e.parameter.targetBabinsaPhone; // Parameter fetch seragam
    var targetGuruName    = e.parameter.targetBabinsaName;
    var reason            = e.parameter.reason;

    // 2. Setup Spreadsheet aktif khusus Sekolah
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Auto-create Headers (Kolom) jika sheet masih benar-benar kosong (baris 0)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Nama Pengirim",
        "Peran",
        "Sekolah / Kelas",
        "Nama Anak / Kelas",
        "Nomor HP WhatsApp",
        "Guru yang Dituju",
        "Nomor HP Guru",
        "Alasan / Keperluan"
      ]);
      // Mempercantik style Header (Warna oranye khas Sekolah)
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#ec5b13").setFontColor("white");
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
      targetGuruName,
      targetGuruPhone,
      reason
    ]);

    // 4. Kirim Pesan Auto-Reply ke Wali Murid / Siswa
    var msgToCustomer = "Halo " + customerName + "! 👋\n\nTerima kasih telah menghubungi melalui Portal Sekolah SiLebah EDU.\n\nPesan Anda telah diteruskan kepada *" + targetGuruName + "* dan segera ditindaklanjuti. Mohon ditunggu ya! 🙏\n\n_- SiLebah EDU, Layanan Sekolah_";
    sendFonnteMessage(FONNTE_TOKEN, customerPhone, msgToCustomer);

    // 5. Meneruskan Notifikasi ke Guru yang Dituju
    var msgToGuru = "Halo " + targetGuruName + "! 👨‍🏫\n\nAda pesan baru masuk melalui *Portal Sekolah SiLebah EDU*!\n\n" +
                    "━━━━━━━━━━━━━━━━━━\n" +
                    "📋 *DATA PENGIRIM:*\n" +
                    "Nama   : " + customerName + " (" + customerRole + ")\n" +
                    "Info   : " + customerAddress + "\n" +
                    "No HP  : " + customerPhone + "\n" +
                    "━━━━━━━━━━━━━━━━━━\n" +
                    "📝 *KEPERLUAN:*\n_\"" + reason + "\"_\n\n" +
                    "Untuk membalas langsung ke orang ini, ketik:\n" +
                    "*BALAS " + customerPhone + " [isi balasan Anda]*";
    sendFonnteMessage(FONNTE_TOKEN, targetGuruPhone, msgToGuru);

    // 6. Kembalikan Respon Sukses
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": "Data Sekolah tersimpan dan pesan WhatsApp telah dikirim via Fonnte."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================================
// FUNGSI KHUSUS MENGELOLA PESAN BALASAN GURU KE WALI MURID
// ==========================================================
function processFonnteWebhook(data, token) {
  var sender = data.sender;
  var msg = data.message.toString().trim();

  if (msg.toUpperCase().substring(0, 5) === "BALAS") {
    var parts = msg.split(" ");

    var nomorTujuan = parts[1];
    var isiBalasan  = parts.slice(2).join(" ");

    if (nomorTujuan && isiBalasan) {
      // 1. Kirim pesan balasan ke wali murid / siswa
      var formatPesanWarga = "📩 *Balasan dari Guru — Portal Sekolah SiLebah EDU:*\n\n_" + isiBalasan + "_";
      sendFonnteMessage(token, nomorTujuan, formatPesanWarga);

      // 2. Beri konfirmasi ke Guru bahwa pengiriman berhasil
      sendFonnteMessage(token, sender, "✅ Balasan Anda berhasil diteruskan ke nomor " + nomorTujuan);
    } else {
      sendFonnteMessage(token, sender, "❌ Format salah. Gunakan:\nBALAS NOMOR_HP PESANNYA\n\nContoh:\nBALAS 08123456789 Baik, silakan hadir besok pagi.");
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
