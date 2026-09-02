import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(form);
      navigate(result.user.role === 'admin' ? '/admin' : '/staff');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-[80vh] items-center justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-deep text-2xl font-bold text-white">G</div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-slate-500">Sign in to Golden Agrochemicals</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email or Username</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-deep"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 outline-none focus:border-brand-deep"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-3 text-slate-500">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          New staff? <Link to="/register" className="font-semibold text-brand-deep">Create account</Link>
        </div>
      </div>
    </div>
  );
}
