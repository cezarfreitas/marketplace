import { executeQuery } from '../database';

/**
 * Interface para dados do atributo da VTEX
 */
export interface VTEXProductAttribute {
  Id: number;
  Name: string;
  Value: string[];
}

/**
 * Resultado da importação de atributos
 */
export interface ProductAttributesImportResult {
  success: boolean;
  message: string;
  data?: {
    importedCount: number;
    updatedCount: number;
    attributes: VTEXProductAttribute[];
  };
}

/**
 * Módulo de Importação de Atributos de Produtos da VTEX
 * 
 * Este módulo é responsável por importar atributos de produtos da VTEX usando o ID do produto.
 * 
 * FLUXO DE IMPORTAÇÃO:
 * 1. Recebe um ID do produto (da tabela products_vtex)
 * 2. Busca os atributos na API da VTEX usando o ID do produto
 * 3. Para cada atributo encontrado:
 *    - Verifica se já existe na tabela product_attributes_vtex
 *    - Se existe: atualiza os dados
 *    - Se não existe: insere um novo registro
 * 4. Retorna o resultado da operação
 * 
 * IMPORTANTE: A importação é feita pelo ID do produto (da tabela products_vtex)
 * Endpoint: /api/catalog_system/pvt/products/{productId}/specification
 */
