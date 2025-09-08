import { Brand, BrandListResponse, CreateBrandRequest, UpdateBrandRequest, BrandPaginationOptions } from '../types';

const API_BASE = '/api/brands';

export class BrandsAPI {
  /**
   * Buscar lista de marcas com paginação e filtros
   */
  static async getBrands(options: BrandPaginationOptions): Promise<BrandListResponse> {
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
      throw new Error(`Erro ao buscar marcas: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Buscar marca por ID
   */
  static async getBrandById(id: number): Promise<Brand> {
    const response = await fetch(`${API_BASE}/${id}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar marca: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Criar nova marca
   */
  static async createBrand(brand: CreateBrandRequest): Promise<Brand> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brand),
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar marca: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Atualizar marca existente
   */
  static async updateBrand(id: number, brand: UpdateBrandRequest): Promise<Brand> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brand),
    });

    if (!response.ok) {
      throw new Error(`Erro ao atualizar marca: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Deletar marca
   */
  static async deleteBrand(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Erro ao deletar marca: ${response.statusText}`);
    }
  }

  /**
   * Deletar múltiplas marcas
   */
  static async deleteMultipleBrands(ids: number[]): Promise<void> {
    const response = await fetch(`${API_BASE}/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao deletar marcas: ${response.statusText}`);
    }
  }

  /**
   * Gerar dados auxiliares para marca
   */
  static async generateAuxiliaryData(id: number): Promise<Brand> {
    const response = await fetch(`${API_BASE}/${id}/generate-auxiliary`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Erro ao gerar dados auxiliares: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Importar marcas da VTEX
   */
  static async importFromVtex(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/import`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Erro ao importar marcas: ${response.statusText}`);
    }

    return response.json();
  }
}
