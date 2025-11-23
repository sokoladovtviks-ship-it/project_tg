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

interface ProductsManagerEnhancedProps {
  storeId: string;
  storeType: 'digital' | 'physical';
  onBack: () => void;
}

export const ProductsManagerEnhanced = ({ storeId, storeType, onBack }: ProductsManagerEnhancedProps) => {
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
    productType: '',
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
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingInstructionImage, setUploadingInstructionImage] = useState(false);
  const { webApp } = useTelegram();

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    try {
      const [categoriesResult, productsResult] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeId).is('parent_category_id', null).order('order_position'),
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
    if (!formData.name.trim() || !formData.categoryId) {
      webApp?.showAlert('Заполните обязательные поля (название и категория)');
      return;
    }

    setSubmitting(true);
    try {
      const accountData = formData.accountLogin || formData.accountPassword || formData.accountEmail
        ? {
            login: formData.accountLogin || undefined,
            password: formData.accountPassword || undefined,
            email: formData.accountEmail || undefined,
            email_password: formData.accountEmailPassword || undefined,
          }
        : null;

      const productData: any = {
        name: formData.name,
        name_en: formData.nameEn || null,
        description: formData.description || null,
        description_en: formData.descriptionEn || null,
        price: Number(formData.price) || 0,
        currency: formData.currency,
        stock_quantity: Number(formData.stockQuantity) || 0,
        category_id: formData.categoryId,
        product_type: formData.productType || null,
        images_urls: formData.imagesUrls,
        account_data: accountData,
        auto_delivery: formData.autoDelivery,
        instructions_ru: formData.instructionsRu || null,
        instructions_en: formData.instructionsEn || null,
        instructions_images: formData.instructionsImages,
        is_active: formData.isActive,
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
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      webApp?.showAlert('Ошибка сохранения товара');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      nameEn: '',
      description: '',
      descriptionEn: '',
      price: '',
      currency: 'RUB',
      stockQuantity: '',
      categoryId: '',
      productType: '',
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
    setImageUrl('');
    setInstructionImageUrl('');
    setLanguageTab('ru');
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const accountData = product.account_data as any;
    setFormData({
      name: product.name,
      nameEn: product.name_en || '',
      description: product.description || '',
      descriptionEn: product.description_en || '',
      price: product.price.toString(),
      currency: product.currency,
      stockQuantity: product.stock_quantity.toString(),
      categoryId: product.category_id,
      productType: product.product_type || '',
      imagesUrls: product.images_urls || [],
      accountLogin: accountData?.login || '',
      accountPassword: accountData?.password || '',
      accountEmail: accountData?.email || '',
      accountEmailPassword: accountData?.email_password || '',
      autoDelivery: product.auto_delivery,
      instructionsRu: product.instructions_ru || '',
      instructionsEn: product.instructions_en || '',
      instructionsImages: product.instructions_images || [],
      isActive: product.is_active,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      webApp?.showAlert('Выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      webApp?.showAlert('Размер файла не должен превышать 5 МБ');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}-${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        imagesUrls: [...prev.imagesUrls, publicUrl],
      }));
      webApp?.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error('Error uploading image:', error);
      webApp?.showAlert('Ошибка загрузки изображения');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInstructionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      webApp?.showAlert('Выберите изображение');
      return;
    }

    setUploadingInstructionImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `inst-${storeId}-${Date.now()}.${fileExt}`;
      const filePath = `instruction-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        instructionsImages: [...prev.instructionsImages, publicUrl],
      }));
      webApp?.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error('Error uploading instruction image:', error);
      webApp?.showAlert('Ошибка загрузки изображения');
    } finally {
      setUploadingInstructionImage(false);
    }
  };

  const removeProductImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imagesUrls: prev.imagesUrls.filter((_, i) => i !== index),
    }));
  };

  const removeInstructionImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructionsImages: prev.instructionsImages.filter((_, i) => i !== index),
    }));
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Неизвестная категория';
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Товары</h1>
          </div>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Нет товаров</p>
            <Button onClick={() => setShowModal(true)}>Добавить товар</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {product.images_urls && product.images_urls.length > 0 && (
                      <div className="mb-3">
                        <img
                          src={product.images_urls[0]}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">{product.name}</h3>
                    {product.name_en && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{product.name_en}</p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded">
                        {getCategoryName(product.category_id)}
                      </span>
                      {product.product_type && (
                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded">
                          {product.product_type}
                        </span>
                      )}
                      {product.auto_delivery && (
                        <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded">
                          Автовыдача
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {product.price} {product.currency}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        • В наличии: {product.stock_quantity}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-5 h-5" />
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
        onClose={resetForm}
        title={editingProduct ? 'Редактировать товар' : 'Добавить товар'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Категория *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {storeType === 'digital' && formData.categoryId && (
            <Input
              label="Тип товара"
              value={formData.productType}
              onChange={(e) => setFormData(prev => ({ ...prev, productType: e.target.value }))}
              placeholder="Например: Steam, PlayStation, Xbox"
            />
          )}

          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setLanguageTab('ru')}
              className={`px-4 py-2 font-medium transition-colors ${
                languageTab === 'ru'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Русский
            </button>
            <button
              onClick={() => setLanguageTab('en')}
              className={`px-4 py-2 font-medium transition-colors ${
                languageTab === 'en'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              English
            </button>
          </div>

          {languageTab === 'ru' ? (
            <>
              <Input
                label="Название товара *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Введите название"
              />
              <Textarea
                label="Описание"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Опишите товар"
                rows={3}
              />
            </>
          ) : (
            <>
              <Input
                label="Product name"
                value={formData.nameEn}
                onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="Enter name"
              />
              <Textarea
                label="Description"
                value={formData.descriptionEn}
                onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                placeholder="Describe the product"
                rows={3}
              />
            </>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Цена *"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Валюта
              </label>
              <button
                onClick={() => setFormData(prev => ({ ...prev, currency: prev.currency === 'RUB' ? 'USD' : 'RUB' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
              >
                {formData.currency}
              </button>
            </div>
          </div>

          <Input
            label="Количество"
            type="number"
            value={formData.stockQuantity}
            onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
            placeholder="0"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Фотографии товара
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {formData.imagesUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img src={url} alt={`Product ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => removeProductImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
                {uploadingImage ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Загрузка...</p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">+ Добавить фото</p>
                )}
              </div>
            </label>
          </div>

          {storeType === 'digital' && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Данные аккаунта</h3>
                <div className="space-y-3">
                  <Input
                    label="Логин"
                    value={formData.accountLogin}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountLogin: e.target.value }))}
                    placeholder="Логин аккаунта"
                  />
                  <Input
                    label="Пароль"
                    type="password"
                    value={formData.accountPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountPassword: e.target.value }))}
                    placeholder="Пароль аккаунта"
                  />
                  <Input
                    label="Email (необязательно)"
                    type="email"
                    value={formData.accountEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountEmail: e.target.value }))}
                    placeholder="Email аккаунта"
                  />
                  <Input
                    label="Пароль от Email (необязательно)"
                    type="password"
                    value={formData.accountEmailPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountEmailPassword: e.target.value }))}
                    placeholder="Пароль от email"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoDelivery"
                  checked={formData.autoDelivery}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoDelivery: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="autoDelivery" className="text-sm text-gray-700 dark:text-gray-300">
                  Автоматическая выдача (без подтверждения админа)
                </label>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Инструкции</h3>

                {languageTab === 'ru' ? (
                  <Textarea
                    label="Инструкции (русский)"
                    value={formData.instructionsRu}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructionsRu: e.target.value }))}
                    placeholder="Инструкции для покупателя"
                    rows={4}
                  />
                ) : (
                  <Textarea
                    label="Instructions (English)"
                    value={formData.instructionsEn}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructionsEn: e.target.value }))}
                    placeholder="Instructions for buyer"
                    rows={4}
                  />
                )}

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Изображения к инструкциям
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {formData.instructionsImages.map((url, index) => (
                      <div key={index} className="relative">
                        <img src={url} alt={`Instruction ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          onClick={() => removeInstructionImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInstructionImageUpload}
                      className="hidden"
                      disabled={uploadingInstructionImage}
                    />
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
                      {uploadingInstructionImage ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Загрузка...</p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">+ Добавить изображение</p>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" fullWidth onClick={resetForm}>
              Отмена
            </Button>
            <Button fullWidth onClick={handleSubmit} loading={submitting}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
