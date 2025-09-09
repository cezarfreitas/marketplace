'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package } from 'lucide-react';

interface StockTooltipProps {
  productId: number;
  totalStock: number;
  children: React.ReactNode;
}

interface SkuStock {
  sku_id: number;
  vtex_sku_id: string;
  sku_name: string;
  total_quantity: number;
  reserved_quantity: number;
  warehouse_name: string;
}

export function StockTooltip({ productId, totalStock, children }: StockTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [stockData, setStockData] = useState<SkuStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStockData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/products/${productId}/stock`);
      if (response.ok) {
        const data = await response.json();
        setStockData(data.data || []);
      } else {
        setError('Erro ao carregar dados de estoque');
      }
    } catch (err) {
      setError('Erro ao carregar dados de estoque');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Buscar dados de estoque quando o tooltip for mostrado
  useEffect(() => {
    if (isVisible && stockData.length === 0 && !loading) {
      fetchStockData();
    }
  }, [isVisible, productId, fetchStockData, loading, stockData.length]);

  // Agrupar dados por SKU
  const groupedStock = stockData.reduce((acc, item) => {
    const key = `${item.sku_id}-${item.sku_name}`;
    if (!acc[key]) {
      acc[key] = {
        sku_id: item.sku_id,
        vtex_sku_id: item.vtex_sku_id,
        sku_name: item.sku_name,
        warehouses: [],
        total_quantity: 0,
        reserved_quantity: 0
      };
    }
    
    acc[key].warehouses.push({
      warehouse_name: item.warehouse_name,
      total_quantity: item.total_quantity,
      reserved_quantity: item.reserved_quantity
    });
    
    acc[key].total_quantity += item.total_quantity;
    acc[key].reserved_quantity += item.reserved_quantity;
    
    return acc;
  }, {} as Record<string, any>);

  const stockItems = Object.values(groupedStock);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div className="absolute z-[9999] w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 bottom-full left-1/2 transform -translate-x-1/2 mb-2"
             style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="flex items-center space-x-2 mb-3">
            <Package className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Estoque por Variante</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Total: {totalStock}
            </span>
          </div>
          
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2">Carregando...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-4">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          
          {!loading && !error && stockItems.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stockItems.map((item: any, index) => {
                // Extrair apenas a variante (tamanho) do nome do SKU
                const getVariantName = (skuName: string) => {
                  // Procurar por padrões como "- 37", "- 39", etc.
                  const variantMatch = skuName.match(/- (\d+)$/);
                  if (variantMatch) {
                    return `Tamanho ${variantMatch[1]}`;
                  }
                  
                  // Procurar por outros padrões de variante
                  const otherVariantMatch = skuName.match(/- ([A-Za-z0-9\s]+)$/);
                  if (otherVariantMatch) {
                    return otherVariantMatch[1].trim();
                  }
                  
                  // Se não encontrar padrão, retornar as últimas palavras
                  const words = skuName.split(' ');
                  if (words.length > 2) {
                    return words.slice(-2).join(' ');
                  }
                  
                  return skuName;
                };
                
                const variantName = getVariantName(item.sku_name);
                
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-gray-900 truncate" title={item.sku_name}>
                        {variantName}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                        {item.total_quantity}
                      </span>
                      {item.reserved_quantity > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full" title="Reservado">
                          {item.reserved_quantity}R
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {!loading && !error && stockItems.length === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">Nenhum estoque encontrado</p>
            </div>
          )}
          
          {/* Seta do tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200"></div>
        </div>
      )}
    </div>
  );
}
