# Revisão de saúde: fila de entrada, podcast e sessão

## O que encontrei (só leitura)
- **Fila de entrada:** tem 73 notícias à espera, recolhidas hoje às 15:36. Nenhuma é processada desde 04/10. A recolha funciona, mas o processamento falhou porque a sessão tinha expirado.
- **Podcast «Marketing para Idiotas»:** o último episódio guardado é de 02/10 (e415s01) e a última atualização foi a 03/10. Nesta app não há nada que vá buscar episódios novos, tal como acontecia com as fontes RSS. Por isso, em «Compor» o podcast está desatualizado.
- **«Sessão inválida» e «Não tens acesso à curadoria»:** os dois erros vêm da sessão expirada. Neste momento o ecrã está na página de entrada. A mensagem «Não tens acesso» engana: o problema era a sessão, não a permissão.

## O que muda
1. **Sessão expirada:** antes de cada pedido da Curadoria e do processamento, a sessão é renovada automaticamente. Se não for possível renová-la, aparece «A sessão expirou. Volta a entrar.», com um botão para entrar. «Não tens acesso» passa a aparecer só quando a conta não tem mesmo permissão.
2. **Podcast:** em «Compor» há um botão «Atualizar episódios» e a data do último episódio. O botão vai buscar os episódios novos ao feed já configurado, sem usar IA. Também corre sozinho ao abrir «Compor» se a última atualização tiver mais de 24 horas.
3. **Verificação:** atualizar o podcast uma vez e confirmar que aparecem os episódios posteriores a 02/10. Confirmar que «Recolher e processar» volta a funcionar depois de entrar de novo. Não processo nenhum lote, porque isso usa IA.

## Pormenores técnicos
- `src/services/curadoria.ts` e o processamento da fila: `getSession`/`refreshSession` antes dos pedidos; distinguir 401/JWT expirado de 42501.
- Podcast: expor `sincronizar-podcast` via `nl-hooks` (sessão de staff, já usa `exigirSessao`) e chamá-lo a partir de Compor (fonte vendorizada + port). Não crio nenhuma tarefa automática no servidor sem a sua autorização.
- Testes: classificar o erro (sessão vs permissão); podcast sem novos → 0, sem duplicados.
