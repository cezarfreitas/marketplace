import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { createVtexServiceFromDB } from '@/lib/vtex-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id);
    
    if (isNaN(productId)) {
      return NextResponse.json({
        success: false,
        error: 'ID do produto inválido'
      }, { status: 400 });
    }

    // Query para buscar estoque detalhado por SKU
    const stockQuery = `
      SELECT 
        st.sku_id,
        st.vtex_sku_id,
        s.name_complete as sku_name,
        st.warehouse_name,
        st.total_quantity,
        st.reserved_quantity
      FROM stock st
      JOIN skus s ON st.sku_id = s.id
      WHERE s.product_id = ?
      ORDER BY s.name_complete, st.warehouse_name
    `;

    const stockData = await executeQuery(stockQuery, [productId]);

    return NextResponse.json({
      success: true,
      data: stockData
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar estoque do produto:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id);
    
    if (isNaN(productId)) {
      return NextResponse.json({
        success: false,
        error: 'ID do produto inválido'
      }, { status: 400 });
    }

    console.log(`🔄 Atualizando estoque do produto ${productId}...`);

    // Buscar dados do produto
    const productQuery = `
      SELECT p.id, p.ref_id, p.name
      FROM products p
      WHERE p.id = ?
    `;
    
    const productResult = await executeQuery(productQuery, [productId]);
    
    if (!productResult || productResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = productResult[0];

    // Buscar SKUs do produto
    const skusQuery = `
      SELECT s.id, s.vtex_id, s.name_complete
      FROM skus s
      WHERE s.product_id = ?
    `;
    
    const skus = await executeQuery(skusQuery, [productId]);

    if (!skus || skus.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum SKU encontrado para este produto'
      }, { status: 404 });
    }

    // Buscar configurações VTEX diretamente
    const configQuery = `
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_key IN ('vtex_account_name', 'vtex_environment', 'vtex_app_key', 'vtex_app_token')
    `;
    
    const configResult = await executeQuery(configQuery);
    
    if (!configResult || configResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Configuração VTEX não encontrada'
      }, { status: 500 });
    }
    
    // Converter array de configurações em objeto
    const configMap = configResult.reduce((acc: any, row: any) => {
      acc[row.config_key] = row.config_value;
      return acc;
    }, {});
    
    const config = {
      accountName: configMap.vtex_account_name || 'projetoinfluencer',
      environment: configMap.vtex_environment || 'vtexcommercestable',
      appKey: configMap.vtex_app_key || '',
      appToken: configMap.vtex_app_token || '',
    };

    let updatedSkus = 0;
    const errors = [];

    // Atualizar estoque de cada SKU
    for (const sku of skus) {
      try {
        console.log(`🔍 Atualizando estoque do SKU ${sku.vtex_id} (${sku.name_complete})`);
        
        // Buscar estoque do VTEX usando o VTEX SKU ID
        const stockApiUrl = `https://${config.accountName}.${config.environment}.com.br/api/logistics/pvt/inventory/skus/${sku.vtex_id}`;
        
        const stockResponse = await fetch(stockApiUrl, {
          headers: {
            'X-VTEX-API-AppKey': config.appKey,
            'X-VTEX-API-AppToken': config.appToken,
          },
        });

        if (!stockResponse.ok) {
          throw new Error(`HTTP error! status: ${stockResponse.status}`);
        }

        const stockData = await stockResponse.json();
        
        // Processar dados de estoque
        if (stockData && stockData.balance) {
          for (const warehouse of stockData.balance) {
            const warehouseName = warehouse.warehouseName || 'Principal';
            const totalQuantity = warehouse.totalQuantity || 0;
            const reservedQuantity = warehouse.reservedQuantity || 0;

            // Inserir ou atualizar estoque no banco
            const upsertStockQuery = `
              INSERT INTO stock (sku_id, vtex_sku_id, warehouse_id, warehouse_name, total_quantity, reserved_quantity, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE
                total_quantity = VALUES(total_quantity),
                reserved_quantity = VALUES(reserved_quantity),
                updated_at = NOW()
            `;

            await executeQuery(upsertStockQuery, [
              sku.id,
              sku.vtex_id,
              warehouse.warehouseId || '1', // Usar warehouse ID do VTEX ou padrão
              warehouseName,
              totalQuantity,
              reservedQuantity
            ]);
          }
          
          updatedSkus++;
          console.log(`✅ Estoque atualizado para SKU ${sku.vtex_id}`);
        }

      } catch (error: any) {
        console.error(`❌ Erro ao atualizar estoque do SKU ${sku.vtex_id}:`, error);
        errors.push(`SKU ${sku.vtex_id}: ${error.message}`);
      }
    }

    // O total_stock é calculado dinamicamente na consulta, não precisa atualizar

    console.log(`✅ Estoque atualizado para produto ${productId}. SKUs atualizados: ${updatedSkus}`);

    return NextResponse.json({
      success: true,
      message: `Estoque atualizado com sucesso`,
      data: {
        productId,
        productName: product.name,
        updatedSkus,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar estoque do produto:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}
