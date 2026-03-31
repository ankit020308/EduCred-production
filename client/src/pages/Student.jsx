import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, ShieldCheck, Calendar, BookOpen, Hash, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';

export default function Student() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`http://localhost:5001/api/certificates/${id}`)
      .then(r => setCert(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
      <div style={{ height: '36px', width: '36px', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error || !cert) return (
    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>Certificate Not Found</h2>
      <Link to="/verify" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>← Back to Verifier</Link>
    </div>
  );

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <Link to="/verify" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem' }}>
        <ArrowLeft style={{ height: '15px', width: '15px' }} /> Back to Verifier
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Certificate Header */}
        <div className="glass-card" style={{ padding: '2.5rem', marginBottom: '1.5rem', borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(37,99,235,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ height: '72px', width: '72px', background: '#2563eb', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 30px rgba(37,99,235,0.3)' }}>
              <ShieldCheck style={{ height: '36px', width: '36px', color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', background: 'rgba(52,211,153,0.12)', borderRadius: '100px', border: '1px solid rgba(52,211,153,0.25)', marginBottom: '0.75rem' }}>
                <div style={{ height: '6px', width: '6px', borderRadius: '50%', background: '#34d399' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#34d399' }}>Blockchain Verified</span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>{cert.studentName}</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{cert.degreeName} · {cert.branch} · Class of {cert.graduationYear}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: '0.25rem' }}>CGPA</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#60a5fa', lineHeight: 1, letterSpacing: '-0.04em' }}>{cert.cgpa || '—'}</p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Reg. Number', value: cert.regNo, icon: BookOpen },
            { label: 'University', value: cert.universityName, icon: GraduationCap },
            { label: 'Issued On', value: new Date(cert.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), icon: Calendar },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Icon style={{ height: '14px', width: '14px', color: '#475569' }} />
                <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>{label}</p>
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{value || '—'}</p>
            </div>
          ))}
        </div>

        {/* Hash */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Hash style={{ height: '14px', width: '14px', color: '#475569' }} />
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>SHA-256 Certificate Hash</p>
          </div>
          <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#60a5fa', wordBreak: 'break-all', lineHeight: 1.6 }}>{cert.certificateHash}</p>
        </div>

        {/* Transcript */}
        {cert.semesters && cert.semesters.length > 0 && (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1rem' }}>Academic Transcript</h3>
            </div>
            {cert.semesters.map((sem, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#60a5fa' }}>Semester {sem.semNo || i + 1}</p>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {['Subject', 'Marks', 'Grade'].map(h => (
                        <th key={h} style={{ padding: '0.6rem 1.5rem', textAlign: h === 'Subject' ? 'left' : 'center', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sem.subjects?.map((sub, j) => (
                      <tr key={j} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>{sub.name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#94a3b8' }}>{sub.marks}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, background: sub.marks >= 80 ? 'rgba(52,211,153,0.15)' : sub.marks >= 60 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)', color: sub.marks >= 80 ? '#34d399' : sub.marks >= 60 ? '#fbbf24' : '#f87171' }}>
                            {sub.grade || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Verify CTA */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to={`/verify/${id}`} className="btn-blue" style={{ textDecoration: 'none', padding: '0.75rem 2rem', gap: '0.5rem' }}>
            <ShieldCheck style={{ height: '16px', width: '16px' }} /> Re-Verify on Chain
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
