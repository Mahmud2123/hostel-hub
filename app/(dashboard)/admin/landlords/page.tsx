"use client";

import { useState } from "react";
import { Plus, Search, ShieldCheck, Trash2, AlertCircle, Mail, Phone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { RoleBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/utils/format";
import type { User } from "@/types";
import toast from "react-hot-toast";

export default function AdminLandlordsPage() {
  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const landlords = users.filter((u) => u.role === "LANDLORD");

  const createLandlord = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "LANDLORD" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create landlord");
      return json;
    },
    onSuccess: () => {
      toast.success("Landlord account created!");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setCreateModal(false);
      setApiError(null);
      setForm({ name: "", email: "", password: "", phone: "" });
    },
    onError: (err: Error) => setApiError(err.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Landlord removed");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name required";
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Valid email required";
    if (!form.password || form.password.length < 8) errs.password = "Password must be 8+ characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const filtered = landlords.filter((l) =>
    !search ||
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Landlords</h1>
          <p className="text-sm text-slate-400 mt-1">{landlords.length} registered landlords</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setCreateModal(true); setApiError(null); }}>
          Create Landlord
        </Button>
      </div>

      <Input
        placeholder="Search landlords..."
        leftIcon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No landlords yet"
          description="Create a landlord account so they can list their properties on HostelHub."
          action={{ label: "Create Landlord", onClick: () => setCreateModal(true) }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((landlord) => (
            <div key={landlord.id} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-5 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sm font-bold text-sky-400">
                  {landlord.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={landlord.role} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { if (confirm("Remove this landlord?")) deleteUser.mutate(landlord.id); }}
                    className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="font-semibold text-slate-100 truncate">{landlord.name}</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{landlord.email}</span>
                </div>
                {landlord.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span>{landlord.phone}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-700/50">
                Joined {formatDate(landlord.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={createModal}
        onClose={() => { setCreateModal(false); setApiError(null); setErrors({}); }}
        title="Create Landlord Account"
        description="This landlord can immediately sign in and list properties — no email verification needed."
        size="md"
      >
        <div className="space-y-4">
          {apiError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{apiError}</p>
            </div>
          )}
          <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="John Adeyemi" />
          <Input label="Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} placeholder="landlord@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} hint="They can change this after signing in" />
          <Input label="Phone Number (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+2348012345678" />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCreateModal(false); setApiError(null); }}>Cancel</Button>
            <Button
              className="flex-1"
              loading={createLandlord.isPending}
              onClick={() => { if (validate()) createLandlord.mutate(); }}
            >
              Create Landlord
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
