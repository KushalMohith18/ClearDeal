import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, TrendingUp, FileText, Users, ArrowRight, CheckCircle, Building2 } from 'lucide-react';
import Navbar from '../components/Navbar';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Price Transparency',
    desc: 'See benchmark prices for any area. No more inflated quotes — every deal is priced fairly and on record.',
    color: 'bg-emerald-100 text-emerald-700'
  },
  {
    icon: Users,
    title: 'Verified Middlemen',
    desc: 'Reps operate within company-set price bands. Commission is transparent, automatic, and on-platform.',
    color: 'bg-blue-100 text-blue-700'
  },
  {
    icon: TrendingUp,
    title: 'Structured Negotiation',
    desc: 'Every offer, counter-offer and message is timestamped and immutable — a full audit trail for every deal.',
    color: 'bg-violet-100 text-violet-700'
  },
  {
    icon: FileText,
    title: 'Auto GST Invoice',
    desc: 'GST-compliant invoices generated instantly on payment. No paperwork, no delays.',
    color: 'bg-amber-100 text-amber-700'
  },
];

const STEPS = [
  { step: '01', title: 'Register & Verify', desc: 'Company, GST, and bank account verification in minutes.' },
  { step: '02', title: 'List or Browse', desc: 'Owners list billboards with pricing bands. Brands discover and filter.' },
  { step: '03', title: 'Negotiate Transparently', desc: 'Reps make offers within approved bands. Everything is logged.' },
  { step: '04', title: 'Pay & Invoice', desc: 'Escrow-backed payments, automatic commission splits, instant invoices.' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-50" data-testid="landing-page">
      <Navbar />

      {/* Hero */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-medium text-slate-300 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              India's First B2B Billboard Transparency Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ fontFamily: "'Public Sans', sans-serif" }}>
              No more black-box{' '}
              <span className="text-blue-400">billboard deals</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-xl">
              ClearDeal brings transparency, accountability, and GST compliance to India's ₹6,000 crore OOH advertising market. Starting with Hyderabad.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/auth?mode=register"
                data-testid="hero-get-started-btn"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-md font-semibold transition-colors duration-150 active:scale-95"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/auth"
                data-testid="hero-login-btn"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-md font-medium transition-colors duration-150"
              >
                Sign In
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 mt-8">
              {['GST Verified', 'Audit Trail', 'Escrow Payments', 'Auto Invoicing'].map(tag => (
                <span key={tag} className="flex items-center gap-1.5 text-sm text-slate-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'OOH Market Size', value: '₹6,000 Cr', sub: 'India annual' },
              { label: 'Price Inflation', value: 'Up to 40%', sub: 'Avg. in deals' },
              { label: 'Tax Evasion', value: '~60%', sub: 'Cash-based deals' },
              { label: 'Target Market', value: 'Hyderabad', sub: 'Phase 1 launch' },
            ].map(stat => (
              <div key={stat.label} className="text-center md:text-left">
                <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>{stat.value}</p>
                <p className="text-sm font-medium text-slate-700">{stat.label}</p>
                <p className="text-xs text-slate-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3" style={{ fontFamily: "'Public Sans', sans-serif" }}>
              Built for trust, designed for scale
            </h2>
            <p className="text-slate-600 max-w-xl">Every feature is engineered to eliminate corruption, enforce compliance, and reward honest participants.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-200 slide-up"
                style={{ animationDelay: `${i * 0.08}s` }}
                data-testid={`feature-card-${i}`}
              >
                <div className={`w-9 h-9 rounded-md flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2" style={{ fontFamily: "'Public Sans', sans-serif" }}>{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-10" style={{ fontFamily: "'Public Sans', sans-serif" }}>
            How ClearDeal works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-full w-full h-px bg-slate-200 -translate-x-4 z-0"></div>
                )}
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center text-sm font-bold mb-4" style={{ fontFamily: "'Public Sans', sans-serif" }}>
                    {step.step}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2" style={{ fontFamily: "'Public Sans', sans-serif" }}>{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personas */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-10" style={{ fontFamily: "'Public Sans', sans-serif" }}>
            Built for every stakeholder
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { role: 'Billboard Owner', icon: '🏗', desc: 'Set price bands, monitor your reps, approve deals. Full control, zero surprises.' },
              { role: 'Brand Manager', icon: '🏢', desc: 'Browse verified inventory, compare benchmark prices, close deals with full documentation.' },
              { role: 'Negotiation Rep', icon: '🤝', desc: 'Operate within approved bands, build a verified deal history, earn transparent commissions.' },
            ].map(p => (
              <div key={p.role} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="text-3xl mb-4">{p.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2" style={{ fontFamily: "'Public Sans', sans-serif" }}>{p.role}</h3>
                <p className="text-sm text-slate-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Public Sans', sans-serif" }}>
            Ready to run transparent deals?
          </h2>
          <p className="text-slate-300 mb-8 max-w-lg mx-auto">
            Join ClearDeal today. Free to register. Trusted by billboard owners and brands in Hyderabad.
          </p>
          <Link
            to="/auth?mode=register"
            data-testid="cta-register-btn"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-md font-semibold transition-colors duration-150 active:scale-95"
          >
            Create Your Account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: "'Public Sans', sans-serif" }}>ClearDeal</span>
          </div>
          <p className="text-xs text-slate-500">© 2024 ClearDeal. India's B2B Billboard Transparency Platform. Hyderabad.</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>GST Compliant</span>
            <span>•</span>
            <span>Audit Ready</span>
            <span>•</span>
            <span>Escrow Backed</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
