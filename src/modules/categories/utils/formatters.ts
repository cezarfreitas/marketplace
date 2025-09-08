export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  return value.toLocaleString('pt-BR');
};

export const formatBoolean = (value: boolean | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  return value ? 'Sim' : 'Não';
};

export const truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getCategoryStatusColor = (isActive: boolean): string => {
  return isActive 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
};

export const getCategoryStatusText = (isActive: boolean): string => {
  return isActive ? 'Ativa' : 'Inativa';
};

export const getChildrenStatusColor = (hasChildren: boolean): string => {
  return hasChildren 
    ? 'bg-blue-100 text-blue-800' 
    : 'bg-gray-100 text-gray-800';
};

export const getChildrenStatusText = (hasChildren: boolean): string => {
  return hasChildren ? 'Com filhos' : 'Sem filhos';
};
