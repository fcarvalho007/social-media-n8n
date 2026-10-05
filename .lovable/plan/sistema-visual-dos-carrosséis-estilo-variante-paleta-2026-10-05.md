# Sistema visual dos carrosséis: Estilo + Variante + Paleta

## Onde a escolha se perde hoje (auditoria)

1. **A escolha não fica guardada.** No Design, o estilo, a paleta e as letras existem só enquanto a página está aberta. O que é guardado são as páginas já desenhadas. Em Composição ninguém sabe que estilo foi escolhido. Por isso o painel «Estilos» marca sempre «Editorial».
2. **A Composição reinterpreta o estilo.** O painel «Estilos» do editor só aplica as cores e as letras de outra forma, sem a composição do estilo. É por isso que o resultado difere do que se viu no Design.
3. **As variantes A e B não são duas composições do mesmo estilo.** «Aplicar estilo» aplica o mesmo modelo às duas variantes. Assim, A e B só diferem no que já vinha da geração, e não se percebe o que fazem.
4. **A paleta está presa ao estilo.** Cada estilo tem as suas cores fixas, e as cinco «bolinhas» são essas cores. Não existe uma paleta da marca.
5. **A capa usa o texto do slide inteiro.** Por isso aparecem parágrafos na capa.
6. **As quebras visuais só existem através de «Sugerir ritmo visual».** É uma sugestão pontual: não há um padrão fixo nem interruptores por slide.

## O que muda para o utilizador

- **Três escolhas separadas no Design:** Estilo (6), Variante (A/B) e Paleta (5 paletas Navy). A pré-visualização muda logo que se escolhe qualquer uma das três. Clicar num estilo seleciona-o sem avançar.
- **«Aplicar estilo» confirma as três escolhas e guarda-as no carrossel.** «Continuar para composição» abre exatamente esse resultado, desenhado pelo mesmo motor. O painel «Estilos» da Composição passa a mostrar a escolha guardada. Trocar de estilo aí aplica a composição completa e pede confirmação; já não aplica só as cores.
- **Variante A e Variante B passam a ser duas composições reais de cada estilo.** Por exemplo, Editorial A é clássico, com filetes, capitulares e grelha. Editorial B é contemporâneo, assimétrico, com mais espaço vazio e títulos maiores. Os outros cinco estilos têm o mesmo par de variantes.
- **As cinco paletas Navy** são Navy Editorial (por omissão), Navy Digital, Navy Signal, Navy Sage e Navy Ice, com os valores que enviaste. O branco e o preto ficam como cores técnicas. O seletor mostra o nome da paleta e 5 amostras grandes. O ajuste manual das cores continua disponível dentro de «Personalizar».
- **Capa:** a estrutura é uma categoria opcional, o título e uma frase. Se o texto da capa tiver mais do que uma frase curta, aparece o aviso «Capa: encurta para uma frase», com o atalho para a Narrativa. O texto nunca é cortado nem reduzido.
- **Quebras visuais:** o padrão é aplicado sozinho aos slides 3, 5 e 8 (ou ao último, se houver menos de 8). Cada estilo tem a sua composição de quebra (frase grande, painel navy, tipografia enorme, imagem a toda a página, número isolado ou conclusão). Na Composição há os interruptores «Quebra slide 3/5/8». Desligar uma quebra repõe a composição normal e não altera o texto. Se a quebra não couber num slide, esse slide fica normal e aparece um aviso.
- **«Sugerir ritmo visual»** passa para um botão discreto dentro do Design. Só sugere quebras e composições, e nunca muda o estilo, a variante ou a paleta.
- **Editorial ganha a nova descrição** e uma biblioteca interna de páginas: capa, leitura à esquerda, leitura em colunas, citação, número, dados e conclusão. O tipo de página é escolhido pela posição e pela função de cada slide.

## O que não muda

- O texto, os §, os IDs, a ordem, os textos alternativos e as imagens do utilizador mantêm-se.
- Guardar, desfazer e o histórico funcionam como hoje: cada aplicação cria uma versão nova.
- Os carrosséis já existentes abrem como estão. Se nunca tiveram um estilo guardado, aparece «Sem sistema visual guardado» até ser aplicado um.
- Não toco nos documentos reais, na autenticação, nos segredos, nas quotas, na publicação nem na IA paga.

## Detalhes técnicos

1. **Estado persistente.** Nova tabela `mc_sistemas_visuais` (só acrescentada), com uma linha por trabalho: `estilo_id`, `variante_id`, `paleta_id`, `quebras` (jsonb, por exemplo `{3:true,5:true,8:true}`), `versao` e `actualizado_em`. A leitura usa `mc_pode_ler`. A escrita é feita só pelo RPC `mc_definir_sistema_visual`, com `mc_pode_escrever` e a versão esperada (CAS), seguindo a regra do motor (o cliente só lê).
2. **Paletas.** Novo `motor/paletas.ts` com `PALETAS` e as funções semânticas: fundo, fundoCapa, titulo, texto, destaque, discreto, navy, branco e preto. `estilos.ts` deixa de ter as cores fixas: o estilo define só o layout, as letras e as decorações.
3. **Variantes.** `modelos.ts` passa a ter `comporModelo(p, estilo, variante, papel, ctx)`. Cada estilo tem os layouts A e B. `aplicarModelo` aplica a A à variante A e a B à variante B, nunca o mesmo modelo às duas.
4. **Mesmo motor.** As miniaturas do Design, a pré-visualização, a Composição e a exportação usam `aplicarSistema(pacote, sistema, medidor)` e os mesmos desenhos (`PaginaCanvas`, só com outra escala). O `EditorGrafico` lê o sistema guardado e deixa de usar `aplicarEstilo` (só cores) no painel Estilos.
5. **Capa e quebras.** O papel de cada página passa a ser capa, normal, quebra ou conclusão, decidido pela posição e pelas `quebras`. Cada estilo tem um layout de quebra. A medição continua a recusar o que não cabe, nunca reduz o texto, e devolve avisos. O aviso da capa entra no consultor de leitura, que hoje gera os «N avisos».
6. **Testes.** Mesmo sistema dá o mesmo resultado no Design e na Composição (hash das páginas); A e B dão geometrias diferentes em cada estilo; trocar de paleta só muda as cores; desligar a quebra do slide 5 só altera essa página; o texto fica sempre intacto; o aviso da capa aparece; CAS e conflitos do RPC; documentos antigos continuam a abrir.
7. **QA.** Só na fixture 9a5761f3 (ou numa cópia): capturas das 6 combinações estilo × variante em computador e telemóvel (393 px), troca de paleta e os interruptores das quebras. No fim, a fixture volta ao estado de partida por desfazer.

## Riscos

- É uma alteração grande ao motor visual. Faço-a por fases, com testes em cada uma: primeiro as paletas e a persistência, depois as variantes A/B, depois a capa e as quebras, e por fim a Composição.
- Os carrosséis já desenhados com as cores antigas dos estilos mantêm essas cores até se aplicar uma paleta Navy.
