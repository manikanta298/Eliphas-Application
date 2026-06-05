import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [sites, setSites]             = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [loading, setLoading]         = useState(false);

  const loadSites = () => {
    if (!localStorage.getItem('accessToken')) { setLoading(false); return; }
    setLoading(true);
    api.get('/sites', { params: { status: 'active', limit: 200 } })
      .then(r => {
        const list = r.data?.data || [];
        setSites(list);
        const stored = localStorage.getItem('selectedSiteId');
        const match  = stored ? list.find(s => s._id === stored) : null;
        const first  = match || list[0] || null;
        if (first) {
          setSelectedSite(first);
          localStorage.setItem('selectedSiteId', first._id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSites();
    const onLogin  = () => setTimeout(loadSites, 600);
    const onLogout = () => { setSites([]); setSelectedSite(null); };
    window.addEventListener('auth:login',  onLogin);
    window.addEventListener('auth:logout', onLogout);
    return () => {
      window.removeEventListener('auth:login',  onLogin);
      window.removeEventListener('auth:logout', onLogout);
    };
  }, []);

  const changeSite = (id) => {
    const site = sites.find(s => s._id === id);
    if (site) {
      setSelectedSite(site);
      localStorage.setItem('selectedSiteId', site._id);
      window.dispatchEvent(new CustomEvent('site:changed', { detail: site }));
    }
  };

  const clearSite = () => {
    setSelectedSite(null);
    localStorage.removeItem('selectedSiteId');
  };

  return (
    <SiteContext.Provider value={{ sites, selectedSite, changeSite, clearSite, loading, reloadSites: loadSites }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be inside SiteProvider');
  return ctx;
}
