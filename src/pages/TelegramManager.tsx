import { ArrowLeft } from 'lucide-react';
import { TelegramSetup } from '../components/TelegramSetup';
import { useTelegram } from '../hooks/useTelegram';
import { useEffect } from 'react';

interface TelegramManagerProps {
  storeId: string;
  onBack: () => void;
}

export const TelegramManager = ({ storeId, onBack }: TelegramManagerProps) => {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Настройка Telegram бота</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        <TelegramSetup onSetupComplete={() => {
          console.log('Telegram setup completed');
        }} />
      </div>
    </div>
  );
};
