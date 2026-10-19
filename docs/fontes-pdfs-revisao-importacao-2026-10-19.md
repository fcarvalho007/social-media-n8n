# Fontes de PDFs: escolha, pesquisa e importação

19 de outubro de 2026 · implementação local · branch `codex/fontes-pdfs-revisao-importacao-local`.

## O que mudou

A antiga lista de 99 sites ocupava demasiado espaço, não permitia adicionar ou editar fontes e misturava pesquisar com importar. O efeito que importava automaticamente cada PDF descarregado foi removido. O botão principal passa a ser **Procurar PDFs**: encontra ligações e mostra-as para decisão humana. O modo técnico usado é o diagnóstico, sem descarga automática de todos os candidatos.

O percurso é agora:

1. **Escolher sites:** cartões com categoria, domínio, última pesquisa, PDFs candidatos e diagnóstico. Até 12 sites por pesquisa e quatro páginas por site.
2. **Rever resultados:** ver o PDF na origem, importar um documento, ignorar de forma reversível ou eliminar um resultado. A pesquisa em curso tem progresso próprio.
3. **Trabalhar na biblioteca:** o PDF escolhido ganha original, texto, capa e estado de leitura. O leitor continua a enviar páginas verificadas para artigos, campanhas e compositor.

### Fontes

- «Adicionar fonte» abre um formulário com nome, endereço HTTPS, categoria e notas editoriais.
- O menu de cada cartão permite editar, pausar/reativar ou remover a fonte do projeto.
- Configuração persistida no servidor local, por âmbito de conta/projeto, em ficheiro próprio com escrita atómica. Nenhuma preferência destas depende apenas de localStorage.
- O equivalente Cloud está preparado em `hub_editorial_artefactos`, usando a autorização e a reserva de escrita de Documentos já existentes. Não exige novas tabelas nem alterações de permissões.
- O inventário escolhido fica congelado em cada tarefa: editar uma fonte de outro projeto não altera uma pesquisa já iniciada.
- As **19 fontes com falha ou bloqueio no diagnóstico de 18/10** saem da lista ativa por defeito. Ficam em Pausadas, com motivo e possibilidade de reativar. Não foram apagados PDFs nem provas de diagnóstico. Zero PDFs numa consulta bem-sucedida não é tratado como prova de impossibilidade.

### Importar, ignorar e eliminar

- Um candidato não é apresentado como ficheiro validado. O download confirma a assinatura PDF e a leitura confirma a estrutura. HTML disfarçado, login e bloqueios continuam a ser recusados.
- A importação é por escolha explícita, com prevenção de duplicados por SHA-256 dentro do projeto. O título e a categoria acompanham o documento; contadores de download são retirados do título de apresentação quando o site os envolve numa legenda «Descarregar “…”».
- «Ignorar» mantém a ligação e permite «Repor». «Eliminar resultado» remove a ligação das pesquisas do projeto e os downloads temporários sem utilização. Pode voltar a ser encontrada numa futura consulta ao site.
- Se o PDF já estiver na biblioteca, a eliminação é feita no leitor, com confirmação específica. Remove original, versões de capa, texto, leitura e histórico associado deste projeto. Documentos de outros projetos e peças editoriais já produzidas são preservados. Cópias de segurança e o arquivo original do antigo PDF Tracker não são apagados por esta ação.
- A limpeza Cloud recusa documentos com pesquisas ou preparação em curso. Os ficheiros são removidos antes de concluir a limpeza dos metadados; falhas devolvem um erro e permitem repetir, em vez de anunciar sucesso.
- «Adicionar por endereço» também passa a pedir a escolha de importação quando encontra diretamente um PDF.
- A agenda de pesquisa preparada no worker passa a produzir candidatos para revisão e a respeitar fontes pausadas/removidas do projeto. Não inicia tarefas vazias. A configuração de frequência permanece na Automação; não foi ativada nenhuma agenda nesta ronda.

## Mapeamento e verificação real

Seleção editorial para IA, formação, gestão, marketing e emprego. Os resultados abaixo foram obtidos pelo motor do Hub em **19/10/2026**, respeitando robots.txt. Contagens de ligações candidatas não garantem que todos os PDFs sejam descarregáveis.

