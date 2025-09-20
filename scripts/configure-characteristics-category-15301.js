const mysql = require('mysql2/promise');
require('dotenv').config();

async function configureCharacteristicsForCategory15301() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 Verificando categoria ID 15301...');
    
    // 1. Verificar se a categoria existe
    const [category] = await connection.execute(`
      SELECT 
        id_category_vtex as id,
        name,
        is_active,
        created_at
      FROM categories_vtex 
      WHERE id_category_vtex = 15301
    `);
    
    if (category.length === 0) {
      console.log('❌ Categoria ID 15301 não encontrada!');
      return;
    }
    
    console.log('✅ Categoria encontrada:', category[0]);
    
    // 2. Verificar se a coluna categorias existe
    console.log('\n🔍 Verificando estrutura da tabela caracteristicas...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'caracteristicas' AND COLUMN_NAME = 'categorias'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      console.log('🔧 Adicionando coluna categorias...');
      await connection.execute(`
        ALTER TABLE caracteristicas 
        ADD COLUMN categorias TEXT DEFAULT NULL COMMENT 'IDs das categorias separados por vírgula (ex: 15301,15302)'
      `);
      console.log('✅ Coluna categorias adicionada!');
    } else {
      console.log('✅ Coluna categorias já existe');
    }

    // 3. Verificar características existentes
    console.log('\n🔍 Verificando características existentes...');
    const [characteristics] = await connection.execute(`
      SELECT 
        id,
        caracteristica,
        categorias,
        is_active
      FROM caracteristicas 
      WHERE is_active = 1 
      ORDER BY caracteristica
    `);
    
    console.log(`📊 Total de características ativas: ${characteristics.length}`);
    
    // 4. Configurar características existentes para categoria 15301
    console.log('\n🔧 Configurando características existentes para categoria 15301...');
    
    const updateResult = await connection.execute(`
      UPDATE caracteristicas 
      SET categorias = CASE 
        WHEN categorias IS NULL OR categorias = '' THEN '15301'
        WHEN FIND_IN_SET('15301', categorias) = 0 THEN CONCAT(categorias, ',15301')
        ELSE categorias
      END
      WHERE caracteristica LIKE '%gola%' 
         OR caracteristica LIKE '%manga%' 
         OR caracteristica LIKE '%material%' 
         OR caracteristica LIKE '%cor%' 
         OR caracteristica LIKE '%tamanho%' 
         OR caracteristica LIKE '%estilo%' 
         OR caracteristica LIKE '%gênero%' 
         OR caracteristica LIKE '%ocasião%' 
         OR caracteristica LIKE '%cuidado%'
         OR caracteristica LIKE '%estampa%'
         OR caracteristica LIKE '%decote%'
         OR caracteristica LIKE '%comprimento%'
         AND is_active = 1
    `);
    
    console.log(`✅ ${updateResult[0].affectedRows} características atualizadas`);

    // 5. Inserir características específicas para camisetas
    console.log('\n🔧 Inserindo características específicas para camisetas...');
    
    const characteristicsToInsert = [
      {
        caracteristica: 'Tipo de Gola',
        pergunta_ia: 'Que tipo de gola ou decote esta peça possui? Gola redonda, V, polo, alta, baixa?',
        valores_possiveis: 'Redonda, V, Polo, Alta, Baixa, Sem gola, Assimétrica, Canoa, Quadrada'
      },
      {
        caracteristica: 'Tipo de Manga',
        pergunta_ia: 'Que tipo de manga esta peça possui? Analise as imagens para identificar o comprimento e estilo da manga.',
        valores_possiveis: 'Sem manga, Manga curta, Manga longa, Manga 3/4, Manga raglan, Manga kimono'
      },
      {
        caracteristica: 'Material Principal',
        pergunta_ia: 'Qual é o material principal desta peça de roupa? Analise as imagens e descrição para identificar o tecido.',
        valores_possiveis: 'Algodão, Poliéster, Viscose, Linho, Seda, Lã, Elastano, Modal, Bambu, Tecido misto'
      },
      {
        caracteristica: 'Cor Principal',
        pergunta_ia: 'Qual é a cor predominante desta peça? Analise cuidadosamente as imagens e identifique a cor mais visível.',
        valores_possiveis: 'Branco, Preto, Azul, Vermelho, Verde, Amarelo, Rosa, Roxo, Laranja, Cinza, Marrom, Bege'
      },
      {
        caracteristica: 'Tipo de Estampa',
        pergunta_ia: 'Que tipo de estampa ou design esta peça possui? Analise as imagens para identificar padrões, logos ou estampas.',
        valores_possiveis: 'Lisa, Listrada, Xadrez, Floral, Geométrica, Animal Print, Logo/Brand, Frase/Texto, Abstrata, Tie-dye'
      },
      {
        caracteristica: 'Estilo',
        pergunta_ia: 'Qual é o estilo desta peça? Analise o design geral para determinar o estilo.',
        valores_possiveis: 'Casual, Esportivo, Formal, Vintage, Moderno, Clássico, Streetwear, Boho, Minimalista, Oversized'
      },
      {
        caracteristica: 'Gênero',
        pergunta_ia: 'Para qual gênero esta peça é destinada? Analise o design e corte da peça.',
        valores_possiveis: 'Masculino, Feminino, Unissex, Infantil'
      },
      {
        caracteristica: 'Ocasião',
        pergunta_ia: 'Para que ocasiões esta peça é adequada? Analise o estilo e design.',
        valores_possiveis: 'Casual, Trabalho, Academia, Festa, Viagem, Casa, Praia, Inverno, Verão'
      },
      {
        caracteristica: 'Cuidados',
        pergunta_ia: 'Quais são os cuidados necessários para esta peça? Analise o material e instruções.',
        valores_possiveis: 'Lavar à mão, Lavar na máquina, Não usar alvejante, Passar a ferro, Lavagem a seco, Não torcer'
      },
      {
        caracteristica: 'Comprimento',
        pergunta_ia: 'Qual é o comprimento desta peça? Analise as imagens para determinar o comprimento.',
        valores_possiveis: 'Curto, Médio, Longo, Oversized, Ajustado, Solto'
      }
    ];

    let insertedCount = 0;
    for (const char of characteristicsToInsert) {
      try {
        await connection.execute(`
          INSERT IGNORE INTO caracteristicas (caracteristica, pergunta_ia, valores_possiveis, is_active, categorias) 
          VALUES (?, ?, ?, 1, '15301')
        `, [char.caracteristica, char.pergunta_ia, char.valores_possiveis]);
        insertedCount++;
      } catch (error) {
        console.log(`⚠️ Erro ao inserir característica "${char.caracteristica}":`, error.message);
      }
    }
    
    console.log(`✅ ${insertedCount} características inseridas`);

    // 6. Verificar resultado final
    console.log('\n📊 Verificando resultado final...');
    const [finalResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total_caracteristicas,
        COUNT(CASE WHEN FIND_IN_SET('15301', categorias) > 0 THEN 1 END) as caracteristicas_categoria_15301
      FROM caracteristicas 
      WHERE is_active = 1
    `);
    
    console.log('📈 Estatísticas finais:');
    console.log(`   Total de características ativas: ${finalResult[0].total_caracteristicas}`);
    console.log(`   Características configuradas para categoria 15301: ${finalResult[0].caracteristicas_categoria_15301}`);

    // 7. Listar características configuradas para categoria 15301
    console.log('\n📋 Características configuradas para categoria 15301:');
    const [configuredCharacteristics] = await connection.execute(`
      SELECT 
        id,
        caracteristica,
        categorias
      FROM caracteristicas 
      WHERE is_active = 1 
        AND FIND_IN_SET('15301', categorias) > 0
      ORDER BY caracteristica
    `);
    
    configuredCharacteristics.forEach((char, index) => {
      console.log(`   ${index + 1}. ${char.caracteristica} (ID: ${char.id})`);
    });

    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('✅ Agora você pode usar a análise de imagens para produtos da categoria 15301');

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
  } finally {
    await connection.end();
  }
}

// Executar a função
configureCharacteristicsForCategory15301();
