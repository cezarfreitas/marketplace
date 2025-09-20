import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const id = parseInt(params.id);
    const { contexto } = await request.json();

    if (!contexto || typeof contexto !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Contexto é obrigatório'
      }, { status: 400 });
    }


    // Verificar se a marca existe
    const existing = await executeQuery(`
      SELECT id_brand_vtex FROM brands_vtex WHERE id_brand_vtex = ?
    `, [id]);

    if (!existing || existing.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Marca não encontrada'
      }, { status: 404 });
    }

    // Atualizar o contexto da marca
    await executeQuery(`
      UPDATE brands_vtex 
      SET contexto = ?, updated_at = NOW()
      WHERE id_brand_vtex = ?
    `, [contexto, id]);

    console.log(`✅ Contexto salvo com sucesso para marca ID: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Contexto salvo com sucesso!'
    });

  } catch (error: any) {
    console.error('❌ Erro ao salvar contexto:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao salvar contexto'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const id = parseInt(params.id);

    console.log(`📖 Buscando contexto da marca ID: ${id}`);

    // Buscar o contexto da marca
    const result = await executeQuery(`
      SELECT id_brand_vtex, name, contexto, updated_at
      FROM brands_vtex 
      WHERE id_brand_vtex = ?
    `, [id]);

    if (!result || result.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Marca não encontrada'
      }, { status: 404 });
    }

    const brand = result[0] as any;

    return NextResponse.json({
      success: true,
      data: {
        id: brand.id_brand_vtex,
        name: brand.name,
        contexto: brand.contexto,
        updated_at: brand.updated_at
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar contexto:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar contexto'
    }, { status: 500 });
  }
}
