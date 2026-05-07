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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, UserPlus, Search, Shield, Stethoscope, Loader2, RefreshCw, Eye, EyeOff, Pencil } from "lucide-react";

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder || "Password..."}
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

const ROLE_LABEL = { admin: "Admin", user: "Nakes / Pelayanan" };

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ email: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Edit state
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "user", password: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const filtered = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("Email dan password wajib diisi."); return; }
    if (form.password.length < 6) { setError("Password minimal 6 karakter."); return; }
    setCreating(true);
    try {
      const res = await base44.functions.invoke("createAppUser", {
        email: form.email.trim(),
        role: form.role,
        password: form.password,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Berhasil", description: `Pengguna ${form.email} berhasil dibuat.` });
      setForm({ email: "", password: "", role: "user" });
      refetch();
    } catch (err) {
      setError(err.message || "Gagal membuat pengguna.");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ full_name: u.full_name || "", role: u.role || "user", password: "" });
    setEditError("");
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError("");
    if (editForm.password && editForm.password.length < 6) {
      setEditError("Password minimal 6 karakter."); return;
    }
    setEditSaving(true);
    try {
      const payload = {
        email: editUser.email,
        role: editForm.role,
        ...(editForm.password ? { password: editForm.password } : {}),
      };
      const res = await base44.functions.invoke("createAppUser", payload);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Berhasil", description: "Data pengguna berhasil diperbarui." });
      setEditUser(null);
      refetch();
    } catch (err) {
      setEditError(err.message || "Gagal memperbarui pengguna.");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Manajemen Pengguna</h1>
            <p className="text-sm text-muted-foreground">Buat akun pengguna yang bisa login ke sistem</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Form Buat Pengguna */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Buat Pengguna Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                placeholder="email@contoh.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password <span className="text-destructive">*</span></Label>
              <PasswordInput
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Min. 6 karakter"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Nakes / Pelayanan</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-xs text-destructive sm:col-span-3">{error}</p>}
            <Button type="submit" disabled={creating} className="gap-2 sm:col-span-3 sm:w-fit">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Buat Pengguna
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Daftar Pengguna */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Daftar Pengguna ({users.length})</CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              {search ? "Tidak ada pengguna yang sesuai." : "Belum ada pengguna."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs gap-1 flex-shrink-0">
                    {u.role === "admin" ? <Shield className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                    {ROLE_LABEL[u.role] || u.role}
                  </Badge>
                  <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0" onClick={() => openEdit(u)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={open => !open && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={editUser.email} disabled className="bg-muted text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Nakes / Pelayanan</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password Baru <span className="text-muted-foreground">(opsional)</span></Label>
                <PasswordInput
                  value={editForm.password}
                  onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Kosongkan jika tidak diubah"
                />
              </div>
              {editError && <p className="text-xs text-destructive">{editError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Batal</Button>
                <Button type="submit" disabled={editSaving} className="gap-2">
                  {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}