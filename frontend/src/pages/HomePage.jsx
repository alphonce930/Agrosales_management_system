const features = [
  'Agrochemical product management',
  'Customer and sales tracking',
  'Lending and payment monitoring',
  'Admin verification and analytics'
];

export default function HomePage() {
  return (
    <div id="home">
      <section className="page-shell grid items-center gap-10 py-16 lg:grid-cols-2">
        <div>
          <span className="inline-flex rounded-full bg-brand-gold/20 px-4 py-2 text-sm font-semibold text-brand-deep">Quality Agrochemical Solutions for Better Farming</span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl">Golden Agrochemicals</h1>
          <p className="mt-4 text-lg text-slate-600">Farmers Priority</p>
          <p className="mt-6 max-w-xl text-slate-600">
            Manage products, track customer sales, handle lending, process payments, and build stronger farm support operations with a modern business system designed for agriculture.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/login" className="btn-primary">Login</Link>
            <Link to="/register" className="btn-secondary">Registration</Link>
          </div>
        </div>

        <div className="rounded-3xl bg-brand-deep p-8 text-white shadow-soft">
          <div className="mb-6 flex items-center gap-4">
            <img src={companyLogo} alt="Golden Agrochemicals logo" className="h-[180px] w-[180px] object-cover" />
            <div>
              <p className="font-semibold text-brand-gold">Golden Agrochemicals</p>
              <p className="text-sm text-white/75">Farmers Priority</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-brand-gold">Total Sales</div>
              <div className="mt-2 text-3xl font-bold">TZS 2.4M</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-brand-gold">Customers</div>
              <div className="mt-2 text-3xl font-bold">1,240</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 sm:col-span-2">
              <div className="text-sm text-brand-gold">Crop Protection Products</div>
              <div className="mt-2 text-3xl font-bold">58 SKUs</div>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="page-shell py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Agricultural Solutions</h2>
          <p className="mt-3 text-slate-600">Essential products and services supporting modern farming.</p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {['Herbicides', 'Fertilizers', 'Insecticides', 'Growth Enhancers', 'Seed Treatments', 'Soil Solutions'].map((item) => (
            <div key={item} className="card p-6">
              <div className="h-12 w-12 rounded-xl bg-brand-gold/20 flex items-center justify-center text-xl">✓</div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">{item}</h3>
              <p className="mt-3 text-slate-600">Reliable, field-tested solutions for crop protection and healthier yields.</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="bg-white py-16">
        <div className="page-shell grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Why choose Golden Agrochemicals?</h2>
            <ul className="mt-6 space-y-4 text-slate-600">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-gold/20 text-brand-deep">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-8">
            <h3 className="text-2xl font-bold text-slate-900">Business growth, powered by trust</h3>
            <p className="mt-4 text-slate-600">
              We support farmers and agribusinesses with dependable products, efficient service, and value-driven operational systems that simplify complex sales and inventory workflows.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="page-shell py-16">
        <div className="card p-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Contact Golden Agrochemicals</h2>
          <p className="mt-3 text-slate-600">Support for farms, dealers, and agricultural businesses.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-brand-deep font-medium">
            <span>Email: info@goldenagro.com</span>
            <span>Phone: +255 700 000 000</span>
            <span>Location: Dar es Salaam</span>
          </div>
        </div>
      </section>
    </div>
  );
}
import { Link } from 'react-router-dom';
import companyLogo from '../assets/golden-agrochemicals-logo.jpeg';
