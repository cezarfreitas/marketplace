import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// Função auxiliar para salvar logs de sincronização
async function saveSyncLog(productId: number, anymarketId: string, title: string, description: string, success: boolean, responseData: any, errorMessage?: string) {
  try {
    const createLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS anymarket_sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        anymarket_id VARCHAR(255) NOT NULL,
        title VARCHAR(500),
        description TEXT,
        success BOOLEAN NOT NULL DEFAULT true,
        response_data JSON,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_anymarket_id (anymarket_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await executeQuery(createLogsTableQuery, []);

    const logQuery = `
      INSERT INTO anymarket_sync_logs (product_id, anymarket_id, title, description, success, response_data, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await executeQuery(logQuery, [
      productId,
      anymarketId,
      title,
      description,
      success,
      JSON.stringify(responseData),
      errorMessage || null
    ]);

    console.log('📝 Log de sincronização salvo no banco de dados');
  } catch (logError) {
    console.log('⚠️ Erro ao salvar log (não crítico):', logError);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de productIds é obrigatória'
      }, { status: 400 });
    }

    console.log(`🔄 Iniciando sincronização em lote com Anymarket para ${productIds.length} produtos`);

    const results = {
      total: productIds.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Processar cada produto
    for (const productId of productIds) {
      try {
        console.log(`🔄 Processando produto ID: ${productId}`);

        // 1. Buscar dados do produto
        const productQuery = `
          SELECT 
            p.*,
            b.name as brand_name,
            c.name as category_name,
            a.id_any as anymarket_id
          FROM products p
          LEFT JOIN brands b ON p.brand_id = b.id
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN anymarket a ON p.ref_id = a.ref_id
          WHERE p.id = ?
        `;

        const products = await executeQuery(productQuery, [productId]);
        
        if (products.length === 0) {
          results.failed++;
          results.errors.push({
            productId,
            error: 'Produto não encontrado'
          });
          continue;
        }

        const product = products[0];

        if (!product.anymarket_id) {
          results.failed++;
          results.errors.push({
            productId,
            error: 'Produto não possui ID_ANY vinculado ao Anymarket'
          });
          continue;
        }

        // 2. Buscar dados do Marketplace
        const marketplaceQuery = `
          SELECT * FROM meli 
          WHERE product_id = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `;

        const marketplaceData = await executeQuery(marketplaceQuery, [productId]);
        
        if (marketplaceData.length === 0) {
          results.failed++;
          results.errors.push({
            productId,
            error: 'Produto não possui descrição do Marketplace gerada'
          });
          continue;
        }

        const marketplace = marketplaceData[0];

        console.log(`📋 Dados do marketplace encontrados - Produto ${productId}:`, {
          product_id: marketplace.product_id,
          title: marketplace.title?.substring(0, 50) + '...',
          modelo: marketplace.modelo || 'NÃO ENCONTRADO',
          seller_sku: marketplace.seller_sku || 'NÃO ENCONTRADO',
          clothing_type: marketplace.clothing_type || 'NÃO ENCONTRADO',
          gender: marketplace.gender || 'NÃO ENCONTRADO',
          color: marketplace.color || 'NÃO ENCONTRADO'
        });

        // 3. Preparar dados para envio ao Anymarket
        const characteristics = [];
        
        // Adicionar características baseadas nos campos do marketplace
        if (marketplace.clothing_type) {
          characteristics.push({
            name: "Tipo de Roupa",
            value: marketplace.clothing_type
          });
        }
        
        if (marketplace.sleeve_type) {
          characteristics.push({
            name: "Tipo de Manga", 
            value: marketplace.sleeve_type
          });
        }
        
        if (marketplace.gender) {
          characteristics.push({
            name: "Gênero",
            value: marketplace.gender
          });
        }
        
        if (marketplace.color) {
          characteristics.push({
            name: "Cor",
            value: marketplace.color
          });
        }
        
        if (marketplace.wedge_shape) {
          characteristics.push({
            name: "Forma de Caimento",
            value: marketplace.wedge_shape
          });
        }
        
        if (marketplace.is_sportive) {
          characteristics.push({
            name: "É Esportiva",
            value: marketplace.is_sportive
          });
        }
        
        if (marketplace.main_color) {
          characteristics.push({
            name: "Cor Principal",
            value: marketplace.main_color
          });
        }
        
        if (marketplace.item_condition) {
          characteristics.push({
            name: "Condição do Item",
            value: marketplace.item_condition
          });
        }
        
        if (marketplace.brand) {
          characteristics.push({
            name: "Marca",
            value: marketplace.brand
          });
        }
        
        if (marketplace.modelo) {
          characteristics.push({
            name: "Modelo",
            value: marketplace.modelo
          });
        }
        
        if (marketplace.seller_sku) {
          characteristics.push({
            name: "SKU",
            value: marketplace.seller_sku
          });
        }

        const anymarketPayload = {
          title: marketplace.title,
          description: marketplace.description,
          characteristics: characteristics
        };

        console.log(`📤 Enviando dados para Anymarket - Produto ${productId}:`, {
          anymarket_id: product.anymarket_id,
          title: marketplace.title?.substring(0, 50) + '...',
          description_length: marketplace.description?.length || 0,
          characteristics_count: characteristics.length,
          characteristics: characteristics.map(c => `${c.name}: ${c.value}`),
          modelo_field: marketplace.modelo || 'NÃO ENCONTRADO',
          seller_sku_field: marketplace.seller_sku || 'NÃO ENCONTRADO'
        });

        // 4. Fazer PATCH para o Anymarket
        console.log('🌐 Fazendo requisição para Anymarket API...');
        console.log('🔗 URL:', `https://api.anymarket.com.br/v2/products/${product.anymarket_id}`);
        
        let anymarketResponse;
        try {
          anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}`, {
            method: 'PATCH',
            headers: {
              'gumgaToken': 'MjU5MDYwMTI2Lg==.xk0BLaBr6Xp5ErWLBXq/Fp7MebhAY9G8/cduGnJECoETHLw1AvWwEFcX5z68M0HtWzBJazQWW5eNBL+eMUnHjw==',
              'Content-Type': 'application/merge-patch+json',
              'User-Agent': 'Meli-Integration/1.0',
              'Accept': 'application/json'
            },
            body: JSON.stringify(anymarketPayload),
            cache: 'no-store',
            next: { revalidate: 0 }
          });
          
          console.log('📡 Resposta recebida da API Anymarket:', {
            status: anymarketResponse.status,
            statusText: anymarketResponse.statusText,
            ok: anymarketResponse.ok
          });
          
        } catch (fetchError: any) {
          console.error('❌ Erro de conexão com Anymarket:', fetchError);
          
          // Salvar log de erro de conexão
          await saveSyncLog(productId, product.anymarket_id, marketplace.title, marketplace.description, false, null, `Erro de conexão: ${fetchError.message}`);
          
          results.failed++;
          results.errors.push({
            productId,
            error: `Erro de conexão: ${fetchError.message}`,
            type: 'CONNECTION_ERROR'
          });
          continue;
        }

        const anymarketResult = await anymarketResponse.json();

        if (!anymarketResponse.ok) {
          console.error(`❌ Erro na API do Anymarket para produto ${productId}:`, anymarketResult);
          
          // Salvar log de erro
          await saveSyncLog(productId, product.anymarket_id, marketplace.title, marketplace.description, false, anymarketResult, anymarketResult.message || 'Erro desconhecido');
          
          results.failed++;
          results.errors.push({
            productId,
            error: 'Erro ao sincronizar com Anymarket: ' + (anymarketResult.message || 'Erro desconhecido'),
            anymarket_id: product.anymarket_id
          });
          continue;
        }

        console.log(`✅ Sincronização com Anymarket realizada com sucesso para produto ${productId}!`);

        // 5. Salvar log da sincronização
        await saveSyncLog(productId, product.anymarket_id, marketplace.title, marketplace.description, true, anymarketResult);

        results.success++;

      } catch (error: any) {
        console.error(`❌ Erro ao processar produto ${productId}:`, error);
        results.failed++;
        results.errors.push({
          productId,
          error: error.message || 'Erro desconhecido'
        });
      }
    }

    console.log(`✅ Sincronização em lote concluída - Sucessos: ${results.success}, Falhas: ${results.failed}`);

    return NextResponse.json({
      success: true,
      message: `Sincronização em lote concluída! Sucessos: ${results.success}, Falhas: ${results.failed}`,
      data: results
    });

  } catch (error: any) {
    console.error('❌ Erro na sincronização em lote com Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor na sincronização em lote',
      error: error.message
    }, { status: 500 });
  }
}
