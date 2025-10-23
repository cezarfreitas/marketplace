import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { anymarketId, imageUrl, index, main } = await request.json();

    if (!anymarketId || !imageUrl) {
      return NextResponse.json({
        success: false,
        message: 'anymarketId e imageUrl são obrigatórios'
      }, { status: 400 });
    }

    const anymarketToken = process.env.ANYMARKET || '';
    
    if (!anymarketToken) {
      return NextResponse.json({
        success: false,
        message: 'Token do Anymarket não configurado'
      }, { status: 400 });
    }

    console.log(`📤 Enviando imagem para Anymarket:`, {
      anymarketId,
      imageUrl,
      index,
      main
    });

    // Log detalhado da requisição
    const requestBody = {
      index: index || 1,
      main: main || false,
      url: imageUrl
    };
    
    console.log('🔍 Detalhes da requisição:', {
      url: `https://api.anymarket.com.br/v2/products/${anymarketId}/images`,
      method: 'POST',
      headers: {
        'gumgaToken': anymarketToken.substring(0, 20) + '...',
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0'
      },
      body: requestBody
    });

    const anymarketUploadResponse = await fetch(`https://api.anymarket.com.br/v2/products/${anymarketId}/images`, {
      method: 'POST',
      headers: {
        'gumgaToken': anymarketToken,
        'Content-Type': 'application/json',
        'User-Agent': 'Meli-Integration/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    // Log detalhado da resposta
    console.log('📡 Resposta da API Anymarket:', {
      status: anymarketUploadResponse.status,
      statusText: anymarketUploadResponse.statusText,
      ok: anymarketUploadResponse.ok,
      headers: Object.fromEntries(anymarketUploadResponse.headers.entries())
    });

    if (anymarketUploadResponse.ok) {
      const result = await anymarketUploadResponse.json();
      console.log(`✅ Imagem enviada para Anymarket com sucesso:`, result);
      
      // Atualizar campo imagem_cropada na tabela anymarket
      try {
        await executeQuery(`
          UPDATE anymarket 
          SET imagem_cropada = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP 
          WHERE id_produto_any = ?
        `, [anymarketId]);
        console.log(`📅 Campo imagem_cropada atualizado para produto ${anymarketId}`);
      } catch (updateError) {
        console.error(`⚠️ Erro ao atualizar imagem_cropada para produto ${anymarketId} (não crítico):`, updateError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Imagem enviada para Anymarket com sucesso',
        data: {
          anymarketId,
          imageUrl,
          index,
          main,
          anymarketResponse: result,
          imagemCropadaUpdated: true
        }
      });
    } else {
      const errorText = await anymarketUploadResponse.text();
      console.error(`❌ Erro ao enviar imagem para Anymarket: ${anymarketUploadResponse.status} - ${errorText}`);
      
      return NextResponse.json({
        success: false,
        message: `Erro ao enviar imagem para Anymarket: ${anymarketUploadResponse.status} - ${errorText}`,
        error: {
          status: anymarketUploadResponse.status,
          statusText: anymarketUploadResponse.statusText,
          details: errorText
        }
      }, { status: anymarketUploadResponse.status });
    }

  } catch (error: any) {
    console.error('❌ Erro ao enviar imagem para Anymarket:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao enviar imagem para Anymarket',
      error: error.message
    }, { status: 500 });
  }
}
