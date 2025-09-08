'use client';

import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-center">
          <p className="text-sm text-gray-500 flex items-center">
            Feito com <Heart className="w-4 h-4 mx-1 text-red-500 animate-pulse" /> por IDE | Negócios Digitais
          </p>
        </div>
      </div>
    </footer>
  );
}
