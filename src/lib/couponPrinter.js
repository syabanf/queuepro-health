export function printCoupon({ participant, queue, service, eventSetting }) {
  const eventName = eventSetting?.event_name || "Brilian Talks Health Care";
  const eventLocation = eventSetting?.location || "Aula Utama";
  const registeredAt = participant.registered_at
    ? new Date(participant.registered_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  function buildFallbackQr(data) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent("QUEUE:" + data)}&margin=4`;
  }

  const qrUrl = queue.qr_code_url || buildFallbackQr(queue.qr_token || queue.queue_number);
  const isMedical = service?.service_group === "MEDICAL";

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
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 2px dashed #000;
      margin-bottom: 8px;
    }
    .logos {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .logo-badge {
      font-size: 8px;
      font-weight: 900;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 1px;
    }
    .logo-bri { background: #003D79; color: #fff; }
    .logo-danantara { background: #1B5E20; color: #fff; }
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
    .header .location { font-size: 9px; color: #444; margin-top: 2px; }
    .header .reg-time { font-size: 8px; color: #666; margin-top: 3px; }
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
    .participant-block .p-name { font-size: 13px; font-weight: bold; color: #000; }
    .participant-block .p-reg { font-size: 9px; color: #555; font-family: monospace; margin-top: 1px; }
    .participant-block .p-detail { font-size: 9px; color: #444; margin-top: 3px; }
    .p-category {
      display: inline-block;
      font-size: 8px;
      font-weight: bold;
      padding: 2px 7px;
      border-radius: 20px;
      margin-top: 4px;
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }
    .queue-section {
      border: 2px solid;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 8px;
    }
    .queue-section.medical { border-color: #003D79; }
    .queue-section.eye { border-color: #0284c7; }
    .qs-header {
      font-size: 7px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-bottom: 4px;
    }
    .qs-body { display: flex; align-items: center; gap: 8px; }
    .qs-info { flex: 1; min-width: 0; }
    .qs-number {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 2px;
      line-height: 1;
    }
    .queue-section.medical .qs-number { color: #003D79; }
    .queue-section.eye .qs-number { color: #0284c7; }
    .qs-service { font-size: 9px; font-weight: 700; color: #333; margin-top: 3px; line-height: 1.3; }
    .qs-booth { font-size: 8px; color: #777; margin-top: 1px; }
    .qs-slot {
      display: inline-block;
      font-size: 8px;
      font-weight: bold;
      padding: 1px 5px;
      border-radius: 20px;
      margin-top: 4px;
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }
    .qs-qr { flex-shrink: 0; text-align: center; }
    .qs-qr img { width: 72px; height: 72px; display: block; }
    .qs-qr span { font-size: 6px; color: #999; display: block; margin-top: 2px; }
    .footer {
      border-top: 1px dashed #999;
      padding-top: 6px;
      text-align: center;
    }
    .footer .instruction { font-size: 8px; color: #333; line-height: 1.6; margin-bottom: 4px; font-weight: 600; }
    .footer .instruction-sub { font-size: 7.5px; color: #555; line-height: 1.5; margin-bottom: 4px; }
    .footer .timestamp { font-size: 7px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logos">
      <span class="logo-badge logo-bri">BRI</span>
      <span class="logo-line">Kupon Antrian Peserta</span>
      <span class="logo-badge logo-danantara">Danantara</span>
    </div>
    <h1>${eventName}</h1>
    <div class="location">${eventLocation}</div>
    <div class="reg-time">Waktu Daftar: ${registeredAt}</div>
  </div>

  <div class="section-label">Data Peserta</div>
  <div class="participant-block">
    <div class="p-name">${participant.full_name}</div>
    <div class="p-reg">${participant.registration_number}</div>
    <div class="p-detail">${participant.phone_number} &nbsp;&bull;&nbsp; ${participant.unit_division}</div>
    <span class="p-category">GRATIS</span>
  </div>

  <div class="section-label">${isMedical ? "Layanan Medis" : "Pemeriksaan Mata"}</div>
  <div class="queue-section ${isMedical ? "medical" : "eye"}">
    <div class="qs-header">${isMedical ? "Layanan Medis" : "Pemeriksaan Mata"} — Booth ${service?.booth_number || "-"}</div>
    <div class="qs-body">
      <div class="qs-info">
        <div class="qs-number">${queue.queue_number}</div>
        <div class="qs-service">${service?.service_name || ""}</div>
        <div class="qs-booth">Booth ${service?.booth_number || "-"} &bull; Kode ${service?.service_code || "-"}</div>
        <span class="qs-slot">GRATIS</span>
      </div>
      <div class="qs-qr">
        <img src="${qrUrl}" alt="QR Code" />
        <span>Scan untuk verifikasi</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="instruction">Harap bawa kupon ini ke booth layanan.</div>
    <div class="instruction-sub">
      Petugas akan melakukan scan QR sebelum pemeriksaan dimulai.<br/>
      Datang ke booth ketika nomor Anda tampil sebagai <strong>Now Serving</strong>.
    </div>
    <div class="timestamp">Dicetak: ${new Date().toLocaleString("id-ID")}</div>
  </div>

  <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 1000); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=360,height=650");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
