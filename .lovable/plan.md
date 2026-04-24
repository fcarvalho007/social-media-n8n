Plano — Prompt 3: Funções de IA pontuais

Objetivo: adicionar ações de IA independentes no fluxo `/manual-create`, reutilizando a infraestrutura atual (`aiService`, créditos, preferências de IA, transcrição guardada e indicadores de campo gerado), sem criar dependências novas e mantendo PT-PT.

Nota de auditoria prévia:
- A infraestrutura de IA já existe e cobra créditos através da função `ai-core`.
- `posts.raw_transcription` já é guardado, mas atualmente a transcrição não guarda `segments` com timestamps; por isso, para SRT real será preciso ajustar a transcrição para devolver e persistir segmentos daqui para a frente. Para rascunhos antigos sem segmentos, o SRT só poderá ser gerado depois de nova transcrição com timestamps.
- O alt text atual é único para todo o post; o prompt pede alt text por média. Será necessário migrar o estado para um mapa por item de média sem quebrar o campo antigo.
- `LOCKED_FILES.md` não bloqueia os ficheiros funcionais a editar. Não vou editar `src/integrations/supabase/client.ts`, `types.ts`, `.env` nem chaves de projeto em `supabase/config.toml`.

1. Reescrita por tom na legenda
- Substituir o painel atual de reescrita com select/modal por uma barra horizontal compacta acima do editor de legenda.
- Botões com `AIActionButton`: Direto, Emocional, Técnico, Curto, Longo, Tom LinkedIn, Tom Instagram.
- Cada clique:
  - guarda a versão atual numa stack em memória com máximo de 5 estados;
  - chama `aiService.generateText` com modelo `fast`, custo 1 crédito e prompt server-safe via `ai-core`;
  - substitui diretamente a legenda ativa;
  - mostra toast: “Legenda reescrita. Usa Ctrl+Z para reverter.”;
  - ativa botão “Reverter”.
- Suportar Ctrl+Z/Cmd+Z para reverter apenas quando a última ação foi uma reescrita de IA, sem impedir o undo normal do browser em texto manual.
- Em modo “legendas separadas”, aplicar a reescrita à rede ativa; caso contrário, aplicar à legenda unificada.

2. Primeiro comentário com IA
- Adicionar um botão pequeno de IA no canto superior direito de cada textarea de “Primeiro comentário” em `NetworkOptionsCard`.
- Ao clicar:
  - cobra 1 crédito;
  - chama `aiService.generateText` com `responseFormat: 'json'`, modelo `fast` e instruções PT-PT;
  - devolve 3 opções: pergunta, CTA + link, complemento;
  - mostra modal com 3 cards compactos e botão “Usar esta”.
- Ao selecionar uma opção, preencher o primeiro comentário da rede correspondente e marcar o campo como gerado por IA.
- Validar fallback se o JSON vier malformado ou incompleto: mostrar erro amigável, sem preencher campo com texto inválido.

3. Alt text automático por média
- Evoluir de `altText: string` para `altTexts: Record<string, string>` indexado por posição/ID estável da média.
- Atualizar a UI da secção “Média” para mostrar, abaixo de cada preview, um campo “Alt text”, contador `x/125`, indicador `AIGeneratedField`, botão “Gerar alt text” ou “Regenerar” e opção “Aplicar a todas as imagens” quando aplicável.
- Se a preferência “Gerar alt text automaticamente” estiver ativa:
  - após upload/adicionar média, gerar alt text em background para imagens;
  - para vídeos, extrair primeiro frame localmente e enviar esse frame para análise visual;
  - preencher automaticamente e marcar como gerado.
- Se a preferência estiver desativada:
  - campo vazio;
  - botão “Gerar alt text” com custo 2 créditos.
- Garantir máximo de 125 caracteres no resultado usado; se a IA devolver mais, truncar com segurança e avisar discretamente no contador.

4. Ferramentas avançadas de vídeo
- Adicionar botão/menu “Ferramentas” no painel da secção “Média” quando existir vídeo.
- Implementar:
  - “Gerar ficheiro SRT”: requer transcrição com segmentos. Custo 0 créditos quando segmentos existem. Gera e descarrega `.srt` localmente no browser.
  - Se não houver transcrição/segmentos: mostrar ação para gerar transcrição com timestamps antes do SRT. Esta ação cobra a transcrição conforme já definido no sistema.
  - “Gerar capítulos”: apenas para vídeos com mais de 2 minutos. Custo 2 créditos. Usa transcrição + timestamps, devolve formato compatível com YouTube e mostra modal com copiar para clipboard.
  - “Extrair frases”: custo 1 crédito. Usa transcrição, devolve 3–5 frases citáveis com timestamp e modal para copiar.
- Ajustar a transcrição em `ai-core` para pedir `verbose_json` e guardar segmentos em `ai_metadata.transcription_segments`, mantendo `posts.raw_transcription` como texto simples para compatibilidade.

5. Persistência e compatibilidade
- Guardar novos metadados em `ai_metadata`:
  - `generated_fields` por campo/rede/média;
  - `transcription_segments` para SRT/capítulos/frases;
  - histórico de ações pontuais apenas como metadados leves, sem persistir stack de undo.
- Atualizar recuperação de rascunhos para restaurar:
  - alt texts por média quando existirem;
  - indicadores de IA gerada;
  - segmentos de transcrição quando disponíveis.
- Manter compatibilidade com rascunhos antigos que só têm `alt_text` único e `raw_transcription` em texto.

6. Detalhes técnicos
- Frontend:
  - criar componentes pequenos em `src/components/manual-post/ai/` para barra de tons, modal de comentários e ferramentas de vídeo;
  - refinar `Step2MediaCard`, `Step3CaptionCard`, `NetworkOptionsCard` e `ManualCreate.tsx`;
  - usar `sonner` para toasts;
  - usar tokens/classes existentes, sem cores hardcoded fora do sistema.
- IA/backend:
  - reutilizar `aiService.generateText` e `aiService.analyzeImage`;
  - adicionar helpers no serviço para primeiro comentário, capítulos, frases e, se necessário, transcrição com segmentos;
  - manter chamadas à IA sempre através da função backend, nunca no cliente;
  - mapear custos: reescrita 1, primeiro comentário 1, alt text 2, SRT 0 quando já transcrito, capítulos 2, frases 1.

7. Testes/checkpoint
☐ Reescrita por tom preserva factos e muda apenas estilo.
☐ Ctrl+Z/Cmd+Z e botão “Reverter” recuperam a versão anterior.
☐ Primeiro comentário devolve 3 opções distintas e preenche a rede correta.
☐ Alt text por média respeita 125 caracteres e preferência automática.
☐ Vídeo usa primeiro frame para alt text quando necessário.
☐ SRT descarregado usa formato `.srt` válido quando há segmentos.
☐ Capítulos seguem formato oficial do YouTube.
☐ Frases citáveis incluem timestamp.
☐ Cada ação consome o custo correto de créditos.
☐ UI e mensagens ficam em PT-PT, sem pt-BR.
☐ Build passa sem erros.