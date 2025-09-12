'use client';

import { useState, useEffect } from 'react';
import { X, Package, Loader2 } from 'lucide-react';

interface Sku {
  id: number;
  sku_name: string;
  product_id: number;
  product_name: string;
  product_vtex_id: number;
}

interface ProductSkus {
  productId: number;
  skus: Sku[];
  loading: boolean;
  error: string | null;
}

interface SimpleSkusModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: number[];
}

export function SimpleSkusModal({ isOpen, onClose, productIds }: SimpleSkusModalProps) {
  const [productSkus, setProductSkus] = useState<ProductSkus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && productIds.length > 0) {
      fetchAllSkus();
    }
  }, [isOpen, productIds]);

  const fetchAllSkus = async () => {
    setLoading(true);
    
    // Filtrar apenas IDs válidos
    const validProductIds = productIds.filter(id => id != null && id != undefined && !isNaN(Number(id)));
    
    if (validProductIds.length === 0) {
      setProductSkus([]);
      setLoading(false);
      return;
    }
    
    // Inicializar array com loading para cada produto
    const initialData = validProductIds.map(productId => ({
      productId,
      skus: [],
      loading: true,
      error: null
    }));
    setProductSkus(initialData);

    // Buscar SKUs para cada produto usando ID interno
    const promises = validProductIds.map(async (productId) => {
      try {
        const response = await fetch(`/api/products/${productId}/skus`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const result = await response.json();

        if (result.success) {
          return {
            productId,
            skus: result.data.skus,
            loading: false,
            error: null
          };
        } else {
          return {
            productId,
            skus: [],
            loading: false,
            error: result.message || 'Erro ao carregar SKUs'
          };
        }
      } catch (error: any) {
        return {
          productId,
          skus: [],
          loading: false,
          error: 'Erro ao carregar SKUs: ' + error.message
        };
      }
    });

    const results = await Promise.all(promises);
    setProductSkus(results);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              SKUs dos Produtos Selecionados
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {productIds.filter(id => id != null && id != undefined && !isNaN(Number(id))).length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {productIds.filter(id => id != null && id != undefined && !isNaN(Number(id))).length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-sm">Nenhum produto válido selecionado</p>
                <p className="text-gray-500 text-xs mt-1">Verifique se os produtos selecionados possuem VTEX ID válido</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">Carregando SKUs...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {productSkus.map((product, index) => (
                <div key={product.productId} className="border border-gray-200 rounded-lg p-4">   
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Produto ID: {product.productId}
                    </h3>
                    <span className="text-xs text-gray-500">
                      #{index + 1}
                    </span>
                  </div>
                  
                  {product.loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                      <span className="text-sm text-gray-600">Carregando SKUs...</span>
                    </div>
                  ) : product.error ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-red-600 mb-2">{product.error}</p>
                      <button
                        onClick={fetchAllSkus}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  ) : product.skus.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">Nenhum SKU encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 mb-2">
                        {product.skus.length} SKU(s) encontrado(s):
                      </p>
                      {product.skus.map((sku) => (
                        <div key={sku.id} className="bg-gray-50 rounded p-2 border border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {sku.sku_name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}