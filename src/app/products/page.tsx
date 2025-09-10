'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Package, Trash2, X, ExternalLink, Copy, Check, Image, Loader2, Eye, Camera, RefreshCw, Warehouse, Download, Crop } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  useProducts, 
  useProductModal, 
  ProductTable, 
  ProductFiltersComponent,
  Product
} from '@/modules/products';
import { CropImagesModal } from '@/components/CropImagesModal';

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
  // Estados locais
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false);
  const [showAnalysisSelectionModal, setShowAnalysisSelectionModal] = useState(false);
  const [selectedProductForAnalysis, setSelectedProductForAnalysis] = useState<Product | null>(null);
  const [imageAnalysisData, setImageAnalysisData] = useState<any>(null);
  const [analyzingImages, setAnalyzingImages] = useState(false);
  const [analyzingSingleImage, setAnalyzingSingleImage] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [existingAnalysis, setExistingAnalysis] = useState<any>(null);
  const [currentAnalysisData, setCurrentAnalysisData] = useState<any>(null);
  const [productsWithAnalysis, setProductsWithAnalysis] = useState<number[]>([]);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [showAnymarketingModal, setShowAnymarketingModal] = useState(false);
  const [selectedProductForTool, setSelectedProductForTool] = useState<Product | null>(null);
  
  // Estados para Marketplace
  const [marketplaceDescription, setMarketplaceDescription] = useState<any>(null);
  const [generatingMarketplace, setGeneratingMarketplace] = useState(false);
  const [productsWithMarketplace, setProductsWithMarketplace] = useState<number[]>([]);
  const [productsWithAnymarketSync, setProductsWithAnymarketSync] = useState<number[]>([]);
  const [productsWithCroppedImages, setProductsWithCroppedImages] = useState<number[]>([]);
  
  // Estados para modal de crop
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropModalData, setCropModalData] = useState<{
    product: any;
    originalImages: any[];
  } | null>(null);
  
  // Estados para Anymarket Modal
  const [showSyncLogsModal, setShowSyncLogsModal] = useState(false);
  const [selectedSyncLog, setSelectedSyncLog] = useState<any>(null);
  const [anymarketSyncLogs, setAnymarketSyncLogs] = useState<any[]>([]);
  const [loadingAnymarketLogs, setLoadingAnymarketLogs] = useState(false);
  
  // Estados para análise em lote
  const [batchAnalysisProgress, setBatchAnalysisProgress] = useState({
    current: 0,
    total: 0,
    currentProduct: '',
    isRunning: false
  });

  // Estados para análise do Marketplace em lote
  const [batchMarketplaceProgress, setBatchMarketplaceProgress] = useState({
    current: 0,
    total: 0,
    currentProduct: '',
    isRunning: false
  });

  const [batchAnymarketProgress, setBatchAnymarketProgress] = useState({
    current: 0,
    total: 0,
    currentProduct: '',
    isRunning: false
  });

  // Estados para atualização de estoque em lote
  const [batchStockProgress, setBatchStockProgress] = useState({
    current: 0,
    total: 0,
    currentProduct: '',
    isRunning: false
  });

  // Estado para exportação
  const [isExporting, setIsExporting] = useState(false);

  // Função para buscar produtos que já têm análise
  const fetchProductsWithAnalysis = async () => {
    try {
      const response = await fetch('/api/analysis-logs-simple?limit=1000');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.logs) {
          const productIds = Array.from(new Set(data.logs.map((log: any) => log.product_id))) as number[];
          setProductsWithAnalysis(productIds);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar produtos com análise:', error);
    }
  };

  // Função para buscar produtos que já têm descrição do Marketplace
  const fetchProductsWithMarketplace = async () => {
    try {
      console.log('🔍 Buscando produtos com descrição do Marketplace...');
      const response = await fetch('/api/marketplace');
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Resposta da API marketplace:', data);
        if (data.success) {
          const productIds = data.data.map((item: any) => item.product_id);
          console.log('📋 Product IDs com marketplace:', productIds);
          setProductsWithMarketplace(productIds);
        }
      } else {
        console.error('❌ Erro na resposta da API marketplace:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos com descrição do Marketplace:', error);
    }
  };

  // Função para buscar produtos que já foram sincronizados com Anymarket
  const fetchProductsWithAnymarketSync = async () => {
    try {
      console.log('🔍 Buscando produtos sincronizados com Anymarket...');
      const response = await fetch('/api/anymarket/sync-logs');
      console.log('📡 Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Resposta da API anymarket sync:', data);
        console.log('📊 Data length:', data.data?.length);
        if (data.success) {
          // Filtrar apenas logs de sucesso (success pode ser 1 ou true)
          const successLogs = data.data.filter((log: any) => log.success === true || log.success === 1);
          console.log('✅ Logs de sucesso encontrados:', successLogs.length);
          console.log('📋 Logs de sucesso:', successLogs);
          const productIds = Array.from(new Set(successLogs.map((log: any) => Number(log.product_id)))) as number[];
          console.log('📋 Product IDs sincronizados com Anymarket:', productIds);
          console.log('📋 Tipo dos IDs:', productIds.map(id => typeof id));
          setProductsWithAnymarketSync(productIds);
          console.log('✅ Estado productsWithAnymarketSync atualizado com:', productIds);
        } else {
          console.log('❌ API retornou success: false');
        }
      } else {
        console.error('❌ Erro na resposta da API anymarket sync:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos sincronizados com Anymarket:', error);
    }
  };

  // Buscar produtos com análise, descrição do Marketplace e sincronização Anymarket quando a página carregar
  useEffect(() => {
    console.log('🔄 useEffect executado - buscando dados...');
    fetchProductsWithAnalysis();
    fetchProductsWithMarketplace();
    fetchProductsWithAnymarketSync();
  }, []);

  // Hooks do módulo
  const {
    products,
    loading,
    error,
    currentPage,
    totalPages,
    totalProducts,
    filters,
    sort,
    itemsPerPage,
    fetchProducts,
    updateFilters,
    clearFilters,
    updateSort,
    updatePage,
    updateItemsPerPage,
    deleteProduct,
    deleteMultipleProducts,
    hasProducts,
    hasFilters
  } = useProducts();

  const {
    showModal,
    selectedProduct,
    productSKUs,
    productImages,
    productSyncLogs,
    modalLoading,
    copiedText,
    openModal,
    closeModal,
    copyToClipboard
  } = useProductModal();

  // Funções de seleção
  const handleSelectProduct = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  // Funções de ação
  const handleViewProduct = (product: Product) => {
    console.log('👁️ Clicou em ver detalhes do produto:', product.name, 'ID:', product.id);
    openModal(product);
  };

  // Função de edição removida

  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      const success = await deleteProduct(product.id);
      if (success) {
        setSelectedProducts(prev => prev.filter(id => id !== product.id));
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.length === 0) return;
    
    if (confirm(`Tem certeza que deseja excluir ${selectedProducts.length} produtos?`)) {
      const success = await deleteMultipleProducts(selectedProducts);
      if (success) {
        setSelectedProducts([]);
      }
    }
  };

  const handleAnalyzeSelectedImages = async () => {
    if (selectedProducts.length === 0) return;
    
    if (confirm(`Deseja analisar as imagens de ${selectedProducts.length} produtos selecionados?`)) {
      // Encontrar os produtos selecionados
      const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
      
      // Inicializar progresso
      setBatchAnalysisProgress({
        current: 0,
        total: selectedProductsData.length,
        currentProduct: '',
        isRunning: true
      });
      
      // Não usar setAnalyzingSingleImage(true) para análise em lote - apenas para análise individual
      
      try {
        let successCount = 0;
        let errorCount = 0;
        
        // Analisar cada produto sequencialmente
        for (let i = 0; i < selectedProductsData.length; i++) {
          const product = selectedProductsData[i];
          
          try {
            // Atualizar progresso
            setBatchAnalysisProgress(prev => ({
              ...prev,
              current: i + 1,
              currentProduct: product.name
            }));
            
            console.log(`🔄 Analisando produto ${i + 1}/${selectedProductsData.length}: ${product.name}`);
            
            // Chamar API diretamente
            const timestamp = Date.now();
            const response = await fetch('/api/analyze-images', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                productId: product.id,
                timestamp: timestamp,
                forceNewAnalysis: true
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
              console.log(`✅ Análise concluída para: ${product.name}`);
              
              // Atualizar lista de produtos com análise em tempo real
              setProductsWithAnalysis(prev => {
                if (!prev.includes(product.id)) {
                  console.log(`✅ Adicionando produto ${product.id} à lista de produtos com análise`);
                  return [...prev, product.id];
                }
                return prev;
              });
              
              successCount++;
            } else {
              console.error(`❌ Falha na análise para: ${product.name}`, result.error);
              errorCount++;
            }
            
            // Pequena pausa entre análises para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 1500));
            
          } catch (error) {
            console.error(`❌ Erro ao analisar produto ${product.name}:`, error);
            errorCount++;
          }
        }
        
        // Mostrar resultado final
        alert(`Análise em lote concluída!\n✅ Sucessos: ${successCount}\n❌ Erros: ${errorCount}`);
        
        // Limpar seleção após análise
        setSelectedProducts([]);
        
        // Lista já foi atualizada em tempo real durante o processamento
        
      } catch (error) {
        console.error('Erro na análise em lote:', error);
        alert('Erro durante a análise em lote. Verifique o console para mais detalhes.');
      } finally {
        setAnalyzingSingleImage(false);
        setBatchAnalysisProgress({
          current: 0,
          total: 0,
          currentProduct: '',
          isRunning: false
        });
      }
    }
  };

  // Função para sincronizar com Anymarket em lote
  const handleAnymarketSyncBatch = async () => {
    if (selectedProducts.length === 0) return;
    
    if (confirm(`Deseja sincronizar ${selectedProducts.length} produtos selecionados com o Anymarket?`)) {
      // Inicializar progresso
      setBatchAnymarketProgress({
        current: 0,
        total: selectedProducts.length,
        currentProduct: '',
        isRunning: true
      });

      try {
        console.log(`🔄 Iniciando sincronização em lote com Anymarket para ${selectedProducts.length} produtos`);

        // Chamar API de sincronização em lote
        const response = await fetch('/api/anymarket/sync-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productIds: selectedProducts
          })
        });

        console.log('📡 Resposta recebida, status:', response.status);
        const result = await response.json();

        if (response.ok && result.success) {
          console.log('✅ Sincronização em lote concluída:', result.data);
          alert(`✅ Sincronização em lote concluída!\n\nSucessos: ${result.data.success}\nFalhas: ${result.data.failed}\nTotal: ${result.data.total}`);
          
          // Recarregar lista de produtos
          await fetchProducts();
        } else {
          console.error('❌ Erro na sincronização em lote:', result.message);
          alert('❌ Erro na sincronização em lote: ' + result.message);
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar com Anymarket em lote:', error);
        alert('❌ Erro ao sincronizar com Anymarket em lote: ' + (error as Error).message);
      } finally {
        setBatchAnymarketProgress({
          current: 0,
          total: 0,
          currentProduct: '',
          isRunning: false
        });
      }
    }
  };

  // Função para gerar descrições do Marketplace em lote
  const handleGenerateMeliBatch = async () => {
    if (selectedProducts.length === 0) return;
    
    if (confirm(`Deseja gerar descrições do Marketplace para ${selectedProducts.length} produtos selecionados?`)) {
      // Encontrar os produtos selecionados
      const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
      
      // Inicializar progresso
      setBatchMarketplaceProgress({
        current: 0,
        total: selectedProductsData.length,
        currentProduct: '',
        isRunning: true
      });

      try {
        let successCount = 0;
        let errorCount = 0;
        
        // Gerar descrição para cada produto sequencialmente
        for (let i = 0; i < selectedProductsData.length; i++) {
          const product = selectedProductsData[i];
          
          try {
            // Atualizar progresso
            setBatchMarketplaceProgress(prev => ({
              ...prev,
              current: i + 1,
              currentProduct: product.name
            }));

            console.log(`🔄 Gerando descrição do Marketplace para produto ${i + 1}/${selectedProductsData.length}: ${product.name}`);

            // Gerar descrição do Marketplace
            const response = await fetch('/api/generate-marketplace-description', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                productId: product.id,
                forceRegenerate: false
              })
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
              console.log(`✅ Descrição do Marketplace gerada para: ${product.name}`);
              
              // Atualizar lista de produtos com Marketplace em tempo real
              setProductsWithMarketplace(prev => {
                if (!prev.includes(product.id)) {
                  console.log(`✅ Adicionando produto ${product.id} à lista de produtos com Marketplace`);
                  return [...prev, product.id];
                }
                return prev;
              });
              
              successCount++;
            } else {
              console.error(`❌ Falha na geração para: ${product.name}`, result.error);
              errorCount++;
            }

            // Pequena pausa entre as requisições
            await new Promise(resolve => setTimeout(resolve, 1500));

          } catch (error) {
            console.error(`❌ Erro ao processar produto ${product.name}:`, error);
            errorCount++;
          }
        }

        // Mostrar resultado final
        alert(`Geração de descrições do Marketplace concluída!\n✅ Sucessos: ${successCount}\n❌ Erros: ${errorCount}`);
        
        // Lista já foi atualizada em tempo real durante o processamento
        
        // Limpar seleção após geração
        setSelectedProducts([]);

      } catch (error) {
        console.error('Erro na geração em lote do Marketplace:', error);
        alert('Erro durante a geração em lote do Marketplace. Verifique o console para mais detalhes.');
      } finally {
        setBatchMarketplaceProgress({
          current: 0,
          total: 0,
          currentProduct: '',
          isRunning: false
        });
      }
    }
  };

  // Função para atualizar estoque em lote
  const handleUpdateStockBatch = async () => {
    if (selectedProducts.length === 0) return;
    
    if (confirm(`Deseja atualizar o estoque de ${selectedProducts.length} produtos selecionados?`)) {
      // Encontrar os produtos selecionados
      const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
      
      // Inicializar progresso
      setBatchStockProgress({
        current: 0,
        total: selectedProductsData.length,
        currentProduct: '',
        isRunning: true
      });

      try {
        let successCount = 0;
        let errorCount = 0;
        
        // Processar cada produto sequencialmente
        for (let i = 0; i < selectedProductsData.length; i++) {
          const product = selectedProductsData[i];
          
          try {
            // Atualizar progresso
            setBatchStockProgress(prev => ({
              ...prev,
              current: i + 1,
              currentProduct: product.name
            }));
            
            console.log(`🔄 Atualizando estoque do produto ${i + 1}/${selectedProductsData.length}: ${product.name}`);
            
            // Chamar API para atualizar estoque
            const response = await fetch(`/api/products/${product.id}/stock`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
              console.log(`✅ Estoque atualizado para: ${product.name}`);
              successCount++;
            } else {
              console.error(`❌ Falha na atualização para: ${product.name}`, result.error);
              errorCount++;
            }
            
            // Pequena pausa entre atualizações para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.error(`❌ Erro ao atualizar estoque para ${product.name}:`, error);
            errorCount++;
          }
        }
        
        // Finalizar progresso
        setBatchStockProgress(prev => ({
          ...prev,
          isRunning: false
        }));
        
        // Recarregar dados
        await fetchProducts();
        
        // Mostrar resultado
        alert(`Atualização de estoque concluída!\n✅ Sucessos: ${successCount}\n❌ Erros: ${errorCount}`);
        
      } catch (error) {
        console.error('❌ Erro na atualização de estoque em lote:', error);
        setBatchStockProgress(prev => ({
          ...prev,
          isRunning: false
        }));
        alert('Erro durante a atualização de estoque em lote');
      }
    }
  };

  // Função para exportar produtos selecionados para XLSX
  const handleExportSelected = async () => {
    if (selectedProducts.length === 0) return;
    
    setIsExporting(true);
    
    try {
      // Buscar dados completos dos produtos selecionados
      const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
      
      // Preparar dados para exportação
      const exportData = selectedProductsData.map(product => ({
        'ID': product.id,
        'Nome': product.name,
        'Título': product.title || '',
        'RefId': product.ref_id || '',
        'ID Anymarket': product.anymarket_id || '',
        'Marca': product.brand_name || '',
        'Categoria': product.category_name || '',
        'Departamento': product.department_name || '',
        'SKUs': product.sku_count || 0,
        'Imagens': product.image_count || 0,
        'Estoque Total': product.total_stock || 0,
        'Ativo': product.is_active ? 'Sim' : 'Não',
        'Visível': product.is_visible ? 'Sim' : 'Não',
        'Data Criação': product.created_at ? new Date(product.created_at).toLocaleDateString('pt-BR') : '',
        'Data Atualização': product.updated_at ? new Date(product.updated_at).toLocaleDateString('pt-BR') : ''
      }));

      // Criar workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Configurar largura das colunas
      const columnWidths = [
        { wch: 8 },   // ID
        { wch: 40 },  // Nome
        { wch: 30 },  // Título
        { wch: 15 },  // RefId
        { wch: 15 },  // ID Anymarket
        { wch: 20 },  // Marca
        { wch: 25 },  // Categoria
        { wch: 20 },  // Departamento
        { wch: 8 },   // SKUs
        { wch: 10 },  // Imagens
        { wch: 12 },  // Estoque Total
        { wch: 8 },   // Ativo
        { wch: 10 },  // Visível
        { wch: 12 },  // Data Criação
        { wch: 12 }   // Data Atualização
      ];
      worksheet['!cols'] = columnWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');

      // Gerar nome do arquivo com timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `produtos_selecionados_${timestamp}.xlsx`;

      // Exportar arquivo
      XLSX.writeFile(workbook, fileName);

      console.log(`✅ Arquivo exportado: ${fileName}`);
      console.log(`📊 ${selectedProductsData.length} produtos exportados`);

    } catch (error) {
      console.error('❌ Erro ao exportar produtos:', error);
      alert('Erro ao exportar produtos. Verifique o console para mais detalhes.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAnalyzeImages = async (product: Product) => {
    setSelectedProductForAnalysis(product);
    
    // Verificar se já existe uma análise para este produto
    try {
      const response = await fetch(`/api/analysis-logs-simple?productId=${product.id}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.logs && data.logs.length > 0) {
          // Existe análise, carregar dados e mostrar modal
          const analysisLog = data.logs[0];
          
          // Construir dados da análise no formato esperado
          const analysisData = {
            product: product,
            agent_used: analysisLog.agent_name || "Agente de Imagens",
            analysis: {
              product_type: analysisLog.product_type || 'produto',
              image_count: analysisLog.image_count || 0,
              invalid_image_count: analysisLog.invalid_image_count || 0,
              contextual_analysis: analysisLog.contextual_analysis,
              analysis_quality: {
                level: analysisLog.analysis_quality || 'alta'
              },
              agent_configuration: {
                model: analysisLog.model_used || 'gpt-4o',
                max_tokens: analysisLog.max_tokens || 2000,
                quality_level: 'alta'
              },
              openai_analysis: {
                tokens_used: analysisLog.tokens_used || 0
              }
            },
            analysis_log: {
              duration_ms: analysisLog.analysis_duration_ms || 0,
              openai_response_time_ms: analysisLog.openai_response_time_ms || 0,
              tokens_used: analysisLog.tokens_used || 0,
              analysis_type: analysisLog.analysis_type || 'openai'
            }
          };
          
          setCurrentAnalysisData(analysisData);
          setShowImageAnalysisModal(true);
        } else {
          // Não existe análise, mostrar modal para gerar nova
          setCurrentAnalysisData(null);
          setShowImageAnalysisModal(true);
        }
      } else {
        // Erro na API, mostrar modal para gerar nova análise
        setCurrentAnalysisData(null);
        setShowImageAnalysisModal(true);
      }
    } catch (error) {
      console.error('Erro ao verificar análise existente:', error);
      // Em caso de erro, mostrar modal para gerar nova análise
      setCurrentAnalysisData(null);
      setShowImageAnalysisModal(true);
    }
  };

  // Função para gerar nova análise de imagens
  const handleGenerateNewAnalysis = async (forceRegenerate = false) => {
    if (!selectedProductForAnalysis) return;

    console.log('🔄 Iniciando análise para produto:', selectedProductForAnalysis.name, 'ID:', selectedProductForAnalysis.id);

    try {
      setAnalyzingSingleImage(true);
      setAnalysisError(null);
      
      // Adicionar timestamp para evitar cache
      const timestamp = Date.now();
      
      console.log('📡 Enviando requisição para API...');
      const response = await fetch('/api/analyze-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          productId: selectedProductForAnalysis.id,
          timestamp: timestamp,
          forceNewAnalysis: forceRegenerate
        }),
      });

      console.log('📡 Resposta recebida, status:', response.status);
      const result = await response.json();

      if (result.success) {
        console.log('✅ Nova análise gerada:', result);
        setCurrentAnalysisData(result);
        
        // Atualizar lista de produtos com análise
        if (selectedProductForAnalysis) {
          setProductsWithAnalysis(prev => Array.from(new Set([...prev, selectedProductForAnalysis.id])));
        }
      } else {
        console.log('❌ Erro na análise:', result.message);
        setAnalysisError(result.message || 'Erro ao analisar imagens');
      }
    } catch (error) {
      console.error('❌ Erro na análise:', error);
      setAnalysisError('Erro ao analisar imagens');
    } finally {
      setAnalyzingSingleImage(false);
    }
  };

  const handleViewExistingAnalysis = async () => {
    if (!selectedProductForAnalysis || !existingAnalysis) {
      console.log('❌ Nenhum produto ou análise selecionada');
      return;
    }

    try {
      setAnalyzingSingleImage(true);
      setAnalysisError(null);
      
      // Buscar dados completos da análise
      const response = await fetch(`/api/analysis-logs/${existingAnalysis.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.log) {
          // Simular estrutura de dados da análise para compatibilidade
          setImageAnalysisData({
            product: selectedProductForAnalysis,
            analysis: {
              product_type: data.log.product_type || 'produto',
              image_count: data.log.valid_images || 0,
              invalid_image_count: data.log.invalid_images || 0,
              contextual_analysis: data.log.analysis_text || 'Análise não disponível',
              analysis_quality: {
                level: data.log.analysis_quality || 'media',
                description: `Análise ${data.log.analysis_type || 'técnica'} com ${data.log.model_used || 'GPT-4o'}`
              },
              agent_configuration: {
                model: data.log.model_used || 'gpt-4o',
                max_tokens: data.log.max_tokens || 2000,
                temperature: data.log.temperature || 0.7,
                quality_level: data.log.analysis_quality || 'media',
                quality_description: `Análise ${data.log.analysis_type || 'técnica'} com ${data.log.model_used || 'GPT-4o'}`
              },
              openai_analysis: {
                openai_analysis: data.log.analysis_text || 'Análise não disponível',
                model_used: data.log.model_used || 'gpt-4o',
                tokens_used: data.log.tokens_used || 0,
                response_time_ms: data.log.openai_response_time_ms || 0
              },
              image_analysis: {
                total_images: data.log.total_images || 0,
                valid_images: data.log.valid_images || 0,
                invalid_images: data.log.invalid_images || 0,
                lighting: "Iluminação profissional adequada",
                clarity: "Alta resolução e nitidez",
                angles: (data.log.valid_images || 0) > 1 ? "Múltiplos ângulos de visualização" : "Visualização única",
                background: "Fundo neutro profissional",
                composition: "Composição equilibrada e atrativa"
              }
            },
            images: [], // Não temos as imagens na análise existente
            invalid_images: [],
            agent_used: "Agente de Imagens",
            analysis_log: {
              duration_ms: data.log.analysis_duration_ms || 0,
              openai_response_time_ms: data.log.openai_response_time_ms || 0,
              tokens_used: data.log.tokens_used || 0,
              analysis_type: data.log.analysis_type || 'openai'
            }
          });
          
          setShowAnalysisSelectionModal(false);
          setShowImageAnalysisModal(true);
        } else {
          setAnalysisError('Erro ao carregar análise existente');
        }
      } else {
        setAnalysisError('Erro ao buscar análise existente');
      }
    } catch (error) {
      console.error('Erro ao visualizar análise existente:', error);
      setAnalysisError('Erro ao carregar análise existente');
    } finally {
      setAnalyzingSingleImage(false);
    }
  };

  // Funções para as ferramentas
  const handleGenerateMarketplaceDescription = async (product: Product) => {
    setSelectedProductForTool(product);
    
    // Verificar se já existe descrição
    try {
      const response = await fetch(`/api/marketplace?productId=${product.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMarketplaceDescription(data.data);
        } else {
          setMarketplaceDescription(null);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar descrição existente:', error);
      setMarketplaceDescription(null);
    }
    
    setShowMarketplaceModal(true);
  };

  const handleGenerateMeliDescription = async (forceRegenerate = false) => {
    if (!selectedProductForTool) return;

    setGeneratingMarketplace(true);
    
    try {
      const response = await fetch('/api/generate-marketplace-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProductForTool.id,
          forceRegenerate
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setMarketplaceDescription(result.data);
        // Atualizar lista de produtos com descrição do Marketplace
        await fetchProductsWithMarketplace();
      } else {
        console.error('Erro ao gerar descrição:', result.message);
        alert('Erro ao gerar descrição: ' + result.message);
      }
    } catch (error) {
      console.error('Erro ao gerar descrição do Marketplace:', error);
      alert('Erro ao gerar descrição do Marketplace');
    } finally {
      setGeneratingMarketplace(false);
    }
  };

  const handleSyncAnymarketing = async (product: Product) => {
    if (!product.anymarket_id) {
      alert('Este produto não possui ID_ANY vinculado ao Anymarket');
      return;
    }
    
    setSelectedProductForTool(product);
    setShowAnymarketingModal(true);
    
    // Carregar logs de sincronização
    setLoadingAnymarketLogs(true);
    try {
      const response = await fetch(`/api/anymarket/sync-logs?productId=${product.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAnymarketSyncLogs(result.data || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar logs de sincronização:', error);
    } finally {
      setLoadingAnymarketLogs(false);
    }
  };

  const handleCropImages = async (product: Product) => {
    console.log('🖼️ Iniciando busca de imagens para produto:', product.name);
    
    if (!product.anymarket_id) {
      alert('Este produto não possui ID_ANY vinculado ao Anymarket');
      return;
    }

    try {
      console.log(`🔍 Buscando imagens do produto ${product.anymarket_id} no Anymarket...`);
      
      const response = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}/images`, {
        method: 'GET',
        headers: {
          'gumgaToken': 'MjU5MDYwMTI2Lg==.xk0BLaBr6Xp5ErWLBXq/Fp7MebhAY9G8/cduGnJECoETHLw1AvWwEFcX5z68M0HtWzBJazQWW5eNBL+eMUnHjw==',
          'Content-Type': 'application/json',
          'User-Agent': 'Meli-Integration/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      console.log('📡 Resposta recebida da API Anymarket:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na API do Anymarket:', response.status, errorText);
        alert(`Erro ao buscar imagens: ${response.status} - ${response.statusText}`);
        return;
      }

      const imagesData = await response.json();
      console.log('📸 Dados das imagens recebidos:', imagesData);

      // Filtrar apenas imagens com originalImage
      const originalImages = imagesData
        .filter((img: any) => img.originalImage)
        .map((img: any, index: number) => ({
          id: img.id || `img_${index}`,
          variation: img.variation || 'Sem variação',
          originalImage: img.originalImage,
          isMain: img.isMain || img.main || false,
          index: img.index || index + 1
        }));

      // Abrir modal sempre, mesmo sem imagens
      setCropModalData({
        product: {
          id: product.id,
          name: product.name,
          anymarket_id: product.anymarket_id
        },
        originalImages
      });
      setShowCropModal(true);
      
      if (originalImages.length === 0) {
        console.log(`📷 Nenhuma imagem original encontrada para o produto "${product.name}" (ID: ${product.anymarket_id})`);
      }

    } catch (error: any) {
      console.error('❌ Erro ao buscar imagens:', error);
      alert(`Erro ao buscar imagens: ${error.message}`);
    }
  };

  const handleCropProcessingComplete = (productId: number) => {
    console.log('✅ Processamento de crop concluído para produto ID:', productId);
    setProductsWithCroppedImages(prev => {
      if (!prev.includes(productId)) {
        return [...prev, productId];
      }
      return prev;
    });
  };

  // Estados para processamento em lote
  const [batchCropProgress, setBatchCropProgress] = useState({
    current: 0,
    total: 0,
    currentProduct: '',
    isRunning: false
  });

  // Estado para processamento "All" (todos os processamentos em sequência)
  const [batchAllProgress, setBatchAllProgress] = useState({
    current: 0,
    total: 0,
    currentProduct: '',
    currentStep: '',
    isRunning: false,
    completedSteps: {
      analysis: 0,
      marketplace: 0,
      anymarket: 0,
      stock: 0,
      crop: 0
    }
  });

  const handleBatchCropImages = async () => {
    console.log('🚀 Iniciando crop em lote...');
    console.log('📊 Produtos selecionados:', selectedProducts);
    console.log('📊 Total de produtos:', products.length);
    console.log('📊 Produtos já processados:', productsWithCroppedImages);

    if (selectedProducts.length === 0) {
      alert('Selecione pelo menos um produto para processar');
      return;
    }

    const productsToProcess = products.filter(p => 
      selectedProducts.includes(p.id) && 
      p.anymarket_id && 
      !productsWithCroppedImages.includes(p.id)
    );

    console.log('📊 Produtos filtrados para processamento:', productsToProcess.map(p => ({
      id: p.id,
      name: p.name,
      anymarket_id: p.anymarket_id,
      alreadyProcessed: productsWithCroppedImages.includes(p.id)
    })));

    if (productsToProcess.length === 0) {
      alert('Nenhum produto válido selecionado para processamento');
      return;
    }

    if (!confirm(`Deseja processar crop de imagens para ${productsToProcess.length} produtos selecionados?`)) {
      return;
    }

    setBatchCropProgress({
      current: 0,
      total: productsToProcess.length,
      currentProduct: '',
      isRunning: true
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < productsToProcess.length; i++) {
      const product = productsToProcess[i];
      
      setBatchCropProgress(prev => ({
        ...prev,
        current: i + 1,
        currentProduct: product.name
      }));

      try {
        console.log(`🔄 Processando crop para produto ${i + 1}/${productsToProcess.length}: ${product.name}`);
        console.log(`📋 Dados do produto:`, {
          id: product.id,
          name: product.name,
          anymarket_id: product.anymarket_id
        });
        
        // Chamar API de teste primeiro
        console.log(`📡 Chamando API de teste /api/test-batch-crop...`);
        const response = await fetch('/api/test-batch-crop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId: product.id,
            anymarketId: product.anymarket_id
          })
        });

        console.log(`📡 Resposta da API:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        const result = await response.json();
        console.log(`📊 Resultado da API:`, result);

        if (result.success) {
          setProductsWithCroppedImages(prev => {
            if (!prev.includes(product.id)) {
              console.log(`✅ Adicionando produto ${product.id} à lista de processados`);
              return [...prev, product.id];
            }
            return prev;
          });
          
          successCount++;
          console.log(`✅ Crop concluído para: ${product.name} - ${result.data?.processed || 0} imagens processadas`);
        } else {
          errorCount++;
          const errorMsg = `${product.name}: ${result.message}`;
          errors.push(errorMsg);
          console.error(`❌ Erro no crop de ${product.name}:`, result.message);
        }
        
      } catch (error: any) {
        errorCount++;
        const errorMsg = `${product.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ Erro no crop de ${product.name}:`, error);
        console.error(`❌ Stack trace:`, error.stack);
      }
    }

    setBatchCropProgress({
      current: 0,
      total: 0,
      currentProduct: '',
      isRunning: false
    });

    // Mostrar resultado detalhado
    let resultMessage = `Processamento em lote concluído!\n✅ Sucessos: ${successCount}\n❌ Erros: ${errorCount}`;
    
    if (errors.length > 0) {
      resultMessage += `\n\nErros encontrados:\n${errors.slice(0, 5).join('\n')}`;
      if (errors.length > 5) {
        resultMessage += `\n... e mais ${errors.length - 5} erro(s)`;
      }
    }
    
    alert(resultMessage);
  };

  // Função para processar "All" - todos os processamentos em sequência
  const handleBatchAll = async () => {
    console.log('🚀 Iniciando processamento "All" em lote...');
    console.log('📊 Produtos selecionados:', selectedProducts);

    if (selectedProducts.length === 0) {
      alert('Selecione pelo menos um produto para processar');
      return;
    }

    const productsToProcess = products.filter(p => 
      selectedProducts.includes(p.id) && 
      p.anymarket_id
    );

    if (productsToProcess.length === 0) {
      alert('Nenhum produto válido selecionado para processamento');
      return;
    }

    if (!confirm(`Deseja processar TODOS os passos para ${productsToProcess.length} produtos selecionados?\n\n📸 Análise de Imagens\n📝 Marketplace\n🔄 Anymarket\n📦 Estoque\n✂️ Crop de Imagens`)) {
      return;
    }

    setBatchAllProgress({
      current: 0,
      total: productsToProcess.length * 5, // 5 passos por produto
      currentProduct: '',
      currentStep: '',
      isRunning: true,
      completedSteps: {
        analysis: 0,
        marketplace: 0,
        anymarket: 0,
        stock: 0,
        crop: 0
      }
    });

    let totalSuccess = 0;
    let totalErrors = 0;
    const stepResults = {
      analysis: { success: 0, errors: 0 },
      marketplace: { success: 0, errors: 0 },
      anymarket: { success: 0, errors: 0 },
      stock: { success: 0, errors: 0 },
      crop: { success: 0, errors: 0 }
    };

    try {
      // 1. ANÁLISE DE IMAGENS
      console.log('📸 === ETAPA 1: ANÁLISE DE IMAGENS ===');
      setBatchAllProgress(prev => ({ ...prev, currentStep: 'Análise de Imagens' }));
      
      for (let i = 0; i < productsToProcess.length; i++) {
        const product = productsToProcess[i];
        const stepIndex = i * 5 + 1;
        
        setBatchAllProgress(prev => ({
          ...prev,
          current: stepIndex,
          currentProduct: product.name
        }));

        try {
          console.log(`📸 Analisando produto ${i + 1}/${productsToProcess.length}: ${product.name}`);
          
          const response = await fetch('/api/analyze-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              productId: product.id,
              timestamp: Date.now(),
              forceNewAnalysis: true
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setProductsWithAnalysis(prev => {
                if (!prev.includes(product.id)) {
                  return [...prev, product.id];
                }
                return prev;
              });
              stepResults.analysis.success++;
              totalSuccess++;
            } else {
              stepResults.analysis.errors++;
              totalErrors++;
            }
          } else {
            stepResults.analysis.errors++;
            totalErrors++;
          }
        } catch (error) {
          console.error(`❌ Erro na análise de ${product.name}:`, error);
          stepResults.analysis.errors++;
          totalErrors++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 2. MARKETPLACE
      console.log('📝 === ETAPA 2: MARKETPLACE ===');
      setBatchAllProgress(prev => ({ ...prev, currentStep: 'Marketplace' }));
      
      for (let i = 0; i < productsToProcess.length; i++) {
        const product = productsToProcess[i];
        const stepIndex = i * 5 + 2;
        
        setBatchAllProgress(prev => ({
          ...prev,
          current: stepIndex,
          currentProduct: product.name
        }));

        try {
          console.log(`📝 Gerando Marketplace para produto ${i + 1}/${productsToProcess.length}: ${product.name}`);
          
          const response = await fetch('/api/generate-marketplace-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              forceRegenerate: false
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setProductsWithMarketplace(prev => {
                if (!prev.includes(product.id)) {
                  return [...prev, product.id];
                }
                return prev;
              });
              stepResults.marketplace.success++;
              totalSuccess++;
            } else {
              stepResults.marketplace.errors++;
              totalErrors++;
            }
          } else {
            stepResults.marketplace.errors++;
            totalErrors++;
          }
        } catch (error) {
          console.error(`❌ Erro no Marketplace de ${product.name}:`, error);
          stepResults.marketplace.errors++;
          totalErrors++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 3. ANYMARKET (sincronização individual)
      console.log('🔄 === ETAPA 3: ANYMARKET ===');
      setBatchAllProgress(prev => ({ ...prev, currentStep: 'Anymarket' }));
      
      for (let i = 0; i < productsToProcess.length; i++) {
        const product = productsToProcess[i];
        const stepIndex = i * 5 + 3;
        
        setBatchAllProgress(prev => ({
          ...prev,
          current: stepIndex,
          currentProduct: product.name
        }));

        try {
          console.log(`🔄 Sincronizando Anymarket para produto ${i + 1}/${productsToProcess.length}: ${product.name}`);
          
          const response = await fetch('/api/anymarket/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setProductsWithAnymarketSync(prev => {
                if (!prev.includes(product.id)) {
                  return [...prev, product.id];
                }
                return prev;
              });
              stepResults.anymarket.success++;
              totalSuccess++;
            } else {
              stepResults.anymarket.errors++;
              totalErrors++;
            }
          } else {
            stepResults.anymarket.errors++;
            totalErrors++;
          }
        } catch (error) {
          console.error(`❌ Erro no Anymarket de ${product.name}:`, error);
          stepResults.anymarket.errors++;
          totalErrors++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 4. ATUALIZAÇÃO DE ESTOQUE
      console.log('📦 === ETAPA 4: ATUALIZAÇÃO DE ESTOQUE ===');
      setBatchAllProgress(prev => ({ ...prev, currentStep: 'Atualização de Estoque' }));
      
      for (let i = 0; i < productsToProcess.length; i++) {
        const product = productsToProcess[i];
        const stepIndex = i * 5 + 4;
        
        setBatchAllProgress(prev => ({
          ...prev,
          current: stepIndex,
          currentProduct: product.name
        }));

        try {
          console.log(`📦 Atualizando estoque para produto ${i + 1}/${productsToProcess.length}: ${product.name}`);
          
          const response = await fetch(`/api/products/${product.id}/stock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stock: product.stock || 0
            })
          });

          if (response.ok) {
            stepResults.stock.success++;
            totalSuccess++;
          } else {
            stepResults.stock.errors++;
            totalErrors++;
          }
        } catch (error) {
          console.error(`❌ Erro na atualização de estoque de ${product.name}:`, error);
          stepResults.stock.errors++;
          totalErrors++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 5. CROP DE IMAGENS
      console.log('✂️ === ETAPA 5: CROP DE IMAGENS ===');
      setBatchAllProgress(prev => ({ ...prev, currentStep: 'Crop de Imagens' }));
      
      for (let i = 0; i < productsToProcess.length; i++) {
        const product = productsToProcess[i];
        const stepIndex = i * 5 + 5;
        
        setBatchAllProgress(prev => ({
          ...prev,
          current: stepIndex,
          currentProduct: product.name
        }));

        try {
          console.log(`✂️ Processando crop para produto ${i + 1}/${productsToProcess.length}: ${product.name}`);
          
          const response = await fetch('/api/crop-images-vtex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              anymarketId: product.anymarket_id
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setProductsWithCroppedImages(prev => {
                if (!prev.includes(product.id)) {
                  return [...prev, product.id];
                }
                return prev;
              });
              stepResults.crop.success++;
              totalSuccess++;
            } else {
              stepResults.crop.errors++;
              totalErrors++;
            }
          } else {
            stepResults.crop.errors++;
            totalErrors++;
          }
        } catch (error) {
          console.error(`❌ Erro no crop de ${product.name}:`, error);
          stepResults.crop.errors++;
          totalErrors++;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error('❌ Erro geral no processamento All:', error);
    } finally {
      setBatchAllProgress({
        current: 0,
        total: 0,
        currentProduct: '',
        currentStep: '',
        isRunning: false,
        completedSteps: {
          analysis: 0,
          marketplace: 0,
          anymarket: 0,
          stock: 0,
          crop: 0
        }
      });

      // Mostrar resultado final detalhado
      let resultMessage = `🎉 Processamento "All" concluído!\n\n`;
      resultMessage += `📊 RESUMO GERAL:\n`;
      resultMessage += `✅ Total de sucessos: ${totalSuccess}\n`;
      resultMessage += `❌ Total de erros: ${totalErrors}\n\n`;
      
      resultMessage += `📸 ANÁLISE DE IMAGENS:\n`;
      resultMessage += `✅ Sucessos: ${stepResults.analysis.success}\n`;
      resultMessage += `❌ Erros: ${stepResults.analysis.errors}\n\n`;
      
      resultMessage += `📝 MARKETPLACE:\n`;
      resultMessage += `✅ Sucessos: ${stepResults.marketplace.success}\n`;
      resultMessage += `❌ Erros: ${stepResults.marketplace.errors}\n\n`;
      
      resultMessage += `🔄 ANYMARKET:\n`;
      resultMessage += `✅ Sucessos: ${stepResults.anymarket.success}\n`;
      resultMessage += `❌ Erros: ${stepResults.anymarket.errors}\n\n`;
      
      resultMessage += `📦 ESTOQUE:\n`;
      resultMessage += `✅ Sucessos: ${stepResults.stock.success}\n`;
      resultMessage += `❌ Erros: ${stepResults.stock.errors}\n\n`;
      
      resultMessage += `✂️ CROP DE IMAGENS:\n`;
      resultMessage += `✅ Sucessos: ${stepResults.crop.success}\n`;
      resultMessage += `❌ Erros: ${stepResults.crop.errors}`;
      
      alert(resultMessage);
      
      // Limpar seleção
      setSelectedProducts([]);
    }
  };

  const performAnymarketSync = async () => {
    if (!selectedProductForTool) return;

    try {
      console.log('🔄 Iniciando sincronização com Anymarket...');
      
      const response = await fetch('/api/anymarket/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProductForTool.id
        })
      });

      console.log('📡 Resposta recebida:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, errorText);
        alert(`❌ Erro HTTP ${response.status}: ${errorText}`);
        return;
      }

      const result = await response.json();
      console.log('📊 Resultado da sincronização:', result);
      
      if (result.success) {
        alert(`✅ Produto sincronizado com sucesso!\n\nTítulo: ${result.data.title}\nID_ANY: ${result.data.anymarket_id}`);
        console.log('✅ Sincronização realizada:', result.data);
        
        // Adicionar produto à lista de sincronizados
        setProductsWithAnymarketSync(prev => [...prev, selectedProductForTool.id]);
        
        // Recarregar logs de sincronização
        try {
          const response = await fetch(`/api/anymarket/sync-logs?productId=${selectedProductForTool.id}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setAnymarketSyncLogs(result.data || []);
            }
          }
        } catch (error) {
          console.error('Erro ao recarregar logs:', error);
        }
      } else {
        console.error('❌ Erro na sincronização:', result.message);
        alert('❌ Erro na sincronização: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar com Anymarket:', error);
      alert('❌ Erro de conexão ao sincronizar com Anymarket: ' + (error as Error).message);
    }
  };

  const handleShowSyncLogDetails = (log: any) => {
    setSelectedSyncLog(log);
    setShowSyncLogsModal(true);
  };

  const handleGenerateAnalysis = async () => {
    if (!selectedProductForAnalysis) {
      console.log('❌ Nenhum produto selecionado para análise');
      return;
    }

    console.log('🔄 Iniciando análise para produto:', selectedProductForAnalysis.name, 'ID:', selectedProductForAnalysis.id);

    try {
      setAnalyzingSingleImage(true);
      setAnalysisError(null);
      
      // Fechar modais
      setShowAnalysisSelectionModal(false);
      setShowImageAnalysisModal(false);
      
      // Adicionar timestamp para evitar cache
      const timestamp = Date.now();
      
      console.log('📡 Enviando requisição para API...');
      const response = await fetch('/api/analyze-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          productId: selectedProductForAnalysis.id,
          timestamp: timestamp,
          forceNewAnalysis: true
        }),
      });

      console.log('📡 Resposta recebida, status:', response.status);
      const result = await response.json();

      if (result.success) {
        console.log('✅ Análise concluída para:', selectedProductForAnalysis.name);
        
        // Atualizar lista de produtos com análise
        if (selectedProductForAnalysis) {
          setProductsWithAnalysis(prev => Array.from(new Set([...prev, selectedProductForAnalysis.id])));
        }
        
        // Mostrar mensagem de sucesso
        alert(`Análise concluída com sucesso para: ${selectedProductForAnalysis.name}`);
      } else {
        console.log('❌ Erro na análise:', result.message);
        alert(`Erro na análise: ${result.message || 'Erro ao analisar imagens'}`);
      }
    } catch (error) {
      console.error('❌ Erro ao analisar imagens:', error);
      alert(`Erro de conexão: ${(error as Error).message}`);
    } finally {
      setAnalyzingSingleImage(false);
    }
  };

  return (
    <Layout title="Produtos" subtitle="Gerencie os produtos importados da VTEX">

      {/* Filtros */}
      <ProductFiltersComponent
        filters={filters}
        onFiltersChange={updateFilters}
        onClearFilters={clearFilters}
      />

      {/* Ações em Lote */}
      {selectedProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 relative z-[100]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                {selectedProducts.length} produto(s) selecionado(s)
              </p>
              
              {/* Barra de Progresso - Análise de Imagens */}
              {batchAnalysisProgress.isRunning && (
                <div className="w-full relative z-[110] mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Analisando: {batchAnalysisProgress.currentProduct}</span>
                    <span>{batchAnalysisProgress.current}/{batchAnalysisProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${batchAnalysisProgress.total > 0 ? (batchAnalysisProgress.current / batchAnalysisProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((batchAnalysisProgress.current / batchAnalysisProgress.total) * 100)}% concluído
                  </div>
                </div>
              )}

              {/* Barra de Progresso - Marketplace */}
              {batchMarketplaceProgress.isRunning && (
                <div className="w-full relative z-[110] mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Gerando Marketplace: {batchMarketplaceProgress.currentProduct}</span>
                    <span>{batchMarketplaceProgress.current}/{batchMarketplaceProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${batchMarketplaceProgress.total > 0 ? (batchMarketplaceProgress.current / batchMarketplaceProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((batchMarketplaceProgress.current / batchMarketplaceProgress.total) * 100)}% concluído
                  </div>
                </div>
              )}

              {/* Barra de Progresso - Anymarket */}
              {batchAnymarketProgress.isRunning && (
                <div className="w-full relative z-[110] mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Sincronizando Anymarket: {batchAnymarketProgress.currentProduct}</span>
                    <span>{batchAnymarketProgress.current}/{batchAnymarketProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${batchAnymarketProgress.total > 0 ? (batchAnymarketProgress.current / batchAnymarketProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((batchAnymarketProgress.current / batchAnymarketProgress.total) * 100)}% concluído
                  </div>
                </div>
              )}

              {/* Barra de Progresso - Atualização de Estoque */}
              {batchStockProgress.isRunning && (
                <div className="w-full relative z-[110] mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Atualizando Estoque: {batchStockProgress.currentProduct}</span>
                    <span>{batchStockProgress.current}/{batchStockProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${batchStockProgress.total > 0 ? (batchStockProgress.current / batchStockProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((batchStockProgress.current / batchStockProgress.total) * 100)}% concluído
                  </div>
                </div>
              )}

              {/* Barra de Progresso - Crop de Imagens */}
              {batchCropProgress.isRunning && (
                <div className="w-full relative z-[110] mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Processando Crop: {batchCropProgress.currentProduct}</span>
                    <span>{batchCropProgress.current}/{batchCropProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${batchCropProgress.total > 0 ? (batchCropProgress.current / batchCropProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((batchCropProgress.current / batchCropProgress.total) * 100)}% concluído
                  </div>
                </div>
              )}

              {/* Barra de Progresso - Processamento "All" */}
              {batchAllProgress.isRunning && (
                <div className="w-full relative z-[110] mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Processamento All - {batchAllProgress.currentStep}: {batchAllProgress.currentProduct}</span>
                    <span>{batchAllProgress.current}/{batchAllProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 via-yellow-500 via-green-500 via-purple-500 to-orange-500 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${batchAllProgress.total > 0 ? (batchAllProgress.current / batchAllProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((batchAllProgress.current / batchAllProgress.total) * 100)}% concluído
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    📸 Análise → 📝 Marketplace → 🔄 Anymarket → 📦 Estoque → ✂️ Crop
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 ml-4">
              <button
                onClick={handleAnalyzeSelectedImages}
                disabled={batchAnalysisProgress.isRunning || batchMarketplaceProgress.isRunning || batchAnymarketProgress.isRunning || batchStockProgress.isRunning || batchCropProgress.isRunning || batchAllProgress.isRunning}
                className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchAnalysisProgress.isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {batchAnalysisProgress.isRunning ? 'Analisando...' : 'Analisar Imagens'}
              </button>
              <button
                onClick={handleGenerateMeliBatch}
                disabled={batchMarketplaceProgress.isRunning || batchAnalysisProgress.isRunning || batchAnymarketProgress.isRunning || batchStockProgress.isRunning || batchCropProgress.isRunning || batchAllProgress.isRunning}
                className="px-4 py-2 text-yellow-600 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchMarketplaceProgress.isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <span className="h-4 w-4 mr-2 flex items-center justify-center font-bold text-sm">M</span>
                )}
                {batchMarketplaceProgress.isRunning ? 'Gerando...' : 'Marketplace'}
              </button>
              <button
                onClick={handleAnymarketSyncBatch}
                disabled={batchAnymarketProgress.isRunning || batchAnalysisProgress.isRunning || batchMarketplaceProgress.isRunning || batchStockProgress.isRunning || batchCropProgress.isRunning || batchAllProgress.isRunning}
                className="px-4 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchAnymarketProgress.isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <span className="h-4 w-4 mr-2 flex items-center justify-center font-bold text-sm">A</span>
                )}
                {batchAnymarketProgress.isRunning ? 'Sincronizando...' : 'Anymarket'}
              </button>
              <button
                onClick={handleUpdateStockBatch}
                disabled={batchStockProgress.isRunning || batchAnalysisProgress.isRunning || batchMarketplaceProgress.isRunning || batchAnymarketProgress.isRunning || batchCropProgress.isRunning || batchAllProgress.isRunning}
                className="px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchStockProgress.isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Warehouse className="h-4 w-4 mr-2" />
                )}
                {batchStockProgress.isRunning ? 'Atualizando...' : 'Atualizar Estoque'}
              </button>
              <button
                onClick={handleBatchCropImages}
                disabled={batchCropProgress.isRunning || batchAnalysisProgress.isRunning || batchMarketplaceProgress.isRunning || batchAnymarketProgress.isRunning || batchStockProgress.isRunning || batchAllProgress.isRunning}
                className="px-4 py-2 text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchCropProgress.isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Crop className="h-4 w-4 mr-2" />
                )}
                {batchCropProgress.isRunning ? 'Processando...' : 'Crop Imagens'}
              </button>
              <button
                onClick={handleBatchAll}
                disabled={batchAllProgress.isRunning || batchAnalysisProgress.isRunning || batchMarketplaceProgress.isRunning || batchAnymarketProgress.isRunning || batchStockProgress.isRunning || batchCropProgress.isRunning}
                className="px-4 py-2 text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                {batchAllProgress.isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <span className="h-4 w-4 mr-2 flex items-center justify-center font-bold text-sm">ALL</span>
                )}
                {batchAllProgress.isRunning ? 'Processando All...' : 'ALL'}
              </button>
              <button
                onClick={handleExportSelected}
                disabled={isExporting || batchStockProgress.isRunning || batchAnalysisProgress.isRunning || batchMarketplaceProgress.isRunning || batchAnymarketProgress.isRunning || batchCropProgress.isRunning || batchAllProgress.isRunning}
                className="px-4 py-2 text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting ? 'Exportando...' : 'Exportar XLSX'}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isExporting || batchAnalysisProgress.isRunning || batchMarketplaceProgress.isRunning || batchAnymarketProgress.isRunning || batchStockProgress.isRunning}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Selecionados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Produtos */}
      <div className={isExporting || batchAnalysisProgress.isRunning || batchMarketplaceProgress.isRunning || batchAnymarketProgress.isRunning || batchStockProgress.isRunning ? 'pointer-events-none opacity-75' : ''}>
        <ProductTable
          products={products}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalProducts={totalProducts}
          itemsPerPage={itemsPerPage}
          sort={sort}
          selectedProducts={selectedProducts}
          onSort={updateSort}
          onPageChange={updatePage}
          onItemsPerPageChange={updateItemsPerPage}
          onProductSelect={handleSelectProduct}
          onSelectAll={handleSelectAll}
          onViewProduct={handleViewProduct}
          onDeleteProduct={handleDeleteProduct}
          onAnalyzeImages={handleAnalyzeImages}
          onGenerateMarketplaceDescription={handleGenerateMarketplaceDescription}
          onSyncAnymarketing={handleSyncAnymarketing}
          onCropImages={handleCropImages}
          productsWithAnalysis={productsWithAnalysis}
          productsWithMarketplace={productsWithMarketplace}
          productsWithAnymarketSync={productsWithAnymarketSync}
          productsWithCroppedImages={productsWithCroppedImages}
        />
      </div>

      {/* Modal de Detalhes do Produto */}
      {console.log('🔍 Estado do modal - showModal:', showModal, 'selectedProduct:', selectedProduct?.name)}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
                  <p className="text-gray-600">RefId: {selectedProduct.ref_id || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Carregando detalhes...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações Básicas</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Nome:</span>
                          <p className="text-gray-900">{selectedProduct.name}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">RefId:</span>
                          <p className="text-gray-900 font-mono">{selectedProduct.ref_id || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Título:</span>
                          <p className="text-gray-900">{selectedProduct.title || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Marca:</span>
                          <p className="text-gray-900">{selectedProduct.brand_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Categoria:</span>
                          <p className="text-gray-900">{selectedProduct.category_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Status</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">Ativo:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedProduct.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedProduct.is_active ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">Visível:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedProduct.is_visible 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedProduct.is_visible ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">SKUs:</span>
                          <p className="text-gray-900">{(selectedProduct as any).stats?.skuCount || selectedProduct.sku_count || 0}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Imagens:</span>
                          <p className="text-gray-900">{(selectedProduct as any).stats?.imageCount || selectedProduct.image_count || 0}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Análises:</span>
                          <p className="text-gray-900">{(selectedProduct as any).stats?.analysisCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  {selectedProduct.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
                    </div>
                  )}

                  {/* SKUs */}
                  {productSKUs.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">SKUs ({productSKUs.length})</h3>
                      <div className="space-y-2">
                        {productSKUs.map((sku, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{sku.name_complete}</p>
                                <p className="text-sm text-gray-500">ID: {sku.vtex_id}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(sku.vtex_id.toString(), `sku-${sku.vtex_id}`)}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {copiedText === `sku-${sku.vtex_id}` ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Imagens */}
                  {productImages.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Imagens ({productImages.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {productImages.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={image.file_url}
                              alt={image.name}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <div className="absolute top-2 right-2">
                              <button
                                onClick={() => copyToClipboard(image.file_url, `image-${image.id}`)}
                                className="p-1 bg-black/50 text-white rounded hover:bg-black/70 transition-colors"
                              >
                                {copiedText === `image-${image.id}` ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Análises de Imagem */}
                  {(selectedProduct as any).analysisLogs && (selectedProduct as any).analysisLogs.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Análises de Imagem ({(selectedProduct as any).analysisLogs.length})</h3>
                      <div className="space-y-3">
                        {(selectedProduct as any).analysisLogs.map((analysis: any, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">Agente:</span>
                                <span className="text-sm text-gray-900">{analysis.agent_name || 'N/A'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">Modelo:</span>
                                <span className="text-sm text-gray-900">{analysis.model_used || 'N/A'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">Tokens:</span>
                                <span className="text-sm text-gray-900">{analysis.tokens_used || 0}</span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Criado em:</span> {formatDate(analysis.created_at)}
                            </div>
                            {analysis.contextual_analysis && (
                              <div className="mt-2">
                                <button
                                  onClick={() => copyToClipboard(analysis.contextual_analysis, `analysis-${analysis.id}`)}
                                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  {copiedText === `analysis-${analysis.id}` ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Copiado!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copiar análise
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logs de Sincronização Anymarket */}
                  {productSyncLogs.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Sincronizações Anymarket ({productSyncLogs.length})</h3>
                      <div className="space-y-3">
                        {productSyncLogs.map((log: any, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">ID_ANY:</span>
                                <span className="text-sm text-gray-900 font-mono">{log.anymarket_id}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">Status:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  log.success 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {log.success ? 'Sucesso' : 'Erro'}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Sincronizado em:</span> {formatDate(log.created_at)}
                            </div>
                            {log.title && (
                              <div className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">Título:</span> {log.title}
                              </div>
                            )}
                            {log.error_message && (
                              <div className="text-sm text-red-600 mb-2">
                                <span className="font-medium">Erro:</span> {log.error_message}
                              </div>
                            )}
                            {log.description && (
                              <div className="mt-2">
                                <button
                                  onClick={() => copyToClipboard(log.description, `sync-${log.id}`)}
                                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  {copiedText === `sync-${log.id}` ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Copiado!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copiar descrição
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">
                <ExternalLink className="h-4 w-4 mr-2 inline" />
                Ver na VTEX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Anymarket */}
      {showAnymarketingModal && selectedProductForTool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <RefreshCw className="w-8 h-8 text-green-600 mr-3" />
                  Anymarket - {selectedProductForTool.name}
                </h2>
                <button
                  onClick={() => {
                    setShowAnymarketingModal(false);
                    setAnymarketSyncLogs([]);
                    setSelectedProductForTool(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Informações do Produto */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Informações do Produto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">Nome:</span>
                      <p className="text-blue-600">{selectedProductForTool.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">RefId:</span>
                      <p className="text-blue-600 font-mono">{selectedProductForTool.ref_id || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">ID_ANY:</span>
                      <p className="text-blue-600 font-mono">{selectedProductForTool.anymarket_id || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Status:</span>
                      <p className="text-blue-600">
                        {productsWithAnymarketSync.includes(selectedProductForTool.id) ? 'Sincronizado' : 'Não sincronizado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botão de Sincronização */}
                <div className="text-center">
                  <button
                    onClick={performAnymarketSync}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Sincronizar com Anymarket
                  </button>
                </div>

                {/* Histórico de Sincronizações */}
                {loadingAnymarketLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">Carregando histórico...</span>
                  </div>
                ) : anymarketSyncLogs.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Histórico de Sincronizações ({anymarketSyncLogs.length})
                    </h3>
                    <div className="space-y-3">
                      {anymarketSyncLogs.map((log: any, index: number) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-500">ID_ANY:</span>
                              <span className="text-sm text-gray-900 font-mono">{log.anymarket_id}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-500">Status:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.success 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {log.success ? 'Sucesso' : 'Erro'}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Sincronizado em:</span> {formatDate(log.created_at)}
                          </div>
                          {log.title && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Título:</span> {log.title}
                            </div>
                          )}
                          {log.error_message && (
                            <div className="text-sm text-red-600 mb-2">
                              <span className="font-medium">Erro:</span> {log.error_message}
                            </div>
                          )}
                          {log.description && (
                            <div className="mt-2">
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => copyToClipboard(log.description, `anymarket-${log.id}`)}
                                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  {copiedText === `anymarket-${log.id}` ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Copiado!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copiar descrição
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleShowSyncLogDetails(log)}
                                  className="text-sm text-green-600 hover:text-green-800 flex items-center"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver detalhes
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RefreshCw className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhuma sincronização encontrada
                    </h3>
                    <p className="text-gray-600">
                      Este produto ainda não foi sincronizado com o Anymarket.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => {
                    setShowAnymarketingModal(false);
                    setAnymarketSyncLogs([]);
                    setSelectedProductForTool(null);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes dos Logs de Sincronização */}
      {showSyncLogsModal && selectedSyncLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Eye className="w-6 h-6 mr-3 text-green-600" />
                  Detalhes da Sincronização
                </h2>
                <button
                  onClick={() => {
                    setShowSyncLogsModal(false);
                    setSelectedSyncLog(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Informações da Sincronização</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">ID_ANY:</span>
                      <p className="text-gray-600 font-mono">{selectedSyncLog.anymarket_id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedSyncLog.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedSyncLog.success ? 'Sucesso' : 'Erro'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Data:</span>
                      <p className="text-gray-600">{formatDate(selectedSyncLog.created_at)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Título:</span>
                      <p className="text-gray-600">{selectedSyncLog.title}</p>
                    </div>
                  </div>
                </div>

                {/* Dados Enviados */}
                {selectedSyncLog.response_data && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-3">Dados Enviados para Anymarket</h3>
                    <div className="space-y-3">
                      {selectedSyncLog.response_data.characteristics && (
                        <div>
                          <h4 className="font-medium text-blue-700 mb-2">Características Enviadas:</h4>
                          <div className="space-y-2">
                            {selectedSyncLog.response_data.characteristics.map((char: any, index: number) => (
                              <div key={index} className="flex items-center space-x-2 text-sm">
                                <span className="font-medium text-blue-600">{char.name}:</span>
                                <span className="text-blue-500">{char.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedSyncLog.response_data.title && (
                        <div>
                          <h4 className="font-medium text-blue-700 mb-1">Título:</h4>
                          <p className="text-blue-600 text-sm">{selectedSyncLog.response_data.title}</p>
                        </div>
                      )}
                      {selectedSyncLog.response_data.description && (
                        <div>
                          <h4 className="font-medium text-blue-700 mb-1">Descrição:</h4>
                          <p className="text-blue-600 text-sm max-h-32 overflow-y-auto">
                            {selectedSyncLog.response_data.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Erro (se houver) */}
                {selectedSyncLog.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-3">Erro</h3>
                    <p className="text-red-600 text-sm">{selectedSyncLog.error_message}</p>
                  </div>
                )}

                {/* Resposta da API */}
                {selectedSyncLog.response_data && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Resposta da API Anymarket</h3>
                    <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(selectedSyncLog.response_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowSyncLogsModal(false);
                    setSelectedSyncLog(null);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise de Imagens */}
      {showImageAnalysisModal && selectedProductForAnalysis && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Image className="w-6 h-6 mr-3 text-purple-600" />
                  Análise de Imagens - {selectedProductForAnalysis.name}
                </h2>
                <button
                  onClick={() => {
                    setShowImageAnalysisModal(false);
                    setCurrentAnalysisData(null);
                    setSelectedProductForAnalysis(null);
                    setAnalysisError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {currentAnalysisData ? (
                  <>
                    {/* Análise Existente */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800">Análise já existe</p>
                          <p className="text-xs text-green-600">
                            Criada em: {new Date(currentAnalysisData.analysis_log?.created_at || Date.now()).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Informações do Agente */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">Agente Utilizado</h3>
                      <p className="text-blue-800">{currentAnalysisData.agent_used}</p>
                      {currentAnalysisData.analysis.agent_configuration && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-blue-700">Modelo:</span>
                            <p className="text-blue-600">{currentAnalysisData.analysis.agent_configuration.model}</p>
                          </div>
                          <div>
                            <span className="font-medium text-blue-700">Max Tokens:</span>
                            <p className="text-blue-600">{currentAnalysisData.analysis.agent_configuration.max_tokens}</p>
                          </div>
                          <div>
                            <span className="font-medium text-blue-700">Qualidade:</span>
                            <p className="text-blue-600 capitalize">{currentAnalysisData.analysis.agent_configuration.quality_level}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resumo da Análise */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Tipo de Produto</h4>
                        <p className="text-lg font-bold text-blue-600 capitalize">{currentAnalysisData.analysis.product_type}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Imagens Analisadas</h4>
                        <p className="text-2xl font-bold text-green-600">{currentAnalysisData.analysis.image_count}</p>
                        {currentAnalysisData.analysis.invalid_image_count > 0 && (
                          <p className="text-xs text-red-600 mt-1">{currentAnalysisData.analysis.invalid_image_count} inválidas</p>
                        )}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Qualidade da Análise</h4>
                        <p className="text-lg font-bold text-indigo-600 capitalize">{currentAnalysisData.analysis.analysis_quality?.level || 'Média'}</p>
                        <p className="text-xs text-gray-500 mt-1">{currentAnalysisData.analysis.agent_configuration?.model || 'N/A'}</p>
                      </div>
                    </div>


                    {/* Indicador de Análise com GPT-4o */}
                    {currentAnalysisData.analysis.openai_analysis && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm mr-2">🤖</span>
                            <span className="font-semibold text-purple-900">Análise com GPT-4o</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {currentAnalysisData.analysis.openai_analysis.tokens_used && (
                              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                {currentAnalysisData.analysis.openai_analysis.tokens_used} tokens
                              </span>
                            )}
                            {currentAnalysisData.analysis.agent_configuration?.model && (
                              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                {currentAnalysisData.analysis.agent_configuration.model}
                              </span>
                            )}
                            {currentAnalysisData.analysis.agent_configuration?.max_tokens && (
                              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                Max: {currentAnalysisData.analysis.agent_configuration.max_tokens}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Análise Contextualizada Rica */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm mr-2">
                          {currentAnalysisData.analysis.openai_analysis ? '🤖' : '📊'}
                        </span>
                        {currentAnalysisData.analysis.openai_analysis ? 'Análise com GPT-4o' : 'Análise Técnica Contextualizada'}
                      </h3>
                      <div className="bg-white rounded-lg p-4 border border-green-100">
                        <p className="text-gray-700 leading-relaxed text-sm">
                          {currentAnalysisData.analysis.contextual_analysis}
                        </p>
                      </div>
                    </div>


                    {/* Imagens Analisadas */}
                    {currentAnalysisData.images && currentAnalysisData.images.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Imagens Analisadas ({currentAnalysisData.images.length} válidas)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {currentAnalysisData.images.map((image: any) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.url}
                                alt={image.alt_text || 'Imagem do produto'}
                                className="w-full h-24 object-cover rounded-lg border border-gray-200 group-hover:border-blue-300 transition-colors"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VtPC90ZXh0Pjwvc3ZnPg==';
                                }}
                              />
                              {image.is_primary && (
                                <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                  Principal
                                </span>
                              )}
                              <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                                ✓
                              </div>
                              {image.name && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  {image.name}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Mostrar imagens inválidas se houver */}
                        {currentAnalysisData.invalid_images && currentAnalysisData.invalid_images.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-red-600 mb-2">⚠️ Imagens com Problemas ({currentAnalysisData.invalid_images.length})</h4>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <ul className="text-sm text-red-700 space-y-1">
                                {currentAnalysisData.invalid_images.map((image: any, index: number) => (
                                  <li key={index}>• {image.file_location} - {image.error}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleGenerateNewAnalysis(true)}
                        disabled={analyzingSingleImage}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {analyzingSingleImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Regenerando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerar Análise
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => copyToClipboard(currentAnalysisData.analysis.contextual_analysis, 'image-analysis')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                      >
                        {copiedText === 'image-analysis' ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Análise
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Gerar Nova Análise */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Image className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Gerar Análise de Imagens
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Analise as imagens do produto usando IA para obter insights técnicos e descrições detalhadas.
                      </p>
                      <button
                        onClick={() => handleGenerateNewAnalysis(false)}
                        disabled={analyzingSingleImage}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
                      >
                        {analyzingSingleImage ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 mr-2" />
                            Gerar Análise
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Marketplace */}
      {showMarketplaceModal && selectedProductForTool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <span className="w-8 h-8 bg-yellow-500 text-white rounded-lg flex items-center justify-center mr-3 text-lg font-bold">M</span>
                  Marketplace - {selectedProductForTool.name}
                </h2>
                <button
                  onClick={() => {
                    setShowMarketplaceModal(false);
                    setMarketplaceDescription(null);
                    setSelectedProductForTool(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {marketplaceDescription ? (
                  <>
                    {/* Descrição Existente */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800">Descrição já existe</p>
                          <p className="text-xs text-green-600">
                            Criada em: {formatDate(marketplaceDescription.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Título */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Título Otimizado</h3>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-900 font-medium">{marketplaceDescription.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {marketplaceDescription.title.length} caracteres
                        </p>
                      </div>
                    </div>

                    {/* Descrição */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição Completa</h3>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div 
                          className="text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: marketplaceDescription.description }}
                        />
                      </div>
                    </div>

                    {/* Informações do Produto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {marketplaceDescription.clothing_type && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Tipo de Roupa</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.clothing_type}</p>
                          </div>
                        </div>
                      )}
                      
                      {marketplaceDescription.sleeve_type && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Tipo de Manga</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.sleeve_type}</p>
                          </div>
                        </div>
                      )}
                      
                      {marketplaceDescription.gender && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Gênero</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.gender}</p>
                          </div>
                        </div>
                      )}
                      
                      {marketplaceDescription.color && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Cor</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.color}</p>
                          </div>
                        </div>
                      )}

                      {marketplaceDescription.seller_sku && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">SKU (SELLER_SKU)</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.seller_sku}</p>
                          </div>
                        </div>
                      )}

                      {marketplaceDescription.wedge_shape && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Forma de Caimento (WEDGE_SHAPE)</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.wedge_shape}</p>
                          </div>
                        </div>
                      )}

                      {marketplaceDescription.is_sportive && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">É Esportiva (IS_SPORTIVE)</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.is_sportive}</p>
                          </div>
                        </div>
                      )}

                      {marketplaceDescription.main_color && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Cor Principal (MAIN_COLOR)</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.main_color}</p>
                          </div>
                        </div>
                      )}

                      {marketplaceDescription.item_condition && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Condição do Item (ITEM_CONDITION)</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.item_condition}</p>
                          </div>
                        </div>
                      )}

                      {marketplaceDescription.brand && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Marca (BRAND)</h4>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium">{marketplaceDescription.brand}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Variações do Nome (Modelo) */}
                    {marketplaceDescription.modelo && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Variações do Nome</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800 font-medium mb-2">Termos de busca alternativos:</p>
                          <div className="flex flex-wrap gap-2">
                            {marketplaceDescription.modelo.split(',').map((termo: string, index: number) => (
                              <span 
                                key={index}
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                              >
                                {termo.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Informações Técnicas */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3">Informações Técnicas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-blue-700">Agente:</span>
                          <p className="text-blue-600">{marketplaceDescription.agent_used || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-blue-700">Modelo:</span>
                          <p className="text-blue-600">{marketplaceDescription.model_used || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-blue-700">Tokens:</span>
                          <p className="text-blue-600">{marketplaceDescription.tokens_used || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleGenerateMeliDescription(true)}
                        disabled={generatingMarketplace}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {generatingMarketplace ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Regenerando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerar Descrição
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          // Remover tags HTML para copiar apenas o texto
                          const textOnly = marketplaceDescription.description
                            .replace(/<br\s*\/?>/gi, '\n')
                            .replace(/<li>/gi, '• ')
                            .replace(/<\/li>/gi, '\n')
                            .replace(/<b>/gi, '')
                            .replace(/<\/b>/gi, '')
                            .replace(/<[^>]*>/g, '')
                            .trim();
                          copyToClipboard(textOnly, 'marketplace-description');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                      >
                        {copiedText === 'marketplace-description' ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Descrição
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Gerar Nova Descrição */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-yellow-600">M</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Gerar Descrição para Marketplace
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Produto: <span className="font-medium">{selectedProductForTool.name}</span>
                      </p>
                      
                      <button
                        onClick={() => handleGenerateMeliDescription(false)}
                        disabled={generatingMarketplace}
                        className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {generatingMarketplace ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Gerando Descrição...
                          </>
                        ) : (
                          <>
                            <span className="text-lg font-bold mr-2">M</span>
                            Gerar Descrição do Marketplace
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => {
                    setShowMarketplaceModal(false);
                    setMarketplaceDescription(null);
                    setSelectedProductForTool(null);
                  }}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Análise */}
      {showAnalysisSelectionModal && selectedProductForAnalysis && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Image className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {existingAnalysis ? 'Análise Existente' : 'Análise de Imagens'}
              </h3>
              <p className="text-gray-600 mb-6">
                Produto: <span className="font-medium">{selectedProductForAnalysis.name}</span>
              </p>
              
              {existingAnalysis && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800">Análise já existe</p>
                      <p className="text-xs text-green-600">
                        Criada em: {new Date(existingAnalysis.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {existingAnalysis ? (
                  <>
                    <button
                      onClick={handleViewExistingAnalysis}
                      disabled={analyzingSingleImage}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {analyzingSingleImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Carregando...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Análise Existente
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleGenerateAnalysis}
                      disabled={analyzingSingleImage}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {analyzingSingleImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Regenerando...
                        </>
                      ) : (
                        <>
                          <Image className="w-4 h-4 mr-2" />
                          Regenerar Análise
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleGenerateAnalysis}
                    disabled={analyzingSingleImage}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {analyzingSingleImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Gerando Análise...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4 mr-2" />
                        Gerar Nova Análise
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowAnalysisSelectionModal(false);
                    setSelectedProductForAnalysis(null);
                    setExistingAnalysis(null);
                  }}
                  className="w-full px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading de Análise - Apenas para análise individual */}
      {analyzingSingleImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analisando Imagens</h3>
            <p className="text-gray-600 text-center">
              O agente de IA está analisando as imagens do produto...
            </p>
          </div>
        </div>
      )}

      {/* Erro de Análise */}
      {analysisError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro na Análise</h3>
              <p className="text-gray-600 mb-6">{analysisError}</p>
              <button
                onClick={() => setAnalysisError(null)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Crop de Imagens */}
      <CropImagesModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setCropModalData(null);
        }}
        product={cropModalData?.product || null}
        originalImages={cropModalData?.originalImages || []}
        onProcessingComplete={handleCropProcessingComplete}
      />
    </Layout>
  );
}
