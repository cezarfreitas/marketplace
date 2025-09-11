/**
 * ⚠️ HOOK PROTEGIDO - ALTERAÇÕES RESTRITAS ⚠️
 * 
 * Este hook foi simplificado conforme solicitado.
 * 
 * FUNCIONALIDADES REMOVIDAS (NÃO RESTAURAR SEM AUTORIZAÇÃO):
 * - Função importFromVtex
 * - Lógica de importação de categorias da VTEX
 * 
 * FUNCIONALIDADES MANTIDAS:
 * - Busca e listagem de categorias
 * - Filtros e ordenação
 * - Paginação
 * - Exclusão de categorias
 * 
 * ⚠️ ANTES DE FAZER QUALQUER ALTERAÇÃO, CONFIRME COM O SOLICITANTE ⚠️
 */

import { useState, useEffect, useCallback } from 'react';
import { Category, CategoryFilters, CategoryListResponse, CategorySortOptions } from '../types';
import { CategoriesAPI } from '../api/categories';

interface UseCategoriesOptions {
  initialPage?: number;
  initialLimit?: number;
  initialFilters?: CategoryFilters;
  initialSort?: CategorySortOptions;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const {
    initialPage = 1,
    initialLimit = 20,
    initialFilters = {
      search: '',
      is_active: '',
      has_children: ''
    },
    initialSort = { field: 'created_at', direction: 'desc' }
  } = options;

  // ⚠️ ESTADOS SIMPLIFICADOS - NÃO ADICIONAR ESTADOS DE IMPORT SEM AUTORIZAÇÃO ⚠️
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const [filters, setFilters] = useState<CategoryFilters>(initialFilters);
  const [sort, setSort] = useState<CategorySortOptions>(initialSort);
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit);

  // ⚠️ FUNÇÕES SIMPLIFICADAS - NÃO ADICIONAR FUNÇÕES DE IMPORT SEM AUTORIZAÇÃO ⚠️
  // Função para buscar categorias
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await CategoriesAPI.getCategories({
        page: currentPage,
        limit: itemsPerPage,
        sort,
        filters
      });

      if (response.success) {
        setCategories(response.data.categories);
        setTotalPages(response.data.totalPages);
        setTotalCategories(response.data.total);
      } else {
        setError('Erro ao carregar categorias');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sort, filters]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: Partial<CategoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset para primeira página
  }, []);

  // Função para limpar filtros
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setCurrentPage(1);
  }, [initialFilters]);

  // Função para atualizar ordenação
  const updateSort = useCallback((field: CategorySortOptions['field']) => {
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

  // Função para deletar categoria
  const deleteCategory = useCallback(async (id: number) => {
    try {
      await CategoriesAPI.deleteCategory(id);
      await fetchCategories(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar categoria');
      return false;
    }
  }, [fetchCategories]);

  // Função para deletar múltiplas categorias
  const deleteMultipleCategories = useCallback(async (ids: number[]) => {
    try {
      await CategoriesAPI.deleteMultipleCategories(ids);
      await fetchCategories(); // Recarregar lista
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar categorias');
      return false;
    }
  }, [fetchCategories]);


  // Effect para buscar categorias quando dependências mudarem
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    // Estados
    categories,
    loading,
    error,
    currentPage,
    totalPages,
    totalCategories,
    filters,
    sort,
    itemsPerPage,

    // Ações
    fetchCategories,
    updateFilters,
    clearFilters,
    updateSort,
    updatePage,
    updateItemsPerPage,
    deleteCategory,
    deleteMultipleCategories,

    // Utilitários
    hasCategories: categories.length > 0,
    hasFilters: Object.values(filters).some(value => value !== ''),
    canGoNext: currentPage < totalPages,
    canGoPrevious: currentPage > 1,
  };
}
