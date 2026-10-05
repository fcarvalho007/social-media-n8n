# Imagens, efeitos visuais e envio direto para redes sociais

Mantém-se a regra aprovada: um só documento e um só renderer para o canvas, a pré-visualização, o histórico, a reabertura e a exportação. A origem da imagem nunca define o design.

## Parte A — «Preparar publicação» envia diretamente para a criação social

Já existe: o passo 5 cria um rascunho social e abre `/manual-create?draft=…`, com o formato Carrossel Instagram + documento LinkedIn, os PNG e o PDF, e a legenda que vem da Narrativa. Hoje esse botão só fica ativo depois de exportar à mão e esperar que a exportação termine.

O que vai mudar:
- **Um botão:** «Enviar para redes sociais». Revê a versão atual, pede a exportação se ainda não existir e mostra o progresso. Quando a exportação termina, cria o rascunho e abre a criação social com o carrossel escolhido, os ficheiros carregados e a legenda proposta.
- **Sem reimportar:** os ficheiros entram tal como saíram do Compositor.
- **Legenda proposta:** por omissão é a legenda da Narrativa, sem custo.
- **Melhorar legenda com IA (opcional):** fica disponível só depois de confirmares que é um pedido pago, com o custo indicado quando for conhecido. Usa a ligação de texto já existente e as reservas e limites atuais. Se o resultado ficar desconhecido, não se repete.
- **Avisos que continuam a bloquear o envio:** texto que não cabe, versão alterada entretanto, ou exportação falhada.
- **Nada de publicação automática:** o rascunho fica à espera da tua decisão em `/manual-create`.

## Parte B — Fontes de imagem por slide

O painel «Imagem» oferece estas fontes: Automático · Biblioteca · Pexels · Upload · Gerar com IA · Sem imagem.

- **Automático** decide primeiro se o slide precisa de imagem, conforme o papel do slide:
  - dado, comparação, ações e transição: normalmente sem fotografia;
  - conceito: desenho do próprio sistema, ou IA;
  - caso prático: Pexels ou Biblioteca;
  - capa e história visual: Pexels, Biblioteca ou IA.

  A fonte recomendada aparece como sugestão. Nunca há geração automática paga.
- **Gerar com IA / Regenerar com IA** reutilizam a geração Kie que já existe. Antes de gerar aparece «Geração com IA — 1 pedido pago», com o custo quando for conhecido. O resultado fica guardado como qualquer outra imagem; para o desenho é igual a Pexels ou Upload.
- **Trocar a fonte** troca só a imagem. Mantêm-se o modo, a posição do texto, o sombreado, os efeitos e o foco (sempre que a proporção o permita).

## Parte C — Intenção visual, termos de pesquisa e prompt

Cada página passa a guardar três campos:
- **Intenção visual:** a ideia da imagem, proposta pela Narrativa. Os carrosséis antigos usam o título e o texto do slide.
- **Termos Pexels:** derivados da intenção visual e sempre editáveis.
- **Prompt IA:** gerado automaticamente a partir da intenção visual, do título e texto, do papel do slide, do estilo, da variante e da paleta, do modo da imagem e da posição do texto. Inclui sujeito e ação, ambiente, ângulo de câmara, luz, profundidade de campo, composição, posição do sujeito, espaço livre para o texto, paleta, estilo e formato 1080×1350.
  - Texto à esquerda pede o sujeito à direita, e o inverso para texto à direita.
  - Texto em baixo pede o sujeito no topo ou ao centro.
  - Modo «Hero» pede o sujeito legível no terço superior.
  - Modo «Fundo total» pede um enquadramento de cinema com zona segura para o texto.
  - Proibido em todos os casos: texto, letras, números, logótipos, etiquetas, interfaces, gráficos com texto e sinalética.

  O prompt é visível e editável antes de confirmar a geração.

## Parte D — Efeitos visuais definidos pela direção visual

- **Efeitos por estilo e variante:** gradiente, vinheta, vidro (glass), brilho, sombra, contorno, grelha, textura e filete de destaque. Cada estilo tem valores próprios, por exemplo:
  - Editorial: filetes e gradiente subtil, sem brilho;
  - Fotográfico: gradiente de cinema, vinheta, vidro e desfoque localizado;
  - Minimalista: quase sem efeitos.
