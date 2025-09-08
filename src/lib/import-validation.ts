import { VTEXProduct } from './vtex-service';

/**
 * Valida se um produto da VTEX tem todos os campos obrigatórios
 */
export function validateVTEXProduct(product: VTEXProduct): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar campos obrigatórios
  if (!product.Id || product.Id === null || product.Id === undefined) {
    errors.push('vtex_id (Id) é obrigatório e não pode ser null');
  }

  if (!product.Name || product.Name.trim() === '') {
    errors.push('name (Name) é obrigatório e não pode estar vazio');
  }

  if (!product.RefId || product.RefId.trim() === '') {
    errors.push('ref_id (RefId) é obrigatório e não pode estar vazio');
  }

  // Verificar tipos de dados
  if (product.Id && typeof product.Id !== 'number') {
    errors.push('vtex_id (Id) deve ser um número');
  }

  if (product.DepartmentId && typeof product.DepartmentId !== 'number') {
    errors.push('department_id (DepartmentId) deve ser um número');
  }

  if (product.CategoryId && typeof product.CategoryId !== 'number') {
    errors.push('category_id (CategoryId) deve ser um número');
  }

  if (product.BrandId && typeof product.BrandId !== 'number') {
    errors.push('brand_id (BrandId) deve ser um número');
  }

  // Verificar valores booleanos
  if (product.IsVisible !== undefined && typeof product.IsVisible !== 'boolean') {
    errors.push('is_visible (IsVisible) deve ser um boolean');
  }

  if (product.IsActive !== undefined && typeof product.IsActive !== 'boolean') {
    errors.push('is_active (IsActive) deve ser um boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitiza os parâmetros para inserção no banco de dados
 */
export function sanitizeProductParams(product: VTEXProduct): any[] {
  return [
    product.Id || null,
    product.Name || null,
    product.DepartmentId || null,
    product.CategoryId || null,
    product.BrandId || null,
    product.LinkId || null,
    product.RefId || null,
    product.IsVisible !== undefined ? product.IsVisible : true,
    product.Description || null,
    product.DescriptionShort || null,
    product.ReleaseDate || null,
    product.KeyWords || null,
    product.Title || null,
    product.IsActive !== undefined ? product.IsActive : true,
    product.TaxCode || null,
    product.MetaTagDescription || null,
    product.SupplierId || null,
    product.ShowWithoutStock !== undefined ? product.ShowWithoutStock : true,
    product.AdWordsRemarketingCode || null,
    product.LomadeeCampaignCode || null,
    product.Score || 0,
    null, // CommercialConditionId não existe em VTEXProduct
    0, // RewardValue não existe em VTEXProduct
    null, // EstimatedDateArrival não existe em VTEXProduct
    'un', // MeasurementUnit não existe em VTEXProduct
    1, // UnitMultiplier não existe em VTEXProduct
    'vtex', // InformationSource não existe em VTEXProduct
    'default', // ModalType não existe em VTEXProduct
    'imported_from_vtex' // contexto
  ];
}

/**
 * Valida e sanitiza um produto antes da inserção
 */
export function validateAndSanitizeProduct(product: VTEXProduct): {
  isValid: boolean;
  errors: string[];
  sanitizedParams?: any[];
} {
  const validation = validateVTEXProduct(product);
  
  if (!validation.isValid) {
    return {
      isValid: false,
      errors: validation.errors
    };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedParams: sanitizeProductParams(product)
  };
}

/**
 * Log de erro de importação
 */
export function logImportError(refId: string, errors: string[], product?: VTEXProduct): void {
  console.error(`❌ Erro ao importar produto RefId ${refId}:`);
  errors.forEach(error => console.error(`  - ${error}`));
  
  if (product) {
    console.error('📦 Dados do produto recebidos:');
    console.error(`  - Id: ${product.Id}`);
    console.error(`  - Name: ${product.Name}`);
    console.error(`  - RefId: ${product.RefId}`);
    console.error(`  - BrandId: ${product.BrandId}`);
    console.error(`  - CategoryId: ${product.CategoryId}`);
  }
}
