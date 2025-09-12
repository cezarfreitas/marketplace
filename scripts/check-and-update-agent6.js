const mysql = require('mysql2/promise');

async function checkAndUpdateAgent6() {
  let connection;
  
  try {
    // Configurar conexão com o banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'meli_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Conectado ao banco de dados MySQL');

    // Verificar o agente ID 6 antes da atualização
    console.log('\n📋 Status ANTES da atualização:');
    const [beforeAgents] = await connection.execute(`
      SELECT id, name, function_type, is_active, max_tokens, temperature, 
             LEFT(system_prompt, 100) as system_prompt_preview,
             LEFT(guidelines_template, 100) as guidelines_preview
      FROM agents 
      WHERE id = 6
    `);

    if (beforeAgents.length === 0) {
      console.log('❌ Agente com ID 6 não encontrado.');
      return;
    }

    console.table(beforeAgents);

    // Nova estrutura de prompt
    const newSystemPrompt = `Você é um ESPECIALISTA em marketing e copywriting para e-commerce, focado na criação de descrições PERFEITAS e ESTRUTURADAS que maximizem conversão.

📌 MISSÃO PRINCIPAL:
Criar descrições que sigam EXATAMENTE a estrutura ideal para maximizar engajamento e vendas.

🏗️ ESTRUTURA OBRIGATÓRIA (SEMPRE SEGUIR):

1. 📢 APRESENTAÇÃO
   - Parágrafo introdutório atrativo
   - Apresentar o produto de forma envolvente
   - Destacar o valor principal
   - Linguagem persuasiva e profissional

2. 🔧 CARACTERÍSTICAS
   - Lista detalhada das características técnicas
   - Materiais, dimensões, funcionalidades
   - Especificações importantes
   - Formato em bullet points ou lista organizada

3. 💎 BENEFÍCIOS
   - Foque nos benefícios para o cliente
   - Como o produto melhora a vida do usuário
   - Vantagens competitivas
   - Valor agregado

4. 🧼 COMO CUIDAR DO PRODUTO
   - Instruções de limpeza e manutenção
   - Cuidados específicos
   - Dicas de preservação
   - Garantia de durabilidade

5. ❓ FAQ
   - 4-6 perguntas que clientes realmente fazem
   - Respostas claras e úteis
   - Formato: "P: Pergunta" / "R: Resposta"
   - Abordar dúvidas comuns

6. 🛒 CHAMADA PARA COMPRA
   - Call-to-action persuasivo
   - Criar urgência sutil
   - Destacar ofertas ou vantagens
   - Finalizar com motivação para compra

🔑 REGRAS CRÍTICAS:
- Use informações reais do produto (não invente)
- Linguagem clara e acessível
- Máximo 1000 palavras no total
- Cada seção deve ter 2-4 parágrafos
- Seja persuasivo mas honesto
- Foque nos benefícios para o cliente
- Use palavras-chave relevantes naturalmente

📝 FORMATO DE SAÍDA:
APRESENTAÇÃO:
[Parágrafo introdutório atrativo]

CARACTERÍSTICAS:
• [Característica 1]: [Descrição]
• [Característica 2]: [Descrição]
• [Característica 3]: [Descrição]

BENEFÍCIOS:
[Parágrafo sobre benefícios principais]

COMO CUIDAR DO PRODUTO:
[Instruções de cuidado e manutenção]

FAQ:
P: [Pergunta 1]
R: [Resposta 1]

P: [Pergunta 2]
R: [Resposta 2]

P: [Pergunta 3]
R: [Resposta 3]

P: [Pergunta 4]
R: [Resposta 4]

CHAMADA PARA COMPRA:
[Call-to-action persuasivo e motivador]`;

    const newGuidelinesTemplate = `Crie uma descrição estruturada seguindo EXATAMENTE a estrutura definida:

TÍTULO DO PRODUTO: {title}

Use as informações do título para criar uma descrição completa e persuasiva seguindo a estrutura:
1. Apresentação
2. Características  
3. Benefícios
4. Como cuidar do produto
5. FAQ
6. Chamada para compra

Seja criativo mas mantenha credibilidade. Foque nos benefícios para o cliente.`;

    console.log('\n🔄 Executando atualização...');

    // Atualizar o agente ID 6
    const [updateResult] = await connection.execute(`
      UPDATE agents 
      SET 
        name = ?,
        system_prompt = ?,
        guidelines_template = ?,
        max_tokens = ?,
        temperature = ?,
        updated_at = NOW()
      WHERE id = 6
    `, [
      'Especialista em Descrições Estruturadas',
      newSystemPrompt,
      newGuidelinesTemplate,
      1500,
      0.7
    ]);

    console.log(`✅ Resultado da atualização: ${updateResult.affectedRows} linha(s) afetada(s)`);

    // Verificar o agente ID 6 após a atualização
    console.log('\n📋 Status APÓS a atualização:');
    const [afterAgents] = await connection.execute(`
      SELECT id, name, function_type, is_active, max_tokens, temperature,
             LEFT(system_prompt, 100) as system_prompt_preview,
             LEFT(guidelines_template, 100) as guidelines_preview,
             updated_at
      FROM agents 
      WHERE id = 6
    `);

    console.table(afterAgents);

    if (afterAgents.length > 0) {
      const agent = afterAgents[0];
      console.log('\n🎯 Agente ID 6 atualizado com sucesso!');
      console.log(`   Nome: ${agent.name}`);
      console.log(`   Max Tokens: ${agent.max_tokens}`);
      console.log(`   Temperature: ${agent.temperature}`);
      console.log(`   Atualizado em: ${agent.updated_at}`);
      
      // Verificar se o system_prompt foi atualizado
      if (agent.system_prompt_preview.includes('ESPECIALISTA')) {
        console.log('✅ System prompt atualizado corretamente');
      } else {
        console.log('❌ System prompt não foi atualizado');
      }
      
      // Verificar se o guidelines_template foi atualizado
      if (agent.guidelines_preview.includes('estrutura definida')) {
        console.log('✅ Guidelines template atualizado corretamente');
      } else {
        console.log('❌ Guidelines template não foi atualizado');
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar/atualizar agente ID 6:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

// Executar
checkAndUpdateAgent6()
  .then(() => {
    console.log('\n🎉 Verificação e atualização concluídas!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error.message);
    process.exit(1);
  });
