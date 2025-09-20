import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de IDs de produtos é obrigatória'
      }, { status: 400 });
    }

    console.log('🗑️ Iniciando exclusão em lote de produtos:', productIds);

    // Verificar se todos os produtos existem
    const placeholders = productIds.map(() => '?').join(',');
    const existingProducts = await executeQuery(
      `SELECT id, name FROM products_vtex WHERE id IN (${placeholders})`,
      productIds
    );

    if (existingProducts.length !== productIds.length) {
      return NextResponse.json({
        success: false,
        message: 'Alguns produtos não foram encontrados'
      }, { status: 404 });
    }

    console.log(`📊 ${existingProducts.length} produtos encontrados para exclusão`);

    // Iniciar transação para garantir consistência
    await executeQuery('START TRANSACTION');

    try {
      const deletedProducts = [];

      for (const product of existingProducts) {
        const productId = product.id;
        console.log(`🔄 Deletando produto ID: ${productId} - ${product.name}`);

        // 1. Deletar logs de análise de imagens
        await executeQuery(
          'DELETE FROM image_analysis_logs WHERE product_id = ?',
          [productId]
        );

        // 2. Deletar análise de imagens
        await executeQuery(
          'DELETE FROM analise_imagens WHERE id_produto = ?',
          [productId]
        );

        // 3. Deletar títulos gerados
        await executeQuery(
          'DELETE FROM titles WHERE product_id = ?',
          [productId]
        );

        // 4. Deletar descrições geradas
        await executeQuery(
          'DELETE FROM descriptions WHERE product_id = ?',
          [productId]
        );

        // 5. Deletar dados do Marketplace (tabela não existe)
        console.log('🗑️ Deletando dados do Marketplace... (pulando - tabela não existe)');

        // 6. Deletar dados do Meli (se existir)
        await executeQuery(
          'DELETE FROM meli WHERE product_id = ?',
          [productId]
        );

        // 7. Deletar logs de sincronização Anymarket
        await executeQuery(
          'DELETE FROM anymarket_sync_logs WHERE product_id = ?',
          [productId]
        );

        // 8. Deletar dados do Anymarket
        await executeQuery(
          'DELETE FROM anymarket WHERE ref_vtex = (SELECT ref_produto FROM products_vtex WHERE id_produto_vtex = ?)',
          [productId]
        );

        // 9. Deletar logs de crop de imagens
        await executeQuery(
          'DELETE FROM crop_processing_logs WHERE product_id = ?',
          [productId]
        );

        // 10. Deletar respostas de características
        await executeQuery(
          'DELETE FROM characteristics_responses WHERE product_id = ?',
          [productId]
        );

        // 10.1. Deletar respostas de características (tabela alternativa)
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
        await executeQuery(
          'DELETE FROM skus_vtex WHERE product_id = ?',
          [productId]
        );

        // 14. Deletar atributos do produto (se existir tabela)
        await executeQuery(
          'DELETE FROM product_attributes WHERE product_id = ?',
          [productId]
        );

        // 15. Deletar imagens do produto (se existir tabela)
        await executeQuery(
          'DELETE FROM product_images WHERE product_id = ?',
          [productId]
        );

        // 16. Deletar o produto
        await executeQuery(
          'DELETE FROM products_vtex WHERE id_produto_vtex = ?',
          [productId]
        );

        deletedProducts.push({ id: productId, name: product.name });
        console.log(`✅ Produto "${product.name}" deletado com sucesso`);
      }

      // Confirmar transação
      await executeQuery('COMMIT');
      console.log(`✅ ${deletedProducts.length} produtos deletados com sucesso`);

      return NextResponse.json({
        success: true,
        message: `${deletedProducts.length} produtos deletados com sucesso`,
        data: {
          deletedCount: deletedProducts.length,
          deletedProducts: deletedProducts
        }
      });

    } catch (deleteError: any) {
      console.error('❌ Erro durante a deleção em lote:', deleteError);
      
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
    console.error('❌ Erro ao deletar produtos em lote:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar produtos',
      error: error.message
    }, { status: 500 });
  }
}
