'use client';

import { useState, useEffect } from 'react';
import { CategoryFilters } from '../types';
import { Download, Filter } from 'lucide-react';

interface CategoryFiltersComponentProps {
  filters: CategoryFilters;
  onFiltersChange: (filters: Partial<CategoryFilters>) => void;
  onClearFilters: () => void;
  onImportFromVtex: () => void;
  importing: boolean;
}

export function CategoryFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  onImportFromVtex,
  importing
}: CategoryFiltersComponentProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ search: searchValue });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, onFiltersChange]);

  const handleFilterChange = (key: keyof CategoryFilters, value: string) => {
    onFiltersChange({ [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Busca */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Nome da categoria..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Status */}
        <select
          value={filters.is_active}
          onChange={(e) => handleFilterChange('is_active', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="">Todos</option>
          <option value="true">Ativa</option>
          <option value="false">Inativa</option>
        </select>

        {/* Com filhos */}
        <select
          value={filters.has_children}
          onChange={(e) => handleFilterChange('has_children', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="">Todos</option>
          <option value="true">Com filhos</option>
          <option value="false">Sem filhos</option>
        </select>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center"
            >
              <Filter className="w-4 h-4 mr-1" />
              Limpar
            </button>
          )}
          
          <button
            onClick={onImportFromVtex}
            disabled={importing}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-1" />
            {importing ? 'Importando...' : 'Importar VTEX'}
          </button>
        </div>
      </div>
    </div>
  );
}
