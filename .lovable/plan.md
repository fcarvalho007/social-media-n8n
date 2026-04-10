
Diagnóstico conclusivo

O erro não é da API externa, nem de dimensão, duração ou peso do vídeo.

A falha acontece antes de qualquer envio para a API de publicação, ainda na fase de upload para o armazenamento interno.

Evidência verificada:
- O toast mostra: “Falha no upload: riverside_v1_[editado] ... .mp4”
- Na base de dados, o último registo falhado (`8bcd334f-0e8b-4264-bce2-7dce28b950c9`) tem `error_log` com a causa exacta:
  `Invalid key: 194915bc-d1b9-4ef1-b440-7802e63e0d4d/1775830554880-riverside_v1_[editado] marketing para equipes pequenas_ gen_marketing_por idiot.mp4`
- Não existem `publication_attempts` para esse `post_id`
- Não há logs do `publish-to-getlate` para esse post

Isto confirma:
1. o ficheiro falhou no upload local;
2. o edge function nem chegou a ser chamado;
3. a API de publicação não é a origem deste erro.

Causa raiz

No `src/hooks/usePublishWithProgress.ts`, o upload usa o nome bruto do ficheiro:
```ts
const fileName = `${user.id}/${fileType}/${timestamp}-${i}-${file.name}`;
```

Esse caminho inclui caracteres problemáticos do nome original (`[ ]`, espaços, underscores e outros padrões), e o storage rejeita a key com `Invalid key`.

O próprio projeto já tem a solução correcta em:
- `src/lib/fileNameSanitizer.ts`
- `src/pages/ManualCreate.tsx`

Nesses pontos, é usado `generateSafeStoragePath(user.id, file)`, que sanitiza o nome antes do upload. O bug está só no fluxo de publicação com progresso, que ficou inconsistente com o resto da app.

Plano de correção

1. Corrigir `src/hooks/usePublishWithProgress.ts`
- substituir o uso de `file.name` bruto por `generateSafeStoragePath(user.id, file)` no upload principal
- aplicar a mesma sanitização no fallback para o bucket `pdfs`
- manter o nome original apenas para mensagens visíveis ao utilizador

2. Unificar a lógica de paths
- reutilizar o helper já existente de sanitização
- evitar duplicação entre `ManualCreate.tsx` e `usePublishWithProgress.ts`

3. Melhorar o diagnóstico de erro
- quando houver erro de upload, guardar no `error_log`:
  - nome original do ficheiro
  - nome sanitizado
  - mensagem técnica do storage
- isto torna o Histórico de Publicações mais útil para suporte

4. Validar no UI
- garantir que o toast mostre algo objectivo, por exemplo:
  “O nome do ficheiro contém caracteres incompatíveis com o upload. O sistema vai corrigir isso automaticamente.”
- evitar mensagens genéricas como se fosse falha de rede ou da API

5. Verificação após implementação
- repetir o publish com esse mesmo vídeo
- confirmar que:
  - o upload já não falha
  - o post avança para `publication_attempts`
  - só depois aparecem logs do `publish-to-getlate`
  - o histórico regista a tentativa completa

Resumo objectivo para si

- Não é a API
- Não há evidência de ser tamanho/duração/dimensões
- O motivo actual e comprovado é o nome do ficheiro no caminho de upload
- A resolução é sanitizar o nome no fluxo `usePublishWithProgress`, tal como já acontece noutras partes da app
