'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, Image as ImageIcon, FileText, RefreshCw, Globe, Minus, Info, AlertTriangle } from 'lucide-react';
import Layout from '@/components/Layout';

export default function DashboardPage() {
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [activeProducts, setActiveProducts] = useState<number>(0);
  const [visibleProducts, setVisibleProducts] = useState<number>(0);
  const [activeAndVisibleProducts, setActiveAndVisibleProducts] = useState<number>(0);
  const [activePercentage, setActivePercentage] = useState<number>(0);
  const [visiblePercentage, setVisiblePercentage] = useState<number>(0);
  const [activeAndVisiblePercentage, setActiveAndVisiblePercentage] = useState<number>(0);
  const [productsWithImageAnalysis, setProductsWithImageAnalysis] = useState<number>(0);
  const [productsWithoutImageAnalysis, setProductsWithoutImageAnalysis] = useState<number>(0);
  const [imageAnalysisPercentage, setImageAnalysisPercentage] = useState<number>(0);
  const [productsWithMarketplaceDescription, setProductsWithMarketplaceDescription] = useState<number>(0);
  const [productsWithoutMarketplaceDescription, setProductsWithoutMarketplaceDescription] = useState<number>(0);
  const [marketplaceDescriptionPercentage, setMarketplaceDescriptionPercentage] = useState<number>(0);
  const [productsWithAnymarketSync, setProductsWithAnymarketSync] = useState<number>(0);
  const [productsWithoutSync, setProductsWithoutSync] = useState<number>(0);
  const [syncPercentage, setSyncPercentage] = useState<number>(0);
  const [productsInAnymarket, setProductsInAnymarket] = useState<number>(0);
  const [anymarketPercentage, setAnymarketPercentage] = useState<number>(0);
  const [productsNotInAnymarket, setProductsNotInAnymarket] = useState<number>(0);
  const [notInAnymarketPercentage, setNotInAnymarketPercentage] = useState<number>(0);
  const [productsWithoutImages, setProductsWithoutImages] = useState<number>(0);
  const [withoutImagesPercentage, setWithoutImagesPercentage] = useState<number>(0);
  const [inactiveProducts, setInactiveProducts] = useState<number>(0);
  const [inactivePercentage, setInactivePercentage] = useState<number>(0);
  const [productsWithoutStock, setProductsWithoutStock] = useState<number>(0);
  const [withoutStockPercentage, setWithoutStockPercentage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductStats = async () => {
    try {
      const response = await fetch('/api/products/stats');
      const data = await response.json();
      
      if (data.success) {
        const stats = data.data;
        setTotalProducts(stats.total || 0);
        setActiveProducts(stats.active || 0);
        setVisibleProducts(stats.visible || 0);
        setActiveAndVisibleProducts(stats.activeAndVisible || 0);
        setActivePercentage(stats.percentages.active || 0);
        setVisiblePercentage(stats.percentages.visible || 0);
        setActiveAndVisiblePercentage(stats.percentages.activeAndVisible || 0);
        setProductsWithoutImages(stats.withoutImages || 0);
        setWithoutImagesPercentage(stats.percentages.withoutImages || 0);
        setInactiveProducts(stats.inactive || 0);
        setInactivePercentage(stats.percentages.inactive || 0);
        setProductsNotInAnymarket(stats.notInAnymarket || 0);
        setNotInAnymarketPercentage(stats.percentages.notInAnymarket || 0);
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar estatísticas de produtos');
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de produtos:', error);
      throw error;
    }
  };

  const fetchProductsWithImageAnalysis = async () => {
    try {
      const response = await fetch('/api/products?has_image_analysis=true&limit=1');
      const data = await response.json();
      
      if (data.success) {
        setProductsWithImageAnalysis(data.data.total || 0);
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar produtos com análise de imagem');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos com análise de imagem:', error);
      throw error;
    }
  };

  const fetchProductsWithoutImageAnalysis = async () => {
    try {
      const response = await fetch('/api/products?has_image_analysis=false&limit=1');
      const data = await response.json();
      
      if (data.success) {
        setProductsWithoutImageAnalysis(data.data.total || 0);
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar produtos sem análise de imagem');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos sem análise de imagem:', error);
      throw error;
    }
  };

  const fetchProductsWithMarketplaceDescription = async () => {
    try {
      const response = await fetch('/api/products?has_marketplace_description=true&limit=1');
      const data = await response.json();
      
      if (data.success) {
        setProductsWithMarketplaceDescription(data.data.total || 0);
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar produtos com descrição do marketplace');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos com descrição do marketplace:', error);
      throw error;
    }
  };

  const fetchProductsWithoutMarketplaceDescription = async () => {
    try {
      const response = await fetch('/api/products?has_marketplace_description=false&limit=1');
      const data = await response.json();
      
      if (data.success) {
        setProductsWithoutMarketplaceDescription(data.data.total || 0);
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar produtos sem descrição do marketplace');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos sem descrição do marketplace:', error);
      throw error;
    }
  };

  const fetchProductsWithAnymarketSync = async () => {
    try {
      const response = await fetch('/api/products?has_anymarket_sync_log=true&limit=1');
      const data = await response.json();
      
      if (data.success) {
        setProductsWithAnymarketSync(data.data.total || 0);
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar produtos com sincronização do Anymarket');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos com sincronização do Anymarket:', error);
      throw error;
    }
  };

  const fetchProductsWithoutSync = async () => {
    try {
      const response = await fetch('/api/products?has_anymarket_sync_log=false&limit=1');
      const data = await response.json();
      
      if (data.success) {
        setProductsWithoutSync(data.data.total || 0);
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar produtos sem sincronização');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos sem sincronização:', error);
      throw error;
    }
  };

  const fetchProductsInAnymarket = useCallback(async () => {
    try {
      const response = await fetch('/api/products?has_anymarket_ref_id=true&limit=1');
      const data = await response.json();
      
      if (data.success) {
        const anymarketCount = data.data.total || 0;
        setProductsInAnymarket(anymarketCount);
        
        // Calcular percentual baseado no total de produtos
        if (totalProducts > 0) {
          const percentage = Math.round((anymarketCount / totalProducts) * 100);
          setAnymarketPercentage(percentage);
        }
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar produtos no Anymarket');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos no Anymarket:', error);
      throw error;
    }
  }, [totalProducts]);

  const fetchProductsWithoutStock = useCallback(async () => {
    try {
      const response = await fetch('/api/products?stock_operator=eq&stock_value=0&limit=1');
      const data = await response.json();
      
      if (data.success) {
        const withoutStockCount = data.data.total || 0;
        setProductsWithoutStock(withoutStockCount);
        
        // Calcular percentual baseado no total de produtos
        if (totalProducts > 0) {
          const percentage = Math.round((withoutStockCount / totalProducts) * 100);
          setWithoutStockPercentage(percentage);
        }
      } else {
        console.error('API retornou erro:', data);
        throw new Error(data.message || 'Erro ao buscar produtos sem estoque');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos sem estoque:', error);
      throw error;
    }
  }, [totalProducts]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setError(null); // Limpa erros anteriores
        await Promise.all([
          fetchProductStats(),
          fetchProductsWithImageAnalysis(),
          fetchProductsWithoutImageAnalysis(),
          fetchProductsWithMarketplaceDescription(),
          fetchProductsWithoutMarketplaceDescription(),
          fetchProductsWithAnymarketSync(),
          fetchProductsWithoutSync(),
          fetchProductsInAnymarket(),
          fetchProductsWithoutStock()
        ]);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        setError(error instanceof Error ? error.message : 'Erro ao conectar com a base de dados');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [fetchProductsInAnymarket, fetchProductsWithoutStock]);

  // Recalcular percentual do Anymarket quando total de produtos mudar
  useEffect(() => {
    if (totalProducts > 0 && productsInAnymarket > 0) {
      const percentage = Math.round((productsInAnymarket / totalProducts) * 100);
      setAnymarketPercentage(percentage);
    }
  }, [totalProducts, productsInAnymarket]);

  // Calcular percentuais quando os dados mudarem
  useEffect(() => {
    console.log('📈 Dados do dashboard:', {
      totalProducts,
      productsWithImageAnalysis,
      productsWithMarketplaceDescription,
      productsWithAnymarketSync,
      productsWithoutImageAnalysis,
      productsWithoutMarketplaceDescription,
      productsWithoutSync,
      productsInAnymarket
    });
    
    if (totalProducts > 0) {
      // Percentual de análise de imagem
      const imagePercentage = (productsWithImageAnalysis / totalProducts) * 100;
      setImageAnalysisPercentage(Math.round(imagePercentage * 10) / 10);
      
      // Percentual de descrição do marketplace
      const marketplacePercentage = (productsWithMarketplaceDescription / totalProducts) * 100;
      setMarketplaceDescriptionPercentage(Math.round(marketplacePercentage * 10) / 10);
      
      // Percentual de sincronização
      const syncPercentage = (productsWithAnymarketSync / totalProducts) * 100;
      setSyncPercentage(Math.round(syncPercentage * 10) / 10);
    }
  }, [totalProducts, productsWithImageAnalysis, productsWithMarketplaceDescription, productsWithAnymarketSync, productsInAnymarket, productsWithoutImageAnalysis, productsWithoutMarketplaceDescription, productsWithoutSync]);

  return (
    <Layout title="Dashboard" subtitle="Visão geral do sistema">
      <div className="w-full">
        {/* Exibir erro se houver */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div>
                <h3 className="font-semibold">Erro de Conexão</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        {/* Grid de Cards em linha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Card de Total de Produtos */}
          <div className="aspect-square">
            <div className="bg-orange-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-orange-200 p-4 h-full flex flex-col">
              {/* Cabeçalho */}
              <div className="flex items-center mb-3 flex-shrink-0">
                <div className="w-6 h-6 bg-orange-400 rounded-lg flex items-center justify-center mr-2">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium text-orange-100 leading-tight">Total de Produtos</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="text-center w-full">
                  <div className="font-bold text-white leading-none" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
                    {loading ? (
                      <div className="animate-pulse bg-orange-300 rounded mx-auto" style={{ height: 'clamp(2rem, 8vw, 4rem)', width: 'clamp(6rem, 20vw, 8rem)' }}></div>
                    ) : (
                      <span className="break-all">{totalProducts.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Estatísticas detalhadas */}
              <div className="mt-3 space-y-1 flex-shrink-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-orange-100">Ativos:</span>
                  <span className="text-white font-medium text-xs">
                    {loading ? '...' : `${activeProducts.toLocaleString()} (${activePercentage}%)`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-orange-100">Visíveis:</span>
                  <span className="text-white font-medium text-xs">
                    {loading ? '...' : `${visibleProducts.toLocaleString()} (${visiblePercentage}%)`}
                  </span>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-left mt-2 flex-shrink-0">
                <p className="text-xs text-orange-100 leading-tight">
                  Produtos cadastrados no sistema
                </p>
              </div>
            </div>
          </div>

          {/* Card de Produtos com Análise de Imagem */}
          <div className="aspect-square">
            <div className="bg-green-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-green-200 p-4 h-full flex flex-col">
              {/* Cabeçalho */}
              <div className="flex items-center mb-3 flex-shrink-0">
                <div className="w-6 h-6 bg-green-400 rounded-lg flex items-center justify-center mr-2">
                  <ImageIcon className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium text-green-100 leading-tight">Análise de Imagem</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="text-center w-full">
                  <div className="font-bold text-white leading-none mb-2" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
                    {loading ? (
                      <div className="animate-pulse bg-green-300 rounded mx-auto" style={{ height: 'clamp(2rem, 8vw, 4rem)', width: 'clamp(6rem, 20vw, 8rem)' }}></div>
                    ) : (
                      <span className="break-all">{productsWithImageAnalysis.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-center">
                    {!loading && (productsWithoutImageAnalysis > 0 || imageAnalysisPercentage > 0) && (
                      <div className="text-xs text-green-200 flex items-center justify-center gap-1">
                        <Minus className="h-3 w-3" />
                        <span>{productsWithoutImageAnalysis.toLocaleString()}</span>
                        <span>/</span>
                        <span>{imageAnalysisPercentage}%</span>
                        <div className="group relative">
                          <Info className="h-3 w-3 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Sem análise / % com análise
                          </div>
                        </div>
                      </div>
                    )}
                    {loading && (
                      <div className="animate-pulse bg-green-300 h-3 w-16 rounded mx-auto"></div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-left mt-3 flex-shrink-0">
                <p className="text-xs text-green-100 leading-tight">
                  Produtos com análise de imagem gerada
                </p>
              </div>
            </div>
          </div>

          {/* Card de Produtos com Descrição do Marketplace */}
          <div className="aspect-square">
            <div className="bg-blue-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-blue-200 p-4 h-full flex flex-col">
              {/* Cabeçalho */}
              <div className="flex items-center mb-3 flex-shrink-0">
                <div className="w-6 h-6 bg-blue-400 rounded-lg flex items-center justify-center mr-2">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium text-blue-100 leading-tight">Descrição Anymarket</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="text-center w-full">
                  <div className="font-bold text-white leading-none mb-2" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
                    {loading ? (
                      <div className="animate-pulse bg-blue-300 rounded mx-auto" style={{ height: 'clamp(2rem, 8vw, 4rem)', width: 'clamp(6rem, 20vw, 8rem)' }}></div>
                    ) : (
                      <span className="break-all">{productsWithMarketplaceDescription.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-center">
                    {!loading && (productsWithoutMarketplaceDescription > 0 || marketplaceDescriptionPercentage > 0) && (
                      <div className="text-xs text-blue-200 flex items-center justify-center gap-1">
                        <Minus className="h-3 w-3" />
                        <span>{productsWithoutMarketplaceDescription.toLocaleString()}</span>
                        <span>/</span>
                        <span>{marketplaceDescriptionPercentage}%</span>
                        <div className="group relative">
                          <Info className="h-3 w-3 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Sem descrição / % com descrição
                          </div>
                        </div>
                      </div>
                    )}
                    {loading && (
                      <div className="animate-pulse bg-blue-300 h-3 w-16 rounded mx-auto"></div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-left mt-3 flex-shrink-0">
                <p className="text-xs text-blue-100 leading-tight">
                  Produtos com descrição para marketplace
                </p>
              </div>
            </div>
          </div>

          {/* Card de Produtos com Sincronização Anymarket */}
          <div className="aspect-square">
            <div className="bg-purple-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-purple-200 p-4 h-full flex flex-col">
              {/* Cabeçalho */}
              <div className="flex items-center mb-3 flex-shrink-0">
                <div className="w-6 h-6 bg-purple-400 rounded-lg flex items-center justify-center mr-2">
                  <RefreshCw className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium text-purple-100 leading-tight">Sincronização</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="text-center w-full">
                  <div className="font-bold text-white leading-none mb-2" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
                    {loading ? (
                      <div className="animate-pulse bg-purple-300 rounded mx-auto" style={{ height: 'clamp(2rem, 8vw, 4rem)', width: 'clamp(6rem, 20vw, 8rem)' }}></div>
                    ) : (
                      <span className="break-all">{productsWithAnymarketSync.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-center">
                    {!loading && (productsWithoutSync > 0 || syncPercentage > 0) && (
                      <p className="text-xs text-purple-200">
                        {productsWithoutSync.toLocaleString()} / {syncPercentage}%
                      </p>
                    )}
                    {loading && (
                      <div className="animate-pulse bg-purple-300 h-3 w-16 rounded mx-auto"></div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-left mt-3 flex-shrink-0">
                <p className="text-xs text-purple-100 leading-tight">
                  Produtos sincronizados no Anymarket
                </p>
              </div>
            </div>
          </div>

          {/* Card de Está no Anymarket */}
          <div className="aspect-square">
            <div className="bg-indigo-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-indigo-200 p-4 h-full flex flex-col">
              {/* Cabeçalho */}
              <div className="flex items-center mb-3 flex-shrink-0">
                <div className="w-6 h-6 bg-indigo-400 rounded-lg flex items-center justify-center mr-2">
                  <Globe className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium text-indigo-100 leading-tight">Está no Anymarket</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="text-center w-full">
                  <div className="font-bold text-white leading-none" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
                    {loading ? (
                      <div className="animate-pulse bg-indigo-300 rounded mx-auto" style={{ height: 'clamp(2rem, 8vw, 4rem)', width: 'clamp(6rem, 20vw, 8rem)' }}></div>
                    ) : (
                      <span className="break-all">{productsInAnymarket.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-xs text-indigo-200 mt-2 flex items-center justify-center gap-1">
                    <Minus className="h-3 w-3" />
                    <span>{loading ? '...' : `${(totalProducts - productsInAnymarket).toLocaleString()}`}</span>
                    <span>/</span>
                    <span>{loading ? '...' : `${anymarketPercentage}%`}</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Diferença do total / % no Anymarket
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-left mt-2 flex-shrink-0">
                <p className="text-xs text-indigo-100 leading-tight">
                  Produtos disponíveis no Anymarket
                </p>
              </div>
            </div>
          </div>

          {/* Card de Produtos sem Imagem */}
          <div className="aspect-square">
            <div className="bg-red-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-red-200 p-4 h-full flex flex-col">
              {/* Cabeçalho */}
              <div className="flex items-center mb-3 flex-shrink-0">
                <div className="w-6 h-6 bg-red-400 rounded-lg flex items-center justify-center mr-2">
                  <ImageIcon className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium text-red-100 leading-tight">Sem Imagem</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="text-center w-full">
                  <div className="font-bold text-white leading-none" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
                    {loading ? (
                      <div className="animate-pulse bg-red-300 rounded mx-auto" style={{ height: 'clamp(2rem, 8vw, 4rem)', width: 'clamp(6rem, 20vw, 8rem)' }}></div>
                    ) : (
                      <span className="break-all">{productsWithoutImages.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-xs text-red-200 mt-2 flex items-center justify-center gap-1">
                    <Minus className="h-3 w-3" />
                    <span>{loading ? '...' : `${(totalProducts - productsWithoutImages).toLocaleString()}`}</span>
                    <span>/</span>
                    <span>{loading ? '...' : `${withoutImagesPercentage}%`}</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Diferença do total / % sem imagem
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-left mt-2 flex-shrink-0">
                <p className="text-xs text-red-100 leading-tight">
                  Produtos sem imagens cadastradas
                </p>
              </div>
            </div>
          </div>

          {/* Card de Produtos Inativos */}
          <div className="aspect-square">
            <div className="bg-gray-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-gray-200 p-4 h-full flex flex-col">
              {/* Cabeçalho */}
              <div className="flex items-center mb-3 flex-shrink-0">
                <div className="w-6 h-6 bg-gray-400 rounded-lg flex items-center justify-center mr-2">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium text-gray-100 leading-tight">Inativos</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="text-center w-full">
                  <div className="font-bold text-white leading-none" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
                    {loading ? (
                      <div className="animate-pulse bg-gray-300 rounded mx-auto" style={{ height: 'clamp(2rem, 8vw, 4rem)', width: 'clamp(6rem, 20vw, 8rem)' }}></div>
                    ) : (
                      <span className="break-all">{inactiveProducts.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-200 mt-2 flex items-center justify-center gap-1">
                    <Minus className="h-3 w-3" />
                    <span>{loading ? '...' : `${(totalProducts - inactiveProducts).toLocaleString()}`}</span>
                    <span>/</span>
                    <span>{loading ? '...' : `${inactivePercentage}%`}</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Diferença do total / % inativos
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-left mt-2 flex-shrink-0">
                <p className="text-xs text-gray-100 leading-tight">
                  Produtos inativos no sistema
                </p>
              </div>
            </div>
          </div>

          {/* Card de Produtos sem Estoque */}
          <div className="aspect-square">
            <div className="bg-yellow-500 hover:shadow-lg transition-shadow rounded-lg shadow-md border border-yellow-200 p-4 h-full flex flex-col">
              {/* Cabeçalho */}
              <div className="flex items-center mb-3 flex-shrink-0">
                <div className="w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center mr-2">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium text-yellow-100 leading-tight">Sem Estoque</p>
              </div>
              
              {/* Conteúdo centralizado */}
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="text-center w-full">
                  <div className="font-bold text-white leading-none" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
                    {loading ? (
                      <div className="animate-pulse bg-yellow-300 rounded mx-auto" style={{ height: 'clamp(2rem, 8vw, 4rem)', width: 'clamp(6rem, 20vw, 8rem)' }}></div>
                    ) : (
                      <span className="break-all">{productsWithoutStock.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-xs text-yellow-200 mt-2 flex items-center justify-center gap-1">
                    <Minus className="h-3 w-3" />
                    <span>{loading ? '...' : `${(totalProducts - productsWithoutStock).toLocaleString()}`}</span>
                    <span>/</span>
                    <span>{loading ? '...' : `${withoutStockPercentage}%`}</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Diferença do total / % sem estoque
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Rodapé */}
              <div className="text-left mt-2 flex-shrink-0">
                <p className="text-xs text-yellow-100 leading-tight">
                  Produtos com estoque zerado
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}