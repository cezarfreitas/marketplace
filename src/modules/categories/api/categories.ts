/**
 * ⚠️ API PROTEGIDA - ALTERAÇÕES RESTRITAS ⚠️
 * 
 * Esta API foi simplificada conforme solicitado.
 * 
 * FUNCIONALIDADES REMOVIDAS (NÃO RESTAURAR SEM AUTORIZAÇÃO):
 * - Função importFromVtex
 * - Endpoint de importação de categorias da VTEX
 * 
 * FUNCIONALIDADES MANTIDAS:
 * - Busca e listagem de categorias
 * - Criação, atualização e exclusão de categorias
 * - Operações em lote
 * 
 * ⚠️ ANTES DE FAZER QUALQUER ALTERAÇÃO, CONFIRME COM O SOLICITANTE ⚠️
 */

import { Category, CategoryListResponse, CreateCategoryRequest, UpdateCategoryRequest, CategoryPaginationOptions } from '../types';

const API_BASE = '/api/categories';

export class CategoriesAPI {
  // ⚠️ MÉTODOS SIMPLIFICADOS - NÃO ADICIONAR MÉTODOS DE IMPORT SEM AUTORIZAÇÃO ⚠️
  
  /**
   * Buscar lista de categorias com paginação e filtros
   */
  static async getCategories(options: CategoryPaginationOptions): Promise<CategoryListResponse> {
    const queryParams = new URLSearchParams({
      page: options.page.toString(),
      limit: options.limit.toString(),
      ...(options.sort && {
        sort: options.sort.field,
        order: options.sort.direction
      }),
      ...(options.filters && Object.fromEntries(
        Object.entries(options.filters).filter(([_, value]) => value !== '')
      ))
    });

    const response = await fetch(`${API_BASE}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar categorias: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Buscar categoria por ID
   */
  static async getCategoryById(id: number): Promise<Category> {
    const response = await fetch(`${API_BASE}/${id}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar categoria: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Criar nova categoria
   */
  static async createCategory(category: CreateCategoryRequest): Promise<Category> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar categoria: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Atualizar categoria existente
   */
  static async updateCategory(id: number, category: UpdateCategoryRequest): Promise<Category> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      throw new Error(`Erro ao atualizar categoria: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Deletar categoria
   */
  static async deleteCategory(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Erro ao deletar categoria: ${response.statusText}`);
    }
  }

  /**
   * Deletar múltiplas categorias
   */
  static async deleteMultipleCategories(ids: number[]): Promise<void> {
    const response = await fetch(`${API_BASE}/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao deletar categorias: ${response.statusText}`);
    }
  }

}
