'use client';

import { useState } from 'react';
import { Product } from '@/modules/products';

interface BatchProgress {
  isRunning: boolean;
  current: number;
  total: number;
  currentProduct: string;
  currentStep?: string;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useProductStates() {
  // Estados de seleção e modais
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

  // Estados de produtos com diferentes status
  const [productsWithAnymarketSync, setProductsWithAnymarketSync] = useState<number[]>([]);
  const [productsWithCroppedImages, setProductsWithCroppedImages] = useState<number[]>([]);
  const [productsWithTitle, setProductsWithTitle] = useState<number[]>([]);
  const [productsWithDescription, setProductsWithDescription] = useState<number[]>([]);
  const [productsWithImageAnalysis, setProductsWithImageAnalysis] = useState<number[]>([]);
  const [productsWithOptimizedTitle, setProductsWithOptimizedTitle] = useState<number[]>([]);
  const [productsWithGeneratedDescription, setProductsWithGeneratedDescription] = useState<number[]>([]);
  const [productsWithGeneratedCharacteristics, setProductsWithGeneratedCharacteristics] = useState<number[]>([]);
  
  
  // Estado para controlar visibilidade dos filtros avançados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Estados de modais
  const [showCharacteristicsModal, setShowCharacteristicsModal] = useState(false);
  const [showAnymarketingModal, setShowAnymarketingModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [selectedProductForTool, setSelectedProductForTool] = useState<Product | null>(null);

  // Estados para Título
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
  const [originalTitle, setOriginalTitle] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);


  // Estados para Características
  const [characteristics, setCharacteristics] = useState<any>(null);
  const [generatingCharacteristics, setGeneratingCharacteristics] = useState(false);

  // Estados para Descrições
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedProductForDescription, setSelectedProductForDescription] = useState<Product | null>(null);

  // Estados para Crop de Imagens
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedProductForCrop, setSelectedProductForCrop] = useState<Product | null>(null);
  const [showBatchCropModal, setShowBatchCropModal] = useState(false);
  const [showBatchOptimizationModal, setShowBatchOptimizationModal] = useState(false);

  // Estados para Anymarket
  const [anymarketMappings, setAnymarketMappings] = useState<Record<string, string>>({});
  const [syncingAnymarket, setSyncingAnymarket] = useState(false);

  // Estados de progresso para ações em lote
  const [batchAnalysisProgress, setBatchAnalysisProgress] = useState<BatchProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    currentProduct: ''
  });


  const [batchCharacteristicsProgress, setBatchCharacteristicsProgress] = useState<BatchProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    currentProduct: ''
  });

  const [batchAnymarketProgress, setBatchAnymarketProgress] = useState<BatchProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    currentProduct: ''
  });

  const [batchStockProgress, setBatchStockProgress] = useState<BatchProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    currentProduct: ''
  });

  const [batchCropProgress, setBatchCropProgress] = useState<BatchProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    currentProduct: ''
  });

  const [batchAllProgress, setBatchAllProgress] = useState<BatchProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    currentProduct: '',
    currentStep: ''
  });

  // Estados de loading e exportação
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados de notificações
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Função para buscar produtos que já têm análise





  return {
    // Seleção e modais
    selectedProducts,
    setSelectedProducts,
    showImageAnalysisModal,
    setShowImageAnalysisModal,
    showAnalysisSelectionModal,
    setShowAnalysisSelectionModal,
    selectedProductForAnalysis,
    setSelectedProductForAnalysis,
    imageAnalysisData,
    setImageAnalysisData,
    analyzingImages,
    setAnalyzingImages,
    analyzingSingleImage,
    setAnalyzingSingleImage,
    analysisError,
    setAnalysisError,
    existingAnalysis,
    setExistingAnalysis,
    currentAnalysisData,
    setCurrentAnalysisData,

    // Produtos com status
    productsWithAnymarketSync,
    setProductsWithAnymarketSync,
    productsWithCroppedImages,
    setProductsWithCroppedImages,
    productsWithTitle,
    setProductsWithTitle,
    productsWithDescription,
    setProductsWithDescription,
    productsWithImageAnalysis,
    setProductsWithImageAnalysis,
    productsWithOptimizedTitle,
    setProductsWithOptimizedTitle,
    productsWithGeneratedDescription,
    setProductsWithGeneratedDescription,
    productsWithGeneratedCharacteristics,
    setProductsWithGeneratedCharacteristics,

    // Modais
    showCharacteristicsModal,
    setShowCharacteristicsModal,
    showAnymarketingModal,
    setShowAnymarketingModal,
    showTitleModal,
    setShowTitleModal,
    selectedProductForTool,
    setSelectedProductForTool,

    // Título
    generatingTitle,
    setGeneratingTitle,
    generatedTitle,
    setGeneratedTitle,
    originalTitle,
    setOriginalTitle,
    titleError,
    setTitleError,


    // Características
    characteristics,
    setCharacteristics,
    generatingCharacteristics,
    setGeneratingCharacteristics,

    // Descrições
    generatingDescription,
    setGeneratingDescription,
    showDescriptionModal,
    setShowDescriptionModal,
    selectedProductForDescription,
    setSelectedProductForDescription,

    // Crop de Imagens
    showCropModal,
    setShowCropModal,
    selectedProductForCrop,
    setSelectedProductForCrop,
    showBatchCropModal,
    setShowBatchCropModal,
    showBatchOptimizationModal,
    setShowBatchOptimizationModal,

    // Anymarket
    anymarketMappings,
    setAnymarketMappings,
    syncingAnymarket,
    setSyncingAnymarket,

    // Progresso em lote
    batchAnalysisProgress,
    setBatchAnalysisProgress,
    batchCharacteristicsProgress,
    setBatchCharacteristicsProgress,
    batchAnymarketProgress,
    setBatchAnymarketProgress,
    batchStockProgress,
    setBatchStockProgress,
    batchCropProgress,
    setBatchCropProgress,
    batchAllProgress,
    setBatchAllProgress,

    // Loading e exportação
    loadingBrands,
    setLoadingBrands,
    loadingCategories,
    setLoadingCategories,
    isExporting,
    setIsExporting,

    // Notificações
    notifications,
    setNotifications,

    
    // Visibilidade dos filtros avançados
    showAdvancedFilters,
    setShowAdvancedFilters,

    // Funções de busca

  };
}