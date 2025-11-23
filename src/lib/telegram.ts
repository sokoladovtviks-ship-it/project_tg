export class TelegramBot {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken?: string) {
    this.botToken = botToken || import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  // Установить WebApp URL для бота
  async setWebAppUrl(webAppUrl: string) {
    try {
      const response = await fetch(`${this.baseUrl}/setMyCommands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commands: [
            {
              command: 'start',
              description: 'Открыть магазин'
            },
            {
              command: 'admin',
              description: 'Админ панель'
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Установить меню кнопку для WebApp
      const menuResponse = await fetch(`${this.baseUrl}/setChatMenuButton`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: 'Открыть магазин',
            web_app: {
              url: webAppUrl
            }
          }
        })
      });

      if (!menuResponse.ok) {
        throw new Error(`HTTP error! status: ${menuResponse.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error setting WebApp URL:', error);
      return { success: false, error };
    }
  }

  // Получить информацию о боте
  async getBotInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting bot info:', error);
      return { success: false, error };
    }
  }

  // Отправить сообщение
  async sendMessage(chatId: string | number, text: string, options?: any) {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error };
    }
  }
}

export const telegramBot = new TelegramBot();
