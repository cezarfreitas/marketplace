'use client';

import { useState, useEffect } from 'react';
import { X, Package, Loader2, Copy } from 'lucide-react';

interface Sku {
  id: number;
  sku_name: string;
  product_id: number;
  product_name: string;
  product_vtex_id: number;
  ref_id: string;
}

interface ProductSkus {
  productId: number;
  skus: Sku[];
  loading: boolean;
  error: string | null;
  productRefId?: string | null;
}

interface SimpleSkusModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: number[];
}

export function SimpleSkusModal({ isOpen, onClose, productIds }: SimpleSkusModalProps) {
  const [productSkus, setProductSkus] = useState<ProductSkus[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
      error: null,
      productRefId: null
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
            error: null,
            productRefId: result.data.productRefId
          };
        } else {
          return {
            productId,
            skus: [],
            loading: false,
            error: result.message || 'Erro ao carregar SKUs',
            productRefId: null
          };
        }
      } catch (error: any) {
        return {
          productId,
          skus: [],
          loading: false,
          error: 'Erro ao carregar SKUs: ' + error.message,
          productRefId: null
        };
      }
    });

    const results = await Promise.all(promises);
    setProductSkus(results);
    setLoading(false);
  };

  const copyAllReferences = async () => {
    const allReferences: string[] = [];
    
    productSkus.forEach((product) => {
      product.skus.forEach((sku) => {
        // Determinar se é único (sem tamanho específico)
        const isUnique = !sku.ref_id || sku.ref_id === 'null' || sku.ref_id === '' || sku.ref_id === 'ÚNICO';
        let skuRefId = isUnique ? 'U' : sku.ref_id;
        
        // Substituir tamanhos Plus por abreviações
        if (skuRefId === 'Plus P') {
          skuRefId = 'PLP';
        } else if (skuRefId === 'Plus M') {
          skuRefId = 'PLM';
        } else if (skuRefId === 'Plus G') {
          skuRefId = 'PLG';
        } else if (skuRefId === 'Plus GG') {
          skuRefId = 'PLGG';
        }
        
        // Concatenar ref_id do produto com ref_id do SKU
        const combinedRefId = product.productRefId && skuRefId 
          ? `${product.productRefId}${skuRefId}`
          : skuRefId || product.productRefId;
          
        if (combinedRefId) {
          allReferences.push(combinedRefId);
        }
      });
    });
    
    const textToCopy = allReferences.join('\n');
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
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
            <div className="space-y-2">
              {productSkus.map((product) => 
                product.skus.map((sku) => {
                  // Determinar se é único (sem tamanho específico)
                  const isUnique = !sku.ref_id || sku.ref_id === 'null' || sku.ref_id === '' || sku.ref_id === 'ÚNICO';
                  let skuRefId = isUnique ? 'U' : sku.ref_id;
                  
                  // Substituir tamanhos Plus por abreviações
                  if (skuRefId === 'Plus P') {
                    skuRefId = 'PLP';
                  } else if (skuRefId === 'Plus M') {
                    skuRefId = 'PLM';
                  } else if (skuRefId === 'Plus G') {
                    skuRefId = 'PLG';
                  } else if (skuRefId === 'Plus GG') {
                    skuRefId = 'PLGG';
                  }
                  
                  // Concatenar ref_id do produto com ref_id do SKU
                  const combinedRefId = product.productRefId && skuRefId 
                    ? `${product.productRefId}${skuRefId}`
                    : skuRefId || product.productRefId;

                  return (
                    <div key={sku.id} className="bg-gray-50 rounded p-2 border border-gray-100">
                      {combinedRefId && (
                        <p className="text-sm font-medium">
                          <span className="text-blue-600">{product.productRefId}</span>
                          <span className="text-red-600">{skuRefId}</span>
                        </p>
                      )}
                    </div>
                  );
                })
              ).flat()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={copyAllReferences}
              disabled={loading || productSkus.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Copy className="h-4 w-4" />
              <span>{copied ? 'Copiado!' : 'Copiar Tudo'}</span>
            </button>
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