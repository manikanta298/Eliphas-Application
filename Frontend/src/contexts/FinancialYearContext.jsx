import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const FinancialYearContext = createContext(null);

export function FinancialYearProvider({ children }) {
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFY, setSelectedFY]         = useState(null);
  const [loading, setLoading]               = useState(false);

  const loadFYs = () => {
    // Only fetch if user has a token (avoid unnecessary call on login page)
    if (!localStorage.getItem('accessToken')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get('/financial-years')
      .then(r => {
        const years = r.data?.data || [];
        setFinancialYears(years);

        // Restore from localStorage or pick current FY
        const stored = localStorage.getItem('selectedFY');
        const match  = stored ? years.find(y => y.label === stored) : null;
        const current = match || years.find(y => y.isCurrent) || years[0];
        if (current) {
          setSelectedFY(current);
          localStorage.setItem('selectedFY', current.label);
        }
      })
      .catch(() => {}) // silent fail — don't crash app
      .finally(() => setLoading(false));
  };

  // Load FYs on mount + whenever token changes (login/logout)
  useEffect(() => {
    loadFYs();
    // Re-load when user logs in
    const onLogin  = () => setTimeout(loadFYs, 500);
    const onLogout = () => { setFinancialYears([]); setSelectedFY(null); };
    window.addEventListener('auth:login',  onLogin);
    window.addEventListener('auth:logout', onLogout);
    return () => {
      window.removeEventListener('auth:login',  onLogin);
      window.removeEventListener('auth:logout', onLogout);
    };
  }, []);

  const changeFY = (label) => {
    const fy = financialYears.find(y => y.label === label);
    if (fy) {
      setSelectedFY(fy);
      localStorage.setItem('selectedFY', fy.label);
    }
  };

  return (
    <FinancialYearContext.Provider value={{ financialYears, selectedFY, changeFY, loading }}>
      {children}
    </FinancialYearContext.Provider>
  );
}

export function useFY() {
  const ctx = useContext(FinancialYearContext);
  if (!ctx) throw new Error('useFY must be inside FinancialYearProvider');
  return ctx;
}
