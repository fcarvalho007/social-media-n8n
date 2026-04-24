## Plano — Prompt 2: redesenho visual de `/manual-create`

Objetivo: redesenhar a experiência visual do fluxo manual sem alterar regras de negócio, validações, publicação, créditos, IA ou persistência. O foco fica em layout, hierarquia visual, responsividade, dark mode e consistência pt-PT.

## Observações antes de implementar

- `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env` e chaves de projeto em `supabase/config.toml` estão bloqueados e não serão editados.
- O pedido exige mexer em vários componentes de `/manual-create`, por isso a implementação será faseada.
- Há uma tensão no requisito “Screenshots antes/depois no PR”: não há PR dentro deste ambiente. Vou substituir por validação visual no preview em desktop/mobile e deixar no resumo final os ecrãs/estados verificados.
- Não existe `DESIGN_SYSTEM.md` no root, apesar do pré-requisito mencionar esse ficheiro. Vou usar os tokens existentes em `src/index.css`/Tailwind e, se for necessário documentar algo, peço confirmação antes de criar documentação fora do escopo visual.

## Fase 1 — Estrutura de layout e preview compacto

- Ajustar a grelha principal de `/manual-create` para 2/3 formulário + 1/3 preview em desktop, preservando o comportamento mobile.
- Atualizar `PreviewPanel`:
  - remover o subtítulo redundante;
  - usar título visual equivalente a H3/16px;
  - receber `lastSaved`, `isAutoSaving`, `hasUnsavedChanges`, `caption`, `networkCaptions`, `useSeparateCaptions`, `scheduleAsap`, `scheduledDate`, `time` e dados de média para mostrar estado e metadados vivos;
  - mover o badge de rascunho para o topo direito do preview;
  - adicionar metadados compactos abaixo do mockup: caracteres da legenda, número de hashtags e agendamento;
  - adicionar botão pequeno de expansão no canto superior direito.
- Remover o `AutoSaveIndicator` do card “Média” para evitar duplicação.

## Fase 2 — Tabs compactas e modo expandido

- Redesenhar as tabs de formatos no `PreviewPanel`:
  - ícone principal da rede;
  - ícone pequeno do formato em overlay;
  - tooltip com rede + formato;
  - tab ativa com `bg-primary` e ícones em `primary-foreground`;
  - tabs inativas monocromáticas;
  - scroll horizontal com snap quando houver muitas redes/formatos.
- Criar modo expandido em modal/dialog full-screen:
  - mostra todas as tabs/formatos lado a lado quando possível;
  - mantém o mesmo `renderPreview`, sem duplicar lógica;
  - não altera o conteúdo a publicar, apenas a forma de comparar previews.

## Fase 3 — Mockups mais pequenos e consistentes

- Reduzir o `DeviceFrame` de telemóvel para largura máxima de 260px por defeito.
- Permitir variante maior apenas no modal expandido.
- Rever previews verticais já existentes (`InstagramReelPreview`, `InstagramStoryPreview`, `YouTubeShortsPreview`, `TikTokPreview`, `Facebook` vertical quando aplicável) para não ultrapassarem o painel estreito.
- Manter rácios atuais: 9:16 para Reels/Stories/Shorts/TikTok, 4:5/1:1/feed conforme o preview existente.

## Fase 4 — Card “Selecione onde publicar” em grelha 2 colunas

- Substituir a interação atual baseada em chips expansíveis por uma grelha clara:

```text
┌─────────────────────┬─────────────────────────┐
│ Redes               │ Formatos selecionados    │
│ ☑ Instagram         │ Instagram                │
│ ☑ LinkedIn          │ ○ Feed  ● Reel ...       │
│ ☐ TikTok            │ LinkedIn                 │
│ ...                 │ ● Feed  ○ Documento      │
└─────────────────────┴─────────────────────────┘
```

- Preservar a mesma fonte de verdade (`selectedFormats`) e a mesma lista `NETWORK_POST_FORMATS`.
- Usar checkboxes para ativar/desativar redes.
- Usar seleção de formato por rede na coluna direita, mantendo compatibilidade com casos onde uma rede pode suportar mais de um formato.
- Manter presets rápidos se continuarem úteis visualmente, mas mais discretos para não competir com a grelha principal.
- Não alterar validações nem regras de formatos.

