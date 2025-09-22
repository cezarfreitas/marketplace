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
import { ImageAnalysisModal } from '@/components/ImageAnalysisModal';
import { TitleGenerationModal } from '@/components/TitleGenerationModal';
import { CharacteristicsModal } from '@/components/CharacteristicsModal';
import { DescriptionModal } from '@/components/DescriptionModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BatchActions, ProductFilters } from '@/components/products';
import { useProductStates } from '@/hooks/useProductStates';
import { useBatchOperations } from '@/hooks/useBatchOperations';

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

  // Hook para operações em lote (funções removidas)
  const batchOperations = useBatchOperations({
    selectedProducts: productStates.selectedProducts,
    products
  });

  // Estados locais para funcionalidades específicas
  const [showSkusModal, setShowSkusModal] = useState(false);

  // Carregar produtos quando a página carregar (sem busca de status)
  useEffect(() => {
    // Não há mais funções de busca de status
  }, []); // Removido productStates para evitar loop infinito

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

  // Funções de análise e geração (placeholders)
  const handleAnalyzeImages = useCallback(async (product: Product) => {
    // Sempre abrir o modal - ele vai verificar se já existe análise e mostrar o resultado
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

  const handleGenerateDescription = useCallback((product: Product) => {
    productStates.setSelectedProductForDescription(product);
    productStates.setShowDescriptionModal(true);
  }, [productStates.setSelectedProductForDescription, productStates.setShowDescriptionModal]);

  const handleCharacteristicsGenerated = useCallback((productId: number, characteristics: any[]) => {
    console.log('✅ Características geradas para produto:', productId, characteristics);
    // Função removida - não há mais busca de status
  }, []);

  const handleSyncAnymarketing = useCallback((product: Product) => {
    productStates.setSelectedProductForTool(product);
    productStates.setShowAnymarketingModal(true);
  }, [productStates.setSelectedProductForTool, productStates.setShowAnymarketingModal]);

  const handleCropImages = useCallback((product: Product) => {
    productStates.setSelectedProductForCrop(product);
    productStates.setShowCropModal(true);
  }, [productStates.setSelectedProductForCrop, productStates.setShowCropModal]);

  return (
    <Layout title="Produtos" subtitle="Gerencie os produtos importados da VTEX">
      
      {/* Ações em Lote */}
      <BatchActions
        selectedProducts={productStates.selectedProducts}
        onClearSelection={() => productStates.setSelectedProducts([])}
        onExportSelected={handleExportSelected}
        onViewSkus={handleViewSkus}
        onDeleteSelected={handleDeleteSelected}
        isExporting={productStates.isExporting}
      />

      {/* Filtros e Busca */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Filtros</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => productStates.setShowAdvancedFilters(!productStates.showAdvancedFilters)}
              className="flex items-center space-x-2"
            >
              {productStates.showAdvancedFilters ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Ocultar Filtros</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Mostrar Filtros</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          productStates.showAdvancedFilters ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <CardContent className="pt-0">
            <ProductFilters
              filters={{
                ...filters,
                brand_id: Array.isArray(filters.brand_id) ? filters.brand_id.map(Number) : filters.brand_id ? [Number(filters.brand_id)] : undefined,
                category_id: Array.isArray(filters.category_id) ? filters.category_id.map(Number) : filters.category_id ? [Number(filters.category_id)] : undefined
              }}
              brands={[]}
              categories={[]}
              loadingBrands={false}
              loadingCategories={false}
              onFiltersChange={(newFilters) => {
                updateFilters({
                  ...newFilters,
                  brand_id: newFilters.brand_id ? newFilters.brand_id.map(String) : undefined,
                  category_id: newFilters.category_id ? newFilters.category_id.map(String) : undefined
                });
              }}
              onClearFilters={clearFilters}
            />
          </CardContent>
        </div>
      </Card>

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
          onSyncComplete={(productId) => {
            // Sincronismo concluído - atualizar estado em tempo real
            console.log('Sincronismo concluído para produto:', productId);
            
            // Atualizar o produto local para mostrar o botão verde imediatamente
            if (productsHook.products) {
              const updatedProducts = productsHook.products.map(product => {
                if (product.id === productId) {
                  return {
                    ...product,
                    anymarket_enviado_any: new Date().toISOString() // Simular o campo preenchido
                  };
                }
                return product;
              });
              
              // Atualizar o estado dos produtos
              productsHook.setProducts(updatedProducts);
            }
            
            // Manter a lógica antiga para compatibilidade
            productStates.setProductsWithAnymarketSync(prev => {
              if (!prev.includes(productId)) {
                return [...prev, productId];
              }
              return prev;
            });
          }}
        />
      )}

      {productStates.showImageAnalysisModal && productStates.selectedProductForAnalysis && (
        <ImageAnalysisModal
          isOpen={productStates.showImageAnalysisModal}
          onClose={() => productStates.setShowImageAnalysisModal(false)}
          product={productStates.selectedProductForAnalysis}
          onAnalysisComplete={(productId) => {
            // Análise concluída - atualizar estado em tempo real
            console.log('Análise concluída para produto:', productId);
            productStates.setProductsWithImageAnalysis(prev => {
              if (!prev.includes(productId)) {
                return [...prev, productId];
              }
              return prev;
            });
          }}
        />
      )}

      {/* Modal de Geração de Título */}
      {productStates.showTitleModal && productStates.selectedProductForTool && (
        <TitleGenerationModal
          isOpen={productStates.showTitleModal}
          onClose={() => productStates.setShowTitleModal(false)}
          product={productStates.selectedProductForTool}
          onTitleGenerated={(productId, title) => {
            // Título gerado - atualizar estado em tempo real
            console.log('Título gerado para produto:', productId, title);
            productStates.setProductsWithOptimizedTitle(prev => {
              if (!prev.includes(productId)) {
                return [...prev, productId];
              }
              return prev;
            });
            
            // Atualizar o título do produto na lista local
            if (productStates.selectedProductForTool) {
              const updatedProduct = {
                ...productStates.selectedProductForTool,
                title: title
              };
              productStates.setSelectedProductForTool(updatedProduct);
            }
          }}
        />
      )}


      {/* Modal de Geração de Características */}
      {productStates.showCharacteristicsModal && productStates.selectedProductForTool && (
        <CharacteristicsModal
          isOpen={productStates.showCharacteristicsModal}
          onClose={() => productStates.setShowCharacteristicsModal(false)}
          product={productStates.selectedProductForTool}
          onCharacteristicsGenerated={(productId, characteristics) => {
            // Características geradas - atualizar estado em tempo real
            console.log('Características geradas para produto:', productId, characteristics);
            productStates.setProductsWithGeneratedCharacteristics(prev => {
              if (!prev.includes(productId)) {
                return [...prev, productId];
              }
              return prev;
            });
          }}
        />
      )}

      {/* Modal de Geração de Descrição */}
      {productStates.showDescriptionModal && productStates.selectedProductForDescription && (
        <DescriptionModal
          isOpen={productStates.showDescriptionModal}
          onClose={() => productStates.setShowDescriptionModal(false)}
          product={productStates.selectedProductForDescription}
          onDescriptionGenerated={(productId, description) => {
            // Descrição gerada - atualizar estado em tempo real
            console.log('Descrição gerada para produto:', productId, description);
            productStates.setProductsWithGeneratedDescription(prev => {
              if (!prev.includes(productId)) {
                return [...prev, productId];
              }
              return prev;
            });
          }}
        />
      )}

      {/* Modal de Crop de Imagens */}
      {productStates.showCropModal && productStates.selectedProductForCrop && (
        <CropImagesModal
          isOpen={productStates.showCropModal}
          onClose={() => productStates.setShowCropModal(false)}
          product={productStates.selectedProductForCrop}
          originalImages={[]} // Por enquanto vazio, pode ser implementado depois
          onProcessingComplete={(productId) => {
            // Atualizar o estado para incluir este produto na lista de produtos com imagens cropadas
            productStates.setProductsWithCroppedImages(prev => {
              if (!prev.includes(productId)) {
                return [...prev, productId];
              }
              return prev;
            });
          }}
        />
      )}
    </Layout>
  );
}
