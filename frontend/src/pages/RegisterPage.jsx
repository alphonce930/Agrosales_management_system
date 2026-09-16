import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, RefreshCw, X } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";

const passwordRules = [
  { label: "At least 8 characters", test: (password) => password.length >= 8 },
  { label: "One uppercase letter", test: (password) => /[A-Z]/.test(password) },
  { label: "One lowercase letter", test: (password) => /[a-z]/.test(password) },
  { label: "One number", test: (password) => /\d/.test(password) },
  {
    label: "One special character",
    test: (password) => /[!@#$%^&*]/.test(password),
  },
];

const getPasswordChecks = (password) =>
  passwordRules.map(({ test }) => test(password));

const getPasswordStrength = (password) => {
  const score = getPasswordChecks(password).filter(Boolean).length;
  if (score === passwordRules.length) return "Strong";
  if (score >= 3) return "Medium";
  return "Weak";
};

const generateStrongPassword = () => {
  const groups = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    "!@#$%^&*",
  ];
  const allCharacters = groups.join("");
  const randomCharacter = (characters) =>
    characters[
      window.crypto.getRandomValues(new Uint32Array(1))[0] % characters.length
    ];
  const characters = groups.map(randomCharacter);

  while (characters.length < 14)
    characters.push(randomCharacter(allCharacters));
  return characters
    .sort(() => (randomCharacter("01") === "0" ? -1 : 1))
    .join("");
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    location: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordChecks = getPasswordChecks(form.password);
  const passwordIsStrong = passwordChecks.every(Boolean);
  const passwordsMatch = form.password === form.confirmPassword;
  const canSubmit = passwordIsStrong && passwordsMatch && !loading;

  const updatePassword = (password) => setForm({ ...form, password });

  const handleGeneratePassword = () => {
    const password = generateStrongPassword();
    setForm({ ...form, password, confirmPassword: password });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordIsStrong) {
      setError("Password must meet all listed requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await api.post("/auth/register", form);
      setMessage(data.message);
      setForm({
        full_name: "",
        username: "",
        email: "",
        phone: "",
        location: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setLoading(true);
    setError("");
    try {
      const { user } = await googleLogin(credential);
      navigate(
        user.role === "super_admin"
          ? "/super-admin"
          : user.role === "admin"
            ? "/admin"
            : "/staff",
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Google sign-up failed. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="page-shell py-16">
      <div className="mx-auto max-w-2xl card p-8">
        <h1 className="text-3xl font-bold text-slate-900">Registration</h1>
        <p className="mt-2 text-slate-600">
          Your account will be verified by a super administrator before login
          access is enabled.
        </p>

        <form
          className="mt-8 grid gap-5 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Username</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Phone number
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Location</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label
                htmlFor="registration-password"
                className="block text-sm font-medium"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-deep hover:underline"
              >
                <RefreshCw size={13} /> Generate Password
              </button>
            </div>
            <div className="relative">
              <input
                id="registration-password"
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11"
                value={form.password}
                onChange={(e) => updatePassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-3 text-slate-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="mt-2 text-sm font-medium text-slate-700">
              Password strength:{" "}
              <span
                className={
                  passwordIsStrong
                    ? "text-emerald-600"
                    : getPasswordStrength(form.password) === "Medium"
                      ? "text-amber-600"
                      : "text-rose-600"
                }
              >
                {getPasswordStrength(form.password)}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              {passwordRules.map(({ label }, index) => (
                <div key={label} className="flex items-center gap-1.5">
                  {passwordChecks[index] ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <X size={14} className="text-rose-500" />
                  )}
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="registration-confirm-password"
              className="mb-2 block text-sm font-medium"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="registration-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
              />
              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                className="absolute right-3 top-3 text-slate-500"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {form.confirmPassword && !passwordsMatch && (
              <p className="mt-2 text-xs text-rose-600">
                Passwords do not match.
              </p>
            )}
          </div>

          {message && (
            <div className="md:col-span-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          )}
          {error && (
            <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Register"}
            </button>
          </div>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleSignInButton
          onCredential={onGoogleCredential}
          disabled={loading}
          context="signup"
        />

        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-deep">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
