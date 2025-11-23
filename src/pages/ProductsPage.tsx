import { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useTranslation } from '../hooks/useTranslation';
import { useTelegram } from '../hooks/useTelegram';

type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

interface ProductsPageProps {
  categoryId: string;
  onBack: () => void;
  onProductClick: (productId: string) => void;
}

export const ProductsPage = ({ categoryId, onBack, onProductClick }: ProductsPageProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();
  const { webApp } = useTelegram();

  useEffect(() => {
    loadData();
  }, [categoryId]);

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

  const loadData = async () => {
    try {
      const [categoryResult, productsResult] = await Promise.all([
        supabase.from('categories').select('*').eq('id', categoryId).single(),
        supabase
          .from('products')
          .select('*')
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (productsResult.error) throw productsResult.error;

      setCategory(categoryResult.data);
      setProducts(productsResult.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      webApp?.showAlert('Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="На главную"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{category?.name || 'Поиск'}</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{t('productAdmin.noProducts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                hover
                onClick={() => onProductClick(product.id)}
                className="overflow-hidden"
              >
                {product.images_urls && product.images_urls.length > 0 ? (
                  <img
                    src={product.images_urls[0]}
                    alt={product.name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-3xl">📦</span>
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {product.price.toLocaleString()} ₽
                  </p>
                  {product.stock_quantity > 0 ? (
                    <p className="text-xs text-green-600 mt-1">{t('store.inStock')}</p>
                  ) : (
                    <p className="text-xs text-red-600 mt-1">{t('store.outOfStock')}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
