'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { BarChart3 } from 'lucide-react';
import { 
  useProducts, 
  useProductModal, 
  ProductTable, 
  Product
} from '@/modules/products';
import { AnymarketSyncModal } from '@/components/AnymarketSyncModal';
import { CropImagesModal } from '@/components/CropImagesModal';
import { SimpleSkusModal } from '@/components/SimpleSkusModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BatchActions, ProductFilters } from '@/components/products';
import { useProductStates } from '@/hooks/useProductStates';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { useFiltersData } from '@/hooks/useFiltersData';

// Função auxiliar para formatar data
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Data não disponível';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleString('pt-BR');
  } catch (error) {
    return 'Data inválida';
  }
};

export default function ProductsPage() {
  // Hook customizado para gerenciar estados
  const productStates = useProductStates();
  
  // Hook para dados de filtros
  const filtersData = useFiltersData();
  
  // Hook do módulo de produtos
  const {
    products,
    loading,
    currentPage,
    totalPages,
    totalProducts,
    itemsPerPage,
    sort,
    filters,
    updateSort,
    updatePage,
    updateItemsPerPage,
    updateFilters,
    clearFilters
  } = useProducts();

  // Hook do modal de produtos
  const {
    showModal,
    selectedProduct,
    openModal: handleViewProduct,
    closeModal: handleCloseModal
  } = useProductModal();

  // Hook para operações em lote
  const batchOperations = useBatchOperations({
    selectedProducts: productStates.selectedProducts,
    products
  });

  // Estados locais para funcionalidades específicas
  const [showSkusModal, setShowSkusModal] = useState(false);

  // Funções de seleção de produtos
  const handleSelectProduct = useCallback((productId: number, selected: boolean) => {
    if (selected) {
      productStates.setSelectedProducts(prev => [...prev, productId]);
    } else {
      productStates.setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  }, [productStates.setSelectedProducts]);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected && products) {
      productStates.setSelectedProducts(products.map(p => p.id));
    } else {
      productStates.setSelectedProducts([]);
    }
  }, [products, productStates.setSelectedProducts]);

  // Funções de ação (implementações temporárias)
  const handleGenerateDescription = useCallback((product: Product) => {
    console.log('Generate description for product:', product.id);
  }, []);

  // Funções de ação nos produtos
  const handleDeleteProduct = useCallback(async (product: Product) => {
    if (confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      // Implementar lógica de exclusão
      console.log('Excluindo produto:', product.id);
    }
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (productStates.selectedProducts.length === 0) return;
    
    if (confirm(`Tem certeza que deseja excluir ${productStates.selectedProducts.length} produto(s) selecionado(s)?`)) {
      // Implementar lógica de exclusão em lote
      console.log('Excluindo produtos:', productStates.selectedProducts);
      productStates.setSelectedProducts([]);
    }
  }, [productStates.selectedProducts, productStates.setSelectedProducts]);

  const handleViewSkus = useCallback(() => {
    setShowSkusModal(true);
  }, []);

  // Funções de exportação
  const handleExportSelected = useCallback(async () => {
    if (productStates.selectedProducts.length === 0) return;
    
    productStates.setIsExporting(true);
    try {
      // Implementar lógica de exportação
      console.log('Exportando produtos:', productStates.selectedProducts);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    } finally {
      productStates.setIsExporting(false);
    }
  }, [productStates.selectedProducts, productStates.setIsExporting]);

  // Funções de batch analysis
  const handleBatchAnalysis = useCallback(() => {
    alert(`Iniciar análise em lote para produtos: ${productStates.selectedProducts.join(', ')}`);
  }, [productStates.selectedProducts]);

  const handleBatchAnalysisComplete = useCallback((results: any[]) => {
    console.log('Análise em lote concluída:', results);
  }, []);

  // Funções de análise e geração (placeholders)
  const handleAnalyzeImages = useCallback((product: Product) => {
    productStates.setSelectedProductForAnalysis(product);
    productStates.setShowImageAnalysisModal(true);
  }, [productStates.setSelectedProductForAnalysis, productStates.setShowImageAnalysisModal]);

  const handleGenerateTitle = useCallback((product: Product) => {
    productStates.setSelectedProductForTool(product);
    productStates.setShowTitleModal(true);
  }, [productStates.setSelectedProductForTool, productStates.setShowTitleModal]);


  const handleGenerateCharacteristics = useCallback((product: Product) => {
    productStates.setSelectedProductForTool(product);
    productStates.setShowCharacteristicsModal(true);
  }, [productStates.setSelectedProductForTool, productStates.setShowCharacteristicsModal]);

  const handleSyncAnymarketing = useCallback((product: Product) => {
    productStates.setSelectedProductForTool(product);
    productStates.setShowAnymarketingModal(true);
  }, [productStates.setSelectedProductForTool, productStates.setShowAnymarketingModal]);

  const handleCropImages = useCallback((product: Product) => {
    productStates.setSelectedProductForTool(product);
    // Abrir modal de crop
    console.log('Crop images for product:', product.id);
  }, [productStates.setSelectedProductForTool]);

  const handleBatchCropImages = useCallback(() => {
    productStates.setShowBatchCropModal(true);
  }, [productStates.setShowBatchCropModal]);

  const handleBatchOptimizeAll = useCallback(() => {
    productStates.setShowBatchOptimizationModal(true);
  }, [productStates.setShowBatchOptimizationModal]);

  return (
    <Layout title="Produtos" subtitle="Gerencie os produtos importados da VTEX">
      
      {/* Ações em Lote */}
      <BatchActions
        selectedProducts={productStates.selectedProducts}
        onClearSelection={() => productStates.setSelectedProducts([])}
        onExportSelected={handleExportSelected}
        onViewSkus={handleViewSkus}
        onDeleteSelected={handleDeleteSelected}
        onBatchAnalysis={handleBatchAnalysis}
        onAnymarketSync={() => {}} // Placeholder - funcionalidade não implementada nesta versão
        isExporting={productStates.isExporting}
      />

      {/* Filtros e Busca */}
      <ProductFilters
        filters={{
          ...filters,
          brand_id: Array.isArray(filters.brand_id) ? filters.brand_id.map(Number) : filters.brand_id ? [Number(filters.brand_id)] : undefined,
          category_id: Array.isArray(filters.category_id) ? filters.category_id.map(Number) : filters.category_id ? [Number(filters.category_id)] : undefined
        }}
        brands={filtersData.brands}
        categories={filtersData.categories}
        loadingBrands={filtersData.loadingBrands}
        loadingCategories={filtersData.loadingCategories}
        onFiltersChange={(newFilters) => {
          updateFilters({
            ...newFilters,
            brand_id: newFilters.brand_id ? newFilters.brand_id.map(String) : undefined,
            category_id: newFilters.category_id ? newFilters.category_id.map(String) : undefined
          });
        }}
        onClearFilters={clearFilters}
      />

      {/* Tabela de Produtos */}
      <Card className={productStates.isExporting || productStates.batchAnalysisProgress.isRunning || productStates.batchAnymarketProgress.isRunning || productStates.batchStockProgress.isRunning || productStates.batchCharacteristicsProgress.isRunning ? 'pointer-events-none opacity-75' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <CardTitle>Produtos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {totalProducts} produtos encontrados
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ProductTable
            products={products}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalProducts={totalProducts}
            itemsPerPage={itemsPerPage}
            sort={sort}
            selectedProducts={productStates.selectedProducts}
            onSort={updateSort}
            onPageChange={updatePage}
            onItemsPerPageChange={updateItemsPerPage}
            onProductSelect={(id) => handleSelectProduct(id, !productStates.selectedProducts.includes(id))}
            onSelectAll={() => handleSelectAll(true)}
            onViewProduct={handleViewProduct}
            onDeleteProduct={handleDeleteProduct}
            onAnalyzeImages={handleAnalyzeImages}
            onGenerateTitle={handleGenerateTitle}
            onGenerateCharacteristics={handleGenerateCharacteristics}
            onGenerateDescription={handleGenerateDescription}
            onSyncAnymarketing={handleSyncAnymarketing}
            onCropImages={handleCropImages}
            productsWithTitle={productStates.productsWithTitle}
            productsWithAnymarketSync={productStates.productsWithAnymarketSync}
            productsWithCroppedImages={productStates.productsWithCroppedImages}
            anymarketMappings={productStates.anymarketMappings}
          />
        </CardContent>
      </Card>

      {/* Modais */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{selectedProduct.name}</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Conteúdo do modal */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Informações Básicas</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">ID:</span> {selectedProduct.id}
                    </div>
                    <div>
                      <span className="text-gray-500">Ref ID:</span> {selectedProduct.ref_id}
                    </div>
                    <div>
                      <span className="text-gray-500">Nome:</span> {selectedProduct.name}
                    </div>
                    <div>
                      <span className="text-gray-500">Marca:</span> {selectedProduct.brand_name}
                    </div>
                  </div>
                </div>
                
                {selectedProduct.description && (
                  <div>
                    <h3 className="font-medium mb-2">Descrição</h3>
                    <p className="text-sm text-gray-700">{selectedProduct.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de SKUs */}
      {showSkusModal && (
        <SimpleSkusModal
          isOpen={showSkusModal}
          onClose={() => setShowSkusModal(false)}
          productIds={productStates.selectedProducts}
        />
      )}

      {/* Outros modais */}
      {productStates.showAnymarketingModal && productStates.selectedProductForTool && (
        <AnymarketSyncModal
          isOpen={productStates.showAnymarketingModal}
          onClose={() => productStates.setShowAnymarketingModal(false)}
          product={productStates.selectedProductForTool}
        />
      )}

      {productStates.showImageAnalysisModal && productStates.selectedProductForAnalysis && (
        <CropImagesModal
          isOpen={productStates.showImageAnalysisModal}
          onClose={() => productStates.setShowImageAnalysisModal(false)}
          product={productStates.selectedProductForAnalysis}
          originalImages={[]}
        />
      )}

    </Layout>
  );
}
