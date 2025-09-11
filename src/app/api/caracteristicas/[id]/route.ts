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
    const body = await request.json();

    console.log('✏️ Atualizando característica ID:', id);

    // Verificar se a característica existe
    const existing = await executeQuery(`
      SELECT id FROM caracteristicas WHERE id = ?
    `, [id]);

    if (!existing || existing.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Característica não encontrada'
      }, { status: 404 });
    }

    // Construir query de atualização dinamicamente
    const updateFields = [];
    const updateValues = [];

    if (body.caracteristica !== undefined) {
      updateFields.push('caracteristica = ?');
      updateValues.push(body.caracteristica);
    }

    if (body.pergunta_ia !== undefined) {
      updateFields.push('pergunta_ia = ?');
      updateValues.push(body.pergunta_ia);
    }

    if (body.valores_possiveis !== undefined) {
      updateFields.push('valores_possiveis = ?');
      updateValues.push(body.valores_possiveis);
    }

    if (body.categorias !== undefined) {
      updateFields.push('categorias = ?');
      updateValues.push(body.categorias);
    }

    if (body.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(body.is_active);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum campo para atualizar'
      }, { status: 400 });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const query = `
      UPDATE caracteristicas 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await executeQuery(query, updateValues);

    console.log('✅ Característica atualizada com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Característica atualizada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar característica:', error);
    
    // Verificar se é erro de duplicata
    if (error.message?.includes('unique_caracteristica')) {
      return NextResponse.json({
        success: false,
        message: 'Já existe uma característica com este nome'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar característica',
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const id = parseInt(params.id);

    console.log('🗑️ Deletando característica ID:', id);

    // Verificar se a característica existe
    const existing = await executeQuery(`
      SELECT id FROM caracteristicas WHERE id = ?
    `, [id]);

    if (!existing || existing.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Característica não encontrada'
      }, { status: 404 });
    }

    // Verificar se há respostas associadas
    const responses = await executeQuery(`
      SELECT COUNT(*) as count FROM respostas_caracteristicas WHERE caracteristica_id = ?
    `, [id]);

    const responseCount = (responses[0] as any).count;
    if (responseCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Não é possível deletar. Esta característica possui ${responseCount} resposta(s) associada(s).`
      }, { status: 400 });
    }

    // Deletar característica
    await executeQuery(`
      DELETE FROM caracteristicas WHERE id = ?
    `, [id]);

    console.log('✅ Característica deletada com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Característica deletada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao deletar característica:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao deletar característica',
      error: error.message
    }, { status: 500 });
  }
}
