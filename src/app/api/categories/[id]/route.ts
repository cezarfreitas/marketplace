import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID da categoria é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔄 Buscando categoria ID: ${id}`);

    const categories = await executeQuery(`
      SELECT 
        c.id, 
        c.vtex_id, 
        c.name, 
        c.father_category_id,
        c.title,
        c.description,
        c.keywords,
        c.is_active,
        c.lomadee_campaign_code,
        c.adwords_remarketing_code,
        c.show_in_store_front,
        c.show_brand_filter,
        c.active_store_front_link,
        c.global_category_id,
        c.stock_keeping_unit_selection_mode,
        c.score,
        c.link_id,
        c.has_children,
        c.created_at,
        c.updated_at,
        parent.name as parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.father_category_id = parent.id
      WHERE c.id = ?
    `, [id]);

    if (categories.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Categoria não encontrada'
      }, { status: 404 });
    }

    console.log(`✅ Categoria encontrada: ${categories[0].name}`);

    return NextResponse.json({
      success: true,
      data: categories[0]
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar categoria:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao buscar categoria',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID da categoria é obrigatório'
      }, { status: 400 });
    }

    console.log(`🔄 Deletando categoria ID: ${id}`);

    // Verificar se a categoria existe
    const existingCategories = await executeQuery(
      'SELECT id, name FROM categories WHERE id = ?',
      [id]
    );

    if (existingCategories.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Categoria não encontrada'
      }, { status: 404 });
    }

    // Verificar se a categoria tem produtos associados
    const productsCount = await executeQuery(
      'SELECT COUNT(*) as count FROM products_vtex WHERE category_id = ?',
      [id]
    );

    if (productsCount[0]?.count > 0) {
      return NextResponse.json({
        success: false,
        message: 'Não é possível excluir categoria que possui produtos associados'
      }, { status: 400 });
    }

    // Verificar se a categoria tem subcategorias
    const subcategoriesCount = await executeQuery(
      'SELECT COUNT(*) as count FROM categories WHERE father_category_id = ?',
      [id]
    );

    if (subcategoriesCount[0]?.count > 0) {
      return NextResponse.json({
        success: false,
        message: 'Não é possível excluir categoria que possui subcategorias'
      }, { status: 400 });
    }

    // Deletar a categoria
    await executeQuery('DELETE FROM categories WHERE id = ?', [id]);

    console.log(`✅ Categoria "${existingCategories[0].name}" deletada com sucesso`);

    return NextResponse.json({
      success: true,
      message: 'Categoria deletada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao deletar categoria:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor ao deletar categoria',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
