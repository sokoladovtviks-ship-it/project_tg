import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Loading } from '../../components/Loading';
import { useTranslation } from '../../hooks/useTranslation';
import { useTelegram } from '../../hooks/useTelegram';

type Order = Database['public']['Tables']['orders']['Row'];

interface OrdersManagerProps {
  storeId: string;
  onBack: () => void;
}

export const OrdersManager = ({ storeId, onBack }: OrdersManagerProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { t } = useTranslation();
  const { webApp } = useTelegram();

  useEffect(() => {
    loadOrders();
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

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      webApp?.showAlert('Ошибка загрузки заказов');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);

      if (error) throw error;
      webApp?.HapticFeedback.notificationOccurred('success');
      loadOrders();
      setShowModal(false);
    } catch (error) {
      console.error('Error updating order:', error);
      webApp?.showAlert('Ошибка обновления заказа');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      delivering: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.orders')}</h1>
        </div>
      </div>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">{t('orderAdmin.noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card
                key={order.id}
                hover
                onClick={() => {
                  setSelectedOrder(order);
                  setShowModal(true);
                }}
                className="p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-sm text-gray-600 dark:text-gray-400">#{order.order_number}</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {order.telegram_first_name} {order.telegram_last_name}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {t(`order.status.${order.status}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{formatDate(order.created_at)}</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {Number(order.total_amount).toLocaleString()} ₽
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('orderAdmin.details')} size="lg">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('checkout.orderNumber')}</p>
              <p className="font-mono font-semibold">#{selectedOrder.order_number}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">{t('orderAdmin.customer')}</p>
              <p className="font-medium">
                {selectedOrder.telegram_first_name} {selectedOrder.telegram_last_name}
              </p>
              {selectedOrder.telegram_username && (
                <p className="text-sm text-gray-600 dark:text-gray-400">@{selectedOrder.telegram_username}</p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.customer_phone}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">{t('orderAdmin.items')}</p>
              <div className="space-y-2">
                {(selectedOrder.items as any[]).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">{(item.price * item.quantity).toLocaleString()} ₽</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">{t('checkout.deliveryMethod')}</p>
              <p className="font-medium">{selectedOrder.delivery_method}</p>
              {selectedOrder.delivery_address && (
                <p className="text-sm text-gray-600 mt-1">{selectedOrder.delivery_address}</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">{t('checkout.paymentMethod')}</p>
              <p className="font-medium">{selectedOrder.payment_method}</p>
            </div>

            {selectedOrder.customer_notes && (
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('orderAdmin.notes')}</p>
                <p className="text-sm">{selectedOrder.customer_notes}</p>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>{t('store.total')}:</span>
                <span>{Number(selectedOrder.total_amount).toLocaleString()} ₽</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">{t('orderAdmin.updateStatus')}</p>
              <div className="grid grid-cols-2 gap-2">
                {['new', 'processing', 'delivering', 'completed', 'cancelled'].map((status) => (
                  <Button
                    key={status}
                    variant={selectedOrder.status === status ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => updateOrderStatus(selectedOrder.id, status)}
                  >
                    {t(`order.status.${status}`)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
