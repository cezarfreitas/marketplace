import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db-simple';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testando db-simple na API...');

    // Teste simples
    const [result] = await executeQuery('SELECT 1 as test');
    console.log('✅ SELECT OK:', result);

    // Teste de inserção
    const [insertResult] = await executeQuery(
      `INSERT INTO products (vtex_id, name, department_id, ref_id, is_visible, description, title, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
      [999997, 'Teste API Simple', 1, 'TESTE_API', true, 'Descrição teste', 'Título teste', true]
    );
    console.log('✅ INSERT OK:', insertResult);

    return NextResponse.json({
      success: true,
      message: 'Teste db-simple OK!',
      data: {
        select: result,
        insert: insertResult
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste db-simple:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste db-simple',
      error: error.message
    }, { status: 400 });
  }
}
