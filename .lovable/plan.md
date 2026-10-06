# Marcas, leitura de imagens e barra lateral do compositor

## 1. Marca / projeto no passo «1 Fonte»

Hoje o seletor só lista os projetos existentes ("Carrouseis especiais", "DIGITALSPRINT" x2, "Especial WebSummit 2025", "Upgrade IA…"). Nada é apagado.

- O seletor passa a chamar-se **Marca** e funciona como etiqueta do carrossel.
- São acrescentadas 4 marcas: **fredericocarvalho.pt**, **Podcast MKT Idiotas**, **smsonline.pt** e **Cursos / formação**. Os projetos antigos continuam visíveis num grupo «Outros projetos».
- No fim da lista fica a opção **«+ Adicionar marca»**: abre uma pequena janela com nome, cor e logótipo opcional. A marca fica gravada no servidor.
- **Logótipo** por marca:
  - Carregar um ficheiro (PNG, SVG ou JPG, gratuito).
  - **«Criar logótipo com IA»**: mostra o custo estimado antes de avançar e faz um único pedido por clique, sem repetições automáticas. Gera 1 proposta, que pode ser aceite ou descartada.
  - O logótipo aceite fica disponível no compositor como elemento que se pode inserir. Nunca é colocado automaticamente nos slides.

## 2. Leitura do conteúdo das imagens (mais barata e fiável)

A falha anterior não veio do modelo: a Kie recusou a chave do servidor. Hoje a leitura de gráficos e tabelas usa Kie · Gemini 3 Flash.

- Antes de mexer no código, confirmo os preços atuais dos modelos de visão da Kie e da fal.ai (já existe chave fal no servidor) e escolho o mais barato que leia bem números e tabelas. Candidatos: Gemini Flash‑Lite / Flash pela fal e Gemini 3 Flash pela Kie.
- A escolha do fornecedor fica num único ponto do servidor, como já acontece com as imagens:
  - **principal:** o mais barato confirmado;
  - **alternativo:** usado só se o principal recusar o pedido **antes** de cobrar, por exemplo por chave inválida ou modelo indisponível. Se o resultado for desconhecido, o pedido nunca é repetido.
- O limite diário de 20 leituras por projeto passa a somar os dois fornecedores.
- O «Mapa de custos» mostra o fornecedor e o preço confirmado.
- A chave Kie continua por substituir. Com este alternativo, a leitura de imagens volta a funcionar mesmo antes disso.

## 3. Barra lateral do compositor (painel «Página»)

Problemas visíveis na captura: texto do botão cortado («…lher imagem · Biblioteca, Pexels, Envio d…»), parágrafos explicativos longos e em itálico, secções sem hierarquia e uma barra de deslocamento horizontal.

Nova organização, com secções compactas e títulos claros:

```text
Página 1                     [Redesenhar]
Papel visual   [Capa        v]
-----------------------------------------
Imagem                              [-]
  [ miniatura / "Sem imagem" ]
  Fonte   [Biblioteca][Pexels][Envio][IA]   (grelha 2x2, ícones)
  Modo    [Automático v]
  Sugestão: "visibilidade entusiasmo…"  (1 linha, recolhível)
  [Gerar com IA · ~0,02 €]
-----------------------------------------
Efeitos                             [+]
Fundo   ● #0B1F33  [Aplicar a todos]
```

- O botão longo de escolha de imagem é trocado por uma grelha de fontes com ícone e rótulo curto. Acaba o texto cortado.
- As explicações passam a uma linha curta em cinzento. O texto completo fica num ícone de ajuda.
- Títulos de secção iguais em todo o painel, divisórias finas, espaçamento regular e sem barra horizontal (largura fixa com quebra de linha).
- «Personalizar › Efeitos» passa a ser uma secção recolhível igual às outras.
- A cor de fundo mostra a amostra da cor e o botão «Aplicar a todos», sem o parágrafo explicativo.
- O resultado é validado no ecrã de computador e a 375 px de largura.

## Detalhes técnicos

- Marcas: reutilizo a tabela `projects` com inserção aditiva das 4 marcas e uma coluna opcional `logo_asset_id`/`logo_url` (migração aditiva; RLS e GRANT revistos). Criação feita por um serviço em `services/estudio.ts`, com `ouvirProjetosAlterados` a recarregar o `ProjetoContext`. Os logótipos ficam no bucket de assets que o motor já usa, na pasta do projeto.
- Logótipo por IA: passa pelo mesmo caminho de reserva Kie de um pedido por clique (`kie.server.ts`), com um prompt próprio de logótipo e fundo liso, sem texto inventado além do nome da marca.
- Visão: novo `visaoModelo.server.ts` (fornecedor + modelo vindos de variáveis de ambiente), ligação fal em `fal.server.ts` e `custosIa.ts` atualizado. Testes: escolha do fornecedor, alternativo só antes de cobrar e limite que soma os dois fornecedores.
- Barra lateral: `PainelImagemSlide.tsx` e o bloco «Página» em `EditorGrafico.tsx`, só com tokens existentes. O comportamento atual não muda: o único renderer e os overrides continuam iguais.
- Fecho: tsgo, testes, verificar-grafo-edge e novo deploy de mc-motor.

## Riscos e decisões

- Os preços de visão são confirmados no passo 2. Se nenhum fornecedor for claramente mais barato, mantém-se a Kie com a fal como alternativo.
- Criar um logótipo com IA tem custo. Nada é gerado sem um clique explícito.
