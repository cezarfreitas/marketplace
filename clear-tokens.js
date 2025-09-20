// Script para limpar tokens expirados do localStorage
// Execute este script no console do navegador (F12)

console.log('🧹 Limpando tokens expirados...');

// Verificar se há tokens no localStorage
const token = localStorage.getItem('authToken');
const user = localStorage.getItem('user');
const isAuth = localStorage.getItem('isAuthenticated');

if (token) {
  try {
    // Decodificar o token para verificar expiração
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;
    
    if (isExpired) {
      console.log('⏰ Token expirado em:', new Date(payload.exp * 1000));
      console.log('🧹 Removendo dados de autenticação...');
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      
      console.log('✅ Dados de autenticação removidos com sucesso!');
      console.log('🔄 Recarregando a página...');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      console.log('✅ Token ainda válido, expira em:', new Date(payload.exp * 1000));
    }
  } catch (error) {
    console.log('❌ Erro ao decodificar token:', error);
    console.log('🧹 Removendo dados de autenticação...');
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    
    console.log('✅ Dados de autenticação removidos com sucesso!');
    console.log('🔄 Recarregando a página...');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
} else {
  console.log('ℹ️ Nenhum token encontrado no localStorage');
}

console.log('📋 Estado atual do localStorage:');
console.log('- authToken:', !!localStorage.getItem('authToken'));
console.log('- user:', !!localStorage.getItem('user'));
console.log('- isAuthenticated:', localStorage.getItem('isAuthenticated'));
