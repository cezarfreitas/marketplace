import { useEffect, useState } from 'react';
import { Layers, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Batch {
  id: number;
  name: string;
  description: string;
  status: string;
  actual_product_count: number;
}

interface BatchSelectorProps {
  selectedBatchId: number | null;
  onBatchChange: (batchId: number | null) => void;
}

export const BatchSelector = ({ selectedBatchId, onBatchChange }: BatchSelectorProps) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDescription, setNewBatchDescription] = useState('');

  // Buscar lotes ativos
  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches?status=active&limit=1000');
      const data = await response.json();

      if (data.success) {
        setBatches(data.data.batches);
      }
    } catch (error) {
      console.error('Erro ao buscar lotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Criar novo lote
  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) {
      alert('Nome do lote é obrigatório');
      return;
    }

    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBatchName,
          description: newBatchDescription,
          status: 'active'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Lote criado com sucesso!');
        setShowCreateModal(false);
        setNewBatchName('');
        setNewBatchDescription('');
        await fetchBatches(); // Atualizar lista
        onBatchChange(data.data.id); // Selecionar o novo lote
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      alert('❌ Erro ao criar lote');
    }
  };

  return (
    <div className="bg-white hover:shadow-lg transition-shadow rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center mb-3">
        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
          <Layers className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Lote de Importação</h2>
      </div>

      {/* Seletor e Botão em uma linha */}
      {loading ? (
        <div className="text-sm text-gray-500">Carregando...</div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Select de Lote */}
          <select
            value={selectedBatchId || ''}
            onChange={(e) => onBatchChange(e.target.value ? parseInt(e.target.value) : null)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Sem Lote</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name} ({batch.actual_product_count} produtos)
              </option>
            ))}
          </select>

          {/* Botão Criar Novo */}
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            size="sm"
            className="border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 h-9 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Criar Novo
          </Button>
        </div>
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-blue-600" />
              Criar Novo Lote
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Lote *
                </label>
                <Input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="Ex: Importação Janeiro 2025"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={newBatchDescription}
                  onChange={(e) => setNewBatchDescription(e.target.value)}
                  placeholder="Descrição do lote..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleCreateBatch}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Lote
              </Button>
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBatchName('');
                  setNewBatchDescription('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

