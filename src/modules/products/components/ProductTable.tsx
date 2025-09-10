'use client';

import { useState, useEffect } from 'react';
import { Product, ProductSortOptions } from '../types';
import { formatDate, formatNumber, getProductImageUrl } from '../utils/formatters';
import { StockTooltip } from './StockTooltip';
import { 
  Eye, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Image as ImageIcon,
  Camera, FileText, RefreshCw, Crop
} from 'lucide-react';
import Image from 'next/image';

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  itemsPerPage: number;
  sort: ProductSortOptions;
  selectedProducts: number[];
  onSort: (field: ProductSortOptions['field']) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
  onProductSelect: (id: number) => void;
  onSelectAll: () => void;
  onViewProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onAnalyzeImages: (product: Product) => void;
  onGenerateMarketplaceDescription: (product: Product) => void;
  onSyncAnymarketing: (product: Product) => void;
  onCropImages: (product: Product) => void;
  productsWithAnalysis?: number[]; // IDs dos produtos que já têm análise
  productsWithMarketplace?: number[]; // IDs dos produtos que já têm descrição do Marketplace
  productsWithAnymarketSync?: number[]; // IDs dos produtos que já foram sincronizados com Anymarket
  productsWithCroppedImages?: number[]; // IDs dos produtos que já têm imagens cropadas
}

