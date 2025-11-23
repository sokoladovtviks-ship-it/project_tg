import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useTelegram } from '../hooks/useTelegram';

type Category = Database['public']['Tables']['categories']['Row'];

interface SubcategoriesPageProps {
  parentCategoryId: string;
  onBack: () => void;
  onSubcategoryClick: (categoryId: string) => void;
}

export const SubcategoriesPage = ({
  parentCategoryId,
  onBack,
  onSubcategoryClick,
}: SubcategoriesPageProps) => {
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const { webApp } = useTelegram();

  useEffect(() => {
    loadData();
  }, [parentCategoryId]);

  const loadData = async () => {
    try {
      const [parentResult, subcategoriesResult] = await Promise.all([
        supabase.from('categories').select('*').eq('id', parentCategoryId).single(),
        supabase
          .from('categories')
          .select('*')
          .eq('parent_category_id', parentCategoryId)
          .eq('is_visible', true)
          .order('order_position'),
      ]);

      if (parentResult.error) throw parentResult.error;
      if (subcategoriesResult.error) throw subcategoriesResult.error;

      setParentCategory(parentResult.data);
      setSubcategories(subcategoriesResult.data || []);
    } catch (error) {
      console.error('Error loading subcategories:', error);
      webApp?.showAlert('Ошибка загрузки подкатегорий');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {parentCategory?.name || 'Категории'}
          </h1>
        </div>
      </div>

      <div className="p-4">
        {subcategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Нет подкатегорий</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subcategories.map((subcategory) => (
              <Card
                key={subcategory.id}
                hover
                onClick={() => onSubcategoryClick(subcategory.id)}
                className="p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {subcategory.image_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                          src={subcategory.image_url}
                          alt={subcategory.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-3xl">{subcategory.icon}</div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {subcategory.name}
                      </h3>
                      {subcategory.name_en && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {subcategory.name_en}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
