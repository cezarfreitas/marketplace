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
        // Campo de busca: id (que corresponde ao Id da VTEX)
        const existingSku = await executeQuery(`
          SELECT id FROM skus_vtex WHERE id = ?
        `, [vtexSku.Id]);

        if (existingSku && existingSku.length > 0) {
          // PASSO 2B: SKU já existe - ATUALIZAR dados
          console.log(`📝 SKU já existe, atualizando dados...`);
          
          await executeQuery(`
            UPDATE skus_vtex SET
              product_id = ?,                -- ID do produto (referência local)
              name = ?,                      -- Nome do SKU
              is_active = ?,                 -- Se está ativo
              is_kit = ?,                    -- Se é kit
              commercial_condition_id = ?,   -- ID da condição comercial
              reward_value = ?,              -- Valor de recompensa
              estimated_date_arrival = ?,    -- Data estimada de chegada
              measurement_unit = ?,          -- Unidade de medida
              unit_multiplier = ?,           -- Multiplicador de unidade
              manufacturer_code = ?,         -- Código do fabricante
              updated_at = NOW()             -- Data de atualização
            WHERE id = ?
          `, [
            vtexSku.ProductId,               // Mapear para product_id local
            vtexSku.Name,                    // Nome do SKU
            vtexSku.IsActive,                // Ativo
            vtexSku.IsKit,                   // É kit
            vtexSku.CommercialConditionId,   // ID da condição comercial
            vtexSku.RewardValue,             // Valor de recompensa
            vtexSku.EstimatedDateArrival,    // Data estimada
            vtexSku.MeasurementUnit,         // Unidade de medida
            vtexSku.UnitMultiplier,          // Multiplicador
            vtexSku.ManufacturerCode,        // Código do fabricante
            vtexSku.Id                       // ID do SKU
          ]);
          
          updatedCount++;
          console.log(`✅ SKU atualizado: ${vtexSku.Name}`);
        } else {
          // PASSO 2C: SKU não existe - INSERIR novo registro
          console.log(`📝 SKU não existe, inserindo novo registro...`);
          
          await executeQuery(`
            INSERT INTO skus_vtex (
              id,                            -- ID da VTEX (chave primária)
              product_id,                    -- ID do produto (referência local)
              name,                          -- Nome do SKU
              is_active,                     -- Se está ativo
              is_kit,                        -- Se é kit
              commercial_condition_id,       -- ID da condição comercial
              reward_value,                  -- Valor de recompensa
              estimated_date_arrival,        -- Data estimada de chegada
              measurement_unit,              -- Unidade de medida
              unit_multiplier,               -- Multiplicador de unidade
              manufacturer_code              -- Código do fabricante
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            vtexSku.Id,                      // ID da VTEX
            vtexSku.ProductId,               // ID do produto (referência local)
            vtexSku.Name,                    // Nome do SKU
            vtexSku.IsActive,                // Ativo
            vtexSku.IsKit,                   // É kit
            vtexSku.CommercialConditionId,   // ID da condição comercial
            vtexSku.RewardValue,             // Valor de recompensa
            vtexSku.EstimatedDateArrival,    // Data estimada
            vtexSku.MeasurementUnit,         // Unidade de medida
            vtexSku.UnitMultiplier,          // Multiplicador
            vtexSku.ManufacturerCode         // Código do fabricante
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
        SELECT id FROM skus_vtex WHERE id = ?
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
        SELECT id, product_id, name, is_active, is_kit, commercial_condition_id, 
               reward_value, estimated_date_arrival, measurement_unit, unit_multiplier, 
               manufacturer_code
        FROM skus_vtex WHERE id = ?
      `, [skuId]);
      
      if (result && result.length > 0) {
        const sku = result[0];
        return {
          Id: sku.id,
          ProductId: sku.product_id,
          Name: sku.name,
          RefId: '', // Campo não existe na tabela atual
          IsActive: sku.is_active,
          Height: 0, // Campo não existe na tabela atual
          Width: 0, // Campo não existe na tabela atual
          Length: 0, // Campo não existe na tabela atual
          WeightKg: 0, // Campo não existe na tabela atual
          ModalId: 0, // Campo não existe na tabela atual
          IsKit: sku.is_kit,
          InternalNote: '', // Campo não existe na tabela atual
          RewardValue: sku.reward_value,
          CommercialConditionId: sku.commercial_condition_id,
          FlagKitItensSellApart: false, // Campo não existe na tabela atual
          ManufacturerCode: sku.manufacturer_code,
          Position: 0, // Campo não existe na tabela atual
          MeasurementUnit: sku.measurement_unit,
          UnitMultiplier: sku.unit_multiplier,
          CubicWeight: 0, // Campo não existe na tabela
          DateUpdated: '', // Campo não existe na tabela
          EstimatedDateArrival: sku.estimated_date_arrival,
          ApprovedAdminId: 0, // Campo não existe na tabela
          EditionAdminId: 0, // Campo não existe na tabela
          ActivateIfPossible: true, // Campo não existe na tabela
          ModalType: sku.modal_type
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar SKU:', error);
      return null;
    }
  }
}
