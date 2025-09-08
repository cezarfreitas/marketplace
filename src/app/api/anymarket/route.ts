import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Buscando dados do Anymarket...');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Construir condições de busca
    let whereClause = '';
    let searchParams_array: any[] = [];
    
    if (search) {
      whereClause = `WHERE id_any LIKE ? OR ref_id LIKE ? OR product_name LIKE ?`;
      const searchTerm = `%${search}%`;
      searchParams_array = [searchTerm, searchTerm, searchTerm];
    }

    // Query para buscar dados
    const query = `
      SELECT 
        a.*,
        p.name as product_name
      FROM anymarket a
      LEFT JOIN products p ON a.ref_id = p.ref_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const data = await executeQuery(query, [...searchParams_array, limit.toString(), offset.toString()]);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM anymarket a
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, searchParams_array);
    const total = countResult[0]?.total || 0;

    console.log(`✅ ${data.length} registros encontrados`);

    return NextResponse.json({
      success: true,
      data: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar dados do Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar dados do Anymarket',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_any, ref_id, product_name } = body;

    if (!id_any || !ref_id) {
      return NextResponse.json({
        success: false,
        message: 'ID_ANY e REF_ID são obrigatórios'
      }, { status: 400 });
    }

    console.log('➕ Adicionando registro do Anymarket:', { id_any, ref_id });

    // Inserir ou atualizar registro
    const query = `
      INSERT INTO anymarket (id_any, ref_id, product_name)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ref_id = VALUES(ref_id),
        product_name = VALUES(product_name),
        updated_at = CURRENT_TIMESTAMP
    `;

    await executeQuery(query, [id_any, ref_id, product_name]);

    console.log('✅ Registro do Anymarket adicionado/atualizado com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Registro adicionado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao adicionar registro do Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao adicionar registro',
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Limpando todos os dados do Anymarket...');

    await executeQuery('DELETE FROM anymarket');

    console.log('✅ Todos os dados do Anymarket foram limpos');

    return NextResponse.json({
      success: true,
      message: 'Todos os dados foram limpos com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao limpar dados do Anymarket:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao limpar dados',
      error: error.message
    }, { status: 500 });
  }
}
