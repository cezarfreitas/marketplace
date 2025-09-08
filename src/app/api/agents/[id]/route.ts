import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeModificationQuery } from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const agentId = params.id;

    console.log(`🔄 Buscando agente ID: ${agentId}`);

    // Query simplificada primeiro
    const agents = await executeQuery(`
      SELECT id, name, description, function_type, model, max_tokens, temperature, 
             system_prompt, guidelines_template, is_active, created_at, updated_at
      FROM agents 
      WHERE id = ?
    `, [agentId]);

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Agente não encontrado'
      }, { status: 404 });
    }

    // Adicionar valores padrão para as novas colunas
    const agent = {
      ...agents[0],
      analysis_type: 'technical',
      timeout: 30,
      max_images: 4
    };

    console.log(`✅ Agente encontrado: ${agent.name}`);

    return NextResponse.json({
      success: true,
      agent: agent
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar agente:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const agentId = params.id;
    const { name, description, function_type, model, max_tokens, temperature, system_prompt, guidelines_template, is_active, analysis_type, timeout, max_images } = await request.json();

    console.log(`🔄 Atualizando agente ID: ${agentId}`);
    console.log('📊 Dados recebidos:', { name, function_type, model, max_tokens, temperature, is_active, analysis_type, timeout, max_images });

    // As colunas já foram adicionadas anteriormente

    // Primeiro, tentar atualizar apenas as colunas básicas
    let result;
    try {
      result = await executeModificationQuery(`
        UPDATE agents 
        SET name = ?, description = ?, function_type = ?, model = ?, max_tokens = ?, 
            temperature = ?, system_prompt = ?, guidelines_template = ?, is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name,
        description || null,
        function_type,
        model,
        max_tokens || 1500,
        temperature || 0.7,
        system_prompt || null,
        guidelines_template || null,
        is_active !== undefined ? is_active : true,
        agentId
      ]);
    } catch (error) {
      console.error('❌ Erro na atualização básica:', error);
      throw error;
    }

    // Depois, tentar atualizar as novas colunas se existirem
    try {
      await executeModificationQuery(`
        UPDATE agents 
        SET analysis_type = ?, timeout = ?, max_images = ?
        WHERE id = ?
      `, [
        analysis_type || 'technical',
        timeout || 30,
        max_images || 4,
        agentId
      ]);
    } catch (error) {
      console.log('⚠️ Colunas novas não existem ainda, ignorando:', (error as Error).message);
    }

    if (result.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        message: 'Agente não encontrado'
      }, { status: 404 });
    }

    console.log(`✅ Agente atualizado: ${name}`);

    return NextResponse.json({
      success: true,
      message: 'Agente atualizado com sucesso!'
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar agente:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const agentId = params.id;

    console.log(`🔄 Desativando agente ID: ${agentId}`);

    const result = await executeModificationQuery(`
      UPDATE agents 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [agentId]);

    if (result.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        message: 'Agente não encontrado'
      }, { status: 404 });
    }

    console.log(`✅ Agente desativado`);

    return NextResponse.json({
      success: true,
      message: 'Agente desativado com sucesso!'
    });

  } catch (error: any) {
    console.error('❌ Erro ao desativar agente:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
