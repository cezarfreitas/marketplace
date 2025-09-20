/**
 * Rate Limiter para controlar requisições por minuto
 * Limite: 200 requisições por minuto por IP
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests = 200; // 200 requisições por minuto
  private readonly windowMs = 60 * 1000; // 1 minuto em milissegundos

  /**
   * Verificar se a requisição está dentro do limite
   * @param ip - Endereço IP do cliente
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(ip);

    // Se não existe entrada ou a janela de tempo expirou
    if (!entry || now > entry.resetTime) {
      // Criar nova entrada
      this.requests.set(ip, {
        count: 1,
        resetTime: now + this.windowMs
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    // Se ainda está dentro da janela de tempo
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Incrementar contador
    entry.count++;
    this.requests.set(ip, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Limpar entradas expiradas (chamada periódica)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of Array.from(this.requests.entries())) {
      if (now > entry.resetTime) {
        this.requests.delete(ip);
      }
    }
  }

  /**
   * Obter estatísticas de rate limiting
   */
  getStats(): { totalIPs: number; activeIPs: number } {
    const now = Date.now();
    let activeIPs = 0;

    for (const entry of Array.from(this.requests.values())) {
      if (now <= entry.resetTime) {
        activeIPs++;
      }
    }

    return {
      totalIPs: this.requests.size,
      activeIPs
    };
  }
}

// Instância singleton do rate limiter
export const rateLimiter = new RateLimiter();

// Limpeza automática a cada 5 minutos
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

/**
 * Middleware para aplicar rate limiting em rotas da API
 */
export function withRateLimit(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    // Extrair IP do cliente
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIP = forwarded?.split(',')[0] || realIp || 'unknown';

    // Verificar rate limit
    const rateLimitResult = rateLimiter.check(clientIP);

    if (!rateLimitResult.allowed) {
      const resetTimeSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      
      return new Response(
        JSON.stringify({
          error: 'Rate limit excedido',
          message: `Máximo de ${rateLimiter['maxRequests']} requisições por minuto. Tente novamente em ${resetTimeSeconds} segundos.`,
          retryAfter: resetTimeSeconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
            'Retry-After': resetTimeSeconds.toString()
          }
        }
      );
    }

    // Adicionar headers de rate limiting na resposta
    const response = await handler(request, ...args);
    
    if (response instanceof Response) {
      response.headers.set('X-RateLimit-Limit', rateLimiter['maxRequests'].toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
    }

    return response;
  };
}

/**
 * Função utilitária para verificar rate limit em rotas Next.js
 */
export function checkRateLimit(request: Request): { allowed: boolean; headers: Record<string, string> } {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIP = forwarded?.split(',')[0] || realIp || 'unknown';

  const rateLimitResult = rateLimiter.check(clientIP);

  const headers = {
    'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
  };

  return {
    allowed: rateLimitResult.allowed,
    headers
  };
}
