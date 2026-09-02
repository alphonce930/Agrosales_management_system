import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#f7f8f2] text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-deep text-white flex items-center justify-center font-bold">G</div>
            <div>
              <div className="text-xl font-bold text-brand-deep">Golden Agrochemicals</div>
              <div className="text-xs text-brand-gold font-medium">Farmers Priority</div>
            </div>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <a href="#home">Home</a>
            <a href="#products">Solutions</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="flex gap-2">
            <Link to="/login" className="btn-secondary">Login</Link>
            <Link to="/register" className="btn-primary">Staff Registration</Link>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
