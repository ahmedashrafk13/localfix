import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const AppDataContext = createContext(null);

/** Data almost every page needs: service categories and the launch cities/areas. Loaded once. */
export function AppDataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cats, meta] = await Promise.all([api.get('/categories'), api.get('/meta')]);
      setCategories(cats.items);
      setCities(meta.cities);
    } catch {
      /* pages show their own errors; navigation still works */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    const allAreas = cities.flatMap((c) => c.areas.map((a) => ({ ...a, city: c.name })));
    return {
      categories,
      cities,
      allAreas,
      loaded,
      reload: load,
      categoryBySlug: (slug) => categories.find((c) => c.slug === slug),
      categoryById: (id) => categories.find((c) => c.id === id),
      areasFor: (city) => cities.find((c) => c.name === city)?.areas || [],
    };
  }, [categories, cities, loaded, load]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  return useContext(AppDataContext);
}
