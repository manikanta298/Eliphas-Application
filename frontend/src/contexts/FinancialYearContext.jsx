import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const FinancialYearContext = createContext(null);

export function FinancialYearProvider({ children }) {
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFY, setSelectedFY] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/financial-years')
      .then(r => {
        const years = r.data.data || [];
        setFinancialYears(years);
        // Auto-select current FY
        const current = years.find(y => y.isCurrent) || years[0];
        if (current) {
          setSelectedFY(current);
          // Restore from localStorage if available
          const stored = localStorage.getItem('selectedFY');
          if (stored) {
            const found = years.find(y => y.label === stored);
            if (found) setSelectedFY(found);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const changeFY = (fyLabel) => {
    const fy = financialYears.find(y => y.label === fyLabel);
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
