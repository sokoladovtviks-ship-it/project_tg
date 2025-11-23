import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Textarea } from '../components/Textarea';
import { Loading } from '../components/Loading';
import { useTelegram } from '../hooks/useTelegram';

type Order = Database['public']['Tables']['orders']['Row'];

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  auto_delivery: boolean;
}

interface OrdersManagerEnhancedProps {
  storeId: string;
  onBack: () => void;
}

export const OrdersManagerEnhanced = ({ storeId, onBack }: OrdersManagerEnhancedProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { webApp } = useTelegram();

  useEffect(() => {
    loadOrders();
  }, [storeId]);

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

  const handleConfirmOrder = async (orderId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          admin_notes: 'Заказ подтвержден администратором'
        })
        .eq('id', orderId);

      if (error) throw error;
      webApp?.HapticFeedback.notificationOccurred('success');
      webApp?.showAlert('Заказ подтвержден');
      loadOrders();
      setShowModal(false);
    } catch (error) {
      console.error('Error confirming order:', error);
      webApp?.showAlert('Ошибка подтверждения заказа');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) {
      webApp?.showAlert('Укажите причину отмены');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          admin_notes: `Отменен: ${cancelReason}`
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;
      webApp?.HapticFeedback.notificationOccurred('success');
      webApp?.showAlert('Заказ отменен');
      loadOrders();
      setShowModal(false);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling order:', error);
      webApp?.showAlert('Ошибка отмены заказа');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedOrder || !messageText.trim()) {
      webApp?.showAlert('Введите сообщение');
      return;
    }

    setSubmitting(true);
    try {
      const currentNotes = selectedOrder.admin_notes || '';
      const newNotes = currentNotes
        ? `${currentNotes}\n\nСообщение от админа: ${messageText}`
        : `Сообщение от админа: ${messageText}`;

      const { error } = await supabase
        .from('orders')
        .update({ admin_notes: newNotes })
        .eq('id', selectedOrder.id);

      if (error) throw error;
      webApp?.HapticFeedback.notificationOccurred('success');
      webApp?.showAlert('Сообщение отправлено');
      loadOrders();
      setShowMessageModal(false);
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      webApp?.showAlert('Ошибка отправки сообщения');
    } finally {
      setSubmitting(false);
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
      new: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      processing: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      delivering: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return colors[status] || colors.new;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      new: 'Новый',
      processing: 'В обработке',
      delivering: 'Доставляется',
      completed: 'Выполнен',
      cancelled: 'Отменен',
    };
    return texts[status] || status;
  };

  const needsConfirmation = (order: Order) => {
    const items = (order.items as any) || [];
    return items.some((item: any) => !item.auto_delivery);
  };

  const pendingOrders = orders.filter(o => o.status === 'new' && needsConfirmation(o));

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Заказы</h1>
          </div>
          {pendingOrders.length > 0 && (
            <span className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
              {pendingOrders.length} ожидает
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Нет заказов</p>
          </div>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  Требуют подтверждения
                </h2>
                <div className="space-y-3">
                  {pendingOrders.map((order) => (
                    <Card key={order.id} className="p-4 border-2 border-orange-400 dark:border-orange-600">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                              #{order.order_number}
                            </span>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.status)}`}>
                              Ожидает подтверждения
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Покупатель: {order.telegram_username || 'Неизвестен'}
                          </p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                            {order.total_amount} ₽
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          fullWidth
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Подробнее
                        </Button>
                        <Button
                          size="sm"
                          fullWidth
                          onClick={() => handleConfirmOrder(order.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Подтвердить
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Все заказы</h2>
            <div className="space-y-3">
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowModal(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          #{order.order_number}
                        </span>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Покупатель: {order.telegram_username || 'Неизвестен'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {new Date(order.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {order.total_amount} ₽
                      </p>
                      {order.payment_method && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {order.payment_method}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedOrder(null);
        }}
        title={`Заказ #${selectedOrder?.order_number}`}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Статус
              </label>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${getStatusColor(selectedOrder.status)}`}>
                {getStatusText(selectedOrder.status)}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Покупатель
              </label>
              <p className="text-gray-900 dark:text-white">
                {selectedOrder.telegram_username || 'Неизвестен'}
              </p>
              {selectedOrder.telegram_first_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedOrder.telegram_first_name} {selectedOrder.telegram_last_name || ''}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Товары
              </label>
              <div className="space-y-2">
                {((selectedOrder.items as any) || []).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                      {!item.auto_delivery && (
                        <span className="text-xs text-orange-600 dark:text-orange-400">
                          Требует подтверждения
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.quantity} x {item.price} ₽
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Итого
              </label>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedOrder.total_amount} ₽
              </p>
            </div>

            {selectedOrder.delivery_address && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Адрес доставки
                </label>
                <p className="text-gray-900 dark:text-white">{selectedOrder.delivery_address}</p>
              </div>
            )}

            {selectedOrder.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Телефон
                </label>
                <p className="text-gray-900 dark:text-white">{selectedOrder.phone}</p>
              </div>
            )}

            {selectedOrder.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Комментарий покупателя
                </label>
                <p className="text-gray-900 dark:text-white">{selectedOrder.notes}</p>
              </div>
            )}

            {selectedOrder.admin_notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Заметки админа
                </label>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedOrder.admin_notes}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {selectedOrder.status === 'new' && needsConfirmation(selectedOrder) && (
                <>
                  <Button
                    fullWidth
                    onClick={() => handleConfirmOrder(selectedOrder.id)}
                    loading={submitting}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Подтвердить заказ
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowCancelModal(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Отменить заказ
                  </Button>
                </>
              )}

              {selectedOrder.status === 'new' && !needsConfirmation(selectedOrder) && (
                <Button
                  fullWidth
                  onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                >
                  Перевести в обработку
                </Button>
              )}

              {selectedOrder.status === 'processing' && (
                <Button
                  fullWidth
                  onClick={() => updateOrderStatus(selectedOrder.id, 'delivering')}
                >
                  Отправлен на доставку
                </Button>
              )}

              {selectedOrder.status === 'delivering' && (
                <Button
                  fullWidth
                  onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                >
                  Завершить заказ
                </Button>
              )}

              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowMessageModal(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Отправить сообщение
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancelReason('');
        }}
        title="Отменить заказ"
      >
        <div className="space-y-4">
          <Textarea
            label="Причина отмены"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Укажите причину отмены заказа"
            rows={4}
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}
            >
              Отмена
            </Button>
            <Button
              fullWidth
              onClick={handleCancelOrder}
              loading={submitting}
            >
              Отменить заказ
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showMessageModal}
        onClose={() => {
          setShowMessageModal(false);
          setMessageText('');
        }}
        title="Отправить сообщение"
      >
        <div className="space-y-4">
          <Textarea
            label="Сообщение покупателю"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Введите сообщение"
            rows={4}
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setShowMessageModal(false);
                setMessageText('');
              }}
            >
              Отмена
            </Button>
            <Button
              fullWidth
              onClick={handleSendMessage}
              loading={submitting}
            >
              Отправить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
