import { useAuth } from '@/contexts/AuthContext';
import { ProjetoProviderPorConta } from '@/contexts/ProjetoContext';
import { MainLayout } from '@/components/MainLayout';

/** Public pages never need the editorial shell, project queries or its subscriptions. */
export default function AuthenticatedLayout() {
  const { user } = useAuth();
  return <ProjetoProviderPorConta userId={user?.id ?? null}><MainLayout /></ProjetoProviderPorConta>;
}
