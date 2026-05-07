import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table2 } from "lucide-react";

function getStatus(service) {
  if (!service.is_active) return { label: "TIDAK AKTIF", color: "bg-gray-100 text-gray-500 border-gray-200" };
  const freeRem = (service.free_quota || 0) - (service.used_free_quota || 0);
  const paidRem = (service.paid_quota || 0) - (service.used_paid_quota || 0);
  const hasQuota = (service.free_quota || 0) + (service.paid_quota || 0) > 0;
  if (!hasQuota) return { label: "BELUM DISET", color: "bg-blue-50 text-blue-500 border-blue-200" };
  if (freeRem > 0) return { label: "FREE TERSEDIA", color: "bg-green-100 text-green-700 border-green-200" };
  if (freeRem <= 0 && paidRem > 0) return { label: "FREE HABIS · PAID TERSEDIA", color: "bg-blue-100 text-blue-700 border-blue-200" };
  return { label: "KUOTA HABIS", color: "bg-red-100 text-red-700 border-red-200" };
}

export default function QuotaPreviewTable({ services }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Table2 className="w-4 h-4 text-primary" /> Preview Tabel Kuota
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 border-y border-border">
              <tr>
                {["Kode", "Nama Layanan", "Booth", "Kuota Gratis", "Terpakai", "Sisa Gratis", "Kuota Bayar", "Terpakai", "Sisa Bayar", "Status", "Aktif"].map((h, i) => (
                  <th key={i} className="text-left font-semibold text-muted-foreground py-2.5 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map(s => {
                const freeRem = Math.max(0, (s.free_quota || 0) - (s.used_free_quota || 0));
                const paidRem = Math.max(0, (s.paid_quota || 0) - (s.used_paid_quota || 0));
                const status = getStatus(s);
                const isEye = s.service_group === "EYE_CHECK";
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="py-2.5 px-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold
                        ${isEye ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                        {s.service_code}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium">{s.service_name}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{s.booth_number || "—"}</td>
                    <td className="py-2.5 px-3 text-center">{s.free_quota || 0}</td>
                    <td className="py-2.5 px-3 text-center text-green-700 font-bold">{s.used_free_quota || 0}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`font-bold ${freeRem === 0 && (s.free_quota || 0) > 0 ? "text-destructive" : ""}`}>{freeRem}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">{s.paid_quota || 0}</td>
                    <td className="py-2.5 px-3 text-center text-orange-600 font-bold">{s.used_paid_quota || 0}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`font-bold ${paidRem === 0 && (s.paid_quota || 0) > 0 ? "text-destructive" : ""}`}>{paidRem}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge className={`text-[10px] border whitespace-nowrap ${status.color}`}>{status.label}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${s.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}