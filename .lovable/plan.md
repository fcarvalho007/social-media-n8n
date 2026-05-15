## Diagnóstico

O último post não foi publicado por uma falha interna antes de chegar ao serviço de publicação:

- Post afetado: `A Netflix está a montar uma nova unidade interna...`
- Estado final na base de dados: `failed`
- Erro registado: `instagram_carousel: Invalid time value; linkedin_document: Invalid time value`
- Hora pretendida no rascunho: `21:00:00` Lisboa
- Data guardada no post falhado: `2026-05-14 00:00:00+00`
- Não há registos de tentativa em `publication_attempts` para esse post, o que confirma que a falha aconteceu no frontend antes da função de publicação conseguir registar a tentativa.

A causa provável é incompatibilidade de formato de hora: a UI trabalha com `HH:mm`, mas rascunhos recuperados da base de dados podem trazer `HH:mm:ss`. Esse valor é passado para os seletores e para a serialização de agendamento. Em certos caminhos, isso gera `Invalid time value`.

## Correções propostas

1. Normalizar a hora num único helper seguro
   - Aceitar `HH:mm`, `HH:mm:ss`, `Date`, `null` e valores inválidos.
   - Converter sempre para `HH:mm` para a UI.
   - Validar limites reais: `00-23` e `00-59`.
   - Usar fallback seguro `12:00` apenas quando o valor estiver inválido.

2. Aplicar a normalização nos pontos críticos
   - Ao carregar rascunhos em `useDraftRecovery`.
   - Antes de construir `effectiveScheduledDate` em `ManualCreate`.
   - Antes de chamar `executePublish` em `usePublishOrchestrator`.
   - Antes de enviar `scheduled_time` para a função `publish-to-getlate` em `usePublishWithProgress`.

3. Corrigir o agendamento de publicação imediata vs agendada
   - Para posts agendados, enviar a data/hora combinada corretamente em Lisboa.
   - Evitar passar apenas a data a `scheduledDate` quando `scheduleAsap=false`.
   - Garantir que o cálculo “data futura” usa a data + hora, não apenas meia-noite do dia.

4. Tornar a função `publish-to-getlate` mais tolerante
   - Normalizar `scheduled_time` no backend antes de fazer `new Date(...)`.
   - Se a hora vier inválida, devolver erro claro: “Hora de agendamento inválida”, em vez de cair em “Desconhecido”.
   - Manter `timezone: Europe/Lisbon` no payload.

5. Melhorar o feedback de erro
   - Classificar `Invalid time value` como erro de agendamento, não como erro desconhecido.
   - Mostrar uma mensagem útil: “A hora guardada no rascunho estava num formato inválido. Escolhe novamente a hora.”

6. Validação
   - Criar testes unitários para normalização de hora: `21:00`, `21:00:00`, `9:5`, inválidos e vazios.
   - Testar manualmente o fluxo com rascunho agendado para hoje às 21:00 Lisboa.
   - Confirmar que a publicação já regista tentativa em `publication_attempts` antes de qualquer falha externa.

## Ficheiros previstos

- `src/lib/scheduling/time.ts` ou helper equivalente novo
- `src/pages/ManualCreate.tsx`
- `src/hooks/manual-create/useDraftRecovery.ts`
- `src/hooks/manual-create/usePublishOrchestrator.ts`
- `src/hooks/usePublishWithProgress.ts`
- `supabase/functions/publish-to-getlate/index.ts`
- `src/lib/publishingErrors.ts`
- testes unitários correspondentes

## Nota operacional

Não vou marcar automaticamente o post antigo como publicado, porque não há evidência de envio para Instagram/LinkedIn. A correção evita que o mesmo rascunho volte a falhar por hora inválida; depois poderás republicar a partir do rascunho/recuperação.