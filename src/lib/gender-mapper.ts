/**
 * Identifica o gênero a partir do título do produto em português
 * e retorna o valor correspondente para a API do Anymarket
 * 
 * Valores permitidos: MALE, FEMALE, BOY, GIRL, UNISSEX, BABIES, CHILDISH_UNISSEX
 */
export function detectGenderFromTitle(title: string): string {
  if (!title) return 'UNISSEX';
  
  const titleLower = title.toLowerCase().trim();
  
  // Padrões para BABIES (Bebês)
  const babiesPatterns = [
    /\bbeb[eê]/,
    /\binfant/,
    /\brec[eé]m.nascido/,
    /\bnewborn/,
    /\b0.*(a|à|ate).*(12|18|24).*(mes|month)/,
    /\b0.*(a|à|ate).*(1|2).*(ano|year)/
  ];
  
  if (babiesPatterns.some(pattern => pattern.test(titleLower))) {
    return 'BABIES';
  }
  
  // Padrões para BOY (Menino)
  const boyPatterns = [
    /\bmenino/,
    /\bgaroto/,
    /\binfantil.*masculin/,
    /\bmasculin.*infantil/,
    /\bboy/,
    /\bkids.*boy/,
    /\bjuvenil.*masculin/,
    /\bmasculin.*juvenil/
  ];
  
  if (boyPatterns.some(pattern => pattern.test(titleLower))) {
    return 'BOY';
  }
  
  // Padrões para GIRL (Menina)
  const girlPatterns = [
    /\bmenina/,
    /\bgarota/,
    /\binfantil.*feminin/,
    /\bfeminin.*infantil/,
    /\bgirl/,
    /\bkids.*girl/,
    /\bjuvenil.*feminin/,
    /\bfeminin.*juvenil/
  ];
  
  if (girlPatterns.some(pattern => pattern.test(titleLower))) {
    return 'GIRL';
  }
  
  // Padrões para CHILDISH_UNISSEX (Infantil Unissex)
  const childishUnissexPatterns = [
    /\binfantil.*unissex/,
    /\bunissex.*infantil/,
    /\bkids.*unissex/,
    /\bunissex.*kids/,
    /\bcrian[cç]a/,
    /\binfantil(?!.*masculin)(?!.*feminin)/
  ];
  
  if (childishUnissexPatterns.some(pattern => pattern.test(titleLower))) {
    return 'CHILDISH_UNISSEX';
  }
  
  // Padrões para MALE (Masculino)
  const malePatterns = [
    /\bmasculin/,
    /\bhomem/,
    /\bmale/,
    /\bmen/,
    /\bsenhor/,
    /\bcavalheiro/,
    /\bradical.*masc/,
    /\bboy(?!.*kid)/
  ];
  
  if (malePatterns.some(pattern => pattern.test(titleLower))) {
    return 'MALE';
  }
  
  // Padrões para FEMALE (Feminino)
  const femalePatterns = [
    /\bfeminin/,
    /\bmulher/,
    /\bfemale/,
    /\bwomen/,
    /\bsenhora/,
    /\bdama/,
    /\bradical.*fem/,
    /\bgirl(?!.*kid)/
  ];
  
  if (femalePatterns.some(pattern => pattern.test(titleLower))) {
    return 'FEMALE';
  }
  
  // Padrões para UNISSEX
  const unissexPatterns = [
    /\bunissex/,
    /\bunisex/,
    /\bunissx/,
    /\bunissex/
  ];
  
  if (unissexPatterns.some(pattern => pattern.test(titleLower))) {
    return 'UNISSEX';
  }
  
  // Se não encontrar nenhum padrão, retorna UNISSEX como padrão
  return 'UNISSEX';
}

/**
 * Detecta gênero com fallback: tenta primeiro o título, depois as características
 */
export function detectGenderWithFallback(
  title: string, 
  characteristicValue?: string
): string {
  // Primeiro tenta detectar pelo título
  const genderFromTitle = detectGenderFromTitle(title);
  
  // Se encontrou algo além de UNISSEX no título, usa ele
  if (genderFromTitle !== 'UNISSEX') {
    console.log(`✅ Gênero detectado pelo título: ${genderFromTitle}`);
    return genderFromTitle;
  }
  
  // Se não encontrou no título, tenta pelas características
  if (characteristicValue) {
    const charLower = characteristicValue.toLowerCase();
    
    if (charLower.includes('bebê') || charLower.includes('bebe')) {
      console.log(`✅ Gênero detectado pelas características: BABIES`);
      return 'BABIES';
    }
    if (charLower.includes('menino') || charLower.includes('boy')) {
      console.log(`✅ Gênero detectado pelas características: BOY`);
      return 'BOY';
    }
    if (charLower.includes('menina') || charLower.includes('girl')) {
      console.log(`✅ Gênero detectado pelas características: GIRL`);
      return 'GIRL';
    }
    if (charLower.includes('infantil') && charLower.includes('unissex')) {
      console.log(`✅ Gênero detectado pelas características: CHILDISH_UNISSEX`);
      return 'CHILDISH_UNISSEX';
    }
    if (charLower.includes('masculino') || charLower.includes('male') || charLower.includes('homem')) {
      console.log(`✅ Gênero detectado pelas características: MALE`);
      return 'MALE';
    }
    if (charLower.includes('feminino') || charLower.includes('female') || charLower.includes('mulher')) {
      console.log(`✅ Gênero detectado pelas características: FEMALE`);
      return 'FEMALE';
    }
    if (charLower.includes('unissex') || charLower.includes('unisex')) {
      console.log(`✅ Gênero detectado pelas características: UNISSEX`);
      return 'UNISSEX';
    }
  }
  
  // Se não encontrou em nenhum lugar, usa UNISSEX como padrão
  console.log(`⚠️ Gênero não detectado, usando padrão: UNISSEX`);
  return 'UNISSEX';
}

