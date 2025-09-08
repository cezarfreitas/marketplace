import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

// Configuração do banco de dados
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-03:00', // UTC-3
  charset: 'utf8mb4',
};

// Pool de conexões
let pool: mysql.Pool | null = null;

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
  let connection;
  try {
    connection = await getPool().getConnection();
    const [rows] = await connection.execute(query, params);
    return rows as T[];
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Função para executar queries de modificação (INSERT, UPDATE, DELETE)
export const executeModificationQuery = async (
  query: string,
  params: any[] = []
): Promise<{ affectedRows: number; insertId?: number }> => {
  try {
    const [result] = await getPool().execute(query, params);
    return result as { affectedRows: number; insertId?: number };
  } catch (error) {
    console.error('Erro ao executar query de modificação:', error);
    throw error;
  }
};

// Função para executar uma única query
export const executeSingleQuery = async <T = any>(
  query: string,
  params: any[] = []
): Promise<T> => {
  try {
    const [rows] = await getPool().execute(query, params);
    const result = rows as any[];
    return result[0] as T;
  } catch (error) {
    console.error('Erro ao executar query única:', error);
    throw error;
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

export default getPool;
