import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Upload, X, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { Loading } from '../components/Loading';
import { useTelegram } from '../hooks/useTelegram';

type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

interface ProductsManagerByTypeProps {
  storeId: string;
  productType: string;
  onBack: () => void;
}

const TYPE_NAMES: Record<string, string> = {
  accounts: 'Аккаунты',
  subscriptions: 'Подписки',
  game_items: 'Игровые предметы',
  services: 'Услуги',
  other: 'Прочее',
};

export const ProductsManagerByType = ({ storeId, productType, onBack }: ProductsManagerByTypeProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [languageTab, setLanguageTab] = useState<'ru' | 'en'>('ru');
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    price: '',
    currency: 'RUB',
    stockQuantity: '',
    categoryId: '',
    imagesUrls: [] as string[],
    accountLogin: '',
    accountPassword: '',
    accountEmail: '',
    accountEmailPassword: '',
    autoDelivery: true,
    instructionsRu: '',
    instructionsEn: '',
    instructionsImages: [] as string[],
    isActive: true,
  });
  const [imageUrl, setImageUrl] = useState('');
  const [instructionImageUrl, setInstructionImageUrl] = useState('');
  const { webApp } = useTelegram();

  useEffect(() => {
    loadData();
  }, [storeId, productType]);

  const loadData = async () => {
    try {
      const [categoriesResult, productsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('store_id', storeId)
          .eq('category_type', productType)
          .order('order_position'),
        supabase
          .from('products')
          .select('*, categories!inner(category_type)')
          .eq('categories.category_type', productType)
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

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        nameEn: product.name_en || '',
        description: product.description || '',
        descriptionEn: product.description_en || '',
        price: product.price.toString(),
        currency: product.currency,
        stockQuantity: product.stock_quantity.toString(),
        categoryId: product.category_id,
        imagesUrls: product.images_urls || [],
        accountLogin: product.account_login || '',
        accountPassword: product.account_password || '',
        accountEmail: product.account_email || '',
        accountEmailPassword: product.account_email_password || '',
        autoDelivery: product.auto_delivery,
        instructionsRu: product.instructions_ru || '',
        instructionsEn: product.instructions_en || '',
        instructionsImages: product.instructions_images || [],
        isActive: product.is_active,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        nameEn: '',
        description: '',
        descriptionEn: '',
        price: '',
        currency: 'RUB',
        stockQuantity: '',
        categoryId: categories[0]?.id || '',
        imagesUrls: [],
        accountLogin: '',
        accountPassword: '',
        accountEmail: '',
        accountEmailPassword: '',
        autoDelivery: true,
        instructionsRu: '',
        instructionsEn: '',
        instructionsImages: [],
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim() || !formData.categoryId || !formData.price) {
        webApp?.showAlert('Заполните все обязательные поля');
        return;
      }

      const productData = {
        store_id: storeId,
        category_id: formData.categoryId,
        name: formData.name.trim(),
        name_en: formData.nameEn.trim() || null,
        description: formData.description.trim() || null,
        description_en: formData.descriptionEn.trim() || null,
        price: parseFloat(formData.price),
        currency: formData.currency,
        stock_quantity: parseInt(formData.stockQuantity) || 0,
        images_urls: formData.imagesUrls,
        account_login: formData.accountLogin.trim() || null,
        account_password: formData.accountPassword.trim() || null,
        account_email: formData.accountEmail.trim() || null,
        account_email_password: formData.accountEmailPassword.trim() || null,
        auto_delivery: formData.autoDelivery,
        instructions_ru: formData.instructionsRu.trim() || null,
        instructions_en: formData.instructionsEn.trim() || null,
        instructions_images: formData.instructionsImages,
        is_active: formData.isActive,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        webApp?.showAlert('Товар обновлен');
      } else {
        const { error } = await supabase.from('products').insert([productData]);

        if (error) throw error;
        webApp?.showAlert('Товар создан');
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      webApp?.showAlert('Ошибка сохранения товара');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот товар?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;
      webApp?.showAlert('Товар удален');
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      webApp?.showAlert('Ошибка удаления товара');
    }
  };

  const addImage = () => {
    if (imageUrl.trim()) {
      setFormData({
        ...formData,
        imagesUrls: [...formData.imagesUrls, imageUrl.trim()],
      });
      setImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      imagesUrls: formData.imagesUrls.filter((_, i) => i !== index),
    });
  };

  const addInstructionImage = () => {
    if (instructionImageUrl.trim()) {
      setFormData({
        ...formData,
        instructionsImages: [...formData.instructionsImages, instructionImageUrl.trim()],
      });
      setInstructionImageUrl('');
    }
  };

  const removeInstructionImage = (index: number) => {
    setFormData({
      ...formData,
      instructionsImages: formData.instructionsImages.filter((_, i) => i !== index),
    });
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Без категории';
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {TYPE_NAMES[productType] || 'Товары'}
            </h1>
          </div>
          <Button onClick={() => openModal()} size="sm">
            <Plus className="w-4 h-4" />
            Добавить
          </Button>
        </div>
      </div>

      <div className="p-4">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Нет категорий типа "{TYPE_NAMES[productType]}"
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Создайте категорию в разделе "Категории"
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Нет товаров</p>
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
                      <span className="text-3xl">📦</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {getCategoryName(product.category_id)}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {product.price.toLocaleString()} {product.currency}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Остаток: {product.stock_quantity}
                      </span>
                      {!product.is_active && (
                        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                          Неактивен
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(product)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
        title={editingProduct ? 'Редактировать товар' : 'Новый товар'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLanguageTab('ru')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                languageTab === 'ru'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Русский
            </button>
            <button
              onClick={() => setLanguageTab('en')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                languageTab === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              English
            </button>
          </div>

          {languageTab === 'ru' ? (
            <>
              <Input
                label="Название *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите название"
              />
              <Textarea
                label="Описание"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание товара"
                rows={3}
              />
            </>
          ) : (
            <>
              <Input
                label="Name"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Enter name"
              />
              <Textarea
                label="Description"
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                placeholder="Product description"
                rows={3}
              />
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Категория *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Выберите категорию</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Цена *"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Количество"
              type="number"
              value={formData.stockQuantity}
              onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Изображения товара
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL изображения"
              />
              <Button onClick={addImage} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.imagesUrls.length > 0 && (
              <div className="space-y-2">
                {formData.imagesUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <img src={url} alt="" className="w-12 h-12 object-cover rounded" />
                    <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">{url}</span>
                    <button
                      onClick={() => removeImage(index)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Данные аккаунта</h3>
            <div className="space-y-3">
              <Input
                label="Логин"
                value={formData.accountLogin}
                onChange={(e) => setFormData({ ...formData, accountLogin: e.target.value })}
                placeholder="Логин аккаунта"
              />
              <Input
                label="Пароль"
                value={formData.accountPassword}
                onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                placeholder="Пароль аккаунта"
              />
              <Input
                label="Email"
                value={formData.accountEmail}
                onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })}
                placeholder="Email аккаунта"
              />
              <Input
                label="Пароль от Email"
                value={formData.accountEmailPassword}
                onChange={(e) => setFormData({ ...formData, accountEmailPassword: e.target.value })}
                placeholder="Пароль от email"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Инструкции</h3>
            {languageTab === 'ru' ? (
              <Textarea
                label="Инструкции (RU)"
                value={formData.instructionsRu}
                onChange={(e) => setFormData({ ...formData, instructionsRu: e.target.value })}
                placeholder="Инструкция по использованию"
                rows={4}
              />
            ) : (
              <Textarea
                label="Instructions (EN)"
                value={formData.instructionsEn}
                onChange={(e) => setFormData({ ...formData, instructionsEn: e.target.value })}
                placeholder="Usage instructions"
                rows={4}
              />
            )}
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Изображения для инструкций
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={instructionImageUrl}
                  onChange={(e) => setInstructionImageUrl(e.target.value)}
                  placeholder="URL изображения"
                />
                <Button onClick={addInstructionImage} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.instructionsImages.length > 0 && (
                <div className="space-y-2">
                  {formData.instructionsImages.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <img src={url} alt="" className="w-12 h-12 object-cover rounded" />
                      <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">{url}</span>
                      <button
                        onClick={() => removeInstructionImage(index)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoDelivery}
                onChange={(e) => setFormData({ ...formData, autoDelivery: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Автовыдача</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Активен</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              {editingProduct ? 'Сохранить' : 'Создать'}
            </Button>
            <Button onClick={() => setShowModal(false)} variant="secondary" className="flex-1">
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
