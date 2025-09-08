import { useState, useEffect, useCallback } from 'react';
import { Product, ProductFilters, ProductListResponse, ProductSortOptions } from '../types';
import { ProductsAPI } from '../api/products';

interface UseProductsOptions {
  initialPage?: number;
  initialLimit?: number;
  initialFilters?: ProductFilters;
  initialSort?: ProductSortOptions;
}

export function useProducts(options: UseProductsOptions = {}) {
  const {
    initialPage = 1,
    initialLimit = 20,
    initialFilters = {
      search: '',
      brand_id: '',
      category_id: '',
      has_image_analysis: '',
      has_marketplace_description: '',
      has_anymarket_ref_id: '',
      has_anymarket_sync_log: '',
      is_active: '',
      is_visible: '',
      has_images: ''
    },
    initialSort = { field: 'created_at', direction: 'desc' }
  } = options;

  // Estados
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [sort, setSort] = useState<ProductSortOptions>(initialSort);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit);

  // Função para buscar produtos
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ProductsAPI.getProducts({
        page: currentPage,
        limit: itemsPerPage,
        sort,
        filters
      });

      if (response.success) {
        setProducts(response.data.products);
        setTotalPages(response.data.totalPages);
        setTotalProducts(response.data.total);
      } else {
        setError('Erro ao carregar produtos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sort, filters]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset para primeira página
  }, []);

  // Função para limpar filtros
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setCurrentPage(1);
  }, [initialFilters]);

  // Função para atualizar ordenação
  const updateSort = useCallback((field: ProductSortOptions['field']) => {
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

  // Função para deletar produto
  const deleteProduct = useCallback(async (id: number) => {
    try {
      await ProductsAPI.deleteProduct(id);
      await fetchProducts(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar produto');
      return false;
    }
  }, [fetchProducts]);

  // Função para deletar múltiplos produtos
  const deleteMultipleProducts = useCallback(async (ids: number[]) => {
    try {
      await ProductsAPI.deleteMultipleProducts(ids);
      await fetchProducts(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar produtos');
      return false;
    }
  }, [fetchProducts]);

  // Effect para buscar produtos quando dependências mudarem
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    // Estados
    products,
    loading,
    error,
    currentPage,
    totalPages,
    totalProducts,
    filters,
    sort,
    itemsPerPage,

    // Ações
    fetchProducts,
    updateFilters,
    clearFilters,
    updateSort,
    updatePage,
    updateItemsPerPage,
    deleteProduct,
    deleteMultipleProducts,

    // Utilitários
    hasProducts: products.length > 0,
    hasFilters: Object.values(filters).some(value => value !== ''),
    canGoNext: currentPage < totalPages,
    canGoPrevious: currentPage > 1,
  };
}
