import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Upload, X, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { useTelegram } from '../hooks/useTelegram';

type Category = Database['public']['Tables']['categories']['Row'];

const TYPE_NAMES: Record<string, string> = {
  accounts: 'Аккаунты',
  subscriptions: 'Подписки',
  game_items: 'Игровые предметы',
  services: 'Услуги',
  other: 'Прочее',
};

interface CategoriesManagerByTypeProps {
  storeId: string;
  categoryType: string;
  onBack: () => void;
}

export const CategoriesManagerByType = ({ storeId, categoryType, onBack }: CategoriesManagerByTypeProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [languageTab, setLanguageTab] = useState<'ru' | 'en'>('ru');
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    icon: '📦',
    imageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [useCustomImage, setUseCustomImage] = useState(false);
  const { webApp } = useTelegram();

  const emojiList = ['📦', '🎮', '👕', '🍔', '📱', '💻', '🎧', '📚', '⚽', '🎨', '🏠', '🚗', '💎', '🎁', '🌟'];

  useEffect(() => {
    loadCategories();
  }, [storeId, categoryType]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
        .eq('category_type', categoryType)
        .order('order_position');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      webApp?.showAlert('Ошибка загрузки категорий');
    } finally {
      setLoading(false);
    }
  };

  const parentCategories = categories.filter(c => !c.parent_category_id);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_category_id === parentId);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      webApp?.showAlert('Введите название категории');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        const updateData: any = {
          name: formData.name,
          name_en: formData.nameEn || null,
          parent_category_id: selectedParentId || null,
        };

        if (useCustomImage && formData.imageUrl) {
          updateData.image_url = formData.imageUrl;
          updateData.icon = null;
        } else {
          updateData.icon = formData.icon;
          updateData.image_url = null;
        }

        const { error } = await supabase
          .from('categories')
          .update(updateData)
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const insertData: any = {
          store_id: storeId,
          name: formData.name,
          name_en: formData.nameEn || null,
          category_type: categoryType,
          parent_category_id: selectedParentId || null,
          order_position: categories.length,
        };

        if (useCustomImage && formData.imageUrl) {
          insertData.image_url = formData.imageUrl;
        } else {
          insertData.icon = formData.icon;
        }

        const { error } = await supabase.from('categories').insert(insertData);
        if (error) throw error;
      }

      webApp?.HapticFeedback.notificationOccurred('success');
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      webApp?.showAlert('Ошибка сохранения категории');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingCategory(null);
    setSelectedParentId(null);
    setFormData({ name: '', nameEn: '', icon: '📦', imageUrl: '' });
    setUseCustomImage(false);
    setLanguageTab('ru');
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    const hasCustomImage = !!category.image_url;
    setFormData({
      name: category.name,
      nameEn: category.name_en || '',
      icon: category.icon || '📦',
      imageUrl: category.image_url || '',
    });
    setSelectedParentId(category.parent_category_id);
    setUseCustomImage(hasCustomImage);
    setShowModal(true);
  };

  const handleAddSubcategory = (parentId: string) => {
    setSelectedParentId(parentId);
    setEditingCategory(null);
    setFormData({ name: '', nameEn: '', icon: '📦', imageUrl: '' });
    setUseCustomImage(false);
    setShowModal(true);
  };

  const handleToggleVisibility = async (category: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_visible: !category.is_visible })
        .eq('id', category.id);

      if (error) throw error;
      webApp?.HapticFeedback.notificationOccurred('success');
      loadCategories();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      webApp?.showAlert('Ошибка изменения видимости');
    }
  };

  const handleDelete = (category: Category) => {
    webApp?.showConfirm('Удалить категорию?', async (confirmed) => {
      if (confirmed) {
        try {
          const { error } = await supabase.from('categories').delete().eq('id', category.id);
          if (error) throw error;
          webApp?.HapticFeedback.notificationOccurred('success');
          loadCategories();
        } catch (error) {
          console.error('Error deleting category:', error);
          webApp?.showAlert('Ошибка удаления категории');
        }
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      webApp?.showAlert('Пожалуйста, выберите изображение');
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
      const filePath = `category-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, imageUrl: publicUrl }));
      setUseCustomImage(true);
      webApp?.HapticFeedback.notificationOccurred('success');
    } catch (error) {
      console.error('Error uploading image:', error);
      webApp?.showAlert('Ошибка загрузки изображения');
    } finally {
      setUploadingImage(false);
    }
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
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Категории</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{TYPE_NAMES[categoryType]}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {parentCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Нет категорий для {TYPE_NAMES[categoryType].toLowerCase()}
            </p>
            <Button onClick={() => setShowModal(true)}>Добавить категорию</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {parentCategories.map((category) => {
              const subcategories = getSubcategories(category.id);
              return (
                <div key={category.id}>
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        {category.image_url ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                            <img src={category.image_url} alt={category.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="text-3xl">{category.icon}</div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
                          {category.name_en && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{category.name_en}</p>
                          )}
                          {!category.is_visible && (
                            <span className="inline-block mt-1 text-xs text-gray-500 dark:text-gray-400">Скрыта</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleVisibility(category)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            category.is_visible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              category.is_visible ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddSubcategory(category.id)}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить подкатегорию
                    </button>
                  </Card>

                  {subcategories.length > 0 && (
                    <div className="ml-8 mt-2 space-y-2">
                      {subcategories.map((sub) => (
                        <Card key={sub.id} className="p-3 bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                              {sub.image_url ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                  <img src={sub.image_url} alt={sub.name} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div className="text-2xl">{sub.icon}</div>
                              )}
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">{sub.name}</h4>
                                {sub.name_en && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{sub.name_en}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleVisibility(sub)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  sub.is_visible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                    sub.is_visible ? 'translate-x-5' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <button onClick={() => handleEdit(sub)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(sub)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingCategory ? 'Редактировать' : (selectedParentId ? 'Добавить подкатегорию' : 'Добавить категорию')}
      >
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setLanguageTab('ru')}
              className={`px-4 py-2 font-medium transition-colors ${
                languageTab === 'ru'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Русский
            </button>
            <button
              onClick={() => setLanguageTab('en')}
              className={`px-4 py-2 font-medium transition-colors ${
                languageTab === 'en'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              English
            </button>
          </div>

          {languageTab === 'ru' ? (
            <Input
              label="Название категории"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название на русском"
            />
          ) : (
            <Input
              label="Category name"
              value={formData.nameEn}
              onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
              placeholder="Enter name in English"
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Иконка категории
            </label>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setUseCustomImage(false)}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors font-medium ${
                  !useCustomImage
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                Эмодзи
              </button>
              <button
                onClick={() => setUseCustomImage(true)}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors font-medium ${
                  useCustomImage
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                Своё изображение
              </button>
            </div>

            {useCustomImage ? (
              <div>
                {formData.imageUrl ? (
                  <div className="relative">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Загрузка...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Нажмите для загрузки</p>
                        </div>
                      )}
                    </div>
                  </label>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {emojiList.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                    className={`text-3xl p-2 rounded-lg border-2 transition-colors ${
                      formData.icon === emoji
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={resetForm}>Отмена</Button>
            <Button fullWidth onClick={handleSubmit} loading={submitting}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
