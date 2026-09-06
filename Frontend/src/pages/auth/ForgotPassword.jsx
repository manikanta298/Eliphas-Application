import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

const API = import.meta.env.VITE_API_URL || '';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);

  const requestOtp = async (e) => {
    e.preventDefault();
    if (!email) return setMessage('Please enter your registered email.');
    setLoading(true); setStatus(null); setMessage('');
    try {
      const res = await fetch(`${API}/api/auth/forgot-password/request-otp`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email})
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Unable to send OTP.');
      setStep(2); setStatus('success'); setMessage('OTP sent to your registered email. It expires in 10 minutes.');
    } catch (e) { setStatus('error'); setMessage(e.message || 'Cannot connect to server.'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setStatus('error'); setMessage('Enter the 6-digit OTP.'); return; }
    setLoading(true); setStatus(null); setMessage('');
    try {
      const res = await fetch(`${API}/api/auth/forgot-password/verify-otp`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,otp})
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Invalid OTP.');
      sessionStorage.setItem('passwordResetToken', data.data.resetToken);
      sessionStorage.setItem('passwordResetEmail', email);
      setStep(3); setStatus('success'); setMessage('OTP verified. Create your new password.');
    } catch (e) { setStatus('error'); setMessage(e.message || 'Invalid or expired OTP.'); }
    finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setMessage('Password must be at least 6 characters.');
    if (password !== confirm) return setMessage('Passwords do not match.');
    const token = sessionStorage.getItem('passwordResetToken');
    if (!token) return setMessage('Please verify the OTP again.');
    setLoading(true); setStatus(null); setMessage('');
    try {
      const res = await fetch(`${API}/api/auth/reset-password/${token}`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password})
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Unable to reset password.');
      sessionStorage.removeItem('passwordResetToken');
      sessionStorage.removeItem('passwordResetEmail');
      setStatus('success'); setMessage('Password changed successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (e) { setStatus('error'); setMessage(e.message || 'Unable to reset password.'); }
    finally { setLoading(false); }
  };

  const form = step === 1 ? (
    <form className="login-form" onSubmit={requestOtp}>
      <div className="login-field"><label className="login-label">Registered Email</label>
        <div className="login-input-wrap"><input className="login-input" type="email" placeholder="Enter your email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></div>
      </div>
      <button className="login-btn" disabled={loading}>{loading ? 'Sending OTP...' : 'Send OTP'}</button>
    </form>
  ) : step === 2 ? (
    <form className="login-form" onSubmit={verifyOtp}>
      <div className="login-field"><label className="login-label">6-Digit OTP</label>
        <div className="login-input-wrap"><input className="login-input" inputMode="numeric" maxLength={6} placeholder="Enter OTP" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} autoComplete="one-time-code" /></div>
      </div>
      <button className="login-btn" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button>
      <button type="button" className="login-btn" style={{marginTop:8,background:'#64748b'}} onClick={()=>{setStep(1);setStatus(null);setMessage('');}}>Change Email</button>
    </form>
  ) : (
    <form className="login-form" onSubmit={resetPassword}>
      <div className="login-field"><label className="login-label">New Password</label><div className="login-input-wrap"><input className="login-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></div></div>
      <div className="login-field"><label className="login-label">Confirm New Password</label><div className="login-input-wrap"><input className="login-input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" /></div></div>
      <button className="login-btn" disabled={loading}>{loading ? 'Changing Password...' : 'Change Password'}</button>
    </form>
  );

  return <div className="login-page"><div className="login-card">
    <div className="login-brand"><div className="login-logo">🔐</div><div className="login-brand-name">DOG'S DASHBOARD</div><div className="login-brand-tag">Forgot your password?</div></div>
    <p style={{textAlign:'center',color:'#64748b',fontSize:'0.83rem',marginBottom:20,lineHeight:1.5}}>Enter your email, receive a 6-digit OTP, verify it, and create a new password. No reset link is required.</p>
    {status && <div style={{background:status==='success'?'#f0fdf4':'#fef2f2',border:`1px solid ${status==='success'?'#bbf7d0':'#fecaca'}`,borderRadius:8,padding:'12px 14px',marginBottom:16,color:status==='success'?'#15803d':'#b91c1c',fontSize:'0.83rem',fontWeight:600}}>{status==='success'?'✅':'⚠️'} {message}</div>}
    {!status && message && <div className="login-error" style={{marginBottom:14}}>⚠️ {message}</div>}
    {status==='error' && null}
    {form}
    <div className="login-forgot" style={{marginTop:20,textAlign:'center'}}><Link to="/login" style={{color:'#1a3c8f',fontSize:'0.83rem',textDecoration:'none',fontWeight:600}}>← Back to Login</Link></div>
  </div></div>;
}
