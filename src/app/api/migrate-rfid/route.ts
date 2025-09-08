import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Iniciando migração para adicionar coluna product_ref_id...');

    // Verificar se a tabela existe
    const [tables] = await executeQuery(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'image_analysis_logs'
    `);

    if (tables.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tabela image_analysis_logs não existe'
      }, { status: 404 });
    }

    // Verificar se a coluna product_ref_id já existe
    const [columns] = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'image_analysis_logs' 
      AND COLUMN_NAME = 'product_ref_id'
    `);

    if (columns.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Coluna product_ref_id já existe na tabela'
      });
    }

    // Adicionar a coluna product_ref_id
    await executeQuery(`
      ALTER TABLE image_analysis_logs 
      ADD COLUMN product_ref_id VARCHAR(255) AFTER product_id
    `);

    console.log('✅ Coluna product_ref_id adicionada com sucesso!');

    // Adicionar índice para a nova coluna
    try {
      await executeQuery(`
        ALTER TABLE image_analysis_logs 
        ADD INDEX idx_product_rfid (product_rfid)
      `);
      console.log('✅ Índice idx_product_rfid criado com sucesso!');
    } catch (indexError) {
      console.log('⚠️ Índice idx_product_rfid pode já existir ou erro ao criar:', indexError);
    }

    // Mostrar estrutura atualizada da tabela
    const [updatedColumns] = await executeQuery(`
      DESCRIBE image_analysis_logs
    `);

    return NextResponse.json({
      success: true,
      message: 'Coluna product_rfid adicionada com sucesso!',
      table_structure: updatedColumns.map((col: any) => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        key: col.Key,
        default: col.Default,
        extra: col.Extra
      }))
    });

  } catch (error: any) {
    console.error('❌ Erro ao adicionar coluna product_rfid:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao adicionar coluna: ' + error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar estrutura atual da tabela
    const [columns] = await executeQuery(`
      DESCRIBE image_analysis_logs
    `);

    const hasRfidColumn = columns.some((col: any) => col.Field === 'product_rfid');

    return NextResponse.json({
      success: true,
      has_rfid_column: hasRfidColumn,
      table_structure: columns.map((col: any) => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        key: col.Key,
        default: col.Default,
        extra: col.Extra
      }))
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar estrutura da tabela:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar tabela: ' + error.message
    }, { status: 500 });
  }
}
