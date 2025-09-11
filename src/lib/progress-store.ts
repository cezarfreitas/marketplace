/**
 * Armazenamento de progresso em memória
 * Em produção, isso deveria ser um Redis ou banco de dados
 */

interface ProgressData {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message: string;
  startTime: number;
  endTime?: number;
  totalItems: number;
  completedItems: number;
  currentItem?: string;
  results?: any[];
  errors?: string[];
}

class ProgressStore {
  private progress: Map<string, ProgressData> = new Map();

  createProgress(id: string, totalItems: number): void {
    this.progress.set(id, {
      id,
      status: 'pending',
      progress: 0,
      message: 'Iniciando importação...',
      startTime: Date.now(),
      totalItems,
      completedItems: 0,
      results: [],
      errors: []
    });
  }

  updateProgress(
    id: string, 
    status: ProgressData['status'], 
    progress: number, 
    message: string,
    currentItem?: string
  ): void {
    const existing = this.progress.get(id);
    if (existing) {
      existing.status = status;
      existing.progress = progress;
      existing.message = message;
      existing.currentItem = currentItem;
      
      if (status === 'completed' || status === 'error') {
        existing.endTime = Date.now();
      }
      
      this.progress.set(id, existing);
    }
  }

  incrementProgress(id: string, message: string, currentItem?: string): void {
    const existing = this.progress.get(id);
    if (existing) {
      existing.completedItems++;
      existing.progress = Math.round((existing.completedItems / existing.totalItems) * 100);
      existing.message = message;
      existing.currentItem = currentItem;
      
      this.progress.set(id, existing);
    }
  }

  addResult(id: string, result: any): void {
    const existing = this.progress.get(id);
    if (existing) {
      if (!existing.results) existing.results = [];
      existing.results.push(result);
      this.progress.set(id, existing);
    }
  }

  addError(id: string, error: string): void {
    const existing = this.progress.get(id);
    if (existing) {
      if (!existing.errors) existing.errors = [];
      existing.errors.push(error);
      this.progress.set(id, existing);
    }
  }

  getProgress(id: string): ProgressData | null {
    return this.progress.get(id) || null;
  }

  deleteProgress(id: string): void {
    this.progress.delete(id);
  }

  // Limpar progressos antigos (mais de 1 hora)
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.progress.forEach((progress, id) => {
      if (progress.startTime < oneHourAgo) {
        this.progress.delete(id);
      }
    });
  }
}

// Instância singleton
export const progressStore = new ProgressStore();

// Limpar progressos antigos a cada 30 minutos
setInterval(() => {
  progressStore.cleanup();
}, 30 * 60 * 1000);
