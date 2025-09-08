import { useState, useCallback } from 'react';
import { Product } from '../types';
import { ProductsAPI } from '../api/products';

export function useProductModal() {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSKUs, setProductSKUs] = useState<any[]>([]);
  const [productImages, setProductImages] = useState<any[]>([]);
  const [productSyncLogs, setProductSyncLogs] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Função para abrir modal com produto
  const openModal = useCallback(async (product: Product) => {
    console.log('🔄 Abrindo modal para produto:', product.name, 'ID:', product.id);
    
    setSelectedProduct(product);
    setShowModal(true);
    setModalLoading(true);

    try {
      console.log('📡 Buscando detalhes completos para produto ID:', product.id);
      
      // Buscar todos os detalhes do produto de uma vez
      const response = await fetch(`/api/products/${product.id}/details`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const productDetails = result.data;
        console.log('✅ Detalhes carregados:', {
          skus: productDetails.skus?.length || 0,
          images: productDetails.images?.length || 0,
          analysisLogs: productDetails.analysisLogs?.length || 0
        });

        // Atualizar o produto com dados completos
        setSelectedProduct(productDetails);
        setProductSKUs(productDetails.skus || []);
        setProductImages(productDetails.images || []);

        // Buscar logs de sincronização do Anymarket
        try {
          const syncLogsResponse = await fetch(`/api/anymarket/sync-logs?productId=${product.id}`);
          if (syncLogsResponse.ok) {
            const syncLogsResult = await syncLogsResponse.json();
            if (syncLogsResult.success) {
              setProductSyncLogs(syncLogsResult.data || []);
              console.log('✅ Logs de sincronização carregados:', syncLogsResult.data?.length || 0);
            }
          }
        } catch (syncError) {
          console.log('⚠️ Erro ao carregar logs de sincronização (não crítico):', syncError);
          setProductSyncLogs([]);
        }
      } else {
        throw new Error(result.message || 'Erro ao carregar detalhes');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do produto:', error);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Função para fechar modal
  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedProduct(null);
    setProductSKUs([]);
    setProductImages([]);
    setProductSyncLogs([]);
    setCopiedText(null);
  }, []);

  // Função para copiar texto para clipboard
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  }, []);

  return {
    // Estados
    showModal,
    selectedProduct,
    productSKUs,
    productImages,
    productSyncLogs,
    modalLoading,
    copiedText,

    // Ações
    openModal,
    closeModal,
    copyToClipboard,
  };
}
