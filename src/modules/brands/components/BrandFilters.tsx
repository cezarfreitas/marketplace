'use client';

import { useState, useEffect } from 'react';
import { BrandFilters } from '../types';
import { Download } from 'lucide-react';

interface BrandFiltersProps {
  filters: BrandFilters;
  onFiltersChange: (filters: Partial<BrandFilters>) => void;
  onClearFilters: () => void;
  onImportFromVtex: () => void;
  importing: boolean;
}

export function BrandFiltersComponent({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  onImportFromVtex,
  importing
}: BrandFiltersProps) {
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debounce para busca
  const handleSearchChange = (value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onFiltersChange({ search: value });
    }, 500);

    setSearchTimeout(timeout);
  };

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Busca */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar marcas..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status */}
        <div className="min-w-[120px]">
          <select
            value={filters.is_active}
            onChange={(e) => onFiltersChange({ is_active: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Status</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
        </div>

        {/* Dados Auxiliares */}
        <div className="min-w-[140px]">
          <select
            value={filters.auxiliary_data_generated}
            onChange={(e) => onFiltersChange({ auxiliary_data_generated: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Auxiliares</option>
            <option value="true">Gerados</option>
            <option value="false">Pendentes</option>
          </select>
        </div>

        {/* Botão Limpar */}
        <button
          onClick={onClearFilters}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Limpar
        </button>

        {/* Botão Importar */}
        <button
          onClick={onImportFromVtex}
          disabled={importing}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Importando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Importar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
