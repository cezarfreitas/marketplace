import { ImportProgress as ImportProgressType } from '@/hooks/useImportState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ImportProgressProps {
  progress: ImportProgressType;
}

export const ImportProgress = ({ progress }: ImportProgressProps) => {
  
  // Sempre renderizar, mas de forma mais sutil quando idle
  if (progress.status === 'idle') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-4 opacity-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full mr-3 bg-gray-400"></div>
            <span className="font-medium text-gray-500">Aguardando importação...</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-gray-500">0%</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-3">
          <div className="h-2 rounded-full bg-gray-300" style={{ width: '0%' }} />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>Total: <strong>0</strong></span>
            <span>Sucessos: <strong>0</strong></span>
            <span>Erros: <strong>0</strong></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      {/* Barra de Progresso Compacta */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-3 ${
            progress.status === 'running' ? 'bg-green-500 animate-pulse' :
            progress.status === 'completed' ? 'bg-green-500' :
            progress.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
          }`}></div>
          <span className="font-medium text-gray-900">{progress.message}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-gray-900">{progress.progress}%</span>
        </div>
      </div>
      
      {/* Barra de Progresso */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-out ${
            progress.status === 'error' ? 'bg-red-500' :
            progress.status === 'completed' ? 'bg-green-500' : 
            'bg-blue-500'
          }`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      {/* Estatísticas Compactas */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>Total: <strong>{progress.totalProducts}</strong></span>
          <span>Sucessos: <strong className="text-green-600">{progress.successCount}</strong></span>
          <span>Erros: <strong className="text-red-600">{progress.errorCount}</strong></span>
        </div>
      </div>

      {/* Erros Recentes */}
      {progress.errors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">
            <strong>Último erro:</strong> {progress.errors[progress.errors.length - 1]}
          </div>
        </div>
      )}
    </div>
  );
};
