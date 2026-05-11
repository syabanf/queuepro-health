const SERVICE_VISUAL = {
  'svc-a': { grad: ['#003D79', '#005BAB'], icon: '♥', label: 'MINI MCU' },
  'svc-b': { grad: ['#004D8C', '#0069C0'], icon: '💉', label: 'VITAMIN C' },
  'svc-c': { grad: ['#005BAB', '#0077CC'], icon: '💉', label: 'VAKSIN INFLUENZA' },
  'svc-d': { grad: ['#004D8C', '#006BB3'], icon: '👁', label: 'AIRDOC' },
  'svc-e': { grad: ['#003D79', '#005BAB'], icon: '👁', label: 'AUTOREF' },
};

export function printCoupon({ participant, queue, service, eventSetting }) {
  const eventName     = eventSetting?.event_name || "Brilian Talks Health Care";
  const eventLocation = eventSetting?.location   || "Aula Utama";
  const registeredAt  = participant.registered_at
    ? new Date(participant.registered_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  const qrUrl = queue.qr_code_url ||
    `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent("QUEUE:" + queue.qr_token || queue.queue_number)}&margin=4`;

  const vis = SERVICE_VISUAL[service?.id] || SERVICE_VISUAL['svc-a'];
  const [c1, c2] = vis.grad;
  const isMedical = service?.service_group === "MEDICAL";

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Kupon Antrian - ${participant.full_name}</title>
  <style>
    @media print {
      @page { margin: 0; size: 80mm 120mm; }
      body { margin: 0; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      width: 80mm;
      margin: 0 auto;
    }

    /* ── KEY VISUAL BANNER ── */
    .banner {
      background: linear-gradient(160deg, ${c1} 0%, ${c2} 100%);
      padding: 8px 10px 6px;
      color: white;
    }
    .banner-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .brand-bri {
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      color: white;
    }
    .brand-provider {
      font-size: 8px;
      font-weight: bold;
      color: rgba(255,255,255,0.7);
      letter-spacing: 1px;
    }
    .service-name {
      text-align: center;
      font-size: 14px;
      font-weight: 900;
      color: white;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 4px 0;
    }
    .queue-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 6px 0 8px;
    }
    .code-badge {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .code-badge .letter { font-size: 20px; font-weight: 900; color: white; line-height: 1; }
    .code-badge .sub { font-size: 5px; font-weight: bold; color: rgba(255,255,255,0.6); text-transform: uppercase; }
    .queue-icon { font-size: 22px; }
    .queue-num {
      font-size: 40px;
      font-weight: 900;
      color: white;
      letter-spacing: 2px;
      line-height: 1;
    }
    .instruction {
      text-align: center;
      font-size: 7px;
      font-weight: bold;
      color: rgba(255,255,255,0.6);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 4px 0 6px;
      border-top: 1px solid rgba(255,255,255,0.15);
    }

    /* ── PARTICIPANT INFO ── */
    .info-section {
      padding: 6px 10px;
      background: #fff;
      border-bottom: 1px dashed #ccc;
    }
    .info-row { display: flex; gap: 6px; margin-bottom: 2px; }
    .info-label { font-size: 7px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; width: 60px; flex-shrink: 0; }
    .info-value { font-size: 9px; color: #222; font-weight: 600; flex: 1; }
    .info-reg { font-size: 8px; font-family: monospace; color: #555; }

    /* ── QR + FOOTER ── */
    .qr-section {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
    }
    .qr-section img { width: 60px; height: 60px; flex-shrink: 0; }
    .qr-info { flex: 1; }
    .qr-info p { font-size: 7.5px; color: #444; line-height: 1.5; }
    .qr-label { font-size: 6px; color: #999; text-align: center; display: block; }
    .timestamp { text-align: center; font-size: 6.5px; color: #bbb; padding: 2px 0 4px; }
  </style>
</head>
<body>

  <!-- KEY VISUAL BANNER -->
  <div class="banner">
    <div class="banner-top">
      <span class="brand-bri">BRI</span>
      <span class="brand-provider">${isMedical ? 'PRIMAYA HOSPITAL' : 'OPTIK MELAWAI'}</span>
    </div>
    <div class="service-name">${service?.service_name || ''}</div>
    <div class="queue-row">
      <div class="code-badge">
        <span class="letter">${service?.service_code || '?'}</span>
        <span class="sub">${vis.label}</span>
      </div>
      <span class="queue-icon">${vis.icon}</span>
      <span class="queue-num">${queue.queue_number}</span>
    </div>
    <div class="instruction">SILAKAN MENUNGGU PANGGILAN DI LAYAR</div>
  </div>

  <!-- PARTICIPANT INFO -->
  <div class="info-section">
    <div class="info-row"><span class="info-label">Nama</span><span class="info-value">${participant.full_name}</span></div>
    <div class="info-row"><span class="info-label">No. Reg</span><span class="info-value info-reg">${participant.registration_number}</span></div>
    <div class="info-row"><span class="info-label">Telepon</span><span class="info-value">${participant.phone_number}</span></div>
    <div class="info-row"><span class="info-label">Unit</span><span class="info-value">${participant.unit_division}</span></div>
    <div class="info-row"><span class="info-label">Event</span><span class="info-value">${eventName}</span></div>
    <div class="info-row"><span class="info-label">Waktu</span><span class="info-value">${registeredAt}</span></div>
  </div>

  <!-- QR + NOTE -->
  <div class="qr-section">
    <div>
      <img src="${qrUrl}" alt="QR" />
      <span class="qr-label">Scan untuk verifikasi</span>
    </div>
    <div class="qr-info">
      <p><strong>Booth ${service?.booth_number || '-'}</strong> — Kode ${service?.service_code || '-'}</p>
      <p>${eventLocation}</p>
      <p>Harap bawa kupon ini dan tunjukkan ke petugas booth.</p>
      <p>Datang ke booth saat nomor Anda tampil sebagai <strong>Now Serving</strong>.</p>
    </div>
  </div>
  <div class="timestamp">Dicetak: ${new Date().toLocaleString("id-ID")}</div>

  <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 1200); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=360,height=580");
  if (win) { win.document.write(html); win.document.close(); }
}
