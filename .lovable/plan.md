

## Correcções à Biblioteca de Média

### Problema 1: Vídeos sem thumbnail
Os vídeos mostram apenas um ícone cinzento porque `thumbnail_url` é quase sempre `null`. A solução é usar um elemento `<video>` com `preload="metadata"` para extrair o primeiro frame automaticamente, sem depender de uma imagem de thumbnail armazenada.

### Problema 2: Aviso de retenção de 7 dias ausente
Conforme documentado, o sistema elimina ficheiros do Storage após 7 dias. O utilizador deve ver este aviso claramente na biblioteca.

### Plano (1 ficheiro: `src/pages/MediaLibrary.tsx`)

**1. Substituir placeholder de vídeo por `<video>` nativo**

Na grid (linhas 732-752), quando o item é vídeo e não tem `thumbnail_url`:
- Renderizar `<video src={item.file_url} preload="metadata" muted className="h-full w-full object-cover" />` para mostrar o primeiro frame
- Manter o ícone de vídeo como overlay semi-transparente (para distinguir de imagens)
- Fallback para ícone se o vídeo falhar a carregar (`onError`)

Quando o item é vídeo e tem `thumbnail_url`:
- Manter a lógica actual (img com fallback para `<video>`)

**2. Adicionar banner de retenção após o header**

Após a linha 608 (fim do header), inserir um alerta informativo:
- Ícone de `Clock` + texto: "Os ficheiros são eliminados automaticamente após 7 dias para sustentabilidade do sistema"
- Estilo: banner subtil (`bg-amber-500/10 border-amber-500/20`), compacto
- Dismissível via botão X (estado local `showRetentionWarning`)

**3. Aplicar mesma lógica no diálogo de detalhes**

O modal de detalhes (linha ~900) também deve usar `<video>` para preview de vídeos em vez de tentar `<img>`.

### Resultado
- Vídeos mostram o primeiro frame real na grid
- Utilizador informado da política de 7 dias
- Consistência visual entre grid e detalhes

