import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [remember, setRemember] = useState(false);

  if (user) return <Navigate to="/fy-select" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Enter email and password'); return; }
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      window.dispatchEvent(new CustomEvent('auth:login'));
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">🐕</div>
          <div className="login-brand-name">DOG'S DASHBOARD</div>
          <div className="login-brand-tag">Sign in to your account</div>
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
            <label className="login-label">Username / Email</label>
            <div className="login-input-wrap">
              <input
                className="login-input"
                type="email"
                placeholder="Enter username"
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
                style={{ paddingRight: 40 }}
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

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <div className="login-forgot">
            <a href="/forgot-password">Forgot Password?</a>
          </div>
        </form>
      </div>
    </div>
  );
}
