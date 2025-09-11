const mysql = require('mysql2/promise');
require('dotenv').config();

async function configureTShirtCharacteristics() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 Verificando características disponíveis...');
    const [characteristics] = await connection.execute(
      'SELECT id, caracteristica, is_active FROM caracteristicas WHERE is_active = 1 ORDER BY caracteristica'
    );
    console.log('Características ativas:', characteristics);

    console.log('\n🔍 Verificando categoria ID 16...');
    const [category] = await connection.execute(
      'SELECT id, name FROM categories_vtex WHERE id = 16'
    );
    console.log('Categoria ID 16:', category);

    console.log('\n🔍 Verificando relacionamentos existentes...');
    const [relationships] = await connection.execute(`
      SELECT cc.*, c.caracteristica, cv.name as categoria_name 
      FROM caracteristicas_categorias cc 
      JOIN caracteristicas c ON cc.caracteristica_id = c.id 
      JOIN categories_vtex cv ON cc.categoria_id = cv.id 
      WHERE cc.categoria_id = 16
    `);
    console.log('Relacionamentos para categoria 16:', relationships);

    // Se não há relacionamentos, vamos criar alguns para camisetas
    if (relationships.length === 0) {
      console.log('\n🔧 Criando relacionamentos para categoria de camisetas...');
      
      // Características típicas para camisetas
      const tshirtCharacteristics = [
        'Tipo de Gola',
        'Tipo de Manga', 
        'Tipo de Estampa',
        'Material',
        'Tamanho',
        'Cor',
        'Estilo',
        'Gênero',
        'Ocasião',
        'Cuidados'
      ];

      // Buscar IDs das características que existem
      const [existingChars] = await connection.execute(`
        SELECT id, caracteristica 
        FROM caracteristicas 
        WHERE is_active = 1 AND caracteristica IN (${tshirtCharacteristics.map(() => '?').join(',')})
      `, tshirtCharacteristics);

      console.log('Características encontradas para camisetas:', existingChars);

      // Criar relacionamentos
      for (const char of existingChars) {
        try {
          await connection.execute(`
            INSERT INTO caracteristicas_categorias (caracteristica_id, categoria_id, is_active) 
            VALUES (?, 16, 1)
            ON DUPLICATE KEY UPDATE is_active = 1
          `, [char.id]);
          console.log(`✅ Relacionamento criado: ${char.caracteristica} -> Categoria 16`);
        } catch (error) {
          console.log(`⚠️ Erro ao criar relacionamento para ${char.caracteristica}:`, error.message);
        }
      }
    }

    console.log('\n🔍 Verificando relacionamentos finais...');
    const [finalRelationships] = await connection.execute(`
      SELECT cc.*, c.caracteristica, cv.name as categoria_name 
      FROM caracteristicas_categorias cc 
      JOIN caracteristicas c ON cc.caracteristica_id = c.id 
      JOIN categories_vtex cv ON cc.categoria_id = cv.id 
      WHERE cc.categoria_id = 16 AND cc.is_active = 1
    `);
    console.log('Relacionamentos finais para categoria 16:', finalRelationships);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
}

configureTShirtCharacteristics();
