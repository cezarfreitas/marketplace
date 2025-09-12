import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'productId é obrigatório'
      }, { status: 400 });
    }

    console.log('🖼️ Iniciando busca de imagens para crop - produto ID:', productId);

    // 1. Buscar dados do produto
    const productQuery = `
      SELECT 
        p.*,
        a.id_produto_any as anymarket_id
      FROM products_vtex p
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

    console.log(`🔍 Buscando imagens do produto ${product.anymarket_id} no Anymarket...`);

    // 2. Buscar imagens na API do Anymarket
    let anymarketResponse;
    try {
      anymarketResponse = await fetch(`https://api.anymarket.com.br/v2/products/${product.anymarket_id}/images`, {
        method: 'GET',
        headers: {
          'gumgaToken': 'MjU5MDYwMTI2Lg==.xk0BLaBr6Xp5ErWLBXq/Fp7MebhAY9G8/cduGnJECoETHLw1AvWwEFcX5z68M0HtWzBJazQWW5eNBL+eMUnHjw==',
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

    if (!anymarketResponse.ok) {
      const errorText = await anymarketResponse.text();
      console.error('❌ Erro na API do Anymarket:', anymarketResponse.status, errorText);
      
      return NextResponse.json({
        success: false,
        message: `Erro na API do Anymarket: ${anymarketResponse.status} - ${anymarketResponse.statusText}`,
        error: {
          type: 'API_ERROR',
          status: anymarketResponse.status,
          statusText: anymarketResponse.statusText,
          details: errorText
        }
      }, { status: anymarketResponse.status });
    }

    const imagesData = await anymarketResponse.json();
    console.log('📸 Dados das imagens recebidos:', imagesData);

    // 3. Processar e formatar as imagens originais
    const processedImages = Array.isArray(imagesData) ? imagesData
      .filter((img: any) => img.originalImage) // Filtrar apenas imagens com originalImage
      .map((img: any, index: number) => ({
        id: img.id || index,
        variation: img.variation || 'Sem variação',
        originalImage: img.originalImage,
        thumbnailUrl: img.thumbnailUrl || '',
        standardUrl: img.standardUrl || '',
        lowResolutionUrl: img.lowResolutionUrl || '',
        isMain: img.isMain || img.main || false,
        index: img.index || index + 1,
        status: img.status || 'UNKNOWN',
        dimensions: {
          original: {
            width: img.originalWidth || 0,
            height: img.originalHeight || 0
          },
          standard: {
            width: img.standardWidth || 0,
            height: img.standardHeight || 0
          }
        },
        productId: img.productId,
        idVariation: img.idVariation,
        originalData: img
      })) : [];

    // 4. Salvar log da operação (tabela crop_logs não existe ainda)
    // TODO: Criar tabela crop_logs no banco de dados
    console.log(`📊 Log de crop: Produto ${productId}, Anymarket ${product.anymarket_id}, ${processedImages.length} imagens processadas`);

    console.log(`✅ ${processedImages.length} imagens processadas com sucesso`);

    return NextResponse.json({
      success: true,
      message: `${processedImages.length} imagens originais encontradas`,
      data: {
        product: {
          id: product.id,
          name: product.name,
          anymarket_id: product.anymarket_id
        },
        originalImages: processedImages,
        total: processedImages.length,
        summary: {
          totalImages: Array.isArray(imagesData) ? imagesData.length : 0,
          originalImages: processedImages.length,
          variations: Array.from(new Set(processedImages.map(img => img.variation)))
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro interno no crop de imagens:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

// Endpoint para buscar logs de crop
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = `
      SELECT 
        cl.*,
        p.name as product_name
      FROM crop_logs cl
      LEFT JOIN products_vtex p ON cl.product_id = p.id
    `;
    
    const params: any[] = [];
    
    if (productId) {
      query += ` WHERE cl.product_id = ?`;
      params.push(productId);
    }
    
    query += ` ORDER BY cl.created_at DESC LIMIT ?`;
    params.push(limit.toString());

    const logs = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      data: logs
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar logs de crop:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar logs de crop',
      error: error.message
    }, { status: 500 });
  }
}
