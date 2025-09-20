import { executeQuery } from '../database';

/**
 * Interface para dados do SKU da VTEX
 * Baseado na estrutura real da API VTEX e campos da tabela skus_vtex
 */
export interface VTEXSKU {
  Id: number;
  ProductId: number;
  IsActive: boolean;
  Name: string;
  Height: number;
  RealHeight?: number;
  Width: number;
  RealWidth?: number;
  Length: number;
  RealLength?: number;
  WeightKg: number;
  RealWeightKg?: number;
  ModalId: number;
  RefId: string;
  CubicWeight: number;
  IsKit: boolean;
  IsDynamicKit?: boolean;
  InternalNote?: string;
  DateUpdated: string;
  RewardValue: number;
  CommercialConditionId: number;
  EstimatedDateArrival?: string;
  FlagKitItensSellApart: boolean;
  ManufacturerCode: string;
  ReferenceStockKeepingUnitId?: number;
  Position: number;
  EditionSkuId?: number;
  ApprovedAdminId: number;
  EditionAdminId: number;
  ActivateIfPossible: boolean;
  SupplierCode?: string;
  MeasurementUnit: string;
  UnitMultiplier: number;
  IsInventoried?: boolean;
  IsTransported?: boolean;
  IsGiftCardRecharge?: boolean;
  ModalType?: string;
}

/**
 * Resultado da importação de SKUs
 */
export interface SKUImportResult {
  success: boolean;
  message: string;
  data?: {
    importedCount: number;
    updatedCount: number;
    skus: VTEXSKU[];
  };
}

/**
 * Módulo de Importação de SKUs da VTEX
 * 
 * Este módulo é responsável por importar SKUs da VTEX usando o vtex_id do produto como identificador.
 * 
 * FLUXO DE IMPORTAÇÃO:
 * 1. Recebe um vtex_id do produto
 * 2. Busca os SKUs na API da VTEX usando o vtex_id do produto
 * 3. Para cada SKU encontrado:
 *    - Verifica se já existe na tabela skus_vtex
 *    - Se existe: atualiza os dados
 *    - Se não existe: insere um novo registro
 * 4. Retorna o resultado da operação
 * 
 * IMPORTANTE: A importação é feita pelo vtex_id do produto, não pelo ID do SKU
 */
