import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useTranslation } from '../hooks/useTranslation';
import { useCart } from '../hooks/useCart';
import { useTelegram } from '../hooks/useTelegram';

type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];
type DeliveryMethod = Database['public']['Tables']['delivery_methods']['Row'];

interface CheckoutPageProps {
  storeId: string;
  onBack: () => void;
  onSuccess: (orderNumber: string) => void;
}

export const CheckoutPage = ({ storeId, onBack, onSuccess }: CheckoutPageProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [selectedDelivery, setSelectedDelivery] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const { items, total, clearCart } = useCart();
  const { webApp, user } = useTelegram();

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
      const [paymentsResult, deliveriesResult] = await Promise.all([
        supabase
          .from('payment_methods')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('order_position'),
        supabase
          .from('delivery_methods')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('order_position'),
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (deliveriesResult.error) throw deliveriesResult.error;

      setPaymentMethods(paymentsResult.data || []);
      setDeliveryMethods(deliveriesResult.data || []);

      if (paymentsResult.data?.length) setSelectedPayment(paymentsResult.data[0].id);
      if (deliveriesResult.data?.length) setSelectedDelivery(deliveriesResult.data[0].id);
    } catch (error) {
      console.error('Error loading methods:', error);
      webApp?.showAlert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPayment || !selectedDelivery) {
      webApp?.showAlert('Выберите способ оплаты и доставки');
      return;
    }

    if (!phone) {
      webApp?.showAlert('Укажите номер телефона');
      return;
    }

    setSubmitting(true);

    try {
      const orderNumber = `ORD-${Date.now()}`;
      const deliveryMethod = deliveryMethods.find((m) => m.id === selectedDelivery);
      const deliveryPrice = deliveryMethod?.price || 0;
      const totalAmount = total + Number(deliveryPrice);

      const { error } = await supabase.from('orders').insert({
        order_number: orderNumber,
        store_id: storeId,
        telegram_user_id: user?.id || 0,
        telegram_username: user?.username || '',
        telegram_first_name: user?.first_name || '',
        telegram_last_name: user?.last_name || '',
        items: items,
        total_amount: totalAmount,
        status: 'new',
        payment_method: paymentMethods.find((m) => m.id === selectedPayment)?.name,
        delivery_method: deliveryMethod?.name,
        delivery_address: deliveryAddress,
        customer_phone: phone,
        customer_notes: notes,
      });

      if (error) throw error;

      clearCart();
      webApp?.HapticFeedback.notificationOccurred('success');
      onSuccess(orderNumber);
    } catch (error) {
      console.error('Error creating order:', error);
      webApp?.showAlert('Ошибка при оформлении заказа');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  const selectedDeliveryMethod = deliveryMethods.find((m) => m.id === selectedDelivery);
  const deliveryPrice = Number(selectedDeliveryMethod?.price || 0);
  const totalWithDelivery = total + deliveryPrice;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('checkout.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('checkout.paymentMethod')}</h3>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                style={{
                  borderColor: selectedPayment === method.id ? '#2563eb' : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'),
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method.id}
                  checked={selectedPayment === method.id}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="font-medium text-gray-900 dark:text-white">{method.name}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('checkout.deliveryMethod')}</h3>
          <div className="space-y-2">
            {deliveryMethods.map((method) => (
              <label
                key={method.id}
                className="flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                style={{
                  borderColor: selectedDelivery === method.id ? '#2563eb' : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'),
                }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="delivery"
                    value={method.id}
                    checked={selectedDelivery === method.id}
                    onChange={(e) => setSelectedDelivery(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">{method.name}</span>
                </div>
                {Number(method.price) > 0 && (
                  <span className="text-gray-600 dark:text-gray-400">{Number(method.price).toLocaleString()} ₽</span>
                )}
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <Input
            label={t('checkout.phone')}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (___) ___-__-__"
            required
          />
          <Input
            label={t('checkout.deliveryAddress')}
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Улица, дом, квартира"
          />
          <Textarea
            label={t('checkout.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительная информация"
          />
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Товары:</span>
              <span>{total.toLocaleString()} ₽</span>
            </div>
            {deliveryPrice > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Доставка:</span>
                <span>{deliveryPrice.toLocaleString()} ₽</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-lg font-bold text-gray-900 dark:text-white">
              <span>{t('store.total')}:</span>
              <span>{totalWithDelivery.toLocaleString()} ₽</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
        <Button onClick={handleSubmit} fullWidth size="lg" loading={submitting}>
          {t('checkout.placeOrder')}
        </Button>
      </div>
    </div>
  );
};
