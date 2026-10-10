# Editor de texto em «Esta semana recomendo»

## Objetivo
Permitir editar com formatação o título, um novo subtítulo e a nota editorial do bloco «Esta semana recomendo», mantendo a pré-visualização, o email enviado e a versão web visualmente iguais.

## Alterações
1. **Editor nos três campos**
   - Substituir os campos simples de título e nota editorial por um editor compacto.
   - Adicionar um campo próprio de subtítulo entre ambos.
   - Disponibilizar negrito, itálico e sublinhado nos três campos.
   - Manter colagem limpa, removendo estilos, cores e formatação externa incompatível.

2. **Apresentação do bloco**
   - Manter o título como elemento principal.
   - Mostrar o subtítulo imediatamente abaixo, com menor peso visual.
   - Mostrar a nota editorial a seguir, preservando parágrafos e a formatação escolhida.
   - Aplicar a mesma hierarquia no email, na pré-visualização e na página web da edição.

3. **Compatibilidade e segurança**
   - Guardar o novo subtítulo na base de dados da edição.
   - Aceitar o conteúdo antigo, hoje em texto simples, sem o perder nem alterar visualmente.
   - Sanitizar o conteúdo antes de o apresentar, permitindo apenas a formatação suportada.
   - Manter inalterados o tipo, metadado curto, URL e botão da recomendação.

4. **Validação**
   - Testar a conversão de texto antigo e a remoção de HTML não permitido.
   - Confirmar negrito, itálico e sublinhado nos três campos.
   - Confirmar o resultado no email e na versão web, em computador e telemóvel.
   - Regenerar a newsletter a partir da fonte vendorizada, verificar as funções e publicar as funções afetadas.

## Detalhes técnicos
- A alteração será feita na fonte inerte da newsletter e propagada pelo gerador, sem editar os ficheiros gerados.
- O novo campo será acrescentado à configuração da edição através de uma migração aditiva, sem modificar conteúdos existentes.
- O formato guardado será HTML restrito e sanitizado, com fallback transparente para texto simples já existente.
