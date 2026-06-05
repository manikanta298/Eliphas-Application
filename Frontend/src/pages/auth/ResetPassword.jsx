import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Login.css';

const API = import.meta.env.VITE_API_URL || '';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ password: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) {
      setStatus('error'); setMessage('Password must be at least 6 characters.'); return;
    }
    if (form.password !== form.confirm) {
      setStatus('error'); setMessage('Passwords do not match.'); return;
    }
    setLoading(true); setStatus(null); setMessage('');
    try {
      const res = await fetch(`${API}/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: form.password }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setStatus('error');
        setMessage(data.message || 'Reset failed. The link may have expired.');
      }
    } catch {
      setStatus('error');
      setMessage('Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <div className="login-logo">🔑</div>
          <div className="login-brand-name">DOG'S DASHBOARD</div>
          <div className="login-brand-tag">Set a new password</div>
        </div>

        {status === 'success' && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'12px 14px', marginBottom:16, color:'#15803d', fontSize:'0.83rem', fontWeight:600 }}>
            ✅ {message}
          </div>
        )}
        {status === 'error' && (
          <div className="login-error" style={{ marginBottom:14 }}>
            ⚠️ {message}
          </div>
        )}

        {status !== 'success' && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label">New Password</label>
              <div className="login-input-wrap">
                <input
                  className="login-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingRight:42 }}
                />
                <button type="button" className="login-eye" onClick={() => setShowPw(p => !p)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="login-field">
              <label className="login-label">Confirm Password</label>
              <div className="login-input-wrap">
                <input
                  className="login-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop:8 }}>
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                  <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite',display:'block' }} />
                  Resetting...
                </span>
              ) : 'Reset Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
