import { useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { telegramBot } from '../lib/telegram';

interface TelegramSetupProps {
  onSetupComplete?: () => void;
}

export const TelegramSetup = ({ onSetupComplete }: TelegramSetupProps) => {
  const [webAppUrl, setWebAppUrl] = useState('https://your-domain.com');
  const [loading, setLoading] = useState(false);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleGetBotInfo = async () => {
    setLoading(true);
    try {
      const info = await telegramBot.getBotInfo();
      if (info.ok) {
        setBotInfo(info.result);
        setSetupStatus('success');
      } else {
        setSetupStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setSetupStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupWebApp = async () => {
    if (!webAppUrl.trim()) {
      alert('Введите URL WebApp');
      return;
    }

    setLoading(true);
    try {
      const result = await telegramBot.setWebAppUrl(webAppUrl);
      if (result.success) {
        setSetupStatus('success');
        alert('WebApp успешно настроен!');
        onSetupComplete?.();
      } else {
        setSetupStatus('error');
        alert('Ошибка настройки WebApp');
      }
    } catch (error) {
      console.error('Error:', error);
      setSetupStatus('error');
      alert('Ошибка настройки WebApp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Настройка Telegram бота</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Проверить бота</h3>
            <Button 
              onClick={handleGetBotInfo} 
              loading={loading}
              fullWidth
            >
              Получить информацию о боте
            </Button>
            
            {botInfo && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm">
                  <strong>Бот:</strong> @{botInfo.username}<br/>
                  <strong>Имя:</strong> {botInfo.first_name}
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Настроить WebApp</h3>
            <Input
              label="URL вашего WebApp"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              placeholder="https://your-domain.com"
            />
            <Button 
              onClick={handleSetupWebApp} 
              loading={loading}
              fullWidth
              className="mt-2"
            >
              Настроить WebApp
            </Button>
          </div>

          {setupStatus === 'success' && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ Настройка завершена успешно!
              </p>
            </div>
          )}

          {setupStatus === 'error' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                ❌ Ошибка настройки. Проверьте токен бота.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Инструкция:</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside text-gray-600 dark:text-gray-400">
          <li>Создайте бота через @BotFather в Telegram</li>
          <li>Получите токен бота и добавьте в конфигурацию</li>
          <li>Разместите ваше приложение на публичном домене</li>
          <li>Настройте WebApp URL через эту форму</li>
          <li>Откройте бота в Telegram и нажмите "Открыть магазин"</li>
        </ol>
      </Card>
    </div>
  );
};
