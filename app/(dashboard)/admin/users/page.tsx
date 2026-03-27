"use client";

import { useState } from "react";
import { Users, Plus, Search, Trash2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { RoleBadge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/utils/format";
import type { User } from "@/types";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STUDENT" as "ADMIN" | "LANDLORD" | "STUDENT", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to load users");
      }
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create user");
      return json;
    },
    onSuccess: () => {
      toast.success("User created successfully!");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setCreateModal(false);
      setApiError(null);
      setForm({ name: "", email: "", password: "", role: "STUDENT", phone: "" });
    },
    onError: (err: Error) => {
      setApiError(err.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete user");
    },
    onSuccess: () => {
      toast.success("User deleted");
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

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Users</h1>
          <p className="text-sm text-slate-400 mt-1">{users.length} total users</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setCreateModal(true); setApiError(null); }}>
          Create User
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={[
              { value: "", label: "All Roles" },
              { value: "STUDENT", label: "Students" },
              { value: "LANDLORD", label: "Landlords" },
              { value: "ADMIN", label: "Admins" },
            ]}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/50">
              {["User", "Role", "Phone", "Joined", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No users found</td></tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{user.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { if (confirm("Delete this user?")) deleteUser.mutate(user.id); }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={createModal}
        onClose={() => { setCreateModal(false); setApiError(null); setErrors({}); }}
        title="Create New User"
        size="md"
      >
        <div className="space-y-4">
          {apiError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{apiError}</p>
            </div>
          )}
          <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Hassan Mahmud" />
          <Input label="Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} placeholder="user@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} hint="Minimum 8 characters" />
          <Select
            label="Role"
            options={[
              { value: "STUDENT", label: "Student" },
              { value: "LANDLORD", label: "Landlord" },
              { value: "ADMIN", label: "Admin" },
            ]}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
          />
          <Input label="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+2348012345678" />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCreateModal(false); setApiError(null); }}>Cancel</Button>
            <Button
              className="flex-1"
              loading={createUser.isPending}
              onClick={() => { if (validate()) createUser.mutate(form); }}
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
