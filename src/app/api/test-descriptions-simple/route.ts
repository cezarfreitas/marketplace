import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🧪 Testando consulta simples na tabela descriptions...');

    // Fazer a consulta exatamente como no debug que funcionou
    const [descriptions] = await executeQuery(`
      SELECT DISTINCT id_product_vtex as product_id 
      FROM descriptions 
      WHERE status = 'generated'
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    console.log('📊 Resultado da consulta:', descriptions);
    console.log('📊 Tipo do resultado:', typeof descriptions);
    console.log('📊 É array?', Array.isArray(descriptions));

    // Garantir que seja sempre um array
    const descriptionsArray = Array.isArray(descriptions) ? descriptions : (descriptions ? [descriptions] : []);

    return NextResponse.json({
      success: true,
      data: descriptionsArray,
      count: descriptionsArray.length,
      debug: {
        originalResult: descriptions,
        isArray: Array.isArray(descriptions),
        finalArray: descriptionsArray
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na consulta simples:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro na consulta simples',
      error: error.message
    }, { status: 500 });
  }
}
