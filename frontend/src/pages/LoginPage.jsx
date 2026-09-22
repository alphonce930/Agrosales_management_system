import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import companyLogo from "../assets/golden-agrochemicals-logo.jpeg";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, sessionMessage } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(location.state?.message || "");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await login(form);
      navigate(
        result.user.role === "super_admin"
          ? "/super-admin"
          : result.user.role === "admin"
            ? "/admin"
            : "/staff",
      );
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setLoading(true);
    setError("");
    try {
      const result = await googleLogin(credential);
      navigate(
        result.user.role === "super_admin"
          ? "/super-admin"
          : result.user.role === "admin"
            ? "/admin"
            : "/staff",
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Google sign-in failed. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-[80vh] items-center justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-deep hover:underline"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="text-center">
          <img
            src={companyLogo}
            alt="Golden Agrochemicals"
            className="mx-auto h-[130px] w-[130px] object-cover"
          />
          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-slate-500">Sign in to Golden Agrochemicals</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email or Username
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-deep"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 outline-none focus:border-brand-deep"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-3 text-slate-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {(error || sessionMessage || message) && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${error || sessionMessage ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
            >
              {error || sessionMessage || message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleSignInButton
          onCredential={onGoogleCredential}
          disabled={loading}
          context="signin"
        />

        <div className="mt-6 text-center text-sm text-slate-600">
          Need an account?{" "}
          <Link to="/register" className="font-semibold text-brand-deep">
            Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
