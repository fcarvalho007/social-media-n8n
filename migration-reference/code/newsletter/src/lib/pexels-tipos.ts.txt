// Tipo partilhado das fotografias do Pexels (client-safe).

export interface FotoPexels {
  id: number;
  previewUrl: string;
  originalUrl: string;
  alt: string;
  autor: string;
  autorUrl: string;
  largura: number;
  altura: number;
}
