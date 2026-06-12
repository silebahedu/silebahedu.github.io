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
    // ALUR KEDUA: Menerima Data Form dari Aplikasi Web INKLUSI
    // ========================================================
    // 1. Ambil data dari request halaman HTML
    var customerName = e.parameter.customerName;
    var customerRole = e.parameter.customerRole;
    var customerAddress = e.parameter.customerAddress;
    var customerChild = e.parameter.customerChild;
    var customerPhone = e.parameter.customerPhone;
    var targetAhliPhone = e.parameter.targetBabinsaPhone; // Menggunakan parameter fetch seragam
    var targetAhliName = e.parameter.targetBabinsaName;
    var reason = e.parameter.reason;

    // 2. Setup Spreadsheet aktif khusus Inklusi
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-create Headers (Kolom) jika sheet masih benar-benar kosong (baris 0)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", 
        "Nama Pendaftar", 
        "Peran", 
        "Alamat/Sekolah", 
        "Nama Anak/Kelas", 
        "Nomor HP WhatsApp", 
        "Ahli Inklusi Yg Dituju", 
        "Nomor HP Ahli", 
        "Alasan Bantuan"
      ]);
      // Mempercantik style Header (Warna ungu/pink khas Inklusi)
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#d946ef").setFontColor("white");
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
      targetAhliName, 
      targetAhliPhone, 
      reason
    ]);

    // 4. Kirim Pesan Auto-Reply ke Customer 
    var msgToCustomer = "Terima Kasih Pesannya Segera Terhubung dengan Ahli Inklusi, Ditunggu ya...";
    sendFonnteMessage(FONNTE_TOKEN, customerPhone, msgToCustomer);

    // 5. Meneruskan Pesan ke Guru/Ahli Inklusi
    var msgToAhli = "Halo " + targetAhliName + ",\nAda pesan baru masuk dari Warga pada aplikasi SiLebah EDU Portal Inklusi!\n\n" +
                       "Pesan Warga via Aplikasi:\n" +
                       "Nama: " + customerName + " (" + customerRole + ")\n" +
                       "Info: " + customerAddress + "\n" +
                       "No HP WA: " + customerPhone + "\n" +
                       "Alasan Khusus: _\"" + reason + "\"_\n\n" +
                       "Untuk membalas pesan orang ini, silakan langsung balas dengan format berikut:\n" +
                       "BALAS " + customerPhone + " [isi balasan anda]";
    sendFonnteMessage(FONNTE_TOKEN, targetAhliPhone, msgToAhli);

    // 6. Kembalikan Respon Sukses
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success", 
      "message": "Data Inklusi tersimpan dan pesan Whatsapp telah dikirim via Fonnte."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error", 
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================================
// FUNGSI KHUSUS MENGELOLA PESAN BALASAN GURU KE WARGA
// ==========================================================
function processFonnteWebhook(data, token) {
  var sender = data.sender;
  var msg = data.message.toString().trim();
  
  if (msg.toUpperCase().substring(0, 5) === "BALAS") {
    var parts = msg.split(" ");
    
    var nomorTujuan = parts[1];
    var isiBalasan = parts.slice(2).join(" ");
    
    if (nomorTujuan && isiBalasan) {
      // 1. Kirim pesan ke warga
      var formatPesanWarga = "Pilihan Balasan dari Ahli Inklusi SiLebah EDU:\n\n_" + isiBalasan + "_";
      sendFonnteMessage(token, nomorTujuan, formatPesanWarga);
      
      // 2. Beri konfirmasi ke Guru bahwa sukses
      sendFonnteMessage(token, sender, "✅ Sukses meneruskan balasan / nasehat Anda ke " + nomorTujuan);
    } else {
      sendFonnteMessage(token, sender, "❌ Format salah. Gunakan:\nBALAS NOMOR_HP PESANNYA");
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
    "target": targetPhone,
    "message": textMessage
  };
  
  var options = {
    "method": "post",
    "headers": {
      "Authorization": token
    },
    "payload": payload,
    "muteHttpExceptions": true
  };
  
  UrlFetchApp.fetch(url, options);
}
