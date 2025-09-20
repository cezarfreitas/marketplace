import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'server.idenegociosdigitais.com.br',
  port: parseInt(process.env.DB_PORT || '3347'),
  user: process.env.DB_USER || 'seo_db',
  password: process.env.DB_PASSWORD || 'ba473d7d7da1e8fb6e6a',
  database: process.env.DB_NAME || 'seo_db',
  waitForConnections: true,
  connectionLimit: 10, // Aumentado para suportar mais operações simultâneas
  queueLimit: 50, // Aumentado significativamente para importações em lote
  acquireTimeoutMillis: 120000, // 2 minutos para adquirir conexão (formato correto)
  idleTimeout: 600000, // 10 minutos de timeout para conexões ociosas
  timezone: '-03:00', // UTC-3
  charset: 'utf8mb4',
  // Configurações adicionais para melhor performance
  multipleStatements: false, // Segurança
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: false,
  debug: false,
};

// Pool de conexões
let pool: mysql.Pool | null = null;

// Sistema de controle de concorrência para importações
class ConcurrencyController {
  private activeOperations = 0;
  private maxConcurrentOperations = 8; // Aumentado para 8 operações simultâneas
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.activeOperations < this.maxConcurrentOperations) {
        this.activeOperations++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    this.activeOperations--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.activeOperations++;
        next();
      }
    }
  }

  getStatus() {
    return {
      activeOperations: this.activeOperations,
      queueLength: this.queue.length,
      maxConcurrentOperations: this.maxConcurrentOperations
    };
  }
}

const concurrencyController = new ConcurrencyController();

export const getPool = (): mysql.Pool => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
};

// Função para testar conexão
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Conexão com MySQL estabelecida com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com MySQL:', error);
    return false;
  }
};

// Função para executar queries
export const executeQuery = async <T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> => {
  await concurrencyController.acquire();
  let connection;
  try {
    connection = await getPool().getConnection();
    
    // Validar parâmetros
    const validParams = params.map(param => param === undefined ? null : param);
    
    const [rows] = await connection.execute(query, validParams);
    return rows as T[];
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    concurrencyController.release();
  }
};

// Função para executar queries de modificação (INSERT, UPDATE, DELETE)
export const executeModificationQuery = async (
  query: string,
  params: any[] = []
): Promise<{ affectedRows: number; insertId?: number }> => {
  let connection;
  try {
    connection = await getPool().getConnection();
    
    // Validar parâmetros
    const validParams = params.map(param => param === undefined ? null : param);
    
    const [result] = await connection.execute(query, validParams);
    return result as { affectedRows: number; insertId?: number };
  } catch (error) {
    console.error('Erro ao executar query de modificação:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Função para executar uma única query
export const executeSingleQuery = async <T = any>(
  query: string,
  params: any[] = []
): Promise<T> => {
  let connection;
  try {
    connection = await getPool().getConnection();
    
    // Validar parâmetros
    const validParams = params.map(param => param === undefined ? null : param);
    
    const [rows] = await connection.execute(query, validParams);
    const result = rows as any[];
    return result[0] as T;
  } catch (error) {
    console.error('Erro ao executar query única:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Função para executar transação
export const executeTransaction = async <T>(
  queries: Array<{ query: string; params: any[] }>
): Promise<T[]> => {
  const connection = await getPool().getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results: T[] = [];
    for (const { query, params } of queries) {
      const [rows] = await connection.execute(query, params);
      results.push(rows as T);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Função para fechar pool de conexões
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

// Função para verificar se uma tabela existe
export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const query = `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = ?
    `;
    const result = await executeSingleQuery<{ count: number }>(query, [dbConfig.database, tableName]);
    return result.count > 0;
  } catch (error) {
    console.error('Erro ao verificar existência da tabela:', error);
    return false;
  }
};

// Função para obter informações da tabela
export const getTableInfo = async (tableName: string) => {
  try {
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;
    return await executeQuery(query, [dbConfig.database, tableName]);
  } catch (error) {
    console.error('Erro ao obter informações da tabela:', error);
    throw error;
  }
};

// Função para obter status do controle de concorrência
export const getConcurrencyStatus = () => {
  return concurrencyController.getStatus();
};

// Função para ajustar o limite de concorrência
export const setMaxConcurrentOperations = (max: number) => {
  concurrencyController['maxConcurrentOperations'] = max;
};

export default getPool;
