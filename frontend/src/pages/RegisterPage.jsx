import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/auth/register', form);
      setMessage(data.message);
      setForm({
        full_name: '',
        username: '',
        email: '',
        phone: '',
        location: '',
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setLoading(true);
    setError('');
    try {
      const { user } = await googleLogin(credential);
      navigate(user.role === 'super_admin' ? '/super-admin' : user.role === 'admin' ? '/admin' : '/staff');
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-up failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="page-shell py-16">
      <div className="mx-auto max-w-2xl card p-8">
        <h1 className="text-3xl font-bold text-slate-900">Registration</h1>
        <p className="mt-2 text-slate-600">Your account will be verified by a super administrator before login access is enabled.</p>

        <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div><label className="mb-2 block text-sm font-medium">Username</label><input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div><label className="mb-2 block text-sm font-medium">Email</label><input type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="mb-2 block text-sm font-medium">Phone number</label><input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="mb-2 block text-sm font-medium">Location</label><input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><label className="mb-2 block text-sm font-medium">Password</label><input type="password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div><label className="mb-2 block text-sm font-medium">Confirm password</label><input type="password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></div>

          {message && <div className="md:col-span-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
          {error && <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="md:col-span-2">
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? 'Submitting...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleSignInButton onCredential={onGoogleCredential} disabled={loading} context="signup" />

        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-semibold text-brand-deep">Login</Link>
        </div>
      </div>
    </div>
  );
}
