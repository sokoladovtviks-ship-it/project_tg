import { useState } from 'react';
import { ArrowLeft, Package, Store, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useTelegram } from '../hooks/useTelegram';

const DIGITAL_TYPES = [
  { id: 'accounts', name: 'Аккаунты', icon: '👤', description: 'Игровые и сервисные аккаунты' },
  { id: 'subscriptions', name: 'Подписки', icon: '⭐', description: 'Подписки на сервисы' },
  { id: 'game_items', name: 'Игровые предметы', icon: '🎮', description: 'Внутриигровые предметы' },
  { id: 'services', name: 'Услуги', icon: '🛠️', description: 'Цифровые услуги' },
  { id: 'other', name: 'Прочее', icon: '📦', description: 'Другие цифровые товары' },
];

interface CategoryTypeSelectorProps {
  onBack: () => void;
  onSelectType: (mainType: 'digital' | 'physical', subType: string) => void;
}

export const CategoryTypeSelector = ({ onBack, onSelectType }: CategoryTypeSelectorProps) => {
  const [selectedMainType, setSelectedMainType] = useState<'digital' | 'physical' | null>(null);
  const { webApp } = useTelegram();

  const handleMainTypeSelect = (type: 'digital' | 'physical') => {
    if (type === 'physical') {
      webApp?.showAlert('Физические категории находятся в разработке');
      return;
    }
    setSelectedMainType(type);
  };

  const handleSubTypeSelect = (subType: string) => {
    if (selectedMainType) {
      onSelectType(selectedMainType, subType);
    }
  };

  const handleBackClick = () => {
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={handleBackClick}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {selectedMainType ? 'Выберите тип категории' : 'Категории'}
          </h1>
        </div>
      </div>

      <div className="p-4">
        {!selectedMainType ? (
          <div className="space-y-3">
            <Card
              hover
              onClick={() => handleMainTypeSelect('digital')}
              className="p-6 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Цифровая категория
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Аккаунты, подписки, игровые предметы
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </div>
            </Card>

            <Card
              hover
              onClick={() => handleMainTypeSelect('physical')}
              className="p-6 cursor-pointer opacity-60"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Store className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Физическая категория
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      В разработке
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Выберите тип категории для управления
            </p>
            {DIGITAL_TYPES.map((type) => (
              <Card
                key={type.id}
                hover
                onClick={() => handleSubTypeSelect(type.id)}
                className="p-5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{type.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5">
                        {type.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
