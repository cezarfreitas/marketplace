import { NextRequest, NextResponse } from 'next/server';
import { checkBuildEnvironment } from '@/lib/build-check';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Evitar execução durante o build do Next.js
    if (checkBuildEnvironment()) {
      return NextResponse.json({ error: 'API não disponível durante build' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json({
        success: false,
        message: 'categoryId é obrigatório'
      }, { status: 400 });
    }

    const numericCategoryId = parseInt(categoryId);
    if (isNaN(numericCategoryId)) {
      return NextResponse.json({
        success: false,
        message: 'categoryId deve ser um número válido'
      }, { status: 400 });
    }

    console.log('🔍 Buscando características para categoria ID:', numericCategoryId);

    // Primeiro, vamos ver todas as características para entender como as categorias estão armazenadas
    const allCharacteristics = await executeQuery(`
      SELECT 
        id,
        caracteristica,
        pergunta_ia,
        valores_possiveis,
        categorias,
        is_active
      FROM caracteristicas
      WHERE is_active = 1
      ORDER BY caracteristica ASC
    `);

    console.log('📊 Todas as características ativas:', allCharacteristics?.length || 0);
    console.log('📋 Exemplos de categorias armazenadas:');
    allCharacteristics?.slice(0, 10).forEach((char: any) => {
      console.log(`- ${char.caracteristica}: categorias = "${char.categorias}"`);
    });

    // Verificar se há características com categorias vazias ou nulas
    const emptyCategories = allCharacteristics?.filter((char: any) => 
      !char.categorias || char.categorias === '' || char.categorias === null
    ) || [];
    console.log(`📋 Características com categorias vazias: ${emptyCategories.length}`);
    emptyCategories.slice(0, 5).forEach((char: any) => {
      console.log(`  - ${char.caracteristica}`);
    });

    // Buscar características relacionadas à categoria
    // Incluir características específicas da categoria E características gerais (categorias vazias)
    const caracteristicas = await executeQuery(`
      SELECT 
        id,
        caracteristica,
        pergunta_ia,
        valores_possiveis,
        categorias,
        is_active,
        created_at,
        updated_at
      FROM caracteristicas
      WHERE is_active = 1
      AND (
        categorias LIKE ? 
        OR categorias LIKE ?
        OR categorias LIKE ?
        OR categorias = ''
        OR categorias IS NULL
        OR categorias = '[]'
        OR categorias = '{}'
      )
      ORDER BY caracteristica ASC
    `, [
      `%${numericCategoryId}%`,
      `"${numericCategoryId}"`,
      `'${numericCategoryId}'`
    ]);

    console.log(`✅ ${caracteristicas?.length || 0} características encontradas para categoria ${numericCategoryId}`);

    return NextResponse.json({
      success: true,
      data: caracteristicas || []
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar características por categoria:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar características por categoria',
      error: error.message
    }, { status: 500 });
  }
}
