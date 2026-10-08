# Corrigir «Preparar publicação» e o aviso de caixas reajustadas

## Diagnóstico (confirmado)

- **Erro no servidor:** ao preparar ficheiros/rascunho, o servidor falha com «nomePagina is not defined». A função é usada no estado da exportação mas não foi importada depois da alteração dos MP4. Por isso nada chega ao envio para redes sociais.
- **«ctx.json is not a function»:** quando o servidor falha, o ecrã tenta ler a mensagem de erro de uma forma que nem sempre existe, e mostra este texto técnico em vez da causa.
- **«2 caixas de texto ajustadas»:** ao abrir o compositor, as caixas de texto são encolhidas/esticadas para a altura exata do texto e isso é anunciado como aviso, mesmo quando o texto já cabia com margem. A letra nunca muda; só a caixa.

## O que muda

1. Importar a função em falta no servidor e voltar a publicar o motor. «Preparar publicação» volta a gerar PNG/PDF (e MP4 quando existir) e cria o rascunho no sistema de envio para redes sociais que já existe (/manual-create), sem passos novos.
2. Ler o erro do servidor de forma segura em todos os serviços que usam o mesmo padrão; o utilizador vê uma frase clara em português, nunca «ctx.json is not a function».
3. Reajuste automático só quando o texto **não cabe** na caixa (crescer para evitar corte). Caixas onde o texto já cabe ficam como estão e não aparece mensagem. Quando houver reajuste real, a mensagem diz «X caixa(s) aumentada(s) para o texto não ficar cortado; a letra não mudou».

## Validação

- Teste: estado da exportação nomeia páginas `slide-01.png`; reajuste não toca em caixas onde o texto cabe.
- Verificação de tipos e do grafo das funções do servidor (apanha importações em falta).
- Sem gerações pagas e sem publicar nada: o rascunho fica em rascunho.

## Detalhes técnicos

- `supabase/functions/mc-motor/index.ts`: adicionar `nomePagina` ao import de `../_shared/motor/exportacao.ts`; deploy `mc-motor`.
- `src/services/motor.ts` (e `estudio.ts`, `conteudos.ts`): `typeof ctx?.json === "function"` antes de ler; fallback com mensagem PT-PT.
- `operacoes.ts` `enquadrarTextos`: só ajustar quando `layoutTexto(t, est, c.w, c.h, m).cortado`; nunca reduzir altura. `EditorGrafico.tsx`: texto da mensagem.
