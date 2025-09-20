import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';

export function middleware(request: NextRequest) {
  // Aplicar rate limiting apenas em rotas da API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitCheck = checkRateLimit(request);
    
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit excedido',
          message: 'Máximo de 200 requisições por minuto. Aguarde antes de tentar novamente.',
          retryAfter: 60
        },
        { 
          status: 429,
          headers: {
            ...rateLimitCheck.headers,
            'Retry-After': '60'
          }
        }
      );
    }

    // Adicionar headers de rate limit em todas as respostas da API
    const response = NextResponse.next();
    
    Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  return NextResponse.next();
}

// Configurar quais rotas devem usar o middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
