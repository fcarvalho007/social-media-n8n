# Plano revisto — Prompt 2: Caixa de hashtags inteligente sem providers pagos

## Decisão de princípio

Não integrar RiteTag, Display Purposes, scraping nem qualquer provider que dependa de subscrição. A caixa passa a ser uma ferramenta editorial assistida por IA, não uma ferramenta de métricas de mercado.

Regra central: **a IA pode sugerir e classificar por relevância editorial, mas não pode inventar volume, alcance, dificuldade ou score.**

## Refinamentos propostos

### 1. Renomear o conceito visual para evitar promessa falsa

Substituir termos como “score”, “saúde” ou “volume” por linguagem mais honesta:

- “Relevância editorial”
- “Tipo de hashtag”
- “Risco”
- “Origem da sugestão”

Na interface, mostrar uma nota curta:

> Sugestões editoriais por IA. Não incluem dados reais de volume ou alcance.

### 2. Três grupos mantidos, mas com significado editorial

Manter a organização em três grupos:

1. **Alcance**
   - Hashtags mais amplas e reconhecíveis.
   - Sem cor de desempenho.
   - Exemplo: `#marketingdigital`, `#redessociais`.

2. **Nicho**
   - Hashtags específicas ao tema, setor, formato ou audiência.
   - Geralmente as mais úteis para qualidade editorial.

3. **Marca**
   - Hashtags definidas pelo utilizador.
   - Respeitam preferência e limite máximo configurável.
   - Nunca são inventadas como sendo da marca.

### 3. Estados permitidos das hashtags

Cada hashtag pode ter apenas estes indicadores:

- **Neutro**: sugestão editorial sem dados externos.
- **Risco**: potencialmente spam, genérica demais, engagement-bait ou má prática.
- **Banida/evitar**: presente num ficheiro local de hashtags proibidas/sensíveis.
- **Marca**: vem das preferências do utilizador.
- **Já usada**: já existe na legenda atual.

Não haverá:

- verde por “boa performance”;
- amarelo por “saturada” com base em volume;
- números de alcance;
- scores de 0–100;
- estimativas inventadas.

### 4. Cache de 7 dias com outro propósito

A tabela `hashtag_metadata` continua útil, mas muda de função:

- guardar normalização da hashtag;
- guardar classificação editorial feita pela IA;
- guardar flags locais: spam, banida, sensível, genérica;
- guardar `last_verified` para evitar reavaliar a mesma hashtag durante 7 dias.

O campo `volume_estimate` não será usado nesta fase, salvo se no futuro existir uma fonte fiável. Se estiver vazio, a UI não mostra nada relacionado com volume.

### 5. IA como classificador editorial, não como fonte estatística

A IA será usada para:

- sugerir hashtags em pt-PT a partir de legenda, transcrição e redes selecionadas;
- separar em alcance/nicho/marca;
- justificar brevemente porque uma hashtag é adequada;
- marcar hashtags demasiado vagas, repetidas, desalinhadas ou com cheiro a spam;
- devolver output estruturado através da função `ai-core` ou de uma nova função dedicada.

A prompt terá instrução explícita:

- não estimar volume;
- não afirmar tendências reais;
- não dizer que uma hashtag é popular sem prova;
- não inventar dados de mercado;
- devolver “unknown” quando não houver base fiável.

### 6. Fonte local de risco/banidas

Criar uma lista local versionada, por exemplo:

- hashtags spam: `#followback`, `#likeforlike`, `#follow4follow`, etc.;
- hashtags sensíveis ou inseguras para marca;
- padrões suspeitos: excesso de números, tags demasiado genéricas, tags não pt-PT quando a fase é só pt-PT.

O vermelho fica reservado apenas para estes casos de risco ou excesso de limite.

### 7. Integração na criação manual

Na etapa da legenda em `/manual-create`, adicionar uma caixa compacta abaixo ou junto do editor de legenda:

- aparece quando há legenda, transcrição ou sugestão do assistente de upload;
- mostra sugestões agrupadas;
- permite adicionar/remover hashtags;
- evita duplicados;
- respeita modo de legendas separadas por rede;
- mostra contador por rede.

Ao adicionar uma hashtag, a regra será explícita:

- Instagram: adicionar ao fim da legenda ou bloco de hashtags;
- LinkedIn/Facebook: adicionar com moderação;
- X/Twitter: limite muito curto;
- TikTok: lista curta.

### 8. Limites por rede social

Implementar limites editoriais por rede:

