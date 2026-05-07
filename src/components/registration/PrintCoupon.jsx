import React from "react";
import { QUOTA_CATEGORY_FULL_LABELS } from "@/lib/registrationUtils";

export default function PrintCoupon({ result }) {
  if (!result) return null;
  const { participant, medicalQueue, eyeQueue, medicalService, eyeService } = result;

  const getCategoryLabel = (queue) => {
    if (!queue?.quota_category) return queue?.payment_display_status || "";
    return QUOTA_CATEGORY_FULL_LABELS[queue.quota_category] || queue.quota_category;
  };

  const getCategoryStyle = (queue) => {
    const cat = queue?.quota_category;
    if (cat === "FULL_FREE") return "background:#d1fae5;color:#065f46;";
    if (cat === "CC_RP_1") return "background:#dbeafe;color:#1e40af;";
    if (cat === "FULL_PAID") return "background:#fed7aa;color:#9a3412;";
    return "background:#f3f4f6;color:#374151;";
  };

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=420,height=700");
    win.document.write(`
      <html>
        <head>
          <title>Kupon Antrian - ${participant.full_name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Arial', sans-serif; background: #fff; padding: 20px; }
            .coupon { border: 2px solid #003D79; border-radius: 12px; padding: 20px; max-width: 360px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px dashed #ccc; padding-bottom: 12px; margin-bottom: 12px; }
            .header h1 { font-size: 14px; color: #003D79; font-weight: bold; }
            .header p { font-size: 11px; color: #666; margin-top: 2px; }
            .participant { background: #f0f6ff; border-radius: 8px; padding: 10px; margin-bottom: 14px; }
            .participant .name { font-size: 14px; font-weight: bold; color: #111; }
            .participant .reg { font-size: 11px; color: #666; margin-top: 2px; font-family: monospace; }
            .participant .info { font-size: 11px; color: #444; margin-top: 4px; }
            .service-section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
            .service-section.medical { border-color: #003D79; background: #f8faff; }
            .service-section.eye { border-color: #0ea5e9; background: #f0f9ff; }
            .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #888; letter-spacing: 0.5px; margin-bottom: 6px; }
            .queue-number { font-size: 32px; font-weight: 900; letter-spacing: 3px; }
            .medical .queue-number { color: #003D79; }
            .eye .queue-number { color: #0ea5e9; }
            .detail-row { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
            .detail-label { font-size: 10px; color: #666; }
            .detail-value { font-size: 10px; color: #111; font-weight: 600; }
            .kategori-badge { display: inline-block; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 20px; margin-top: 6px; }
            .qr-section { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; margin-bottom: 12px; }
            .qr-item { text-align: center; }
            .qr-item img { width: 80px; height: 80px; border: 1px solid #e5e7eb; border-radius: 4px; }
            .qr-item .qr-label { font-size: 9px; color: #888; margin-top: 4px; }
            .instruction { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px; font-size: 10px; color: #92400e; text-align: center; margin-bottom: 10px; }
            .footer { text-align: center; font-size: 10px; color: #999; border-top: 1px dashed #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="coupon">
            <div class="header">
              <h1>Brilian Talks Health Care</h1>
              <p>BRI Pusat Cabang Benhil</p>
            </div>

            <div class="participant">
              <div class="name">${participant.full_name}</div>
              <div class="reg">${participant.registration_number}</div>
              <div class="info">${participant.phone_number} &nbsp;|&nbsp; ${participant.unit_division}</div>
            </div>

            <!-- Medical Service -->
            <div class="service-section medical">
              <div class="section-title">Layanan Medis</div>
              <div class="queue-number">${medicalQueue.queue_number}</div>
              <div class="detail-row">
                <span class="detail-label">Pos Kesehatan</span>
                <span class="detail-value">${medicalService.service_code}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Layanan</span>
                <span class="detail-value">${medicalService.service_name}</span>
              </div>
              <span class="kategori-badge" style="${getCategoryStyle(medicalQueue)}">
                ${getCategoryLabel(medicalQueue)}
              </span>
            </div>

            <!-- Eye Check Service -->
            <div class="service-section eye">
              <div class="section-title">Pemeriksaan Mata</div>
              <div class="queue-number">${eyeQueue.queue_number}</div>
              <div class="detail-row">
                <span class="detail-label">Pos Kesehatan</span>
                <span class="detail-value">${eyeService.service_code}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Layanan</span>
                <span class="detail-value">${eyeService.service_name}</span>
              </div>
              <span class="kategori-badge" style="${getCategoryStyle(eyeQueue)}">
                ${getCategoryLabel(eyeQueue)}
              </span>
            </div>

            <!-- QR Codes -->
            <div class="qr-section">
              <div class="qr-item">
                <img src="${medicalQueue.qr_code_url}" alt="QR Medis" />
                <div class="qr-label">QR ${medicalQueue.queue_number}</div>
              </div>
              <div class="qr-item">
                <img src="${eyeQueue.qr_code_url}" alt="QR Mata" />
                <div class="qr-label">QR ${eyeQueue.queue_number}</div>
              </div>
            </div>

            <div class="instruction">
              Harap bawa kupon ini ke booth layanan.<br/>
              Petugas akan melakukan scan QR sebelum pemeriksaan dimulai.
            </div>

            <div class="footer">Waktu: ${new Date().toLocaleString("id-ID")}</div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return { handlePrint };
}