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

    console.log('🔍 Buscando dados do produto no Anymarket para produto ID:', productId);

    // 1. Buscar dados do produto
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
    let modelValue = null;
    let genderValue = null;
    let warrantyTimeValue = null;
    let warrantyTextValue = null;
    let heightValue = null;
    let widthValue = null;
    let weightValue = null;
    let lengthValue = null;
    let videoUrlValue = null;
    
    // Adicionar características da tabela respostas_caracteristicas
    characteristicsData.forEach(char => {
      if (char.caracteristica && char.resposta) {
        characteristics.push({
          name: char.caracteristica,
          value: char.resposta
        });
        
        // Extrair valores específicos para model e gender
        if (char.caracteristica.toLowerCase().includes('modelo')) {
          modelValue = char.resposta;
        }
        if (char.caracteristica.toLowerCase().includes('gênero') || char.caracteristica.toLowerCase().includes('genero')) {
          // Mapear gênero para o formato do Anymarket
          const genderLower = char.resposta.toLowerCase();
          if (genderLower.includes('masculino') || genderLower.includes('male')) {
            genderValue = 'MALE';
          } else if (genderLower.includes('feminino') || genderLower.includes('female')) {
            genderValue = 'FEMALE';
          } else if (genderLower.includes('unissex') || genderLower.includes('unisex')) {
            genderValue = 'UNISEX';
          } else {
            genderValue = 'UNISEX'; // Default
          }
        }
        
        // Extrair valores específicos para garantia
        if (char.caracteristica.toLowerCase().includes('tempo de garantia') || char.caracteristica.toLowerCase().includes('warranty time')) {
          // Tentar extrair número da resposta (ex: "12 meses", "1 ano", "24")
          const timeMatch = char.resposta.match(/(\d+)/);
          if (timeMatch) {
            warrantyTimeValue = parseInt(timeMatch[1]);
          }
        }
        if (char.caracteristica.toLowerCase().includes('garantia') || char.caracteristica.toLowerCase().includes('warranty')) {
          warrantyTextValue = char.resposta;
        }
        
        // Extrair valores específicos para dimensões e peso
        if (char.caracteristica.toLowerCase().includes('altura') || char.caracteristica.toLowerCase().includes('height')) {
          const heightMatch = char.resposta.match(/(\d+(?:\.\d+)?)/);
          if (heightMatch) {
            heightValue = parseFloat(heightMatch[1]);
          }
        }
        if (char.caracteristica.toLowerCase().includes('largura') || char.caracteristica.toLowerCase().includes('width')) {
          const widthMatch = char.resposta.match(/(\d+(?:\.\d+)?)/);
          if (widthMatch) {
            widthValue = parseFloat(widthMatch[1]);
          }
        }
        if (char.caracteristica.toLowerCase().includes('peso') || char.caracteristica.toLowerCase().includes('weight')) {
          const weightMatch = char.resposta.match(/(\d+(?:\.\d+)?)/);
          if (weightMatch) {
            weightValue = parseFloat(weightMatch[1]);
          }
        }
        if (char.caracteristica.toLowerCase().includes('comprimento') || char.caracteristica.toLowerCase().includes('length')) {
          const lengthMatch = char.resposta.match(/(\d+(?:\.\d+)?)/);
          if (lengthMatch) {
            lengthValue = parseFloat(lengthMatch[1]);
          }
        }
        
        // Extrair URL do vídeo
        if (char.caracteristica.toLowerCase().includes('vídeo') || char.caracteristica.toLowerCase().includes('video') || char.caracteristica.toLowerCase().includes('url')) {
          // Verificar se é uma URL válida
          if (char.resposta.includes('http') || char.resposta.includes('www.')) {
            videoUrlValue = char.resposta;
          }
        }
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

    console.log('📋 Dados preparados para consulta:', {
      anymarket_id: product.anymarket_id,
      title: title?.substring(0, 50) + '...',
      description_length: description?.length || 0,
      characteristics_count: characteristics.length,
      characteristics: characteristics.map(c => `${c.name}: ${c.value}`),
      model: modelValue || 'não informado',
      gender: genderValue || 'não informado',
      warrantyTime: warrantyTimeValue || 'não informado',
      warrantyText: warrantyTextValue || 'não informado',
      height: heightValue || 'não informado',
      width: widthValue || 'não informado',
      weight: weightValue || 'não informado',
      length: lengthValue || 'não informado',
      videoUrl: videoUrlValue || 'não informado'
    });

    // 6. Fazer GET para o Anymarket (apenas consultar dados)
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
        title: title,
        description: description,
        characteristics: characteristics,
        anymarket_data: anymarketResult,
        timestamp: new Date().toISOString()
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
