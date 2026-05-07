import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Users, UserPlus, Search, Shield, Stethoscope,
  Loader2, RefreshCw, Pencil, Check, X, KeyRound, Eye, EyeOff
} from "lucide-react";

const ROLE_CONFIG = {
  admin: {
    label: "Admin Pusat",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: Shield,
  },
  user: {
    label: "Nakes / Pelayanan",
    color: "bg-accent/10 text-accent border-accent/20",
    icon: Stethoscope,
  },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: "bg-muted text-muted-foreground border-border", icon: Users };
  const Icon = cfg.icon;
  return (
    <Badge className={`gap-1 border text-xs ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function PasswordInput({ value, onChange, placeholder = "Password..." }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pr-9"
      />
      <button
        type="button"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow(v => !v)}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  // Create user form
  const [createForm, setCreateForm] = useState({ email: "", full_name: "", role: "user", password: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Inline edit states
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingRoleValue, setEditingRoleValue] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const [editingPwId, setEditingPwId] = useState(null);
  const [editingPwValue, setEditingPwValue] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const filtered = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // Create user
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.email || !createForm.password) {
      setCreateError("Email dan password wajib diisi.");
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError("Password minimal 6 karakter.");
      return;
    }
    setCreating(true);
    try {
      const res = await base44.functions.invoke("adminCreateUser", {
        email: createForm.email.trim(),
        full_name: createForm.full_name.trim(),
        role: createForm.role,
        password: createForm.password,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Pengguna Dibuat", description: `${createForm.email} berhasil dibuat dengan password yang ditentukan.` });
      setCreateForm({ email: "", full_name: "", role: "user", password: "" });
      refetch();
    } catch (err) {
      setCreateError(err.message || "Gagal membuat pengguna.");
    } finally {
      setCreating(false);
    }
  };

  // Change role
  const handleSaveRole = async (u) => {
    setSavingRole(true);
    try {
      await base44.entities.User.update(u.id, { role: editingRoleValue });
      toast({ title: "Role Diperbarui", description: `${u.full_name || u.email} sekarang sebagai ${ROLE_CONFIG[editingRoleValue]?.label}.` });
      setEditingRoleId(null);
      refetch();
    } catch (err) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setSavingRole(false);
    }
  };

  // Change password
  const handleSavePassword = async (u) => {
    if (!editingPwValue || editingPwValue.length < 6) {
      toast({ title: "Gagal", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      const res = await base44.functions.invoke("adminSetUserPassword", {
        userId: u.id,
        password: editingPwValue,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Password Diperbarui", description: `Password ${u.full_name || u.email} berhasil diubah.` });
      setEditingPwId(null);
      setEditingPwValue("");
    } catch (err) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  const adminCount = users.filter(u => u.role === "admin").length;
  const nakesCount = users.filter(u => u.role === "user").length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Manajemen Pengguna</h1>
            <p className="text-sm text-muted-foreground">Buat akun, atur role, dan set password pengguna</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="sm:ml-auto gap-2" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total Pengguna</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{adminCount}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{nakesCount}</p>
              <p className="text-xs text-muted-foreground">Nakes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create User */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Buat Pengguna Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@contoh.com"
                  value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama Lengkap</Label>
                <Input
                  placeholder="Nama lengkap (opsional)"
                  value={createForm.full_name}
                  onChange={e => setCreateForm(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password <span className="text-destructive">*</span></Label>
                <PasswordInput
                  value={createForm.password}
                  onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 karakter"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select value={createForm.role} onValueChange={v => setCreateForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin Pusat</SelectItem>
                    <SelectItem value="user">Nakes / Pelayanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
            <Button type="submit" disabled={creating} className="gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Buat Pengguna
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Daftar Pengguna</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search ? "Tidak ada pengguna yang sesuai pencarian." : "Belum ada pengguna."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(u => (
                <div key={u.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{u.full_name || "(Belum diset)"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>

                    {/* Role + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editingRoleId === u.id ? (
                        <div className="flex items-center gap-2">
                          <Select value={editingRoleValue} onValueChange={setEditingRoleValue}>
                            <SelectTrigger className="h-8 w-44 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin Pusat</SelectItem>
                              <SelectItem value="user">Nakes / Pelayanan</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" className="h-8 w-8" onClick={() => handleSaveRole(u)} disabled={savingRole}>
                            {savingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingRoleId(null)} disabled={savingRole}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <RoleBadge role={u.role} />
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Ubah role"
                            onClick={() => { setEditingRoleId(u.id); setEditingRoleValue(u.role || "user"); setEditingPwId(null); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Ubah password"
                            onClick={() => { setEditingPwId(u.id); setEditingPwValue(""); setEditingRoleId(null); }}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline password editor */}
                  {editingPwId === u.id && (
                    <div className="mt-3 ml-14 flex items-center gap-2">
                      <PasswordInput
                        value={editingPwValue}
                        onChange={e => setEditingPwValue(e.target.value)}
                        placeholder="Password baru (min. 6 karakter)"
                      />
                      <Button size="sm" className="gap-1 whitespace-nowrap" onClick={() => handleSavePassword(u)} disabled={savingPw}>
                        {savingPw ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Simpan
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingPwId(null)} disabled={savingPw}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}