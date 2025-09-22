import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { anymarketId } = await request.json();

    if (!anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'anymarketId é obrigatório'
      }, { status: 400 });
    }

    console.log('🔍 Buscando SKUs do produto no Anymarket para ID:', anymarketId);

    // 1. Verificar se o produto existe no nosso banco com esse anymarket_id
    const productQuery = `
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        a.id_produto_any as anymarket_id
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
      LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
      LEFT JOIN anymarket a ON p.ref_produto = a.ref_produto_vtex
      WHERE a.id_produto_any = ?
    `;

    const products = await executeQuery(productQuery, [anymarketId]);
    
    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado no banco com esse anymarket_id'
      }, { status: 404 });
    }

    const product = products[0];
    console.log('📋 Produto encontrado:', {
      anymarket_id: anymarketId,
      product_name: product.name,
      ref_produto: product.ref_produto
    });

    // 2. Buscar SKUs do produto no Anymarket
    console.log('🌐 Fazendo requisição GET para Anymarket API (SKUs)...');
    console.log('🔗 URL:', `https://api.anymarket.com.br/v2/products/${anymarketId}/skus`);
    
    let anymarketResponse;
    try {
      anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/skus`, {
        method: 'GET',
        headers: {
          'gumgaToken': process.env.ANYMARKET || '',
          'Content-Type': 'application/json',
          'User-Agent': 'Meli-Integration/1.0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      console.log('📡 Resposta recebida da API Anymarket:', {
        status: anymarketResponse.status,
        statusText: anymarketResponse.statusText,
        ok: anymarketResponse.ok
      });
      
    } catch (fetchError: any) {
      console.error('❌ Erro de conexão com Anymarket:', fetchError);
      
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
      
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar SKUs no Anymarket: ' + (anymarketResult.message || 'Erro desconhecido'),
        error: anymarketResult
      }, { status: anymarketResponse.status });
    }

    console.log(`✅ ${Array.isArray(anymarketResult) ? anymarketResult.length : 'Dados'} SKUs obtidos com sucesso do Anymarket!`);

    // 3. Processar e organizar os dados dos SKUs
    const skusData = Array.isArray(anymarketResult) ? anymarketResult : anymarketResult.data || [];
    
    const processedSkus = skusData.map((sku: any) => ({
      id: sku.id,
      title: sku.title,
      partnerId: sku.partnerId,
      ean: sku.ean,
      amount: sku.amount,
      additionalTime: sku.additionalTime,
      price: sku.price,
      sellPrice: sku.sellPrice,
      stockLocalId: sku.stockLocalId,
      variations: sku.variations,
      additionalStocks: sku.additionalStocks,
      externalId: sku.externalId,
      active: sku.active,
      volumes: sku.volumes
    }));

    return NextResponse.json({
      success: true,
      message: `SKUs do produto obtidos com sucesso do Anymarket`,
      data: {
        anymarket_id: anymarketId,
        product_name: product.name,
        ref_produto: product.ref_produto,
        total_skus: processedSkus.length,
        skus: processedSkus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar SKUs no Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar SKUs no Anymarket',
      error: error.message
    }, { status: 500 });
  }
}
