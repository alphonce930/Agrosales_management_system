import { UserCircle2 } from 'lucide-react';

export default function StaffProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-brand-deep/70">Profile</p>
        <h2 className="text-3xl font-bold text-slate-900">My account</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <div className="card p-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-gold/20 text-brand-deep">
            <UserCircle2 size={56} />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">John Mwaisumo</h3>
          <p className="mt-1 text-sm text-slate-500">Sales Officer</p>
        </div>

        <div className="card p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div><div className="text-sm text-slate-500">Full name</div><div className="mt-1 text-lg font-semibold text-slate-900">John Mwaisumo</div></div>
            <div><div className="text-sm text-slate-500">Email</div><div className="mt-1 text-lg font-semibold text-slate-900">john@agro.com</div></div>
            <div><div className="text-sm text-slate-500">Phone</div><div className="mt-1 text-lg font-semibold text-slate-900">+255712000111</div></div>
            <div><div className="text-sm text-slate-500">Location</div><div className="mt-1 text-lg font-semibold text-slate-900">Morogoro</div></div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Your account is used to manage customers, issue receipts, record sales, collect payments, and monitor personal performance across field operations.
          </div>
        </div>
      </div>
    </div>
  );
}
