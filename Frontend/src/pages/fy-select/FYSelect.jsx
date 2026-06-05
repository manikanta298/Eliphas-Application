import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFY } from '../../contexts/FinancialYearContext';
import api from '../../services/api';

const btn = (extra = {}) => ({
  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
  fontWeight: 600, fontSize: '0.8rem', border: 'none', ...extra,
});

export default function FYSelectPage() {
  const { financialYears, selectedFY, changeFY, loading, refreshFYs } = useFY();
  const navigate = useNavigate();

  const [showAdd,  setShowAdd]  = useState(false);
  const [newFY,    setNewFY]    = useState('');
  const [adding,   setAdding]   = useState(false);
  const [error,    setError]    = useState('');

  // Edit state
  const [editId,   setEditId]   = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editErr,  setEditErr]  = useState('');
  const [saving,   setSaving]   = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const confirmed = localStorage.getItem('fyConfirmed');
    if (confirmed && financialYears.length > 0) navigate('/sites', { replace: true });
  }, [financialYears]);

  const handleContinue = () => {
    if (!selectedFY) return;
    localStorage.setItem('fyConfirmed', selectedFY.label);
    navigate('/sites', { replace: true });
  };

  const suggestNextFY = () => {
    if (financialYears.length === 0) return '';
    const last  = [...financialYears].sort((a,b) => new Date(b.startDate) - new Date(a.startDate))[0];
    const match = last.label?.match(/(\d{4})-(\d{2,4})/);
    if (!match) return '';
    const startYear = parseInt(match[1]) + 1;
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
  };

  // ── Add ──────────────────────────────────────────────────────
  const handleAddFY = async () => {
    const label = newFY.trim();
    if (!label) { setError('Enter a financial year e.g. 2025-26'); return; }
    const match = label.match(/^(\d{4})-(\d{2,4})$/);
    if (!match) { setError('Format must be like 2025-26'); return; }
    setAdding(true); setError('');
    try {
      const startYear = parseInt(match[1]);
      const endYear   = match[2].length === 2 ? parseInt(`${String(startYear).slice(0,2)}${match[2]}`) : parseInt(match[2]);
      await api.post('/financial-years', {
        label, startDate: `${startYear}-04-01`, endDate: `${endYear}-03-31`,
        isCurrent: financialYears.length === 0,
      });
      setNewFY(''); setShowAdd(false);
      if (refreshFYs) await refreshFYs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add');
    } finally { setAdding(false); }
  };

  // ── Edit ─────────────────────────────────────────────────────
  const startEdit = (fy, e) => {
    e.stopPropagation();
    setEditId(fy._id); setEditLabel(fy.label); setEditErr('');
  };
  const handleEdit = async () => {
    const label = editLabel.trim();
    if (!label) { setEditErr('Label required'); return; }
    const match = label.match(/^(\d{4})-(\d{2,4})$/);
    if (!match) { setEditErr('Format: 2025-26'); return; }
    setSaving(true); setEditErr('');
    try {
      await api.put(`/financial-years/${editId}`, { label });
      setEditId(null);
      if (refreshFYs) await refreshFYs();
    } catch (err) {
      setEditErr(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/financial-years/${deleteId}`);
      setDeleteId(null);
      if (refreshFYs) await refreshFYs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
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
        width: '100%', maxWidth: 460,
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
            Choose, add, edit or delete a financial year
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#1a3c8f' }}>Loading years...</div>
            <div style={{ fontSize: '0.78rem' }}>Server waking up (~30s)</div>
          </div>
        ) : (
          <>
            {/* FY List */}
            {financialYears.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0 24px', color: '#64748b', fontSize: '0.85rem' }}>
                No financial years yet. Add one below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {financialYears.map(fy => {
                  const isSelected = selectedFY?.label === fy.label;
                  const isEditing  = editId === fy._id;

                  return (
                    <div key={fy._id}>
                      {/* ── Edit inline form ── */}
                      {isEditing ? (
                        <div style={{ background: '#f8faff', border: '1.5px solid #a5b4fc', borderRadius: 12, padding: 14 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1a3c8f', marginBottom: 8 }}>
                            ✏️ Edit Financial Year
                          </div>
                          <input
                            value={editLabel}
                            onChange={e => setEditLabel(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleEdit()}
                            placeholder="e.g. 2025-26"
                            style={{
                              width: '100%', padding: '9px 12px', borderRadius: 8,
                              border: '1.5px solid #dde3f0', fontSize: '0.9rem',
                              outline: 'none', marginBottom: 8, boxSizing: 'border-box',
                              fontFamily: 'inherit',
                            }}
                          />
                          {editErr && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: 6 }}>⚠️ {editErr}</div>}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleEdit} disabled={saving}
                              style={btn({ background: '#1a3c8f', color: '#fff', flex: 1 })}>
                              {saving ? 'Saving...' : '✓ Save'}
                            </button>
                            <button onClick={() => setEditId(null)}
                              style={btn({ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' })}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Normal FY row ── */
                        <div onClick={() => changeFY(fy.label)} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                          border: `1.5px solid ${isSelected ? '#1a3c8f' : '#dde3f0'}`,
                          background: isSelected ? '#eef2ff' : '#f8faff',
                          transition: 'all 0.15s',
                        }}>
                          {/* Radio dot */}
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${isSelected ? '#1a3c8f' : '#c7d0e8'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isSelected ? '#1a3c8f' : '#fff',
                          }}>
                            {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                          </div>

                          {/* Label */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#1a3c8f' : '#0f172a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {fy.label}
                              {fy.isCurrent && <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>Current</span>}
                              {fy.isLocked && <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700 }}>🔒 Locked</span>}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                              {new Date(fy.startDate).toLocaleDateString('en-IN')} — {new Date(fy.endDate).toLocaleDateString('en-IN')}
                            </div>
                          </div>

                          {/* Edit & Delete buttons */}
                          {!fy.isLocked && (
                            <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                              <button onClick={e => startEdit(fy, e)}
                                style={btn({ background: '#eef2ff', color: '#1a3c8f', padding: '6px 10px' })}
                                title="Edit">✏️</button>
                              <button onClick={e => { e.stopPropagation(); setDeleteId(fy._id); }}
                                style={btn({ background: '#fef2f2', color: '#dc2626', padding: '6px 10px' })}
                                title="Delete">🗑️</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add New FY */}
            {!showAdd ? (
              <button onClick={() => { setShowAdd(true); setNewFY(suggestNextFY()); }} style={{
                width: '100%', padding: '11px',
                background: '#f1f5ff', color: '#1a3c8f',
                border: '1.5px dashed #a5b4fc', borderRadius: 12, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.88rem', marginBottom: 16,
              }}>
                + Add New Financial Year
              </button>
            ) : (
              <div style={{ background: '#f8faff', border: '1.5px solid #a5b4fc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a3c8f', marginBottom: 10 }}>New Financial Year</div>
                <input
                  type="text" placeholder="e.g. 2025-26" value={newFY}
                  onChange={e => setNewFY(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddFY()}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #dde3f0', fontSize: '0.9rem', outline: 'none', marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {error && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginBottom: 8 }}>⚠️ {error}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddFY} disabled={adding}
                    style={btn({ flex: 1, background: '#1a3c8f', color: '#fff', padding: '9px' })}>
                    {adding ? 'Adding...' : '✓ Add'}
                  </button>
                  <button onClick={() => { setShowAdd(false); setError(''); }}
                    style={btn({ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '9px 16px' })}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Continue */}
            <button onClick={handleContinue} disabled={!selectedFY} style={{
              width: '100%', padding: '13px',
              background: selectedFY ? 'linear-gradient(135deg, #1a3c8f, #2563eb)' : '#e2e8f0',
              color: selectedFY ? '#fff' : '#94a3b8',
              border: 'none', borderRadius: 12, cursor: selectedFY ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: '0.95rem',
              boxShadow: selectedFY ? '0 4px 16px rgba(26,60,143,0.3)' : 'none',
              fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all 0.15s',
            }}>
              Continue →
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.73rem', color: '#94a3b8' }}>
          You can change this anytime from the top bar
        </p>
      </div>

      {/* ── Delete Confirm Dialog ── */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 360, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              Delete Financial Year?
            </div>
            <div style={{ fontSize: '0.83rem', color: '#64748b', textAlign: 'center', marginBottom: 20 }}>
              This will permanently delete this financial year. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)}
                style={btn({ flex: 1, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px' })}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={btn({ flex: 1, background: '#dc2626', color: '#fff', padding: '10px' })}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
