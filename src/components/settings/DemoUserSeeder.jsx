import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, CheckCircle2, AlertCircle, Users } from "lucide-react";

const DEMO_USERS = [
  { email: "admin@brilianhealth.demo", full_name: "Petugas Registrasi", role: "admin", label: "Admin Pusat", password: "admin123" },
  { email: "nakes@brilianhealth.demo", full_name: "Petugas Pelayanan", role: "user", label: "Nakes / Petugas Pelayanan", password: "nakes123" },
];

export default function DemoUserSeeder() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSeed = async () => {
    setLoading(true);
    setResults(null);
    const res = [];
    for (const u of DEMO_USERS) {
      try {
        await base44.users.inviteUser(u.email, u.role);
        res.push({ email: u.email, status: "invited", label: u.label });
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Error";
        const alreadyExists = msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist");
        res.push({ email: u.email, status: alreadyExists ? "exists" : "error", label: u.label, msg });
      }
    }
    setResults(res);
    setLoading(false);
  };

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Demo Users</p>
              <p className="text-xs text-muted-foreground">
                Buat akun demo: <span className="font-mono">admin@brilianhealth.demo</span> & <span className="font-mono">nakes@brilianhealth.demo</span>
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-2 flex-shrink-0" onClick={handleSeed} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat...</> : <><UserPlus className="w-4 h-4" /> Buat Demo Users</>}
          </Button>
        </div>

        {results && (
          <div className="mt-3 space-y-1.5">
            {results.map(r => (
              <div key={r.email} className="flex items-center gap-2 text-xs">
                {r.status === "invited"
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  : r.status === "exists"
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    : <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                }
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground font-mono">{r.email}</span>
                <Badge variant="outline" className={`text-[10px] ml-auto
                  ${r.status === "invited" ? "border-green-300 text-green-700 bg-green-50" :
                    r.status === "exists" ? "border-blue-300 text-blue-700 bg-blue-50" :
                    "border-red-300 text-red-700 bg-red-50"}`}>
                  {r.status === "invited" ? "Undangan Terkirim" : r.status === "exists" ? "Sudah Ada" : "Gagal"}
                </Badge>
              </div>
            ))}
            {results.some(r => r.status === "invited") && (
              <p className="text-[10px] text-amber-600 mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                ⚠ Pengguna baru menerima email undangan. Mereka perlu mengatur password melalui link di email sebelum bisa login.
                Untuk demo, gunakan fungsi "Reset Password" atau pastikan password sudah diset via dashboard Base44.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}