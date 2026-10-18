import {BACKEND_NUVEM} from '@/lib/backendHub';
export const SEO_LOCAL = import.meta.env.DEV && import.meta.env.MODE === 'hub';
export const SEO_DISPONIVEL = SEO_LOCAL || BACKEND_NUVEM;
