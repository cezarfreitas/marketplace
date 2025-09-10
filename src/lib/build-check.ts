/**
 * Verifica se a aplicação está sendo executada durante o build do Next.js
 * e retorna uma resposta de erro se necessário
 */
export function checkBuildEnvironment() {
  // Durante o build do Next.js, algumas variáveis de ambiente podem não estar disponíveis
  // Verificamos múltiplas condições para garantir que não executemos durante o build
  
  const isBuildTime = 
    process.env.NODE_ENV === 'production' && 
    !process.env.RUNTIME_ENV &&
    !process.env.VERCEL &&
    !process.env.RAILWAY_ENVIRONMENT &&
    !process.env.FLY_APP_NAME &&
    !process.env.HEROKU_APP_NAME;
    
  return isBuildTime;
}

/**
 * Retorna uma resposta de erro padrão para APIs durante o build
 */
export function getBuildErrorResponse() {
  return new Response(
    JSON.stringify({ 
      error: 'API não disponível durante build',
      message: 'Esta API não pode ser executada durante o processo de build'
    }), 
    { 
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}
