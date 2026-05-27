import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Eye,
  EyeOff,
  Key,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ApiKeys() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const docsApiBase = (import.meta.env.VITE_API_URL || 'https://educred-backend.onrender.com').replace(/\/$/, '');
  const widgetBuildHash = import.meta.env.VITE_BUILD_HASH || 'dev';
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Creation modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const [revoking, setRevoking] = useState(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);

  useEffect(() => {
    if (!user || !['university', 'verifier'].includes(user.role)) {
      navigate('/dashboard');
      return;
    }
    fetchKeys();
  }, [user, navigate]);

  async function fetchKeys() {
    try {
      setLoading(true);
      const res = await api.get('/api/api-keys');
      setKeys(res.data);
    } catch {
      setError('Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post('/api/api-keys', { name: name.trim() });
      setNewKey(res.data);
      setKeys((prev) => [res.data, ...prev]);
      setName('');
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create key.');
    } finally {
      setCreating(false);
    }
  }

  function requestRevoke(id) {
    setConfirmRevokeId(id);
  }

  function cancelRevoke() {
    setConfirmRevokeId(null);
  }

  async function handleRevoke(id) {
    setConfirmRevokeId(null);
    setRevoking(id);
    try {
      await api.delete(`/api/api-keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      /* silently allow retry */
    } finally {
      setRevoking(null);
    }
  }

  async function copyKey() {
    if (!newKey?.key) return;
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function closeModal() {
    setShowModal(false);
    setNewKey(null);
    setName('');
    setCreateError('');
    setKeyVisible(false);
    setCopied(false);
  }

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-[#202020] font-sans">
      <div className="fixed top-0 inset-x-0 h-64 bg-[#202020] pointer-events-none z-0" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#202020]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#ea2804] rounded-full flex items-center justify-center">
              <ShieldCheck className="text-white" size={16} />
            </div>
            <span className="text-lg font-black text-white tracking-tight">
              Edu<span className="text-[#ea2804]">Cred</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')}
              className="btn-primary !px-4 !py-2 !text-[10px]">
              <LayoutDashboard size={13} /> Dashboard
            </button>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-white transition-colors">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-24 pt-28 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Page header */}
          <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ea2804]/30 bg-[#ea2804]/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#ea2804] mb-4">
                <Key size={12} /> API Access
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none mb-3">
                API Keys
              </h1>
              <p className="text-[#646464] text-sm font-medium max-w-md">
                Programmatic access to EduCred verification. Use Bearer tokens in the{' '}
                <code className="bg-[#202020]/10 px-1.5 py-0.5 rounded text-[11px] font-mono">Authorization</code> header.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary !px-6 !py-3"
            >
              <Plus size={16} /> New API Key
            </button>
          </div>

          {/* Code example */}
          <div className="bg-[#202020] rounded-3xl p-6 mb-8">
            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-3">Example — Bulk Verify</p>
            <pre className="text-[11px] font-mono text-[#ea2804] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST ${docsApiBase}/api/certificates/verify/bulk \\
  -H "Authorization: Bearer ek_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"ids":["EC-2024-001","EC-2024-002"]}'`}
            </pre>
          </div>

          {/* Keys list */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-[#ea2804]" />
            </div>
          ) : error ? (
            <div className="bg-white border border-[#ea2804]/20 rounded-3xl p-8 text-center">
              <p className="text-[#ea2804] font-black text-sm uppercase tracking-widest">{error}</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="bg-white border border-[#e0e0e0] rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-[#f6f6f6] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#e0e0e0]">
                <Key size={28} className="text-[#bbbbbb]" />
              </div>
              <h3 className="text-2xl font-black text-[#202020] tracking-tight mb-2">No API Keys</h3>
              <p className="text-[#646464] text-sm mb-6">Create your first key to start integrating with EduCred programmatically.</p>
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <Plus size={16} /> Create API Key
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div key={k.id} className="bg-white border border-[#e0e0e0] rounded-2xl px-6 py-5 flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 bg-[#f6f6f6] border border-[#e0e0e0] rounded-full flex items-center justify-center shrink-0">
                    <Key size={16} className="text-[#646464]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-[#202020] truncate">{k.name}</p>
                    <p className="font-mono text-[10px] text-[#646464] mt-0.5">{k.keyPrefix}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-[#646464] flex-wrap">
                    {k.lastUsedAt && (
                      <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                    )}
                    <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    <span className="bg-[#f6f6f6] border border-[#e0e0e0] px-2.5 py-1 rounded-full">
                      {k.rateLimit} req/min
                    </span>
                  </div>
                  {confirmRevokeId === k.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#ea2804]">Revoke?</span>
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="px-3 py-1.5 rounded-full bg-[#ea2804] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#c02000] transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={cancelRevoke}
                        className="px-3 py-1.5 rounded-full border border-[#e0e0e0] text-[9px] font-black uppercase tracking-widest text-[#646464] hover:text-[#202020] hover:border-[#202020] transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => requestRevoke(k.id)}
                      disabled={revoking === k.id}
                      className="shrink-0 w-9 h-9 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#bbbbbb] hover:border-[#ea2804] hover:text-[#ea2804] transition-all disabled:opacity-40"
                      title="Revoke key"
                    >
                      {revoking === k.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Embeddable widget info */}
          <div className="mt-12 bg-white border border-[#e0e0e0] rounded-3xl p-8">
            <p className="text-[9px] font-black text-[#646464] uppercase tracking-widest mb-2">Embeddable Trust Badge</p>
            <h3 className="text-xl font-black text-[#202020] mb-4">Add a Verification Badge to Any Page</h3>
            <p className="text-[#646464] text-sm mb-5">Drop this snippet into any HR portal, LinkedIn profile, or university page to show a real-time EduCred verification badge.</p>
            <div className="bg-[#202020] rounded-2xl p-5 overflow-x-auto">
              <pre className="text-[11px] font-mono text-[#ea2804] leading-relaxed whitespace-pre-wrap break-all">
{`<script src="${docsApiBase}/api/widget/verify.js?v=${widgetBuildHash}"
        data-cert="EC-2024-XXXXXX">
</script>`}
              </pre>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Create Key Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-[#202020] tracking-tight">
                  {newKey ? 'Key Created' : 'New API Key'}
                </h2>
                <button onClick={closeModal}
                  className="w-9 h-9 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#646464] hover:text-[#202020] transition-colors">
                  <X size={16} />
                </button>
              </div>

              {newKey ? (
                <div className="space-y-5">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                    <p className="text-amber-700 text-[10px] font-black uppercase tracking-widest">
                      Copy this key now — it will never be shown again.
                    </p>
                  </div>
                  <div className="bg-[#f6f6f6] border border-[#e0e0e0] rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <p className={`flex-1 font-mono text-[11px] break-all text-[#202020] ${!keyVisible ? 'blur-sm select-none' : ''}`}>
                        {newKey.key}
                      </p>
                      <button onClick={() => setKeyVisible((v) => !v)}
                        className="shrink-0 w-9 h-9 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#646464] hover:text-[#202020] transition-colors">
                        {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={copyKey}
                        className="shrink-0 w-9 h-9 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#646464] hover:text-[#ea2804] hover:border-[#ea2804] transition-colors">
                        {copied ? <ShieldCheck size={14} className="text-[#2b9a66]" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <button onClick={closeModal} className="btn-primary w-full">
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#646464]">
                      Key Name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. HR System Integration"
                      maxLength={100}
                      className="ds-input w-full"
                      autoFocus
                    />
                    <p className="text-[9px] font-black text-[#bbbbbb] uppercase tracking-widest">
                      A label to identify where this key is used.
                    </p>
                  </div>

                  {createError && (
                    <p className="text-[10px] font-black text-[#ea2804] uppercase tracking-widest border border-[#ea2804]/20 bg-[#ea2804]/5 rounded-xl px-4 py-2.5">
                      {createError}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={closeModal}
                      className="flex-1 rounded-full border border-[#e0e0e0] py-3 text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-[#202020] hover:border-[#202020] transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={creating || !name.trim()} className="flex-1 btn-primary">
                      {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      {creating ? 'Creating…' : 'Create Key'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
