import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  UserCircle2,
  Users,
  Package,
  DollarSign,
  ReceiptText,
  ShieldCheck,
  LogOut,
  LayoutGrid,
  FileText,
  WalletCards,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const sidebarItems = {
  super_admin: [
    { label: "User Accounts", icon: Users, path: "/super-admin" },
    { label: "My Profile", icon: ShieldCheck, path: "/super-admin/profile" },
  ],
  admin: [
    { label: "Dashboard", icon: LayoutGrid, path: "/admin" },
    { label: "Customers", icon: Users, path: "/admin/customers" },
    { label: "Products", icon: Package, path: "/admin/products" },
    { label: "Sales", icon: DollarSign, path: "/admin/sales" },
    { label: "Payments", icon: WalletCards, path: "/admin/payments" },
    { label: "Reports", icon: FileText, path: "/admin/reports" },
    { label: "My Profile", icon: ShieldCheck, path: "/admin/profile" },
  ],
  staff: [
    { label: "Dashboard", icon: LayoutGrid, path: "/staff" },
    { label: "Customers", icon: Users, path: "/staff/customers" },
    { label: "Products", icon: Package, path: "/staff/products" },
    { label: "Sales", icon: DollarSign, path: "/staff/sales" },
    { label: "Lending", icon: ReceiptText, path: "/staff/lending" },
    { label: "Payments", icon: WalletCards, path: "/staff/payments" },
    { label: "Receipts", icon: ReceiptText, path: "/staff/receipts" },
    { label: "Reports", icon: FileText, path: "/staff/reports" },
    { label: "My Profile", icon: ShieldCheck, path: "/staff/profile" },
  ],
};

export default function DashboardLayout({ role }) {
  const navigate = useNavigate();
  const { user, logout, sessionWarning } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const clock = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  const getGreeting = (hour) => {
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderNavigation = (mobile = false) => (
    <nav className="space-y-2">
      {sidebarItems[role].map(({ label, icon: Icon, path }) => (
        <Link
          key={label}
          to={path}
          onClick={() => mobile && setMobileMenuOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/10 transition"
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
      <button
        onClick={handleLogout}
        className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/10 transition"
      >
        <LogOut size={18} />
        Logout
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 bg-brand-deep text-white p-5 hidden lg:block">
          <div className="mb-8">
            <div className="text-2xl font-bold">Golden Agrochemicals</div>
            <div className="text-sm text-brand-gold mt-1">Farmers Priority</div>
          </div>
          {renderNavigation()}
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <div className="text-sm text-slate-500">
                  {getGreeting(currentTime.getHours())},{" "}
                  {user?.full_name || "User"}
                </div>
                <h1 className="truncate text-xl font-bold text-slate-800 sm:text-2xl">
                  {role === "super_admin"
                    ? "User Accounts"
                    : role === "admin"
                      ? "Admin Dashboard"
                      : "Staff Dashboard"}
                </h1>
              </div>
              <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                <div className="hidden text-right text-xs text-slate-500 sm:block">
                  <div>{currentTime.toLocaleDateString()}</div>
                  <div>{currentTime.toLocaleTimeString()}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-light text-brand-deep">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle2 size={24} />
                  )}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <div className="truncate text-sm font-semibold">
                    {user?.full_name}
                  </div>
                  <div className="text-xs uppercase text-slate-500">
                    {user?.role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-brand-deep hover:bg-brand-light lg:hidden"
              >
                <Menu size={22} />
              </button>
            </div>
            {sessionWarning && (
              <div
                role="alert"
                className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:px-6"
              >
                Your session will expire in 5 minutes due to inactivity. Move
                your mouse or interact with the system to continue.
              </div>
            )}
          </header>
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/40"
          />
          <aside className="relative h-full w-[min(20rem,85vw)] bg-brand-deep p-5 text-white shadow-2xl">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-bold">Golden Agrochemicals</div>
                <div className="mt-1 text-sm text-brand-gold">
                  Farmers Priority
                </div>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            {renderNavigation(true)}
          </aside>
        </div>
      )}
    </div>
  );
}
