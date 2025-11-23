import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { Loading } from '../components/Loading';
import { useTranslation } from '../hooks/useTranslation';
import { useTelegram } from '../hooks/useTelegram';

type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

interface ProductsManagerProps {
  storeId: string;
  onBack: () => void;
}

export const ProductsManager = ({ storeId, onBack }: ProductsManagerProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    category_id: '',
    images_urls: [] as string[],
    is_active: true,
  });
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const { webApp } = useTelegram();

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      const [categoriesResult, productsResult] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeId).order('order_position'),
        supabase
          .from('products')
          .select('*, categories!inner(store_id)')
          .eq('categories.store_id', storeId)
          .order('created_at', { ascending: false }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (productsResult.error) throw productsResult.error;

      setCategories(categoriesResult.data || []);
      setProducts(productsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      webApp?.showAlert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.category_id) {
      webApp?.showAlert('Заполните все обязательные поля');
      return;
    }

    setSubmitting(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price) || 0,
        stock_quantity: Number(formData.stock_quantity) || 0,
        category_id: formData.category_id,
        images_urls: formData.images_urls,
        is_active: formData.is_active,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
      }

      webApp?.HapticFeedback.notificationOccurred('success');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      webApp?.showAlert('Ошибка сохранения товара');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      category_id: product.category_id,
      images_urls: product.images_urls || [],
      is_active: product.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = (product: Product) => {
    webApp?.showConfirm('Удалить товар?', async (confirmed) => {
      if (confirmed) {
        try {
          const { error } = await supabase.from('products').delete().eq('id', product.id);
          if (error) throw error;
          webApp?.HapticFeedback.notificationOccurred('success');
          loadData();
        } catch (error) {
          console.error('Error deleting product:', error);
          webApp?.showAlert('Ошибка удаления товара');
        }
      }
    });
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling product:', error);
      webApp?.showAlert('Ошибка изменения статуса');
    }
  };

  const addImage = () => {
    if (imageUrl.trim()) {
      setFormData({ ...formData, images_urls: [...formData.images_urls, imageUrl.trim()] });
      setImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images_urls: formData.images_urls.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      stock_quantity: '',
      category_id: categories[0]?.id || '',
      images_urls: [],
      is_active: true,
    });
    setImageUrl('');
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || '';
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.products')}</h1>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('productAdmin.noProducts')}</p>
            <Button onClick={() => setShowModal(true)}>{t('productAdmin.add')}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex gap-3">
                  {product.images_urls && product.images_urls.length > 0 ? (
                    <img
                      src={product.images_urls[0]}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">📦</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">{product.name}</h3>
                      <button
                        onClick={() => toggleActive(product)}
                        className={`ml-2 relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                          product.is_active
                            ? 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={product.is_active ? 'Товар активен' : 'Товар не активен'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            product.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{getCategoryName(product.category_id)}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {Number(product.price).toLocaleString()} ₽
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? t('productAdmin.edit') : t('productAdmin.add')}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label={t('productAdmin.name')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Введите название товара"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('productAdmin.category')}
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label={t('productAdmin.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Описание товара"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('productAdmin.price')}
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
            />
            <Input
              label={t('productAdmin.stock')}
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('productAdmin.images')}
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL изображения"
                className="flex-1"
              />
              <Button onClick={addImage} size="sm">
                {t('common.add')}
              </Button>
            </div>
            {formData.images_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {formData.images_urls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('productAdmin.active')}</span>
          </label>

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