export function ProductTable({
  products,
  loading,
  currentPage,
  totalPages,
  totalProducts,
  itemsPerPage,
  sort,
  selectedProducts,
  onSort,
  onPageChange,
  onItemsPerPageChange,
  onProductSelect,
  onSelectAll,
  onViewProduct,
  onDeleteProduct,
  onAnalyzeImages,
  onGenerateMarketplaceDescription,
  onSyncAnymarketing,
  onCropImages,
  productsWithAnalysis = [],
  productsWithMarketplace = [],
  productsWithAnymarketSync = [],
  productsWithCroppedImages = []
}: ProductTableProps) {
  // Debug: verificar se a lista está chegando
  console.log('🔍 ProductTable - productsWithMarketplace:', productsWithMarketplace);
  console.log('🔍 ProductTable - productsWithAnymarketSync:', productsWithAnymarketSync);

  // Função para truncar texto
  const truncateText = (text: string, maxLength: number = 30): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getSortIcon = (field: ProductSortOptions['field']) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sort.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-primary-600" /> : 
      <ArrowDown className="h-4 w-4 text-primary-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Carregando produtos...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
        <p className="text-gray-500">Tente ajustar os filtros ou importar novos produtos.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 relative">
      <div className="overflow-x-auto" style={{ position: 'relative', zIndex: 1 }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-4 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === products.length && products.length > 0}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-2"
                />
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Produto</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-20">
                <div className="flex items-center justify-center space-x-1">
                  <span>Estoque</span>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                RefId / ID_ANY
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('brand_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Marca</span>
                  {getSortIcon('brand_name')}
                </div>
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('category_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Categoria</span>
                  {getSortIcon('category_name')}
                </div>
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-16 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('sku_count')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>SKUs</span>
                  {getSortIcon('sku_count')}
                </div>
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-16 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('image_count')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Imgs</span>
                  {getSortIcon('image_count')}
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Ferramentas
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => onProductSelect(product.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      {product.first_image_url ? (
                        <Image
                          src={getProductImageUrl(product)}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900 truncate" title={product.name}>
                          {truncateText(product.name, 40)}
                        </div>
                        <div className="flex items-center space-x-1">
                          {product.is_active ? (
                            <div className="w-2 h-2 bg-green-500 rounded-full" title="Ativo"></div>
                          ) : (
                            <div className="w-2 h-2 bg-red-500 rounded-full" title="Inativo"></div>
                          )}
                          {product.is_visible ? (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Visível"></div>
                          ) : (
                            <div className="w-2 h-2 bg-gray-400 rounded-full" title="Oculto"></div>
                          )}
                        </div>
                      </div>
                      {product.title && (
                        <div className="text-xs text-gray-500 truncate" title={product.title}>
                          {truncateText(product.title, 50)}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <StockTooltip 
                      productId={product.id} 
                      totalStock={product.total_stock || 0}
                    >
                      <span className={`inline-flex items-center justify-center w-12 h-8 rounded-full text-sm font-semibold border cursor-help ${
                        (product.total_stock || 0) > 0 
                          ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                          : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                      }`}>
                        {product.total_stock || 0}
                      </span>
                    </StockTooltip>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 font-medium">
                      {product.ref_id || 'N/A'}
                      {product.anymarket_id && (
                        <span className="text-gray-500 mx-1">-</span>
                      )}
                      {product.anymarket_id && (
                        <span className="text-purple-700">{product.anymarket_id}</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {product.brand_name || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      {product.category_name || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold border border-emerald-200">
                      {product.sku_count || 0}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
                      {product.image_count || 0}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onAnalyzeImages(product)}
                      className={`p-2 rounded-lg transition-all duration-200 border border-transparent ${
                        productsWithAnalysis.includes(product.id)
                          ? 'text-green-800 bg-green-400 border-green-500 hover:bg-green-500'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                      style={productsWithAnalysis.includes(product.id) ? {
                        backgroundColor: '#4ade80',
                        color: '#166534',
                        borderColor: '#22c55e'
                      } : {}}
                      title="Análise de Imagem"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        console.log(`🔍 Produto ${product.id} (${product.name}) - Tem marketplace:`, productsWithMarketplace.includes(product.id));
                        onGenerateMarketplaceDescription(product);
                      }}
                      className={`p-2 rounded-lg transition-all duration-200 border border-transparent ${
                        productsWithMarketplace.includes(product.id)
                          ? 'text-yellow-800 bg-yellow-400 border-yellow-500 hover:bg-yellow-500'
                          : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-200'
                      }`}
                      style={productsWithMarketplace.includes(product.id) ? {
                        backgroundColor: '#fbbf24',
                        color: '#92400e',
                        borderColor: '#f59e0b'
                      } : {}}
                      title="Gerar Descrição para Marketplace"
                    >
                      <span className="h-4 w-4 flex items-center justify-center font-bold text-sm">M</span>
                    </button>
                    <button
                      onClick={() => {
                        console.log(`🔍 Produto ${product.id} (${product.name}) - Tem sync Anymarket:`, productsWithAnymarketSync.includes(product.id));
                        console.log(`📋 Lista de produtos com sync:`, productsWithAnymarketSync);
                        onSyncAnymarketing(product);
                      }}
                      className={`p-2 rounded-lg transition-all duration-200 border border-transparent ${
                        productsWithAnymarketSync.includes(product.id)
                          ? 'text-blue-800 bg-blue-400 border-blue-500 hover:bg-blue-500'
                          : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200'
                      }`}
                      style={productsWithAnymarketSync.includes(product.id) ? {
                        backgroundColor: '#60a5fa',
                        color: '#1e40af',
                        borderColor: '#3b82f6'
                      } : {}}
                      title={productsWithAnymarketSync.includes(product.id) ? "Sincronizado com Anymarket" : "Sincronizar com Anymarket"}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onCropImages(product)}
                      className={`p-2 rounded-lg transition-all duration-200 border border-transparent ${
                        productsWithCroppedImages.includes(product.id)
                          ? 'text-purple-800 bg-purple-400 border-purple-500 hover:bg-purple-500'
                          : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-200'
                      }`}
                      style={productsWithCroppedImages.includes(product.id) ? {
                        backgroundColor: '#c084fc',
                        color: '#6b21a8',
                        borderColor: '#a855f7'
                      } : {}}
                      title={productsWithCroppedImages.includes(product.id) ? "Imagens já cropadas" : "Cropar imagens da Anymarketing"}
                    >
                      <Crop className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => onViewProduct(product)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
                      title="Excluir produto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-4">
                <span>
                  <span className="font-medium">{formatNumber(totalProducts)}</span> produtos total
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalProducts)} de {formatNumber(totalProducts)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Itens por página:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {/* Renderizar páginas */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
