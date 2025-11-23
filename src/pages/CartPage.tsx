import { ArrowLeft, Trash2, Minus, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useTranslation } from '../hooks/useTranslation';
import { useCart } from '../hooks/useCart';
import { useTelegram } from '../hooks/useTelegram';
import { useEffect } from 'react';

interface CartPageProps {
  onBack: () => void;
  onCheckout: () => void;
}

export const CartPage = ({ onBack, onCheckout }: CartPageProps) => {
  const { t } = useTranslation();
  const { items, updateQuantity, removeItem, total, itemCount } = useCart();
  const { webApp } = useTelegram();

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

  const handleRemove = (productId: string) => {
    webApp?.showConfirm('Удалить товар из корзины?', (confirmed) => {
      if (confirmed) {
        removeItem(productId);
        webApp?.HapticFeedback.notificationOccurred('success');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('store.cart')} {itemCount > 0 && `(${itemCount})`}
          </h1>
        </div>
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t('store.emptyCart')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.productId} className="p-4">
                <div className="flex gap-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 dark:text-gray-500 text-2xl">📦</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                      {item.name}
                    </h3>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {item.price.toLocaleString()} ₽
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4 text-gray-900 dark:text-white" />
                        </button>
                        <span className="font-medium text-gray-900 dark:text-white min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-900 dark:text-white" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="ml-auto p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('store.total')}:</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {total.toLocaleString()} ₽
            </span>
          </div>
          <Button onClick={onCheckout} fullWidth size="lg">
            {t('store.checkout')}
          </Button>
        </div>
      )}
    </div>
  );
};
