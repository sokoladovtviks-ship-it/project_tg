import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Loading } from '../../components/Loading';
import { useTranslation } from '../../hooks/useTranslation';
import { useTelegram } from '../../hooks/useTelegram';

type Category = Database['public']['Tables']['categories']['Row'];

interface CategoriesManagerProps {
  storeId: string;
  onBack: () => void;
}

export const CategoriesManager = ({ storeId, onBack }: CategoriesManagerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '📦', imageUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [useCustomImage, setUseCustomImage] = useState(false);
  const { t } = useTranslation();
  const { webApp } = useTelegram();

  const emojiList = ['📦', '🎮', '👕', '🍔', '📱', '💻', '🎧', '📚', '⚽', '🎨', '🏠', '🚗', '💎', '🎁', '🌟'];

  useEffect(() => {
    loadCategories();
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

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
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

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      webApp?.showAlert('Введите название категории');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        const updateData: any = { name: formData.name };
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
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', icon: '📦', imageUrl: '' });
      setUseCustomImage(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      webApp?.showAlert('Ошибка сохранения категории');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    const hasCustomImage = !!category.image_url;
    setFormData({
      name: category.name,
      icon: category.icon || '📦',
      imageUrl: category.image_url || ''
    });
    setUseCustomImage(hasCustomImage);
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

  const clearImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setUseCustomImage(false);
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.categories')}</h1>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingCategory(null);
              setFormData({ name: '', icon: '📦', imageUrl: '' });
              setUseCustomImage(false);
              setShowModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('category.noCategories')}</p>
            <Button
              onClick={() => {
                setEditingCategory(null);
                setFormData({ name: '', icon: '📦', imageUrl: '' });
                setUseCustomImage(false);
                setShowModal(true);
              }}
            >
              {t('category.add')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <Card key={category.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {category.image_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden">
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-3xl">{category.icon}</div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
                      {!category.is_visible && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Скрыта от пользователей</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleVisibility(category)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        category.is_visible
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      title={category.is_visible ? 'Товар виден' : 'Товар скрыт'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          category.is_visible ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
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
        onClose={() => {
          setShowModal(false);
          setEditingCategory(null);
          setFormData({ name: '', icon: '📦', imageUrl: '' });
          setUseCustomImage(false);
        }}
        title={editingCategory ? t('category.edit') : t('category.add')}
      >
        <div className="space-y-4">
          <Input
            label={t('category.name')}
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Введите название"
          />

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
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                Эмодзи
              </button>
              <button
                onClick={() => setUseCustomImage(true)}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors font-medium ${
                  useCustomImage
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                Своё изображение
              </button>
            </div>

            {useCustomImage ? (
              <div>
                {formData.imageUrl ? (
                  <div className="relative">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Загрузка...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Нажмите для загрузки изображения
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">PNG, JPG до 5 МБ</p>
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
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
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
