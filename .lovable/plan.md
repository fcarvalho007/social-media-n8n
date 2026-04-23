## Melhorias — contexto visual em “Conteúdo a Tratar” no `/dashboard`

### Objetivo

Quando um post é guardado como rascunho ou submetido para aprovação, o card no `/dashboard` deve permitir identificar rapidamente o conteúdo:

- mostrar thumbnail real quando existe imagem;
- indicar claramente quando é vídeo, mesmo que não exista thumbnail renderizada;
- mostrar uma pequena caixa de contexto com data e excerto da legenda;
- evitar cards “cegos” só com ícone genérico, sempre que houver informação disponível.

### Problemas encontrados

1. O `/dashboard` usa `PendingThumbnail`, que recebe apenas `thumbnail`, `type` e `route`.
2. A informação de legenda e data já é carregada em `usePendingContent`, mas não é passada para o componente visual.
3. Rascunhos guardam `media_urls`, mas o extrator atual só assume string simples ou `{ url }`, e não distingue bem imagem/vídeo.
4. Em vídeos, o componente tenta renderizar como imagem quando recebe URL de vídeo, falha e cai num ícone genérico.
5. A grelha atual é só quadrada; não há espaço de enquadramento para legenda/data, como pediste.

### Alterações propostas

#### 1. Enriquecer os dados do dashboard

Atualizar `src/hooks/usePendingContent.ts` para devolver, por item:

- `caption`
- `createdAt`
- `scheduledDate`
- `mediaType`: `image | video | document | unknown`
- `mediaCount`
- `platform`, quando disponível em rascunhos

Também melhorar a extração de média para suportar:

- URL simples;
- objetos `{ url }`;
- objetos `{ preview }`;
- objetos `{ thumbnail_url }` ou similares, se já existirem;
- deteção por extensão para vídeo/PDF/imagem.

#### 2. Reestruturar `PendingThumbnail`

Atualizar `src/components/PendingThumbnail.tsx` para deixar de ser apenas um quadrado e passar a ser um mini-card compacto:

- thumbnail no topo, mantendo formato quadrado;
- badge de estado no canto: `Rascunho`, `Por aprovar`, `Agendado`, etc.;
- indicador de vídeo/documento quando aplicável;
- pequena caixa inferior com:
  - data: “Guardado 23 abr”, “Criado 23 abr” ou “Agendado 24 abr, 12:00”;
  - excerto da legenda em 1–2 linhas;
  - fallback útil: “Sem legenda”.

Exemplo conceptual:

```text
┌────────────────────┐
│ [thumbnail/vídeo]   │
│ Rascunho      +2    │
├────────────────────┤
│ Guardado 23 abr     │
│ Primeiras palavras… │
└────────────────────┘
```

#### 3. Melhorar especificamente vídeos

Para vídeos em rascunhos ou por aprovar:

- não tentar renderizar a URL do vídeo como `<img>`;
- mostrar uma superfície visual própria com ícone de reprodução;
- opcionalmente usar `<video preload="metadata">` em miniatura, se for seguro e leve;
- manter fallback elegante quando o navegador não conseguir carregar preview.

A prioridade é identificação visual clara sem pesar o dashboard.

#### 4. Ajustar o layout da grelha do dashboard

Atualizar `src/pages/Dashboard.tsx` para acomodar mini-cards com contexto:

- trocar a grelha exclusivamente quadrada por cards ligeiramente mais altos;
- manter layout compacto e responsivo;
- preservar o limite de 6 itens;
- manter botões existentes para Aprovar, Agendados e Rascunhos.

#### 5. Garantir coerência com `/drafts`

Rever `src/components/drafts/DraftCard.tsx` para alinhar a lógica de deteção de média:

- suportar `media_urls` como string ou objeto;
- não perder thumbnail se o formato guardado mudar;
- indicar vídeo de forma consistente.

Se fizer sentido, criar um pequeno helper reutilizável para normalizar media items sem introduzir dependências novas.

### Ficheiros previstos

- `src/hooks/usePendingContent.ts`
- `src/components/PendingThumbnail.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/drafts/DraftCard.tsx`
- opcional: `src/lib/mediaPreview.ts` para helper reutilizável

### Fora de âmbito nesta alteração

- Não alterar a base de dados, salvo se for descoberto que os rascunhos não estão a guardar URLs de média.
- Não mexer em ficheiros bloqueados.
- Não alterar o fluxo de criação ou aprovação, exceto se for necessário para garantir que `media_urls` continua a ser persistido corretamente.

### Checklist

☐ Rascunho com imagem mostra thumbnail real no `/dashboard`  
☐ Rascunho com vídeo deixa de aparecer como ícone genérico sem contexto  
☐ Conteúdo por aprovar mostra thumbnail/contexto quando disponível  
☐ Cada card mostra data e excerto da legenda quando existir  
☐ Cards sem legenda mostram fallback em pt-PT: “Sem legenda”  
☐ Layout continua compacto em desktop e mobile  
☐ `/drafts` continua a abrir e editar rascunhos corretamente  
☐ Sem alterações em ficheiros bloqueados  
☐ `npx tsc --noEmit` sem erros  
☐ Testes existentes continuam verdes