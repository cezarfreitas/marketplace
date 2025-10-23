'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { BarChart3, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  useProducts, 
  useProductModal, 
  ProductTable, 
  Product
} from '@/modules/products';
import { AnymarketSyncModal } from '@/components/AnymarketSyncModal';
import { CropImagesModal } from '@/components/CropImagesModal';
import { SimpleSkusModal } from '@/components/SimpleSkusModal';
import { BatchAnalysisProgressModal } from '@/components/BatchAnalysisProgressModal';
import { BatchOptimizationNoCropModal } from '@/components/BatchOptimizationNoCropModal';
import { ImageAnalysisModal } from '@/components/ImageAnalysisModal';
import { TitleGenerationModal } from '@/components/TitleGenerationModal';
import { CharacteristicsModal } from '@/components/CharacteristicsModal';
import { DescriptionModal } from '@/components/DescriptionModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BatchActions, ProductFilters } from '@/components/products';
import { useProductStates } from '@/hooks/useProductStates';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { useFiltersData } from '@/hooks/useFiltersData';

// Função auxiliar para formatar data
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Data não disponível';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleString('pt-BR');
  } catch (error) {
    return 'Data inválida';
  }
};

export default function ProductsPageWithSequentialOptimization() {
  // Hook customizado para gerenciar estados
  const productStates = useProductStates();
  
  // Hook para dados de filtros
  const filtersData = useFiltersData();
  
  // Hook do módulo de produtos
  const productsHook = useProducts();
  const {
    products,
    setProducts,
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
  } = productsHook;

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
  const [showBatchAnalysisModal, setShowBatchAnalysisModal] = useState(false);
  const [showBatchOptimizationNoCropModal, setShowBatchOptimizationNoCropModal] = useState(false);

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
    }
  }, [productStates.selectedProducts]);

  // Funções de otimização

  // Funções de ação individuais
  const handleAnalyzeImages = useCallback(async (product: Product) => {
    try {
      console.log('🖼️ Analisando imagens para produto:', product.id);
      
      // Buscar categoria do produto
      const categoryResponse = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'SELECT id_category_vtex FROM products_vtex WHERE id_produto_vtex = ?', 
          params: [product.id] 
        })
      });
      
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json();
        const categoryVtexId = categoryData.data?.[0]?.id_category_vtex;
        
        if (categoryVtexId) {
          const response = await fetch('/api/analyze-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              productId: product.id, 
              categoryVtexId,
              forceNewAnalysis: true 
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              alert('✅ Análise de imagens concluída com sucesso!');
            } else {
              alert(`❌ Erro na análise: ${result.message}`);
            }
          } else {
            alert('❌ Erro ao executar análise de imagens');
          }
        } else {
          alert('❌ Produto não possui categoria definida');
        }
      }
    } catch (error: any) {
      console.error('Erro na análise de imagens:', error);
      alert(`❌ Erro: ${error.message}`);
    }
  }, []);

  const handleGenerateTitle = useCallback(async (product: Product) => {
    try {
      console.log('📝 Gerando título para produto:', product.id);
      
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('✅ Título gerado com sucesso!');
        } else {
          alert(`❌ Erro na geração: ${result.message}`);
        }
      } else {
        alert('❌ Erro ao gerar título');
      }
    } catch (error: any) {
      console.error('Erro na geração de título:', error);
      alert(`❌ Erro: ${error.message}`);
    }
  }, []);

  const handleGenerateDescription = useCallback(async (product: Product) => {
    try {
      console.log('📄 Gerando descrição para produto:', product.id);
      
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, forceRegenerate: true })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('✅ Descrição gerada com sucesso!');
        } else {
          alert(`❌ Erro na geração: ${result.message}`);
        }
      } else {
        alert('❌ Erro ao gerar descrição');
      }
    } catch (error: any) {
      console.error('Erro na geração de descrição:', error);
      alert(`❌ Erro: ${error.message}`);
    }
  }, []);

  const handleGenerateCharacteristics = useCallback(async (product: Product) => {
    try {
      console.log('🔧 Gerando características para produto:', product.id);
      
      const response = await fetch('/api/generate-characteristics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('✅ Características geradas com sucesso!');
        } else {
          alert(`❌ Erro na geração: ${result.message}`);
        }
      } else {
        alert('❌ Erro ao gerar características');
      }
    } catch (error: any) {
      console.error('Erro na geração de características:', error);
      alert(`❌ Erro: ${error.message}`);
    }
  }, []);

  const handleSyncAnymarketing = useCallback(async (product: Product) => {
    try {
      console.log('🔄 Sincronizando com AnyMarketing para produto:', product.id);
      
      const response = await fetch('/api/anymarket/sync-put', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('✅ Sincronização AnyMarketing concluída!');
        } else {
          alert(`❌ Erro na sincronização: ${result.message}`);
        }
      } else {
        alert('❌ Erro ao sincronizar com AnyMarketing');
      }
    } catch (error: any) {
      console.error('Erro na sincronização AnyMarketing:', error);
      alert(`❌ Erro: ${error.message}`);
    }
  }, []);

  const handleCropImages = useCallback(async (product: Product) => {
    try {
      console.log('✂️ Fazendo crop de imagens para produto:', product.id);
      
      const response = await fetch('/api/crop-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('✅ Crop de imagens concluído!');
        } else {
          alert(`❌ Erro no crop: ${result.message}`);
        }
      } else {
        alert('❌ Erro ao fazer crop de imagens');
      }
    } catch (error: any) {
      console.error('Erro no crop de imagens:', error);
      alert(`❌ Erro: ${error.message}`);
    }
  }, []);


  const handleBatchOptimizationNoCropComplete = useCallback((results: any[]) => {
    setShowBatchOptimizationNoCropModal(false);
    // Atualizar a lista de produtos se necessário
    // productsHook.refresh();
  }, []);

  const handleBatchAnalysis = useCallback(() => {
    setShowBatchAnalysisModal(true);
  }, []);

  const handleBatchAnalysisComplete = useCallback((results: any[]) => {
    console.log('Análise em lote concluída:', results);
    setShowBatchAnalysisModal(false);
    // Atualizar a lista de produtos se necessário
    // productsHook.refresh();
  }, []);

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

  const handleViewSkus = useCallback(() => {
    setShowSkusModal(true);
  }, []);

  const handleBatchOptimizationNoCrop = () => {
    console.log('🟣 handleBatchOptimizationNoCrop chamada!');
    setShowBatchOptimizationNoCropModal(true);
  };


  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-600 mt-1">
              Gerencie e otimize seus produtos de forma eficiente
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
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
            const convertedFilters = {
              ...newFilters,
              brand_id: Array.isArray(newFilters.brand_id) ? newFilters.brand_id.map(String) : newFilters.brand_id ? String(newFilters.brand_id) : undefined,
              category_id: Array.isArray(newFilters.category_id) ? newFilters.category_id.map(String) : newFilters.category_id ? String(newFilters.category_id) : undefined
            };
            updateFilters(convertedFilters);
          }}
          onClearFilters={clearFilters}
        />

        {/* Ações em lote */}
        {productStates.selectedProducts.length > 0 && (
          <>
            <BatchActions
              selectedProducts={productStates.selectedProducts}
              onClearSelection={() => productStates.setSelectedProducts([])}
              onExportSelected={handleExportSelected}
              onViewSkus={() => setShowSkusModal(true)}
              onDeleteSelected={handleDeleteSelected}
              onBatchAnalysis={handleBatchAnalysis}
              onBatchOptimizationNoCrop={handleBatchOptimizationNoCrop}
              onAnymarketSync={() => {}} // Placeholder - funcionalidade não implementada nesta versão
              isExporting={productStates.isExporting}
            />
          </>
        )}
        

        {/* Tabela de produtos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Lista de Produtos</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {totalProducts} produtos encontrados
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
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
              productsWithAnymarketSync={productStates.productsWithAnymarketSync}
              productsWithCroppedImages={productStates.productsWithCroppedImages}
              productsWithTitle={productStates.productsWithTitle}
              productsWithImageAnalysis={productStates.productsWithImageAnalysis}
              productsWithOptimizedTitle={productStates.productsWithOptimizedTitle}
              productsWithGeneratedDescription={productStates.productsWithGeneratedDescription}
              productsWithGeneratedCharacteristics={productStates.productsWithGeneratedCharacteristics}
              anymarketMappings={productStates.anymarketMappings}
            />
          </CardContent>
        </Card>

        {/* Modais */}
        {showModal && selectedProduct && (
          <div>
            {/* Modal de visualização do produto */}
            {/* Implementar modal de visualização */}
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

        {/* Modal de Análise em Lote */}
        {showBatchAnalysisModal && (
          <BatchAnalysisProgressModal
            isOpen={showBatchAnalysisModal}
            onClose={() => setShowBatchAnalysisModal(false)}
            selectedProducts={productStates.selectedProducts}
            onComplete={handleBatchAnalysisComplete}
          />
        )}

        {/* Modal de Otimização em Lote (Sem Crop) */}
        {showBatchOptimizationNoCropModal && (
          <BatchOptimizationNoCropModal
            isOpen={showBatchOptimizationNoCropModal}
            onClose={() => {
              setShowBatchOptimizationNoCropModal(false);
            }}
            selectedProducts={productStates.selectedProducts}
            onComplete={handleBatchOptimizationNoCropComplete}
          />
        )}
        
        

      </div>
    </Layout>
  );
}
