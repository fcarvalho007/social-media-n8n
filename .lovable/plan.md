

## Avaliação — Testes UI para Recovery & Quota Banners

### Veredicto: **Sim, oportuno**, com escopo focado

| Critério | RecoveryBanner | QuotaWarningBanner |
|---|---|---|
| Lógica condicional não trivial | ✅ 3 estados (loading / com post / vazio) | ✅ 5 ramos (unlimited, sem rede, <80%, ≥80%, ≥100%) |
| Interacções do utilizador | ✅ "Limpar" + remover thumbnail | ❌ puramente apresentacional |
| Acoplamento externo | 🟡 `useNavigate` + `toast` (mockáveis) | ✅ zero dependências |
| Risco de regressão | ✅ Alto — bug aqui apaga conteúdo do utilizador | ✅ Médio — bug esconde quota |
| Custo do teste | Baixo | Muito baixo |

**Não vale testar agora:** `MobileStickyActionBar` (CSS responsivo é frágil), `ManualCreateModals` (só compõe), `previewRenderer` (switch puro).

### Setup necessário

O projecto **não tem** setup de testes. Plano:

1. Adicionar a `package.json` (devDependencies):
   ```
   @testing-library/jest-dom ^6.6.0
   @testing-library/react ^16.0.0
   @testing-library/user-event ^14.5.0
   jsdom ^25.0.0
   vitest ^3.2.4
   ```
2. Criar `vitest.config.ts` (jsdom + globals + alias `@`)
3. Criar `src/test/setup.ts` (matchMedia stub + jest-dom)
4. Adicionar `"vitest/globals"` a `tsconfig.app.json`

### Cobertura proposta

**`QuotaWarningBanner.test.tsx`** (6 casos, ~40 linhas)
- Não renderiza quando `isUnlimited=true`
- Não renderiza quando `selectedNetworks` está vazio
- Não renderiza quando todas as quotas <80%
- Mostra "Quota quase esgotada" quando IG=85%
- Mostra "Quota IG esgotada" quando IG=100%
- Mostra "Quota LI esgotada" quando LinkedIn=100%

**`RecoveryBanner.test.tsx`** (8 casos, ~110 linhas)
- Mostra spinner "A recuperar conteúdo..." durante `isRecovering`
- Não renderiza nada sem `recoveredPostId` e sem loading
- Mostra cartão azul com contagem correta ("3 ficheiro(s) carregado(s)")
- Renderiza até 7 thumbnails + indicador "+N" para excedente
- Diferencia `<video>` vs `<img>` por `mediaFile.type`
- Botão "Limpar" chama TODOS os setters + `navigate` + `toast`
- Botão de remover thumbnail individual filtra apenas o índice clicado
- `e.stopPropagation()` previne propagação ao container

Mocks: `react-router-dom` (`useNavigate`), `sonner` (`toast`).

### Resultado esperado

- 14 testes a passar (~150 linhas combinadas)
- Setup Vitest pronto para futuros testes (hooks, validators, etc.)
- Execução <2s

### Checkpoint

☐ 5 dependências instaladas via `bun add -D`  
☐ `vitest.config.ts` + `src/test/setup.ts` + `tsconfig.app.json` actualizados  
☐ `QuotaWarningBanner.test.tsx` criado (6 casos)  
☐ `RecoveryBanner.test.tsx` criado (8 casos)  
☐ 14/14 testes a passar  
☐ `npx tsc --noEmit` 0 erros  
☐ `bun run build:dev` continua a passar  

### Fora do escopo (prompts futuros)

- Testes para hooks puros (`useStepper`, `useMediaManager`, `useImageCompression`) — boa relação custo/benefício
- E2E (Playwright) para o fluxo `/manual-create`
- Testes para componentes com DnD ou Tabs (mocks pesados, baixo ROI)

