import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, ShieldAlert, UserCog } from 'lucide-react';
import api from '../services/api';

const roles = ['super_admin', 'admin', 'staff'];

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/super-admin/users');
      setUsers(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter((user) => [user.full_name, user.email, user.role].some((value) => value?.toLowerCase().includes(query)));
  }, [search, users]);

  const updateUser = async (id, role, status) => {
    try {
      await api.put(`/super-admin/users/${id}`, { role, status });
      setUsers((current) => current.map((user) => user.id === id ? { ...user, role, status } : user));
    } catch (err) {
      setError(err.response?.data?.message || 'Account update failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Super admin control</p>
          <h2 className="text-3xl font-bold text-slate-900">User accounts</h2>
          <p className="mt-2 text-slate-600">Verify accounts and assign system roles.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep" />
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="px-5 py-3 font-medium">User</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-500">Loading user accounts...</td></tr> : filteredUsers.length ? filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-200">
                  <td className="px-5 py-4"><div className="font-semibold text-slate-900">{user.full_name}</div><div className="text-slate-500">{user.email}</div></td>
                  <td className="px-5 py-4"><select value={user.role} onChange={(event) => updateUser(user.id, event.target.value, user.status)} className="rounded-lg border border-slate-200 px-2 py-1.5 uppercase"><option value={roles[0]}>Super admin</option><option value={roles[1]}>Admin</option><option value={roles[2]}>Staff</option></select></td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : user.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{user.status}</span></td>
                  <td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => updateUser(user.id, user.role, 'verified')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-white hover:bg-emerald-700"><CheckCircle2 size={14} /> Verify</button><button onClick={() => updateUser(user.id, user.role, 'suspended')} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-white hover:bg-rose-700"><ShieldAlert size={14} /> Suspend</button></div></td>
                </tr>
              )) : <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-500">No user accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5"><div className="flex items-center gap-2 text-lg font-semibold text-slate-900"><UserCog size={18} className="text-brand-deep" /> Role permissions</div><p className="mt-3 text-slate-600">Super admins manage accounts, verification, and roles. Admins use all operational features but cannot manage user accounts. Staff use day-to-day sales workflows.</p></div>
    </div>
  );
}