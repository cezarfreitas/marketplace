import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    console.log('🔍 Buscando características...');

    const caracteristicas = await executeQuery(`
      SELECT 
        id,
        caracteristica,
        pergunta_ia,
        valores_possiveis,
        is_active,
        categorias,
        created_at,
        updated_at
      FROM caracteristicas
      ORDER BY caracteristica ASC
    `);

    console.log(`✅ ${caracteristicas?.length || 0} características encontradas`);

    return NextResponse.json({
      success: true,
      caracteristicas: caracteristicas || []
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar características:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar características',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const body = await request.json();
    const { caracteristica, pergunta_ia, valores_possiveis, is_active = true, categorias } = body;

    console.log('➕ Criando nova característica:', { caracteristica });

    // Validar campos obrigatórios
    if (!caracteristica || !pergunta_ia) {
      return NextResponse.json({
        success: false,
        message: 'Característica e pergunta são obrigatórios'
      }, { status: 400 });
    }

    // Inserir nova característica
    const result = await executeQuery(`
      INSERT INTO caracteristicas (caracteristica, pergunta_ia, valores_possiveis, is_active, categorias, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [caracteristica, pergunta_ia, valores_possiveis || null, is_active, categorias || null]);

    console.log('✅ Característica criada com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Característica criada com sucesso',
      id: (result as any).insertId
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar característica:', error);
    
    // Verificar se é erro de duplicata
    if (error.message?.includes('unique_caracteristica')) {
      return NextResponse.json({
        success: false,
        message: 'Já existe uma característica com este nome'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: 'Erro ao criar característica',
      error: error.message
    }, { status: 500 });
  }
}
