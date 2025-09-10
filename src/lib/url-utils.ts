/**
 * Função para detectar automaticamente a URL base do servidor
 * Funciona tanto em desenvolvimento quanto em produção
 */
export function getBaseUrl(request?: Request): string {
  // Se estivermos no servidor (SSR/API routes)
  if (typeof window === 'undefined') {
    // Tentar pegar do header Host
    if (request) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      
      if (host) {
        // Se for localhost, usar http, senão usar o protocolo detectado
        const finalProtocol = host.includes('localhost') ? 'http' : protocol;
        return `${finalProtocol}://${host}`;
      }
    }
    
    // Fallback para variável de ambiente
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    
    // Fallback para URL padrão
    return 'https://b2b-seo.jzo3qo.easypanel.host';
  }
  
  // Se estivermos no cliente (browser)
  return window.location.origin;
}

/**
 * Função para gerar URL pública de arquivo
 */
export function getPublicFileUrl(fileName: string, request?: Request): string {
  const baseUrl = getBaseUrl(request);
  return `${baseUrl}/uploads/crop-images/${fileName}`;
}
