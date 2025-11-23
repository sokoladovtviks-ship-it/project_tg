import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Upload, X, DollarSign, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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
    instructionsRu: '',
    instructionsEn: '',
    instructionsImagesRu: [] as string[],
    instructionsImagesEn: [] as string[],
    isActive: true,
  });
  const [accountFormData, setAccountFormData] = useState({
    accountLogin: '',
    accountPassword: '',
    accountEmail: '',
    accountEmailPassword: '',
  });
  const [accounts, setAccounts] = useState<Array<{
    login: string;
    password: string;
    email: string;
    emailPassword: string;
  }>>([]);
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [instructionImageUrl, setInstructionImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showAccountValidation, setShowAccountValidation] = useState(false);
  const [showInstructionsPreview, setShowInstructionsPreview] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const instructionsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { webApp } = useTelegram();

  const addInstructionImage = async (file: File) => {
    const url = await uploadImage(file);
    if (url) {
      const textarea = instructionsTextareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPosition);
      const textAfter = textarea.value.substring(cursorPosition);

      if (languageTab === 'ru') {
        const newImages = [...formData.instructionsImagesRu, url];
        const imageMarker = `[Фото ${newImages.length}]`;
        const newText = textBefore + imageMarker + textAfter;

        setFormData(prev => ({
          ...prev,
          instructionsImagesRu: newImages,
          instructionsRu: newText
        }));

        setTimeout(() => {
          if (textarea) {
            textarea.focus();
            const newPosition = cursorPosition + imageMarker.length;
            textarea.setSelectionRange(newPosition, newPosition);
          }
        }, 0);
      } else {
        const newImages = [...formData.instructionsImagesEn, url];
        const imageMarker = `[Photo ${newImages.length}]`;
        const newText = textBefore + imageMarker + textAfter;

        setFormData(prev => ({
          ...prev,
          instructionsImagesEn: newImages,
          instructionsEn: newText
        }));

        setTimeout(() => {
          if (textarea) {
            textarea.focus();
            const newPosition = cursorPosition + imageMarker.length;
            textarea.setSelectionRange(newPosition, newPosition);
          }
        }, 0);
      }
    }
  };

  const removeInstructionImage = (index: number) => {
    if (languageTab === 'ru') {
      const newImages = [...formData.instructionsImagesRu];
      newImages.splice(index, 1);

      let newText = formData.instructionsRu;
      newText = newText.replace(`[Фото ${index + 1}]`, '');

      for (let i = index + 1; i < formData.instructionsImagesRu.length; i++) {
        newText = newText.replace(`[Фото ${i + 1}]`, `[Фото ${i}]`);
      }

      setFormData({ ...formData, instructionsImagesRu: newImages, instructionsRu: newText });
    } else {
      const newImages = [...formData.instructionsImagesEn];
      newImages.splice(index, 1);

      let newText = formData.instructionsEn;
      newText = newText.replace(`[Photo ${index + 1}]`, '');

      for (let i = index + 1; i < formData.instructionsImagesEn.length; i++) {
        newText = newText.replace(`[Photo ${i + 1}]`, `[Photo ${i}]`);
      }

      setFormData({ ...formData, instructionsImagesEn: newImages, instructionsEn: newText });
    }
  };

  const renderInstructionsPreview = () => {
    const text = languageTab === 'ru' ? formData.instructionsRu : formData.instructionsEn;
    const images = languageTab === 'ru' ? formData.instructionsImagesRu : formData.instructionsImagesEn;
    const photoWord = languageTab === 'ru' ? 'Фото' : 'Photo';

    if (!text && images.length === 0) {
      return <p className="text-sm text-gray-500 dark:text-gray-500">Инструкция пуста</p>;
    }

    const parts: (string | { type: 'image'; index: number })[] = [];
    let lastIndex = 0;

    for (let i = 0; i < images.length; i++) {
      const marker = `[${photoWord} ${i + 1}]`;
      const markerIndex = text.indexOf(marker, lastIndex);

      if (markerIndex !== -1) {
        if (markerIndex > lastIndex) {
          parts.push(text.substring(lastIndex, markerIndex));
        }
        parts.push({ type: 'image', index: i });
        lastIndex = markerIndex + marker.length;
      }
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div className="space-y-3">
        {parts.map((part, index) => {
          if (typeof part === 'string') {
            return part.trim() ? (
              <p key={index} className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {part}
              </p>
            ) : null;
          } else {
            return (
              <img
                key={`img-${part.index}`}
                src={images[part.index]}
                alt={`${photoWord} ${part.index + 1}`}
                className="w-full rounded-lg"
              />
            );
          }
        })}
      </div>
    );
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
              await addInstructionImage(file);
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
  }, [showModal, languageTab, formData]);

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
        instructionsRu: '',
        instructionsEn: '',
        instructionsImagesRu: [],
        instructionsImagesEn: [],
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
        categoryId: '',
        imagesUrls: [],
        instructionsRu: '',
        instructionsEn: '',
        instructionsImagesRu: [],
        instructionsImagesEn: [],
        isActive: true,
      });
      setAccounts([]);
      setCurrentAccountIndex(0);
    }
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

          <div className="flex gap-3 items-end">
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
              <div className="h-[42px] flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-medium">
                RUB
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Данные пользователю после покупки</h3>

            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setCurrentAccountIndex(Math.max(0, currentAccountIndex - 1))}
                disabled={currentAccountIndex === 0}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentAccountIndex + 1} аккаунт (Всего {accounts.filter(acc => acc.login.trim()).length} {accounts.filter(acc => acc.login.trim()).length === 0 ? 'аккаунтов' : accounts.filter(acc => acc.login.trim()).length === 1 ? 'аккаунт' : accounts.filter(acc => acc.login.trim()).length < 5 ? 'аккаунта' : 'аккаунтов'})
              </span>

              <button
                type="button"
                onClick={() => {
                  if (currentAccountIndex === accounts.length - 1 || accounts.length === 0) {
                    setAccounts([...accounts, { login: '', password: '', email: '', emailPassword: '' }]);
                    setCurrentAccountIndex(accounts.length);
                  } else {
                    setCurrentAccountIndex(Math.min(accounts.length - 1, currentAccountIndex + 1));
                  }
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {accounts.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setAccounts([{ login: '', password: '', email: '', emailPassword: '' }]);
                  setCurrentAccountIndex(0);
                }}
                className="w-full py-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
              >
                + Добавить первый аккаунт
              </button>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={accounts[currentAccountIndex]?.login || ''}
                  onChange={(e) => {
                    const newAccounts = [...accounts];
                    newAccounts[currentAccountIndex] = { ...newAccounts[currentAccountIndex], login: e.target.value };
                    setAccounts(newAccounts);
                  }}
                  placeholder="Введите данные для аккаунта"
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
                />

                <button
                  type="button"
                  onClick={() => {
                    const newAccounts = accounts.filter((_, index) => index !== currentAccountIndex);
                    setAccounts(newAccounts);
                    setCurrentAccountIndex(Math.max(0, currentAccountIndex - 1));
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Удалить этот аккаунт
                </button>
              </div>
            )}
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

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Инструкции</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {languageTab === 'ru' ? 'Текст инструкции' : 'Instruction text'}
              </label>
              <textarea
                ref={instructionsTextareaRef}
                value={languageTab === 'ru' ? formData.instructionsRu : formData.instructionsEn}
                onChange={(e) => setFormData({ ...formData, [languageTab === 'ru' ? 'instructionsRu' : 'instructionsEn']: e.target.value })}
                placeholder={languageTab === 'ru' ? 'Введите инструкцию для покупателя. Вставьте изображение (Ctrl+V) для добавления' : 'Enter instructions for buyer. Paste image (Ctrl+V) to add'}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Вставьте изображение в это поле (Ctrl+V)
              </p>

              {(languageTab === 'ru' ? formData.instructionsImagesRu : formData.instructionsImagesEn).length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Изображения
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(languageTab === 'ru' ? formData.instructionsImagesRu : formData.instructionsImagesEn).map((url, index) => (
                      <div key={index} className="relative">
                        <img src={url} alt={`Instruction ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeInstructionImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowInstructionsPreview(!showInstructionsPreview)}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showInstructionsPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр'}
              </button>

              {showInstructionsPreview && (
                <div className="mt-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Предпросмотр</h4>
                  {renderInstructionsPreview()}
                </div>
              )}
            </div>

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
