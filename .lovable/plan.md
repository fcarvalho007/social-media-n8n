# Composição desalinhada da Narrativa — diagnóstico e correção

## O que encontrei neste carrossel («75% dos marketers…»)
- A Narrativa tem **10 slides** (s1 a s10).
- A Composição (variantes A e B) tem só **8 páginas**: s1, s2, s3, s7, s8, s9, s10 e uma página órfã de um slide que já não existe na Narrativa.
- **Faltam as páginas dos slides 4, 5 e 6**, e há uma página a mais. Por isso parece que o texto aprovado «não foi aplicado»: parte dele não tem página.
- O novo modelo visual (ícones, barra de progresso, seta, capa na zona segura) **está** nas 8 páginas existentes, mas a capa ainda não foi escolhida entre as 3 propostas.
- Causa provável: as mudanças de estrutura e a remoção antiga de slides (corrigida hoje) mexeram na Narrativa sem acertar as páginas.

## O que vou fazer
1. **Aviso automático ao entrar na Composição** quando a Narrativa e as páginas não coincidem: «3 slides sem página · 1 página sem slide», com dois botões:
   - **«Acertar com a Narrativa»** (gratuito): cria as páginas em falta já com o novo modelo, na posição certa, e retira as páginas órfãs. Fica uma nova versão, com Desfazer.
   - «Ver diferenças»: lista slide a slide o que entra e o que sai.
2. **«Recompor com o novo modelo»** (gratuito, opcional): refaz todas as páginas a partir do texto atual com os critérios novos, mantendo imagens já escolhidas. Antes de aplicar, mostra a pré-visualização. Nova versão, com Desfazer.
3. **Capa:** depois de acertar, abre sozinha a escolha das 3 capas, se ainda não houver uma escolhida.
4. **Prevenção:** acrescentar, remover, mover e trocar de estrutura passam todos pela mesma regra, que mantém a Narrativa e as duas variantes sempre iguais. Um teste garante que nunca ficam slides sem página nem páginas sem slide.
5. Corrigir este carrossel **só quando carregar** em «Acertar com a Narrativa»; nada é alterado sozinho.

## Detalhes técnicos
- Função pura `sincronizarComNarrativa(pacote, slides, marca)` em `_shared/motor/enriquecer.ts`: páginas novas compostas com `paginaA/paginaB` + `enriquecerPaginas`; preserva páginas existentes; remove páginas cujo `slide` não exista; ordena pela Narrativa; recalcula progresso e setas (camadas `mod-*` substituídas, não duplicadas).
- `aceitarEstrutura` passa a sincronizar os documentos no mesmo pedido de gravação.
- Deteção de diferenças em `CarrosselTrabalho.tsx`/`EditorGrafico.tsx`; gravação pelo fluxo atual (versões, conflitos).
- Testes: sincronização (faltas, órfãs, ordem, idempotência das camadas `mod-*`); typecheck; grafo Edge; validação em 1280px e 375px com este carrossel, sem custos.
