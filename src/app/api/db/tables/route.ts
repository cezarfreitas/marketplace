import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Buscando informações das tabelas do banco...');

    // Buscar todas as tabelas do banco
    const tablesQuery = `
      SELECT 
        TABLE_NAME as table_name,
        TABLE_ROWS as table_rows,
        DATA_LENGTH as data_length,
        INDEX_LENGTH as index_length,
        CREATE_TIME as create_time,
        UPDATE_TIME as update_time,
        TABLE_COMMENT as table_comment
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME ASC
    `;

    const tables = await executeQuery(tablesQuery);
    console.log(`✅ Encontradas ${tables.length} tabelas`);

    // Para cada tabela, buscar informações das colunas
    const tablesWithColumns = await Promise.all(
      tables.map(async (table: any) => {
        const columnsQuery = `
          SELECT 
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            IS_NULLABLE as is_nullable,
            COLUMN_DEFAULT as column_default,
            COLUMN_KEY as column_key,
            EXTRA as extra,
            COLUMN_COMMENT as column_comment,
            CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
            NUMERIC_PRECISION as numeric_precision,
            NUMERIC_SCALE as numeric_scale
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION ASC
        `;

        const columns = await executeQuery(columnsQuery, [table.table_name]);

        // Buscar índices da tabela
        const indexesQuery = `
          SELECT 
            INDEX_NAME as index_name,
            COLUMN_NAME as column_name,
            NON_UNIQUE as non_unique,
            INDEX_TYPE as index_type,
            INDEX_COMMENT as index_comment
          FROM information_schema.STATISTICS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ?
          ORDER BY INDEX_NAME, SEQ_IN_INDEX ASC
        `;

        const indexes = await executeQuery(indexesQuery, [table.table_name]);

        // Buscar chaves estrangeiras
        const foreignKeysQuery = `
          SELECT 
            kcu.CONSTRAINT_NAME as constraint_name,
            kcu.COLUMN_NAME as column_name,
            kcu.REFERENCED_TABLE_NAME as referenced_table_name,
            kcu.REFERENCED_COLUMN_NAME as referenced_column_name,
            rc.UPDATE_RULE as update_rule,
            rc.DELETE_RULE as delete_rule
          FROM information_schema.KEY_COLUMN_USAGE kcu
          LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc 
            ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
            AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
          WHERE kcu.TABLE_SCHEMA = DATABASE() 
            AND kcu.TABLE_NAME = ?
            AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
          ORDER BY kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION ASC
        `;

        const foreignKeys = await executeQuery(foreignKeysQuery, [table.table_name]);

        return {
          ...table,
          columns,
          indexes,
          foreign_keys: foreignKeys,
          column_count: columns.length,
          index_count: indexes.length,
          foreign_key_count: foreignKeys.length
        };
      })
    );

    // Calcular estatísticas gerais
    const totalTables = tablesWithColumns.length;
    const totalColumns = tablesWithColumns.reduce((sum, table) => sum + table.column_count, 0);
    const totalIndexes = tablesWithColumns.reduce((sum, table) => sum + table.index_count, 0);
    const totalForeignKeys = tablesWithColumns.reduce((sum, table) => sum + table.foreign_key_count, 0);

    return NextResponse.json({
      success: true,
      message: `Estrutura do banco de dados carregada com sucesso`,
      data: {
        database_info: {
          total_tables: totalTables,
          total_columns: totalColumns,
          total_indexes: totalIndexes,
          total_foreign_keys: totalForeignKeys
        },
        tables: tablesWithColumns
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar informações das tabelas:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    }, { status: 500 });
  }
}