export class ProductAttributesVtexImportModule {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  /**
   * Importar atributos por ID do produto
   * 
   * @param productId - ID do produto na VTEX (ex: 203723663)
   * @returns Promise<ProductAttributesImportResult> - Resultado da importação
   * 
   * EXEMPLO DE USO:
   * const importer = new ProductAttributesVtexImportModule(baseUrl, headers);
   * const result = await importer.importAttributesByProductId(203723663);
   * 
   * if (result.success) {
   *   console.log(`Atributos importados: ${result.data.importedCount}`);
   * } else {
   *   console.error(`Erro: ${result.message}`);
   * }
   */
  async importAttributesByProductId(productId: number): Promise<ProductAttributesImportResult> {
    try {
      console.log(`📋 PASSO 1: Importando atributos por product_id: ${productId}`);

      // PASSO 1: Buscar atributos na VTEX usando o ID do produto
      // Endpoint: /api/catalog_system/pvt/products/{productId}/specification
      console.log(`🔍 Buscando atributos na VTEX com product_id: ${productId}`);
      const attributesResponse = await fetch(`${this.baseUrl}/api/catalog_system/pvt/products/${productId}/specification`, {
        method: 'GET',
        headers: this.headers
      });

      // Verificar se a resposta foi bem-sucedida
      if (!attributesResponse.ok) {
        if (attributesResponse.status === 404) {
          return {
            success: false,
            message: `❌ Atributos para produto com ID "${productId}" não encontrados na VTEX`
          };
        } else {
          return {
            success: false,
            message: `❌ Erro na API VTEX (Status: ${attributesResponse.status})`
          };
        }
      }

      // Converter resposta para array de atributos
      const attributes: VTEXProductAttribute[] = await attributesResponse.json();
      console.log(`✅ ${attributes.length} atributos encontrados na VTEX para o produto ${productId}`);

      if (attributes.length === 0) {
        return {
          success: true,
          message: `✅ Nenhum atributo encontrado para o produto ${productId}`,
          data: {
            importedCount: 0,
            updatedCount: 0,
            attributes: []
          }
        };
      }

      let importedCount = 0;
      let updatedCount = 0;

      // PASSO 2: Processar cada atributo encontrado
      for (let i = 0; i < attributes.length; i++) {
        const vtexAttribute = attributes[i];
        console.log(`🔍 Processando atributo ${i + 1}/${attributes.length}: ${vtexAttribute.Id} (${vtexAttribute.Name})`);

        // PASSO 2A: Verificar se o atributo deve ser ignorado
        if (vtexAttribute.Name === 'Seller' || vtexAttribute.Name === 'Categoria') {
          console.log(`⏭️ Atributo "${vtexAttribute.Name}" ignorado (não será importado)`);
          continue;
        }

        // PASSO 2B: Verificar se o atributo já existe na nossa base de dados
        // Tabela: product_attributes_vtex
        // Campos de busca: id_product_vtex + attribute_id (chave única)
        const existingAttribute = await executeQuery(`
          SELECT id_attribute_vtex FROM product_attributes_vtex 
          WHERE id_product_vtex = ? AND attribute_id = ?
        `, [productId, vtexAttribute.Id]);

        if (existingAttribute && existingAttribute.length > 0) {
          // PASSO 2C: Atributo já existe - ATUALIZAR dados
          console.log(`📝 Atributo já existe, atualizando dados...`);
          
          await executeQuery(`
            UPDATE product_attributes_vtex SET
              attribute_name = ?,                    -- Nome do atributo
              attribute_value = ?,                   -- Valor do atributo em JSON
              updated_at = NOW()                     -- Data de atualização
            WHERE id_product_vtex = ? AND attribute_id = ?
          `, [
            vtexAttribute.Name,
            JSON.stringify(vtexAttribute.Value),
            productId,
            vtexAttribute.Id
          ]);
          
          updatedCount++;
          console.log(`✅ Atributo atualizado: ${vtexAttribute.Name}`);
        } else {
          // PASSO 2D: Atributo não existe - INSERIR novo registro
          console.log(`📝 Atributo não existe, inserindo novo registro...`);
          
          await executeQuery(`
            INSERT INTO product_attributes_vtex (
              id_product_vtex,                       -- ID do produto VTEX
              attribute_id,                          -- ID do atributo na VTEX
              attribute_name,                        -- Nome do atributo
              attribute_value                        -- Valor do atributo em JSON
            ) VALUES (?, ?, ?, ?)
          `, [
            productId,                               // ID do produto VTEX
            vtexAttribute.Id,                       // ID do atributo na VTEX
            vtexAttribute.Name,                     // Nome do atributo
            JSON.stringify(vtexAttribute.Value)     // Valor em JSON
          ]);
          
          importedCount++;
          console.log(`✅ Atributo inserido: ${vtexAttribute.Name} (ID: ${vtexAttribute.Id})`);
        }
      }

      // PASSO 3: Retornar resultado da importação
      return {
        success: true,
        message: `✅ ${importedCount} atributos importados e ${updatedCount} atributos atualizados com sucesso`,
        data: {
          importedCount,
          updatedCount,
          attributes
        }
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar atributos para produto ${productId}:`, error);
      return {
        success: false,
        message: `❌ Erro ao importar atributos: ${error.message}`
      };
    }
  }

  /**
   * Verificar se atributo existe por product_id e attribute_id
   */
  async checkAttributeExists(productId: number, attributeId: number): Promise<boolean> {
    try {
      const result = await executeQuery(`
        SELECT id_attribute_vtex FROM product_attributes_vtex 
        WHERE id_product_vtex = ? AND attribute_id = ?
      `, [productId, attributeId]);
      
      return result && result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar atributo:', error);
      return false;
    }
  }

  /**
   * Buscar atributos por product_id
   */
  async getAttributesByProductId(productId: number): Promise<VTEXProductAttribute[]> {
    try {
      const result = await executeQuery(`
        SELECT attribute_id, attribute_name, attribute_value
        FROM product_attributes_vtex WHERE id_product_vtex = ?
        ORDER BY attribute_id ASC
      `, [productId]);
      
      return result.map((attr: any) => ({
        Id: attr.attribute_id,
        Name: attr.attribute_name,
        Value: JSON.parse(attr.attribute_value)
      }));
    } catch (error) {
      console.error('Erro ao buscar atributos do produto:', error);
      return [];
    }
  }

  /**
   * Buscar atributo específico por product_id e attribute_id
   */
  async getAttributeByProductAndAttributeId(productId: number, attributeId: number): Promise<VTEXProductAttribute | null> {
    try {
      const result = await executeQuery(`
        SELECT attribute_id, attribute_name, attribute_value
        FROM product_attributes_vtex 
        WHERE id_product_vtex = ? AND attribute_id = ?
      `, [productId, attributeId]);
      
      if (result && result.length > 0) {
        const attr = result[0];
        return {
          Id: attr.attribute_id,
          Name: attr.attribute_name,
          Value: JSON.parse(attr.attribute_value)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar atributo:', error);
      return null;
    }
  }
}
