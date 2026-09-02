import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, ShieldAlert, UserCog } from 'lucide-react';
import api from '../services/api';

export default function AdminStaffPage() {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/admin/staff');
      const normalized = (data || []).map((member) => ({
        id: member.id,
        name: member.full_name || member.name || 'Unnamed staff',
        email: member.email || '',
        role: member.role || 'staff',
        status: member.status || 'pending'
      }));
      setStaff(normalized);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load staff verification list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = useMemo(() => {
    const query = search.toLowerCase();
    return staff.filter((member) =>
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
    );
  }, [search, staff]);

  const updateStatus = async (id, nextStatus) => {
    try {
      const endpoint = nextStatus === 'verified' ? `/admin/staff/${id}/verify` : `/admin/staff/${id}/suspend`;
      await api.put(endpoint);
      setStaff((current) => current.map((member) => member.id === id ? { ...member, status: nextStatus } : member));
    } catch (err) {
      setError(err.response?.data?.message || 'Status update failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Staff management</p>
          <h2 className="text-3xl font-bold text-slate-900">Team overview</h2>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand-deep"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total staff</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{staff.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Verified</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {staff.filter((m) => m.status === 'verified').length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Pending</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {staff.filter((m) => m.status === 'pending').length}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Staff</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-slate-500">Loading staff data...</td>
                </tr>
              ) : filteredStaff.length ? (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="border-t border-slate-200">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{member.name}</div>
                      <div className="text-slate-500">{member.email}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-700 uppercase">{member.role}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          member.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-700'
                            : member.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(member.id, 'verified')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={14} /> Verify
                        </button>
                        <button
                          onClick={() => updateStatus(member.id, 'suspended')}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-white hover:bg-rose-700"
                        >
                          <ShieldAlert size={14} /> Suspend
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-5 py-8 text-center text-slate-500">No staff accounts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <UserCog size={18} className="text-brand-deep" /> Staff verification summary
        </div>
        <p className="mt-3 text-slate-600">
          Reviewer controls let the admin confirm, suspend, or reactivate staff access. Pending accounts remain blocked until verification.
        </p>
      </div>
    </div>
  );
}
