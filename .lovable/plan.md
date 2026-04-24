# Plano — Refinar espaçamentos, opções visuais e iconografia em `/manual-create`

## Diagnóstico

A página já está funcional e mais mobile-first, mas ainda há inconsistências visuais entre secções:

- Alguns cartões usam `p-5`, outros `p-4`, `p-3`, `p-2` e `h-8`, criando ritmo irregular.
- Há iconografia pouco consistente: secções principais sem ícone em alguns casos, emojis nos presets, siglas como `TT`, `G`, `X` nalguns pontos e tamanhos de ícones diferentes.
- Existem opções visuais com estilos muito diferentes entre si: presets com gradientes inline, formatos com cores inline da plataforma, badges pequenos, tabs compactas e botões com alturas diferentes.
- Em mobile, há elementos abaixo do alvo recomendado de 44px: presets de hora, tags selecionadas, chips de hashtags, botões de reescrita por tom e alguns triggers/tabs.
- A captura visual mostra que o topo mobile está a funcionar, mas o conteúdo abaixo parece denso e pouco hierarquizado, sobretudo na secção “Seleciona onde publicar”.

## Objetivo

Consolidar `/manual-create` para parecer uma experiência única e intencional: espaçamentos previsíveis, hierarquia clara, iconografia coerente e opções visuais fáceis de perceber em desktop e telemóvel, sem alterar lógica de negócio nem funcionalidades.

## Alterações propostas

### 1. Criar um padrão visual único para cabeçalhos de cards

Aplicar um padrão consistente nas secções principais:

- “Seleciona onde publicar”
- “Média”
- “Legenda”
- “Opções por rede”
- “Agendamento”
- “Pré-visualização”

Cada cabeçalho passa a ter:

- ícone lucide de 20px com `strokeWidth={1.5}`;
- título com `manual-section-title`;
- ajuda/contexto alinhado;
- descrição curta quando fizer sentido;
- espaçamento inferior consistente (`pb-3`).

Exemplo visual pretendido:

```text
[ícone] Título                    [?]
Descrição curta em muted, se existir
```

### 2. Normalizar espaçamentos dos cartões e subsecções

Ajustar o ritmo visual sem aumentar desperdício vertical:

- cards principais continuam com `manual-card-shell` e `manual-card-content`;
- conteúdo interno usa `manual-group-stack` para blocos e `manual-field-stack` para campo + label;
- subcards passam a usar um padrão coerente: `rounded-lg border bg-muted/20 p-3 sm:p-4`;
- separadores só aparecem quando há mudança estrutural real;
- evitar margens soltas (`mt-4`, `mb-5`) quando já existe stack tokenizada.

### 3. Redesenhar “Seleciona onde publicar” sem parecer colagem de estilos

Refinar `NetworkFormatSelector`, `QuickPresets` e `SelectedFormatsTags`:

- substituir emojis dos presets por ícones lucide consistentes (`LayoutGrid`, `Video`, `Image`, `Clock`/`Layers` conforme o preset);
- remover gradientes inline dos presets e usar estados semânticos (`border-primary`, `bg-primary/10`, `bg-muted/30`);
- manter cores oficiais apenas nos ícones/logótipos das redes, como definido no design system;
- aumentar legibilidade dos presets em mobile mantendo layout compacto;
- alinhar “Redes” e “Formatos” como dois blocos com altura e padding consistentes;
- tornar os chips de formatos selecionados mais tocáveis em mobile, com botão remover de 44px no toque mas visual compacto.

### 4. Harmonizar opções visuais e iconografia de formatos

Rever `FormatCard`, `PreviewPanel`, tabs e badges:

- ícones de formato com tamanhos consistentes;
- estados selecionado/não selecionado mais subtis e menos “pesados”;
- evitar `borderWidth: 3px` em seleção para não causar saltos visuais;
- badges com altura e texto coerentes (`manual-chip`);
- tabs de pré-visualização com alvos 44px em mobile e 40px em desktop.

### 5. Melhorar ergonomia mobile de microcontrolos

Corrigir os elementos que ainda estão pequenos:

- `CaptionToneToolbar`: botões 44px em mobile, 32/36px apenas em desktop;
- `HashtagSuggestions`: chips `min-h-11` em mobile;
- presets de hora no agendamento: passar de badge clicável pequeno para botões/chips tocáveis;
- tabs em `NetworkOptionsCard`: altura mínima 44px em mobile;
- botões “Anterior” internos: ocultar ou suavizar em mobile onde a sticky bar já existe, para reduzir duplicação visual.

### 6. Polir `NetworkOptionsCard`

Sem reescrever a lógica, melhorar a estrutura visual:

- cabeçalho com ícone de sliders/settings;
- accordion trigger com altura mínima e chevron bem alinhado;
- conteúdo com padding consistente;
- inputs e labels sempre alinhados;
- tags e colaboradores com remover tocável e visual menos apertado;
- manter bottom sheet de tags em mobile, mas com espaçamento e CTA sticky mais claro.

### 7. Ajustar CSS utilitário manual

Adicionar/ajustar utilitários locais em `src/index.css` para evitar estilos soltos:

- `.manual-card-header-row`
- `.manual-subcard`
- `.manual-option-button`
- `.manual-icon-box`
- `.manual-touch-chip`

Todos usando tokens existentes: `bg-card`, `bg-muted`, `border`, `primary`, `muted-foreground`, `rounded-lg`, `manual-*`.

## Ficheiros previstos

- `src/index.css`
- `src/components/manual-post/NetworkFormatSelector.tsx`
- `src/components/manual-post/QuickPresets.tsx`
- `src/components/manual-post/SelectedFormatsTags.tsx`
- `src/components/manual-post/FormatCard.tsx`
- `src/components/manual-post/NetworkCaptionEditor.tsx`
- `src/components/manual-post/ai/CaptionToneToolbar.tsx`
- `src/components/manual-post/ai/HashtagSuggestions.tsx`
- `src/components/manual-post/steps/Step2MediaCard.tsx`
- `src/components/manual-post/steps/Step3CaptionCard.tsx`
- `src/components/manual-post/steps/Step3ScheduleCard.tsx`
- `src/components/manual-post/steps/NetworkOptionsCard.tsx`
- `src/components/manual-post/steps/PreviewPanel.tsx`

Nenhum ficheiro bloqueado será alterado.

## Fora de âmbito

- Não alterar lógica de publicação, validação, IA, créditos ou backend.
- Não adicionar dependências.
- Não alterar o design global fora de `/manual-create`.
- Não mexer em ficheiros auto-gerados ou bloqueados.
- Não adicionar novas funcionalidades.

## Validação

Após aprovação e implementação:

- executar TypeScript/lint nos ficheiros alterados;
- verificar `/manual-create` em 390×844 e desktop;
- confirmar que não há scroll horizontal em mobile;
- confirmar targets de toque mínimos nos elementos interativos principais;
- confirmar pt-PT e Acordo Ortográfico nas novas microcopies.

## Checkpoint

☐ Cabeçalhos de cards normalizados com iconografia coerente  
☐ Espaçamentos internos alinhados com tokens `manual-*`  
☐ Presets rápidos sem emojis/gradientes inline e com visual consistente  
☐ Chips, tabs e botões pequenos corrigidos para mobile  
☐ `NetworkOptionsCard` visualmente mais legível e menos denso  
☐ Pré-visualização e formatos com estados selecionados mais subtis  
☐ Sem alterações de lógica de negócio ou backend  
☐ TypeScript/lint e verificação visual mobile/desktop concluídos