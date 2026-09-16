import { Outlet, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import companyLogo from '../assets/golden-agrochemicals-logo.jpeg';

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f8f2] text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img src={companyLogo} alt="Golden Agrochemicals" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20 sm:rounded-2xl" />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-brand-deep sm:text-xl">Golden Agrochemicals</div>
              <div className="text-xs text-brand-gold font-medium">Farmers Priority</div>
            </div>
          </Link>
          <nav className="hidden gap-6 text-sm font-medium text-slate-600 lg:flex">
            <a href="#home">Home</a>
            <a href="#products">Solutions</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="hidden gap-2 text-sm sm:flex sm:text-base">
            <Link to="/login" className="btn-secondary px-3 sm:px-4">Login</Link>
            <Link to="/register" className="btn-primary px-3 sm:px-4">Registration</Link>
          </div>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-brand-deep hover:bg-brand-light sm:hidden"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 px-4 py-4 sm:hidden">
            <nav className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-brand-light">Home</a>
              <a href="#products" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-brand-light">Solutions</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-brand-light">About</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-brand-light">Contact</a>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary text-center">Login</Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center">Registration</Link>
              </div>
            </nav>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  );
}
