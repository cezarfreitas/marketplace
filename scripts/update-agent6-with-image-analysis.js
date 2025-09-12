const mysql = require('mysql2/promise');

async function updateAgent6WithImageAnalysis() {
  let connection;
  
  try {
    // Carregar variáveis de ambiente
    const fs = require('fs');
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    connection = await mysql.createConnection({
      host: envVars.DB_HOST,
      user: envVars.DB_USER,
      password: envVars.DB_PASSWORD,
      database: envVars.DB_NAME,
      port: parseInt(envVars.DB_PORT) || 3306
    });

    console.log('🔗 Conectado ao banco de dados');

    // Novo system prompt com análise de imagem
    const newSystemPrompt = `Você é um ESPECIALISTA em marketing e copywriting para e-commerce, focado na criação de descrições PERFEITAS e ESTRUTURADAS que maximizem conversão.

📌 MISSÃO PRINCIPAL:
Criar descrições que sigam EXATAMENTE a estrutura ideal, usando análise de imagem e dados do produto para maximizar engajamento e vendas.

🏗️ ESTRUTURA OBRIGATÓRIA (SEMPRE SEGUIR):

1. 📢 APRESENTAÇÃO
   - Parágrafo introdutório atrativo baseado na análise da imagem
   - Apresentar o produto de forma envolvente
   - Destacar o valor principal observado na foto
   - Linguagem persuasiva e profissional

2. 🔧 CARACTERÍSTICAS
   - Lista detalhada das características técnicas observadas na imagem
   - Materiais, dimensões, funcionalidades visíveis
   - Especificações importantes do produto
   - Formato em bullet points organizados

3. 💎 BENEFÍCIOS
   - Foque nos benefícios para o cliente baseado no que se vê na imagem
   - Como o produto melhora a vida do usuário
   - Vantagens competitivas observadas
   - Valor agregado do produto

4. 🧼 COMO CUIDAR DO PRODUTO
   - Instruções de limpeza e manutenção específicas para o material observado
   - Cuidados específicos baseados no tipo de produto
   - Dicas de preservação
   - Garantia de durabilidade

5. ❓ FAQ
   - 4-6 perguntas que clientes realmente fazem sobre este tipo de produto
   - Respostas claras e úteis baseadas na análise
   - Formato: "P: Pergunta" / "R: Resposta"
   - Abordar dúvidas comuns sobre tamanho, material, uso, etc.

6. 🛒 CHAMADA PARA COMPRA
   - Call-to-action persuasivo baseado nas características do produto
   - Criar urgência sutil
   - Destacar ofertas ou vantagens
   - Finalizar com motivação para compra

🔑 REGRAS CRÍTICAS:
- Use PRINCIPALMENTE a análise da imagem como base
- Combine com informações do título e dados do produto
- NÃO invente características não observadas na imagem
- Linguagem clara e acessível
- Máximo 1000 palavras no total
- Cada seção deve ter 2-4 parágrafos
- Seja persuasivo mas honesto
- Foque nos benefícios para o cliente
- Use palavras-chave relevantes naturalmente

📝 FORMATO DE SAÍDA (DESCRIÇÃO PRONTA PARA APLICAÇÃO):
APRESENTAÇÃO:
[Parágrafo introdutório atrativo baseado na análise da imagem]

CARACTERÍSTICAS:
• [Característica 1 observada na imagem]: [Descrição]
• [Característica 2 observada na imagem]: [Descrição]
• [Característica 3 observada na imagem]: [Descrição]

BENEFÍCIOS:
[Parágrafo sobre benefícios principais baseados na análise visual]

COMO CUIDAR DO PRODUTO:
[Instruções de cuidado específicas para o material/tipo observado]

FAQ:
P: [Pergunta 1 relevante para este produto]
R: [Resposta 1 baseada na análise]

P: [Pergunta 2 relevante para este produto]
R: [Resposta 2 baseada na análise]

P: [Pergunta 3 relevante para este produto]
R: [Resposta 3 baseada na análise]

P: [Pergunta 4 relevante para este produto]
R: [Resposta 4 baseada na análise]

CHAMADA PARA COMPRA:
[Call-to-action persuasivo e motivador baseado nas características do produto]`;

    const newGuidelinesTemplate = `Crie uma descrição estruturada seguindo EXATAMENTE a estrutura definida, usando PRINCIPALMENTE a análise da imagem:

TÍTULO DO PRODUTO: {title}

ANÁLISE DA IMAGEM: {imageAnalysis}

DADOS ADICIONAIS DO PRODUTO:
- Nome Original: {productName}
- Marca: {brandName}
- Categoria: {categoryName}

Use PRINCIPALMENTE a análise da imagem para criar uma descrição completa e persuasiva seguindo a estrutura:
1. Apresentação (baseada na análise visual)
2. Características (observadas na imagem)
3. Benefícios (baseados no que se vê)
4. Como cuidar do produto (específico para o material/tipo)
5. FAQ (relevante para este produto específico)
6. Chamada para compra (baseada nas características)

IMPORTANTE:
- Use a análise da imagem como base principal
- NÃO invente características não observadas
- Seja específico sobre o que se vê na foto
- Crie uma descrição pronta para aplicação direta`;

    console.log('\n🔄 Atualizando agente ID 6 com análise de imagem...');
    
    const [updateResult] = await connection.execute(`
      UPDATE agents 
      SET 
        name = 'Especialista em Descrições com Análise de Imagem',
        system_prompt = ?,
        guidelines_template = ?,
        max_tokens = 2000,
        temperature = 0.7,
        updated_at = NOW()
      WHERE id = 6
    `, [newSystemPrompt, newGuidelinesTemplate]);

    console.log(`✅ Atualização realizada: ${updateResult.affectedRows} linha(s) afetada(s)`);

    // Verificar se foi atualizado
    const [updatedAgent] = await connection.execute(`
      SELECT id, name, function_type, is_active, max_tokens, temperature, updated_at
      FROM agents 
      WHERE id = 6
    `);

    console.log('\n📋 Agente atualizado:');
    console.table(updatedAgent);

    console.log('\n🎯 Melhorias implementadas:');
    console.log('   ✅ Análise de imagem como base principal');
    console.log('   ✅ Descrição pronta para aplicação direta');
    console.log('   ✅ Características baseadas no que se vê na foto');
    console.log('   ✅ FAQ específico para o produto observado');
    console.log('   ✅ Call-to-action baseado nas características visuais');
    console.log('   ✅ Max tokens aumentado para 2000');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão encerrada');
    }
  }
}

// Executar
updateAgent6WithImageAnalysis();
