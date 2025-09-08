import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { VtexProduct, VtexCategory, VtexBrand, VtexSku, VtexApiResponse, VtexConfig } from '@/types/vtex';

export class VtexApiClient {
  private client: AxiosInstance;
  private config: VtexConfig;

  constructor(config: VtexConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: `https://${config.accountName}.${config.environment}.com.br`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-VTEX-API-AppKey': config.appKey,
        'X-VTEX-API-AppToken': config.appToken,
      },
      timeout: 30000,
    });

    // Interceptor para logs
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 VTEX API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ VTEX API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ VTEX API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ VTEX API Response Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // Método para testar conexão
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/catalog/pvt/category');
      return response.status === 200;
    } catch (error) {
      console.error('Erro ao testar conexão VTEX:', error);
      return false;
    }
  }

  // Buscar produtos com paginação
  async getProducts(page: number = 1, pageSize: number = 50): Promise<VtexApiResponse<VtexProduct[]>> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const response: AxiosResponse<VtexProduct[]> = await this.client.get(
        `/api/catalog/pvt/product/GetProductAndSkuIds?categoryId=&brandId=&from=${from}&to=${to}`
      );

      // Buscar detalhes dos produtos
      const productIds = response.data;
      const products: VtexProduct[] = [];

      for (const productId of productIds) {
        try {
          const productDetail = await this.getProductById(productId.Id);
          if (productDetail) {
            products.push(productDetail);
          }
        } catch (error) {
          console.error(`Erro ao buscar produto ${productId.Id}:`, error);
        }
      }

      return {
        data: products,
        range: {
          total: response.headers['x-total-count'] || products.length,
          from,
          to: Math.min(to, products.length - 1)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  // Buscar produto por ID
  async getProductById(productId: number): Promise<VtexProduct | null> {
    try {
      const response: AxiosResponse<VtexProduct> = await this.client.get(
        `/api/catalog/pvt/product/ProductGet/${productId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar produto ${productId}:`, error);
      return null;
    }
  }

  // Buscar SKUs de um produto
  async getProductSkus(productId: number): Promise<VtexSku[]> {
    try {
      const response: AxiosResponse<VtexSku[]> = await this.client.get(
        `/api/catalog/pvt/stockkeepingunit?productId=${productId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar SKUs do produto ${productId}:`, error);
      return [];
    }
  }

  // Buscar categorias
  async getCategories(): Promise<VtexCategory[]> {
    try {
      const response: AxiosResponse<VtexCategory[]> = await this.client.get(
        '/api/catalog/pvt/category'
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  }

  // Buscar categoria por ID
  async getCategoryById(categoryId: number): Promise<VtexCategory | null> {
    try {
      const response: AxiosResponse<VtexCategory> = await this.client.get(
        `/api/catalog/pvt/category/${categoryId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar categoria ${categoryId}:`, error);
      return null;
    }
  }

  // Buscar marcas
  async getBrands(): Promise<VtexBrand[]> {
    try {
      const response: AxiosResponse<VtexBrand[]> = await this.client.get(
        '/api/catalog/pvt/brand'
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar marcas:', error);
      throw error;
    }
  }

  // Buscar marca por ID
  async getBrandById(brandId: number): Promise<VtexBrand | null> {
    try {
      const response: AxiosResponse<VtexBrand> = await this.client.get(
        `/api/catalog/pvt/brand/${brandId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar marca ${brandId}:`, error);
      return null;
    }
  }

  // Buscar SKUs com paginação
  async getSkus(page: number = 1, pageSize: number = 50): Promise<VtexApiResponse<VtexSku[]>> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const response: AxiosResponse<VtexSku[]> = await this.client.get(
        `/api/catalog/pvt/stockkeepingunit?from=${from}&to=${to}`
      );

      return {
        data: response.data,
        range: {
          total: response.headers['x-total-count'] || response.data.length,
          from,
          to: Math.min(to, response.data.length - 1)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar SKUs:', error);
      throw error;
    }
  }

  // Buscar SKU por ID
  async getSkuById(skuId: number): Promise<VtexSku | null> {
    try {
      const response: AxiosResponse<VtexSku> = await this.client.get(
        `/api/catalog/pvt/stockkeepingunit/${skuId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar SKU ${skuId}:`, error);
      return null;
    }
  }

  // Buscar todos os produtos (com paginação automática)
  async getAllProducts(batchSize: number = 50): Promise<VtexProduct[]> {
    const allProducts: VtexProduct[] = [];
    let page = 1;
    let hasMore = true;

    console.log('🔄 Iniciando busca de todos os produtos...');

    while (hasMore) {
      try {
        console.log(`📄 Buscando página ${page} (${batchSize} produtos por página)...`);
        
        const response = await this.getProducts(page, batchSize);
        allProducts.push(...response.data);
        
        console.log(`✅ Página ${page} processada: ${response.data.length} produtos encontrados`);
        
        // Verificar se há mais páginas
        hasMore = response.data.length === batchSize;
        page++;
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erro na página ${page}:`, error);
        hasMore = false;
      }
    }

    console.log(`🎉 Busca concluída: ${allProducts.length} produtos encontrados no total`);
    return allProducts;
  }

  // Buscar todos os SKUs (com paginação automática)
  async getAllSkus(batchSize: number = 50): Promise<VtexSku[]> {
    const allSkus: VtexSku[] = [];
    let page = 1;
    let hasMore = true;

    console.log('🔄 Iniciando busca de todos os SKUs...');

    while (hasMore) {
      try {
        console.log(`📄 Buscando página ${page} (${batchSize} SKUs por página)...`);
        
        const response = await this.getSkus(page, batchSize);
        allSkus.push(...response.data);
        
        console.log(`✅ Página ${page} processada: ${response.data.length} SKUs encontrados`);
        
        // Verificar se há mais páginas
        hasMore = response.data.length === batchSize;
        page++;
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erro na página ${page}:`, error);
        hasMore = false;
      }
    }

    console.log(`🎉 Busca concluída: ${allSkus.length} SKUs encontrados no total`);
    return allSkus;
  }
}

// Função para criar instância do cliente VTEX
export const createVtexClient = (): VtexApiClient => {
  const config: VtexConfig = {
    accountName: process.env.VTEX_ACCOUNT_NAME || 'demo',
    environment: process.env.VTEX_ENVIRONMENT || 'vtexcommercestable',
    appKey: process.env.VTEX_APP_KEY || 'demo-key',
    appToken: process.env.VTEX_APP_TOKEN || 'demo-token',
  };

  // Em desenvolvimento, permitir valores demo
  if (process.env.NODE_ENV === 'development') {
    return new VtexApiClient(config);
  }

  if (!config.accountName || !config.appKey || !config.appToken) {
    throw new Error('Configurações VTEX não encontradas. Verifique as variáveis de ambiente.');
  }

  return new VtexApiClient(config);
};

export default VtexApiClient;
