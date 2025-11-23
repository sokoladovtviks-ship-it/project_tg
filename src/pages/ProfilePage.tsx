import { useState, useEffect } from 'react';
import { ShoppingBag, Wallet, Gift, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useTelegram } from '../hooks/useTelegram';

interface UserProfile {
  id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  telegram_photo_url: string | null;
  balance: number;
  bonus_points: number;
}

interface ProfilePageProps {
  onNavigateToOrders: () => void;
  onNavigateToCart: () => void;
}

export const ProfilePage = ({ onNavigateToOrders, onNavigateToCart }: ProfilePageProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useTelegram();

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('telegram_user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            telegram_user_id: user.id,
            telegram_username: user.username || null,
            telegram_photo_url: user.photo_url || null,
          })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Профиль</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            {profile?.telegram_photo_url ? (
              <img
                src={profile.telegram_photo_url}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {user?.first_name?.charAt(0) || user?.username?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {user?.first_name || user?.username || 'Пользователь'}
                {user?.last_name && ` ${user.last_name}`}
              </h2>
              {user?.username && (
                <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ID: {user?.id}</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Баланс</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {profile?.balance || 0} ₽
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Бонусы</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {profile?.bonus_points || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="divide-y divide-gray-200 dark:divide-gray-700">
          <button
            onClick={onNavigateToOrders}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">Мои покупки</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>

          <button
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">Пополнить баланс</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>

          <button
            onClick={onNavigateToCart}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">Моя корзина</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>

          <button
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            disabled
          >
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <span className="font-medium text-gray-400 dark:text-gray-500">Промокоды</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">(в разработке)</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </Card>
      </div>
    </div>
  );
};