| Fonte oficial | Utilidade | Resultado nesta verificação |
| --- | --- | --- |
| [Stanford HAI](https://hai.stanford.edu/ai-index) | IA, economia e formação | 2 PDFs candidatos |
| [LinkedIn Economic Graph](https://economicgraph.linkedin.com/research) | Emprego e competências | 2 PDFs candidatos |
| [APAN](https://apan.pt/conhecimento/estudosquestionarios/) | Marketing e comunicação em Portugal | 2 PDFs candidatos |
| [IAPMEI](https://www.iapmei.pt/) | Gestão, inovação e PME | 8 PDFs candidatos |
| [FFMS](https://ffms.pt/pt-pt/estudos) | Contexto económico e social português | 5 PDFs candidatos |
| [Microsoft Worklab](https://www.microsoft.com/worklab) | IA no trabalho e produtividade | Acesso confirmado; zero PDFs nas páginas consultadas |
| [Eurofound](https://www.eurofound.europa.eu/en/topics/teleworking) | Teletrabalho e gestão de trabalho híbrido | robots.txt respondeu HTTP 429; recolha suspensa |
| [GSMA](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-economy/) | Economia móvel; contexto para SMS e comunicação | HTTP 403; sem download automático |

As fontes bloqueadas continuam disponíveis como referência editorial para visita manual. Uma adição dessas sugestões fica pausada por defeito. Não se contornaram bloqueios, formulários ou autenticação. O diretório não promete uma fonte especificamente sobre desempenho de SMS quando apenas há dados sobre o setor móvel.

O relatório técnico reproduzível está em [fontes-selecao-2026-10-19.json](auditorias/fontes-selecao-2026-10-19.json), com URLs e evidências. A interface usa uma versão pequena desses resultados; o relatório histórico completo não é incorporado nos bundles Cloud.

## Prova no navegador

- APAN devolveu dois candidatos. Antes da escolha, a biblioteca manteve os dois documentos que já tinha.
- Foi escolhido apenas **WFA DEI Portugal 2021**, 2,3 MB: importado, capa criada, **28/28 páginas com texto**, documento reaberto e título editado. O outro candidato continuou por importar.
- Foi adicionada uma fonte OCDE de formação, guardada e reencontrada após recarregar o Hub. O teste de acesso foi bloqueado; a fonte foi pausada pelo percurso normal, sem a apresentar como utilizável automaticamente.
- O layout foi verificado a 390px e no computador, sem transbordo horizontal do documento. A largura temporária do navegador foi reposta.
- Nenhum PDF existente foi eliminado no navegador. As rotas de eliminação foram exercitadas com dados de teste isolados.

Evidências:

- [Cartões e sugestões](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/fontes-pdfs/sugestoes-desktop.png>)
- [Telemóvel](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/fontes-pdfs/fontes-mobile.png>)
- [PDF real com texto e capa](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/fontes-pdfs/pdf-real-texto-capa.png>)

## Verificação técnica e entrega

- Suite completa: **1 277 testes aprovados; dois opcionais ignorados**. Dezasseis casos adicionados nesta ronda cobrem decisão explícita, persistência, isolamento, validação de endereços, duplicados, limpeza e métricas de endereços editados.
- TypeScript da aplicação e backend; builds da interface, Node e pacote Edge; verificação do grafo Edge com 255 ficheiros.
- ESLint aprovado nos novos módulos e no componente de Fontes revisto. Não se afirma que todo o legado esteja livre de avisos.
- Mantêm-se os avisos anteriores de bundles grandes, Browserslist e React Router.

**Sem push, publicação, deploy, prompts ou consumo de créditos Lovable. Sem pedidos pagos DataForSEO, DeepSeek ou geração de imagens. 0 créditos = 0,00 €.** A pesquisa dos sites e o processamento do PDF foram locais e gratuitos.

## O que ainda exige outra ronda

1. Instalar este pacote no backend Cloud e repetir o percurso com autenticação e Storage reais. Nesta ronda houve testes locais com o adaptador Cloud simulado, não validação da infraestrutura publicada.
2. Sites com HTTP 403, 429, formulários ou regras de robots exigem outro endereço público permitido ou upload manual; não existe garantia de extração para todos os 99 sites.
3. A consulta é limitada a quatro páginas por fonte. Não é uma indexação integral de cada domínio, nem garante encontrar todos os PDFs ou todas as novidades.
4. O reconhecimento de um documento importado continua a assentar no hash do binário. O acompanhamento de novas versões publicadas no mesmo URL e a normalização de parâmetros temporários em todos os fornecedores podem ser aprofundados.
