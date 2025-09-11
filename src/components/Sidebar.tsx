'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Upload, 
  Settings, 
  Package, 
  Tag,
  X,
  LogOut,
  FolderOpen,
  FileSpreadsheet,
  BarChart3,
  Brain,
  List
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    console.log('🚪 Iniciando logout...');
    
    try {
      // Chamar API de logout
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Logout realizado com sucesso no servidor');
      } else {
        console.log('⚠️ Erro no logout do servidor, mas continuando...');
      }
    } catch (error) {
      console.error('❌ Erro ao chamar API de logout:', error);
      // Continuar com o logout local mesmo se a API falhar
    }
    
    // Limpar dados de autenticação do localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    
    console.log('✅ Dados de autenticação removidos do localStorage');
    
    // Disparar evento customizado para notificar mudança no localStorage
    window.dispatchEvent(new Event('customStorageChange'));
    
    // Redirecionar para login
    router.push('/');
    
    console.log('🔄 Redirecionando para página de login...');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Importar', href: '/import', icon: Upload },
    { name: 'Produtos', href: '/products', icon: Package },
    { name: 'Marcas', href: '/brands', icon: Tag },
    { name: 'Categorias', href: '/categories', icon: FolderOpen },
    { name: 'Características', href: '/caracteristicas', icon: List },
    { name: 'Anymarket', href: '/anymarket', icon: FileSpreadsheet },
    { name: 'Configurações', href: '/settings', icon: Settings },
    { name: 'Sair do Sistema', href: '#', icon: LogOut, isLogout: true },
  ];

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0 lg:z-auto lg:shadow-none lg:w-64
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">IA Generator SEO</h1>
                  <p className="text-xs text-gray-600">
                    AI-Powered E-commerce
                  </p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>


          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              
              // Se for o botão de logout, renderizar como button
              if (item.isLogout) {
                return (
                  <button
                    key={item.name}
                    onClick={handleLogout}
                    className="flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full text-left"
                    title="Sair do sistema"
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </button>
                );
              }
              
              // Para os outros itens, renderizar como Link
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => {
                    // Fechar sidebar no mobile após clicar
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive(item.href) ? 'text-primary-500' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
