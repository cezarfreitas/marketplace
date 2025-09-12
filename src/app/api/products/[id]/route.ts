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
      FROM products_vtex p
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
      'SELECT id, name FROM products_vtex WHERE id = ?',
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

    // Deletar todos os dados vinculados em cascata
    try {
      console.log('🔄 Iniciando exclusão em cascata para produto ID:', productId);
      
      // Iniciar transação para garantir consistência
      await executeQuery('START TRANSACTION');

      // 1. Deletar logs de análise de imagens
      console.log('🗑️ Deletando logs de análise de imagens...');
      await executeQuery(
        'DELETE FROM image_analysis_logs WHERE product_id = ?',
        [productId]
      );

      // 2. Deletar análise de imagens
      console.log('🗑️ Deletando análise de imagens...');
      await executeQuery(
        'DELETE FROM analise_imagens WHERE id_produto = ?',
        [productId]
      );

      // 3. Deletar títulos gerados
      console.log('🗑️ Deletando títulos gerados...');
      await executeQuery(
        'DELETE FROM titles WHERE product_id = ?',
        [productId]
      );

      // 4. Deletar descrições geradas
      console.log('🗑️ Deletando descrições geradas...');
      await executeQuery(
        'DELETE FROM descriptions WHERE product_id = ?',
        [productId]
      );

      // 5. Deletar dados do Marketplace
      console.log('🗑️ Deletando dados do Marketplace...');
      await executeQuery(
        'DELETE FROM marketplace WHERE product_id = ?',
        [productId]
      );

      // 6. Deletar dados do Meli (se existir)
      console.log('🗑️ Deletando dados do Meli...');
      await executeQuery(
        'DELETE FROM meli WHERE product_id = ?',
        [productId]
      );

      // 7. Deletar logs de sincronização Anymarket
      console.log('🗑️ Deletando logs de sincronização Anymarket...');
      await executeQuery(
        'DELETE FROM anymarket_sync_logs WHERE product_id = ?',
        [productId]
      );

      // 8. Deletar dados do Anymarket
      console.log('🗑️ Deletando dados do Anymarket...');
      await executeQuery(
        'DELETE FROM anymarket WHERE ref_vtex = (SELECT ref_id FROM products_vtex WHERE id = ?)',
        [productId]
      );

      // 9. Deletar logs de crop de imagens
      console.log('🗑️ Deletando logs de crop de imagens...');
      await executeQuery(
        'DELETE FROM crop_processing_logs WHERE product_id = ?',
        [productId]
      );

      // 10. Deletar respostas de características
      console.log('🗑️ Deletando respostas de características...');
      await executeQuery(
        'DELETE FROM characteristics_responses WHERE product_id = ?',
        [productId]
      );

      // 10.1. Deletar respostas de características (tabela alternativa)
      console.log('🗑️ Deletando respostas de características (tabela alternativa)...');
      await executeQuery(
        'DELETE FROM respostas_caracteristicas WHERE produto_id = ?',
        [productId]
      );

      // 11. Buscar SKUs do produto
      const skus = await executeQuery(
        'SELECT id FROM skus_vtex WHERE product_id = ?',
        [productId]
      );

      // 12. Para cada SKU, deletar dados relacionados
      for (const sku of skus) {
        console.log(`🗑️ Deletando dados do SKU ${sku.id}...`);
        
        // Deletar estoque do SKU
        await executeQuery(
          'DELETE FROM stock_vtex WHERE sku_id = ?',
          [sku.id]
        );

        // Deletar imagens do SKU
        await executeQuery(
          'DELETE FROM images_vtex WHERE sku_id = ?',
          [sku.id]
        );

        // Deletar atributos do SKU (se existir tabela)
        await executeQuery(
          'DELETE FROM sku_attributes WHERE sku_id = ?',
          [sku.id]
        );
      }

      // 13. Deletar SKUs
      console.log('🗑️ Deletando SKUs...');
      await executeQuery(
        'DELETE FROM skus_vtex WHERE product_id = ?',
        [productId]
      );

      // 14. Deletar atributos do produto (se existir tabela)
      console.log('🗑️ Deletando atributos do produto...');
      await executeQuery(
        'DELETE FROM product_attributes WHERE product_id = ?',
        [productId]
      );

      // 15. Deletar imagens do produto (se existir tabela)
      console.log('🗑️ Deletando imagens do produto...');
      await executeQuery(
        'DELETE FROM product_images WHERE product_id = ?',
        [productId]
      );

      // 16. Deletar o produto
      console.log('🗑️ Deletando produto...');
      await executeQuery(
        'DELETE FROM products_vtex WHERE id = ?',
        [productId]
      );

      // Confirmar transação
      await executeQuery('COMMIT');
      console.log(`✅ Produto "${product.name}" e todos os dados vinculados deletados com sucesso`);

      return NextResponse.json({
        success: true,
        message: `Produto "${product.name}" deletado com sucesso`
      });

    } catch (deleteError: any) {
      console.error('❌ Erro durante a deleção:', deleteError);
      
      // Reverter transação em caso de erro
      try {
        await executeQuery('ROLLBACK');
        console.log('🔄 Transação revertida devido ao erro');
      } catch (rollbackError) {
        console.error('❌ Erro ao reverter transação:', rollbackError);
      }
      
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