- Instagram: máximo técnico/editorial 30; excesso marcado a vermelho.
- TikTok: limite recomendado baixo, por exemplo 5.
- LinkedIn: limite recomendado baixo, por exemplo 5.
- Facebook: limite recomendado baixo, por exemplo 5.
- X: máximo recomendado 2 devido ao limite de caracteres.

O sistema deve avisar antes de publicar quando uma rede ultrapassa o limite relevante.

### 9. Regenerar sugestões consome 1 crédito

Adicionar custo dedicado:

- `hashtag_suggestions`: 1 crédito.

A regeneração chama IA e grava log em `ai_usage_log` com feature própria, por exemplo `hashtag_suggestions`.

### 10. Preferências de hashtags de marca

A página `/ai-settings` deve ganhar uma secção simples:

- gerir até 5 hashtags de marca;
- validar formato;
- evitar duplicados;
- guardar na infraestrutura existente (`ai_preferences.brand_hashtags` e/ou `user_brand_hashtags`, conforme o estado real da base de dados);
- usar essas hashtags no grupo “Marca”.

## Alterações técnicas previstas

### Frontend

Criar/alterar:

- `src/lib/hashtags.ts`
  - normalização;
  - extração de hashtags da legenda;
  - deduplicação;
  - limites por rede;
  - aplicação/remoção de hashtags na legenda.

- `src/data/bannedHashtags.ts` ou JSON local equivalente
  - lista inicial curta e conservadora.

- `src/services/hashtags/hashtagService.ts`
  - obter sugestões;
  - consultar cache;
  - regenerar;
  - aplicar classificação local.

- `src/components/manual-post/ai/HashtagSuggestionsBox.tsx`
  - layout compacto;
  - três grupos;
  - badges neutras/risco/marca;
  - ações “Adicionar”, “Remover”, “Regenerar”.

- `src/pages/ManualCreate.tsx`
  - integrar caixa sem alterar o fluxo visual principal;
  - persistir sugestões em `ai_metadata` para retomar rascunhos;
  - marcar campos como editados quando o utilizador altera hashtags.

- `src/pages/AISettings.tsx`
  - secção “Hashtags de marca”.

### Backend / IA

Preferência técnica: criar uma função dedicada `ai-hashtag-suggestions` para manter a prompt fora do cliente e não misturar responsabilidades com outras features.

A função deve:

- autenticar utilizador;
- validar créditos;
- usar Lovable AI via backend;
- devolver output estruturado;
- não chamar APIs externas;
- consultar/gravar `hashtag_metadata` apenas com metadados internos;
- respeitar cache de 7 dias;
- registar uso em `ai_usage_log`.

### Base de dados

A princípio não é necessário criar nova tabela. Usar:

- `hashtag_metadata` para cache interna;
- `ai_usage_log` para auditoria;
- `ai_preferences.brand_hashtags` e/ou `user_brand_hashtags` para marca;
- `posts.ai_metadata` e `posts_drafts.ai_metadata` para persistência por rascunho.

Se a tabela `user_brand_hashtags` existir e estiver com RLS correta, ela será usada para gestão estruturada. Caso contrário, manter em `ai_preferences.brand_hashtags` para evitar migração desnecessária nesta fase.

## Pontos de atenção

1. O Prompt 1 já pede `hashtags_suggested`, mas não as aplica visualmente. Esta fase deve consumir essas sugestões como ponto de partida.
2. A regra “não inventar scores” deve ser aplicada tanto na UI como na prompt da IA.
3. O `volume_estimate` existente não deve aparecer enquanto não houver fonte fiável.
4. O excesso de 30 hashtags no Instagram deve ser tratado como erro/aviso forte, não como “score baixo”.
5. A caixa deve ser compacta e mobile-first para não pesar no `/manual-create`.

## Checklist de aceitação

☐ Não há integração com providers pagos, scraping ou APIs externas de hashtags.  
☐ A UI não mostra scores, volume, alcance estimado ou cores de performance inventadas.  
☐ Hashtags aparecem em três grupos: Alcance, Nicho e Marca.  
☐ Vermelho é usado apenas para risco, banida/evitar ou excesso de limite.  
☐ A IA sugere e classifica editorialmente em pt-PT.  
☐ Hashtags de marca respeitam as preferências do utilizador.  
☐ Regenerar sugestões consome exatamente 1 crédito.  
☐ Segunda consulta à mesma hashtag dentro de 7 dias reutiliza cache interno.  
☐ Exceder 30 hashtags no Instagram é assinalado claramente.  
☐ Se o utilizador editar/remover hashtags, o estado gerado por IA é atualizado.  
☐ Sugestões vindas do assistente de upload são reaproveitadas quando existirem.  
☐ Nenhuma feature das Fases 3 ou 4 é implementada neste prompt.