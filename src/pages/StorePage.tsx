import { useEffect, useState } from 'react';
import { ShoppingCart, Settings, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useTranslation } from '../hooks/useTranslation';
import { useCart } from '../hooks/useCart';
import { useTelegram } from '../hooks/useTelegram';
import { useTheme } from '../contexts/ThemeContext';

type Category = Database['public']['Tables']['categories']['Row'];

interface StorePageProps {
  storeId: string;
  onCategoryClick: (categoryId: string) => void;
  onCartClick: () => void;
  onAdminClick: () => void;
  isAdmin: boolean;
}

export const StorePage = ({
  storeId,
  onCategoryClick,
  onCartClick,
  onAdminClick,
  isAdmin,
}: StorePageProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { itemCount } = useCart();
  const { webApp } = useTelegram();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    loadCategories();
  }, [storeId]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_visible', true)
        .is('parent_category_id', null)
        .order('order_position');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      webApp?.showAlert('Ошибка загрузки категорий');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('store.title')}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? 'Светлая тема' : 'Темная тема'}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
            {isAdmin && (
              <button
                onClick={onAdminClick}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            <button
              onClick={onCartClick}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{t('category.noCategories')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <Card
                key={category.id}
                hover
                onClick={() => onCategoryClick(category.id)}
                className="p-4"
              >
                <div className="flex flex-col items-center gap-2">
                  {category.image_url ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden">
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-4xl">{category.icon}</div>
                  )}
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white text-center">
                    {category.name}
                  </h3>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
