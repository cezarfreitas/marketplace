import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    console.log('🔍 Buscando detalhes completos do produto ID:', productId);

    if (!productId || isNaN(Number(productId))) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto inválido'
      }, { status: 400 });
    }

    // 1. Buscar dados básicos do produto
    const productQuery = `
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        d.name as department_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN departments d ON p.department_id = d.id
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
    console.log('✅ Produto encontrado:', product.name);

    // 2. Buscar SKUs (se a tabela existir)
    let skus = [];
    try {
      const checkSkusTable = `SHOW TABLES LIKE 'skus'`;
      const skusTableExists = await executeQuery(checkSkusTable, []);
      
      if (skusTableExists.length > 0) {
        const skusQuery = `SELECT * FROM skus WHERE product_id = ?`;
        skus = await executeQuery(skusQuery, [productId]);
        console.log('📦 SKUs encontrados:', skus.length);
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar SKUs:', error);
    }

    // 3. Buscar imagens (se as tabelas existirem)
    let images = [];
    try {
      const checkImagesTable = `SHOW TABLES LIKE 'images'`;
      const imagesTableExists = await executeQuery(checkImagesTable, []);
      
      if (imagesTableExists.length > 0) {
        const imagesQuery = `
          SELECT 
            i.*,
            CONCAT('https://projetoinfluencer.', i.file_location) as file_url
          FROM images i
          JOIN skus s ON i.sku_id = s.id
          WHERE s.product_id = ?
        `;
        images = await executeQuery(imagesQuery, [productId]);
        console.log('🖼️ Imagens encontradas:', images.length);
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar imagens:', error);
    }

    // 4. Buscar análises de imagem (se a tabela existir)
    let analysisLogs = [];
    try {
      const checkAnalysisTable = `SHOW TABLES LIKE 'image_analysis_logs'`;
      const analysisTableExists = await executeQuery(checkAnalysisTable, []);
      
      if (analysisTableExists.length > 0) {
        const analysisQuery = `
          SELECT 
            ial.*,
            a.name as agent_name
          FROM image_analysis_logs ial
          LEFT JOIN agents a ON ial.agent_id = a.id
          WHERE ial.product_id = ?
          ORDER BY ial.created_at DESC
        `;
        analysisLogs = await executeQuery(analysisQuery, [productId]);
        console.log('🔍 Análises encontradas:', analysisLogs.length);
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar análises:', error);
    }

    // 5. Montar resposta completa
    const productDetails = {
      ...product,
      skus,
      images,
      analysisLogs,
      stats: {
        skuCount: skus.length,
        imageCount: images.length,
        analysisCount: analysisLogs.length
      }
    };

    return NextResponse.json({
      success: true,
      data: productDetails
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar detalhes do produto:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar detalhes do produto',
      error: error.message
    }, { status: 500 });
  }
}
