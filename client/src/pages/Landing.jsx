import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSystemStats } from '../services/api';

const FEATURES = [
  { icon: Zap, title: 'Instant Issuance', desc: 'Upload and anchor a certificate in under 60 seconds. No manual workflows.' },
  { icon: ShieldCheck, title: 'Blockchain Verified', desc: 'Every credential is cryptographically signed on Ethereum. Immutable by design.' },
  { icon: Globe, title: 'Global Portability', desc: 'Share credentials anywhere with a permanent, verifiable link. No intermediaries.' },
];

const STEPS = [
  { num: '01', title: 'Upload Certificate', desc: 'Institution uploads a PDF and fills basic metadata.' },
  { num: '02', title: 'Blockchain Anchor', desc: 'EduCred hashes the document and anchors it on-chain.' },
  { num: '03', title: 'Verify Anywhere', desc: 'Employers and students verify in one click — instantly.' },
];

const TESTIMONIALS = [
  { quote: 'Got my internship offer confirmed in under 10 minutes — the recruiter verified my certificate on the spot without emailing SRMIST once.', name: 'Ananya Krishnan', role: 'B.Tech CSE, SRM Institute of Science & Technology', initials: 'AK' },
  { quote: 'Applied to three universities abroad and none of them asked for physical transcripts. The EduCred link was enough proof.', name: 'Rohan Iyer', role: 'B.Tech ECE, SRM Institute of Science & Technology', initials: 'RI' },
];

