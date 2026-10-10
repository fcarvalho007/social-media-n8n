# Corrigir imagens e automatizar o URL da crónica

## Diagnóstico confirmado

- O recorte não exige imagens horizontais. A pesquisa favorece fotografias horizontais, mas o recorte aceita qualquer orientação e preenche automaticamente a faixa 556 × 200.
- O erro acontece depois do carregamento: a imagem é guardada, mas o endereço devolvido aponta para a antiga rota `/api/public/imagem/...`, que não existe nesta aplicação. O serviço atual de imagens usa `nl-imagem`; por isso, ao tentar recortar, o sistema não consegue voltar a obter o original.
- A publicação em FredericoCarvalho.pt já devolve o URL confirmado do artigo e já o grava na configuração da edição. Porém, o editor continua a mostrar um campo manual na secção da crónica, duplicando um valor que deve vir da publicação.

## Alterações

1. **Corrigir a origem das imagens**
   - Alterar a fonte vendorizada para gerar o endereço através do serviço atual `nl-imagem` logo após upload ou escolha no Pexels.
   - Manter o recorte automático para fotografias horizontais, verticais ou quadradas; não introduzir filtro por orientação.
   - Melhorar a mensagem quando uma imagem antiga já não puder ser recuperada, sem provocar erro 500 nem bloquear a edição.

2. **Compatibilidade com imagens já guardadas**
   - Ao obter o original para recorte, reconhecer endereços antigos `/api/public/imagem/...` e resolver o mesmo ficheiro através do serviço atual.
   - Não alterar nem apagar dados existentes; a compatibilidade será feita no momento da leitura.

3. **URL automático da crónica**
   - Retirar o campo editável «URL da crónica completa» da secção de composição.
   - No painel «Publicar», manter as ações de criar rascunho, publicar e atualizar em FredericoCarvalho.pt.
   - Após confirmação do site, usar automaticamente o URL devolvido e guardado pelo processo de publicação; mostrar o endereço e «Abrir artigo», sem pedir nova introdução manual.
   - Preservar a introdução manual apenas como alternativa quando a integração com o site não estiver configurada.

4. **Regenerar e validar**
   - Regenerar os ficheiros derivados a partir das fontes `.txt`, sem editar os resultados diretamente.
   - Acrescentar testes para o endereço atual, a compatibilidade com endereços antigos e o recorte independente da orientação.
   - Executar os testes relevantes, validação de tipos, compilação e verificação completa do grafo Edge.
   - Publicar apenas as funções Edge afetadas e validar no ecrã o carregamento, recorte e preenchimento automático do URL, em computador e telemóvel.

## Limites

- Não serão alteradas nem republicadas crónicas existentes.
- Não serão apagadas imagens ou outros dados.
- Não serão feitas chamadas pagas.
