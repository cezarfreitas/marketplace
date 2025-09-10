import { NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    console.log(`🔄 Deletando marcas em lote:`, ids);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'IDs das marcas são obrigatórios'
      }, { status: 400 });
    }

    // Verificar se todas as marcas existem
    const placeholders = ids.map(() => '?').join(',');
    const existingBrands = await executeQuery(
      `SELECT id FROM brands WHERE id IN (${placeholders})`,
      ids
    );

    console.log(`📊 Marcas encontradas para deletar: ${existingBrands.length} de ${ids.length}`);

    if (existingBrands.length !== ids.length) {
      return NextResponse.json({
        success: false,
        message: 'Uma ou mais marcas não foram encontradas'
      }, { status: 404 });
    }

    // Deletar as marcas em lote
    await executeQuery(
      `DELETE FROM brands WHERE id IN (${placeholders})`,
      ids
    );

    console.log(`✅ ${ids.length} marcas deletadas com sucesso`);

    return NextResponse.json({
      success: true,
      message: `${ids.length} marca(s) deletada(s) com sucesso`,
      deletedCount: ids.length
    });

  } catch (error: any) {
    console.error('❌ Erro ao deletar marcas em lote:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar marcas',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
