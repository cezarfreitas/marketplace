import { Product, ProductListResponse, CreateProductRequest, UpdateProductRequest, ProductPaginationOptions } from '../types';

const API_BASE = '/api/products';

export class ProductsAPI {
  /**
   * Buscar lista de produtos com paginação e filtros
   */
  static async getProducts(options: ProductPaginationOptions): Promise<ProductListResponse> {
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
