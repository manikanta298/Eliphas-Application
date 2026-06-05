import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const API = import.meta.env.VITE_API_URL || '';

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [remember, setRemember] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // checking | up | down

  // ── Ping backend on mount to wake Render free tier ──────────
  useEffect(() => {
    let retries = 0;
    const ping = async () => {
      try {
        const res = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) { setServerStatus('up'); return; }
      } catch {}
      retries++;
      if (retries < 6) {
        setServerStatus('waking');
        setTimeout(ping, 5000); // retry every 5s
      } else {
        setServerStatus('down');
      }
    };
    ping();
  }, []);

  if (user) return <Navigate to="/fy-select" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Enter email and password'); return; }
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      window.dispatchEvent(new CustomEvent('auth:login'));
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.code === 'ECONNABORTED' || !err.response) {
        setError('Server is waking up. Please wait 30 seconds and try again.');
        setServerStatus('waking');
      } else {
        setError(msg || 'Invalid email or password.');
      }
    } finally { setLoading(false); }
  };

  const statusBanner = {
    checking: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', text: '🔄 Connecting to server...' },
    waking:   { bg: '#fffbeb', border: '#fde68a', color: '#92400e', text: '⏳ Server is waking up (~30s). Please wait...' },
    up:       { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', text: '✅ Server connected' },
    down:     { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', text: '❌ Server unreachable. Check backend on Render.' },
  }[serverStatus];

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">🐕</div>
          <div className="login-brand-name">DOG'S DASHBOARD</div>
          <div className="login-brand-tag">Sign in to your account</div>
        </div>

        {/* Server status banner */}
        <div style={{
          background: statusBanner.bg,
          border: `1px solid ${statusBanner.border}`,
          borderRadius: 8, padding: '8px 12px',
          fontSize: '0.78rem', fontWeight: 600,
          color: statusBanner.color,
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {statusBanner.text}
          {serverStatus === 'waking' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#d97706',
                  animation: `pulse 1.2s ${i*0.3}s infinite`,
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="login-error" style={{ marginBottom: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Email</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type="email"
                placeholder="Enter email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button type="button" className="login-eye" onClick={() => setShowPw(p => !p)}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <label className="login-remember">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            Remember me
          </label>

          <button
            type="submit"
            className="login-btn"
            disabled={loading || serverStatus === 'waking'}
          >
            {loading ? (
              <span style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite',display:'block' }} />
                Signing in...
              </span>
            ) : serverStatus === 'waking' ? '⏳ Waiting for server...' : 'Login'}
          </button>

          <div className="login-forgot">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
        </form>

        {/* Default credentials hint */}
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: '#f8faff', border: '1px solid #e2e8f0',
          borderRadius: 10, fontSize: '0.76rem', color: '#64748b',
        }}>
          <div style={{ fontWeight: 700, color: '#1a3c8f', marginBottom: 8 }}>🔑 Default Login Credentials</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px' }}>
            <span style={{ fontWeight:600, color:'#dc2626' }}>Master Admin</span>
            <span>masteradmin@erp.com</span>
            <span style={{ fontWeight:600, color:'#1a3c8f' }}>Admin</span>
            <span>admin@erp.com</span>
            <span style={{ fontWeight:600, color:'#16a34a' }}>Manager</span>
            <span>manager@erp.com</span>
            <span style={{ fontWeight:600, color:'#64748b', gridColumn:'span 2' }}>Password: <strong style={{color:'#0f172a'}}>Admin@123</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
}
