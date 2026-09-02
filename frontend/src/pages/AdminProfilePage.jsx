import { UserCircle2 } from 'lucide-react';

export default function AdminProfilePage() {
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
          <h3 className="mt-4 text-xl font-bold text-slate-900">System Administrator</h3>
          <p className="mt-1 text-sm text-slate-500">Admin</p>
        </div>

        <div className="card p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">Full name</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">System Administrator</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Email</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">admin@goldenagro.com</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Phone</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">+255700000001</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Location</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">Dar es Salaam</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            This profile is used for account management and admin approval decisions across staff verification, sales reviews, and customer records.
          </div>
        </div>
      </div>
    </div>
  );
}
