'use client';

import { useState } from 'react';
import { Brand, BrandSortOptions } from '../types';
import { formatDate, formatNumber, getBrandImageUrl } from '../utils/formatters';
import { 
  Eye, Edit, Trash2, MoreVertical, Star, StarOff, ExternalLink, Copy, 
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Bot, Download
} from 'lucide-react';

interface BrandTableProps {
  brands: Brand[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalBrands: number;
  itemsPerPage: number;
  sort: BrandSortOptions;
  selectedBrands: number[];
  onSort: (field: BrandSortOptions['field']) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
  onBrandSelect: (id: number) => void;
  onSelectAll: () => void;
  onViewBrand: (brand: Brand) => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brand: Brand) => void;
  onGenerateAuxiliary: (brand: Brand) => void;
}

export function BrandTable({
  brands,
  loading,
  currentPage,
  totalPages,
  totalBrands,
  itemsPerPage,
  sort,
  selectedBrands,
  onSort,
  onPageChange,
  onItemsPerPageChange,
  onBrandSelect,
  onSelectAll,
  onViewBrand,
  onEditBrand,
  onDeleteBrand,
  onGenerateAuxiliary
}: BrandTableProps) {
  // Debug: verificar dados recebidos
  console.log('BrandTable - brands:', brands);
  console.log('BrandTable - loading:', loading);
  console.log('BrandTable - brands.length:', brands?.length);
  const [showActionsMenu, setShowActionsMenu] = useState<number | null>(null);

  const getSortIcon = (field: BrandSortOptions['field']) => {
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
        <span className="ml-3 text-gray-600">Carregando marcas...</span>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma marca encontrada</h3>
        <p className="text-gray-500">Tente ajustar os filtros ou importar novas marcas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-4 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedBrands.length === brands.length && brands.length > 0}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-2"
                />
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Marca</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                Título
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-20 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('product_count')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Produtos</span>
                  {getSortIcon('product_count')}
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-24">
                Status
              </th>
              <th 
                className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>Data</span>
                  {getSortIcon('created_at')}
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.id)}
                    onChange={() => onBrandSelect(brand.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      {brand.image_url ? (
                        <img
                          src={getBrandImageUrl(brand)}
                          alt={brand.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-gray-400 font-semibold text-sm">
                          {brand.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {brand.name}
                        </div>
                        <div className="flex items-center space-x-1">
                          {brand.is_active ? (
                            <div className="w-2 h-2 bg-green-500 rounded-full" title="Ativa"></div>
                          ) : (
                            <div className="w-2 h-2 bg-red-500 rounded-full" title="Inativa"></div>
                          )}
                          {brand.auxiliary_data_generated ? (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Dados auxiliares gerados"></div>
                          ) : (
                            <div className="w-2 h-2 bg-orange-500 rounded-full" title="Dados auxiliares pendentes"></div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        ID: {brand.vtex_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                  <span className="truncate block max-w-xs">
                    {brand.title || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold border border-emerald-200">
                      {brand.product_count || 0}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      brand.is_active 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {brand.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      brand.auxiliary_data_generated 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {brand.auxiliary_data_generated ? 'Gerados' : 'Pendentes'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div className="flex flex-col">
                    <span className="font-medium">{formatDate(brand.created_at).split(',')[0]}</span>
                    <span className="text-xs text-gray-400">{formatDate(brand.created_at).split(',')[1]?.trim()}</span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => onViewBrand(brand)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onEditBrand(brand)}
                      className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 border border-transparent hover:border-emerald-200" 
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setShowActionsMenu(showActionsMenu === brand.id ? null : brand.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200"
                        title="Mais ações"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {showActionsMenu === brand.id && (
                        <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-xl z-10 min-w-[200px] overflow-hidden">
                          <div className="py-2">
                            <button 
                              onClick={() => onGenerateAuxiliary(brand)}
                              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-purple-50 flex items-center transition-colors"
                            >
                              <Bot className="h-4 w-4 mr-3 text-purple-500" />
                              Gerar Dados Auxiliares
                            </button>
                            <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-yellow-50 flex items-center transition-colors">
                              <Star className="h-4 w-4 mr-3 text-yellow-500" />
                              Favoritar
                            </button>
                            <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center transition-colors">
                              <ExternalLink className="h-4 w-4 mr-3 text-blue-500" />
                              Ver na VTEX
                            </button>
                            <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                              <Copy className="h-4 w-4 mr-3 text-gray-500" />
                              Copiar ID
                            </button>
                            <hr className="my-2 border-gray-100" />
                            <button 
                              onClick={() => onDeleteBrand(brand)}
                              className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-3" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
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
                  <span className="font-medium">{formatNumber(totalBrands)}</span> marcas total
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                </span>
                <span className="text-gray-400">•</span>
                <span>
                  {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalBrands)} de {formatNumber(totalBrands)}
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
