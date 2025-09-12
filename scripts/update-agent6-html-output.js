const mysql = require('mysql2/promise');

async function updateAgent6HTMLOutput() {
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

    // Novo system prompt com saída HTML
    const newSystemPrompt = `Você é um ESPECIALISTA em marketing e copywriting para e-commerce, focado na criação de descrições PERFEITAS e ESTRUTURADAS em formato HTML que maximizem conversão.

📌 MISSÃO PRINCIPAL:
Criar descrições em formato HTML que sigam EXATAMENTE a estrutura ideal, usando análise de imagem e dados do produto para maximizar engajamento e vendas.

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
   - Formato em lista HTML organizada

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
   - Formato em lista HTML organizada
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
- SEMPRE retorne em formato HTML válido

📝 FORMATO DE SAÍDA HTML (DESCRIÇÃO PRONTA PARA APLICAÇÃO):
<div class="product-description">
  <div class="section apresentacao">
    <h2>📢 Apresentação</h2>
    <p>[Parágrafo introdutório atrativo baseado na análise da imagem]</p>
  </div>

  <div class="section caracteristicas">
    <h2>🔧 Características</h2>
    <ul>
      <li><strong>[Característica 1 observada na imagem]:</strong> [Descrição]</li>
      <li><strong>[Característica 2 observada na imagem]:</strong> [Descrição]</li>
      <li><strong>[Característica 3 observada na imagem]:</strong> [Descrição]</li>
    </ul>
  </div>

  <div class="section beneficios">
    <h2>💎 Benefícios</h2>
    <p>[Parágrafo sobre benefícios principais baseados na análise visual]</p>
  </div>

  <div class="section cuidados">
    <h2>🧼 Como Cuidar do Produto</h2>
    <p>[Instruções de cuidado específicas para o material/tipo observado]</p>
  </div>

  <div class="section faq">
    <h2>❓ Perguntas Frequentes</h2>
    <ul>
      <li><strong>P:</strong> [Pergunta 1 relevante para este produto]<br>
          <strong>R:</strong> [Resposta 1 baseada na análise]</li>
      <li><strong>P:</strong> [Pergunta 2 relevante para este produto]<br>
          <strong>R:</strong> [Resposta 2 baseada na análise]</li>
      <li><strong>P:</strong> [Pergunta 3 relevante para este produto]<br>
          <strong>R:</strong> [Resposta 3 baseada na análise]</li>
      <li><strong>P:</strong> [Pergunta 4 relevante para este produto]<br>
          <strong>R:</strong> [Resposta 4 baseada na análise]</li>
    </ul>
  </div>

  <div class="section cta">
    <h2>🛒 Garanta o Seu Agora!</h2>
    <p>[Call-to-action persuasivo e motivador baseado nas características do produto]</p>
  </div>
</div>`;

    const newGuidelinesTemplate = `Crie uma descrição estruturada em formato HTML seguindo EXATAMENTE a estrutura definida, usando PRINCIPALMENTE a análise da imagem:

TÍTULO DO PRODUTO: {title}

ANÁLISE DA IMAGEM: {imageAnalysis}

DADOS ADICIONAIS DO PRODUTO:
- Nome Original: {productName}
- Marca: {brandName}
- Categoria: {categoryName}

Use PRINCIPALMENTE a análise da imagem para criar uma descrição completa e persuasiva em HTML seguindo a estrutura:
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
- Retorne APENAS o HTML completo e válido
- Use a estrutura HTML exata fornecida no system prompt`;

    console.log('\n🔄 Atualizando agente ID 6 para saída HTML...');
    
    const [updateResult] = await connection.execute(`
      UPDATE agents 
      SET 
        name = 'Especialista em Descrições HTML com Análise de Imagem',
        system_prompt = ?,
        guidelines_template = ?,
        max_tokens = 2500,
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
    console.log('   ✅ Saída em formato HTML estruturado');
    console.log('   ✅ Estrutura HTML básica com classes CSS');
    console.log('   ✅ Seções organizadas com títulos e emojis');
    console.log('   ✅ Listas HTML para características e FAQ');
    console.log('   ✅ HTML válido e pronto para aplicação');
    console.log('   ✅ Max tokens aumentado para 2500');

    console.log('\n📝 Estrutura HTML implementada:');
    console.log('   <div class="product-description">');
    console.log('     <div class="section apresentacao">');
    console.log('     <div class="section caracteristicas">');
    console.log('     <div class="section beneficios">');
    console.log('     <div class="section cuidados">');
    console.log('     <div class="section faq">');
    console.log('     <div class="section cta">');

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
updateAgent6HTMLOutput();
