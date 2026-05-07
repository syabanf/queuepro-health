import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Eye, EyeOff, Loader2, AlertCircle, Shield, Stethoscope, Monitor, Users } from "lucide-react";

const DEMO_USERS = {
  admin: { username: "admin", password: "admin123", label: "Admin Pusat", redirectTo: "/" },
  nakes: { username: "nakes", password: "nakes", label: "Nakes / Petugas Pelayanan", redirectTo: "/booth" },
};

export default function DemoLauncher() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const [error, setError] = useState("");

  const doLogin = async (username, pass, redirectTo = "/", demoKey = null) => {
    if (demoKey) setDemoLoading(demoKey); else setLoading(true);
    setError("");
    try {
      // Real login attempt
      const response = await base44.auth.login(username, pass);
      // If login succeeds, redirect
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 500);
    } catch (err) {
      console.error("Login error:", err);
      setError("Username atau password salah.");
      if (demoKey) setDemoLoading(null); else setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Email dan password wajib diisi."); return; }
    doLogin(email, password, "/");
  };

  const handleDemo = (key) => {
    const u = DEMO_USERS[key];
    doLogin(u.username, u.password, u.redirectTo, key);
  };

  const openPublicMonitor = () => { window.location.href = "/mobile-monitor"; };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(135deg, #003D79 0%, #005BAB 50%, #0095E8 100%)"
    }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* App Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Brilian Talks Health Care</h1>
          <p className="text-cyan-200/80 text-sm mt-1">Sistem Manajemen Antrian Layanan Kesehatan</p>
        </div>

        <Card className="shadow-2xl border-white/10 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">Masuk ke Sistem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  className="mt-1"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button type="button" tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPass(p => !p)}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex flex-col gap-1 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">{error}</span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Masuk...</> : "Masuk"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Akses Cepat</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Demo Buttons */}
            <div className="space-y-2">
              {/* Demo Admin */}
              <button
                type="button"
                onClick={() => handleDemo("admin")}
                disabled={!!demoLoading || loading}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-left disabled:opacity-60 group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Demo Admin Pusat</span>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] border">ADMIN</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{DEMO_USERS.admin.username} · {DEMO_USERS.admin.password}</p>
                </div>
                {demoLoading === "admin" ? <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" /> : null}
              </button>

              {/* Demo Nakes */}
              <button
                type="button"
                onClick={() => handleDemo("nakes")}
                disabled={!!demoLoading || loading}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-accent/20 bg-accent/5 hover:bg-accent/10 hover:border-accent/40 transition-all text-left disabled:opacity-60 group"
              >
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20">
                  <Stethoscope className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Demo Nakes</span>
                    <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] border">NAKES</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{DEMO_USERS.nakes.username} · {DEMO_USERS.nakes.password}</p>
                </div>
                {demoLoading === "nakes" ? <Loader2 className="w-4 h-4 animate-spin text-accent flex-shrink-0" /> : null}
              </button>

              {/* Public Monitor */}
              <button
                type="button"
                onClick={openPublicMonitor}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200">
                  <Monitor className="w-4 h-4 text-green-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-800">Buka Monitor Publik</span>
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] border">PUBLIK</Badge>
                  </div>
                  <p className="text-xs text-green-600">Tanpa login — Lihat antrian real-time</p>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pt-1">
              Klik tombol di atas untuk login otomatis dengan akun demo.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-white/30 text-xs mt-6 uppercase tracking-widest">
          Healthy People, Healthy Performance
        </p>
      </div>
    </div>
  );
}