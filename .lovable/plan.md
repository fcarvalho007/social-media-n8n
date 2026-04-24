# Plano — Prompt 3: Auditoria visual e polimento de `/manual-create`

## Inconsistências encontradas antes de corrigir

### Espaçamento
- Os cards principais ainda misturam `space-y-3`, `space-y-4` e `space-y-6`; a regra deve passar a ser 24px entre cards principais.
- Vários cards usam `px-6/pt-6/pb-6` em desktop, resultando em 24px, quando o token aprovado para padding interno é 20px.
- Há gaps internos de 12px (`gap-3`, `space-y-3`) onde a regra pede 16px entre grupos de campos.
- Alguns pares label/campo usam `space-y-1.5` ou `mt-1`; devem ser normalizados para 8px.

### Alinhamento e responsivo
- `Step2MediaCard`, `Step3CaptionCard`, `Step3ScheduleCard` e `NetworkOptionsCard` ainda usam classes mobile ultra-compactas (`text-[9px]`, `text-[10px]`, paddings muito pequenos), abaixo do mínimo definido de 12px.
- O painel de pré-visualização tem empty state diferente entre desktop e mobile; desktop não tem ícone e a copy ainda usa “Selecione”, enquanto o projeto usa “Seleciona”.
- Contadores aparecem ora no header, ora em badges, ora abaixo do campo; devem ser alinhados de forma previsível e sem competir com o texto.
- Tabs e badges de redes podem ficar visualmente apertados com 5 redes e legendas longas.

### Cores, raios e detalhes premium
- Algumas ações usam cores diretas (`green-600`, `blue-600`, `orange-500`, `purple-500`) em vez de tokens semânticos.
- O raio global `--radius` está em 1rem, mas as regras de `/manual-create` pedem 8px em cards, 6px em inputs e 4px em chips. Vou resolver isto com utilitários/classes específicos de `/manual-create`, sem alterar o raio global da aplicação.
- A pré-visualização pode ganhar sombra subtil no mockup/painel sem criar decoração com cor de marca.

### Tipografia
- Existem tamanhos arbitrários abaixo de 12px em componentes do fluxo.
- Títulos e labels ainda não usam consistentemente os tokens `manual-section-title`, `manual-field-label`, `manual-microcopy`.

### Performance/CSS
- Não encontrei `import * as` de `lucide-react` nos ficheiros observados; os imports são nomeados, compatíveis com tree-shaking.
- Há estilos inline para cores de plataforma em componentes existentes; onde for tocado neste prompt, serão mantidos apenas se forem necessários para a cor oficial da rede ou substituídos por tokens/classes.

## Decisões que proponho aplicar

1. **Prevalência visual**: os tokens do Prompt 1 passam a prevalecer sobre ajustes ultra-compactos herdados.
2. **Mobile**: manter a UI compacta, mas nunca abaixo de 12px e com targets clicáveis confortáveis.
3. **Cores de marca**: usar `primary`, `destructive`, `warning`, `success`, `muted` e tokens semânticos. Cores oficiais de redes sociais continuam permitidas apenas nos ícones/logótipos das próprias redes.
4. **Raios específicos de `/manual-create`**: criar/usar classes locais para garantir cards 8px, inputs 6px e chips 4px sem afetar o resto do produto.

## Implementação proposta

### 1. Normalizar fundações visuais no CSS/design system
- Adicionar utilitários específicos para `/manual-create`:
  - `.manual-card-shell` para cards com raio 8px, padding coerente e overflow seguro.
  - `.manual-card-content` para padding interno 20px.
  - `.manual-field-stack` para label/campo com 8px.
  - `.manual-group-stack` para grupos com 16px.
  - `.manual-enter` para fade + slide 8px em 200ms.
- Atualizar `DESIGN_SYSTEM.md` com os ajustes dos Prompts 1, 2 e 3, componentes prontos para reuso e dívida técnica.

