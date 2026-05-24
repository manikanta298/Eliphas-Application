import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFY } from '../../contexts/FinancialYearContext';

export default function FYSelectPage() {
  const { financialYears, selectedFY, changeFY, loading } = useFY();
  const navigate = useNavigate();

  // If already selected via localStorage, skip this screen
  useEffect(() => {
    const stored = localStorage.getItem('fyConfirmed');
    if (stored && financialYears.length > 0) navigate('/', { replace: true });
  }, [financialYears]);

  const handleContinue = () => {
    if (!selectedFY) return;
    localStorage.setItem('fyConfirmed', 'true');
    navigate('/', { replace: true });
  };

  const handleSelect = (label) => {
    changeFY(label);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.05,
        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: '#1e2235',
        border: '1px solid #2d3748',
        borderRadius: 20,
        padding: '44px 40px',
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 1,
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
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9' }}>
            LogiCore ERP
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
            Welcome back! Select your working financial year
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0',
          marginBottom: 16, textAlign: 'center',
        }}>Select Financial Year</h2>

        {/* FY List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
            Loading financial years...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {financialYears.map(fy => {
              const isSelected = selectedFY?.label === fy.label;
              return (
                <button
                  key={fy._id}
                  onClick={() => handleSelect(fy.label)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${isSelected ? '#3b82f6' : '#2d3748'}`,
                    background: isSelected
                      ? 'linear-gradient(135deg, #1e3a5f, #1a2a4a)'
                      : '#161b2e',
                    color: '#f1f5f9',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 0 20px #3b82f633' : 'none',
                    textAlign: 'left', width: '100%',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1rem' }}>📅</span>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: isSelected ? '#60a5fa' : '#e2e8f0' }}>
                        {fy.label}
                      </span>
                      {fy.isCurrent && (
                        <span style={{
                          fontSize: '0.68rem', padding: '1px 8px', borderRadius: 20,
                          background: '#22c55e22', color: '#22c55e',
                          border: '1px solid #22c55e44', fontWeight: 600,
                        }}>Current</span>
                      )}
                      {fy.isLocked && (
                        <span style={{
                          fontSize: '0.68rem', padding: '1px 8px', borderRadius: 20,
                          background: '#ef444422', color: '#ef4444',
                          border: '1px solid #ef444444', fontWeight: 600,
                        }}>🔒 Locked</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3, marginLeft: 26 }}>
                      {new Date(fy.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' → '}
                      {new Date(fy.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#3b82f6', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', fontSize: '0.75rem',
                      flexShrink: 0,
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedFY || loading}
          style={{
            width: '100%', padding: '14px',
            background: selectedFY ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#2d3748',
            color: selectedFY ? '#fff' : '#64748b',
            border: 'none', borderRadius: 12, cursor: selectedFY ? 'pointer' : 'not-allowed',
            fontWeight: 700, fontSize: '0.95rem',
            boxShadow: selectedFY ? '0 8px 24px #3b82f644' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Loading...' : `Continue with FY ${selectedFY?.label || '...'} →`}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: '0.75rem', color: '#475569' }}>
          You can change this anytime from the top navigation bar
        </div>
      </div>
    </div>
  );
}
