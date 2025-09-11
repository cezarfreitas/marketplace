'use client';

import { useState } from 'react';
import { SimpleSkusModal } from '@/components/SimpleSkusModal';

export default function TestSkusPage() {
  const [showModal, setShowModal] = useState(false);
  const [productId, setProductId] = useState<number>(2000001); // VTEX ID de exemplo

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Teste do Modal de SKUs
          </h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VTEX ID do Produto
              </label>
              <input
                type="number"
                value={productId}
                onChange={(e) => setProductId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o VTEX ID do produto"
              />
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Abrir Modal de SKUs
            </button>
            
            <div className="text-sm text-gray-600">
              <p><strong>Produto selecionado:</strong> VTEX ID {productId}</p>
              <p><strong>API:</strong> /api/products/{productId}/skus</p>
            </div>
          </div>
        </div>
      </div>

      <SimpleSkusModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        productIds={[productId]}
      />
    </div>
  );
}
