function doPost(e) {
  try {
    // 0. Safety check (jika tidak ada data masuk)
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
    // ALUR KEDUA: Menerima Data Form dari Aplikasi Web Babinsa
    // ========================================================
    var customerName = e.parameter.customerName;
    var customerRole = e.parameter.customerRole;
    var customerAddress = e.parameter.customerAddress;
    var customerChild = e.parameter.customerChild;
    var customerPhone = e.parameter.customerPhone;
    var targetBabinsaPhone = e.parameter.targetBabinsaPhone;
    var targetBabinsaName = e.parameter.targetBabinsaName;
    var reason = e.parameter.reason;

    // Simpan ke Spreadsheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Nama Customer", "Peran", "Alamat/Sekolah", "Anak/Kelas", "Nomor HP Customer", "Target", "No HP Target", "Alasan"]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f06424").setFontColor("white");
    }

    var timestamp = new Date();
    sheet.appendRow([timestamp, customerName, customerRole, customerAddress, customerChild, customerPhone, targetBabinsaName, targetBabinsaPhone, reason]);

    // Kirim Balasan ke Pemohon (Warga)
    var msgToCustomer = "Terima Kasih Pesannya Segera Terhubung,Ditunggu ya...";
    sendFonnteMessage(FONNTE_TOKEN, customerPhone, msgToCustomer);

    // Teruskan Pesan ke Petugas Babinsa
    var msgToBabinsa = "Pesan Warga via Aplikasi:\n\n" +
                       "Nama: " + customerName + "\n" +
                       "No HP: " + customerPhone + "\n" +
                       "Alasan: _\"" + reason + "\"_\n\n" +
                       "Untuk membalas pesan warga ini, silakan ketik balas dengan format:\n" +
                       "BALAS " + customerPhone + " [isi pesan anda]";
    sendFonnteMessage(FONNTE_TOKEN, targetBabinsaPhone, msgToBabinsa);

    // Kembalikan Sukses ke Aplikasi
    return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "Pesan Terkirim!"})).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================================
// FUNGSI KHUSUS MENGELOLA PESAN BALASAN BABINSA KE WARGA
// ==========================================================
function processFonnteWebhook(data, token) {
  var sender = data.sender;
  var msg = data.message.toString().trim();
  
  // Mengecek apakah pesannya diawali kata "BALAS" (Tidak peduli huruf besar/kecil)
  if (msg.toUpperCase().substring(0, 5) === "BALAS") {
    // Pecah menjadi potong-potongan kata (spasi)
    var parts = msg.split(" ");
    
    // Format: BALAS 0812345678 Oke siap
    // parts[0] = "BALAS"
    // parts[1] = "0812345678"
    // parts[2] dll = "Oke siap"
    var nomorTujuan = parts[1];
    var isiBalasan = parts.slice(2).join(" ");
    
    if (nomorTujuan && isiBalasan) {
      // 1. Kirim pesan ke warga
      var formatPesanWarga = "Pesan Balasan dari Petugas Babinsa:\n\n_" + isiBalasan + "_";
      sendFonnteMessage(token, nomorTujuan, formatPesanWarga);
      
      // 2. Beri konfirmasi ke Babinsa bahwa sukses
      sendFonnteMessage(token, sender, "✅ Sukses meneruskan balasan Anda ke " + nomorTujuan);
    } else {
      // Jika salah ketik / kurang informasi
      sendFonnteMessage(token, sender, "❌ Format salah. Gunakan: BALAS NOMOR_HP PESANNYA\nContoh: BALAS 0812345678 Baik ditunggu");
    }
  }

  // Wajib mengirim status 200 OK ke sistem Fonnte
  return ContentService.createTextOutput(JSON.stringify({status: true})).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================================
// FUNGSI MEMANGGIL API FONNTE UNTUK KIRIM PESAN WA
// ==========================================================
function sendFonnteMessage(token, targetPhone, textMessage) {
  var url = "https://api.fonnte.com/send";
  var payload = {
    "target": targetPhone,
    "message": textMessage
  };
  var options = {
    "method": "post",
    "headers": { "Authorization": token },
    "payload": payload,
    "muteHttpExceptions": true
  };
  UrlFetchApp.fetch(url, options);
}
