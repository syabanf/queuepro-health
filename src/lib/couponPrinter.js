/**
 * Coupon printer utility — opens a print window with full coupon HTML.
 * Works for thermal 58mm/80mm and A6 paper.
 */
export function printCoupon({ participant, medicalQueue, eyeQueue, medicalService, eyeService, eventSetting }) {
  const eventName = eventSetting?.event_name || "Brilian Talks Health Care";
  const eventLocation = eventSetting?.location || "BRI Pusat Cabang Benhil";
  const registeredAt = participant.registered_at
    ? new Date(participant.registered_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  // QR code URL via Google Charts API (no external lib needed)
  const qrData = encodeURIComponent(`${window.location.origin}/queue-monitor`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrData}`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Kupon Antrian - ${participant.full_name}</title>
  <style>
    @media print {
      @page { margin: 4mm; size: 80mm auto; }
      body { margin: 0; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #000;
      width: 76mm;
      margin: 0 auto;
      padding: 4mm 3mm;
      font-size: 11px;
    }
    /* ---- HEADER ---- */
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 2px dashed #000;
      margin-bottom: 8px;
    }
    .header .logo-line {
      font-size: 7px;
      letter-spacing: 2px;
      font-weight: bold;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 3px;
    }
    .header h1 {
      font-size: 13px;
      font-weight: 900;
      color: #003D79;
      line-height: 1.2;
    }
    .header .location {
      font-size: 9px;
      color: #444;
      margin-top: 2px;
    }
    .header .reg-time {
      font-size: 8px;
      color: #666;
      margin-top: 3px;
    }
    /* ---- PARTICIPANT ---- */
    .section-label {
      font-size: 7px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 3px;
    }
    .participant-block {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 8px;
      background: #f8f9fa;
    }
    .participant-block .p-name {
      font-size: 13px;
      font-weight: bold;
      color: #000;
    }
    .participant-block .p-reg {
      font-size: 9px;
      color: #555;
      font-family: monospace;
      margin-top: 1px;
    }
    .participant-block .p-detail {
      font-size: 9px;
      color: #444;
      margin-top: 3px;
    }
    /* ---- QUEUE BOXES ---- */
    .queues { display: flex; gap: 5px; margin-bottom: 8px; }
    .queue-box {
      flex: 1;
      border: 2px solid;
      border-radius: 5px;
      padding: 6px 4px;
      text-align: center;
    }
    .queue-box.medical { border-color: #003D79; }
    .queue-box.eye { border-color: #0284c7; }
    .q-label {
      font-size: 7px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      margin-bottom: 2px;
    }
    .q-number {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 2px;
      line-height: 1;
    }
    .queue-box.medical .q-number { color: #003D79; }
    .queue-box.eye .q-number { color: #0284c7; }
    .q-service {
      font-size: 8px;
      font-weight: 700;
      color: #333;
      margin-top: 3px;
      line-height: 1.2;
    }
    .q-booth { font-size: 7px; color: #777; margin-top: 1px; }
    .q-slot {
      display: inline-block;
      font-size: 8px;
      font-weight: bold;
      padding: 1px 5px;
      border-radius: 20px;
      margin-top: 3px;
    }
    .q-slot.free { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .q-slot.paid { background: #fed7aa; color: #9a3412; border: 1px solid #fdba74; }
    /* ---- QR ---- */
    .qr-section {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 8px;
    }
    .qr-section img { width: 60px; height: 60px; flex-shrink: 0; }
    .qr-text { font-size: 8px; color: #444; line-height: 1.4; }
    .qr-text strong { color: #003D79; display: block; margin-bottom: 2px; font-size: 9px; }
    /* ---- FOOTER ---- */
    .footer {
      border-top: 1px dashed #999;
      padding-top: 6px;
      text-align: center;
    }
    .footer .instruction {
      font-size: 8px;
      color: #444;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    .footer .timestamp {
      font-size: 7px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-line">Kupon Antrian Peserta</div>
    <h1>${eventName}</h1>
    <div class="location">${eventLocation}</div>
    <div class="reg-time">Waktu Daftar: ${registeredAt}</div>
  </div>

  <div class="section-label">Data Peserta</div>
  <div class="participant-block">
    <div class="p-name">${participant.full_name}</div>
    <div class="p-reg">${participant.registration_number}</div>
    <div class="p-detail">${participant.phone_number} &nbsp;&bull;&nbsp; ${participant.unit_division}</div>
  </div>

  <div class="section-label">Nomor Antrian</div>
  <div class="queues">
    <div class="queue-box medical">
      <div class="q-label">Layanan Medis</div>
      <div class="q-number">${medicalQueue.queue_number}</div>
      <div class="q-service">${medicalService.service_name}</div>
      <div class="q-booth">Booth ${medicalService.booth_number}</div>
      <span class="q-slot ${medicalQueue.slot_type === 'FREE' ? 'free' : 'paid'}">
        ${medicalQueue.slot_type === 'FREE' ? 'GRATIS' : 'BERBAYAR'}
      </span>
    </div>
    <div class="queue-box eye">
      <div class="q-label">Pemeriksaan Mata</div>
      <div class="q-number">${eyeQueue.queue_number}</div>
      <div class="q-service">${eyeService.service_name}</div>
      <div class="q-booth">Booth ${eyeService.booth_number}</div>
      <span class="q-slot ${eyeQueue.slot_type === 'FREE' ? 'free' : 'paid'}">
        ${eyeQueue.slot_type === 'FREE' ? 'GRATIS' : 'BERBAYAR'}
      </span>
    </div>
  </div>

  <div class="qr-section">
    <img src="${qrUrl}" alt="QR Monitor Antrian" />
    <div class="qr-text">
      <strong>Monitor Antrian Real-time</strong>
      Scan QR code untuk memantau nomor antrian Anda secara langsung di layar ponsel.
    </div>
  </div>

  <div class="footer">
    <div class="instruction">
      Silakan pantau nomor antrian Anda melalui layar LED atau scan QR code.<br/>
      Datang ke booth ketika nomor Anda tampil sebagai <strong>Now Serving</strong>.
    </div>
    <div class="timestamp">Dicetak: ${new Date().toLocaleString("id-ID")}</div>
  </div>

  <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 1000); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=360,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}