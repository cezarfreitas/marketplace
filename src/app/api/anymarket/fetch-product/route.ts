import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

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

    console.log('🔍 Buscando ID_ANY da tabela anymarket para produto ID:', productId);

    // 1. Buscar ID_ANY da tabela anymarket
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
      WHERE p.id_produto_vtex = ?
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

    console.log('✅ ID_ANY encontrado:', product.anymarket_id);

    // 2. Fazer GET direto para API do Anymarket
    console.log('🌐 Fazendo GET direto para API Anymarket...');
    console.log('🔗 URL:', `https://api.anymarket.com.br/v2/products/${product.anymarket_id}`);
    
    const anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}`, {
      method: 'GET',
      headers: {
        'gumgaToken': process.env.ANYMARKET || '',
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    console.log('📡 Resposta da API Anymarket:', {
      status: anymarketResponse.status,
      statusText: anymarketResponse.statusText,
      ok: anymarketResponse.ok
    });

    if (!anymarketResponse.ok) {
      const errorData = await anymarketResponse.json();
      console.error('❌ Erro na API do Anymarket:', errorData);
      
      return NextResponse.json({
        success: false,
        message: 'Erro na API do Anymarket: ' + (errorData.message || 'Erro desconhecido'),
        error: errorData
      }, { status: anymarketResponse.status });
    }

    const anymarketData = await anymarketResponse.json();
    console.log('✅ Dados recuperados da API Anymarket:', anymarketData);

    return NextResponse.json({
      success: true,
      message: 'Dados recuperados com sucesso da API Anymarket',
      data: {
        anymarket_id: product.anymarket_id,
        product_name: product.name,
        timestamp: new Date().toISOString(),
        anymarket_data: anymarketData
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar dados do Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar dados do Anymarket',
      error: error.message
    }, { status: 500 });
  }
}
