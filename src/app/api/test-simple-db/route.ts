import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testando executeQuery simples...');

    // Teste 1: SELECT simples
    console.log('📊 Testando SELECT...');
    const [selectResult] = await executeQuery('SELECT 1 as test');
    console.log('✅ SELECT OK:', selectResult);

    // Teste 2: INSERT simples
    console.log('📝 Testando INSERT...');
    const [insertResult] = await executeQuery(
      `INSERT INTO brands (vtex_id, name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), is_active = VALUES(is_active), updated_at = NOW()`,
      [999998, 'Teste API', true]
    );
    console.log('✅ INSERT OK:', insertResult);

    return NextResponse.json({
      success: true,
      message: 'Teste de executeQuery OK!',
      data: {
        select: selectResult,
        insert: insertResult
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de executeQuery:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste de executeQuery',
      error: error.message
    }, { status: 400 });
  }
}
