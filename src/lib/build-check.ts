/**
 * Verifica se a aplicação está sendo executada durante o build do Next.js
 * e retorna uma resposta de erro se necessário
 */
export function checkBuildEnvironment() {
  // Verificar se estamos em um ambiente de build específico
  // Apenas bloquear se estivermos claramente em um processo de build
  
  const isBuildTime = 
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-development-build' ||
    process.env.BUILD_ID ||
    (process.env.NODE_ENV === 'production' && 
     !process.env.RUNTIME_ENV &&
     !process.env.VERCEL &&
     !process.env.RAILWAY_ENVIRONMENT &&
     !process.env.FLY_APP_NAME &&
     !process.env.HEROKU_APP_NAME &&
     !process.env.PORT);
    
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