export class SKUImportModule {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  /**
   * Importar SKUs por vtex_id do produto
   * 
   * @param productVtexId - ID da VTEX do produto (ex: 2000024)
   * @returns Promise<SKUImportResult> - Resultado da importação
   * 
   * EXEMPLO DE USO:
   * const importer = new SKUImportModule(baseUrl, headers);
   * const result = await importer.importSkusByProductId(2000024);
   * 
   * if (result.success) {
   *   console.log(`SKUs importados: ${result.data.importedCount}`);
   * } else {
   *   console.error(`Erro: ${result.message}`);
   * }
   */
  async importSkusByProductId(productVtexId: number): Promise<SKUImportResult> {
    try {
      console.log(`📦 PASSO 1: Importando SKUs por product_vtex_id: ${productVtexId}`);

      // PASSO 1: Buscar SKUs na VTEX usando o vtex_id do produto
      // Endpoint: /api/catalog_system/pvt/sku/stockkeepingunitByProductId/{productVtexId}
      console.log(`🔍 Buscando SKUs na VTEX com product_vtex_id: ${productVtexId}`);
      const skusResponse = await fetch(`${this.baseUrl}/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${productVtexId}`, {
        method: 'GET',
        headers: this.headers
      });

      // Verificar se a resposta foi bem-sucedida
      if (!skusResponse.ok) {
        if (skusResponse.status === 404) {
          return {
            success: false,
            message: `❌ SKUs para produto com vtex_id "${productVtexId}" não encontrados na VTEX`
          };
        } else {
          return {
            success: false,
            message: `❌ Erro na API VTEX (Status: ${skusResponse.status})`
          };
        }
      }

      // Converter resposta para array de SKUs
      const skus: VTEXSKU[] = await skusResponse.json();
      console.log(`✅ ${skus.length} SKUs encontrados na VTEX para o produto ${productVtexId}`);

      if (skus.length === 0) {
        return {
          success: true,
          message: `✅ Nenhum SKU encontrado para o produto ${productVtexId}`,
          data: {
            importedCount: 0,
            updatedCount: 0,
            skus: []
          }
        };
      }

      let importedCount = 0;
      let updatedCount = 0;

      // PASSO 2: Processar cada SKU encontrado
      for (let i = 0; i < skus.length; i++) {
        const vtexSku = skus[i];
        console.log(`🔍 Processando SKU ${i + 1}/${skus.length}: ${vtexSku.Id} (${vtexSku.Name})`);

        // PASSO 2A: Verificar se o SKU já existe na nossa base de dados
        // Tabela: skus_vtex
        // Campo de busca: id_sku_vtex (que corresponde ao Id da VTEX)
        const existingSku = await executeQuery(`
          SELECT id_sku_vtex FROM skus_vtex WHERE id_sku_vtex = ?
        `, [vtexSku.Id]);

        if (existingSku && existingSku.length > 0) {
          // PASSO 2B: SKU já existe - ATUALIZAR dados
          console.log(`📝 SKU já existe, atualizando dados...`);
          
          await executeQuery(`
            UPDATE skus_vtex SET
              id_produto_vtex = ?,           -- ID do produto VTEX
              is_active = ?,                 -- Se está ativo
              name = ?,                      -- Nome do SKU
              ref_sku = ?,                   -- Reference ID
              date_updated = ?,              -- Data de atualização da VTEX
              updated_at = NOW()             -- Data de atualização local
            WHERE id_sku_vtex = ?
          `, [
            vtexSku.ProductId,               // ID do produto VTEX
            vtexSku.IsActive,                // Ativo
            vtexSku.Name,                    // Nome do SKU
            vtexSku.RefId,                   // Reference ID
            vtexSku.DateUpdated,             // Data de atualização da VTEX
            vtexSku.Id                       // ID do SKU
          ]);
          
          updatedCount++;
          console.log(`✅ SKU atualizado: ${vtexSku.Name}`);
        } else {
          // PASSO 2C: SKU não existe - INSERIR novo registro
          console.log(`📝 SKU não existe, inserindo novo registro...`);
          
          await executeQuery(`
            INSERT INTO skus_vtex (
              id_sku_vtex,                   -- ID da VTEX (chave primária)
              id_produto_vtex,               -- ID do produto VTEX
              is_active,                     -- Se está ativo
              name,                          -- Nome do SKU
              ref_sku,                       -- Reference ID
              date_updated,                  -- Data de atualização da VTEX
              created_at,                    -- Data de criação local
              updated_at                     -- Data de atualização local
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            vtexSku.Id,                      // ID da VTEX
            vtexSku.ProductId,               // ID do produto VTEX
            vtexSku.IsActive,                // Ativo
            vtexSku.Name,                    // Nome do SKU
            vtexSku.RefId,                   // Reference ID
            vtexSku.DateUpdated              // Data de atualização da VTEX
          ]);
          
          importedCount++;
          console.log(`✅ SKU inserido: ${vtexSku.Name} (ID: ${vtexSku.Id})`);
        }
      }

      // PASSO 3: Retornar resultado da importação
      return {
        success: true,
        message: `✅ ${importedCount} SKUs importados e ${updatedCount} SKUs atualizados com sucesso`,
        data: {
          importedCount,
          updatedCount,
          skus
        }
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar SKUs para produto ${productVtexId}:`, error);
      return {
        success: false,
        message: `❌ Erro ao importar SKUs: ${error.message}`
      };
    }
  }

  /**
   * Verificar se SKU existe por ID
   */
  async checkSkuExists(skuId: number): Promise<boolean> {
    try {
      const result = await executeQuery(`
        SELECT id_sku_vtex FROM skus_vtex WHERE id_sku_vtex = ?
      `, [skuId]);
      
      return result && result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar SKU:', error);
      return false;
    }
  }

  /**
   * Buscar SKU por ID
   */
  async getSkuById(skuId: number): Promise<VTEXSKU | null> {
    try {
      const result = await executeQuery(`
        SELECT id_sku_vtex, id_produto_vtex, is_active, name, ref_sku, date_updated
        FROM skus_vtex WHERE id_sku_vtex = ?
      `, [skuId]);
      
      if (result && result.length > 0) {
        const sku = result[0];
        return {
          Id: sku.id_sku_vtex,
          ProductId: sku.id_produto_vtex,
          Name: sku.name,
          RefId: sku.ref_sku,
          IsActive: sku.is_active,
          Height: 0, // Campo não existe na tabela atual
          Width: 0, // Campo não existe na tabela atual
          Length: 0, // Campo não existe na tabela atual
          WeightKg: 0, // Campo não existe na tabela atual
          ModalId: 0, // Campo não existe na tabela atual
          IsKit: false, // Campo não existe na tabela atual
          InternalNote: '', // Campo não existe na tabela atual
          RewardValue: 0, // Campo não existe na tabela atual
          CommercialConditionId: 0, // Campo não existe na tabela atual
          FlagKitItensSellApart: false, // Campo não existe na tabela atual
          ManufacturerCode: '', // Campo não existe na tabela atual
          Position: 0, // Campo não existe na tabela atual
          MeasurementUnit: '', // Campo não existe na tabela atual
          UnitMultiplier: 0, // Campo não existe na tabela atual
          CubicWeight: 0, // Campo não existe na tabela
          DateUpdated: sku.date_updated,
          EstimatedDateArrival: '', // Campo não existe na tabela atual
          ApprovedAdminId: 0, // Campo não existe na tabela
          EditionAdminId: 0, // Campo não existe na tabela
          ActivateIfPossible: true, // Campo não existe na tabela
          ModalType: '' // Campo não existe na tabela atual
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar SKU:', error);
      return null;
    }
  }
}
