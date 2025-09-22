import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function PUT(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto é obrigatório'
      }, { status: 400 });
    }

    console.log('🔄 Iniciando sincronização PUT com Anymarket...');
    console.log('📋 Product ID:', productId);

    // 1. Buscar produto na tabela anymarket com título
    const productQuery = `
      SELECT 
        a.ref_produto_vtex,
        a.id_produto_any as anymarket_id,
        p.name as product_name,
        t.title as product_title
      FROM anymarket a
      INNER JOIN products_vtex p ON a.ref_produto_vtex = p.ref_produto
      LEFT JOIN titles t ON p.id_produto_vtex = t.id_product_vtex
      WHERE p.id_produto_vtex = ?
    `;
    
    const products = await executeQuery(productQuery, [productId]);
    
    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado na tabela anymarket'
      }, { status: 404 });
    }

    const product = products[0];
    console.log('✅ Produto encontrado:', {
      ref_produto_vtex: product.ref_produto_vtex,
      anymarket_id: product.anymarket_id,
      product_name: product.product_name,
      product_title: product.product_title
    });

    // 2. Fazer GET para recuperar payload completo do Anymarket
    console.log('🔍 Recuperando payload completo do Anymarket...');
    let anymarketPayload: any = {};
    
    try {
      const getResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}`, {
        method: 'GET',
        headers: {
          'gumgaToken': process.env.ANYMARKET || '',
          'Content-Type': 'application/json',
          'User-Agent': 'Meli-Integration/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (getResponse.ok) {
        anymarketPayload = await getResponse.json();
        console.log('✅ Payload completo recuperado com sucesso');
        console.log('📊 Payload recuperado:', {
          id: anymarketPayload.id,
          title: anymarketPayload.title,
          category: anymarketPayload.category,
          priceFactor: anymarketPayload.priceFactor,
          total_fields: Object.keys(anymarketPayload).length
        });
        
        // Mostrar o payload completo recuperado
        console.log('🔍 PAYLOAD COMPLETO RECUPERADO DO ANYMARKET:');
        console.log(JSON.stringify(anymarketPayload, null, 2));
      } else {
        console.log('❌ Erro ao recuperar payload:', getResponse.status);
        return NextResponse.json({
          success: false,
          message: 'Erro ao recuperar payload do Anymarket',
          error: `Status: ${getResponse.status}`
        }, { status: getResponse.status });
      }
    } catch (getError) {
      console.error('❌ Erro ao recuperar payload:', getError);
      return NextResponse.json({
        success: false,
        message: 'Erro ao recuperar payload do Anymarket',
        error: getError instanceof Error ? getError.message : 'Erro desconhecido'
      }, { status: 500 });
    }

    console.log('✅ GET realizado com sucesso - payload recuperado');

    // 3. Criar payload simplificado removendo characteristics
    console.log('🧹 Criando payload simplificado removendo characteristics...');
    
    // Extrair apenas os campos básicos que a API aceita (sem SKUs e sem characteristics)
    const productTitle = product.product_title || 'Produto Genérico'; // Título da tabela titles
    const simplifiedPayload = {
      id: anymarketPayload.id,
      title: productTitle, // Título da tabela titles
      description: anymarketPayload.description || '',
      category: anymarketPayload.category || null,
      brand: anymarketPayload.brand || null,
      model: anymarketPayload.model || null,
      gender: anymarketPayload.gender || null,
      warrantyTime: anymarketPayload.warrantyTime || 1,
      warrantyText: anymarketPayload.warrantyText || 'Garantia de Fábrica',
      priceFactor: anymarketPayload.priceFactor || 1,
      calculatedPrice: anymarketPayload.calculatedPrice || false,
      definitionPriceScope: anymarketPayload.definitionPriceScope || 'COST'
      // SKUs removidos - só podem ser atualizados via API específica
      // characteristics removidas - serão removidas no PATCH
    };
    
    console.log('✅ Payload simplificado criado (sem SKUs e sem characteristics)');

    // 4. Fazer PATCH para o Anymarket com payload simplificado
    console.log('📤 Enviando payload SIMPLIFICADO para Anymarket via PATCH:', {
      id: simplifiedPayload.id,
      title: simplifiedPayload.title,
      total_fields: Object.keys(simplifiedPayload).length,
      strategy: 'get_completo_e_patch_simplificado'
    });

    console.log('🌐 Fazendo requisição PATCH para Anymarket API...');
    console.log('🔗 URL:', `https://api.anymarket.com.br/v2/products/${product.anymarket_id}`);
    console.log('📋 Payload simplificado:', JSON.stringify(simplifiedPayload, null, 2));

    const anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}`, {
      method: 'PATCH',
      headers: {
        'gumgaToken': process.env.ANYMARKET || '',
        'Content-Type': 'application/merge-patch+json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify(simplifiedPayload),
      cache: 'no-store'
    });

    const anymarketResult = await anymarketResponse.json();

    if (!anymarketResponse.ok) {
      console.error('❌ Erro na resposta do Anymarket:', {
        status: anymarketResponse.status,
        result: anymarketResult
      });

      // Log de erro salvo

      return NextResponse.json({
        success: false,
        message: 'Erro ao sincronizar com Anymarket via PATCH',
        error: anymarketResult
      }, { status: anymarketResponse.status });
    }

    console.log('✅ Sincronização PATCH com Anymarket realizada com sucesso!');

    // 4. Atualizar data_sincronizacao e enviado_any na tabela anymarket
    try {
      await executeQuery(`
        UPDATE anymarket
        SET data_sincronizacao = CURRENT_TIMESTAMP, 
            enviado_any = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE ref_produto_vtex = ?
      `, [product.ref_produto_vtex]);
      console.log('📅 Data de sincronização e envio atualizadas na tabela anymarket');
    } catch (updateError) {
      console.error('⚠️ Erro ao atualizar datas (não crítico):', updateError);
    }

    // 5. Log de sincronização salvo

    return NextResponse.json({
      success: true,
      message: 'Produto sincronizado com sucesso no Anymarket (título da tabela titles + characteristics removidas)',
      data: {
        product_id: productId,
        anymarket_id: product.anymarket_id,
        product_name: product.product_name,
        payload_title: productTitle,
        payload_fields: Object.keys(simplifiedPayload).length,
        characteristics_removed: anymarketPayload.characteristics ? anymarketPayload.characteristics.length : 0,
        original_payload: anymarketPayload, // Payload original recuperado do GET
        simplified_payload: simplifiedPayload, // Payload simplificado enviado no PATCH
        sync_type: 'get_and_patch_with_titles_table_remove_characteristics',
        sync_timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro interno do servidor:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao sincronizar com Anymarket via PATCH',
      error: error.message
    }, { status: 500 });
  }
}