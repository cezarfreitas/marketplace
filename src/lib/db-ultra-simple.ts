import mysql from 'mysql2/promise';

// Configuração do banco de dados
const dbConfig = {
  host: 'server.idenegociosdigitais.com.br',
  port: 3349,
  user: 'meli',
  password: '7dd3e59ddb3c3a5da0e3',
  database: 'meli',
};

// Função ultra simplificada para executar queries
export const executeQuery = async (query: string, params: any[] = []) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(query, params);
    return [rows]; // Retornar como array para permitir destructuring
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

export default executeQuery;
