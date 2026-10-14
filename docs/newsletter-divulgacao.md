# Divulgação da newsletter

Extensão do Hub existente: um Story convida a ler a crónica no dia do envio; um carrossel dos destaques dá uma segunda razão para visitar a edição no dia seguinte. Esta cadência é uma hipótese editorial a ajustar com os dados da conta, sem garantia de alcance, conversão ou melhor horário.

## Comportamento

A confirmação `sent` de uma campanha de lista real na E-goi prepara rascunhos editáveis a partir da fonte conservada da edição. A simples aceitação do envio não chega. A preparação destas duas peças não chama IA paga, não publica no Instagram e não agenda conteúdos. Se faltar preparar a divulgação, a ação «Preparar divulgação · sem IA» permite retomá-la.

O Story usa o título, um excerto literal da crónica e um convite à leitura. O carrossel usa os destaques e conserva as fontes e a leitura aprovada de Frederico, repartindo texto longo quando necessário. Um carrossel ou Story já guardado não é substituído pela preparação nem por uma repetição do pedido; os rascunhos antigos continuam disponíveis. Edições antigas sem destaques mantêm o editor anterior da crónica.

O teste interno mantém-se pré-envio. «Preparar divulgação de teste · sem IA» cria um rascunho separado da composição atual, sem job de envio real, chamadas à E-goi ou alteração do estado de envio. Um teste interno marcado como enviado nunca confirma a divulgação real. A edição 319 e o teste interno 970 devem ser preservados.

## Abrir, rever e exportar

1. Abre a edição no editor da newsletter e encontra «Divulgação no Instagram». Depois da preparação, escolhe «Rever Story e carrossel». Antes do envio real, usa a caixa «Teste · pré-envio» e «Preparar divulgação de teste · sem IA» ou «Rever divulgação de teste». O destino é `/estudio/redes-sociais/<conteudo_id>`; também podes reabrir o rascunho na lista de carrosséis do Estúdio.
2. Em «Dia do envio · Story», revê o título, excerto, convite e «Ligação do autocolante». Guarda em «Guardar Story» e só depois escolhe «Marcar como revisto». Os estados distinguem alterações por guardar, guardado por rever e revisto com publicação manual. Uma alteração posterior exige guardar e rever de novo. Em conflito de versões, o texto mantém-se no editor; copia-o antes de reabrir. Há recuperação local para alterações não guardadas.
3. Escolhe «Descarregar Story» para obter o PNG de 1080 × 1920. «Copiar ligação» copia o endereço do campo, incluindo os parâmetros de medição. O PNG não contém uma ligação clicável: ao publicar manualmente no Instagram, adiciona o autocolante «Ligação» no espaço livre por baixo do convite e cola esse endereço.
4. Em «Dia seguinte · Carrossel», percorre os slides, confirma capa, factos, fontes, leitura e legenda e usa «Guardar». «PNG (ZIP)» exporta os slides de 1080 × 1350 e `legenda.txt`; «PDF» exporta o documento. A pré-visualização e a exportação usam o mesmo desenho. Texto que não cabe bloqueia a exportação com uma indicação para o encurtar.
5. «Criar rascunho social» encaminha a versão guardada para revisão no fluxo social existente; não publica. Se já existir, usa «Abrir revisão do rascunho». A publicação e a colocação da ligação à edição no perfil continuam manuais. «Gerar com IA» ou «Gerar alternativa com IA» são ações explícitas do editor existente, com confirmação de consumo; não fazem parte da preparação automática gratuita.

## Medição

As ligações preparadas usam `utm_source=instagram`, `utm_medium=organic_social`, `utm_campaign=digitalsprint_<numero>` e `utm_content=story_d0` ou `carrossel_d1`. O Story aponta para a crónica; as ligações acrescentadas à legenda do carrossel permitem distinguir a segunda peça. Se editares a ligação do Story, confirma que os UTM pretendidos continuam presentes.

Compara visitas à crónica/edição e cliques no autocolante; para o carrossel, acompanha também guardados e partilhas. A avaliação cruza os dados do site com os dados da conta Instagram. «Dia do envio» e «Dia seguinte» são sugestões editoriais; o Hub não define uma hora nem garante resultados.

## Validação local e evidência visual

Na raiz do projeto:

```sh
npm run dev -- --mode divulgacao --host 127.0.0.1 --port 5182 --strictPort
```

Abre `http://127.0.0.1:5182/estudio/redes-sociais/local-newsletter-319`. Este modo usa a composição de demonstração da 319, identificadores sintéticos e armazenamento local; as operações Cloud, envios, IA paga e publicação estão desligados. Permite editar, guardar, reabrir, rever, copiar a ligação e exportar sem tocar no teste 970.

```sh
npm test -- src/test/newsletter-divulgacao.test.ts src/test/divulgacao-editor.test.tsx src/test/carrossel-proposta-envio.test.ts
npm run typecheck
npm run check:edge
npm run build
```

As fixtures cobrem a separação de campanhas internas/reais, confirmação exigida, fonte literal, UTM, preservação dos rascunhos, conflitos e revisão. O disparo real completo em produção não pode ser testado de ponta a ponta sem um envio real; essa validação não deve ser simulada como concluída nem motivar um envio de teste para listas reais.

As quatro capturas de revisão foram comparadas localmente com a identidade e os componentes existentes, em desktop e móvel, e não são incluídas no GitHub. Preservam papel/navy/lima da DIGITALSPRINT e o editor shadcn, com colunas no desktop e conteúdo empilhado no móvel. A revisão visual considerou a extensão pronta, sem correções materiais. Não foi aprovada uma mudança de identidade ou de sistema visual.

## Instalação no Lovable

A instalação/publicação desta extensão ainda não está confirmada. Consumir o código commitado da branch `codex/newsletter-divulgacao`, preservando as migrações anteriores e os dados existentes:

1. Aplicar uma vez `drizzle/migrations/0061_newsletter_divulgacao.sql`. Acrescenta `divulgacao` e `divulgacao_versao` à tabela existente; não altera grants nem RLS.
2. Fazer deploy de `nl-conteudos`, `nl-worker-conteudos`, `nl-api`, `nl-newsletter` e `nl-hooks`, incluindo o respetivo grafo de módulos partilhados.
3. Publicar a aplicação com o código da mesma branch.
4. Verificar o rascunho pré-envio da 319: abrir/preparar sem IA, editar, guardar, reabrir, rever, copiar ligação e exportar. Confirmar que a 319 e o teste 970 permanecem intactos e que o teste não cria divulgação real. Não enviar email nem publicar no Instagram para validar a instalação.

Prompt de instalação:

> Instala o código já commitado da branch `codex/newsletter-divulgacao`, seguindo `docs/newsletter-divulgacao.md`. Não cries nem reescrevas a implementação e não geres conteúdo com IA. Aplica uma vez a migração 0061, faz deploy de `nl-conteudos`, `nl-worker-conteudos`, `nl-api`, `nl-newsletter` e `nl-hooks` com os módulos partilhados e publica a aplicação. Verifica apenas o rascunho seguro pré-envio da edição 319, preservando a edição e o teste interno 970: guardar/reabrir, revisão, copiar ligação e exportar. Não envies email, não publiques nem agendes no Instagram e não consumas IA paga. Reporta os passos efetivamente concluídos e as limitações.
