import { Product, ProductListResponse, CreateProductRequest, UpdateProductRequest, ProductPaginationOptions } from '../types';

const API_BASE = '/api/products';

export class ProductsAPI {
  /**
   * Buscar lista de produtos com paginação e filtros
   */
  static async getProducts(options: ProductPaginationOptions): Promise<ProductListResponse> {
    const queryParams = new URLSearchParams();
    
    // Parâmetros básicos
    queryParams.append('page', options.page.toString());
    queryParams.append('limit', options.limit.toString());
    
    // Ordenação
    if (options.sort) {
      queryParams.append('sort', options.sort.field);
      queryParams.append('order', options.sort.direction);
    }
    
    // Filtros
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          // Para arrays, adicionar cada valor como parâmetro separado
          value.forEach(v => queryParams.append(key, v));
        } else if (value !== '') {
          // Para valores únicos
          queryParams.append(key, value);
        }
      });
    }

    const response = await fetch(`${API_BASE}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar produtos: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Buscar produto por ID
   */
  static async getProductById(id: number): Promise<Product> {
    const response = await fetch(`${API_BASE}/${id}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar produto: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Criar novo produto
   */
  static async createProduct(product: CreateProductRequest): Promise<Product> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar produto: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Atualizar produto existente
   */
  static async updateProduct(id: number, product: UpdateProductRequest): Promise<Product> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      throw new Error(`Erro ao atualizar produto: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Deletar produto
   */
  static async deleteProduct(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Erro ao deletar produto: ${response.statusText}`);
    }
  }

  /**
   * Buscar SKUs de um produto
   */
  static async getProductSKUs(productId: number): Promise<any[]> {
    const response = await fetch(`${API_BASE}/${productId}/skus`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar SKUs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Buscar imagens de um produto
   */
  static async getProductImages(productId: number): Promise<any[]> {
    const response = await fetch(`${API_BASE}/${productId}/images`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar imagens: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Deletar múltiplos produtos
   */
  static async deleteMultipleProducts(ids: number[]): Promise<void> {
    const response = await fetch(`${API_BASE}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productIds: ids }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao deletar produtos: ${response.statusText}`);
    }
  }
}