- **Cores dos efeitos:** as cores do gradiente, do brilho e dos contornos vêm da paleta (o tom escuro Navy em vez de preto, nunca ciano fixo). Trocar de paleta muda só as cores, nunca a intensidade nem a posição.
- **Gradiente da capa:** a fotografia fica quase intacta no terço superior, a transição é gradual e a proteção de contraste aumenta na zona do título até à base. Fica horizontal quando o texto está ao lado.
- **Transição «Hero»:** a passagem da fotografia para o fundo da paleta é contínua, sem linha de corte.
- **Tratamento da imagem por estilo:** brilho, contraste, saturação, desfoque e opacidade, com valores de partida por estilo (por exemplo, Fotográfico com brilho 0,90, contraste 1,05 e saturação 0,95).
- **Desenhos próprios dos slides sem foto:**
  - dado: número grande;
  - comparação: dois painéis;
  - transição: X → Y com seta;
  - ações: 3 cartões numerados;
  - caso prático: fotografia no topo e linha temporal opcional.

  Cada um recebe os efeitos do estilo.
- **Na interface:** o painel Imagem ganha «Sombreado: Automático / Nenhum / Gradiente / Vinheta / Glass», a intensidade e o reposicionamento. Em «Personalizar › Efeitos» ficam o gradiente, a vinheta, o brilho, o vidro e a sombra, recolhidos por omissão.

## Testes de aceitação
- Capa com Pexels e capa com IA dão exatamente o mesmo desenho e os mesmos efeitos.
- Trocar Pexels por IA muda só a imagem.
- Regenerar com IA não altera o texto nem os elementos gráficos.
- O gradiente da capa e a transição «Hero» ficam iguais no editor e no PNG exportado.
- O brilho muda de cor com a paleta, sem mudar a intensidade nem a posição.
- O Editorial não recebe brilho, grelha luminosa nem riscas.
- O Fotográfico mantém o gradiente, a vinheta e a fotografia em fundo total.
- No mesmo slide, Pexels → Biblioteca → Upload → IA mantêm o texto, o modo, o gradiente, o foco, os efeitos e o estilo.
- O envio para redes sociais abre a criação social com os ficheiros e a legenda certos, sem publicar.

Todos os testes usam simulador ou uma prova isolada. Nenhuma geração com IA nem legenda paga corre sem a tua autorização específica.

## Fora de âmbito
Publicação automática; alterações a autenticação, segredos ou quotas; alterar documentos reais.

## Detalhes técnicos
- **Documento:** a página ganha `visual_intent`, `visual_query` e `visual_prompt` em `composicao`. Os efeitos ficam em `sistema.efeitos` (valores de partida derivados de estilo e variante) e em `composicao.efeitos` (ajustes por página). O validador em `nucleo.ts` aceita estes campos novos e os documentos antigos continuam válidos.
- **Renderer partilhado:** acrescenta-se ao SVG/resvg e ao Konva o filtro de imagem (brilho, contraste, saturação, desfoque), o brilho em formas e números, a sombra, o vidro (um retângulo com desfoque da imagem por trás e véu da paleta) e um gradiente com várias paragens. Um teste compara os pixels do SVG do servidor com os do editor.
- **Novos módulos:**
  - `motor/efeitos.ts`: a tabela de efeitos por estilo e variante, e a função que os aplica;
  - `motor/promptVisual.ts`: um construtor determinístico do prompt, sem IA;
  - `inferirFonte(papel)`: decide se o slide precisa de imagem e qual a fonte a sugerir.
- **Narrativa:** o pedido à Narrativa passa a incluir `tema_visual` por slide, além de `papel_visual`.
- **Envio para redes sociais:** na `RevisaoExportacao`, o encadeamento é revisão → `pedirExportacao` → espera pelo estado → `prepararRascunho` → abrir `/manual-create?draft=`. A legenda vem de `proposta.legenda`. A melhoria opcional é uma ação nova no `mc-motor` (DeepSeek direto, reservada, sem repetição automática) que grava na proposta; não usa o Lovable AI Gateway.
- **Kie:** reutiliza `kie_gerar` com o prompt construído; mantém-se uma reserva por clique.
- **Migrações:** nenhuma prevista; os dados novos ficam dentro do documento JSON versionado.
