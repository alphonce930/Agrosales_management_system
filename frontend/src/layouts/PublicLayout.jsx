import { Outlet, Link } from 'react-router-dom';
import companyLogo from '../assets/golden-agrochemicals-logo.jpeg';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#f7f8f2] text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img src={companyLogo} alt="Golden Agrochemicals" className="h-[100px] w-[100px] shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-brand-deep sm:text-xl">Golden Agrochemicals</div>
              <div className="text-xs text-brand-gold font-medium">Farmers Priority</div>
            </div>
          </Link>
          <nav className="hidden lg:flex gap-6 text-sm font-medium text-slate-600">
            <a href="#home">Home</a>
            <a href="#products">Solutions</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="flex gap-2 text-sm sm:text-base">
            <Link to="/login" className="btn-secondary px-3 sm:px-4">Login</Link>
            <Link to="/register" className="btn-primary px-3 sm:px-4">Registration</Link>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
