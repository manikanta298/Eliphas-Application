import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

const API = import.meta.env.VITE_API_URL || '';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null); // 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setStatus('error'); setMessage('Please enter your email address.'); return; }
    setLoading(true); setStatus(null); setMessage('');
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage('Reset link sent! Check manikantakambala12@gmail.com inbox.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Try again.');
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
          <div className="login-logo">🔐</div>
          <div className="login-brand-name">DOG'S DASHBOARD</div>
          <div className="login-brand-tag">Forgot your password?</div>
        </div>

        <p style={{ textAlign:'center', color:'#64748b', fontSize:'0.83rem', marginBottom:20, lineHeight:1.5 }}>
          Enter the registered email below. A reset link will be sent to the admin email.
        </p>

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
              <label className="login-label">Registered Email</label>
              <div className="login-input-wrap">
                <input
                  className="login-input"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop:8 }}>
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                  <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite',display:'block' }} />
                  Sending...
                </span>
              ) : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="login-forgot" style={{ marginTop:20, textAlign:'center' }}>
          <Link to="/login" style={{ color:'#1a3c8f', fontSize:'0.83rem', textDecoration:'none', fontWeight:600 }}>
            ← Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