### 2. Polir cards principais de `/manual-create`
- Atualizar o container da coluna esquerda para `space-y-6` consistente.
- Normalizar `NetworkFormatSelector`, `Step2MediaCard`, `Step3CaptionCard`, `Step3ScheduleCard`, `NetworkOptionsCard`, `PublishActionsCard` e `PreviewPanel` para:
  - `card-primary`, `card-secondary` ou `card-accent` conforme o uso.
  - padding interno de 20px.
  - gaps de 16px entre grupos e 8px entre label/campo.
  - títulos com `manual-section-title` e microcopy com `manual-microcopy`.

### 3. Corrigir alinhamentos e estados de interação
- Alinhar ícones com texto usando `inline-flex items-center` e `shrink-0` quando necessário.
- Padronizar alturas de botões na mesma linha.
- Padronizar contadores: preferencialmente à direita/abaixo do campo, nunca misturados de forma arbitrária.
- Garantir focus ring visível em inputs, toggles, tabs, botões compactos e ações dentro de badges.
- Melhorar hover em cards clicáveis sem usar cor de marca como decoração.

### 4. Melhorar empty states e estados extremos
- Pré-visualização sem rede: estado vazio com ícone 48px, copy curta em pt-PT: “Seleciona uma rede para ver a pré-visualização.”
- Secções sem conteúdo não ficam em branco nem desalinhadas.
- Ajustar tabs/badges para 5 redes, 10 imagens, 30 hashtags e legendas longas sem overflow horizontal.
- Garantir `break-words`, `min-w-0`, `overflow-hidden` e wrapping controlado nos pontos críticos.

### 5. Polir validação, loading e ações rápidas
- Manter toasts discretos para ações rápidas já existentes e normalizar copy quando necessário.
- Verificar botões assíncronos com spinner interno onde já existe ação em curso.
- Manter upload com progress bar; substituir spinners isolados por skeleton/progress quando for visualmente apropriado sem mexer na lógica.
- Garantir erros com `destructive` e ícone nos blocos de validação tocados por este prompt.

### 6. Opções por rede e animações
- Aplicar animação subtil ao aparecimento/expansão de “Opções por rede”: fade + slide 8px, 200ms ease-out.
- Rever acordeões internos para manter separadores finos e padding consistente.
- Melhorar feedback visual ao adicionar colaborador/tag/hashtag com animação curta existente ou classe `manual-enter`.

### 7. Pré-visualização e detalhe premium
- Refinar o painel lateral com sombra suave, raio consistente e separadores finos.
- Garantir que tabs da pré-visualização não ficam cortadas e mantêm tooltip/label acessível.
- Aplicar gradiente subtil apenas nos blocos de IA/insights (`card-accent`), sem espalhar cor de marca por decoração.

### 8. Verificação final
Depois de implementar, executar:
- Build TypeScript/Vite.
- Verificação de imports `lucide-react` para confirmar ausência de `import * as`.
- Inspeção de classes críticas para remover tamanhos abaixo de 12px em `/manual-create`.
- Quando disponível no modo de execução, validar preview em 1920px, 1440px e 375px, incluindo drawer mobile e ausência de scroll horizontal.

## Fora de âmbito
- Não alterar lógica de negócio, validações, publicação, autosave, integração com IA ou APIs.
- Não adicionar funcionalidades novas.
- Não alterar ficheiros bloqueados (`src/integrations/supabase/*`, `.env`, chaves de `supabase/config.toml`).
- Não introduzir novas dependências.

## Checkpoint
- [ ] Listar e corrigir desvios de espaçamento conforme tokens.
- [ ] Normalizar alinhamentos, tipografia, raios e contrastes em `/manual-create`.
- [ ] Polir empty states, loading states e micro-interações.
- [ ] Confirmar responsivo desktop/laptop/mobile sem overflow visual.
- [ ] Atualizar `DESIGN_SYSTEM.md` com regras finais, componentes reutilizáveis e dívida técnica.
- [ ] Validar build e ausência de problemas óbvios no console/preview.