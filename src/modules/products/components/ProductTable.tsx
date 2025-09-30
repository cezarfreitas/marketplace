'use client';

import { useState, useEffect } from 'react';
import { Product, ProductSortOptions } from '../types';
import { formatDate, formatNumber, getProductImageUrl } from '../utils/formatters';
import { StockTooltip } from './StockTooltip';
import { 
  Eye, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Image as ImageIcon,
  Camera, FileText, RotateCcw, Crop, Package, List, Type, Copy, Check
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
  onSelectAll: (selected: boolean) => void;
  onViewProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onAnalyzeImages: (product: Product) => void;
  onGenerateTitle: (product: Product) => void;
  onGenerateCharacteristics: (product: Product) => void;
  onGenerateDescription: (product: Product) => void;
  onSyncAnymarketing: (product: Product) => void;
  onCropImages: (product: Product) => void;
  productsWithAnymarketSync?: number[]; // IDs dos produtos que já foram sincronizados com Anymarket
  productsWithCroppedImages?: number[]; // IDs dos produtos que já têm imagens cropadas
  productsWithTitle?: number[]; // IDs dos produtos que já têm título gerado
  productsWithImageAnalysis?: number[]; // IDs dos produtos que já têm análise de imagem
  productsWithOptimizedTitle?: number[]; // IDs dos produtos que já têm título otimizado
  productsWithGeneratedDescription?: number[]; // IDs dos produtos que já têm descrição gerada
  productsWithGeneratedCharacteristics?: number[]; // IDs dos produtos que já têm características geradas
  anymarketMappings?: Record<string, string>; // Mapeamentos ref_id -> id_produto_any
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
  onGenerateTitle,
  onGenerateCharacteristics,
  onGenerateDescription,
  onSyncAnymarketing,
  onCropImages,
  productsWithAnymarketSync = [],
  productsWithCroppedImages = [],
  productsWithTitle = [],
  productsWithImageAnalysis = [],
  productsWithOptimizedTitle = [],
  productsWithGeneratedDescription = [],
  productsWithGeneratedCharacteristics = [],
  anymarketMappings = {}
}: ProductTableProps) {
  
  // Estado para controlar qual referência foi copiada
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  
  // Log para debug do campo has_generated_description
  console.log('🔍 ProductTable - Produtos recebidos:', products.length);
  const productsWithDescription = products.filter(p => p.has_generated_description === true);
  console.log('📝 ProductTable - Produtos com descrição:', productsWithDescription.length);
  if (productsWithDescription.length > 0) {
    console.log('📋 ProductTable - Exemplos:', productsWithDescription.slice(0, 3).map(p => ({
      id: p.id_produto_vtex,
      name: p.name,
      has_generated_description: p.has_generated_description
    })));
  }

  // Função para truncar texto
  const truncateText = (text: string, maxLength: number = 30): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Função para copiar referência
  const copyReference = async (reference: string) => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopiedRef(reference);
      // Resetar o estado após 2 segundos
      setTimeout(() => {
        setCopiedRef(null);
      }, 2000);
    } catch (err) {
      console.error('Erro ao copiar referência:', err);
    }
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
      <div className="overflow-x-auto" style={{ position: 'relative', zIndex: 0 }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-4 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={products.length > 0 && products.every(p => selectedProducts.includes(p.id))}
                  onChange={() => {
                    const allSelected = products.every(p => selectedProducts.includes(p.id));
                    onSelectAll(!allSelected);
                  }}
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
              <th 
                className="px-3 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-16 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('total_stock')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Estoque</span>
                  {getSortIcon('total_stock')}
                </div>
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('brand_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Marca</span>
                  {getSortIcon('brand_name')}
                </div>
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('category_name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Categoria</span>
                  {getSortIcon('category_name')}
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                RefId
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                ID Any
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-64">
                Título Otimizado
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
              <th className="px-3 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                Otimização
              </th>
        <th className="px-3 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
          Ações
        </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product, index) => (
              <tr key={`${product.id_produto_vtex}-${index}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => onProductSelect(product.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      {product.main_image ? (
                        <img
                          src={product.main_image.startsWith('http') ? product.main_image : `https://projetoinfluencer.${product.main_image}`}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900 truncate" title={product.name}>
                          {truncateText(product.name, 40)}
                        </div>
                        {productsWithTitle.includes(product.id_produto_vtex) && product.title && (
                          <div className="text-xs text-blue-600 font-medium truncate mt-1" title="Título otimizado gerado com IA">
                            {truncateText(product.title, 50)}
                          </div>
                        )}
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
                      {product.first_sku_ref && (
                        <div 
                          className="text-xs text-blue-600 font-mono truncate cursor-pointer hover:text-blue-800 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors flex items-center gap-1" 
                          title={`Clique para copiar: ${product.first_sku_ref}`}
                          onClick={() => copyReference(product.first_sku_ref)}
                        >
                          {copiedRef === product.first_sku_ref ? (
                            <>
                              <Check className="h-3 w-3 text-green-600" />
                              <span className="text-green-600">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              {product.first_sku_ref}
                            </>
                          )}
                          {product.anymarket_id && (
                            <span className="text-purple-600">
                              {' - '}{product.anymarket_id}
                            </span>
                          )}
                        </div>
                      )}
                      {!product.first_sku_ref && product.ref_produto && (
                        <div 
                          className="text-xs text-blue-600 font-mono truncate cursor-pointer hover:text-blue-800 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors flex items-center gap-1" 
                          title={`Clique para copiar: ${product.ref_produto}`}
                          onClick={() => copyReference(product.ref_produto)}
                        >
                          {copiedRef === product.ref_produto ? (
                            <>
                              <Check className="h-3 w-3 text-green-600" />
                              <span className="text-green-600">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              {product.ref_produto}
                            </>
                          )}
                          {product.anymarket_id && (
                            <span className="text-purple-600">
                              {' - '}{product.anymarket_id}
                            </span>
                          )}
                        </div>
                      )}
                      {!product.first_sku_ref && !product.ref_produto && product.ref_id && (
                        <div 
                          className="text-xs text-blue-600 font-mono truncate cursor-pointer hover:text-blue-800 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors flex items-center gap-1" 
                          title={`Clique para copiar: ${product.ref_id}`}
                          onClick={() => copyReference(product.ref_id)}
                        >
                          {copiedRef === product.ref_id ? (
                            <>
                              <Check className="h-3 w-3 text-green-600" />
                              <span className="text-green-600">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Ref_Produto: {product.ref_id}
                            </>
                          )}
                        </div>
                      )}
                      {product.title && (
                        <div className="text-xs text-gray-500 truncate" title={product.title}>
                          {truncateText(product.title, 50)}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <StockTooltip 
                      productId={product.id} 
                      totalStock={product.total_stock || 0}
                    >
                      <span className={`inline-flex items-center justify-center w-8 h-6 rounded-full text-xs font-semibold border cursor-help ${
                        (product.total_stock || 0) > 0 
                          ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                          : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                      }`}>
                        {product.total_stock || 0}
                      </span>
                    </StockTooltip>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {product.brand_name || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      {product.category_name || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                  <div className="flex items-center">
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 font-medium">
                      {product.ref_id || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                  <div className="flex items-center">
                    <span className="font-mono text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200 font-medium">
                      {product.anymarket_id || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-gray-900 w-64">
                  <div className="flex items-center">
                    {product.optimized_title ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 font-medium truncate block w-full" title={product.optimized_title}>
                        {product.optimized_title}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded border border-gray-200 font-medium">
                        N/A
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
                      {product.image_count || 0}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => {
                        onAnalyzeImages(product);
                      }}
                      className={`w-8 h-8 border rounded flex items-center justify-center transition-colors group ${
                        product.has_image_analysis || productsWithImageAnalysis.includes(product.id)
                          ? 'border-blue-500 hover:bg-blue-600 shadow-md' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: product.has_image_analysis || productsWithImageAnalysis.includes(product.id) 
                          ? '#3b82f6' // blue-500
                          : undefined
                      }}
                      title={product.has_image_analysis || productsWithImageAnalysis.includes(product.id) ? "Análise de Imagem (Já Processada)" : "Análise de Imagem"}
                    >
                      <Camera 
                        className={`h-4 w-4 transition-colors ${
                          product.has_image_analysis || productsWithImageAnalysis.includes(product.id)
                            ? 'text-white group-hover:text-blue-50' 
                            : 'text-gray-500 group-hover:text-gray-700'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        onGenerateTitle(product);
                      }}
                      className={`w-8 h-8 border rounded flex items-center justify-center transition-colors group ${
                        product.has_optimized_title || productsWithOptimizedTitle.includes(product.id)
                          ? 'border-pink-500 hover:bg-pink-600 shadow-md' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: product.has_optimized_title || productsWithOptimizedTitle.includes(product.id) 
                          ? '#ec4899' // pink-500
                          : undefined
                      }}
                      title={product.has_optimized_title || productsWithOptimizedTitle.includes(product.id) ? "Gerar Título (Já Processado)" : "Gerar Título"}
                    >
                      <Type 
                        className={`h-4 w-4 ${
                          product.has_optimized_title || productsWithOptimizedTitle.includes(product.id)
                            ? 'text-white group-hover:text-pink-50' 
                            : 'text-gray-600 group-hover:text-gray-800'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        onGenerateDescription(product);
                      }}
                      className={`w-8 h-8 border rounded flex items-center justify-center transition-colors group ${
                        product.has_generated_description || productsWithGeneratedDescription.includes(product.id)
                          ? 'border-yellow-500 hover:bg-yellow-600 shadow-md' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: product.has_generated_description || productsWithGeneratedDescription.includes(product.id) 
                          ? '#eab308' // yellow-500
                          : undefined
                      }}
                      onMouseEnter={() => {
                        console.log('🔍 Botão Descrição - Produto:', {
                          id: product.id_produto_vtex,
                          name: product.name,
                          has_generated_description: product.has_generated_description,
                          productsWithGeneratedDescription: productsWithGeneratedDescription.includes(product.id),
                          shouldBeYellow: product.has_generated_description || productsWithGeneratedDescription.includes(product.id),
                          backgroundColor: product.has_generated_description || productsWithGeneratedDescription.includes(product.id) ? '#eab308' : 'undefined'
                        });
                      }}
                      title={product.has_generated_description || productsWithGeneratedDescription.includes(product.id) ? "Descrição Gerada (Clique para ver/editar)" : "Gerar Descrição"}
                    >
                      <span 
                        className={`text-sm font-bold ${
                          product.has_generated_description || productsWithGeneratedDescription.includes(product.id)
                            ? 'text-white group-hover:text-yellow-50' 
                            : 'text-gray-600 group-hover:text-gray-800'
                        }`}
                      >
                        D
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        onGenerateCharacteristics(product);
                      }}
                      className={`w-8 h-8 border rounded flex items-center justify-center transition-colors group ${
                        product.has_generated_characteristics || productsWithGeneratedCharacteristics.includes(product.id)
                          ? 'border-orange-500 hover:bg-orange-600 shadow-md' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: product.has_generated_characteristics || productsWithGeneratedCharacteristics.includes(product.id) 
                          ? '#f97316' // orange-500
                          : undefined
                      }}
                      onMouseEnter={() => {
                        console.log('🔍 Botão Características - Produto:', {
                          id: product.id_produto_vtex,
                          name: product.name,
                          has_generated_characteristics: product.has_generated_characteristics,
                          productsWithGeneratedCharacteristics: productsWithGeneratedCharacteristics.includes(product.id),
                          shouldBeOrange: product.has_generated_characteristics || productsWithGeneratedCharacteristics.includes(product.id)
                        });
                      }}
                      title={product.has_generated_characteristics || productsWithGeneratedCharacteristics.includes(product.id) ? "Gerar Características (Já Processadas)" : "Gerar Características"}
                    >
                      <List 
                        className={`h-4 w-4 ${
                          product.has_generated_characteristics || productsWithGeneratedCharacteristics.includes(product.id)
                            ? 'text-white group-hover:text-orange-50' 
                            : 'text-gray-600 group-hover:text-gray-800'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        onSyncAnymarketing(product);
                      }}
                      onMouseEnter={() => {
                        console.log('🔍 Botão Anymarket - Produto:', {
                          id: product.id_produto_vtex,
                          name: product.name,
                          anymarket_enviado_any: product.anymarket_enviado_any,
                          shouldBeGreen: !!product.anymarket_enviado_any
                        });
                      }}
                      className={`w-8 h-8 border rounded flex items-center justify-center transition-colors group ${
                        product.anymarket_enviado_any
                          ? 'border-green-500 hover:bg-green-600 shadow-md' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: product.anymarket_enviado_any
                          ? '#22c55e' // green-500
                          : undefined
                      }}
                      title={
                        product.anymarket_enviado_any 
                          ? `Enviado para Anymarket em ${new Date(product.anymarket_enviado_any).toLocaleString('pt-BR')}`
                          : "Sincronizar com Anymarket"
                      }
                    >
                      <RotateCcw 
                        className={`h-4 w-4 ${
                          product.anymarket_enviado_any
                            ? 'text-white group-hover:text-green-50'
                            : 'text-gray-600 group-hover:text-gray-800'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        onCropImages(product);
                      }}
                      className={`w-8 h-8 border rounded flex items-center justify-center transition-colors group ${
                        product.anymarket_imagem_cropada
                          ? 'border-purple-500 hover:bg-purple-600 shadow-md'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: product.anymarket_imagem_cropada
                          ? '#a855f7' // purple-500
                          : undefined
                      }}
                      title={
                        product.anymarket_imagem_cropada 
                          ? `Imagens Cropadas em ${new Date(product.anymarket_imagem_cropada).toLocaleString('pt-BR')}`
                          : "Crop de Imagens"
                      }
                    >
                      <Crop 
                        className={`h-4 w-4 ${
                          product.anymarket_imagem_cropada
                            ? 'text-white group-hover:text-purple-50'
                            : 'text-gray-600 group-hover:text-gray-800'
                        }`}
                      />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-2">
                    <button 
                      onClick={() => onViewProduct(product)}
                      className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 transition-colors group"
                      title="Ver detalhes do produto"
                    >
                      <Eye className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product)}
                      className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 transition-colors group"
                      title="Excluir produto permanentemente"
                    >
                      <Trash2 className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
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
                  <option value={200}>200</option>
                  <option value={300}>300</option>
                  <option value={400}>400</option>
                  <option value={500}>500</option>
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
                        ? 'bg-blue-600 text-white shadow-md border-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
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
