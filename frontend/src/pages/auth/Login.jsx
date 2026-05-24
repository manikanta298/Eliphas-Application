import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/fy-select" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const creds = {
      masterAdmin: { email: 'masteradmin@erp.com', password: 'Admin@123' },
      admin: { email: 'admin@erp.com', password: 'Admin@123' },
      manager: { email: 'manager@erp.com', password: 'Manager@123' },
    };
    setForm(creds[role]);
  };

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-bg">
        <div className="login-bg-grid" />
        <div className="login-bg-glow" />
      </div>

      <div className="login-container">
        {/* Left Panel */}
        <div className="login-left">
          <div className="login-brand">
            <div className="login-brand-icon">⬡</div>
            <div>
              <h1 className="login-brand-name">LogiCore ERP</h1>
              <p className="login-brand-tag">Logistics & Transport Management</p>
            </div>
          </div>

          <div className="login-features">
            {[
              { icon: '🚛', text: 'Fleet & Trip Management' },
              { icon: '⛽', text: 'Diesel Tracking System' },
              { icon: '🧾', text: 'Auto Invoice Generation' },
              { icon: '💰', text: 'Hidden Profit Analytics' },
              { icon: '📊', text: 'Real-time ERP Reports' },
              { icon: '🔐', text: 'Role-based Access Control' },
            ].map((f, i) => (
              <div key={i} className="login-feature-item" style={{ animationDelay: `${i * 0.1}s` }}>
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          <div className="login-clients">
            <p>Trusted for</p>
            <div className="login-client-tags">
              <span>Vizag Steel Plant</span>
              <span>Gannavaram Port</span>
              <span>Construction Sites</span>
            </div>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your ERP account</p>
            </div>

            {error && (
              <div className="login-error">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="admin@company.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Signing in...</> : '→ Sign In'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="login-demo">
              <p className="login-demo-label">Demo Access</p>
              <div className="login-demo-btns">
                {[
                  { role: 'masterAdmin', label: 'Master Admin', color: '#f5a623' },
                  { role: 'admin', label: 'Admin', color: '#3b82f6' },
                  { role: 'manager', label: 'Manager', color: '#22c55e' },
                ].map(d => (
                  <button
                    key={d.role}
                    type="button"
                    className="login-demo-btn"
                    style={{ '--demo-color': d.color }}
                    onClick={() => fillDemo(d.role)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
