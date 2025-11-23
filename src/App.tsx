import { useState, useEffect } from 'react';
import { StoreProvider } from './contexts/StoreContext';
import { useTelegram } from './hooks/useTelegram';
import { useTranslation } from './hooks/useTranslation';
import { supabase } from './lib/supabase';
import { Loading } from './components/Loading';
import { BottomNav } from './components/BottomNav';
import { StorePage } from './pages/StorePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { CategoriesManagerNew } from './pages/CategoriesManagerNew';
import { ProductsManagerEnhanced } from './pages/ProductsManagerEnhanced';
import { OrdersManagerEnhanced } from './pages/OrdersManagerEnhanced';
import { PaymentMethodsManager } from './pages/PaymentMethodsManager';
import { DeliveryMethodsManager } from './pages/DeliveryMethodsManager';
import { StoreSettings } from './pages/StoreSettings';
import { TelegramManager } from './pages/TelegramManager';
import { CategoryTypeSelector } from './pages/CategoryTypeSelector';
import { CategoriesManagerByType } from './pages/CategoriesManagerByType';

type Page =
  | 'store'
  | 'products'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'search'
  | 'profile'
  | 'admin-dashboard'
  | 'admin-categories-selector'
  | 'admin-products-selector'
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
  const [storeType, setStoreType] = useState<'digital' | 'physical'>('digital');
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>('');
  const [showCategoryTypesList, setShowCategoryTypesList] = useState(false);
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
        setStoreType(store.store_type || 'digital');

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
      try {
        const { data: anyStore } = await supabase
          .from('stores')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (anyStore) {
          setStoreId(anyStore.id);
        }
      } catch (fallbackError) {
        console.error('Fallback store fetch error:', fallbackError);
      }
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

  const handleBottomNavClick = (page: 'home' | 'catalog' | 'search' | 'cart' | 'profile') => {
    if (page === 'catalog' || page === 'home') {
      setCurrentPage('store');
    } else if (page === 'search') {
      setCurrentPage('search');
    } else if (page === 'cart') {
      setCurrentPage('cart');
    } else if (page === 'profile') {
      setCurrentPage('profile');
    }
  };

  const getCurrentBottomNavPage = (): 'home' | 'catalog' | 'search' | 'cart' | 'profile' => {
    if (currentPage === 'cart') return 'cart';
    if (currentPage === 'search') return 'search';
    if (currentPage === 'profile') return 'profile';
    return 'home';
  };

  const showBottomNav = !currentPage.startsWith('admin') && currentPage !== 'checkout' && currentPage !== 'product-detail';

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

        {currentPage === 'search' && (
          <ProductsPage
            categoryId=""
            onBack={() => setCurrentPage('store')}
            onProductClick={handleProductClick}
          />
        )}

        {currentPage === 'profile' && (
          <ProfilePage
            onNavigateToOrders={() => setCurrentPage('admin-orders')}
            onNavigateToCart={() => setCurrentPage('cart')}
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
                categories: 'admin-categories-selector',
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

        {currentPage === 'admin-categories-selector' && (
          <CategoryTypeSelector
            onBack={() => {
              setCurrentPage('admin-dashboard');
              setShowCategoryTypesList(false);
            }}
            onSelectType={(mainType, subType) => {
              setSelectedCategoryType(subType);
              setShowCategoryTypesList(true);
              setCurrentPage('admin-categories');
            }}
            initialMainType={showCategoryTypesList ? 'digital' : undefined}
          />
        )}

        {currentPage === 'admin-categories' && (
          <CategoriesManagerByType
            storeId={storeId}
            categoryType={selectedCategoryType}
            onBack={() => setCurrentPage('admin-categories-selector')}
          />
        )}

        {currentPage === 'admin-products' && (
          <ProductsManagerEnhanced
            storeId={storeId}
            storeType={storeType}
            onBack={() => setCurrentPage('admin-dashboard')}
          />
        )}

        {currentPage === 'admin-orders' && (
          <OrdersManagerEnhanced
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

        {showBottomNav && (
          <BottomNav
            currentPage={getCurrentBottomNavPage()}
            onNavigate={handleBottomNavClick}
          />
        )}
      </div>
    </StoreProvider>
  );
}

export default App;
