/**
 * Obtém a URL base da API para requisições internas
 * Funciona tanto em desenvolvimento quanto em produção
 */
export function getApiBaseUrl(): string {
  // Em produção, usar a variável de ambiente
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://b2b-seo.jzo3qo.easypanel.host';
  }
  
  // Em desenvolvimento, usar IPv4 explicitamente
  return 'http://127.0.0.1:3000';
}

/**
 * Obtém a URL base a partir do request (método mais confiável)
 * @param request - NextRequest object
 */
export function getApiBaseUrlFromRequest(request: Request): string {
  // Tentar obter do header host
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  // Fallback para a função padrão
  return getApiBaseUrl();
}

