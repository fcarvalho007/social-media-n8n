import { TemplateManager } from '@/components/projects/TemplateManager';

export default function Templates() {
  return <div className="hub-page">
    <header className="flex flex-col gap-2"><h1 className="text-3xl font-semibold tracking-tight">Modelos de projeto</h1><p className="max-w-prose text-sm text-muted-foreground">Cria modelos reutilizáveis a partir dos teus projetos.</p></header>
    <TemplateManager />
  </div>;
}
