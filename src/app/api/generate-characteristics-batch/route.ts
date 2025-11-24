import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

interface CharacteristicsBatchResult {
  productId: number;
  productName: string;
  success: boolean;
  message: string;
  error?: string;
  characteristicsGenerated?: number;
  duration?: number;
}

/**
 * API para gerar características em lote para múltiplos produtos
 * Processa cada produto individualmente e retorna um relatório completo
 */
export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const body = await request.json();
    const { productIds, forceRegenerate = false } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Lista de IDs de produtos é obrigatória'
      }, { status: 400 });
    }

    console.log('🤖 Iniciando geração de características em lote...');
    console.log('📋 Total de produtos:', productIds.length);
    console.log('🔄 Forçar regeneração:', forceRegenerate);

    const results: CharacteristicsBatchResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Processar cada produto
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const startTime = Date.now();

      console.log(`\n🔄 [${i + 1}/${productIds.length}] Processando produto ID: ${productId}`);

      try {
        // Buscar informações básicas do produto
        const productQuery = `
          SELECT 
            p.id_produto_vtex,
            p.name,
            p.id_category_vtex,
            c.name as category_name
          FROM products_vtex p
          LEFT JOIN categories_vtex c ON p.id_category_vtex = c.id_category_vtex
          WHERE p.id_produto_vtex = ?
        `;
        const products = await executeQuery(productQuery, [productId]);

        if (!products || products.length === 0) {
          throw new Error('Produto não encontrado');
        }

        const product = products[0];
        console.log(`📦 Produto: ${product.name}`);

        // Verificar se o produto tem categoria
        if (!product.id_category_vtex) {
          throw new Error('Produto não possui categoria definida');
        }

        // Verificar se já existem características (se não for regeneração forçada)
        if (!forceRegenerate) {
          const existingQuery = `
            SELECT COUNT(*) as count
            FROM respostas_caracteristicas
            WHERE produto_id = ?
          `;
          const existingResult = await executeQuery(existingQuery, [productId]);
          const existingCount = existingResult[0]?.count || 0;

          if (existingCount > 0) {
            console.log(`⚠️ Produto já possui ${existingCount} características. Pulando...`);
            results.push({
              productId: productId,
              productName: product.name,
              success: true,
              message: `Já possui características (${existingCount})`,
              characteristicsGenerated: existingCount,
              duration: Date.now() - startTime
            });
            successCount++;
            continue;
          }
        }

        // Buscar características ativas para a categoria do produto
        const characteristicsQuery = `
          SELECT id, caracteristica, pergunta_ia, valores_possiveis
          FROM caracteristicas 
          WHERE is_active = 1 
          AND (
            categorias LIKE ? 
            OR categorias LIKE ?
            OR categorias LIKE ?
            OR categorias = ''
            OR categorias IS NULL
            OR categorias = '[]'
            OR categorias = '{}'
          )
          ORDER BY caracteristica
        `;
        
        const characteristics = await executeQuery(characteristicsQuery, [
          `%${product.id_category_vtex}%`,
          `"${product.id_category_vtex}"`,
          `'${product.id_category_vtex}'`
        ]);

        if (!characteristics || characteristics.length === 0) {
          throw new Error(`Nenhuma característica configurada para a categoria "${product.category_name || product.id_category_vtex}"`);
        }

        console.log(`📋 ${characteristics.length} características encontradas para categoria`);

        // Chamar a API individual de geração de características
        const generateResponse = await fetch(`${request.nextUrl.origin}/api/generate-characteristics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: productId,
            forceRegenerate: forceRegenerate
          })
        });

        const generateResult = await generateResponse.json();
        const duration = Date.now() - startTime;

        if (generateResult.success) {
          console.log(`✅ Características geradas com sucesso: ${generateResult.data?.characteristicsGenerated || 0}`);
          results.push({
            productId: productId,
            productName: product.name,
            success: true,
            message: generateResult.message,
            characteristicsGenerated: generateResult.data?.characteristicsGenerated || 0,
            duration: duration
          });
          successCount++;
        } else {
          throw new Error(generateResult.message || 'Erro desconhecido ao gerar características');
        }

      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`❌ Erro ao processar produto ${productId}:`, error.message);
        
        // Buscar nome do produto para o resultado
        let productName = `Produto ${productId}`;
        try {
          const nameQuery = `SELECT name FROM products_vtex WHERE id_produto_vtex = ?`;
          const nameResult = await executeQuery(nameQuery, [productId]);
          if (nameResult && nameResult.length > 0) {
            productName = nameResult[0].name;
          }
        } catch {}

        results.push({
          productId: productId,
          productName: productName,
          success: false,
          message: 'Erro ao gerar características',
          error: error.message,
          duration: duration
        });
        errorCount++;
      }
    }

    // Relatório final
    console.log('\n📊 RELATÓRIO FINAL');
    console.log('✅ Sucessos:', successCount);
    console.log('❌ Erros:', errorCount);
    console.log('📋 Total:', productIds.length);

    return NextResponse.json({
      success: true,
      message: `Processo concluído: ${successCount} sucessos, ${errorCount} erros`,
      data: {
        totalProducts: productIds.length,
        successCount: successCount,
        errorCount: errorCount,
        results: results
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao processar lote de características:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

