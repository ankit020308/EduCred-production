import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATS = [
  { value: '250K+', label: 'Credentials Issued' },
  { value: '1,200+', label: 'Partner Institutions' },
  { value: '99.9%', label: 'Network Uptime' },
  { value: '50+', label: 'Countries Served' },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant Issuance',
    desc: 'Upload and anchor a certificate in under 60 seconds. No manual workflows.',
  },
  {
    icon: ShieldCheck,
    title: 'Blockchain Verified',
    desc: 'Every credential is cryptographically signed on Ethereum. Immutable by design.',
  },
  {
    icon: Globe,
    title: 'Global Portability',
    desc: 'Share credentials anywhere with a permanent, verifiable link. No intermediaries.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Upload Certificate',
    desc: 'Institution uploads a PDF and fills basic metadata.',
  },
  {
    num: '02',
    title: 'Blockchain Anchor',
    desc: 'EduCred hashes the document and anchors it on-chain.',
  },
  {
    num: '03',
    title: 'Verify Anywhere',
    desc: 'Employers and students verify in one click — instantly.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'EduCred transformed how we issue credentials. Students share verified certificates globally in seconds.',
    name: 'Dr. Priya Sharma',
    role: 'Director of Academics, SRMIST',
    initials: 'PS',
  },
  {
    quote:
      'I shared my certificate link with three companies abroad. All verified without contacting my university.',
    name: 'Rahul Mehta',
    role: 'Engineering Graduate, MIT Pune',
    initials: 'RM',
  },
];

