import { useEffect, useState } from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { useTranslation } from '../hooks/useTranslation';
import { useCart } from '../hooks/useCart';
import { useTelegram } from '../hooks/useTelegram';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
}

export const ProductDetailPage = ({ productId, onBack }: ProductDetailPageProps) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { t } = useTranslation();
  const { addItem } = useCart();
  const { webApp } = useTelegram();

  useEffect(() => {
    loadProduct();
  }, [productId]);

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

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      webApp?.showAlert('Ошибка загрузки товара');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity,
      imageUrl: product.images_urls?.[0],
    });

    webApp?.HapticFeedback.notificationOccurred('success');
    webApp?.showAlert('Товар добавлен в корзину');
  };

  if (loading) return <Loading />;
  if (!product) return <div>Product not found</div>;

  const images = product.images_urls || [];
  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{product.name}</h1>
        </div>
      </div>

      {hasImages && (
        <div className="relative bg-white dark:bg-gray-800">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {images.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-80 object-cover flex-shrink-0"
                />
              ))}
            </div>
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'bg-white w-4'
                      : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{product.name}</h2>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {Number(product.price).toLocaleString()} ₽
          </p>
          {product.stock_quantity > 0 ? (
            <p className="text-sm text-green-600 mt-2">
              {t('store.inStock')}: {product.stock_quantity}
            </p>
          ) : (
            <p className="text-sm text-red-600 mt-2">{t('store.outOfStock')}</p>
          )}
        </div>

        {product.description && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('product.description')}</h3>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{product.description}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('store.quantity')}</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
              disabled={quantity <= 1}
            >
              <Minus className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            <span className="text-2xl font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
              className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
              disabled={quantity >= product.stock_quantity}
            >
              <Plus className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
        <Button
          onClick={handleAddToCart}
          fullWidth
          size="lg"
          disabled={product.stock_quantity === 0}
        >
          {t('product.addToCart')} • {(Number(product.price) * quantity).toLocaleString()} ₽
        </Button>
      </div>
    </div>
  );
};
