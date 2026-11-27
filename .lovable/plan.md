# Envio da newsletter: o que falta, ir resolver e enviar mesmo assim

## O que se passa hoje
A caixa «Resolve no editor antes de enviar» mostra frases técnicas («Faltam Briefs prontos: 0/3», «Factualidade por resolver: 3/3»), não diz a que notícias se referem, não tem atalho para as resolver e, por regra, estes pontos travam o envio sem alternativa.

## O que muda para si

**a) Cada problema com atalho direto**
- Cada linha passa a ter um botão: «Gerar Brief», «Rever leitura», «Voltar a verificar», «Corrigir fonte».
- O botão fecha a janela de envio e abre o painel de Briefs já na edição #320 e na notícia em causa, destacada.

**c) Mais claro, por notícia**
Em vez de contagens, uma lista agrupada pelas notícias em Destaque:

```text
Faltam 3 coisas em 3 Destaques
┌──────────────────────────────────────────────────────┐
│ «Título da notícia A»                                │
│   · Ainda não tem Brief                [Gerar Brief] │
│   · Leitura por aprovar              [Rever leitura] │
│ «Título da notícia B»                                │
│   · Há afirmações sem suporte na fonte  [Verificar]  │
└──────────────────────────────────────────────────────┘
Porque importa: sem Brief pronto, o Destaque não tem
página própria no site.
```
- Títulos reais das notícias, frases simples, sem frações «0/3».
- Corrige-se também o texto confuso «Falta «Em 30 segundos»»: passa a «Falta escrever o resumo "Em 30 segundos"».

**b) Enviar mesmo assim**
- Por baixo da lista, um botão secundário «Enviar mesmo assim».
- Ao carregar, explica o efeito: «Os Destaques sem Brief pronto vão ligar diretamente à notícia original, como o Radar. Nada é publicado no site para eles.»
- Continua a ser preciso escrever o número da edição (320), como já acontece.
- Fica registado no «Registo do envio» e no histórico quem enviou com pontos por resolver e quais.
- Os restantes bloqueios que não dependem dos Briefs (sem listas, sem assunto, conteúdo partido) continuam a travar — enviar nessas condições falharia.

## Detalhes técnicos
- Primeiro passo: confirmar em `compose.server.ts.txt` que um Destaque sem Brief publicado pode usar a ligação à fonte; se não, adicionar esse recurso só para envios forçados.
- `prontidao.server.ts.txt`: cada área de Briefs devolve também `itens: {noticiaId, titulo, motivo, accao}[]` (a partir de `validarBriefsDaEdicao`, que já tem `noticiaId`/`titulo`); mensagens reescritas em linguagem simples.
- `prontidao-rotulos.ts.txt`: nova `pendentesPorNoticia(areas)` para agrupar.
- `EnvioNewsletter.tsx.txt`: nova lista agrupada, botões de ação (navegam para `/briefs?edicao=…&noticia=…`) e fluxo «Enviar mesmo assim» com confirmação.
- `briefs.tsx.txt`: aceita `edicao` e `noticia` na pesquisa do endereço, seleciona e faz scroll/destaque.
- `envio.server.ts.txt`: novo parâmetro `forcarBriefs` (só staff, validado no servidor); com ele, os bloqueios dos Briefs passam a aviso, os Destaques afetados ligam à fonte, e `audit_log` regista «Envio Revista forçado com Briefs por resolver» + lista.
- Atualizar regra no `AGENTS.md` e `mem://features/briefs-editorial` (os Briefs travavam sempre; passa a haver envio forçado consciente).
- Testes: agrupamento por notícia; envio forçado não falha e liga à fonte; sem `forcarBriefs` continua a travar; listas/assunto em falta travam mesmo forçado.
- Fontes inertes + `port-newsletter.py` + `verificar-grafo-edge.py`. Tudo no ramo local; sem deploy nem envio real.
