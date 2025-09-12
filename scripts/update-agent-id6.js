const mysql = require('mysql2/promise');
const fs = require('fs');

async function updateAgentId6() {
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

    // Verificar se o agente ID 6 existe
    const [agents] = await connection.execute(`
      SELECT id, name, function_type, is_active
      FROM agents 
      WHERE id = 6
    `);

    if (agents.length === 0) {
      console.log('❌ Agente com ID 6 não encontrado.');
      return;
    }

    const agent = agents[0];
    console.log(`📝 Atualizando agente ID 6: ${agent.name} (Função: ${agent.function_type})`);

    // Nova estrutura de prompt para descrições
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

    // Atualizar o agente ID 6
    await connection.execute(`
      UPDATE agents 
      SET 
        name = 'Especialista em Descrições Estruturadas',
        system_prompt = ?,
        guidelines_template = ?,
        max_tokens = 1500,
        temperature = 0.7,
        updated_at = NOW()
      WHERE id = 6
    `, [newSystemPrompt, newGuidelinesTemplate]);

    console.log('✅ Agente ID 6 atualizado com sucesso!');
    
    // Verificar a atualização
    const [updatedAgent] = await connection.execute(`
      SELECT id, name, function_type, is_active, max_tokens, temperature
      FROM agents 
      WHERE id = 6
    `);

    console.log('\n📋 Agente atualizado:');
    console.table(updatedAgent);

    console.log('\n🎯 Nova estrutura implementada:');
    console.log('   1. 📢 Apresentação');
    console.log('   2. 🔧 Características');
    console.log('   3. 💎 Benefícios');
    console.log('   4. 🧼 Como cuidar do produto');
    console.log('   5. ❓ FAQ');
    console.log('   6. 🛒 Chamada para compra');

  } catch (error) {
    console.error('❌ Erro ao atualizar agente ID 6:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

// Executar
updateAgentId6()
  .then(() => {
    console.log('\n🎉 Atualização do agente ID 6 concluída!');
    console.log('💡 O sistema agora usa a nova estrutura de descrições.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha na atualização:', error.message);
    process.exit(1);
  });
