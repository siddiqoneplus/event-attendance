"use client";

import { useEffect, useState } from "react";
import { Shield, Briefcase, Plus, X, Pencil, Trash2, Loader2, KeyRound, AlertTriangle } from "lucide-react";

interface UserItem {
  id: string; name: string; username: string; email: string | null; role: string; status: string;
}

const inputCls = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all";

export default function UsersList() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Add modal state ──────────────────────────────────────────
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', username: '', password: '', email: '', role: 'EMPLOYEE' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // ── Edit modal state ─────────────────────────────────────────
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', email: '', role: '', status: '', password: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // ── Delete modal state ───────────────────────────────────────
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || []);
        setLoading(false);
      });
  }, []);

  // ── Add handler ──────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');
      setUsers(prev => [...prev, data.user]);
      setIsAddOpen(false);
      setAddForm({ name: '', username: '', password: '', email: '', role: 'EMPLOYEE' });
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAddSubmitting(false);
    }
  };

  // ── Open edit modal ──────────────────────────────────────────
  const openEdit = (user: UserItem) => {
    setEditUser(user);
    setEditForm({ name: user.name, username: user.username, email: user.email || '', role: user.role, status: user.status, password: '' });
    setEditError('');
  };

  // ── Save edit handler ────────────────────────────────────────
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      const payload: Record<string, string> = {
        name: editForm.name,
        username: editForm.username,
        email: editForm.email,
        role: editForm.role,
        status: editForm.status,
      };
      if (editForm.password) payload.password = editForm.password;

      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      setUsers(prev => prev.map(u => u.id === editUser.id ? data.user : u));
      setEditUser(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Delete handler ───────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteSubmitting(true);
    try {
      await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      setDeleteUser(null);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users &amp; Employees</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage system access and staff accounts</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/30"
          onClick={() => { setIsAddOpen(true); setAddError(''); }}
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">User Info</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {user.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-sm text-slate-500">@{user.username}{user.email ? ` • ${user.email}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20' : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Employee Modal ─────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New User</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              {addError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900/50">{addError}</div>}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <input type="text" required value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className={inputCls} placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                <input type="text" required value={addForm.username} onChange={e => setAddForm({ ...addForm, username: e.target.value })} className={inputCls} placeholder="e.g. johndoe" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} className={inputCls} placeholder="john@example.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <input type="password" required value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} className={inputCls} placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} className={inputCls}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={addSubmitting} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                  {addSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit User</h2>
                <p className="text-sm text-slate-500 mt-0.5">@{editUser.username}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {editError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900/50">{editError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                  <input type="text" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                  <input type="text" required value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} placeholder="optional" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                  <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className={inputCls}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}>
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>
              {/* Change password section */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-slate-400" /> New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
                </label>
                <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className={inputCls} placeholder="••••••••" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                  {editSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────── */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delete User?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to delete <strong>{deleteUser.name}</strong> (@{deleteUser.username})? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setDeleteUser(null)} disabled={deleteSubmitting} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteSubmitting} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                {deleteSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
