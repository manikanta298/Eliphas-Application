import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFY } from '../../contexts/FinancialYearContext';

export default function FYSelectPage() {
  const { financialYears, selectedFY, changeFY, loading } = useFY();
  const navigate = useNavigate();

  useEffect(() => {
    const confirmed = localStorage.getItem('fyConfirmed');
    if (confirmed && financialYears.length > 0) navigate('/', { replace: true });
  }, [financialYears]);

  const handleContinue = () => {
    if (!selectedFY) return;
    localStorage.setItem('fyConfirmed', selectedFY.label);
    navigate('/', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e8eeff 0%, #f0f4ff 50%, #e4edff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif", padding: 20,
    }}>
      <div style={{
        background: '#fff', border: '1px solid #dde3f0',
        borderRadius: 20, padding: '40px 36px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 8px 40px rgba(26,60,143,0.12)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #1a3c8f, #2563eb)',
            margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', boxShadow: '0 8px 24px rgba(26,60,143,0.25)',
          }}>🐕</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1.25rem', fontWeight: 800, color: '#1a3c8f' }}>
            Select Financial Year
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
            Choose the financial year to continue
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#1a3c8f' }}>Loading years...</div>
            <div style={{ fontSize: '0.78rem' }}>Server waking up (~30s)</div>
          </div>
        ) : financialYears.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#dc2626' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Backend unreachable</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 16 }}>Please wait and retry</div>
            <button onClick={() => window.location.reload()} style={{
              padding: '8px 20px', borderRadius: 8,
              background: '#1a3c8f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
            }}>🔄 Retry</button>
          </div>
        ) : (
          <>
            {/* FY Radio List — matching image */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {financialYears.map(fy => {
                const isSelected = selectedFY?.label === fy.label;
                return (
                  <label key={fy._id} onClick={() => changeFY(fy.label)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? '#1a3c8f' : '#dde3f0'}`,
                    background: isSelected ? '#eef2ff' : '#f8faff',
                    transition: 'all 0.15s',
                  }}>
                    {/* Radio circle */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${isSelected ? '#1a3c8f' : '#c7d0e8'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isSelected ? '#1a3c8f' : '#fff',
                      transition: 'all 0.15s',
                    }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#1a3c8f' : '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {fy.label}
                        {fy.isCurrent && (
                          <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>
                            Current
                          </span>
                        )}
                        {fy.isLocked && (
                          <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700 }}>
                            🔒 Locked
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                        {new Date(fy.startDate).toLocaleDateString('en-IN')} — {new Date(fy.endDate).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Continue Button */}
            <button onClick={handleContinue} disabled={!selectedFY} style={{
              width: '100%', padding: '13px',
              background: selectedFY ? 'linear-gradient(135deg, #1a3c8f, #2563eb)' : '#e2e8f0',
              color: selectedFY ? '#fff' : '#94a3b8',
              border: 'none', borderRadius: 12, cursor: selectedFY ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: '0.95rem',
              boxShadow: selectedFY ? '0 4px 16px rgba(26,60,143,0.3)' : 'none',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              transition: 'all 0.15s',
            }}>
              Continue →
            </button>
          </>
        )}
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.73rem', color: '#94a3b8' }}>
          You can change this anytime from the top bar
        </p>
      </div>
    </div>
  );
}
