import { useState, useEffect } from 'react';
import { ArrowLeft, Store, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useTelegram } from '../hooks/useTelegram';

type Store = Database['public']['Tables']['stores']['Row'];

interface StoreSelectorProps {
  onBack: () => void;
  onSelect: (storeId: string, storeType: 'digital' | 'physical') => void;
  title: string;
}

export const StoreSelector = ({ onBack, onSelect, title }: StoreSelectorProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'digital' | 'physical' | null>(null);
  const { webApp } = useTelegram();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at');

      if (error) throw error;
      setStores(data || []);

      if (data && data.length === 1) {
        setSelectedStoreId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      webApp?.showAlert('Ошибка загрузки магазинов');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedStoreId) {
      webApp?.showAlert('Выберите магазин');
      return;
    }
    if (!selectedType) {
      webApp?.showAlert('Выберите тип товара');
      return;
    }

    onSelect(selectedStoreId, selectedType);
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {stores.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Выберите магазин
            </label>
            <div className="space-y-2">
              {stores.map((store) => (
                <Card
                  key={store.id}
                  hover
                  onClick={() => setSelectedStoreId(store.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedStoreId === store.id
                      ? 'border-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {store.name}
                      </h3>
                      {store.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {store.description}
                        </p>
                      )}
                    </div>
                    {selectedStoreId === store.id && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Выберите тип
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Card
              hover
              onClick={() => setSelectedType('digital')}
              className={`p-6 cursor-pointer transition-all ${
                selectedType === 'digital'
                  ? 'border-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-2 border-transparent'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  selectedType === 'digital'
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <Package className={`w-8 h-8 ${
                    selectedType === 'digital'
                      ? 'text-white'
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div>
                  <h3 className={`font-semibold mb-1 ${
                    selectedType === 'digital'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    Цифровой товар
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Аккаунты, подписки, игровые предметы
                  </p>
                </div>
              </div>
            </Card>

            <Card
              hover
              onClick={() => setSelectedType('physical')}
              className={`p-6 cursor-pointer transition-all ${
                selectedType === 'physical'
                  ? 'border-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-2 border-transparent'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  selectedType === 'physical'
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <Store className={`w-8 h-8 ${
                    selectedType === 'physical'
                      ? 'text-white'
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div>
                  <h3 className={`font-semibold mb-1 ${
                    selectedType === 'physical'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    Физический товар
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Еда, одежда, услуги, аукцион
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!selectedStoreId || !selectedType}
        >
          Продолжить
        </Button>
      </div>
    </div>
  );
};
