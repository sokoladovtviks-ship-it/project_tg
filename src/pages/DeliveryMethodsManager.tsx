import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Loading } from '../../components/Loading';
import { useTranslation } from '../../hooks/useTranslation';
import { useTelegram } from '../../hooks/useTelegram';

type DeliveryMethod = Database['public']['Tables']['delivery_methods']['Row'];

const defaultDeliveryMethods = [
  { name: 'Самовывоз', type: 'pickup', icon: '🏪', price: 0 },
  { name: 'Курьерская доставка', type: 'courier', icon: '🚴', price: 0 },
  { name: 'Почта/Транспортная компания', type: 'shipping', icon: '📦', price: 0 },
];

interface DeliveryMethodsManagerProps {
  storeId: string;
  onBack: () => void;
}

export const DeliveryMethodsManager = ({ storeId, onBack }: DeliveryMethodsManagerProps) => {
  const [methods, setMethods] = useState<DeliveryMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<DeliveryMethod | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();
  const { webApp } = useTelegram();

  useEffect(() => {
    loadMethods();
  }, [storeId]);

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

  const loadMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .eq('store_id', storeId)
        .order('order_position');

      if (error) throw error;

      if (!data || data.length === 0) {
        await initializeDefaultMethods();
      } else {
        setMethods(data);
      }
    } catch (error) {
      console.error('Error loading delivery methods:', error);
      webApp?.showAlert('Ошибка загрузки способов доставки');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultMethods = async () => {
    try {
      const methodsToInsert = defaultDeliveryMethods.map((method, index) => ({
        store_id: storeId,
        name: method.name,
        type: method.type,
        price: method.price,
        is_active: true,
        order_position: index,
      }));

      const { data, error } = await supabase
        .from('delivery_methods')
        .insert(methodsToInsert)
        .select();

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error('Error initializing delivery methods:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      webApp?.showAlert('Введите название способа доставки');
      return;
    }

    setSubmitting(true);
    try {
      const methodData = {
        name: formData.name,
        price: Number(formData.price) || 0,
      };

      const { error } = await supabase
        .from('delivery_methods')
        .update(methodData)
        .eq('id', editingMethod!.id);

      if (error) throw error;

      webApp?.HapticFeedback.notificationOccurred('success');
      setShowModal(false);
      setEditingMethod(null);
      setFormData({ name: '', price: '' });
      loadMethods();
    } catch (error) {
      console.error('Error saving delivery method:', error);
      webApp?.showAlert('Ошибка сохранения способа доставки');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelection = (methodId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(methodId)) {
        newSet.delete(methodId);
      } else {
        newSet.add(methodId);
      }
      return newSet;
    });
  };

  const handleEdit = (method: DeliveryMethod) => {
    setEditingMethod(method);
    setFormData({ name: method.name, price: method.price.toString() });
    setShowModal(true);
  };

  const getTypeIcon = (type: string) => {
    return defaultDeliveryMethods.find((t) => t.type === type)?.icon || '🚚';
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.delivery')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {methods.map((method) => {
          const isSelected = selectedIds.has(method.id);
          return (
            <Card
              key={method.id}
              className={`transition-all duration-200 ${
                isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleSelection(method.id)}
                  className="flex-shrink-0 relative"
                >
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 scale-110'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-white animate-in zoom-in duration-200" />
                    )}
                  </div>
                </button>

                <div
                  className="flex-1 flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleSelection(method.id)}
                >
                  <div className="text-2xl">{getTypeIcon(method.type)}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{method.name}</h3>
                    {Number(method.price) > 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {Number(method.price).toLocaleString()} ₽
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(method);
                  }}
                  className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Редактировать способ доставки"
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Например: Доставка курьером"
          />
          <Input
            label="Стоимость доставки (₽)"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0"
          />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={() => setShowModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button fullWidth onClick={handleSubmit} loading={submitting}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
