import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { createVtexClient } from '@/lib/vtex-api';

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
        c.name as category_name
      FROM products_vtex p
      LEFT JOIN brands_vtex b ON p.id_brand_vtex = b.id_brand_vtex
      LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
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
    console.log('✅ Produto encontrado:', product.name);

    // 2. Buscar SKUs (se a tabela existir)
    let skus = [];
    try {
      const checkSkusTable = `SHOW TABLES LIKE 'skus_vtex'`;
      const skusTableExists = await executeQuery(checkSkusTable, []);
      
      if (skusTableExists.length > 0) {
        const skusQuery = `SELECT * FROM skus_vtex WHERE id_produto_vtex = ?`;
        skus = await executeQuery(skusQuery, [productId]);
        console.log('📦 SKUs encontrados:', skus.length);
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar SKUs:', error);
    }

    // 3. Buscar imagens (se as tabelas existirem)
    let images = [];
    try {
      const checkImagesTable = `SHOW TABLES LIKE 'images_vtex'`;
      const imagesTableExists = await executeQuery(checkImagesTable, []);
      
      console.log('🔍 Verificando tabela images_vtex:', imagesTableExists.length > 0);
      
      if (imagesTableExists.length > 0) {
        // Primeiro, verificar se há SKUs para este produto
        const checkSkusQuery = `SELECT id_sku_vtex FROM skus_vtex WHERE id_produto_vtex = ?`;
        const skus = await executeQuery(checkSkusQuery, [productId]);
        console.log('📦 SKUs encontrados para imagens:', skus.length);
        
        if (skus.length > 0) {
          const imagesQuery = `
            SELECT 
              i.*,
              i.file_location as file_url
            FROM images_vtex i
            JOIN skus_vtex s ON i.id_sku_vtex = s.id_sku_vtex
            WHERE s.id_produto_vtex = ?
          `;
          images = await executeQuery(imagesQuery, [productId]);
          console.log('🖼️ Imagens encontradas:', images.length);
          console.log('🖼️ Dados das imagens:', images);
        } else {
          console.log('⚠️ Nenhum SKU encontrado para o produto, não é possível buscar imagens');
        }
      } else {
        console.log('⚠️ Tabela images_vtex não existe');
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
