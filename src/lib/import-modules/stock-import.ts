import { executeQuery } from '../database';

/**
 * Interface para dados de estoque da VTEX
 */
export interface VTEXStockBalance {
  warehouseId: string;
  warehouseName: string;
  totalQuantity: number;
  reservedQuantity: number;
  hasUnlimitedQuantity: boolean;
  timeToRefill?: string;
  dateOfSupplyUtc?: string;
  leadTime: string;
}

/**
 * Interface para resposta de estoque da VTEX
 */
export interface VTEXStockResponse {
  skuId: string;
  balance: VTEXStockBalance[];
}

/**
 * Resultado da importação de estoque
 */
export interface StockImportResult {
  success: boolean;
  message: string;
  data?: {
    importedCount: number;
    updatedCount: number;
    filteredCount: number;
    errors: string[];
  };
}

/**
 * Módulo de Importação de Estoque da VTEX
 * 
 * Este módulo é responsável por importar estoque da VTEX usando o ID do SKU como identificador.
 * 
 * FLUXO DE IMPORTAÇÃO:
 * 1. Recebe um ID do SKU (da tabela skus_vtex)
 * 2. Busca o estoque na API da VTEX usando o ID do SKU
 * 3. Filtra apenas warehouses com nome = "13"
 * 4. Para cada warehouse encontrado:
 *    - Verifica se já existe na tabela stock_vtex
 *    - Se existe: atualiza os dados
 *    - Se não existe: insere um novo registro
 * 5. Retorna o resultado da operação
 * 
 * IMPORTANTE: A importação é feita pelo ID do SKU (da tabela skus_vtex) e filtra apenas warehouse = "13"
 */
