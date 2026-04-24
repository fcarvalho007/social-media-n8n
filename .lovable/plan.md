## Diagnóstico

O erro foi provocado pela backend function `publish-to-getlate`: a API externa de publicação respondeu com falha total (`"All platforms failed"`) e a nossa função converteu isso num HTTP 500. O frontend tratou esse 500 como erro de runtime, por isso apareceu o overlay “Runtime error / Try to fix”, apesar de o fluxo já ter lógica para mostrar erros de publicação dentro do modal.

Pelos logs recentes, a publicação multi-rede desse momento teve várias plataformas bem-sucedidas depois: TikTok, YouTube e Facebook aparecem como publicadas. Isto sugere que uma das plataformas/formats falhou temporariamente ou devolveu uma resposta genérica, mas o erro foi mal propagado como crash global em vez de erro controlado por plataforma.

## Plano de correção

1. Tornar a função de publicação resiliente a falhas esperadas
   - Em `supabase/functions/publish-to-getlate/index.ts`, deixar de fazer `throw new Error(...)` para falhas conhecidas da API externa como `All platforms failed`.
   - Devolver sempre JSON estruturado com `success: false`, `error.code`, `error.source`, `isRetryable` e `suggestedAction`.
   - Para falhas recuperáveis/temporárias, devolver HTTP 200 com `success: false` para impedir o overlay de runtime e permitir que o frontend mostre o erro no modal.
   - Manter HTTP 401/403/400 apenas para erros internos reais de autenticação, autorização ou pedido inválido.

2. Melhorar a classificação de `All platforms failed`
   - Classificar esse erro como falha temporária do serviço/plataforma, não como `UNKNOWN`.
   - Se existirem detalhes em `failedPlatforms`, extrair e mostrar a causa por rede.
   - Se não existirem detalhes, usar copy pt-PT clara: “O serviço de publicação rejeitou temporariamente esta rede. A publicação pode já estar em processamento; verifica o histórico antes de repetir.”

3. Endurecer o frontend contra erros de backend function
   - Em `src/hooks/usePublishWithProgress.ts`, tratar `publishError` sem lançar exceções globais.
   - Usar o corpo JSON estruturado quando existir, mesmo que venha como erro HTTP.
   - Confirmar no fim via base de dados se alguma rede foi publicada antes de marcar tudo como falhado.
   - Se houver sucesso parcial, manter o post como publicado/parcial e guardar o detalhe das redes falhadas no `error_log`, sem bloquear o utilizador com crash.

4. Corrigir inconsistências detetadas nos logs
   - O backend está a considerar respostas 201 como sucesso, mas nem sempre extrai `platformPostUrl` de dentro de `post.platforms[]`. Vou melhorar a extração de URL para YouTube/Facebook/TikTok/Instagram quando a API externa a devolve nested.
   - Isto melhora o histórico/calendário e reduz falsos “sem link”.

5. Melhorar UX do erro no modal
   - Atualizar `src/lib/publishingErrors.ts` para reconhecer `All platforms failed`, `failedPlatforms` e erros genéricos da API externa.
   - Atualizar `PublishProgressModal` se necessário para mostrar “falha temporária / verificar histórico” em vez de “erro desconhecido”.

6. Verificação
   - Rever os testes existentes de publicação/validação e acrescentar ou ajustar testes para:
     - `All platforms failed` não gerar crash.
     - resposta `success:false` com HTTP 200 ser apresentada como erro de plataforma.
     - sucesso parcial continuar a ser sucesso parcial.
     - URLs nested em `platformPostUrl` serem persistidos.
   - Executar validação TypeScript e testes focados após implementação.

## Ficheiros previstos

- `supabase/functions/publish-to-getlate/index.ts`
- `src/hooks/usePublishWithProgress.ts`
- `src/lib/publishingErrors.ts`
- Possivelmente `src/components/publishing/PublishProgressModal.tsx`
- Testes focados existentes/novos junto dos módulos afetados

## Checkpoint

☐ Backend function deixa de transformar falhas recuperáveis em runtime 500
☐ `All platforms failed` passa a ter mensagem acionável em pt-PT
☐ Frontend mostra falhas no modal, sem ecrã de erro
☐ Sucessos parciais continuam preservados
☐ Links externos nested passam a ser extraídos quando disponíveis
☐ TypeScript e testes focados ficam verdes