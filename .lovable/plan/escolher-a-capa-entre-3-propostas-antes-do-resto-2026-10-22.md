# Escolher a capa entre 3 propostas antes do resto

## Avaliação

Faz sentido e é viável. A capa decide se alguém desliza (e é a miniatura na grelha do perfil), por isso merece uma escolha própria. Escolher a capa primeiro também dá direção ao resto: cor de acento, peso do título e tratamento de imagem passam da capa para os outros slides, e o carrossel fica coerente.

Para serem realmente diferentes, as três capas não podem ser só três cores: cada uma usa uma estratégia de impacto distinta, tirada do documento.

## As 3 capas

| Capa | Ideia | Composição |
|---|---|---|
| **Manifesto** | Tipografia gigante como imagem | Título em Black enorme, 2–4 palavras-chave em cor de acento, forma geométrica a sangrar a margem, fundo de cor sólida da marca. Sem fotografia. |
| **Choque de dado** | Um número que muda a perceção | Se o texto tem um número (%, €, milhões), fica isolado em tamanho máximo no centro de um fundo escuro; título por baixo. Sem número, usa uma pergunta/afirmação curta em bloco de contraste. |
| **Fotografia imersiva** | Imagem a sangrar com gradiente | Imagem do carrossel (ou fotografia gratuita Pexels/Unsplash sugerida pelo tema) em fundo total, gradiente para leitura, título na zona inferior do quadrado seguro, etiqueta «Novo» ou tema no topo. Sem imagem disponível: marcada «Imagem por escolher». |

Todas respeitam a zona segura (texto no quadrado central 1080×1080), seta «desliza» e o texto aprovado sem alterações; se o título não couber numa opção, essa opção mostra «texto não cabe» em vez de cortar.

## Como funciona para o utilizador

```text
Narrativa aprovada
   -> Capa: 3 miniaturas grandes lado a lado (no telemóvel, em fila deslizante)
      [Manifesto] [Choque de dado] [Fotografia]
      "Escolher esta capa"  ·  "Trocar fotografia" (só na 3.ª)
   -> Resto dos slides composto com a direção da capa escolhida
   -> Design / editor como hoje
```

- Pode voltar à escolha da capa mais tarde a partir do Design («Mudar capa»), sem perder edições nos outros slides.
- Nenhuma opção usa IA paga; as fotografias gratuitas vêm como sugestão e podem ser trocadas.
- Carrosséis existentes não mudam; a escolha surge nos novos e via «Mudar capa».

## Detalhes técnicos

- Novo módulo puro `motor/capas.ts`: `propostasCapa(pagina, slide, marca, imagem?) -> [{ id, nome, pagina, cabe }]`, usando formas existentes (ret, elipse, gradiente, icone, peso 900) e `ZONA_SEGURA` de `enriquecer.ts`; deteção do número reutiliza a regex de `enriquecer.ts`.
- `herdarDirecao(capaId, paginas)`: aplica ao resto acento/peso/fundo coerentes, reutilizando `estilos.ts`.
- UI: novo passo `PassoCapa.tsx` entre Narrativa e Design no `Estudio`, com pré-visualização pelo mesmo renderizador do editor (pré-visualização = editor = exportação). Escolha grava nova versão pelo fluxo atual (desfazer e histórico mantidos).
- Fotografia: pesquisa Pexels/Unsplash com termos do `tema_visual`/título (sem IA), já existente no servidor.
- Testes: 3 capas geometricamente distintas, texto no quadrado seguro, sem corte (recusa com aviso), texto/ordem inalterados, «Mudar capa» preserva os restantes slides.
- QA: capturas das 3 capas em desktop e 375 px com o artigo real, sem publicar.
- Restrição: local, sem deploy, publicação nem pedidos pagos.

## Riscos

- A capa fotográfica depende da qualidade da fotografia gratuita; por isso é sempre trocável.
- Um passo extra no percurso; mitigado por vir com a primeira opção já pré-selecionada.
