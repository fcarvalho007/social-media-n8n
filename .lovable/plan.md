# Fecho dos modelos de carrossel: QA, capitular, recorte, avisos

Ordem obrigatória: primeiro a QA (parte 1). As partes 2 a 4 só avançam depois de a QA estar fechada. Se a capitular ou o recorte obrigarem a uma mudança estrutural grande, paro e explico antes de a fazer.

## 1. QA no navegador e exportação (sem IA paga)
- Uso uma prova separada, nova e marcada como teste, criada pelo fornecedor simulado (custo 0). A 72dbadbb fica intacta.
- Em desktop (1280px) e telemóvel (393px), no passo Design: verificar as seis miniaturas, «Carrossel inteiro» e «Só este slide», sem sobreposições.
- Trocar o modelo só no slide 3, aplicar (cria 1 versão nova) e ler essa versão no servidor: os slides 1, 2, 4 e 5 e a variante B têm de ficar iguais, byte a byte.
- Undo: voltar à versão anterior e confirmar que o servidor regista o estado reposto.
- Exportar o PDF LinkedIn real e PNG da prova pelo caminho normal de exportação. Comparar com capturas do editor: fontes (Playfair, Montserrat 900, Inter), gradiente, ícones e posições. Os ficheiros ficam guardados como evidência e não são publicados.

## 2. Capitular no Editorial
- É um elemento visual calculado a partir do corpo, não gravado no texto: a primeira letra aparece grande ao lado e o corpo começa com recuo nas primeiras linhas.
- O texto narrativo continua a ter a letra, por isso nada se perde nem fica duplicado, e a fonte (§) não muda.
- Editor, pré-visualização, PNG e PDF usam a mesma função de desenho.
- Se o corpo começar por número, aspas ou for muito curto, não há capitular.

## 3. Recorte da imagem na Revista
- A máscara (forma diagonal ou arco) fica guardada como propriedade da imagem e é aplicada pela mesma função no editor e na exportação.
- O texto continua fora da área recortada. Sem imagem, nada muda.

## 4. Avisos antes de exportar
- **Notas manuais com pouco contraste:** usam a mesma medição de contraste por elemento que já existe. Aparece um aviso com o botão opcional «Adaptar cor». Se não o carregares, a tua cor fica.
- **«Imagem por escolher»:** antes de exportar, aparece um aviso com três ações: «Escolher imagem», «Mudar modelo» ou «Exportar rascunho de teste». O rascunho de teste sai com a marca de água «Rascunho — imagem por escolher». A exportação final fica bloqueada enquanto houver o marcador.

## Detalhes técnicos
- `_shared/motor/modelos.ts`: `capitular` derivado em render (sem novo campo de texto); `mascara` opcional nas formas de imagem. `desenho.ts` / `PaginaCanvas.tsx` / render do servidor partilham o recorte (clipFunc no Konva, o mesmo path no export).
- Preflight no fluxo de exportação existente; a marca de água é só no modo rascunho. Não há mudanças nas tabelas, permissões, autenticação, quotas ou segredos.
- Testes dirigidos: capitular sem perda nem duplicação, máscara igual no editor e no export, aviso de contraste, preflight do marcador. Tipos, compilação e verificação do grafo Deno no fim. Republicar o mc-motor se o código partilhado mudar.
- As capturas e os ficheiros de exportação ficam em /mnt/documents/qa-modelos-fecho/.
