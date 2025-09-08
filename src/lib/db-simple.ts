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
  timezone: '-03:00', // UTC-3
  charset: 'utf8mb4',
};

// Função simplificada para executar queries
export const executeQuery = async <T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(query, params);
    return rows as T[];
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

export default executeQuery;
