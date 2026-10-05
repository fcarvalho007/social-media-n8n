# Seis modelos de carrossel realmente diferentes

## Auditoria (feita, sem alterações)

- Hoje os seis «estilos» só trocam paleta e par de fontes (`motor/estilos.ts`); posições, grelha e formas ficam iguais — por isso parecem o mesmo modelo com outra cor.
- As posições já podem mudar por slide através das cinco composições existentes (`motor/composicoes.ts`), que medem o texto e recusam quando não cabe (nunca reduzem).
- Limitações do formato partilhado editor/pré-visualização/PNG/PDF (`documento-grafico/nucleo.ts`):
  - pesos só 400 e 700 (não há Black);
  - formas só retângulo e elipse (sem gradiente, sem linhas finas dedicadas, sem ícones vetoriais);
  - imagens com recorte cover/contain, sem máscara.
- Âmbito «Carrossel completo / Só este slide», versões e desfazer já existem e serão reutilizados.

## O que muda para o utilizador

Cada modelo passa a reorganizar a página (posições, grelha, formas, imagem, hierarquia), não só as cores. Pré-visualização e miniaturas mostram a composição real. O texto, § , IDs e ordem nunca mudam; se um modelo não couber num slide, aparece aviso «texto não cabe» e esse slide fica como estava (nunca é cortado nem encolhido).

| Modelo | Composição |
|---|---|
| Editorial | Grelha de margens largas, filetes finos acima/abaixo do título, Playfair rigorosa, capitular no primeiro parágrafo quando o texto o permite, coluna única legível |
| Contraste | Painel assimétrico preto (~40%) + acento vivo controlado, título em caixa sobre o painel, fortíssimo contraste |
| Revista | Título Montserrat Black enorme, composição dramática, forma decorativa que pode sangrar; imagem recortada em forma se existir |
| Fotográfico | Imagem existente do carrossel em fundo total, gradiente para leitura; sem imagem, placeholder ilustrativo marcado «Imagem por escolher» (nunca IA paga) |
| Minimalista | Fundo claro, muito respiro, um único acento, densidade adaptada sem cortar |
| Didático | Número grande do slide, ícone vetorial por função do slide, barra de progresso |

Montserrat + Inter continua o par por defeito; Editorial e Revista usam variações intencionais.

## Detalhes técnicos

1. **Formato partilhado (aditivo, documentos antigos continuam válidos)**
   - `Peso` passa a `400 | 700 | 900`; adicionar Montserrat Black (ficheiro em `public/fontes` + base64 no servidor). Fallback para 700 se a família não tiver 900.
   - `CamadaForma.forma` ganha `"linha"` e `"gradiente"` (cor inicial→final, ângulo); `CamadaForma` ganha `icone?` (conjunto fechado de ~8 caminhos SVG desenhados como vetor no Konva e no renderizador do servidor).
   - Camadas novas marcadas `decorativa: true` são as únicas que podem sair da página; o verificador de transbordo continua a falhar para texto.
2. **Modelos** em `motor/estilos.ts`: cada estilo ganha `compor(pagina, papel, conteudo, medidor)` que devolve a página reposicionada + decorações, reutilizando a medição de `composicoes.ts`. Resultado `{ pagina, cabe, avisos }`.
3. **Aplicar**: `PassoDesign` usa o âmbito existente (todos / só slide); páginas que não cabem são recusadas e listadas com aviso; grava nova versão pelo fluxo CAS atual (histórico/desfazer intactos). Camadas manuais e imagens do utilizador mantidas.
4. **Editor, pré-visualização, PNG/PDF**: desenhar linha/gradiente/ícone/peso 900 em `desenho.ts` (browser) e `nucleo.ts`/`render.server.ts` (servidor); verificar fontes carregadas antes de exportar.
5. **Testes**: geometria distinta entre os seis modelos, texto curto/longo sem overflow, recusa com aviso, só slide 3 preserva os restantes, documentos antigos continuam a abrir.
6. **QA**: prova isolada 72dbadbb (ou cópia de fixture), seis capturas desktop + 393px, PNG/PDF de teste sem publicar; relatório com evidência.

Fora de âmbito: documentos reais, autenticação, segredos, quotas, newsletter, rascunhos sociais, publicação, geração de imagem/IA.

## Riscos

- O ficheiro Montserrat Black aumenta o tamanho da função de exportação (~+150 KB).
- Novos tipos de forma exigem que editor e servidor sejam atualizados juntos; um documento com ícone aberto numa versão antiga do browser cai para retângulo simples.
