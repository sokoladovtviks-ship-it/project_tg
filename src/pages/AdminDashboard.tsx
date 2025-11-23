import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  CreditCard,
  Truck,
  Settings,
  LayoutGrid,
  Sun,
  Moon,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useTranslation } from '../hooks/useTranslation';
import { useTelegram } from '../hooks/useTelegram';
import { useTheme } from '../contexts/ThemeContext';

interface AdminDashboardProps {
  storeId: string;
  onNavigate: (page: 'categories' | 'products' | 'orders' | 'payments' | 'deliveries' | 'settings' | 'telegram') => void;
  onBackToStore: () => void;
}

export const AdminDashboard = ({ storeId, onNavigate, onBackToStore }: AdminDashboardProps) => {
  const [stats, setStats] = useState({
    categories: 0,
    products: 0,
    orders: 0,
    newOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    loadStats();
  }, [storeId]);

  const loadStats = async () => {
    try {
      const [categoriesResult, productsResult, ordersResult, newOrdersResult] = await Promise.all([
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', 'any'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('status', 'new'),
      ]);

      setStats({
        categories: categoriesResult.count || 0,
        products: productsResult.count || 0,
        orders: ordersResult.count || 0,
        newOrders: newOrdersResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: LayoutGrid, label: t('admin.categories'), value: stats.categories, page: 'categories' as const },
    { icon: Package, label: t('admin.products'), value: stats.products, page: 'products' as const },
    { icon: ShoppingBag, label: t('admin.orders'), value: stats.orders, badge: stats.newOrders, page: 'orders' as const },
    { icon: CreditCard, label: t('admin.payments'), page: 'payments' as const },
    { icon: Truck, label: t('admin.delivery'), page: 'deliveries' as const },
    { icon: MessageCircle, label: 'Telegram бот', page: 'telegram' as const },
    { icon: Settings, label: t('admin.storeSettings'), page: 'settings' as const },
  ];

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBackToStore} className="p-2 -ml-2 hover:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">{t('admin.panel')}</h1>
              <p className="text-sm text-blue-100 dark:text-blue-200">{t('admin.dashboard')}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {menuItems.map((item) => (
          <Card
            key={item.page}
            hover
            onClick={() => onNavigate(item.page)}
            className="p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{item.label}</h3>
                  {item.value !== undefined && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.value} шт.</p>
                  )}
                </div>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <div className="bg-red-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
                  {item.badge}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
