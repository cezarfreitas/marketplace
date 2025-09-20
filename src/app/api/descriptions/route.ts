import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    // Se não tem productId mas tem status, buscar por status
    if (!productId && status) {
      console.log('🔍 Buscando produtos com descrições por status:', status);
      
      const limitNum = limit ? parseInt(limit) : 1000;
      
      try {
        // Primeiro verificar se a tabela existe e sua estrutura
        const tableCheck = await executeQuery('SHOW TABLES LIKE "descriptions"');
        
        if (!tableCheck || tableCheck.length === 0) {
          console.log('📋 Tabela descriptions não existe, retornando array vazio');
          return NextResponse.json({
            success: true,
            data: [],
            count: 0
          });
        }

        // Verificar estrutura da tabela para usar o campo correto
        const columns = await executeQuery('DESCRIBE descriptions');
        console.log('📋 Colunas da tabela descriptions:', columns);
        
        // Verificar se há registros na tabela
        const [allRecords] = await executeQuery('SELECT * FROM descriptions LIMIT 5');
        console.log('📊 Registros na tabela descriptions:', allRecords);
        
        // Determinar o campo correto baseado na estrutura
        // Priorizar id_product_vtex pois é o usado pelo código de geração
        const productIdField = columns.some((col: any) => col.Field === 'id_product_vtex') ? 'id_product_vtex' : 'product_id';
        
        // Buscar produtos que têm descrições com o status especificado
        // Usar a mesma lógica que funcionou no debug
        const [statusRecords] = await executeQuery('SELECT * FROM descriptions WHERE status = "generated" LIMIT 10');
        console.log('📊 Registros com status generated:', statusRecords);
        
        // Extrair apenas os product_id dos registros
        const productIds = Array.isArray(statusRecords) ? 
          statusRecords.map(record => ({ product_id: record.id_product_vtex })) : 
          (statusRecords ? [{ product_id: statusRecords.id_product_vtex }] : []);

        console.log('📊 Product IDs extraídos:', productIds);

        return NextResponse.json({
          success: true,
          data: productIds,
          count: productIds.length
        });
      } catch (error) {
        console.error('❌ Erro ao verificar tabela descriptions:', error);
        return NextResponse.json({
          success: true,
          data: [],
          count: 0
        });
      }
    }

    // Busca por productId específico
    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'productId é obrigatório para busca específica'
      }, { status: 400 });
    }

    const numericProductId = parseInt(productId);
    if (isNaN(numericProductId)) {
      return NextResponse.json({
        success: false,
        message: 'productId deve ser um número válido'
      }, { status: 400 });
    }

    console.log('🔍 Buscando descrições para produto ID:', numericProductId);

    // Buscar descrições existentes
    try {
      // Usar a mesma consulta que funcionou no debug
      const [descriptions] = await executeQuery(
        'SELECT * FROM descriptions WHERE id_product_vtex = ? ORDER BY created_at DESC',
        [numericProductId]
      );
      
      console.log('📊 Descrições encontradas para produto', numericProductId, ':', descriptions);

      // Garantir que descriptions seja sempre um array
      const descriptionsArray = Array.isArray(descriptions) ? descriptions : (descriptions ? [descriptions] : []);

      return NextResponse.json({
        success: true,
        data: descriptionsArray
      });
    } catch (error) {
      console.error('❌ Erro ao buscar descrições específicas:', error);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar descrições',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Erro ao buscar descrições:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar descrições',
      error: error.message
    }, { status: 500 });
  }
}