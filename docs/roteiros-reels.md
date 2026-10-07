# Roteiros de Reels

Este documento conserva o registo das rondas iniciais. A ampliação atual de «Preparar gravação», os materiais e a instalação da migração 0049 estão descritos em [Materiais para gravação de Reels](roteiros-materiais.md).

Extensão do Hub, modo Operate, identidade visual existente: superfícies claras, tokens semânticos indigo, tipografia e componentes Radix/shadcn existentes. Editor numa coluna com a fonte recolhida, opções avançadas e ajustes visuais opcionais. Duração de 60 segundos e objetivo «Explicar» sugeridos; notícia aprovada preenche a fonte, e o título pode ser derivado do texto. Uma ação primária por etapa. Sem alterações globais de tema.

Base editorial: documento «Desenvolvimento App Guiões De Vídeo.docx» entregue pelo proprietário. São aproveitadas cinco estruturas (Gancho–Valor–Ação, PAS, AIDA, BAB, Micro-VSL), frases para leitura oral, uma ideia por trecho e sugestões visuais. Estatísticas de retenção e promessas de viralidade do documento não são tratadas como regras comprovadas. A proposta Bubble/OpenAI/ElevenLabs/Shotstack é material de pesquisa, não uma instrução de implementação. Mantém-se React/Supabase/DeepSeek. Tempos calculados por palavras/minuto são estimativas, não alinhamento de áudio.

Fluxo: Curadoria aprovada ou texto → Criar e comparar com IA → comparar 1–3 roteiros → aplicar explicitamente → ajustar apenas o necessário → guardar versão → copiar para BIGVU ou descarregar TXT. O botão «Gerar e comparar roteiros» fica junto às estruturas; público, ritmo e instruções são opcionais. O modo manual continua disponível, recolhido. Histórico permite recuperar versões sem apagar posteriores.

Persistência: migrações 0045 e 0046, tabelas rv_roteiros/rv_versoes/rv_geracoes, RLS por projeto, escritas RPC com controlo de versão. A fonte curada é relida no servidor e comparada pelo hash. A IA trabalha sobre o snapshot guardado. Reserva idempotente por pedido; resultado desconhecido nunca repetido automaticamente; propostas guardadas à parte para não sobrescrever edições. Custo/token registado no ledger existente.

## Alternativas e preparação de gravação

Cada secção tem «Regenerar com IA», com quatro orientações: outra abordagem, pergunta, mais direto ou mais curto. Um pedido confirmado produz três alternativas só para esse trecho, usando o roteiro completo como contexto. A aplicação cria uma nova variante, conserva o original e todas as edições das outras secções. Se o trecho mudou depois do pedido, a proposta é recusada em vez de apagar essa edição.

«Preparar gravação» é uma etapa opcional. A IA propõe enquadramento, ação, cenário, luz, imagens de apoio, termos de pesquisa e notas, sem mudar a locução, as referências nem a ordem das cenas. O plano permite percorrer/ensaiar a sequência de texto e copiar ou exportar TXT/PDF. Tempos estimados por palavras/minuto; não reproduz áudio, não gera imagens e não renderiza MP4. Não requer o outro projeto Lovable, nem importa a sua autenticação ou provedores.

`rv_reservar_contexto` captura a variante/trecho diretamente do documento guardado no servidor; não aceita uma cena inventada pelo cliente. Usa a reserva idempotente e o limite diário já existentes. As propostas ficam separadas até «Usar esta alternativa» ou «Aplicar plano». Um resultado desconhecido conserva o identificador: «Verificar pedido pendente» consulta o mesmo pedido sem iniciar outra chamada paga.

## Validação local

`npm run dev:roteiros` abre http://127.0.0.1:5180/estudio/roteiros. O modo usa PostgreSQL via PGlite, persistido em `.roteiros-local/` (ignorado pelo Git). As tabelas, RPCs e validações dos roteiros são as das migrações 0045 e 0046. A base local existente é atualizada para 0046 sem reinserir conteúdos. O suporte local de contas/projetos/curadoria é isolado em `scripts/roteiros/base-local.sql` e nunca deve ser aplicado ao Cloud. Os conteúdos são inseridos pelo utilizador; não há notícias ou roteiros pré-definidos no código de produção.

A entrada local não usa a sessão Supabase nem as chaves Cloud. Publicações ficam desligadas. A IA começa indisponível e pode ser ativada em «Ativar IA na pré-visualização local», com uma chave DeepSeek e limite diário sugerido de três pedidos. A chave introduzida nesse formulário fica apenas na memória do servidor local e desaparece quando este termina; não é guardada na base, no browser ou no Git. Alternativamente, o servidor pode usar `DEEPSEEK_API_KEY` no ambiente ou em `.env.roteiros.local` (ignorado pelo Git). O endereço local só aceita pedidos do mesmo endereço/origem. As chamadas reais são pagas à DeepSeek e exigem confirmação, mesmo em pré-visualização.

A geração, os erros do fornecedor, as referências, as alternativas e os conflitos são testados automaticamente, sem apresentar respostas simuladas como IA real na interface. Não foi usada uma chave nem realizada uma chamada paga nesta ronda. Falta o ensaio real da DeepSeek e, depois da instalação Cloud, a verificação do backend remoto. A pré-visualização local não certifica a configuração remota.

