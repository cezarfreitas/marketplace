import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente
config({ path: resolve(process.cwd(), '.env') });

export interface ProductAttribute {
  Id: number;
  Name: string;
  Value: string[];
}

export interface ProductAttributesResponse {
  Id: number;
  Name: string;
  Value: string[];
}

export class VtexProductAttributesService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    const accountName = process.env.VTEX_ACCOUNT_NAME;
    const environment = process.env.VTEX_ENVIRONMENT;
    const appKey = process.env.VTEX_APP_KEY;
    const appToken = process.env.VTEX_APP_TOKEN;

    if (!accountName || !environment || !appKey || !appToken) {
      throw new Error('Configurações da VTEX não encontradas nas variáveis de ambiente');
    }

    this.baseUrl = `https://${accountName}.${environment}.com.br`;
    this.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-VTEX-API-AppKey': appKey,
      'X-VTEX-API-AppToken': appToken,
    };
  }

  /**
   * Buscar especificações/atributos de um produto
   */
  async getProductSpecifications(productId: number): Promise<ProductAttribute[]> {
    try {
      console.log(`🔍 Buscando especificações do produto ID: ${productId}`);
      
      const url = `${this.baseUrl}/api/catalog_system/pvt/products/${productId}/specification`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`⚠️ Produto ${productId} não possui especificações`);
          return [];
        }
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const specifications: ProductAttributesResponse[] = await response.json();
      
      console.log(`✅ ${specifications.length} especificações encontradas para produto ${productId}`);
      
      // Transformar para o formato esperado
      const attributes: ProductAttribute[] = specifications.map(spec => ({
        Id: spec.Id,
        Name: spec.Name,
        Value: Array.isArray(spec.Value) ? spec.Value : [spec.Value]
      }));

      return attributes;

    } catch (error: any) {
      console.error(`❌ Erro ao buscar especificações do produto ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Buscar especificações de múltiplos produtos
   */
  async getMultipleProductSpecifications(productIds: number[]): Promise<Map<number, ProductAttribute[]>> {
    const results = new Map<number, ProductAttribute[]>();
    
    console.log(`🔍 Buscando especificações para ${productIds.length} produtos...`);
    
    // Processar em lotes para evitar sobrecarga
    const batchSize = 5;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      
      const promises = batch.map(async (productId) => {
        try {
          const attributes = await this.getProductSpecifications(productId);
          results.set(productId, attributes);
          
          // Pequena pausa entre requisições
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          console.error(`❌ Erro ao buscar especificações do produto ${productId}:`, error.message);
          results.set(productId, []);
        }
      });
      
      await Promise.all(promises);
      
      // Pausa entre lotes
      if (i + batchSize < productIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`✅ Especificações buscadas para ${results.size} produtos`);
    return results;
  }
}

export default VtexProductAttributesService;
