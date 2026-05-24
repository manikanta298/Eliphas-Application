import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFY } from '../../contexts/FinancialYearContext';

export default function FYSelectPage() {
  const { financialYears, selectedFY, changeFY, loading } = useFY();
  const navigate = useNavigate();

  // If FY was already confirmed before, skip this screen
  useEffect(() => {
    const confirmed = localStorage.getItem('fyConfirmed');
    // Only skip if years are already loaded (avoid premature redirect)
    if (confirmed && financialYears.length > 0) {
      navigate('/', { replace: true });
    }
  }, [financialYears]);

  const handleContinue = () => {
    if (!selectedFY) return;
    localStorage.setItem('fyConfirmed', selectedFY.label);
    navigate('/', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#1e2235', border: '1px solid #2d3748',
        borderRadius: 20, padding: '44px 40px',
        width: '100%', maxWidth: 440,
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            borderRadius: 14, margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', boxShadow: '0 8px 24px #3b82f644',
          }}>⬡</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9' }}>LogiCore ERP</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>Select Financial Year to continue</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Loading years...</div>
            <div style={{ fontSize: '0.78rem' }}>Waking up server (30s on free tier)</div>
          </div>
        ) : financialYears.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#ef4444' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Could not load financial years</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 16 }}>Backend may be waking up. Please wait...</div>
            <button onClick={() => window.location.reload()}
              style={{ padding: '8px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
              🔄 Retry
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {financialYears.map(fy => {
                const isSelected = selectedFY?.label === fy.label;
                return (
                  <button key={fy._id} onClick={() => changeFY(fy.label)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${isSelected ? '#3b82f6' : '#2d3748'}`,
                    background: isSelected ? 'linear-gradient(135deg, #1e3a5f, #1a2a4a)' : '#161b2e',
                    color: '#f1f5f9', textAlign: 'left', width: '100%',
                    boxShadow: isSelected ? '0 0 20px #3b82f633' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📅</span>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: isSelected ? '#60a5fa' : '#e2e8f0' }}>
                          {fy.label}
                        </span>
                        {fy.isCurrent && (
                          <span style={{ fontSize: '0.68rem', padding: '1px 8px', borderRadius: 20, background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', fontWeight: 600 }}>
                            Current
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3, marginLeft: 26 }}>
                        {new Date(fy.startDate).toLocaleDateString('en-IN')} → {new Date(fy.endDate).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', flexShrink: 0 }}>✓</div>
                    )}
                  </button>
                );
              })}
            </div>

            <button onClick={handleContinue} disabled={!selectedFY} style={{
              width: '100%', padding: 14,
              background: selectedFY ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#2d3748',
              color: selectedFY ? '#fff' : '#64748b',
              border: 'none', borderRadius: 12, cursor: selectedFY ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: '0.95rem',
              boxShadow: selectedFY ? '0 8px 24px #3b82f644' : 'none',
            }}>
              Continue with FY {selectedFY?.label} →
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: '0.75rem', color: '#475569' }}>
          You can change this anytime from the top navigation bar
        </div>
      </div>
    </div>
  );
}
