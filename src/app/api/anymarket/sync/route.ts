import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
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
        FOREIGN KEY (product_id) REFERENCES products_vtex(id) ON DELETE CASCADE,
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
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'productId é obrigatório'
      }, { status: 400 });
    }

    console.log('🔄 Iniciando sincronização com Anymarket para produto ID:', productId);

    // 1. Buscar dados do produto
    const productQuery = `
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        a.id_produto_any as anymarket_id
      FROM products_vtex p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
      LEFT JOIN anymarket a ON p.ref_id = a.ref_vtex
      WHERE p.id = ?
    `;

    const products = await executeQuery(productQuery, [productId]);
    
    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = products[0];

    if (!product.anymarket_id) {
      return NextResponse.json({
        success: false,
        message: 'Produto não possui ID_ANY vinculado ao Anymarket'
      }, { status: 400 });
    }

    // 2. Buscar título e descrição em uma única query
    const titleDescriptionQuery = `
      SELECT 
        t.title,
        d.description
      FROM products_vtex p
      LEFT JOIN titles t ON p.id = t.product_id 
      LEFT JOIN descriptions d ON p.id = d.product_id 
      WHERE p.id = ?
    `;

    const titleDescriptionData = await executeQuery(titleDescriptionQuery, [productId]);
    
    if (titleDescriptionData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const { title, description } = titleDescriptionData[0];
    
    if (!title) {
      return NextResponse.json({
        success: false,
        message: 'Produto não possui título otimizado gerado'
      }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({
        success: false,
        message: 'Produto não possui descrição gerada'
      }, { status: 400 });
    }

    console.log('📋 Dados encontrados:', {
      product_id: productId,
      title: title?.substring(0, 50) + '...',
      description_length: description?.length || 0
    });

    // 4. Buscar características da tabela respostas_caracteristicas
    const characteristicsQuery = `
      SELECT caracteristica, resposta 
      FROM respostas_caracteristicas 
      WHERE produto_id = ?
    `;
    
    const characteristicsData = await executeQuery(characteristicsQuery, [productId]);
    console.log('📋 Características encontradas:', characteristicsData.length);

    // 5. Preparar dados para envio ao Anymarket
    const characteristics = [];
    
    // Adicionar características da tabela respostas_caracteristicas
    characteristicsData.forEach(char => {
      if (char.caracteristica && char.resposta) {
        characteristics.push({
          name: char.caracteristica,
          value: char.resposta
        });
      }
    });
    
    // Adicionar características básicas do produto
    if (product.brand_name) {
      characteristics.push({
        name: "Marca",
        value: product.brand_name
      });
    }
    
    if (product.category_name) {
      characteristics.push({
        name: "Categoria",
        value: product.category_name
      });
    }

    const anymarketPayload = {
      title: title,
      description: description,
      characteristics: characteristics
    };

    console.log('📤 Enviando dados para Anymarket:', {
      anymarket_id: product.anymarket_id,
      title: title?.substring(0, 50) + '...',
      description_length: description?.length || 0,
      characteristics_count: characteristics.length,
      characteristics: characteristics.map(c => `${c.name}: ${c.value}`)
    });

    // 6. Fazer PATCH para o Anymarket
    console.log('🌐 Fazendo requisição para Anymarket API...');
    console.log('🔗 URL:', `https://api.anymarket.com.br/v2/products/${product.anymarket_id}`);
    console.log('📋 Payload:', JSON.stringify(anymarketPayload, null, 2));
    
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
      await saveSyncLog(productId, product.anymarket_id, title, description, false, null, `Erro de conexão: ${fetchError.message}`);
      
      return NextResponse.json({
        success: false,
        message: 'Erro de conexão com Anymarket: ' + fetchError.message,
        error: {
          type: 'CONNECTION_ERROR',
          message: fetchError.message,
          code: fetchError.code || 'UNKNOWN'
        }
      }, { status: 503 });
    }

    const anymarketResult = await anymarketResponse.json();

    if (!anymarketResponse.ok) {
      console.error('❌ Erro na API do Anymarket:', anymarketResult);
      
      // Salvar log de erro
      await saveSyncLog(productId, product.anymarket_id, title, description, false, anymarketResult, anymarketResult.message || 'Erro desconhecido');
      
      return NextResponse.json({
        success: false,
        message: 'Erro ao sincronizar com Anymarket: ' + (anymarketResult.message || 'Erro desconhecido'),
        error: anymarketResult
      }, { status: anymarketResponse.status });
    }

    console.log('✅ Sincronização com Anymarket realizada com sucesso!');

    // 7. Atualizar data_sincronizacao na tabela anymarket
    try {
      await executeQuery(`
        UPDATE anymarket 
        SET data_sincronizacao = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE ref_vtex = ?
      `, [product.ref_id]);
      console.log('📅 Data de sincronização atualizada na tabela anymarket');
    } catch (updateError) {
      console.error('⚠️ Erro ao atualizar data_sincronizacao (não crítico):', updateError);
    }

    // 8. Salvar log da sincronização
    await saveSyncLog(productId, product.anymarket_id, title, description, true, anymarketResult);

    return NextResponse.json({
      success: true,
      message: 'Produto sincronizado com sucesso no Anymarket',
      data: {
        product_id: productId,
        anymarket_id: product.anymarket_id,
        title: title,
        description_length: description?.length || 0,
        characteristics_count: characteristics.length,
        characteristics: characteristics,
        sync_timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na sincronização com Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao sincronizar com Anymarket',
      error: error.message
    }, { status: 500 });
  }
}
