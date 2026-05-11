import React, { useState } from "react";
import { base44 } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, CheckCircle2, AlertCircle, Users, Copy, Check } from "lucide-react";

const DEMO_USERS = [
  { email: "admin@brilianhealth.demo", role: "admin", label: "Admin Pusat", password: "Demo@Admin123" },
  { email: "nakes@brilianhealth.demo", role: "user", label: "Nakes / Pelayanan", password: "Demo@Nakes123" },
];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

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
        res.push({ ...u, status: "invited" });
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Error";
        const alreadyExists = msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist");
        res.push({ ...u, status: alreadyExists ? "exists" : "error", msg });
      }
    }
    setResults(res);
    setLoading(false);
  };

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Demo Accounts</p>
              <p className="text-xs text-muted-foreground">Akun siap pakai untuk testing & demo</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-2 flex-shrink-0" onClick={handleSeed} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat...</> : <><UserPlus className="w-4 h-4" /> Invite Demo Users</>}
          </Button>
        </div>

        {/* Credentials Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Role</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Password</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_USERS.map(u => (
                <tr key={u.email} className="border-b last:border-0 border-border">
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-[10px]">{u.label}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-foreground">{u.email}</span>
                    <CopyBtn text={u.email} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-foreground">{u.password}</span>
                    <CopyBtn text={u.password} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invite Results */}
        {results && (
          <div className="space-y-1">
            {results.map(r => (
              <div key={r.email} className="flex items-center gap-2 text-xs">
                {r.status === "invited" || r.status === "exists"
                  ? <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${r.status === "invited" ? "text-green-600" : "text-blue-500"}`} />
                  : <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                }
                <span className="font-mono">{r.email}</span>
                <Badge variant="outline" className={`text-[10px] ml-auto
                  ${r.status === "invited" ? "border-green-300 text-green-700 bg-green-50" :
                    r.status === "exists" ? "border-blue-300 text-blue-700 bg-blue-50" :
                    "border-red-300 text-red-700 bg-red-50"}`}>
                  {r.status === "invited" ? "Undangan Terkirim" : r.status === "exists" ? "Sudah Ada" : "Gagal"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="text-[10px] text-amber-700 p-2.5 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
          <p className="font-semibold">⚙️ Setup Awal (sekali saja):</p>
          <p>1. Klik <strong>"Invite Demo Users"</strong> → kedua user akan ditambahkan ke sistem</p>
          <p>2. Setelah itu, tombol demo login di halaman utama akan langsung berfungsi</p>
        </div>
      </CardContent>
    </Card>
  );
}