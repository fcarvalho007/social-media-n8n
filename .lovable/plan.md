# Fotografias do Pexels no Estúdio de carrosséis

## Ponto de partida (verificado)
- A chave do Pexels já está guardada no servidor e a newsletter já pesquisa e importa fotos do Pexels (imagem da crónica).
- No carrossel, o seletor de imagens só tem a biblioteca do projeto, carregamento manual e a geração Kie (paga).
- As imagens do carrossel ficam no armazém do motor com uma origem registada; hoje só são aceites as origens biblioteca, kie e upload.

## O que muda para o utilizador
- No seletor de imagens do carrossel (editor e imagens de apoio) aparece o separador «Pexels», ao lado da biblioteca e da geração por IA.
- Pesquisa por termo (pré-preenchido a partir do título do slide, editável), grelha de resultados com «Mais resultados».
- Cada foto mostra o fotógrafo; ao escolher, a foto é copiada para o armazém do carrossel (as ligações do Pexels podem mudar) e entra no slide como qualquer outra imagem, com texto alternativo pré-preenchido a partir da descrição do Pexels, para rever.
- Crédito «Foto: Nome / Pexels» guardado com a imagem e visível no editor e na revisão final (o Pexels pede atribuição; não é impressa no slide).
- Gratuito: não usa créditos de IA nem limites pagos. Cada clique em «Usar» faz uma única cópia; sem repetições automáticas.

## Detalhes técnicos
1. **Base de dados (aditiva)**: alargar a verificação de `mc_assets.origem` para aceitar `'pexels'`; guardar fotógrafo, URL da foto e ID Pexels nos metadados já existentes do asset (sem colunas novas se os metadados atuais servirem; caso contrário, colunas opcionais).
2. **Servidor** (`mc-motor`, novas ações):
   - `pexels_pesquisar` — exige `mc_pode_ler`; chama a API com `PEXELS_API_KEY` (orientação vertical, 15 por página); devolve só id, miniatura, URL grande, dimensões, alt e fotógrafo.
   - `pexels_usar` — exige `mc_pode_escrever`; aceita só URLs `https://images.pexels.com/`, descarrega a versão adequada a 1080×1350, valida tipo/tamanho, copia para `motor-assets` e regista o asset com origem `pexels` (deduplicado por projeto + id Pexels).
   - Reaproveitar a lógica de pesquisa do código da newsletter num módulo partilhado, sem alterar o comportamento da newsletter.
3. **Cliente**: funções em `src/services/motor.ts`; separador novo em `SeletorImagens.tsx` (componente `PesquisaPexels`), estados de carregamento, vazio e erro (chave ausente, limite do Pexels 429 com mensagem «tenta daqui a pouco», sem repetir sozinho).
4. **Testes**: validação de URL/origem, mapeamento da resposta, deduplicação; QA desktop e 393px na prova 72dbadbb com uma pesquisa real (gratuita) e uma cópia para o armazém dessa prova.

## Fora de âmbito
- A escolha automática de imagem por slide, segundo a função narrativa e a capa com imagem em fundo total e gradiente (documento enviado), fica para uma ronda própria, que usará este separador como fonte.
- Newsletter, publicação, autenticação, quotas, documentos reais.

## Riscos
- Limite gratuito do Pexels (200 pedidos/hora, 20 000/mês) partilhado com a newsletter.
- Licença do Pexels: uso livre, mas não se pode revender as fotos sem alterações nem sugerir que a pessoa retratada apoia a marca; o crédito é recomendado.
