import { executeQuery } from './database';
import { VTEXService, VTEXStockResponse, VTEXStockBalance } from './vtex-service';

export interface StockImportResult {
  success: boolean;
  message: string;
  data?: {
    importedCount: number;
    errors: Array<{ skuId: string; message: string }>;
  };
}

export class StockImportService {
  private vtexService: VTEXService;

  constructor(vtexService: VTEXService) {
    this.vtexService = vtexService;
  }

  /**
   * Importar estoque de um SKU específico
   */
  async importStockForSku(skuId: number): Promise<StockImportResult> {
    try {
      console.log(`🔍 Importando estoque para SKU ${skuId}...`);

      // Buscar dados de estoque da VTEX
      const stockData = await this.vtexService.getSKUStock(skuId);
      
      if (!stockData || !stockData.balance || stockData.balance.length === 0) {
        return {
          success: false,
          message: `Nenhum estoque encontrado para SKU ${skuId} no warehouse "13"`,
          data: { importedCount: 0, errors: [] }
        };
      }

      // Buscar ID interno do SKU na tabela skus_vtex
      const [skuRow] = await executeQuery(
        'SELECT id FROM skus_vtex WHERE id = ?',
        [skuId]
      );
      
      if (!skuRow || (skuRow as any).length === 0) {
        return {
          success: false,
          message: `SKU ${skuId} não encontrado na tabela skus_vtex`,
          data: { importedCount: 0, errors: [] }
        };
      }

      const skuInternalId = (skuRow as any)[0].id;
      let importedCount = 0;

      // Importar cada warehouse (filtrado para warehouse "13")
      for (const balance of stockData.balance) {
        try {
          await executeQuery(
            `INSERT INTO stock_vtex (
              sku_id, vtex_sku_id, warehouse_id, warehouse_name, 
              total_quantity, reserved_quantity, has_unlimited_quantity,
              time_to_refill, date_of_supply_utc, lead_time,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              total_quantity = VALUES(total_quantity),
              reserved_quantity = VALUES(reserved_quantity),
              has_unlimited_quantity = VALUES(has_unlimited_quantity),
              time_to_refill = VALUES(time_to_refill),
              date_of_supply_utc = VALUES(date_of_supply_utc),
              lead_time = VALUES(lead_time),
              updated_at = NOW()`,
            [
              skuInternalId,
              skuId.toString(),
              balance.warehouseId,
              balance.warehouseName,
              balance.totalQuantity,
              balance.reservedQuantity,
              balance.hasUnlimitedQuantity,
              balance.timeToRefill,
              balance.dateOfSupplyUtc ? new Date(balance.dateOfSupplyUtc) : null,
              balance.leadTime
            ]
          );
          
          importedCount++;
          console.log(`✅ Estoque importado para SKU ${skuId} - Warehouse: ${balance.warehouseName} - Qtd: ${balance.totalQuantity}`);
        } catch (error: any) {
          console.error(`❌ Erro ao importar estoque do warehouse ${balance.warehouseId}:`, error);
        }
      }

      return {
        success: true,
        message: `${importedCount} registros de estoque importados para SKU ${skuId}`,
        data: { importedCount, errors: [] }
      };

    } catch (error: any) {
      console.error(`❌ Erro ao importar estoque do SKU ${skuId}:`, error);
      return {
        success: false,
        message: `Erro ao importar estoque: ${error.message}`,
        data: { importedCount: 0, errors: [{ skuId: skuId.toString(), message: error.message }] }
      };
    }
  }

  /**
   * Importar estoque para múltiplos SKUs
   */
  async importStockForSkus(skuIds: number[]): Promise<StockImportResult> {
    console.log(`🚀 Iniciando importação de estoque para ${skuIds.length} SKUs...`);
    
    let totalImported = 0;
    const errors: Array<{ skuId: string; message: string }> = [];

    for (const skuId of skuIds) {
      const result = await this.importStockForSku(skuId);
      
      if (result.success && result.data) {
        totalImported += result.data.importedCount;
      } else {
        errors.push({ skuId: skuId.toString(), message: result.message });
      }
    }

    return {
      success: errors.length === 0,
      message: `${totalImported} registros de estoque importados de ${skuIds.length} SKUs`,
      data: { importedCount: totalImported, errors }
    };
  }

  /**
   * Importar estoque para todos os SKUs da tabela skus_vtex
   */
  async importStockForAllSkus(): Promise<StockImportResult> {
    try {
      console.log('🔍 Buscando todos os SKUs da tabela skus_vtex...');
      
      const [skus] = await executeQuery(
        'SELECT id FROM skus_vtex WHERE is_active = 1'
      );

      if (!skus || (skus as any).length === 0) {
        return {
          success: false,
          message: 'Nenhum SKU ativo encontrado na tabela skus_vtex',
          data: { importedCount: 0, errors: [] }
        };
      }

      const skuIds = (skus as any).map((row: any) => row.id);
      return await this.importStockForSkus(skuIds);

    } catch (error: any) {
      console.error('❌ Erro ao buscar SKUs:', error);
      return {
        success: false,
        message: `Erro ao buscar SKUs: ${error.message}`,
        data: { importedCount: 0, errors: [] }
      };
    }
  }
}
