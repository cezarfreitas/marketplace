import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Iniciando criação das tabelas de logs de processamento...');

    // Script SQL para criar as tabelas
    const createTablesSQL = `
      -- Tabela para logs de processamento de imagens com Pixian.ai
      CREATE TABLE IF NOT EXISTS crop_processing_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        anymarket_id VARCHAR(255) NOT NULL,
        product_name VARCHAR(500) NOT NULL,
        status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
        total_images INT DEFAULT 0,
        processed_images INT DEFAULT 0,
        failed_images INT DEFAULT 0,
        pixian_success_count INT DEFAULT 0,
        pixian_error_count INT DEFAULT 0,
        anymarket_success_count INT DEFAULT 0,
        anymarket_error_count INT DEFAULT 0,
        processing_time_seconds INT DEFAULT 0,
        error_message TEXT,
        details JSON,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_product_id (product_id),
        INDEX idx_anymarket_id (anymarket_id),
        INDEX idx_status (status),
        INDEX idx_started_at (started_at),
        INDEX idx_completed_at (completed_at)
      );

      -- Tabela para marcar produtos que já foram processados
      CREATE TABLE IF NOT EXISTS processed_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL UNIQUE,
        anymarket_id VARCHAR(255) NOT NULL,
        product_name VARCHAR(500) NOT NULL,
        last_processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_processing_count INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_product_id (product_id),
        INDEX idx_anymarket_id (anymarket_id),
        INDEX idx_last_processed_at (last_processed_at)
      );
    `;

    // Executar o script SQL
    await executeQuery(createTablesSQL, []);

    console.log('✅ Tabelas criadas com sucesso!');

    // Verificar se as tabelas foram criadas
    const checkTables = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name IN ('crop_processing_logs', 'processed_products')
    `, []);

    console.log('📋 Tabelas encontradas:', checkTables);

    return NextResponse.json({
      success: true,
      message: 'Tabelas de logs criadas com sucesso!',
      data: {
        tablesCreated: checkTables.length,
        tables: checkTables.map((t: any) => t.table_name)
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar tabelas de logs:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar tabelas de logs',
      error: error.message
    }, { status: 500 });
  }
}
