import { useState, useEffect } from 'react';
import { StoreProvider } from './contexts/StoreContext';
import { useTelegram } from './hooks/useTelegram';
import { useTranslation } from './hooks/useTranslation';
import { supabase } from './lib/supabase';
import { Loading } from './components/Loading';
import { StorePage } from './pages/StorePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CategoriesManager } from './pages/admin/CategoriesManager';
import { ProductsManager } from './pages/admin/ProductsManager';
import { OrdersManager } from './pages/admin/OrdersManager';
import { PaymentMethodsManager } from './pages/admin/PaymentMethodsManager';
import { DeliveryMethodsManager } from './pages/admin/DeliveryMethodsManager';
import { StoreSettings } from './pages/admin/StoreSettings';
import { TelegramManager } from './pages/admin/TelegramManager';

type Page =
  | 'store'
  | 'products'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'admin-dashboard'
  | 'admin-categories'
  | 'admin-products'
  | 'admin-orders'
  | 'admin-payments'
  | 'admin-deliveries'
  | 'admin-settings'
  | 'admin-telegram';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('store');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, webApp } = useTelegram();
  const { t } = useTranslation();

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (storeError) {
        console.error('Store fetch error:', storeError);
        throw storeError;
      }

      if (!store) {
        const { data: newStore, error: createError } = await supabase
          .from('stores')
          .insert({
            name: 'Мой магазин',
            description: 'Добро пожаловать в наш интернет магазин',
            currency: 'RUB',
            language: 'ru',
          })
          .select()
          .single();

        if (createError) {
          console.error('Store create error:', createError);
          throw createError;
        }

        setStoreId(newStore.id);

        if (user?.id) {
          const { error: adminError } = await supabase.from('admins').insert({
            store_id: newStore.id,
            telegram_user_id: user.id,
            telegram_username: user.username || '',
            role: 'owner',
          });

          if (adminError) {
            console.error('Admin create error:', adminError);
          } else {
            setIsAdmin(true);
          }
        }
      } else {
        setStoreId(store.id);

        if (user?.id) {
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('store_id', store.id)
            .eq('telegram_user_id', user.id)
            .maybeSingle();

          if (adminError) {
            console.error('Admin fetch error:', adminError);
          }

          setIsAdmin(!!adminData);
        } else {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      setStoreId('48056e61-c535-4525-a280-cd18ab4cbf65');
      setIsAdmin(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setCurrentPage('products');
  };

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentPage('product-detail');
  };

  const handleOrderSuccess = (orderNumber: string) => {
    webApp?.showAlert(`${t('checkout.orderSuccess')}!\n${t('checkout.orderNumber')}: ${orderNumber}`);
    setCurrentPage('store');
  };

  if (loading || !storeId) {
    return <Loading />;
  }

  return (
    <StoreProvider>
      <div className="min-h-screen">
        {currentPage === 'store' && (
          <StorePage
            storeId={storeId}
            onCategoryClick={handleCategoryClick}
            onCartClick={() => setCurrentPage('cart')}
            onAdminClick={() => setCurrentPage('admin-dashboard')}
            isAdmin={isAdmin}
          />
        )}

        {currentPage === 'products' && (
          <ProductsPage
            categoryId={selectedCategoryId}
            onBack={() => setCurrentPage('store')}
            onProductClick={handleProductClick}
          />
        )}

        {currentPage === 'product-detail' && (
          <ProductDetailPage
            productId={selectedProductId}
            onBack={() => setCurrentPage('products')}
          />
        )}

        {currentPage === 'cart' && (
          <CartPage
            onBack={() => setCurrentPage('store')}
            onCheckout={() => setCurrentPage('checkout')}
          />
        )}

        {currentPage === 'checkout' && (
          <CheckoutPage
            storeId={storeId}
            onBack={() => setCurrentPage('cart')}
            onSuccess={handleOrderSuccess}
          />
        )}

        {currentPage === 'admin-dashboard' && (
          <AdminDashboard
            storeId={storeId}
            onNavigate={(page) => {
              const pageMap: Record<string, Page> = {
                categories: 'admin-categories',
                products: 'admin-products',
                orders: 'admin-orders',
                payments: 'admin-payments',
                deliveries: 'admin-deliveries',
                telegram: 'admin-telegram',
                settings: 'admin-settings',
              };
              setCurrentPage(pageMap[page] || 'admin-dashboard');
            }}
            onBackToStore={() => setCurrentPage('store')}
          />
        )}

        {currentPage === 'admin-categories' && (
          <CategoriesManager
            storeId={storeId}
            onBack={() => setCurrentPage('admin-dashboard')}
          />
        )}

        {currentPage === 'admin-products' && (
          <ProductsManager
            storeId={storeId}
            onBack={() => setCurrentPage('admin-dashboard')}
          />
        )}

        {currentPage === 'admin-orders' && (
          <OrdersManager
            storeId={storeId}
            onBack={() => setCurrentPage('admin-dashboard')}
          />
        )}

        {currentPage === 'admin-payments' && (
          <PaymentMethodsManager
            storeId={storeId}
            onBack={() => setCurrentPage('admin-dashboard')}
          />
        )}

        {currentPage === 'admin-deliveries' && (
          <DeliveryMethodsManager
            storeId={storeId}
            onBack={() => setCurrentPage('admin-dashboard')}
          />
        )}

        {currentPage === 'admin-settings' && (
          <StoreSettings
            storeId={storeId}
            onBack={() => setCurrentPage('admin-dashboard')}
          />
        )}

        {currentPage === 'admin-telegram' && (
          <TelegramManager
            storeId={storeId}
            onBack={() => setCurrentPage('admin-dashboard')}
          />
        )}
      </div>
    </StoreProvider>
  );
}

export default App;
