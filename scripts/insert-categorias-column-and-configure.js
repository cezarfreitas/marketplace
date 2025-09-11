const mysql = require('mysql2/promise');
require('dotenv').config();

async function insertCategoriasColumnAndConfigure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 Verificando se a coluna categorias já existe...');
    
    // Verificar se a coluna já existe
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'caracteristicas' AND COLUMN_NAME = 'categorias'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('✅ Coluna categorias já existe na tabela caracteristicas');
    } else {
      console.log('🔧 Adicionando coluna categorias na tabela caracteristicas...');
      
      await connection.execute(`
        ALTER TABLE caracteristicas 
        ADD COLUMN categorias TEXT DEFAULT NULL COMMENT 'IDs das categorias separados por vírgula (ex: 1,2,3)'
      `);
      
      console.log('✅ Coluna categorias adicionada com sucesso!');
    }

    // Verificar estrutura da tabela
    console.log('\n🔍 Estrutura atual da tabela caracteristicas:');
    const [tableStructure] = await connection.execute('DESCRIBE caracteristicas');
    console.table(tableStructure);

    // Verificar categoria ID 16 (camisetas)
    console.log('\n🔍 Verificando categoria ID 16...');
    const [category] = await connection.execute(
      'SELECT id, name FROM categories_vtex WHERE id = 16'
    );
    console.log('Categoria ID 16:', category);

    // Verificar características existentes
    console.log('\n🔍 Verificando características existentes...');
    const [characteristics] = await connection.execute(
      'SELECT id, caracteristica, categorias FROM caracteristicas WHERE is_active = 1 ORDER BY caracteristica'
    );
    console.log('Características ativas:', characteristics);

    // Configurar características típicas para camisetas (categoria 16)
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

    console.log('\n🔧 Configurando características para camisetas (categoria 16)...');
    
    for (const charName of tshirtCharacteristics) {
      // Buscar característica por nome
      const [existingChar] = await connection.execute(
        'SELECT id, caracteristica, categorias FROM caracteristicas WHERE caracteristica = ?',
        [charName]
      );

      if (existingChar.length > 0) {
        const char = existingChar[0];
        let currentCategories = char.categorias ? char.categorias.split(',').map(id => id.trim()) : [];
        
        // Adicionar categoria 16 se não estiver presente
        if (!currentCategories.includes('16')) {
          currentCategories.push('16');
          const newCategories = currentCategories.join(',');
          
          await connection.execute(
            'UPDATE caracteristicas SET categorias = ? WHERE id = ?',
            [newCategories, char.id]
          );
          
          console.log(`✅ Categoria 16 adicionada à característica: ${char.caracteristica}`);
        } else {
          console.log(`ℹ️ Categoria 16 já configurada para: ${char.caracteristica}`);
        }
      } else {
        console.log(`⚠️ Característica não encontrada: ${charName}`);
      }
    }

    // Verificar resultado final
    console.log('\n🔍 Verificando características configuradas para categoria 16...');
    const [finalCharacteristics] = await connection.execute(`
      SELECT id, caracteristica, categorias 
      FROM caracteristicas 
      WHERE is_active = 1 
        AND (categorias IS NULL OR categorias = '' OR FIND_IN_SET('16', categorias) > 0)
      ORDER BY caracteristica
    `);
    
    console.log('Características configuradas para camisetas (categoria 16):');
    console.table(finalCharacteristics);

    console.log('\n✅ Configuração concluída!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
}

insertCategoriasColumnAndConfigure();
