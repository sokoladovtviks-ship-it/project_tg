import { Home, Grid, Search, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../hooks/useCart';

interface BottomNavProps {
  currentPage: 'home' | 'catalog' | 'search' | 'cart' | 'profile';
  onNavigate: (page: 'home' | 'catalog' | 'search' | 'cart' | 'profile') => void;
}

export const BottomNav = ({ currentPage, onNavigate }: BottomNavProps) => {
  const { itemCount } = useCart();

  const navItems = [
    { id: 'home' as const, icon: Home, label: 'Главная' },
    { id: 'catalog' as const, icon: Grid, label: 'Каталог' },
    { id: 'search' as const, icon: Search, label: 'Найти' },
    { id: 'cart' as const, icon: ShoppingCart, label: 'Корзина', badge: itemCount },
    { id: 'profile' as const, icon: User, label: 'Профиль' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-1 px-3 py-1 transition-colors"
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-xs ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
