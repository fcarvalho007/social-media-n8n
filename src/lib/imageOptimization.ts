/**
 * Valida e garante que a URL é HTTPS para evitar avisos de segurança
 * @param url - URL a validar
 * @returns URL segura (HTTPS) ou placeholder se inválida
 */
export const ensureHttpsUrl = (url: string): string => {
  if (!url) return url;
  
  try {
    // Se a URL começa com //, adiciona https:
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    // Se a URL começa com http://, substitui por https://
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    
    // Valida se é uma URL válida
    const urlObj = new URL(url);
    
    // Se não for HTTPS, força HTTPS
    if (urlObj.protocol !== 'https:') {
      urlObj.protocol = 'https:';
      return urlObj.toString();
    }
    
    return url;
  } catch (error) {
    console.warn('URL inválida detectada:', url);
    // Retorna URL original se houver erro (pode ser URL relativa válida)
    return url;
  }
};

/**
 * Otimiza URLs de imagens do Supabase Storage adicionando parâmetros de transformação
 * e garante que todas as URLs são HTTPS
 * @param url - URL da imagem original
 * @param width - Largura desejada em pixels (padrão: 800)
 * @param quality - Qualidade da imagem 1-100 (padrão: 75)
 * @returns URL otimizada e segura
 */
export const getOptimizedImageUrl = (
  url: string, 
  width: number = 800, 
  quality: number = 75
): string => {
  // Garante que a URL é HTTPS primeiro
  const secureUrl = ensureHttpsUrl(url);
  
  // Retorna URL segura se não for do Supabase Storage
  if (!secureUrl || !secureUrl.includes('supabase.co/storage')) {
    return secureUrl;
  }
  
  // Adiciona parâmetros de transformação
  const separator = secureUrl.includes('?') ? '&' : '?';
  return `${secureUrl}${separator}width=${width}&quality=${quality}`;
};
