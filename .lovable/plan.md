## Objetivo

Fechar as fases que ficaram apenas na UI/persistência, ligando `network_options` ao payload real enviado ao Getlate e corrigindo a interface para pt-PT.

## Constatação atual

As opções por rede já existem na interface, são validadas e são enviadas do frontend para `publish-to-getlate`. O bloqueio principal está no backend: a função recebe `network_options`, mas o payload final ainda usa quase só `content`, `platforms`, `mediaItems`, `publishNow`/`scheduledFor` e `contentType` básico.

## Plano de execução

### 1. Corrigir copy pt-PT na secção “Opções por rede”

Atualizar `src/components/manual-post/steps/NetworkOptionsCard.tsx` para remover texto em inglês visível:

- “First comment” → “Primeiro comentário”
- “Collaborators” → “Colaboradores”
- “Public (Anyone)” → “Público”
- “Unlisted (Link only)” → “Não listado”
- “Private (Only you)” → “Privado”
- categorias YouTube com labels em pt-PT, mantendo os IDs/valores técnicos corretos
- CTAs Google Business em pt-PT:
  - Reservar
  - Encomendar online
  - Comprar
  - Saber mais
  - Inscrever
  - Ligar agora

Também corrigir a mensagem das tags de fotografia: a UI deve dizer claramente que, nesta versão, a tag é adicionada ao centro, sem prometer clique direto na imagem.

### 2. Normalizar os tipos de opções para o contrato Getlate

Atualizar `src/types/networkOptions.ts` para alinhar os valores guardados com o que a API aceita:

- YouTube:
  - `categoryId` em vez de categoria por nome, usando IDs oficiais comuns.
  - manter `visibility` como `public | unlisted | private`.
- Google Business:
  - mapear os valores atuais (`book`, `order_online`, `buy`, `learn_more`, `sign_up`, `call_now`) para o contrato Getlate:
    - `BOOK`
    - `ORDER`
    - `SHOP`
    - `LEARN_MORE`
    - `SIGN_UP`
    - `CALL`
- Instagram:
  - transformar `photoTags.slideIndex` para `mediaIndex` no payload.
  - transformar `formatVariant: reel` para `contentType: reels` e `story` para `contentType: story`.

### 3. Ligar `network_options` dentro de `publish-to-getlate`

Atualizar `supabase/functions/publish-to-getlate/index.ts` para:

- aceitar `network_options` no `PublishPayload`;
- validar defensivamente os campos usados;
- construir `platformSpecificData` a partir da rede/formato/opções;
- anexar esse objeto no payload final enviado ao Getlate.

Mapeamento previsto:

```text
Instagram
- firstComment -> platformSpecificData.firstComment
- collaborators -> platformSpecificData.collaborators
- photoTags -> platformSpecificData.userTags[{ username, x, y, mediaIndex }]
- story -> contentType: "story"
- reel -> contentType: "reels"

Facebook
- firstComment -> platformSpecificData.firstComment
- story -> contentType: "story"
- reel -> contentType: "reel"

LinkedIn
- firstComment -> platformSpecificData.firstComment
- disableLinkPreview -> platformSpecificData.disableLinkPreview
- mentions ficam preservadas no texto já inserido; não serão convertidas para URNs nesta fase sem validação adicional

YouTube
- title -> platformSpecificData.title
- visibility -> platformSpecificData.visibility
- categoryId -> platformSpecificData.categoryId
- firstComment só será adicionado se vier a existir no tipo; nesta fase a UI atual não expõe primeiro comentário para YouTube
- tags: não aparecem no contrato de criação consultado; ficam guardadas, mas não serão enviadas até confirmar campo oficial

Google Business
- ctaEnabled + ctaType + ctaUrl -> platformSpecificData.callToAction
- CALL não envia URL
- restantes CTAs exigem URL válido
```

### 4. Corrigir validações finais antes de publicar

Adicionar validações no backend para evitar payloads inválidos:

- ignorar first comment em Stories;
- limitar colaboradores Instagram a 3;
- só enviar tags de fotografia Instagram em imagens/carrosséis, não em vídeos/Reels;
- garantir `x` e `y` entre 0 e 1;
- garantir `mediaIndex` dentro do número de média;
- garantir título YouTube até 100 caracteres;
- garantir CTA Google Business com URL quando o tipo não é chamada telefónica.

Se uma opção avançada estiver inválida, a publicação deve falhar antes de chamar o Getlate com uma mensagem clara em pt-PT.

### 5. Registar avisos e telemetria

Persistir no `publication_attempts.response_data` o payload efetivo ou, pelo menos, uma secção `network_options_applied` para permitir auditoria posterior.

Para first comment: como o Getlate trata o first comment dentro da mesma criação do post, não haverá uma chamada separada nesta fase. Se o Getlate devolver falha específica do comentário dentro de `failedPlatforms`, será registada como erro da tentativa. A regra “post publicado com aviso se o comentário falhar” só é possível se a API devolver sucesso do post e aviso separado do comentário; se esse padrão aparecer nos logs, tratamos numa fase posterior.

### 6. Validar compilação e fluxo crítico

Depois das alterações:

- correr build TypeScript;
- testar o payload gerado para pelo menos:
  - Instagram feed com primeiro comentário e colaboradores;
  - Instagram story sem primeiro comentário;
  - LinkedIn com primeiro comentário e link preview desligado;
  - YouTube com título, visibilidade e categoria;
  - Google Business com CTA.

## Fora desta execução

- Menções LinkedIn com URNs reais: manteremos inserção textual, porque exige validação/lookup de perfis.
- Tags Instagram por clique real na imagem: manter “adicionar no centro” com copy honesta.
- Tags YouTube no payload: a documentação consultada não confirma campo oficial para criação, apesar de indicar limite de tags; evitar enviar campos inventados.
- Correções RLS/buckets públicos: continuam fora desta fase por serem intervenção de segurança separada.
- Fase 3.2 de reescrita por tom: só avançar depois desta ligação final de publicação estar fechada.

## Ficheiros previstos

- `src/components/manual-post/steps/NetworkOptionsCard.tsx`
- `src/types/networkOptions.ts`
- `supabase/functions/publish-to-getlate/index.ts`
- `.lovable/plan.md`

Não serão editados ficheiros bloqueados:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- chaves de projeto em `supabase/config.toml`

## Checkpoint

☐ Textos da secção “Opções por rede” corrigidos para pt-PT  
☐ `network_options` mapeado para `platformSpecificData` no payload Getlate  
☐ YouTube envia título, visibilidade e categoria por ID  
☐ Instagram envia first comment, colaboradores, user tags e tipo correto quando aplicável  
☐ LinkedIn envia first comment e `disableLinkPreview`  
☐ Facebook envia first comment e tipo correto quando aplicável  
☐ Google Business envia CTA no formato aceite  
☐ Build executado e fluxo crítico validado antes de avançar para nova fase