'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { BrandTable } from '@/modules/brands/components/BrandTable';
import { BrandFiltersComponent } from '@/modules/brands/components/BrandFilters';
import { Brand, BrandFilters, BrandSortOptions } from '@/modules/brands/types';
import { useBrands } from '@/modules/brands/hooks/useBrands';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Bot, 
  Download, 
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function BrandsPage() {
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [importing, setImporting] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [showImportError, setShowImportError] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const {
    brands,
    loading,
    totalBrands,
    currentPage,
    totalPages,
    itemsPerPage,
    sort,
    filters,
    error,
    fetchBrands,
    updateSort,
    updatePage,
    updateItemsPerPage,
    updateFilters,
    clearFilters
  } = useBrands({
    initialPage: 1,
    initialLimit: 20,
    initialSort: { field: 'name', direction: 'asc' }
  });

  // Debug: verificar se as marcas estão sendo carregadas
  console.log('BrandsPage - brands:', brands);
  console.log('BrandsPage - loading:', loading);
  console.log('BrandsPage - error:', error);

  // Handlers para seleção de marcas
  const handleBrandSelect = (id: number) => {
    setSelectedBrands(prev => 
      prev.includes(id) 
        ? prev.filter(brandId => brandId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBrands.length === brands.length) {
      setSelectedBrands([]);
    } else {
      setSelectedBrands(brands.map(brand => brand.id));
    }
  };

  // Handlers para ações das marcas
  const handleViewBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setShowBrandModal(true);
  };

  const handleEditBrand = (brand: Brand) => {
    // TODO: Implementar edição de marca
    console.log('Editar marca:', brand);
  };

  const handleDeleteBrand = (brand: Brand) => {
    setBrandToDelete(brand);
    setShowDeleteModal(true);
  };

  const handleGenerateAuxiliary = async (brand: Brand) => {
    try {
      const response = await fetch('/api/brands/generate-auxiliary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: brand.id,
          guidelines: '',
          saveData: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Recarregar marcas para atualizar o status
        fetchBrands();
        setShowImportSuccess(true);
        setImportMessage('Dados auxiliares gerados com sucesso!');
        setTimeout(() => setShowImportSuccess(false), 3000);
      } else {
        setShowImportError(true);
        setImportMessage(result.message || 'Erro ao gerar dados auxiliares');
        setTimeout(() => setShowImportError(false), 5000);
      }
    } catch (error) {
      console.error('Erro ao gerar dados auxiliares:', error);
      setShowImportError(true);
      setImportMessage('Erro de conexão ao gerar dados auxiliares');
      setTimeout(() => setShowImportError(false), 5000);
    }
  };

  // Handler para importar marcas da VTEX
  const handleImportFromVtex = async () => {
    setImporting(true);
    try {
      const response = await fetch('/api/brands/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setShowImportSuccess(true);
        setImportMessage(`Importadas ${result.imported} marcas com sucesso!`);
        setTimeout(() => setShowImportSuccess(false), 3000);
        // Recarregar marcas
        fetchBrands();
      } else {
        setShowImportError(true);
        setImportMessage(result.message || 'Erro ao importar marcas');
        setTimeout(() => setShowImportError(false), 5000);
      }
    } catch (error) {
      console.error('Erro ao importar marcas:', error);
      setShowImportError(true);
      setImportMessage('Erro de conexão ao importar marcas');
      setTimeout(() => setShowImportError(false), 5000);
    } finally {
      setImporting(false);
    }
  };

  // Handler para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!brandToDelete) return;

    try {
      const response = await fetch(`/api/brands/${brandToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setShowDeleteModal(false);
        setBrandToDelete(null);
        fetchBrands(); // Recarregar marcas
        setSelectedBrands(prev => prev.filter(id => id !== brandToDelete.id));
      } else {
        setShowImportError(true);
        setImportMessage(result.message || 'Erro ao excluir marca');
        setTimeout(() => setShowImportError(false), 5000);
      }
    } catch (error) {
      console.error('Erro ao excluir marca:', error);
      setShowImportError(true);
      setImportMessage('Erro de conexão ao excluir marca');
      setTimeout(() => setShowImportError(false), 5000);
    }
  };

  return (
    <Layout title="Marcas" subtitle="Gerencie as marcas importadas da VTEX">
      {/* Notificações */}
      {showImportSuccess && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {importMessage}
        </div>
      )}

      {showImportError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center">
          <XCircle className="h-5 w-5 mr-2" />
          {importMessage}
        </div>
      )}

      {/* Filtros */}
      <BrandFiltersComponent
        filters={filters}
        onFiltersChange={updateFilters}
        onClearFilters={clearFilters}
        onImportFromVtex={handleImportFromVtex}
        importing={importing}
      />

      {/* Tabela de Marcas */}
      <BrandTable
        brands={brands}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalBrands={totalBrands}
        itemsPerPage={itemsPerPage}
        sort={sort}
        selectedBrands={selectedBrands}
        onSort={updateSort}
        onPageChange={updatePage}
        onItemsPerPageChange={updateItemsPerPage}
        onBrandSelect={handleBrandSelect}
        onSelectAll={handleSelectAll}
        onViewBrand={handleViewBrand}
        onEditBrand={handleEditBrand}
        onDeleteBrand={handleDeleteBrand}
        onGenerateAuxiliary={handleGenerateAuxiliary}
      />

      {/* Modal de Detalhes da Marca */}
      {showBrandModal && selectedBrand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                    {selectedBrand.image_url ? (
                      <img
                        src={selectedBrand.image_url}
                        alt={selectedBrand.name}
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-gray-400 font-bold text-xl">
                        {selectedBrand.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedBrand.name}</h2>
                    <p className="text-gray-600">ID VTEX: {selectedBrand.vtex_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBrandModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Título:</span>
                      <p className="text-gray-900">{selectedBrand.title || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                        selectedBrand.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedBrand.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Dados Auxiliares:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                        selectedBrand.auxiliary_data_generated 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {selectedBrand.auxiliary_data_generated ? 'Gerados' : 'Pendentes'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Produtos:</span>
                      <p className="text-gray-900">{selectedBrand.product_count || 0}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Criado em:</span>
                      <p className="text-gray-900">{new Date(selectedBrand.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Atualizado em:</span>
                      <p className="text-gray-900">{new Date(selectedBrand.updated_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedBrand.meta_tag_description && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Descrição</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedBrand.meta_tag_description}</p>
                </div>
              )}

              {selectedBrand.brand_analysis && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Análise da Marca</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedBrand.brand_analysis}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && brandToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
                  <p className="text-gray-600">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja excluir a marca <strong>{brandToDelete.name}</strong>?
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