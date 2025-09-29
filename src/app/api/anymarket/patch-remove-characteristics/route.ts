import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { productId, anymarketId } = await request.json();

    if (!productId || !anymarketId) {
      return NextResponse.json({
        success: false,
        message: 'productId e anymarketId são obrigatórios'
      }, { status: 400 });
    }

    console.log('🔄 Iniciando PATCH para remover características...');
    console.log('📋 Product ID:', productId, 'Anymarket ID:', anymarketId);

    // 1. Buscar dados atuais do produto no Anymarket
    console.log('🔍 Buscando dados atuais do produto...');
    const getResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}`, {
      method: 'GET',
      headers: {
        'gumgaToken': process.env.ANYMARKET || '',
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!getResponse.ok) {
      const errorData = await getResponse.json();
      console.error('❌ Erro ao buscar dados atuais:', errorData);
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar dados atuais do produto: ' + (errorData.message || 'Erro desconhecido'),
        error: errorData
      }, { status: getResponse.status });
    }

    const currentData = await getResponse.json();
    console.log('✅ Dados atuais obtidos:', currentData);

    // 2. Preparar payload para remover todas as características do produto
    const patchPayload = [];
    
    // Remover todas as características se existirem
    if (currentData.characteristics && currentData.characteristics.length > 0) {
      console.log('🗑️ Removendo todas as características do produto:', currentData.characteristics.length);
      
      // Listar características que serão removidas
      currentData.characteristics.forEach((characteristic: any, index: number) => {
        console.log(`🗑️ Característica ${index}: ${characteristic.name} = ${characteristic.value} (índice: ${characteristic.index})`);
      });
      
      // Usar replace para definir características como array vazio
      patchPayload.push({
        op: 'replace',
        path: '/characteristics',
        value: []
      });
    }

    // Se não há características para remover, retornar sucesso
    if (patchPayload.length === 0) {
      console.log('ℹ️ Nenhuma característica encontrada para remover');
      return NextResponse.json({
        success: true,
        message: 'Nenhuma característica encontrada para remover',
        data: {
          anymarket_id: anymarketId,
          action: 'no_characteristics_to_remove',
          response: currentData
        }
      });
    }

    // 3. Fazer PATCH para remover características do produto
    console.log('🔄 Fazendo PATCH para remover características do produto...');
    console.log('📦 Payload:', JSON.stringify(patchPayload, null, 2));

    const patchResponse = await fetch(`https://api.anymarket.com.br/v2/products/patch/${anymarketId}`, {
      method: 'PATCH',
      headers: {
        'gumgaToken': process.env.ANYMARKET || '',
        'Content-Type': 'application/json-patch+json',
        'User-Agent': 'Meli-Integration/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify(patchPayload),
      cache: 'no-store'
    });

    console.log('📡 Resposta do PATCH:', {
      status: patchResponse.status,
      statusText: patchResponse.statusText,
      ok: patchResponse.ok
    });

    if (!patchResponse.ok) {
      const errorData = await patchResponse.json();
      console.error('❌ Erro no PATCH:', errorData);
      
      return NextResponse.json({
        success: false,
        message: 'Erro no PATCH: ' + (errorData.message || 'Erro desconhecido'),
        error: errorData
      }, { status: patchResponse.status });
    }

    const patchResult = await patchResponse.json();
    console.log('✅ PATCH realizado com sucesso:', patchResult);

    // Atualizar enviado_any na tabela anymarket (removido data_sincronizacao)
    try {
      await executeQuery(`
        UPDATE anymarket 
        SET enviado_any = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id_produto_any = ?
      `, [anymarketId]);
      console.log('📅 Data de envio atualizada na tabela anymarket');
    } catch (updateError) {
      console.error('⚠️ Erro ao atualizar data de envio (não crítico):', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Características removidas com sucesso',
      data: {
        anymarket_id: anymarketId,
        action: 'characteristics_removed',
        patch_payload: patchPayload,
        response: patchResult,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao fazer PATCH:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao fazer PATCH',
      error: error.message
    }, { status: 500 });
  }
}
