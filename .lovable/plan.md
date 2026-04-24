## Revisão do que ficou feito

### Fase fechada: opções por rede ligadas à publicação real

Confirmei no código que a fase anterior já ficou implementada nos pontos críticos:

- A secção “Opções por rede” está localizada em pt-PT.
- `network_options` é guardado em rascunhos e publicações.
- `network_options` é enviado pelo frontend para a função `publish-to-getlate`.
- A função `publish-to-getlate` transforma essas opções em `platformSpecificData` no payload real enviado ao Getlate.
- Foram adicionadas validações defensivas no backend antes de chamar o Getlate.
- `publication_attempts.response_data` guarda `network_options_applied`, permitindo auditoria posterior.

Mapeamento confirmado:

```text
Instagram
- firstComment
- collaborators
- userTags com mediaIndex/x/y
- contentType story/reels quando aplicável

Facebook
- firstComment
- contentType story/reel quando aplicável

LinkedIn
- firstComment
- disableLinkPreview

YouTube
- title
- visibility
- categoryId

Google Business
- callToAction com type/url quando aplicável
```

### Pontos ainda frágeis detetados

Há alguns refinamentos que não bloqueiam a fase anterior, mas convém resolver quando tocarmos nesta área:

- `publish-to-getlate` ainda usa CORS manual com menos headers do que outras funções recentes. Deve ser alinhado para evitar falhas em clientes mais novos.
- A validação de `network_options` no backend é funcional, mas não está tão estruturada como uma validação por schema. Nesta próxima fase podemos reforçar apenas o que for tocado.
- A UI de tags Instagram continua limitada a “adicionar no centro”, de forma assumida e honesta. Não mexer nisto nesta fase, salvo bug.

## Próxima fase proposta: Reescrita por tom

Objetivo: permitir ao utilizador reescrever a legenda com IA diretamente em `/manual-create`, mantendo controlo editorial e evitando substituir conteúdo sem confirmação.

## Plano de execução

### 1. Criar ação de reescrita junto da legenda

Adicionar uma pequena área compacta na secção de legenda com opções de tom:

- Direto
- Emocional
- Técnico
- Neutro
- Mais curto
- Mais forte

Com botão principal:

- “Reescrever com IA”

A ação deve funcionar tanto para:

- legenda única;
- legendas separadas por rede.

No caso de legendas separadas, a reescrita deve aplicar-se à rede ativa/selecionada, não a todas sem confirmação.

### 2. Criar função backend para reescrita editorial

Criar uma função backend dedicada, por exemplo `ai-caption-rewriter`, que recebe:

- texto atual;
- rede social alvo;
- tom escolhido;
- formatos selecionados;
- contexto opcional da transcrição já existente;
- idioma fixo `pt-PT`.

A função deve:

- validar sessão do utilizador;
- validar tamanho mínimo/máximo do texto;
- chamar a IA pelo gateway já configurado;
- devolver apenas texto reescrito e metadados simples;
- escrever sempre em Português de Portugal, Acordo Ortográfico de 1990;
- não inventar dados, números, resultados ou promessas.

### 3. Mostrar pré-visualização antes de aplicar

Depois da resposta da IA, abrir uma confirmação simples:

- texto atual;
- nova versão;
- botões:
  - “Aplicar versão”;
  - “Manter original”.

Isto evita que a IA substitua uma legenda boa sem controlo do utilizador.

### 4. Integrar com metadados de IA

Ao aplicar uma versão reescrita:

- atualizar a legenda certa;
- anexar em `aiMetadata` um registo leve, por exemplo:

```text
rewrites: [
  {
    network,
    tone,
    created_at,
    source: "caption_rewriter"
  }
]
```

Isto mantém histórico técnico sem criar novas tabelas.

### 5. Respeitar preferências de IA existentes

O projeto já tem `ai_preferences` e `default_tone`.

Nesta fase:

- usar `default_tone` como tom pré-selecionado quando existir;
- manter `pt-PT` como idioma fixo;
- não criar novo ecrã de preferências.

### 6. Reforçar UX e erros

Adicionar estados claros:

- “A reescrever…”;
- erro de sessão expirada;
- erro de créditos/limite;
- erro de texto demasiado curto;
- erro genérico com opção de tentar novamente.

Toda a copy deve ficar em pt-PT.

### 7. Validação

Depois da implementação:

- correr build TypeScript;
- testar legenda única;
- testar legenda separada por rede;
- testar texto curto/inválido;
- testar aplicação e rejeição da sugestão;
- confirmar que `aiMetadata` continua a ser guardado em rascunhos/publicações.

## Ficheiros previstos

- `src/pages/ManualCreate.tsx`
- `src/components/manual-post/steps/Step3CaptionCard.tsx`
- possível novo componente em `src/components/manual-post/ai/`
- `src/types/aiEditorial.ts`
- `supabase/functions/ai-caption-rewriter/index.ts`
- `.lovable/plan.md`

Não serão editados ficheiros bloqueados:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- chaves de projeto em `supabase/config.toml`

## Fora desta fase

- Geração automática de calendário editorial.
- Reescrita em lote para todas as redes de uma só vez.
- Scoring de performance ou previsão de alcance.
- Lookup real de menções LinkedIn/Instagram.
- Alterações de base de dados, salvo se for detetado bloqueio técnico inesperado.

## Checkpoint

☐ Rever e confirmar fase anterior como concluída  
☐ Criar ação “Reescrever com IA” na legenda  
☐ Criar função backend `ai-caption-rewriter`  
☐ Suportar tons: Direto, Emocional, Técnico, Neutro, Mais curto e Mais forte  
☐ Mostrar pré-visualização antes de aplicar  
☐ Aplicar em legenda única ou rede ativa quando há legendas separadas  
☐ Guardar metadados da reescrita em `aiMetadata`  
☐ Validar build e fluxo crítico antes de avançar para a fase seguinte