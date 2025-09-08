import { useState, useEffect, useCallback } from 'react';
import { Brand, BrandFilters, BrandListResponse, BrandSortOptions } from '../types';
import { BrandsAPI } from '../api/brands';

interface UseBrandsOptions {
  initialPage?: number;
  initialLimit?: number;
  initialFilters?: BrandFilters;
  initialSort?: BrandSortOptions;
}

export function useBrands(options: UseBrandsOptions = {}) {
  const {
    initialPage = 1,
    initialLimit = 20,
    initialFilters = {
      search: '',
      is_active: '',
      auxiliary_data_generated: ''
    },
    initialSort = { field: 'created_at', direction: 'desc' }
  } = options;

  // Estados
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBrands, setTotalBrands] = useState(0);
  const [filters, setFilters] = useState<BrandFilters>(initialFilters);
  const [sort, setSort] = useState<BrandSortOptions>(initialSort);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit);

  // Função para buscar marcas
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await BrandsAPI.getBrands({
        page: currentPage,
        limit: itemsPerPage,
        sort,
        filters
      });

      if (response.success) {
        setBrands(response.data.brands);
        setTotalPages(response.data.totalPages);
        setTotalBrands(response.data.total);
      } else {
        setError('Erro ao carregar marcas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sort, filters]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: Partial<BrandFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset para primeira página
  }, []);

  // Função para limpar filtros
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setCurrentPage(1);
  }, [initialFilters]);

  // Função para atualizar ordenação
  const updateSort = useCallback((field: BrandSortOptions['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  }, []);

  // Função para atualizar página
  const updatePage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Função para atualizar itens por página
  const updateItemsPerPage = useCallback((limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
  }, []);

  // Função para deletar marca
  const deleteBrand = useCallback(async (id: number) => {
    try {
      await BrandsAPI.deleteBrand(id);
      await fetchBrands(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar marca');
      return false;
    }
  }, [fetchBrands]);

  // Função para deletar múltiplas marcas
  const deleteMultipleBrands = useCallback(async (ids: number[]) => {
    try {
      await BrandsAPI.deleteMultipleBrands(ids);
      await fetchBrands(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar marcas');
      return false;
    }
  }, [fetchBrands]);

  // Função para gerar dados auxiliares
  const generateAuxiliaryData = useCallback(async (id: number) => {
    try {
      await BrandsAPI.generateAuxiliaryData(id);
      await fetchBrands(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar dados auxiliares');
      return false;
    }
  }, [fetchBrands]);

  // Função para importar da VTEX
  const importFromVtex = useCallback(async () => {
    try {
      const result = await BrandsAPI.importFromVtex();
      await fetchBrands(); // Recarregar lista
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar marcas');
      return { success: false, message: 'Erro ao importar marcas' };
    }
  }, [fetchBrands]);

  // Effect para buscar marcas quando dependências mudarem
  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return {
    // Estados
    brands,
    loading,
    error,
    currentPage,
    totalPages,
    totalBrands,
    filters,
    sort,
    itemsPerPage,

    // Ações
    fetchBrands,
    updateFilters,
    clearFilters,
    updateSort,
    updatePage,
    updateItemsPerPage,
    deleteBrand,
    deleteMultipleBrands,
    generateAuxiliaryData,
    importFromVtex,

    // Utilitários
    hasBrands: brands.length > 0,
    hasFilters: Object.values(filters).some(value => value !== ''),
    canGoNext: currentPage < totalPages,
    canGoPrevious: currentPage > 1,
  };
}
