# Recomendação: curadoria central, newsletter e social como vistas diferentes

Responde às suas dúvidas: onde vive o sistema, se teria de entrar sempre na newsletter, e como não perder a visualização da curadoria da newsletter, que é o principal consumidor de notícias. Não há código nesta fase.

## O princípio: um só armazém de itens, várias vistas

A curadoria não vive "dentro" da newsletter nem "dentro" do social. Vive num único sítio: uma lista de itens curados (notícias, links, ferramentas, ideias). A newsletter e o social são **duas vistas diferentes sobre a mesma lista** — como duas lentes sobre a mesma caixa.

```text
                    ┌──────────────────────────────┐
                    │   Curadoria (armazém único)   │
                    │   notícias · links · ideias   │
                    └──────────┬─────────┬─────────┘
              vista da         │         │   vista do
              newsletter       │         │   social
                               ▼         ▼
                 Curação da       Ideias para
                 newsletter       carrossel / imagem / legenda
                (como é hoje)     (nova vista, sem novo sistema)
```

## Onde vive, concretamente

- **Os dados**: a mesma base que a curadoria da newsletter já usa hoje. Não se cria uma segunda caixa de notícias — essa é a causa do medo que expressou ("se pagasse uma notícia num sistema apagaria no outro"). Com um só armazém, isso não pode acontecer.
- **O ecrã principal** continua onde está: a secção de curadoria da newsletter. Não muda nada naquilo que já domina e usa. Continua a ser o lugar de triagem das notícias, porque a newsletter é o principal consumidor.
- **O social** ganha uma vista própria (por exemplo, "Ideias" dentro da área social), que mostra **os mesmos itens**, filtrados por "ainda não trabalhados para social". Não é uma segunda curadoria; é outra porta para a mesma sala.

## Teria de entrar sempre na newsletter?

Não. Tem três portas para o mesmo armazém:

1. **Pela curadoria da newsletter** (a principal, como hoje) — e em cada item aparece uma ação nova: «Trabalhar em social».
2. **Pela vista social** — vê só os itens úteis para carrossel/imagem/legenda, sem o ruído editorial da newsletter.
3. **Rápida**: colar um link ou texto directamente na vista social; o item entra no armazém central e passa a ser visível também na curadoria da newsletter.

Entrar por uma porta nunca esconde o item das outras.

## Como "usar" uma notícia a apaga-a? Não apaga

Usar não remove; assinala. Cada item fica com marcas de uso independentes:

| Estado | Newsletter | Social |
|---|---|---|
| Nova | visível na curadoria | visível em ideias |
| Usada na newsletter | marcada como usada | continua visível |
| Usada em carrossel | continua visível | marcada como usada |
| Usada em ambos | marcada | marcada |

A curadoria da newsletter nunca perde uma notícia porque o social a trabalhou — e vice-versa. O que muda é apenas a etiqueta de estado, e filtros como «sem uso social» deixam a vista social limpa sem apagar nada.

## O fluxo dentro da vista social

1. Vê um item (ou cola um novo).
2. «Trabalhar em social» → o sistema resume a notícia fielmente.
3. Propõe 2–3 ângulos (opinião, explicação, alerta, comparação) — sugere, nunca decide.
4. Escolhe o formato: carrossel (vai ao compositor), imagem com legenda, ou só a legenda.
5. O item fica marcado com o uso, e o link para o trabalho criado fica anexado à notícia.

## O que preserva da sua preocupação

- A curadoria da newsletter **mantém-se exactamente como é**, no mesmo sítio, com a mesma visualização — é o elemento principal e continua a ser o primeiro destino das notícias.
- O social não rouba nem consome notícias; apenas lê e assinala.
- Não há dois sistemas a correr: há um armazém e duas vistas. Menos duplicação, menos manutenção.

## Próximo passo sugerido

Se este modelo lhe faz sentido, o passo seguinte é definir em pormenor a vista social (que estados, que filtros, que acções) e o que passa exactamente do item curado para o compositor — antes de qualquer construção.
