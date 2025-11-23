import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Store = Database['public']['Tables']['stores']['Row'];

interface StoreContextType {
  store: Store | null;
  loading: boolean;
  error: string | null;
  refreshStore: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setStore(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store');
      console.error('Error fetching store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();
  }, []);

  return (
    <StoreContext.Provider
      value={{ store, loading, error, refreshStore: fetchStore }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