export class StockImportModule {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  /**
   * Importar estoque por ID do SKU
   * 
   * @param skuId - ID do SKU na VTEX (ex: 203773035)
   * @param warehouseFilter - Filtro opcional para nome do warehouse (ex: "13" ou null para todos)
   * @returns Promise<StockImportResult> - Resultado da importação
   * 
   * EXEMPLO DE USO:
   * const importer = new StockImportModule(baseUrl, headers);
   * const result = await importer.importStockBySkuId(203773035, "13"); // Apenas warehouse "13"
   * const result = await importer.importStockBySkuId(203773035); // Todos os warehouses
   * 
   * if (result.success) {
   *   console.log(`Estoque importado: ${result.data.importedCount} registros`);
   * } else {
   *   console.error(`Erro: ${result.message}`);
   * }
   */
  async importStockBySkuId(skuId: number, warehouseFilter?: string): Promise<StockImportResult> {
    try {
      console.log(`📦 PASSO 1: Importando estoque por sku_id: ${skuId}`);

      // PASSO 1: Buscar estoque na VTEX usando o ID do SKU
      // Endpoint: /api/logistics/pvt/inventory/skus/{skuId}
      console.log(`🔍 Buscando estoque na VTEX com sku_id: ${skuId}`);
      const stockResponse = await fetch(`${this.baseUrl}/api/logistics/pvt/inventory/skus/${skuId}`, {
        method: 'GET',
        headers: this.headers
      });

      // Verificar se a resposta foi bem-sucedida
      if (!stockResponse.ok) {
        if (stockResponse.status === 404) {
          return {
            success: false,
            message: `❌ Estoque para SKU com ID "${skuId}" não encontrado na VTEX`
          };
        } else {
          return {
            success: false,
            message: `❌ Erro na API VTEX (Status: ${stockResponse.status})`
          };
        }
      }

      // Converter resposta para objeto de estoque
      const stockData: VTEXStockResponse = await stockResponse.json();
      console.log(`✅ Estoque encontrado na VTEX para o SKU ${skuId}: ${stockData.balance.length} warehouses`);

      if (stockData.balance.length === 0) {
        return {
          success: true,
          message: `✅ Nenhum estoque encontrado para o SKU ${skuId}`,
          data: {
            importedCount: 0,
            updatedCount: 0,
            filteredCount: 0,
            errors: []
          }
        };
      }

      // PASSO 2: Filtrar warehouses (se especificado)
      let filteredBalances = stockData.balance;
      if (warehouseFilter) {
        filteredBalances = stockData.balance.filter(balance => 
          balance.warehouseName === warehouseFilter || balance.warehouseId === warehouseFilter
        );
        console.log(`🔍 Filtrado para warehouse "${warehouseFilter}": ${filteredBalances.length} registros`);
        
        if (filteredBalances.length === 0) {
          return {
            success: true,
            message: `✅ Nenhum estoque encontrado para o SKU ${skuId} no warehouse "${warehouseFilter}"`,
            data: {
              importedCount: 0,
              updatedCount: 0,
              filteredCount: stockData.balance.length,
              errors: []
            }
          };
        }
      } else {
        console.log(`🔍 Importando todos os warehouses: ${filteredBalances.length} registros`);
      }

      let importedCount = 0;
      let updatedCount = 0;
      const errors: string[] = [];

      // PASSO 3: Processar cada warehouse filtrado
      for (let i = 0; i < filteredBalances.length; i++) {
        const balance = filteredBalances[i];
        console.log(`🔍 Processando warehouse ${i + 1}/${filteredBalances.length}: ${balance.warehouseName} (${balance.warehouseId})`);

        try {
          // PASSO 3A: Verificar se o estoque já existe na nossa base de dados
          // Tabela: stock_vtex
          // Campos de busca: id_sku_vtex + warehouse_id
          const existingStock = await executeQuery(`
            SELECT id_stock_vtex FROM stock_vtex WHERE id_sku_vtex = ? AND warehouse_id = ?
          `, [skuId, balance.warehouseId]);

          if (existingStock && existingStock.length > 0) {
            // PASSO 3B: Estoque já existe - ATUALIZAR dados
            console.log(`📝 Estoque já existe, atualizando dados...`);
            
            await executeQuery(`
              UPDATE stock_vtex SET
                warehouse_name = ?,           -- Nome do warehouse
                total_quantity = ?,           -- Quantidade total
                updated_at = NOW()            -- Data de atualização
              WHERE id_sku_vtex = ? AND warehouse_id = ?
            `, [
              balance.warehouseName,
              balance.totalQuantity,
              skuId,
              balance.warehouseId
            ]);
            
            updatedCount++;
            console.log(`✅ Estoque atualizado: ${balance.warehouseName} (Qtd: ${balance.totalQuantity})`);
          } else {
            // PASSO 3C: Estoque não existe - INSERIR novo registro
            console.log(`📝 Estoque não existe, inserindo novo registro...`);
            
            await executeQuery(`
              INSERT INTO stock_vtex (
                id_sku_vtex,                  -- ID do SKU VTEX
                warehouse_id,                 -- ID do warehouse
                warehouse_name,               -- Nome do warehouse
                total_quantity,               -- Quantidade total
                created_at,                   -- Data de criação
                updated_at                    -- Data de atualização
              ) VALUES (?, ?, ?, ?, NOW(), NOW())
            `, [
              skuId,                          // ID do SKU VTEX
              balance.warehouseId,            // ID do warehouse
              balance.warehouseName,          // Nome do warehouse
              balance.totalQuantity           // Quantidade total
            ]);
            
            importedCount++;
            console.log(`✅ Estoque inserido: ${balance.warehouseName} (Qtd: ${balance.totalQuantity})`);
          }
        } catch (error: any) {
          const errorMsg = `Erro ao processar warehouse ${balance.warehouseName}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // PASSO 4: Retornar resultado da importação
      return {
        success: true,
        message: `✅ ${importedCount} estoques importados e ${updatedCount} estoques atualizados com sucesso`,
        data: {
          importedCount,
          updatedCount,
          filteredCount: stockData.balance.length,
          errors
        }
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar estoque para SKU ${skuId}:`, error);
      return {
        success: false,
        message: `❌ Erro ao importar estoque: ${error.message}`,
        data: {
          importedCount: 0,
          updatedCount: 0,
          filteredCount: 0,
          errors: [error.message]
        }
      };
    }
  }

  /**
   * Importar estoque para múltiplos SKUs
   */
  async importStockForSkus(skuIds: number[]): Promise<StockImportResult> {
    try {
      console.log(`📦 Importando estoque para ${skuIds.length} SKUs...`);
      
      let totalImported = 0;
      let totalUpdated = 0;
      let totalFiltered = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < skuIds.length; i++) {
        const skuId = skuIds[i];
        console.log(`\n🔍 Processando SKU ${i + 1}/${skuIds.length}: ${skuId}`);
        
        const result = await this.importStockBySkuId(skuId);
        
        if (result.success && result.data) {
          totalImported += result.data.importedCount;
          totalUpdated += result.data.updatedCount;
          totalFiltered += result.data.filteredCount;
          allErrors.push(...result.data.errors);
        } else {
          allErrors.push(`SKU ${skuId}: ${result.message}`);
        }
      }

      return {
        success: true,
        message: `✅ Importação concluída: ${totalImported} importados, ${totalUpdated} atualizados`,
        data: {
          importedCount: totalImported,
          updatedCount: totalUpdated,
          filteredCount: totalFiltered,
          errors: allErrors
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao importar estoque para múltiplos SKUs:', error);
      return {
        success: false,
        message: `❌ Erro ao importar estoque: ${error.message}`,
        data: {
          importedCount: 0,
          updatedCount: 0,
          filteredCount: 0,
          errors: [error.message]
        }
      };
    }
  }

  /**
   * Importar estoque para todos os SKUs ativos
   */
  async importStockForAllSkus(): Promise<StockImportResult> {
    try {
      console.log('🔍 Buscando todos os SKUs ativos da tabela skus_vtex...');
      
      const skus = await executeQuery(`
        SELECT id_sku_vtex FROM skus_vtex WHERE is_active = 1
      `);

      if (!skus || skus.length === 0) {
        return {
          success: false,
          message: 'Nenhum SKU ativo encontrado na tabela skus_vtex',
          data: {
            importedCount: 0,
            updatedCount: 0,
            filteredCount: 0,
            errors: []
          }
        };
      }

      const skuIds = skus.map((row: any) => row.id_sku_vtex);
      return await this.importStockForSkus(skuIds);

    } catch (error: any) {
      console.error('❌ Erro ao buscar SKUs:', error);
      return {
        success: false,
        message: `❌ Erro ao buscar SKUs: ${error.message}`,
        data: {
          importedCount: 0,
          updatedCount: 0,
          filteredCount: 0,
          errors: [error.message]
        }
      };
    }
  }

  /**
   * Verificar se estoque existe por sku_id e warehouse_id
   */
  async checkStockExists(skuId: number, warehouseId: string): Promise<boolean> {
    try {
      const result = await executeQuery(`
        SELECT id_stock_vtex FROM stock_vtex WHERE id_sku_vtex = ? AND warehouse_id = ?
      `, [skuId, warehouseId]);
      
      return result && result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      return false;
    }
  }

  /**
   * Buscar estoque por sku_id
   */
  async getStockBySkuId(skuId: number): Promise<VTEXStockBalance[]> {
    try {
      const result = await executeQuery(`
        SELECT warehouse_id, warehouse_name, total_quantity
        FROM stock_vtex WHERE id_sku_vtex = ?
      `, [skuId]);
      
      return result.map((row: any) => ({
        warehouseId: row.warehouse_id,
        warehouseName: row.warehouse_name,
        totalQuantity: row.total_quantity,
        reservedQuantity: 0, // Campo não existe na tabela atual
        hasUnlimitedQuantity: false, // Campo não existe na tabela atual
        timeToRefill: '', // Campo não existe na tabela atual
        dateOfSupplyUtc: '', // Campo não existe na tabela atual
        leadTime: '' // Campo não existe na tabela atual
      }));
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
      return [];
    }
  }
}
