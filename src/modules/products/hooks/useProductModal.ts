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
    setSelectedProduct(product);
    setShowModal(true);
    setModalLoading(true);

    try {
      // Buscar todos os detalhes do produto de uma vez
      const response = await fetch(`/api/products/${product.id}/details`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const productDetails = result.data;

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
            }
          }
        } catch (syncError) {
          setProductSyncLogs([]);
        }
      } else {
        throw new Error(result.message || 'Erro ao carregar detalhes');
      }
    } catch (error) {
      // Silently handle error
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
      // Silently handle error
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
