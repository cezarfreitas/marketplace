import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery, executeModificationQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔄 Buscando agentes...');

    const agents = await executeQuery(`
      SELECT id, name, description, function_type, model, max_tokens, temperature, 
             system_prompt, guidelines_template, is_active, created_at, updated_at
      FROM agents 
      WHERE is_active = TRUE
      ORDER BY function_type, name ASC
    `);

    // Adicionar valores padrão para as novas colunas
    const agentsWithDefaults = agents.map(agent => ({
      ...agent,
      analysis_type: 'technical',
      timeout: 30,
      max_images: 4
    }));

    console.log(`✅ Encontrados ${agents.length} agentes ativos`);

    return NextResponse.json({
      success: true,
      agents: agentsWithDefaults
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar agentes:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { name, description, function_type, model, max_tokens, temperature, system_prompt, guidelines_template, analysis_type, timeout, max_images } = await request.json();

    if (!name || !function_type || !model) {
      return NextResponse.json({
        success: false,
        message: 'Nome, tipo de função e modelo são obrigatórios'
      }, { status: 400 });
    }

    console.log(`🔄 Criando agente: ${name}`);

    // As colunas já foram adicionadas anteriormente

    const result = await executeModificationQuery(`
      INSERT INTO agents (name, description, function_type, model, max_tokens, temperature, system_prompt, guidelines_template, analysis_type, timeout, max_images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || null,
      function_type,
      model,
      max_tokens || 1500,
      temperature || 0.7,
      system_prompt || null,
      guidelines_template || null,
      analysis_type || 'technical',
      timeout || 30,
      max_images || 4
    ]);

    console.log(`✅ Agente criado com ID: ${result.insertId}`);

    return NextResponse.json({
      success: true,
      message: 'Agente criado com sucesso!',
      agentId: result.insertId
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar agente:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
