# Fechar as rondas 2 e 4 e afinar a interface

Tudo local, sem integração, publicação nem pedidos pagos. As pesquisas de fotografias (Pexels/Unsplash) são gratuitas; cada uma só acontece quando se carrega num botão.

## Ronda 2 — Fotografia sugerida por slide
O editor já faz uma pesquisa de fotografias com termos tirados do tema de cada slide, mas é preciso ir ao separador «Fotos». Passa a haver um atalho direto:
- No painel da página, em «Imagem»: botão **«Sugerir 3 fotografias para este slide»**. Mostra 3 miniaturas com o autor, mais «Outras» (página seguinte) e «Pesquisar outro termo».
- **Aceitar** copia a fotografia para o projeto e aplica-a com a composição de imagem automática que já existe (gradiente/meia página), que protege a leitura. Pode desfazer. **Recusar** fecha as sugestões sem mudar nada.
- **Capa fotográfica:** na proposta «Fotografia imersiva», botão **«Trocar fotografia»** com a mesma pesquisa (termos tirados do título da capa); a capa é recalculada com a imagem escolhida.
- Sem chave/serviço disponível: mensagem clara e o botão «Fotos» continua como alternativa.

## Ronda 4 — Validação
- Carrossel de teste (cópia em memória, nunca grava no real): seis estilos × três capas, capturas em computador e 375 px.
- Exportação PNG e PDF de teste para uma pasta temporária, sem publicar; confirmar que as guias de zona segura não aparecem e que nenhum texto é cortado.
- Relatório curto com as capturas.

## Refinamentos de interface
- **Capas no painel:** abrir «Capa» já aberto na primeira página quando a capa ainda não foi escolhida; marcar a capa atual com «Em uso».
- **Botão «Zonas seguras»:** legenda curta junto da página quando ativo («Quadrado da grelha · pontos de navegação · margens»).
- **Aviso de carga:** também no indicador de avisos da Composição («1 aviso»), com ligação ao slide.
- **Dividir slide:** mostra antes uma pré-visualização das duas partes (confirmar/cancelar).
- Revisão de textos em PT-PT, foco de teclado e alvos de toque de 44 px nos novos botões.

## Detalhes técnicos
- `SugestaoFotos.tsx` (novo): usa `pesquisarFotos`/`usar` já existentes em `services/motor.ts` (Pexels + Unsplash), termo = `queryAuto` da página; aplica via `despachar({ tipo: "adicionarImagem", modo: fundo })` para herdar a composição de imagem.
- `EscolhaCapa`: prop `onTrocarFoto` que recebe o asset escolhido e chama `propostasCapa` com essa imagem (`imagem?` opcional em `propostasCapa`).
- Avisos: `avisosCarga` juntado à lista de avisos do editor.
- Testes: capa fotográfica usa a imagem escolhida; dividir com pré-visualização mantém o texto; aviso de carga entra na contagem.
- Validação com Playwright a partir de cópia em memória (fixture), sem gravar.

## Riscos
- As pesquisas dependem da função do servidor já instalada; se a versão instalada não as suportar, ficam prontas mas só funcionam após integração.
