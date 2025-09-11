import { NextRequest, NextResponse } from 'next/server';
import { getConcurrencyStatus, getPool } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const concurrencyStatus = getConcurrencyStatus();
    
    // Obter informações do pool de conexões
    const poolInfo = {
      totalConnections: pool.config.connectionLimit,
      queueLimit: pool.config.queueLimit,
      acquireTimeout: (pool.config as any).acquireTimeout || 'N/A',
      timeout: (pool.config as any).timeout || 'N/A'
    };

    // Testar conexão
    let connectionTest = false;
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      connectionTest = true;
    } catch (error) {
      console.error('Erro no teste de conexão:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        pool: poolInfo,
        concurrency: concurrencyStatus,
        connectionTest,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Erro ao obter status do banco:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
