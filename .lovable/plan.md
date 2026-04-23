

## Fase 3 do refactor de `ManualCreate.tsx`

**Estado actual:** 1633 linhas. Fases 1+2 completas, 7 hooks extraídos, lógica de publicação encapsulada. Falta decompor o **JSX** que ainda vive todo dentro do componente.

### Diagnóstico — blocos JSX coesos

| Bloco | Linhas (~) | Responsabilidade |
|---|---|---|
| **Step 2 — Média** | 698-943 (~245) | `Card` com upload + carrossel DnD + thumbnails + navegação Anterior/Seguinte |
| **Step 3a — Legenda** | 945-999 (~55) | `Card` da legenda com `NetworkCaptionEditor` + contador caracteres |
| **Step 3b — Agendamento** | 1001-1234 (~233) | `Card` data/hora + toggle ASAP + popover calendário + navegação Anterior |
| **Action Card desktop** | 1237-1350 (~113) | `Card` sticky com progresso + validação + botões publicar/rascunho/submeter |
| **Preview lateral desktop** | 1354-? (~250) | `Card` com `Tabs` por rede social a renderizar 9 previews diferentes |

**Step 1** (linhas 675-696, ~22 linhas) é trivial — já é só `<NetworkFormatSelector>` + 1 botão. Não vale a pena extrair.

**Total candidato:** ~900 linhas de JSX → `ManualCreate.tsx` desce para **~730 linhas**.

### Princípio

Cada componente recebe **dados via props**, **callbacks via props**, e não toca em estado global. O componente pai (`ManualCreate`) continua a ser o orquestrador — segura o estado, passa-o para baixo. **Sem refactor de comportamento**, só split visual.

### Ficheiros a criar

```
src/components/manual-post/steps/
├── Step2MediaCard.tsx          (~245 linhas)
├── Step3CaptionCard.tsx        (~55 linhas)
├── Step3ScheduleCard.tsx       (~233 linhas)
├── PublishActionsCard.tsx      (~113 linhas)
└── PreviewPanel.tsx            (~250 linhas)
```

(Pasta `steps/` para os agrupar, evitando poluir `manual-post/` que já tem 30+ ficheiros.)

### Estratégia

Cada extracção segue o mesmo padrão:

1. Identificar o JSX exacto + todas as variáveis externas que usa
2. Criar o componente novo com interface de props tipada
3. Substituir o JSX original por `<NovoComponente {...props} />`
4. Validar TS + ESLint após cada extracção (5 ciclos pequenos, não 1 grande)

**Ordem proposta** (do mais isolado ao mais entrelaçado):

| # | Componente | Risco | Razão |
|---|---|---|---|
| 1 | `Step3CaptionCard` | Baixo | Só 55 linhas, props simples |
| 2 | `PublishActionsCard` | Baixo | Botões + handlers já delegados ao orchestrator |
| 3 | `Step3ScheduleCard` | Médio | Tem popover de calendário + estado local de hora |
| 4 | `Step2MediaCard` | Médio-alto | Maior, integra DnD + 3 botões de upload + GridSplitter |
| 5 | `PreviewPanel` | Médio | Tabs com 9 previews diferentes — muitos imports a mover |

### Resultado esperado

| Métrica | Hoje | Depois |
|---|---|---|
| `ManualCreate.tsx` | 1633 linhas | **~730 linhas** (-900) |
| Componentes em `manual-post/steps/` | 0 | **5** |
| Imports em `ManualCreate.tsx` | 76 | **~40** (previews + ícones movem-se) |
| Erros TS / ESLint / build | 0 / 0 / ✅ | **0 / 0 / ✅** |

### Risco

**Médio.** Pure JSX move bem mas é grande volume e cada componente tem 8-15 props. Mitigação:
- Extrair um de cada vez + validar TS no fim de cada um (não tudo de uma vez)
- Usar tipos explícitos para as `Props`, não `any`
- Manter os callbacks inline (`onChange={(v) => setX(v)}`) em vez de passar setters directamente, para evitar acoplar o componente ao tipo do estado pai

### Checkpoint

☐ 5 ficheiros criados em `src/components/manual-post/steps/`  
☐ `ManualCreate.tsx` ≤ 800 linhas  
☐ `npx tsc --noEmit` sem erros  
☐ `npx eslint src/pages/ManualCreate.tsx` sem novos erros  
☐ `bun run build:dev` passa  
☐ Visualmente idêntico em desktop e mobile (375px)  
☐ Step 2: upload, drag-and-drop e remoção de média continuam  
☐ Step 3: legenda, toggle de legendas separadas e agendamento continuam  
☐ Botões "Publicar agora", "Guardar rascunho" e "Submeter para aprovação" continuam funcionais  
☐ Preview lateral desktop renderiza correctamente para todas as 9 redes

### Fora desta fase

- **Fase 4:** limpeza final de imports residuais + meta ≤700 linhas (~50 linhas extra)
- Refactor do `PublishProgressModal.tsx` (869 linhas — prompt próprio)
- Refactor do componente de preview de cada rede (já estão isolados em `manual-post/`, não precisam tocar agora)

