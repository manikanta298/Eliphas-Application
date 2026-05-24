import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';

export default function SettingsPage() {
  const { user, can } = useAuth();
  const { financialYears, selectedFY, changeFY } = useFY();
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState('');

  const mockSave = (msg) => { setSaved(msg); setTimeout(() => setSaved(''), 2500); };

  const tabs = [
    { key: 'general',  label: '⚙️ General' },
    { key: 'fy',       label: '📅 Financial Year' },
    { key: 'invoice',  label: '🧾 Invoice' },
    { key: 'gst',      label: '🏛️ GST / Tax' },
    { key: 'profile',  label: '👤 Profile' },
  ];

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">System configuration and preferences</p>
        </div>
        {saved && (
          <div style={{ padding: '8px 16px', background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem' }}>
            ✅ {saved}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 12, overflow: 'hidden' }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                width: '100%', padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: activeTab === tab.key ? 'var(--clr-primary)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--clr-text2)',
                fontWeight: activeTab === tab.key ? 700 : 400, fontSize: '0.85rem',
                borderBottom: '1px solid var(--clr-border)',
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 12, padding: 24 }}>

            {activeTab === 'general' && (
              <div>
                <h3 style={{ marginBottom: 20, color: 'var(--clr-text)' }}>General Settings</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input className="form-input" defaultValue="LogiCore Logistics Pvt Ltd" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Phone</label>
                    <input className="form-input" defaultValue="+91 98765 43210" />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Company Address</label>
                    <textarea className="form-input" rows={2} defaultValue="Vizag, Andhra Pradesh" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Currency</label>
                    <select className="form-select" defaultValue="INR">
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Format</label>
                    <select className="form-select">
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => mockSave('General settings saved!')}>Save Settings</button>
              </div>
            )}

            {activeTab === 'fy' && (
              <div>
                <h3 style={{ marginBottom: 8, color: 'var(--clr-text)' }}>Financial Year Management</h3>
                <p style={{ color: 'var(--clr-text3)', fontSize: '0.84rem', marginBottom: 20 }}>
                  Financial years are auto-generated. You can lock previous years to prevent edits.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {financialYears.map(fy => (
                    <div key={fy._id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', borderRadius: 10,
                      background: selectedFY?.label === fy.label ? 'var(--clr-primary)11' : 'var(--clr-bg)',
                      border: `1px solid ${selectedFY?.label === fy.label ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '1.2rem' }}>📅</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fy.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--clr-text3)' }}>
                            {new Date(fy.startDate).toLocaleDateString('en-IN')} → {new Date(fy.endDate).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {fy.isCurrent && <span className="badge badge-green">Current</span>}
                        {fy.isLocked && <span className="badge badge-red">🔒 Locked</span>}
                        <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                          onClick={() => changeFY(fy.label)}>
                          {selectedFY?.label === fy.label ? '✓ Selected' : 'Select'}
                        </button>
                        {can('canDeleteFinancial') && !fy.isLocked && (
                          <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.78rem', color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => mockSave(`FY ${fy.label} lock requested (feature)`)}>
                            🔒 Lock
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'invoice' && (
              <div>
                <h3 style={{ marginBottom: 20, color: 'var(--clr-text)' }}>Invoice Settings</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Invoice Prefix</label>
                    <input className="form-input" defaultValue="INV" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Prefix</label>
                    <input className="form-input" defaultValue="PUR" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default GST %</label>
                    <input className="form-input" type="number" defaultValue="18" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default TDS %</label>
                    <input className="form-input" type="number" defaultValue="2" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Show Margin on Invoice?</label>
                    <select className="form-select">
                      <option value="no">No (Hidden from customer)</option>
                      <option value="admin">Admin Only</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Due Days</label>
                    <input className="form-input" type="number" defaultValue="30" />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Invoice Footer Text</label>
                    <textarea className="form-input" rows={2} defaultValue="Thank you for your business. Payment due within 30 days." />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => mockSave('Invoice settings saved!')}>Save Settings</button>
              </div>
            )}

            {activeTab === 'gst' && (
              <div>
                <h3 style={{ marginBottom: 20, color: 'var(--clr-text)' }}>GST &amp; Tax Setup</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Company GSTIN</label>
                    <input className="form-input" placeholder="22AAAAA0000A1Z5" style={{ textTransform: 'uppercase' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN</label>
                    <input className="form-input" placeholder="AAAAA0000A" style={{ textTransform: 'uppercase' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State Code</label>
                    <input className="form-input" defaultValue="37" placeholder="AP = 37" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Type</label>
                    <select className="form-select">
                      <option>CGST + SGST (Intrastate)</option>
                      <option>IGST (Interstate)</option>
                    </select>
                  </div>
                  {[
                    { name: 'Sand', hsn: '2505', gst: '5' },
                    { name: 'Coal', hsn: '2701', gst: '5' },
                    { name: 'Transport', hsn: '9965', gst: '18' },
                  ].map((p, i) => (
                    <div key={i} style={{ gridColumn: 'span 2', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--clr-bg)', padding: '10px 14px', borderRadius: 8 }}>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label className="form-label" style={{ margin: 0, fontSize: '0.75rem' }}>HSN</label>
                        <input className="form-input" defaultValue={p.hsn} style={{ width: 80 }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label className="form-label" style={{ margin: 0, fontSize: '0.75rem' }}>GST%</label>
                        <input className="form-input" type="number" defaultValue={p.gst} style={{ width: 60 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => mockSave('GST settings saved!')}>Save GST Settings</button>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h3 style={{ marginBottom: 20, color: 'var(--clr-text)' }}>My Profile</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, background: 'var(--clr-bg)', borderRadius: 10 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--clr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', color: '#fff', fontWeight: 800 }}>
                    {user?.name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{user?.name}</div>
                    <div style={{ color: 'var(--clr-text3)', fontSize: '0.82rem' }}>{user?.email}</div>
                    <span className="badge badge-gray" style={{ marginTop: 4 }}>{user?.role}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" defaultValue={user?.name} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" defaultValue={user?.email} type="email" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input className="form-input" type="password" placeholder="Leave blank to keep current" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input className="form-input" type="password" placeholder="Confirm new password" />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => mockSave('Profile updated!')}>Update Profile</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
