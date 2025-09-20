import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST() {
  try {
    console.log('🧪 Inserindo dados de teste na tabela anymarket...');

    // Inserir alguns dados de teste
    const testData = [
      { ref_produto_vtex: '203716023', id_produto_any: 'ANY001' },
      { ref_produto_vtex: '203716024', id_produto_any: 'ANY002' },
      { ref_produto_vtex: '203716025', id_produto_any: 'ANY003' },
      { ref_produto_vtex: '203716026', id_produto_any: 'ANY004' },
      { ref_produto_vtex: '203716027', id_produto_any: 'ANY005' }
    ];

    let insertedCount = 0;
    for (const data of testData) {
      try {
        await executeQuery(`
          INSERT INTO anymarket (ref_produto_vtex, id_produto_any)
          VALUES (?, ?)
        `, [data.ref_produto_vtex, data.id_produto_any]);
        insertedCount++;
        console.log(`✅ Inserido: VTEX ${data.ref_produto_vtex} -> Anymarket ${data.id_produto_any}`);
      } catch (error) {
        console.log(`⚠️ Erro ao inserir ${data.ref_produto_vtex}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${insertedCount} registros de teste inseridos com sucesso!`,
      data: {
        insertedCount,
        totalRecords: testData.length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao inserir dados de teste:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao inserir dados de teste',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('🗑️ Removendo dados de teste da tabela anymarket...');

    // Remover dados de teste (baseado nos IDs que inserimos)
    const testIds = [203716023, 203716024, 203716025, 203716026, 203716027];
    
    let deletedCount = 0;
    for (const id of testIds) {
      try {
        const result = await executeQuery(`
          DELETE FROM anymarket WHERE ref_produto_vtex = ?
        `, [id]);
        deletedCount++;
        console.log(`✅ Removido: VTEX ${id}`);
      } catch (error) {
        console.log(`⚠️ Erro ao remover ${id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} registros de teste removidos com sucesso!`,
      data: {
        deletedCount
      }
    });

  } catch (error) {
    console.error('❌ Erro ao remover dados de teste:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao remover dados de teste',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
