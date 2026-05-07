import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Users, UserPlus, Search, Shield, Stethoscope,
  Mail, Loader2, RefreshCw, Pencil, Check, X
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

function InlineRoleEditor({ user, onSave, onCancel, saving }) {
  const [role, setRole] = useState(user.role || "user");
  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin Pusat</SelectItem>
          <SelectItem value="user">Nakes / Pelayanan</SelectItem>
        </SelectContent>
      </Select>
      <Button size="icon" className="h-8 w-8" onClick={() => onSave(role)} disabled={saving}>
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCancel} disabled={saving}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [savingRole, setSavingRole] = useState(false);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const filtered = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast({ title: "Undangan Terkirim", description: `${inviteEmail} telah diundang sebagai ${ROLE_CONFIG[inviteRole]?.label}.` });
      setInviteEmail("");
      refetch();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Gagal mengirim undangan.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleSaveRole = async (user, newRole) => {
    setSavingRole(true);
    try {
      await base44.entities.User.update(user.id, { role: newRole });
      toast({ title: "Role Diperbarui", description: `${user.full_name || user.email} sekarang sebagai ${ROLE_CONFIG[newRole]?.label}.` });
      setEditingUserId(null);
      refetch();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Gagal memperbarui role.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    } finally {
      setSavingRole(false);
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
            <p className="text-sm text-muted-foreground">Kelola akun dan peran pengguna sistem</p>
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

      {/* Invite User */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Undang Pengguna Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@contoh.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin Pusat</SelectItem>
                <SelectItem value="user">Nakes / Pelayanan</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviting || !inviteEmail.trim()} className="gap-2 whitespace-nowrap">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Kirim Undangan
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
                <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
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

                  {/* Role */}
                  <div className="flex-shrink-0">
                    {editingUserId === u.id ? (
                      <InlineRoleEditor
                        user={u}
                        onSave={(newRole) => handleSaveRole(u, newRole)}
                        onCancel={() => setEditingUserId(null)}
                        saving={savingRole}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <RoleBadge role={u.role} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingUserId(u.id)}
                          title="Ubah role"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}