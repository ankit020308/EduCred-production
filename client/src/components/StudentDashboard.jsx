import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Send, GraduationCap, CheckCircle2, Clock, XCircle,
  Loader2, Building2, BookOpen, ArrowUpRight, FileText, ChevronRight,
  ShieldCheck, Hash
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Profile from '../pages/Profile';

function gradeFromMarks(m) {
  if (m >= 90) return 'O';
  if (m >= 80) return 'A+';
  if (m >= 70) return 'A';
  if (m >= 60) return 'B+';
  if (m >= 50) return 'B';
  if (m >= 40) return 'C';
  return 'F';
}

function cgpaFromMarks(semesters) {
  if (!semesters.length) return 0;
  const totals = semesters.flatMap(s => s.subjects.map(sub => sub.marks));
  if (!totals.length) return 0;
  const avg = totals.reduce((a, b) => a + parseFloat(b || 0), 0) / totals.length;
  return (avg / 10).toFixed(2);
}

const initSubject = () => ({ name: '', marks: '' });
const initSemester = () => ({ semNo: 1, subjects: [initSubject()] });

export default function StudentDashboard({ activeTab, onTabChange }) {
  const { user } = useAuth();

  const [universities, setUniversities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [certificates, setCertificates] = useState([]);

  const [selectedUni, setSelectedUni] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(true);

  const [form, setForm] = useState({
    name: user?.name || '',
    regNo: '',
    degree: '',
    branch: '',
    semesters: [initSemester()]
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get('/api/universities').then(r => setUniversities(r.data)).catch(() => { });
    fetchRequests();
    fetchCertificates();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/requests');
      setRequests(res.data);
    } catch { }
  };

  const fetchCertificates = async () => {
    try {
      const res = await api.get('/api/user/certificates');
      setCertificates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const addSemester = () => setForm(f => ({ ...f, semesters: [...f.semesters, { semNo: f.semesters.length + 1, subjects: [initSubject()] }] }));
  const removeSemester = (i) => setForm(f => ({ ...f, semesters: f.semesters.filter((_, idx) => idx !== i) }));
  const addSubject = (si) => setForm(f => { const s = [...f.semesters]; s[si].subjects.push(initSubject()); return { ...f, semesters: s }; });
  const removeSubject = (si, sj) => setForm(f => { const s = [...f.semesters]; s[si].subjects = s[si].subjects.filter((_, idx) => idx !== sj); return { ...f, semesters: s }; });
  const updateSubject = (si, sj, key, val) => setForm(f => { const s = [...f.semesters]; s[si].subjects[sj] = { ...s[si].subjects[sj], [key]: val }; return { ...f, semesters: s }; });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUni) return setMsg({ type: 'error', text: 'Select university' });

    setSubmitting(true);
    try {
      const cgpa = cgpaFromMarks(form.semesters);

      await api.post('/api/requests', {
        universityId: selectedUni,
        transcriptData: {
          ...form,
          cgpa,
          semesters: form.semesters.map(s => ({
            ...s,
            subjects: s.subjects.map(sub => ({
              ...sub,
              marks: parseFloat(sub.marks || 0),
              grade: gradeFromMarks(parseFloat(sub.marks || 0))
            }))
          }))
        }
      });

      setMsg({ type: 'success', text: 'Request submitted successfully' });
      fetchRequests();
      onTabChange('status');
    } catch (err) {
      setMsg({ type: 'error', text: 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    approved: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2, label: 'Verified' },
    rejected: { color: 'text-rose-400', bg: 'bg-rose-400/10', icon: XCircle, label: 'Rejected' },
    pending: { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock, label: 'Pending' }
  };

  return (
    <div className="flex-1 container mx-auto px-6 py-10">

      <AnimatePresence mode="wait">

        {/* 🔥 WALLET (NEW) */}
        {activeTab === 'wallet' && (
          <motion.div key="wallet">
            <h2 className="text-3xl font-black mb-6">Your Certificates</h2>

            {loadingWallet ? (
              <Loader2 className="animate-spin" />
            ) : certificates.length === 0 ? (
              <p>No certificates yet</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map(cert => (
                  <div key={cert._id} className="bg-[#0b0f2a] p-6 rounded-2xl border border-white/10">
                    <h3>{cert.degreeName}</h3>
                    <p>{cert.universityName}</p>
                    <p>CGPA: {cert.cgpa}</p>
                    <p className="text-xs truncate">{cert.certificateHash}</p>
                    <div className="text-emerald-400 flex items-center gap-1 mt-2">
                      <ShieldCheck size={14} /> Verified
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* KEEP YOUR SUBMIT + STATUS + PROFILE EXACTLY SAME BELOW */}
        {activeTab === 'submit' && (/* KEEP YOUR ORIGINAL SUBMIT JSX HERE */ null)}
        {activeTab === 'status' && (/* KEEP YOUR ORIGINAL STATUS JSX HERE */ null)}
        {activeTab === 'profile' && <Profile />}

      </AnimatePresence>
    </div>
  );
}