const FOOTER_COLS = [
  { heading: 'Product', links: [{ label: 'Verify a Credential', to: '/verify' }, { label: 'Public Ledger', to: '/ledger' }] },
  { heading: 'Platform', links: [{ label: 'Sign Up', to: '/signup' }, { label: 'Log In', to: '/login' }, { label: 'Dashboard', to: '/dashboard' }] },
  { heading: 'Legal', links: [{ label: 'Privacy Policy', to: '/privacy' }, { label: 'Terms of Service', to: '/terms' }] },
  { heading: 'Contact', links: [{ label: 'Get in Touch', to: '/contact' }] },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    fetchSystemStats()
      .then(r => setLiveStats(r.data.data))
      .catch(() => {});
  }, []);

  const anim = mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6';
  const fadeUp = (delay = 0, extra = '') => ({
    className: `transition-all duration-700 ease-out ${anim} ${extra}`,
    style: { transitionDelay: `${delay}ms` },
  });

  return (
    <>
      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e0e0e0]">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-[#202020]">
            Edu<span className="text-[#ea2804]">Cred</span>
          </Link>

          <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-[#646464]">
            {['#features', '#how-it-works', '#testimonials'].map((href, i) => (
              <li key={href}>
                <a href={href}
                  className="hover:text-[#202020] transition-colors"
                  style={{ textDecoration: 'underline dotted #bbbbbb', textUnderlineOffset: '3px' }}>
                  {['Features', 'How It Works', 'Testimonials'][i]}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/verify')} className="btn-secondary hidden sm:inline-flex text-xs px-5 py-2.5">
              Verify a certificate
            </button>
            <button onClick={() => navigate(user ? '/dashboard' : '/signup')} className="btn-primary text-xs px-5 py-2.5">
              {user ? 'Dashboard' : 'Get started free'}
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* ── HERO — Hero Blaze gradient ── */}
        <section className="hero-gradient pt-28 pb-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div {...fadeUp(0)}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold uppercase tracking-widest mb-10">
                <ShieldCheck size={13} /> Blockchain-Powered Academic Credentials
              </span>
            </div>

            <h1 {...fadeUp(100, 'text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.05] mb-6')}>
              Academic credentials{' '}
              <span className="text-white/80">trusted everywhere.</span>
            </h1>

            <p {...fadeUp(200, 'text-lg text-white/80 leading-relaxed max-w-2xl mx-auto mb-12')}>
              EduCred anchors every certificate on Ethereum — making credentials
              instantly verifiable by anyone, anywhere, forever.
            </p>

            <div {...fadeUp(300, 'flex flex-col sm:flex-row items-center justify-center gap-4')}>
              <button onClick={() => navigate(user ? '/dashboard' : '/signup')} className="btn-ghost w-full sm:w-auto">
                Get started free <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate('/verify')} className="btn-secondary w-full sm:w-auto border-white text-white bg-white/10 hover:bg-white/20">
                Verify a certificate
              </button>
            </div>
          </div>
        </section>

        {/* ── LIVE STATS ── */}
        <section className="border-y border-[#202020] bg-white py-12 px-6">
          <dl className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { value: liveStats?.credentialsSecured, label: 'Credentials Issued' },
              { value: liveStats?.activeNodes,        label: 'Active Institutions' },
              { value: liveStats?.networkUptime,      label: 'Network Uptime' },
            ].map(({ value, label }) => (
              <div key={label}>
                {value ? (
                  <dt className="text-3xl font-black text-[#202020]">{value}</dt>
                ) : (
                  <div className="h-9 w-28 mx-auto rounded-full bg-[#e0e0e0] animate-pulse" />
                )}
                <dd className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#646464]">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="py-24 px-6 bg-[#f6f6f6]">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-[#202020] text-center mb-4 tracking-tight">
              Everything you need to issue and verify
            </h2>
            <p className="text-center text-[#646464] mb-16 max-w-xl mx-auto">
              A complete platform for institutions and students — built on open standards and cryptographic trust.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <article key={title} className="bg-white border border-[#202020] rounded-full p-10 hover:-translate-y-1 transition-all duration-200">
                  <figure className="w-12 h-12 rounded-full bg-[#ea2804]/10 border border-[#ea2804]/20 flex items-center justify-center text-[#ea2804] mb-6">
                    <Icon size={22} />
                  </figure>
                  <h3 className="font-black text-[#202020] text-lg mb-3">{title}</h3>
                  <p className="text-[#646464] text-sm leading-relaxed">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="py-24 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-[#202020] text-center mb-4 tracking-tight">
              From upload to verified in seconds
            </h2>
            <p className="text-center text-[#646464] mb-16 max-w-xl mx-auto">
              Three steps. Zero friction. Permanent proof.
            </p>

            <ol className="relative flex flex-col md:flex-row items-start md:items-stretch gap-10 md:gap-0">
              <li aria-hidden="true" className="hidden md:block absolute top-9 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px bg-[#e0e0e0] z-0" />
              {STEPS.map(({ num, title, desc }) => (
                <li key={num} className="relative z-10 flex-1 flex flex-col items-center text-center px-4">
                  <div className="w-18 h-18 w-[4.5rem] h-[4.5rem] rounded-full bg-[#ea2804] text-white font-black text-xl flex items-center justify-center mb-6">
                    {num}
                  </div>
                  <h3 className="font-black text-[#202020] text-base mb-2">{title}</h3>
                  <p className="text-[#646464] text-sm leading-relaxed">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="testimonials" className="py-24 px-6 bg-[#f6f6f6]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-[#202020] text-center mb-16 tracking-tight">
              Trusted by institutions and students
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {TESTIMONIALS.map(({ quote, name, role, initials }) => (
                <article key={name} className="bg-white border border-[#202020] rounded-full p-10 flex flex-col gap-6">
                  <blockquote className="text-[#646464] text-sm leading-relaxed italic">
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                  <figure className="flex items-center gap-4 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-[#ea2804] text-white font-black text-sm flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <figcaption>
                      <p className="font-black text-[#202020] text-sm">{name}</p>
                      <p className="text-[#646464] text-xs">{role}</p>
                    </figcaption>
                  </figure>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── MANIFESTO CTA — #202020 dark section ── */}
        <section className="bg-[#202020] py-28 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
              Start issuing trusted<br />credentials today.
            </h2>
            <p className="text-[#bbbbbb] mb-12 text-lg max-w-xl mx-auto">
              Join 1,200+ institutions already using EduCred to issue
              blockchain-anchored academic records.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate(user ? '/dashboard' : '/signup')} className="btn-ghost w-full sm:w-auto">
                Get started free <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate('/verify')} className="btn-secondary bg-transparent text-white border-white/30 hover:bg-white/10 w-full sm:w-auto">
                Verify a certificate
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#202020] border-t border-white/10 text-[#bbbbbb] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            {FOOTER_COLS.map(({ heading, links }) => (
              <div key={heading}>
                <h3 className="text-white font-black text-sm mb-4 uppercase tracking-widest">{heading}</h3>
                <ul className="space-y-3">
                  {links.map(({ label, to }) => (
                    <li key={label}>
                      <Link to={to}
                        className="text-sm hover:text-white transition-colors"
                        style={{ textDecoration: 'underline dotted #646464', textUnderlineOffset: '3px' }}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm font-black tracking-tight text-white">
              Edu<span className="text-[#ea2804]">Cred</span>
            </p>
            <p className="text-xs text-[#646464]">
              &copy; {new Date().getFullYear()} EduCred. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
