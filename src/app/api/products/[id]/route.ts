import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    console.log('🔍 Buscando produto ID:', productId);

    if (!productId || isNaN(Number(productId))) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto inválido'
      }, { status: 400 });
    }

    // Buscar dados completos do produto com JOINs
    const query = `
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

    const products = await executeQuery(query, [productId]);
    
    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = products[0];
    console.log('✅ Produto encontrado:', product.name);

    return NextResponse.json({
      success: true,
      data: product
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar produto:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar produto',
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    console.log('🗑️ Deletando produto ID:', productId);

    if (!productId || isNaN(Number(productId))) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto inválido'
      }, { status: 400 });
    }

    // Verificar se o produto existe
    const existingProduct = await executeQuery(
      'SELECT id, name FROM products WHERE id = ?',
      [productId]
    );

    if (!existingProduct || existingProduct.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const product = existingProduct[0] as any;
    console.log(`📊 Produto encontrado: ${product.name}`);

    // Deletar todos os dados vinculados
    try {
      // 1. Deletar logs de análise de imagens
      console.log('🗑️ Deletando logs de análise de imagens...');
      await executeQuery(
        'DELETE FROM image_analysis_logs WHERE product_id = ?',
        [productId]
      );

      // 2. Deletar dados do Marketplace
      console.log('🗑️ Deletando dados do Marketplace...');
      await executeQuery(
        'DELETE FROM meli WHERE product_id = ?',
        [productId]
      );

      // 3. Buscar SKUs do produto
      const skus = await executeQuery(
        'SELECT id FROM skus WHERE product_id = ?',
        [productId]
      );

      // 4. Para cada SKU, deletar imagens
      for (const sku of skus) {
        console.log(`🗑️ Deletando imagens do SKU ${sku.id}...`);
        await executeQuery(
          'DELETE FROM images WHERE sku_id = ?',
          [sku.id]
        );
      }

      // 5. Deletar SKUs
      console.log('🗑️ Deletando SKUs...');
      await executeQuery(
        'DELETE FROM skus WHERE product_id = ?',
        [productId]
      );

      // 6. Deletar o produto
      console.log('🗑️ Deletando produto...');
      await executeQuery(
        'DELETE FROM products WHERE id = ?',
        [productId]
      );

      console.log(`✅ Produto "${product.name}" e todos os dados vinculados deletados com sucesso`);

      return NextResponse.json({
        success: true,
        message: `Produto "${product.name}" deletado com sucesso`
      });

    } catch (deleteError: any) {
      console.error('❌ Erro durante a deleção:', deleteError);
      throw deleteError;
    }

  } catch (error: any) {
    console.error('❌ Erro ao deletar produto:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar produto',
      error: error.message
    }, { status: 500 });
  }
}
