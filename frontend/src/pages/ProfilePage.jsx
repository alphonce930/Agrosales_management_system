import { useRef, useState } from 'react';
import { Camera, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const roleLabels = {
  super_admin: 'Super admin',
  admin: 'Admin',
  staff: 'Staff'
};

const readImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read that image.'));
  reader.readAsDataURL(file);
});

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePictureChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMessage('');
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 700 * 1024) {
      setError('Profile picture must be smaller than 700 KB.');
      return;
    }

    try {
      setSaving(true);
      const profile_picture = await readImage(file);
      const { data } = await api.put('/auth/profile-picture', { profile_picture });
      setUser(data.user);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setMessage('Profile picture updated.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Profile picture update failed.');
    } finally {
      setSaving(false);
    }
  };

  const role = roleLabels[user?.role] || user?.role || 'User';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Profile</p>
        <h2 className="text-3xl font-bold text-slate-900">My account</h2>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <div className="card p-6 text-center">
          <div className="relative mx-auto h-24 w-24">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-gold/20 text-brand-deep">
              {user?.profile_picture ? <img src={user.profile_picture} alt={`${user.full_name} profile`} className="h-full w-full object-cover" /> : <UserCircle2 size={56} />}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving} aria-label="Upload profile picture" className="absolute bottom-0 right-0 rounded-full bg-brand-deep p-2 text-white shadow hover:bg-brand-deep/90 disabled:cursor-wait disabled:opacity-60">
              <Camera size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePictureChange} className="hidden" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">{user?.full_name || 'User'}</h3>
          <p className="mt-1 text-sm text-slate-500">{role}</p>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <Camera size={16} /> {saving ? 'Uploading...' : 'Upload picture'}
          </button>
        </div>

        <div className="card p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div><div className="text-sm text-slate-500">Full name</div><div className="mt-1 text-lg font-semibold text-slate-900">{user?.full_name || '-'}</div></div>
            <div><div className="text-sm text-slate-500">Role</div><div className="mt-1 text-lg font-semibold text-slate-900">{role}</div></div>
            <div><div className="text-sm text-slate-500">Email</div><div className="mt-1 text-lg font-semibold text-slate-900">{user?.email || '-'}</div></div>
            <div><div className="text-sm text-slate-500">Phone</div><div className="mt-1 text-lg font-semibold text-slate-900">{user?.phone || '-'}</div></div>
            <div><div className="text-sm text-slate-500">Location</div><div className="mt-1 text-lg font-semibold text-slate-900">{user?.location || '-'}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