## Fase 5 — Card “Média” com hierarquia clara

- Redesenhar `MediaUploadSection`:
  - upload como área principal grande e evidente;
  - “Dividir grelha” e “Gerar com IA” como tiles secundárias compactas;
  - manter drag-and-drop e `onFileUpload` atuais;
  - usar `bg-muted/30`, `border`, `primary` e tokens existentes, sem cores hardcoded novas.
- Quando já houver ficheiros:
  - upload colapsa para uma linha compacta “Adicionar mais”;
  - grelha de previews ganha mais espaço;
  - cada preview mantém thumbnail, remoção e ordenação existentes;
  - acrescentar nome truncado/tamanho se já estiver disponível no componente sem quebrar DnD.
- Manter `GridSplitter`, `AIGenerator`, alt text e ferramentas de vídeo sem alterar lógica.

## Fase 6 — Stepper e botões de navegação

- Tornar `StepProgress` mais discreto:
  - 14px;
  - sem fundos coloridos fortes;
  - completo: check verde + texto cinza;
  - ativo: ponto roxo/primary pequeno + texto bold;
  - futuro: ponto cinza + texto claro;
  - conectores finos de 1px.
- Padronizar navegação:
  - “Anterior” ghost à esquerda;
  - “Seguinte” primary à direita;
  - altura 40px;
  - sem botões perdidos ou flutuantes em desktop.
- Em mobile, consolidar a navegação inferior sticky com fundo `background` e sombra/borda superior, respeitando o `MobileStickyActionBar` existente.

## Fase 7 — UX transversal: contadores e popovers

- Criar/usar um pequeno helper visual para contadores de limite:
  - `muted` até 80%;
  - amarelo a partir de 80%;
  - vermelho/destructive a partir de 95% ou limite ultrapassado.
- Aplicar nos campos relevantes do `/manual-create` sem alterar validações.
- Substituir os tooltips genéricos de “Média” e “Agendamento” por popovers com conteúdo útil:
  - Média: tamanho máximo, formatos aceites, dimensões recomendadas;
  - Agendamento: fuso horário de Lisboa, diferença entre publicar agora e agendar.
- Manter copy em Português de Portugal e corrigir eventuais fugas como “Preview” para “Pré-visualização” quando estiver no escopo destes componentes.

## Fase 8 — Responsivo e dark mode

- Mobile `<768px`:
  - manter preview como drawer inferior;
  - colapsado por defeito;
  - botão flutuante/ação com ícone de olho para abrir;
  - drawer com altura aproximada de 70% quando expandido, evitando cobrir todo o fluxo;
  - handle visual já fornecido pelo drawer, se disponível.
- Dark mode:
  - garantir cards secundários com `bg-muted/30` ou tokens equivalentes;
  - texto com contraste adequado;
  - mockups legíveis em fundos escuros;
  - evitar classes com cores fixas novas.

## Fase 9 — QA final

- Executar build TypeScript.
- Validar no preview:
  - desktop largo: grelha 2/3 + 1/3, preview compacto e tabs sem quebra;
  - desktop médio: tabs com scroll horizontal;
  - mobile 375px: drawer de preview, botões sticky e formulário sem overflow;
  - dark mode: contraste e cards secundários;
  - estados com e sem ficheiros carregados;
  - estados com 1 e vários formatos selecionados.

## Fora de escopo neste prompt

- Não alterar publicação, validações, quotas, IA, insights, créditos ou backend.
- Não criar novas regras de negócio.
- Não editar ficheiros bloqueados.
- Não introduzir dependências novas.

## Checkpoint

☐ Preview redesenhado com header limpo, tabs compactas, mockup menor, metadados e modo expandido.  
☐ Badge de rascunho movido para o topo do preview e removido do card “Média”.  
☐ Card “Selecione onde publicar” convertido para grelha 2 colunas.  
☐ Card “Média” com upload principal e ações secundárias.  
☐ Stepper e navegação inferior padronizados.  
☐ Contadores e popovers contextuais melhorados.  
☐ Dark mode e responsivo mobile verificados.  
☐ Build final validado e resumo visual entregue.