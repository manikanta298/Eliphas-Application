import { useState, useRef, useEffect } from 'react';

/**
 * ComboInput — type to filter suggestions, or enter a new free-text value.
 * Props:
 *   label       – form label string
 *   value       – controlled text value
 *   options     – array of { _id, name } objects
 *   onSelect(o) – called when user picks a suggestion (passes full object)
 *   onChange(s) – called when user types freely (passes string)
 *   placeholder
 *   required
 */
export default function ComboInput({ label, value, options = [], onSelect, onChange, placeholder, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const filtered = value
    ? options.filter(o => o.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="form-group" style={{ position: 'relative' }} ref={ref}>
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <input
        className="form-input"
        value={value}
        placeholder={placeholder || 'Type or select…'}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(o => (
            <div
              key={o._id}
              onMouseDown={() => { onSelect(o); setOpen(false); }}
              style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '0.88rem', borderBottom: '1px solid var(--clr-border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {o.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
