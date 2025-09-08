'use client';

import { useState, useEffect } from 'react';
import { ProductFilters } from '../types';
import { Filter, X, RotateCcw } from 'lucide-react';

interface ProductFiltersProps {
  filters: ProductFilters;
  onFiltersChange: (filters: Partial<ProductFilters>) => void;
  onClearFilters: () => void;
}

export function ProductFiltersComponent({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: ProductFiltersProps) {
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce para busca
  const handleSearchChange = (value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onFiltersChange({ search: value });
    }, 300);

    setSearchTimeout(timeout);
  };

  // Contar filtros ativos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.has_image_analysis) count++;
    if (filters.has_marketplace_description) count++;
    if (filters.has_anymarket_ref_id) count++;
    if (filters.has_anymarket_sync_log) count++;
    if (filters.is_active) count++;
    if (filters.is_visible) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
      {/* Header dos Filtros */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-3 w-3" />
              Limpar
            </button>
          )}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <RotateCcw className={`h-3 w-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </button>
        </div>
      </div>

      {/* Filtros Principais */}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="flex-1 min-w-[250px]">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar produtos por nome, SKU ou descrição..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Filtros Rápidos */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFiltersChange({ has_image_analysis: filters.has_image_analysis === 'true' ? '' : 'true' })}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filters.has_image_analysis === 'true'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${filters.has_image_analysis === 'true' ? 'bg-green-500' : 'bg-gray-400'}`} />
              Análise
            </button>

            <button
              onClick={() => onFiltersChange({ has_marketplace_description: filters.has_marketplace_description === 'true' ? '' : 'true' })}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filters.has_marketplace_description === 'true'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${filters.has_marketplace_description === 'true' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
              Marketplace
            </button>

            <button
              onClick={() => onFiltersChange({ has_anymarket_sync_log: filters.has_anymarket_sync_log === 'true' ? '' : 'true' })}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filters.has_anymarket_sync_log === 'true'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${filters.has_anymarket_sync_log === 'true' ? 'bg-blue-500' : 'bg-gray-400'}`} />
              Sincronizado
            </button>

            <button
              onClick={() => {
                if (filters.is_active === 'true') {
                  onFiltersChange({ is_active: 'false' });
                } else if (filters.is_active === 'false') {
                  onFiltersChange({ is_active: '' });
                } else {
                  onFiltersChange({ is_active: 'true' });
                }
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filters.is_active === 'true'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : filters.is_active === 'false'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                filters.is_active === 'true' ? 'bg-green-500' : 
                filters.is_active === 'false' ? 'bg-red-500' : 
                'bg-gray-400'
              }`} />
              {filters.is_active === 'true' ? 'Ativo' : 
               filters.is_active === 'false' ? 'Inativo' : 
               'Status'}
            </button>
          </div>
        </div>

        {/* Filtros Avançados */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Análise de Imagem */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Análise de Imagem
                </label>
                <select
                  value={filters.has_image_analysis}
                  onChange={(e) => onFiltersChange({ has_image_analysis: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Com Análise</option>
                  <option value="false">Sem Análise</option>
                </select>
              </div>

              {/* Descrição Marketplace */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Descrição Marketplace
                </label>
                <select
                  value={filters.has_marketplace_description}
                  onChange={(e) => onFiltersChange({ has_marketplace_description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Com Descrição</option>
                  <option value="false">Sem Descrição</option>
                </select>
              </div>

              {/* Está no Anymarket */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Está no Anymarket
                </label>
                <select
                  value={filters.has_anymarket_ref_id}
                  onChange={(e) => onFiltersChange({ has_anymarket_ref_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>

              {/* Sincronizado com Anymarket */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sincronizado com Anymarket
                </label>
                <select
                  value={filters.has_anymarket_sync_log}
                  onChange={(e) => onFiltersChange({ has_anymarket_sync_log: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>

              {/* Status Ativo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status Ativo
                </label>
                <select
                  value={filters.is_active}
                  onChange={(e) => onFiltersChange({ is_active: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>

              {/* Status Visível */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status Visível
                </label>
                <select
                  value={filters.is_visible}
                  onChange={(e) => onFiltersChange({ is_visible: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Visível</option>
                  <option value="false">Invisível</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
