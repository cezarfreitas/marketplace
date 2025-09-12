const fs = require('fs');
const path = require('path');

function checkEnvConfig() {
  console.log('🔍 Verificando configuração do ambiente...\n');
  
  // Verificar se o arquivo .env existe
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env não encontrado');
    console.log('💡 Crie um arquivo .env baseado no env.example');
    return false;
  }
  
  console.log('✅ Arquivo .env encontrado');
  
  // Ler o arquivo .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'VTEX_APP_KEY',
    'VTEX_APP_TOKEN'
  ];
  
  console.log('\n📋 Verificando variáveis obrigatórias:');
  
  let allConfigured = true;
  
  requiredVars.forEach(varName => {
    const line = envLines.find(line => line.startsWith(`${varName}=`));
    if (!line) {
      console.log(`❌ ${varName}: Não definida`);
      allConfigured = false;
    } else {
      const value = line.split('=')[1];
      if (value.includes('your-') || value.includes('here') || value.trim() === '') {
        console.log(`⚠️ ${varName}: Valor placeholder detectado`);
        allConfigured = false;
      } else {
        console.log(`✅ ${varName}: Configurada`);
      }
    }
  });
  
  console.log('\n📊 Status da configuração:');
  if (allConfigured) {
    console.log('🎉 Todas as variáveis estão configuradas corretamente!');
  } else {
    console.log('⚠️ Algumas variáveis precisam ser configuradas');
    console.log('\n💡 Para configurar a API key da OpenAI:');
    console.log('1. Acesse: https://platform.openai.com/account/api-keys');
    console.log('2. Crie uma nova API key');
    console.log('3. Adicione no arquivo .env: OPENAI_API_KEY=sua-api-key-aqui');
    console.log('\n💡 Para configurar o banco de dados:');
    console.log('1. Verifique as credenciais do MySQL');
    console.log('2. Atualize DB_HOST, DB_USER, DB_PASSWORD, DB_NAME no .env');
  }
  
  return allConfigured;
}

// Executar se chamado diretamente
if (require.main === module) {
  const isConfigured = checkEnvConfig();
  process.exit(isConfigured ? 0 : 1);
}

module.exports = { checkEnvConfig };
