import React from "react";

export default function PrintCoupon({ result }) {
  if (!result) return null;
  const { participant, medicalQueue, eyeQueue, medicalService, eyeService } = result;

  const handlePrint = () => {
    const printContent = document.getElementById("coupon-print-area");
    const win = window.open("", "_blank", "width=400,height=600");
    win.document.write(`
      <html>
        <head>
          <title>Kupon Antrian - ${participant.full_name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Arial', sans-serif; background: #fff; padding: 20px; }
            .coupon { border: 2px solid #003D79; border-radius: 12px; padding: 20px; max-width: 320px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px dashed #ccc; padding-bottom: 12px; margin-bottom: 12px; }
            .header h1 { font-size: 14px; color: #003D79; font-weight: bold; }
            .header p { font-size: 11px; color: #666; margin-top: 2px; }
            .participant { background: #f0f6ff; border-radius: 8px; padding: 10px; margin-bottom: 14px; }
            .participant .name { font-size: 14px; font-weight: bold; color: #111; }
            .participant .reg { font-size: 11px; color: #666; margin-top: 2px; font-family: monospace; }
            .participant .info { font-size: 11px; color: #444; margin-top: 4px; }
            .queues { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
            .queue-box { border: 2px solid; border-radius: 8px; padding: 10px; text-align: center; }
            .queue-box.medical { border-color: #003D79; background: #f0f6ff; }
            .queue-box.eye { border-color: #0ea5e9; background: #f0f9ff; }
            .queue-box .label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
            .queue-box .number { font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 4px 0; }
            .queue-box.medical .number { color: #003D79; }
            .queue-box.eye .number { color: #0ea5e9; }
            .queue-box .service { font-size: 10px; color: #444; font-weight: 600; }
            .queue-box .slot { display: inline-block; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 20px; margin-top: 4px; }
            .slot.free { background: #d1fae5; color: #065f46; }
            .slot.paid { background: #fed7aa; color: #9a3412; }
            .footer { text-align: center; font-size: 10px; color: #999; border-top: 1px dashed #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="coupon">
            <div class="header">
              <h1>Queue System</h1>
              <p>BRI Pusat Cabang Benhil</p>
            </div>
            <div class="participant">
              <div class="name">${participant.full_name}</div>
              <div class="reg">${participant.registration_number}</div>
              <div class="info">${participant.phone_number} &nbsp;|&nbsp; ${participant.unit_division}</div>
            </div>
            <div class="queues">
              <div class="queue-box medical">
                <div class="label">Layanan Medis</div>
                <div class="number">${medicalQueue.queue_number}</div>
                <div class="service">${medicalService.service_name}</div>
                <span class="slot ${medicalQueue.slot_type === 'FREE' ? 'free' : 'paid'}">${medicalQueue.slot_type === 'FREE' ? 'GRATIS' : 'BAYAR'}</span>
              </div>
              <div class="queue-box eye">
                <div class="label">Pemeriksaan Mata</div>
                <div class="number">${eyeQueue.queue_number}</div>
                <div class="service">${eyeService.service_name}</div>
                <span class="slot ${eyeQueue.slot_type === 'FREE' ? 'free' : 'paid'}">${eyeQueue.slot_type === 'FREE' ? 'GRATIS' : 'BAYAR'}</span>
              </div>
            </div>
            <div class="footer">Mohon tunjukkan kupon ini kepada petugas.<br/>Waktu: ${new Date().toLocaleString("id-ID")}</div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return { handlePrint };
}