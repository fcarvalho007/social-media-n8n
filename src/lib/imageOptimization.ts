/**
 * Otimiza URLs de imagens do Supabase Storage adicionando parâmetros de transformação
 * @param url - URL da imagem original
 * @param width - Largura desejada em pixels (padrão: 800)
 * @param quality - Qualidade da imagem 1-100 (padrão: 75)
 * @returns URL otimizada ou URL original se não for do Supabase
 */
export const getOptimizedImageUrl = (
  url: string, 
  width: number = 800, 
  quality: number = 75
): string => {
  // Retorna URL original se não for do Supabase Storage
  if (!url || !url.includes('supabase.co/storage')) {
    return url;
  }
  
  // Adiciona parâmetros de transformação
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${width}&quality=${quality}`;
};
