import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testando conexão com banco de dados...');

    // Testar conexão básica
    const [result] = await executeQuery('SELECT 1 as test');
    console.log('✅ Conexão com banco OK:', result);

    // Testar inserção de marca
    const [brandResult] = await executeQuery(
      `INSERT INTO brands (vtex_id, name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), is_active = VALUES(is_active), updated_at = NOW()`,
      [999999, 'Teste Marca', true]
    );
    console.log('✅ Inserção de marca OK:', brandResult);

    // Testar inserção de categoria
    const [categoryResult] = await executeQuery(
      `INSERT INTO categories (vtex_id, name, father_category_id, title, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), title = VALUES(title), updated_at = NOW()`,
      [999999, 'Teste Categoria', 0, 'Teste', true]
    );
    console.log('✅ Inserção de categoria OK:', categoryResult);

    // Testar inserção de produto
    const [productResult] = await executeQuery(
      `INSERT INTO products (vtex_id, name, department_id, category_id, brand_id, is_visible, description, title, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
      [999999, 'Teste Produto', 1, 999999, 999999, true, 'Descrição teste', 'Título teste', true]
    );
    console.log('✅ Inserção de produto OK:', productResult);

    return NextResponse.json({
      success: true,
      message: 'Teste de banco de dados OK!',
      data: {
        connection: 'OK',
        brandInsert: 'OK',
        categoryInsert: 'OK',
        productInsert: 'OK'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de banco:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro no teste de banco',
      error: error.message
    }, { status: 400 });
  }
}
