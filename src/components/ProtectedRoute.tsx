'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from './LoginForm';

// Função para verificar se o token está expirado (client-side)
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true; // Se não conseguir decodificar, considerar expirado
  }
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar se está autenticado
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        const isAuth = localStorage.getItem('isAuthenticated');
        
        // console.log('🔍 Verificando autenticação:', { hasToken: !!token, isAuth });
        
        if (token && isAuth === 'true') {
          // Verificar se o token está expirado antes de fazer a requisição
          if (isTokenExpired(token)) {
            console.log('⏰ Token expirado, limpando dados de autenticação');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
            setIsAuthenticated(false);
            return;
          }

          try {
            // Verificar token no servidor
            const response = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (data.success) {
              // console.log('✅ Token válido, usuário autenticado');
              setIsAuthenticated(true);
            } else {
              // console.log('❌ Token inválido, removendo dados de autenticação');
              // Limpar dados inválidos
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
              localStorage.removeItem('isAuthenticated');
              setIsAuthenticated(false);
            }
          } catch (error) {
            // console.error('❌ Erro ao verificar token:', error);
            // Em caso de erro, limpar dados e assumir que não está autenticado
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
            setIsAuthenticated(false);
          }
        } else {
          // console.log('❌ Sem token ou não autenticado');
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listener para mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === 'isAuthenticated' || e.key === 'user') {
        // console.log('🔄 Mudança detectada no localStorage, re-verificando autenticação...');
        checkAuth();
      }
    };

    // Listener para mudanças no localStorage (mesmo tab)
    const handleCustomStorageChange = () => {
      // console.log('🔄 Mudança customizada detectada no localStorage, re-verificando autenticação...');
      checkAuth();
    };

    // Adicionar listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange);
    };
  }, []);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verificando acesso...
          </h2>
          <p className="text-gray-600">
            Aguarde enquanto verificamos suas credenciais
          </p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar formulário de login
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Se estiver autenticado, mostrar o conteúdo protegido
  return <>{children}</>;
}
