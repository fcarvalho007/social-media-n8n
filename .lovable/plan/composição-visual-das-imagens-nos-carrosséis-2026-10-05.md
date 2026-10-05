# Composição visual das imagens nos carrosséis

## Auditoria (feita)

| Função | Onde está hoje | Problema |
|---|---|---|
| Papel do slide | `motor/proposta.ts`: só capa / contexto / desenvolvimento / fecho; o ritmo infere "dado_chave" e outros em `composicoes.ts` | Não há papéis data / concept / comparison / case_study / actions / conclusion persistidos |
| Layouts | `modelos.ts` (6 estilos) + `sistema.ts` (variante B em espelho, quebras 3/5/8) | A imagem é tratada como mais uma camada; não há modo de imagem |
| Imagens guardadas | `mc_assets` (origem biblioteca / kie / upload / pexels) | A origem não interfere no layout (bom); falta guardar a composição por slide |
| Posicionar imagem | `CamadaImagem` com recorte cover/contain e `foco` (x, y) | O foco existe mas nada o define; a imagem nunca se alinha à grelha de texto |
| Gradiente | `CamadaForma "gradiente"`: só vertical, de cima para baixo | Sem direção (esquerda / direita / centro), sem intensidade, sem tokens da paleta |
| Design, Composição e exportação | `nucleo.ts` (desenho no servidor e PNG) + `desenho.ts` (editor Konva) a partir do mesmo documento | Já é um único renderer; a nova camada só tem de gerar camadas desse documento |

A nova camada encaixa entre o sistema visual e o documento: `papel + composição da imagem → camadas`, dentro de `aplicarSistema`. Assim Design, Composição e exportação continuam a usar o mesmo desenho.

## O que muda para o utilizador
- Cada slide tem um papel visual: capa, standard, história visual, dado, conceito, comparação, caso prático, transição, ações ou conclusão. É inferido sem IA paga a partir do texto e da estrutura, e pode ser alterado.
- Em modo «Automático», o motor escolhe o modo de imagem segundo o papel, o estilo, a variante, a densidade do texto e a existência de imagem: sem imagem, fundo total, hero, contida ou dividida.
  - Exemplos: um slide de dado e um de conceito ficam sem fotografia; um caso prático fica com hero.
- **Capa com foto:** imagem em fundo total, foco no terço superior e gradiente a partir de cerca de 38%, com a cor escura da paleta. Fica título e uma frase; se a descrição tiver mais de 2 linhas, há aviso e nunca corte.
- **Gradiente:** depende da posição do texto (em baixo, à esquerda, à direita ou ao centro em vinheta) e usa as cores da paleta.
- **Imagem contida:** fica com a mesma largura e as mesmas margens da coluna de texto.
- **Painel «Imagem» na Composição** (recolhido por omissão):
  - substituir imagem (Biblioteca, Pexels, Carregar, IA);
  - reposicionar o foco;
  - modo, overlay (automático, nenhum, gradiente, vinheta) e intensidade;
  - posição do texto.
- Estas escolhas manuais passam a ser fixas:
  - trocar de paleta só muda cores;
  - trocar de estilo ou variante avisa antes de as substituir.
- **Carrosséis antigos:** ficam exatamente como estão até se carregar em «Aplicar sistema visual».

## Matriz de partida: papel → modo de imagem
Com imagem disponível. Sem imagem, cai sempre para «sem imagem», com um design próprio do papel.

| Papel | Editorial | Contraste | Revista | Fotográfico | Minimalista | Didático |
|---|---|---|---|---|---|---|
| capa | fundo total | dividida | fundo total | fundo total | contida | hero |
| standard | contida | dividida | hero | fundo | contida | contida |
| história visual | hero | dividida | fundo total | fundo total | hero | hero |
| dado | sem imagem | sem | sem | fundo + valor | sem | sem (ícone) |
| conceito | sem | sem | sem | fundo | sem | sem (ícone) |
| comparação | sem (2 colunas) | sem | sem | dividida | sem | sem |
| caso prático | hero | dividida | hero | fundo total | contida | hero |
| transição | sem | sem (painel) | fundo total | fundo total | sem | sem |
| ações | sem (lista) | sem | sem | sem | sem | sem (números) |
| conclusão | contida | sem (painel) | fundo total | fundo total | sem | sem |

A variante B troca a posição do texto e da imagem (esquerda e direita, ou topo e base) e o lado do gradiente.

## Detalhes técnicos
1. **Fase 1 – dados (aditivo):**
   - Nova tabela `mc_composicao_paginas` (trabalho_id, variante, slide_id, papel, image_source, asset_id, image_mode, text_region, subject_region, foco x/y, overlay_type, overlay_direction, overlay_intensity, visual_query, visual_reason, overrides jsonb, versão). Escrita só através de uma RPC com CAS e `mc_pode_escrever`; leitura por RLS.
   - Tipos partilhados em `motor/imagem.ts`.
2. **Fase 2–3 – renderer:**
   - `CamadaForma "gradiente"` ganha `direcao` (base, topo, esquerda, direita, vinheta), `inicio` e `intensidade`, como campos opcionais: documentos antigos ficam iguais.
   - Desenho do gradiente em `nucleo.ts` (servidor e PNG) e em `desenho.ts` (editor), a partir do mesmo cálculo.
   - Novo `comporImagem(pagina, papel, composicao, paleta, estilo, variante, medidor)` que gera imagem, gradiente e posições de texto para cada modo; recusa com aviso quando o texto não cabe.
3. **Fase 4 – automático:**
   - `inferirPapel(slide)` determinístico (números → dado, «vs» ou dois blocos → comparação, listas → ações, nomes ou exemplos → caso prático, último → conclusão).
   - `escolherModo(...)` com a matriz acima e regras de densidade.
4. **Fase 5 – origens:** Biblioteca, Pexels, Upload e Kie passam todas por `asset_id`, sem lógica própria por origem. A pesquisa no Pexels vem preenchida com uma sugestão de termos em inglês, derivada do título.
5. **Fase 6 – interface:** painel «Imagem» no editor e «Papel do slide» no Design; overrides gravados na tabela.
6. **Fase 7 – testes e QA:**
   - Os 12 testes pedidos: overlay esquerda/direita, foco no recorte, «sem imagem» sem espaço vazio, hero no topo, contida alinhada à grelha, paleta sem mudar recorte nem imagem, troca de imagem sem mudar texto, Pexels = Biblioteca, preview = composição (hash), exportação preservada.
   - QA visual numa fixture de 8 slides (capa fotográfica, contida, dado, dividida, conceito, caso prático, comparação, conclusão), desktop e 393px, mais PNG de teste sem publicar.
   - Imagens só da biblioteca ou do Pexels (gratuito), nunca IA paga.

## Fora de âmbito
- Geração de prompts por IA para imagens: fica só o campo `visual_prompt` guardado para uso manual.
- Documentos reais, publicação, autenticação, quotas, newsletter.

## Riscos
- Ronda grande: várias fases tocam no renderer partilhado. Cada fase fecha com testes antes de passar à seguinte.
- Inferir o papel sem IA erra em textos ambíguos; por isso o papel é editável e mostrado.
- Os gradientes multi-direção têm de dar o mesmo resultado no Konva e no servidor; um teste compara os pixels do PNG.
