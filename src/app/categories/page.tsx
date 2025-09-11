'use client';

/**
 * ⚠️ PÁGINA PROTEGIDA - ALTERAÇÕES RESTRITAS ⚠️
 * 
 * Esta página foi simplificada e otimizada conforme solicitado.
 * 
 * FUNCIONALIDADES REMOVIDAS (NÃO RESTAURAR SEM AUTORIZAÇÃO):
 * - Botão de importar categorias da VTEX
 * - Notificações de sucesso/erro (substituídas por logs)
 * - Estados de importação (importing, showImportSuccess, showImportError, importMessage)
 * 
 * FUNCIONALIDADES MANTIDAS:
 * - Busca de categorias
 * - Visualização de categorias
 * - Exclusão de categorias
 * - Filtros por status e filhos
 * 
 * ⚠️ ANTES DE FAZER QUALQUER ALTERAÇÃO, CONFIRME COM O SOLICITANTE ⚠️
 */

import { useState } from 'react';
import Layout from '@/components/Layout';
import { CategoryTable, useCategories } from '@/modules/categories';
import { Category } from '@/modules/categories/types';
import { 
  Eye, 
  Edit, 
  Trash2, 
  FolderOpen,
  XCircle
} from 'lucide-react';

export default function CategoriesPage() {
  // ⚠️ ESTADOS SIMPLIFICADOS - NÃO ADICIONAR ESTADOS DE NOTIFICAÇÃO SEM AUTORIZAÇÃO ⚠️
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // ⚠️ HOOK SIMPLIFICADO - NÃO ADICIONAR importFromVtex SEM AUTORIZAÇÃO ⚠️
  const {
    categories,
    loading,
    totalCategories,
    currentPage,
    totalPages,
    itemsPerPage,
    sort,
    filters,
    error,
    fetchCategories,
    updateSort,
    updatePage,
    updateItemsPerPage,
    updateFilters,
    clearFilters,
    deleteCategory
  } = useCategories({
    initialPage: 1,
    initialLimit: 20,
    initialSort: { field: 'name', direction: 'asc' }
  });

  // ⚠️ HANDLERS SIMPLIFICADOS - NÃO ADICIONAR HANDLERS DE IMPORT SEM AUTORIZAÇÃO ⚠️
  // Handlers para seleção de categorias
  const handleCategorySelect = (id: number) => {
    setSelectedCategories(prev => 
      prev.includes(id) 
        ? prev.filter(categoryId => categoryId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(category => category.id));
    }
  };

  // Handlers para ações
  const handleViewCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };


  // ⚠️ HANDLER SIMPLIFICADO - NÃO ADICIONAR NOTIFICAÇÕES SEM AUTORIZAÇÃO ⚠️
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const success = await deleteCategory(categoryToDelete.id);
      
      if (success) {
        setShowDeleteModal(false);
        setCategoryToDelete(null);
        console.log('Categoria excluída com sucesso!');
      } else {
        console.error('Erro ao excluir categoria');
      }
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
    }
  };

  return (
    <Layout title="Categorias" subtitle="Gerencie as categorias de produtos">


      {/* Tabela de Categorias */}
      <CategoryTable
        categories={categories}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCategories={totalCategories}
        itemsPerPage={itemsPerPage}
        sort={sort}
        selectedCategories={selectedCategories}
        onSort={updateSort}
        onPageChange={updatePage}
        onItemsPerPageChange={updateItemsPerPage}
        onCategorySelect={handleCategorySelect}
        onSelectAll={handleSelectAll}
        onViewCategory={handleViewCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Modal de Visualização/Edição */}
      {showCategoryModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCategory.name}
                </h2>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setSelectedCategory(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID VTEX</label>
                    <p className="text-sm text-gray-900">{selectedCategory.vtex_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-sm text-gray-900">
                      {selectedCategory.is_active ? 'Ativa' : 'Inativa'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria Pai</label>
                  <p className="text-sm text-gray-900">
                    {selectedCategory.parent_name || 'Categoria raiz'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <p className="text-sm text-gray-900">{selectedCategory.title || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <p className="text-sm text-gray-900">{selectedCategory.description || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produtos</label>
                  <p className="text-sm text-gray-900">{selectedCategory.product_count || 0}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Criado em</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedCategory.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Atualizado em</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedCategory.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setSelectedCategory(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
                  <p className="text-gray-600">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja excluir a categoria <strong>{categoryToDelete.name}</strong>?
                {categoryToDelete.product_count && categoryToDelete.product_count > 0 && (
                  <span className="block text-red-600 text-sm mt-2">
                    ⚠️ Esta categoria possui {categoryToDelete.product_count} produtos associados.
                  </span>
                )}
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
