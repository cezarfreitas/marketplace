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

    console.log('🔍 Buscando dados do produto no Anymarket para produto ID:', productId);

    // 1. Buscar dados do produto e ID do Anymarket
    const productQuery = `
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        a.id_produto_any as anymarket_id
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
      LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
      LEFT JOIN anymarketing a ON p.ref_produto = a.ref_produto_vtex
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
        message: 'Produto não possui ID_ANY vinculado ao Anymarketing'
      }, { status: 400 });
    }

    console.log('📋 Produto encontrado:', {
      product_id: productId,
      anymarket_id: product.anymarket_id,
      product_name: product.name
    });

    // 2. Buscar dados do produto no Anymarket
    console.log('🌐 Fazendo requisição GET para Anymarket API...');
    console.log('🔗 URL:', `https://api.anymarket.com.br/v2/products/${product.anymarket_id}`);
    
    let anymarketResponse;
    try {
      anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}`, {
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
        message: 'Erro ao buscar produto no Anymarket: ' + (anymarketResult.message || 'Erro desconhecido'),
        error: anymarketResult
      }, { status: anymarketResponse.status });
    }

    console.log('✅ Dados do produto obtidos com sucesso do Anymarket!');

    return NextResponse.json({
      success: true,
      message: 'Dados do produto obtidos com sucesso do Anymarket',
      data: {
        product_id: productId,
        anymarket_id: product.anymarket_id,
        product_name: product.name,
        anymarket_data: anymarketResult,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar produto no Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar produto no Anymarket',
      error: error.message
    }, { status: 500 });
  }
}

