import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateManager } from '@/components/projects/TemplateManager';
import { FileText } from 'lucide-react';

export default function Templates() {
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <CardTitle>Templates de Projetos</CardTitle>
                <CardDescription>
                  Crie templates reutilizáveis a partir dos seus projetos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TemplateManager />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
