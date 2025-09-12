import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

// GET - Buscar títulos
export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    console.log('🔍 Buscando títulos...', { productId, limit, offset, status });

    let query = `
      SELECT 
        t.*,
        p.name as product_name,
        p.ref_id as product_ref_id,
        b.name as brand_name,
        c.name as category_name,
        a.name as agent_name
      FROM titles t
      LEFT JOIN products_vtex p ON t.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories_vtex c ON p.category_id = c.vtex_id
      LEFT JOIN agents a ON t.agent_id = a.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (productId) {
      query += ' AND t.product_id = ?';
      params.push(parseInt(productId));
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';
    
    if (limit > 0) {
      query += ` LIMIT ${limit}`;
    }
    
    if (offset > 0) {
      query += ` OFFSET ${offset}`;
    }

    const titles = await executeQuery(query, params);
    console.log('📊 Títulos encontrados:', titles?.length || 0);

    return NextResponse.json({
      success: true,
      data: titles || [],
      count: titles?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar títulos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar títulos',
      error: error.message
    }, { status: 500 });
  }
}

// POST - Criar novo título
export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const body = await request.json();
    const {
      product_id,
      title,
      original_title,
      agent_id,
      openai_model,
      openai_tokens_used,
      openai_tokens_prompt,
      openai_tokens_completion,
      openai_cost,
      openai_request_id,
      openai_response_time_ms,
      openai_max_tokens,
      openai_temperature,
      generation_attempts,
      is_unique,
      validation_passed,
      status
    } = body;

    if (!product_id || !title) {
      return NextResponse.json({
        success: false,
        message: 'product_id e title são obrigatórios'
      }, { status: 400 });
    }

    console.log('💾 Criando novo título...', { product_id, title });

    const insertQuery = `
      INSERT INTO titles (
        product_id, title, original_title, agent_id, openai_model,
        openai_tokens_used, openai_tokens_prompt, openai_tokens_completion,
        openai_cost, openai_request_id, openai_response_time_ms,
        openai_max_tokens, openai_temperature, generation_attempts,
        is_unique, validation_passed, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertQuery, [
      product_id,
      title,
      original_title || null,
      agent_id || null,
      openai_model || 'gpt-4o-mini',
      openai_tokens_used || 0,
      openai_tokens_prompt || 0,
      openai_tokens_completion || 0,
      openai_cost || 0,
      openai_request_id || null,
      openai_response_time_ms || 0,
      openai_max_tokens || 100,
      openai_temperature || 0.30,
      generation_attempts || 1,
      is_unique !== undefined ? is_unique : true,
      validation_passed !== undefined ? validation_passed : true,
      status || 'generated'
    ]);

    console.log('✅ Título criado com sucesso');

    return NextResponse.json({
      success: true,
      data: {
        id: (result as any).insertId,
        product_id,
        title
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar título:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar título',
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Atualizar título
export async function PUT(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID do título é obrigatório'
      }, { status: 400 });
    }

    console.log('🔄 Atualizando título...', { id, updateData });

    // Construir query dinamicamente baseada nos campos fornecidos
    const fields = Object.keys(updateData);
    if (fields.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum campo para atualizar'
      }, { status: 400 });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(id); // Para o WHERE

    const updateQuery = `
      UPDATE titles 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(updateQuery, values);

    console.log('✅ Título atualizado com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Título atualizado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar título:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar título',
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Deletar título
export async function DELETE(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('productId');

    if (!id && !productId) {
      return NextResponse.json({
        success: false,
        message: 'ID do título ou productId é obrigatório'
      }, { status: 400 });
    }

    console.log('🗑️ Deletando título...', { id, productId });

    let deleteQuery: string;
    let params: any[];

    if (id) {
      deleteQuery = 'DELETE FROM titles WHERE id = ?';
      params = [parseInt(id)];
    } else {
      deleteQuery = 'DELETE FROM titles WHERE product_id = ?';
      params = [parseInt(productId!)];
    }

    await executeQuery(deleteQuery, params);

    console.log('✅ Título deletado com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Título deletado com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao deletar título:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao deletar título',
      error: error.message
    }, { status: 500 });
  }
}
