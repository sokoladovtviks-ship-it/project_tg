import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Upload, X, DollarSign, Image as ImageIcon } from 'lucide-react';
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
type ProductAccount = Database['public']['Tables']['product_accounts']['Row'];

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
  const [productAccounts, setProductAccounts] = useState<Record<string, ProductAccount[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  type InstructionBlock = { type: 'text'; content: string } | { type: 'image'; url: string };

  const [languageTab, setLanguageTab] = useState<'ru' | 'en'>('ru');
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    price: '',
    currency: 'RUB',
    categoryId: '',
    imagesUrls: [] as string[],
    autoDelivery: true,
    instructionsRu: '',
    instructionsEn: '',
    instructionsImages: [] as string[],
    isActive: true,
  });
  const [instructionBlocksRu, setInstructionBlocksRu] = useState<InstructionBlock[]>([]);
  const [instructionBlocksEn, setInstructionBlocksEn] = useState<InstructionBlock[]>([]);
  const [currentTextInput, setCurrentTextInput] = useState('');
  const [accountFormData, setAccountFormData] = useState({
    accountLogin: '',
    accountPassword: '',
    accountEmail: '',
    accountEmailPassword: '',
  });
  const [imageUrl, setImageUrl] = useState('');
  const [instructionImageUrl, setInstructionImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showAccountValidation, setShowAccountValidation] = useState(false);
  const [showInstructionsPreview, setShowInstructionsPreview] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const instructionsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { webApp } = useTelegram();

  const getCurrentBlocks = () => languageTab === 'ru' ? instructionBlocksRu : instructionBlocksEn;
  const setCurrentBlocks = (blocks: InstructionBlock[]) => {
    if (languageTab === 'ru') {
      setInstructionBlocksRu(blocks);
    } else {
      setInstructionBlocksEn(blocks);
    }
  };

  const addTextBlock = () => {
    if (!currentTextInput.trim()) return;
    const blocks = getCurrentBlocks();
    setCurrentBlocks([...blocks, { type: 'text', content: currentTextInput }]);
    setCurrentTextInput('');
  };

  const addImageBlock = async (file: File) => {
    const url = await uploadImage(file);
    if (url) {
      const blocks = getCurrentBlocks();
      setCurrentBlocks([...blocks, { type: 'image', url }]);
    }
  };

  const removeBlock = (index: number) => {
    const blocks = getCurrentBlocks();
    setCurrentBlocks(blocks.filter((_, i) => i !== index));
  };

  const moveBlockUp = (index: number) => {
    if (index === 0) return;
    const blocks = getCurrentBlocks();
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    setCurrentBlocks(newBlocks);
  };

  const moveBlockDown = (index: number) => {
    const blocks = getCurrentBlocks();
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    setCurrentBlocks(newBlocks);
  };

  useEffect(() => {
    loadData();
  }, [storeId, productType]);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!showModal) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const activeElement = document.activeElement;
      const isInstructionsTextarea = activeElement === instructionsTextareaRef.current;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            if (isInstructionsTextarea) {
              await addImageBlock(file);
            } else {
              const url = await uploadImage(file);
              if (url) {
                setFormData(prev => ({ ...prev, imagesUrls: [...prev.imagesUrls, url] }));
              }
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [showModal, languageTab, instructionBlocksRu, instructionBlocksEn]);

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

      const productIds = productsResult.data?.map(p => p.id) || [];
      if (productIds.length > 0) {
        const accountsResult = await supabase
          .from('product_accounts')
          .select('*')
          .in('product_id', productIds);

        if (!accountsResult.error && accountsResult.data) {
          const accountsByProduct: Record<string, ProductAccount[]> = {};
          accountsResult.data.forEach(account => {
            if (!accountsByProduct[account.product_id]) {
              accountsByProduct[account.product_id] = [];
            }
            accountsByProduct[account.product_id].push(account);
          });
          setProductAccounts(accountsByProduct);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product?: Product) => {
    setShowValidation(false);
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        nameEn: product.name,
        description: product.description || '',
        descriptionEn: product.description || '',
        price: product.price.toString(),
        currency: 'RUB',
        categoryId: product.category_id,
        imagesUrls: product.images_urls || [],
        autoDelivery: true,
        instructionsRu: '',
        instructionsEn: '',
        instructionsImages: [],
        isActive: product.is_active,
      });
      setInstructionBlocksRu([]);
      setInstructionBlocksEn([]);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        nameEn: '',
        description: '',
        descriptionEn: '',
        price: '',
        currency: 'RUB',
        categoryId: '',
        imagesUrls: [],
        autoDelivery: true,
        instructionsRu: '',
        instructionsEn: '',
        instructionsImages: [],
        isActive: true,
      });
      setInstructionBlocksRu([]);
      setInstructionBlocksEn([]);
    }
    setCurrentTextInput('');
    setShowModal(true);
  };

  const openAccountsModal = (productId: string) => {
    setShowAccountValidation(false);
    setSelectedProductId(productId);
    setShowAccountsModal(true);
  };

  const handleSaveAccount = async () => {
    if (!selectedProductId) return;

    setShowAccountValidation(true);

    try {
      if (!accountFormData.accountLogin.trim() || !accountFormData.accountPassword.trim()) {
        return;
      }

      const { error } = await supabase.from('product_accounts').insert([{
        product_id: selectedProductId,
        account_login: accountFormData.accountLogin,
        account_password: accountFormData.accountPassword,
        account_email: accountFormData.accountEmail || null,
        account_email_password: accountFormData.accountEmailPassword || null,
      }]);

      if (error) throw error;

      alert('Аккаунт добавлен');
      setAccountFormData({ accountLogin: '', accountPassword: '', accountEmail: '', accountEmailPassword: '' });
      setShowAccountValidation(false);
      loadData();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Ошибка сохранения аккаунта');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Удалить этот аккаунт?')) return;

    try {
      const { error } = await supabase.from('product_accounts').delete().eq('id', accountId);

      if (error) throw error;
      alert('Аккаунт удалён');
      loadData();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Ошибка удаления аккаунта');
    }
  };

  const handleSave = async () => {
    setShowValidation(true);

    try {
      if (!formData.name.trim() || !formData.price) {
        return;
      }

      if (!formData.categoryId) {
        alert('Выберите категорию. Без категории товар не будет отображаться в магазине.');
        return;
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category_id: formData.categoryId,
        images_urls: formData.imagesUrls,
        is_active: formData.isActive,
        stock_quantity: 0,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        alert('Товар обновлен');
      } else {
        const { error } = await supabase.from('products').insert([productData]);

        if (error) throw error;
        alert('Товар создан');
      }

      setShowValidation(false);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Ошибка сохранения товара');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот товар?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;
      alert('Товар удалён');
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Ошибка удаления товара');
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('store-assets').upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('store-assets').getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка загрузки изображения');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      setFormData({ ...formData, imagesUrls: [...formData.imagesUrls, url] });
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...formData.imagesUrls];
    newImages.splice(index, 1);
    setFormData({ ...formData, imagesUrls: newImages });
  };

  if (loading) return <Loading />;

  const getAvailableAccounts = (productId: string) => {
    const accounts = productAccounts[productId] || [];
    return accounts.filter(acc => !acc.is_sold);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {TYPE_NAMES[productType]}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <Button onClick={() => openModal()} className="mb-6 w-full py-4 text-lg font-semibold">
          <Plus className="w-6 h-6 mr-2" />
          Добавить товар
        </Button>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-gray-500 dark:text-gray-400">Нет товаров</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Нажмите "Добавить товар" чтобы создать первый товар</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const availableAccounts = getAvailableAccounts(product.id);
              return (
                <Card key={product.id} className="p-4">
                  <div className="flex gap-4">
                    {product.images_urls && product.images_urls.length > 0 ? (
                      <img
                        src={product.images_urls[0]}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.price} ₽
                        </span>
                        <span className={`text-sm ${availableAccounts.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          В наличии: {availableAccounts.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openAccountsModal(product.id)}
                      >
                        Аккаунты
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openModal(product)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Редактировать товар' : 'Новый товар'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Категория (рекомендуется)
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
                label="Название *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Название товара"
                className={showValidation && !formData.name.trim() ? 'border-red-500 focus:ring-red-500' : ''}
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
                label="Product name"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Enter name"
              />
              <Textarea
                label="Description"
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                className={showValidation && !formData.price ? 'border-red-500 focus:ring-red-500' : ''}
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Валюта
              </label>
              <div className="h-[42px] flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-medium">
                RUB
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Фотографии товара
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {formData.imagesUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img src={url} alt={`Product ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {uploading ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Загрузка...</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">+ Добавить фото</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">или нажмите Ctrl+V</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoDelivery"
              checked={formData.autoDelivery}
              onChange={(e) => setFormData({ ...formData, autoDelivery: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="autoDelivery" className="text-sm text-gray-700 dark:text-gray-300">
              Автоматическая выдача (без подтверждения админа)
            </label>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Инструкции</h3>
              <button
                type="button"
                onClick={() => setShowInstructionsPreview(!showInstructionsPreview)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showInstructionsPreview ? 'Скрыть предпросмотр' : 'Предпросмотр'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Добавить текст
              </label>
              <div className="flex gap-2">
                <textarea
                  ref={instructionsTextareaRef}
                  value={currentTextInput}
                  onChange={(e) => setCurrentTextInput(e.target.value)}
                  placeholder="Введите текст инструкции или вставьте изображение (Ctrl+V)"
                  rows={3}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <button
                  type="button"
                  onClick={addTextBlock}
                  disabled={!currentTextInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed h-fit"
                >
                  Добавить
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Введите текст и нажмите "Добавить" или вставьте изображение (Ctrl+V) прямо в поле
              </p>
            </div>

            {getCurrentBlocks().length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Блоки инструкции
                </label>
                {getCurrentBlocks().map((block, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <div className="flex-1">
                      {block.type === 'text' ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{block.content}</p>
                      ) : (
                        <img src={block.url} alt={`Block ${index + 1}`} className="w-full rounded-lg" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlockUp(index)}
                        disabled={index === 0}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Вверх"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlockDown(index)}
                        disabled={index === getCurrentBlocks().length - 1}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Вниз"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(index)}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="Удалить"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showInstructionsPreview && (
              <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Предпросмотр</h4>
                {getCurrentBlocks().length > 0 ? (
                  <div className="space-y-3">
                    {getCurrentBlocks().map((block, index) => (
                      <div key={index}>
                        {block.type === 'text' ? (
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{block.content}</p>
                        ) : (
                          <img src={block.url} alt={`Preview ${index + 1}`} className="w-full rounded-lg" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-500">Инструкция пуста</p>
                )}
              </div>
            )}

          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {editingProduct ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAccountsModal}
        onClose={() => {
          setShowAccountsModal(false);
          setSelectedProductId(null);
          setAccountFormData({ accountLogin: '', accountPassword: '' });
        }}
        title="Управление аккаунтами"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Количество товара = количество добавленных аккаунтов
            </p>
          </div>

          <Input
            label="Логин *"
            value={accountFormData.accountLogin}
            onChange={(e) => setAccountFormData({ ...accountFormData, accountLogin: e.target.value })}
            placeholder="Логин аккаунта"
            className={showAccountValidation && !accountFormData.accountLogin.trim() ? 'border-red-500 focus:ring-red-500' : ''}
          />

          <Input
            label="Пароль *"
            value={accountFormData.accountPassword}
            onChange={(e) => setAccountFormData({ ...accountFormData, accountPassword: e.target.value })}
            placeholder="Пароль аккаунта"
            className={showAccountValidation && !accountFormData.accountPassword.trim() ? 'border-red-500 focus:ring-red-500' : ''}
          />

          <Input
            label="Email (необязательно)"
            type="email"
            value={accountFormData.accountEmail}
            onChange={(e) => setAccountFormData({ ...accountFormData, accountEmail: e.target.value })}
            placeholder="Email аккаунта"
          />

          <Input
            label="Пароль от Email (необязательно)"
            type="password"
            value={accountFormData.accountEmailPassword}
            onChange={(e) => setAccountFormData({ ...accountFormData, accountEmailPassword: e.target.value })}
            placeholder="Пароль от email"
          />

          <Button onClick={handleSaveAccount} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Добавить аккаунт
          </Button>

          {selectedProductId && (
            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Аккаунты ({getAvailableAccounts(selectedProductId).length})
              </h3>
              {getAvailableAccounts(selectedProductId).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Нет аккаунтов</p>
              ) : (
                getAvailableAccounts(selectedProductId).map((account) => (
                  <Card key={account.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {account.account_login}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {account.account_password}
                        </p>
                        {account.account_email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Email: {account.account_email}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          <Button variant="secondary" onClick={() => {
            setShowAccountsModal(false);
            setSelectedProductId(null);
            setAccountFormData({ accountLogin: '', accountPassword: '', accountEmail: '', accountEmailPassword: '' });
          }} className="w-full">
            Закрыть
          </Button>
        </div>
      </Modal>
    </div>
  );
};
