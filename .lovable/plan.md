

## Refinamentos à Grid de Conteúdos e Calendário

### Problemas encontrados na auditoria

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **`template_a_images[0]` frequentemente é um `.mp4`** — Muitos posts têm vídeos como primeiro item. O `<img>` falha silenciosamente ao tentar renderizar um vídeo. | Thumbnails aparecem em branco/erro |
| 2 | **`getPostThumbnail` não filtra vídeos** — A cascata retorna URLs de `.mp4` que não funcionam como thumbnails em `<img>` | Fallback nunca activado para posts de vídeo |
| 3 | **Diálogo de detalhes (linha 1659) ignora `getPostThumbnail`** — Usa `template_a_images` directamente, sem cascata nem detecção de vídeo | Inconsistência entre grid e diálogo |
| 4 | **`cover_image_url` nunca é preenchido** — Está sempre `null` na BD. A cascata salta este passo sem efeito | Sem impacto mas inútil como fonte prioritária |
| 5 | **Nenhum post usa `media_items`** — Sempre `[]`. A cascata tenta mas nunca encontra nada | Sem impacto prático |
| 6 | **`media_urls_backup` tem URLs válidas** — Incluindo imagens `.png`, mas a cascata só chega lá se as anteriores falharem. Quando `template_a_images[0]` é um `.mp4`, retorna o `.mp4` sem verificar se é imagem | Backup nunca usado quando deveria |

### Plano de correcção (1 ficheiro: `src/pages/Calendar.tsx`)

**1. Adicionar detecção de vídeo à `getPostThumbnail`**

Função helper `isVideoUrl(url)` que verifica extensões `.mp4`, `.mov`, `.webm`, `.avi`. A cascata deve saltar URLs de vídeo e procurar a primeira URL de imagem em todas as fontes:

```
Ordem de prioridade:
1. cover_image_url (se imagem)
2. Primeira imagem em template_a_images (saltar vídeos)
3. Primeira imagem em media_urls_backup (saltar vídeos)
4. Primeira imagem em media_items (saltar vídeos)
5. null → placeholder com ícone de vídeo ou título
```

**2. Mostrar ícone de vídeo no placeholder quando o post é vídeo**

Se `getPostThumbnail` retorna `null` mas o post tem URLs de vídeo, o placeholder deve mostrar ícone de `Video` em vez de `LayoutGrid`, com o título do post. Isto distingue visualmente "post de vídeo sem thumbnail" de "post sem média".

**3. Usar `getPostThumbnail` no diálogo de detalhes**

O diálogo (linha 1659) deve usar `getPostThumbnail` para a imagem principal. Se o post só tem vídeos, mostrar placeholder adequado em vez de tentar renderizar `.mp4` como `<img>`.

**4. Detectar tipo de conteúdo (vídeo vs imagem) para o carrossel do diálogo**

O carrossel de imagens no diálogo deve filtrar vídeos das `template_a_images` e mostrar apenas imagens. Se todas forem vídeos, mostrar placeholder com ícone de vídeo.

### Resultado esperado
- Posts com imagens → thumbnails correctos na grid e diálogo
- Posts com vídeos → ícone de vídeo limpo + título (não "erro ao carregar")
- Posts mistos (imagens + vídeos) → primeira imagem como thumbnail
- Consistência visual em todos os locais (grid lateral, células do calendário, diálogo)

