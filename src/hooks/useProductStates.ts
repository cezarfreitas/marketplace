import { useState, useCallback } from 'react';
import { Product } from '@/modules/products/types';

export interface ProductStates {
  // Estados de seleção
  selectedProducts: number[];
  setSelectedProducts: React.Dispatch<React.SetStateAction<number[]>>;
  
  // Estados de modais
  showImageAnalysisModal: boolean;
  setShowImageAnalysisModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAnalysisSelectionModal: boolean;
  setShowAnalysisSelectionModal: React.Dispatch<React.SetStateAction<boolean>>;
  showMarketplaceModal: boolean;
  setShowMarketplaceModal: React.Dispatch<React.SetStateAction<boolean>>;
  showCharacteristicsModal: boolean;
  setShowCharacteristicsModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAnymarketingModal: boolean;
  setShowAnymarketingModal: React.Dispatch<React.SetStateAction<boolean>>;
  showCropModal: boolean;
  setShowCropModal: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Estados de produtos selecionados
  selectedProductForAnalysis: Product | null;
  setSelectedProductForAnalysis: React.Dispatch<React.SetStateAction<Product | null>>;
  selectedProductForTool: Product | null;
  setSelectedProductForTool: React.Dispatch<React.SetStateAction<Product | null>>;
  
  // Estados de dados
  imageAnalysisData: any;
  setImageAnalysisData: React.Dispatch<React.SetStateAction<any>>;
  marketplaceDescription: any;
  setMarketplaceDescription: React.Dispatch<React.SetStateAction<any>>;
  cropModalData: any;
  setCropModalData: React.Dispatch<React.SetStateAction<any>>;
  
  // Estados de loading
  analyzingImages: boolean;
  setAnalyzingImages: React.Dispatch<React.SetStateAction<boolean>>;
  analyzingSingleImage: boolean;
  setAnalyzingSingleImage: React.Dispatch<React.SetStateAction<boolean>>;
  generatingMarketplace: boolean;
  setGeneratingMarketplace: React.Dispatch<React.SetStateAction<boolean>>;
  generatingCharacteristics: boolean;
  setGeneratingCharacteristics: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Estados de erro
  analysisError: string | null;
  setAnalysisError: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Estados de dados existentes
  existingAnalysis: any;
  setExistingAnalysis: React.Dispatch<React.SetStateAction<any>>;
  currentAnalysisData: any;
  setCurrentAnalysisData: React.Dispatch<React.SetStateAction<any>>;
  
  // Estados de listas de produtos
  productsWithAnalysis: number[];
  setProductsWithAnalysis: React.Dispatch<React.SetStateAction<number[]>>;
  productsWithMarketplace: number[];
  setProductsWithMarketplace: React.Dispatch<React.SetStateAction<number[]>>;
  productsWithCharacteristics: number[];
  setProductsWithCharacteristics: React.Dispatch<React.SetStateAction<number[]>>;
  productsWithAnymarketSync: number[];
  setProductsWithAnymarketSync: React.Dispatch<React.SetStateAction<number[]>>;
  productsWithCroppedImages: number[];
  setProductsWithCroppedImages: React.Dispatch<React.SetStateAction<number[]>>;
  
  // Estados de logs
  anymarketSyncLogs: any[];
  setAnymarketSyncLogs: React.Dispatch<React.SetStateAction<any[]>>;
  loadingAnymarketLogs: boolean;
  setLoadingAnymarketLogs: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useProductStates(): ProductStates {
  // Estados de seleção
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  
  // Estados de modais
  const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false);
  const [showAnalysisSelectionModal, setShowAnalysisSelectionModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [showCharacteristicsModal, setShowCharacteristicsModal] = useState(false);
  const [showAnymarketingModal, setShowAnymarketingModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  
  // Estados de produtos selecionados
  const [selectedProductForAnalysis, setSelectedProductForAnalysis] = useState<Product | null>(null);
  const [selectedProductForTool, setSelectedProductForTool] = useState<Product | null>(null);
  
  // Estados de dados
  const [imageAnalysisData, setImageAnalysisData] = useState<any>(null);
  const [marketplaceDescription, setMarketplaceDescription] = useState<any>(null);
  const [cropModalData, setCropModalData] = useState<any>(null);
  
  // Estados de loading
  const [analyzingImages, setAnalyzingImages] = useState(false);
  const [analyzingSingleImage, setAnalyzingSingleImage] = useState(false);
  const [generatingMarketplace, setGeneratingMarketplace] = useState(false);
  const [generatingCharacteristics, setGeneratingCharacteristics] = useState(false);
  
  // Estados de erro
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Estados de dados existentes
  const [existingAnalysis, setExistingAnalysis] = useState<any>(null);
  const [currentAnalysisData, setCurrentAnalysisData] = useState<any>(null);
  
  // Estados de listas de produtos
  const [productsWithAnalysis, setProductsWithAnalysis] = useState<number[]>([]);
  const [productsWithMarketplace, setProductsWithMarketplace] = useState<number[]>([]);
  const [productsWithCharacteristics, setProductsWithCharacteristics] = useState<number[]>([]);
  const [productsWithAnymarketSync, setProductsWithAnymarketSync] = useState<number[]>([]);
  const [productsWithCroppedImages, setProductsWithCroppedImages] = useState<number[]>([]);
  
  // Estados de logs
  const [anymarketSyncLogs, setAnymarketSyncLogs] = useState<any[]>([]);
  const [loadingAnymarketLogs, setLoadingAnymarketLogs] = useState(false);

  return {
    // Estados de seleção
    selectedProducts,
    setSelectedProducts,
    
    // Estados de modais
    showImageAnalysisModal,
    setShowImageAnalysisModal,
    showAnalysisSelectionModal,
    setShowAnalysisSelectionModal,
    showMarketplaceModal,
    setShowMarketplaceModal,
    showCharacteristicsModal,
    setShowCharacteristicsModal,
    showAnymarketingModal,
    setShowAnymarketingModal,
    showCropModal,
    setShowCropModal,
    
    // Estados de produtos selecionados
    selectedProductForAnalysis,
    setSelectedProductForAnalysis,
    selectedProductForTool,
    setSelectedProductForTool,
    
    // Estados de dados
    imageAnalysisData,
    setImageAnalysisData,
    marketplaceDescription,
    setMarketplaceDescription,
    cropModalData,
    setCropModalData,
    
    // Estados de loading
    analyzingImages,
    setAnalyzingImages,
    analyzingSingleImage,
    setAnalyzingSingleImage,
    generatingMarketplace,
    setGeneratingMarketplace,
    generatingCharacteristics,
    setGeneratingCharacteristics,
    
    // Estados de erro
    analysisError,
    setAnalysisError,
    
    // Estados de dados existentes
    existingAnalysis,
    setExistingAnalysis,
    currentAnalysisData,
    setCurrentAnalysisData,
    
    // Estados de listas de produtos
    productsWithAnalysis,
    setProductsWithAnalysis,
    productsWithMarketplace,
    setProductsWithMarketplace,
    productsWithCharacteristics,
    setProductsWithCharacteristics,
    productsWithAnymarketSync,
    setProductsWithAnymarketSync,
    productsWithCroppedImages,
    setProductsWithCroppedImages,
    
    // Estados de logs
    anymarketSyncLogs,
    setAnymarketSyncLogs,
    loadingAnymarketLogs,
    setLoadingAnymarketLogs,
  };
}
