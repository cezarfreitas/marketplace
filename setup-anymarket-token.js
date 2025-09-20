const fs = require('fs');
const path = require('path');

console.log('🔑 Configuração do Token Anymarket');
console.log('=====================================');
console.log('');

// Verificar se arquivo .env existe
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env-config-example.txt');

console.log('📁 Verificando arquivos de configuração...');

if (fs.existsSync(envPath)) {
  console.log('✅ Arquivo .env encontrado');
  
  // Ler conteúdo atual
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('ANYMARKET=')) {
    console.log('✅ Variável ANYMARKET já configurada no .env');
    
    // Extrair token atual
    const anymarketLine = envContent.split('\n').find(line => line.startsWith('ANYMARKET='));
    if (anymarketLine) {
      const currentToken = anymarketLine.split('=')[1];
      if (currentToken && currentToken !== 'seu_token_anymarket_aqui') {
        console.log('🔑 Token atual configurado:', currentToken.substring(0, 10) + '...');
      } else {
        console.log('⚠️ Token não configurado (valor padrão)');
      }
    }
  } else {
    console.log('❌ Variável ANYMARKET não encontrada no .env');
  }
} else {
  console.log('❌ Arquivo .env não encontrado');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Copiando exemplo de configuração...');
    
    // Ler exemplo
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Criar .env baseado no exemplo
    fs.writeFileSync(envPath, exampleContent);
    console.log('✅ Arquivo .env criado baseado no exemplo');
  }
}

console.log('');
console.log('📝 Para configurar o token do Anymarket:');
console.log('1. Abra o arquivo .env');
console.log('2. Encontre a linha: ANYMARKET=seu_token_anymarket_aqui');
console.log('3. Substitua "seu_token_anymarket_aqui" pelo seu token real');
console.log('4. Salve o arquivo');
console.log('');
console.log('🔗 Para obter o token do Anymarket:');
console.log('- Acesse: https://api.anymarket.com.br/');
console.log('- Faça login na sua conta');
console.log('- Vá em "Configurações" > "API"');
console.log('- Copie o token de acesso');
console.log('');
console.log('⚠️ IMPORTANTE: O arquivo .env não deve ser commitado no Git!');