O teste no navegador inseriu uma síntese do documento fornecido, criou o roteiro pela Curadoria, editou três trechos, guardou, copiou a locução, acrescentou notas visuais, recuperou versões e recarregou a página. O exemplo está na base local, não no repositório. Layout verificado em desktop e telemóvel, sem transbordo horizontal. A descarga TXT é testada no componente. Nesta ronda, o PDF do plano foi descarregado pelo navegador e revisto após renderização: margens, acentos e texto sem cortes. Navegação entre cenas também verificada. A bateria completa passou com 435 testes; após os últimos ajustes, os 15 testes focados em interface e refinamento passaram. Typecheck, build e verificação das funções Edge passaram. Ativar a IA local conserva as edições por guardar.

## Revisão de UX e navegação — 7 de outubro de 2026

- Opções de geração recolhidas quando já existe texto; «Ver opções de geração» no estado sem propostas abre e foca as opções, sem fazer chamadas.
- Guardar acessível numa barra fixa enquanto há alterações, com espaço no fim do editor para não esconder as últimas ações. Ctrl/⌘ + S usa a mesma gravação e bloqueia envios duplicados.
- Saída por links permite «Guardar e sair» e só navega depois do sucesso. Falhas mantêm a edição e a caixa de decisão. Fechar/recarregar a página mantém o aviso nativo de alterações pendentes; a proteção por caixa de decisão cobre os links da aplicação, não o botão Voltar nativo do browser numa navegação SPA.
- Remover uma secção oferece «Desfazer remoção», mantendo o identificador original e as alterações das restantes secções. Alternar Curadoria/Texto conserva a notícia escolhida.
- Confirmar um pedido de IA desconhecido não marca como guardada a edição feita entretanto. A verificação conserva o mesmo identificador, contexto e briefing.
- Pelo menos uma estrutura permanece selecionada. Duração personalizada e valores inválidos têm explicação visível. Campos de edição a 16 px em telemóvel, controles de secção com alvo de 44 px.
- O ensaio pode recomeçar e suporta uma lista de cenas reduzida; texto vazio não inicia ensaio nem exporta um plano vazio. Exportações isoladas do componente para evitar invalidação da atualização local.

Verificação: 444 testes passaram na bateria completa (um teste opcional de fotografias ignorado). Depois dos últimos ajustes, 17 testes de interface/ensaio passaram; TypeScript, ESLint dos componentes alterados (sem avisos) e build passaram. Detector visual sem ocorrências. O build mantém os avisos já existentes de bundles grandes.

No navegador foi criado um registo identificado como «Revisão UX — teste local», em PGlite: fonte → edição → remoção/desfazer → guardar e sair → reabrir → guardar pelo teclado. A notícia selecionada sobreviveu à troca de separadores; as setas navegaram entre etapas. A barra fixa foi medida dentro do ecrã (topo ~685, fundo ~751, altura de viewport 767), após detetar que o overflow global da plataforma impede sticky em telemóvel. Nenhuma regra global de overflow foi alterada. Os campos tinham 16 px e não houve transbordo horizontal no ecrã pequeno. O exemplo anterior permaneceu na versão 6. Sem chamada paga, sem alteração no backend Cloud ou publicação.

## Instalação posterior à validação do proprietário

1. Rever e enviar a branch `codex/roteiros-reels` para o GitHub; comparar com a main atual antes de integrar. Não substituir alterações posteriores do Lovable.
2. Integrar o código na branch sincronizada do projeto Lovable, pelo fluxo GitHub configurado. A sincronização do frontend, por si só, não instala as tabelas ou a função.
3. Aplicar uma única vez `drizzle/migrations/0045_roteiros_reels.sql` e depois `drizzle/migrations/0046_roteiros_refinamento.sql` no mesmo backend do Hub. Não executar `scripts/roteiros/base-local.sql` no Cloud. Confirmar que os índices 0045/0046 não foram entretanto ocupados por outra migração; renumerar de forma consistente se necessário.
4. Instalar `rv-roteiros`, com a configuração de `supabase/config.toml`. Reutiliza `DEEPSEEK_API_KEY` no servidor; nenhuma chave entra no bundle do cliente.
5. Os roteiros têm um limite diário próprio de gerações, usando o valor `mc_orcamentos.max_chamadas_dia` do projeto. Zero desliga IA. Não se apresenta esse limite como um teto monetário ou como um contador agregado aos carrosséis. Cada pedido produz até três variantes numa chamada. Os resultados desconhecidos não são repetidos automaticamente.
6. Com uma conta autorizada, testar notícia aprovada → criar → gerar uma vez → comparar → aplicar → regenerar um trecho → confirmar que os outros ficam iguais → aplicar → preparar gravação → exportar PDF/TXT → guardar → reabrir → copiar. Conferir também o limite diário e a consulta idempotente de pedidos. Verificar `rv_geracoes`, histórico e ledger `custos_ia` sem enviar newsletters nem publicar redes sociais.
7. Validar uma conta sem acesso e um conflito entre separadores. Publicar apenas após esse ensaio e a validação do proprietário.

O trabalho local não alterou Secrets, dados ou código publicados no Lovable. Integração futura com o projeto de vídeo: `FonteRoteiro`, `DocumentoRoteiro` e cenas têm identificadores persistentes e notas separadas; timestamps atuais são estimativas, não devem ser usados como alinhamento de áudio.
