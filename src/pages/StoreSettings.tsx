import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Loading } from '../../components/Loading';
import { useTranslation } from '../../hooks/useTranslation';
import { useTelegram } from '../../hooks/useTelegram';

type Store = Database['public']['Tables']['stores']['Row'];

interface StoreSettingsProps {
  storeId: string;
  onBack: () => void;
}

export const StoreSettings = ({ storeId, onBack }: StoreSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    language: 'ru',
  });
  const { t } = useTranslation();
  const { webApp } = useTelegram();

  useEffect(() => {
    loadStore();
  }, [storeId]);

  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(onBack);
      return () => {
        webApp.BackButton.hide();
        webApp.BackButton.offClick(onBack);
      };
    }
  }, [webApp, onBack]);

  const loadStore = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name,
          language: data.language || 'ru',
        });
      }
    } catch (error) {
      console.error('Error loading store:', error);
      webApp?.showAlert('Ошибка загрузки настроек магазина');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      webApp?.showAlert('Введите название магазина');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          language: formData.language,
        })
        .eq('id', storeId);

      if (error) throw error;

      webApp?.HapticFeedback.notificationOccurred('success');
      webApp?.showAlert('Настройки сохранены');
      loadStore();
    } catch (error) {
      console.error('Error saving store settings:', error);
      webApp?.showAlert('Ошибка сохранения настроек');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.storeSettings')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
          <Input
            label="Название магазина"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Введите название магазина"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Язык магазина
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setFormData({ ...formData, language: 'ru' })}
                className={`w-full p-3 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                  formData.language === 'ru'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white'
                }`}
              >
                <span className="text-2xl">🇷🇺</span>
                <span className="font-medium">Русский</span>
              </button>
              <button
                onClick={() => setFormData({ ...formData, language: 'en' })}
                className={`w-full p-3 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                  formData.language === 'en'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white'
                }`}
              >
                <span className="text-2xl">🇬🇧</span>
                <span className="font-medium">English</span>
              </button>
            </div>
          </div>

          <Button fullWidth onClick={handleSubmit} loading={submitting}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
