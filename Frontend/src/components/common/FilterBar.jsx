import { useState, useEffect } from 'react';
import { useFY } from '../../contexts/FinancialYearContext';
import api from '../../services/api';

/**
 * Universal Filter Bar — shown at top of every data screen.
 * Props:
 *   showSite    (bool) default true
 *   showCompany (bool) default false
 *   onChange({ financialYear, site, company }) — called on any change
 */
export default function FilterBar({ showSite = true, showCompany = false, onChange }) {
  const { financialYears, selectedFY, changeFY } = useFY();
  const [sites, setSites] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [site, setSite] = useState('');
  const [company, setCompany] = useState('');

  useEffect(() => {
    if (showSite) api.get('/sites').then(r => setSites(r.data.data || [])).catch(() => {});
    if (showCompany) api.get('/companies', { params: { type: 'customer' } }).then(r => setCompanies(r.data.data || [])).catch(() => {});
  }, [showSite, showCompany]);

  const notify = (overrides = {}) => {
    onChange?.({
      financialYear: selectedFY?.label,
      site: site || '',
      company: company || '',
      ...overrides,
    });
  };

  useEffect(() => { notify(); }, [selectedFY]);

  const handleFY = (label) => {
    changeFY(label);
    notify({ financialYear: label });
  };

  const handleSite = (val) => {
    setSite(val);
    notify({ site: val });
  };

  const handleCompany = (val) => {
    setCompany(val);
    notify({ company: val });
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
      borderRadius: 10, padding: '8px 14px', marginBottom: 18,
      fontSize: '0.82rem',
    }}>
      <span style={{ color: 'var(--clr-text3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>🔽 Filter:</span>

      {/* Financial Year */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ color: 'var(--clr-text3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Financial Year</label>
        <select
          value={selectedFY?.label || ''}
          onChange={e => handleFY(e.target.value)}
          style={{
            padding: '4px 10px', borderRadius: 6, border: '1px solid var(--clr-primary)',
            background: 'var(--clr-primary)11', color: 'var(--clr-primary)', fontWeight: 700,
            fontSize: '0.82rem', cursor: 'pointer', outline: 'none',
          }}
        >
          {financialYears.map(fy => (
            <option key={fy._id} value={fy.label}>{fy.label}{fy.isCurrent ? ' ★' : ''}</option>
          ))}
        </select>
      </div>

      {/* Site */}
      {showSite && (
        <>
          <span style={{ color: 'var(--clr-border)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ color: 'var(--clr-text3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Site</label>
            <select
              value={site}
              onChange={e => handleSite(e.target.value)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--clr-border)', background: 'var(--clr-bg)', color: 'var(--clr-text)', fontSize: '0.82rem' }}
            >
              <option value="">All Sites</option>
              {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </>
      )}

      {/* Company */}
      {showCompany && (
        <>
          <span style={{ color: 'var(--clr-border)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ color: 'var(--clr-text3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Company</label>
            <select
              value={company}
              onChange={e => handleCompany(e.target.value)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--clr-border)', background: 'var(--clr-bg)', color: 'var(--clr-text)', fontSize: '0.82rem' }}
            >
              <option value="">All Companies</option>
              {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </>
      )}

      {(site || company) && (
        <button onClick={() => { setSite(''); setCompany(''); notify({ site: '', company: '' }); }}
          style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--clr-border)', background: 'transparent', color: 'var(--clr-text3)', cursor: 'pointer', fontSize: '0.75rem' }}>
          Clear ✕
        </button>
      )}
    </div>
  );
}
