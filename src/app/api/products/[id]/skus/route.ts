import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    if (!productId || isNaN(Number(productId))) {
      return NextResponse.json({
        success: false,
        message: 'ID do produto inválido'
      }, { status: 400 });
    }

    console.log(`🔍 Buscando SKUs para produto ID: ${productId}`);

    // Verificar se o produto existe primeiro
    const productCheck = await executeQuery('SELECT id_produto_vtex, name, ref_produto FROM products_vtex WHERE id_produto_vtex = ?', [productId]);
    console.log(`📋 Produto encontrado:`, productCheck);

    if (productCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    // Query corrigida com as colunas corretas da tabela skus_vtex
    const query = `
      SELECT 
        s.id_sku_vtex as id,
        s.name as sku_name,
        s.id_produto_vtex as product_id,
        s.is_active,
        s.ref_sku as ref_id,
        p.name as product_name
      FROM skus_vtex s
      INNER JOIN products_vtex p ON s.id_produto_vtex = p.id_produto_vtex
      WHERE s.id_produto_vtex = ?
      ORDER BY s.id_sku_vtex ASC
    `;

    console.log(`🔍 Executando query:`, query);
    console.log(`🔍 Com parâmetros:`, [productId]);
    
    const skus = await executeQuery(query, [productId]);

    console.log(`✅ Encontrados ${skus.length} SKUs para produto ID ${productId}`);
    console.log(`📋 Primeiros 3 SKUs:`, skus.slice(0, 3));

    // Extrair ref_id do nome do SKU
    const skusWithRefId = skus.map((sku: any) => {
      let extractedRefId = sku.ref_id;
      
      // Se ref_id está vazio ou null, extrair do nome do SKU
      if (!extractedRefId || extractedRefId === 'null') {
        // Padrão: "Nome do Produto - TAMANHO" -> extrair "TAMANHO"
        const match = sku.sku_name?.match(/\s-\s([^-]+)$/);
        if (match && match[1]) {
          extractedRefId = match[1].trim();
        }
      }
      
      return {
        ...sku,
        ref_id: extractedRefId || sku.ref_id
      };
    });

    return NextResponse.json({
      success: true,
      message: `${skus.length} SKUs encontrados para o produto`,
      data: {
        skus: skusWithRefId,
        productId: Number(productId),
        productRefId: productCheck[0]?.ref_id || null,
        totalSkus: skus.length,
        activeSkus: skus.filter((sku: any) => sku.is_active).length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar SKUs do produto:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}