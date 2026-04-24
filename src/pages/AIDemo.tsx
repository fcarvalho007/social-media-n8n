import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AICreditsBadge } from '@/components/ai/AICreditsBadge';
import { AIActionButton } from '@/components/ai/AIActionButton';
import { AIGeneratedField } from '@/components/ai/AIGeneratedField';
import { InsightBanner } from '@/components/ai/InsightBanner';
import { AI_CREDIT_COSTS } from '@/config/aiCreditCosts';
import { aiService } from '@/services/ai/aiService';

export default function AIDemo() {
  const [result, setResult] = useState('Texto de exemplo gerado pela infraestrutura de IA.');
  const [generatedAt, setGeneratedAt] = useState<string | null>(new Date().toISOString());
  const [edited, setEdited] = useState(false);

  const runExample = async () => {
    const response = await aiService.generateText({
      prompt: 'Escreve uma frase curta em pt-PT para validar a infraestrutura de IA.',
      systemPrompt: 'Responde apenas com uma frase curta em português de Portugal.',
      model: 'fast',
      feature: 'internal_ai_demo',
    });
    setResult(String(response));
    setGeneratedAt(new Date().toISOString());
    setEdited(false);
    toast.success('Chamada de IA concluída');
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal">
            <Sparkles className="h-6 w-6 text-primary" />
            Demo interna de IA
          </h1>
          <p className="text-sm text-muted-foreground">Validação dos padrões partilhados sem alterar fluxos de publicação.</p>
        </div>
        <AICreditsBadge />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ação de IA</CardTitle>
          <CardDescription>Executa uma chamada simples ao serviço central e regista o uso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AIActionButton
            icon={<Sparkles className="h-4 w-4" />}
            label="Testar geração"
            creditCost={AI_CREDIT_COSTS.text_generation_fast}
            onClick={runExample}
          />
          <AIGeneratedField generatedAt={generatedAt} edited={edited} onRegenerate={runExample}>
            <Textarea
              value={result}
              onChange={(event) => {
                setResult(event.target.value);
                setEdited(true);
              }}
              className="min-h-28 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </AIGeneratedField>
        </CardContent>
      </Card>

      <InsightBanner
        insight={{ id: 'demo', finding: 'Publicações com exemplos concretos tendem a ser mais claras para validação editorial.' }}
        onAccept={() => toast.success('Insight aceite')}
        onDismiss={() => toast('Insight dispensado')}
        onNeverShow={() => toast('Preferência registada')}
      />
    </div>
  );
}