const FOOTER_COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Verify a Credential', to: '/verify' },
      { label: 'Public Ledger', to: '/ledger' },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'Sign Up', to: '/signup' },
      { label: 'Log In', to: '/login' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
  {
    heading: 'Contact',
    links: [{ label: 'Get in Touch', to: '/contact' }],
  },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animations after first paint
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Returns merged className string + inline style for staggered CSS entrance transitions
  const anim = mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6';
  const fadeUp = (delay = 0, extra = '') =>
    ({ className: `transition-all duration-700 ease-out ${anim} ${extra}`, style: { transitionDelay: `${delay}ms` } });

  return (
    <>
      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <nav
          aria-label="Primary navigation"
          className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"
        >
          <Link
            to="/"
            className="text-xl font-black tracking-tight text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            Edu<span className="text-blue-600">Cred</span>
          </Link>

          <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <li>
              <a
                href="#features"
                className="hover:text-slate-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="hover:text-slate-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                How It Works
              </a>
            </li>
            <li>
              <a
                href="#testimonials"
                className="hover:text-slate-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Testimonials
              </a>
            </li>
          </ul>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/verify')}
              className="btn-secondary hidden sm:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              Verify a certificate
            </button>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/signup')}
              className="btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              {user ? 'Dashboard' : 'Get started free'}
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* ── HERO ── */}
        <section
          aria-labelledby="hero-heading"
          className="bg-gradient-to-b from-slate-50 to-white pt-24 pb-20 px-6"
        >
          <div className="max-w-4xl mx-auto text-center">
            <div {...fadeUp(0)}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-widest mb-8">
                <ShieldCheck size={13} /> Blockchain-Powered Academic Credentials
              </span>
            </div>

            <h1
              id="hero-heading"
              {...fadeUp(100, 'text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.08] mb-6')}
            >
              Academic credentials{' '}
              <span className="text-blue-600">trusted everywhere.</span>
            </h1>

            <p {...fadeUp(200, 'text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10')}>
              EduCred anchors every certificate on Ethereum — making credentials
              instantly verifiable by anyone, anywhere, forever.
            </p>

            <div {...fadeUp(300, 'flex flex-col sm:flex-row items-center justify-center gap-4')}>
              <button
                onClick={() => navigate(user ? '/dashboard' : '/signup')}
                className="btn-primary w-full sm:w-auto inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Get started free <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/verify')}
                className="btn-secondary w-full sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Verify a certificate
              </button>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF STATS BAR ── */}
        <section aria-label="Platform statistics" className="border-y border-slate-200 bg-white py-10 px-6">
          <dl className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <dt className="text-3xl font-black text-slate-900">{value}</dt>
                <dd className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="py-24 px-6 bg-slate-50"
        >
          <div className="max-w-7xl mx-auto">
            <h2
              id="features-heading"
              className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-4"
            >
              Everything you need to issue and verify
            </h2>
            <p className="text-center text-slate-500 mb-14 max-w-xl mx-auto">
              A complete platform for institutions and students — built on open
              standards and cryptographic trust.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <article
                  key={title}
                  className="bg-white rounded-2xl p-8 border border-slate-200 hover:-translate-y-1 hover:shadow-md transition-all duration-200 ease-out"
                >
                  <figure className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-5">
                    <Icon size={22} aria-hidden="true" />
                  </figure>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="py-24 px-6 bg-white"
        >
          <div className="max-w-5xl mx-auto">
            <h2
              id="how-heading"
              className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-4"
            >
              From upload to verified in seconds
            </h2>
            <p className="text-center text-slate-500 mb-16 max-w-xl mx-auto">
              Three steps. Zero friction. Permanent proof.
            </p>

            <ol className="relative flex flex-col md:flex-row items-start md:items-stretch gap-10 md:gap-0">
              {/* Connector line — hidden on mobile */}
              <li aria-hidden="true" className="hidden md:block absolute top-8 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px bg-slate-200 z-0" />

              {STEPS.map(({ num, title, desc }, i) => (
                <li
                  key={num}
                  className="relative z-10 flex-1 flex flex-col items-center text-center px-4"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center mb-5 shadow-md">
                    {num}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section
          id="testimonials"
          aria-labelledby="testimonials-heading"
          className="py-24 px-6 bg-slate-50"
        >
          <div className="max-w-5xl mx-auto">
            <h2
              id="testimonials-heading"
              className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-14"
            >
              Trusted by institutions and students
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {TESTIMONIALS.map(({ quote, name, role, initials }) => (
                <article
                  key={name}
                  className="bg-white rounded-2xl p-8 border border-slate-200 flex flex-col gap-6 hover:-translate-y-1 hover:shadow-md transition-all duration-200 ease-out"
                >
                  <blockquote className="text-slate-700 text-sm leading-relaxed italic">
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                  <figure className="flex items-center gap-4 mt-auto">
                    <div
                      aria-hidden="true"
                      className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0"
                    >
                      {initials}
                    </div>
                    <figcaption>
                      <p className="font-semibold text-slate-900 text-sm">{name}</p>
                      <p className="text-slate-500 text-xs">{role}</p>
                    </figcaption>
                  </figure>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA BAND ── */}
        <section
          aria-labelledby="cta-heading"
          className="bg-slate-900 py-24 px-6 text-center"
        >
          <div className="max-w-2xl mx-auto">
            <h2
              id="cta-heading"
              className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight"
            >
              Start issuing trusted credentials today.
            </h2>
            <p className="text-slate-400 mb-10 text-lg">
              Join 1,200+ institutions already using EduCred to issue
              blockchain-anchored academic records.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(user ? '/dashboard' : '/signup')}
                className="btn-primary w-full sm:w-auto inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Get started free <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/verify')}
                className="btn-secondary w-full sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Verify a certificate
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-6" aria-label="Site footer">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            {FOOTER_COLS.map(({ heading, links }) => (
              <div key={heading}>
                <h3 className="text-white font-semibold text-sm mb-4">{heading}</h3>
                <ul className="space-y-3">
                  {links.map(({ label, to }) => (
                    <li key={label}>
                      <Link
                        to={to}
                        className="text-sm hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm font-black tracking-tight text-white">
              Edu<span className="text-blue-500">Cred</span>
            </p>
            <p className="text-xs text-slate-600">
              &copy; {new Date().getFullYear()} EduCred. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
