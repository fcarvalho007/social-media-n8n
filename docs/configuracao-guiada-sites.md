# Configuração guiada de cada site

Desenvolvimento local na branch `codex/hub-configuracao-sites`, a partir de `d407a815`. Não instalado nem publicado no Lovable nesta ronda.

## Percurso disponível

Abrir **Artigos → Sites e regras** (`/artigos/sites`) e escolher **Configurar** num destino. O assistente parte das definições existentes e divide a tarefa em seis passos:

1. Público e objetivo do conteúdo.
2. Voz: idioma, tom, tratamento do leitor, exemplos e limites.
3. Temas a trabalhar e temas que exigem revisão especial.
4. Oferta real e próximo passo útil para o leitor.
5. Artigos por semana, dias, hora de Lisboa, preparação manual/automática e aprovação humana/automática.
6. Resumo integral, ligações para editar cada decisão e confirmação antes da gravação.

A configuração fica no perfil e política que o motor editorial já usa para redigir e decidir as próximas etapas. Não cria uma segunda configuração desligada do motor. O editor avançado de Automação mantém-se disponível e tem ligação ao assistente.

Os quatro destinos prioritários são smsonline.pt, teletrabalhoweb.com, digitalfc.pt e fredericocarvalho.pt. Os restantes destinos do catálogo aparecem em **A desenvolver mais tarde**, incluindo ensinoemcasa.com e leigdpr.pt. Podem guardar o planeamento, mas não ativar produção ou publicação automática. Esta ronda não acrescenta domínios arbitrários nem configura credenciais WordPress.

## Gravação e recuperação

- Nada é gravado no motor durante a passagem entre passos. O último passo guarda todos os campos numa operação atómica e incrementa a revisão da política.
- O formulário pode ser recuperado neste navegador, separadamente por conta, projeto e site. Ao reabrir, o utilizador escolhe continuar o rascunho ou usar a versão guardada. O rascunho local não é apresentado como gravação no servidor nem sincronizado entre dispositivos.
- Falhas de gravação conservam o texto e permitem repetir. Uma falha ao atualizar a lista depois de uma gravação confirmada é apresentada como falha de atualização, sem sugerir uma segunda gravação.
- Revisão concorrente: o servidor compara a revisão recebida com a guardada; recusa sobrepor uma versão mais recente. A interface bloqueia a gravação quando deteta essa alteração. Um rascunho recuperado de uma revisão anterior pede nova revisão explícita.
- Depois de guardar, a lista mostra **Configuração revista**. Alterações posteriores pelo editor avançado tornam o estado **Rever alterações**.

## Regras preservadas

O assistente permite editar apenas os campos visíveis. O servidor rejeita propriedades adicionais que tentem mudar domínio, estado do site, revisão obrigatória, ativação, orçamento ou autorizações avançadas.

fredericocarvalho.pt mantém aprovação humana obrigatória, validada no servidor mesmo num pedido direto. Temas sensíveis continuam sujeitos aos controlos existentes. A frequência deve corresponder ao número de dias escolhidos, com hora válida e até sete artigos por semana.

Guardar não ativa uma política inativa, não altera a pausa geral, os limites financeiros, a autorização de pesquisa automática ou a sequência avançada. Se a política já estiver ativa, as definições revistas passam a valer nos próximos ciclos autorizados; esta consequência aparece no resumo. Artigos aprovados desse destino perdem a aprovação antiga e voltam a revisão; os textos são preservados e os outros destinos não são alterados.

Na nuvem, leitores podem consultar; a escrita exige a permissão de edição existente no contexto autenticado do projeto. A ação não chama IA, DataForSEO, WordPress nem executa tarefas agendadas.

## Integração preparada

`POST /seo/configurar-site`, autenticado, com `X-Hub-Projeto`:

```json
{
  "siteId": "sms",
  "revista": 1,
  "confirmacao": true,
  "definicao": {
    "publico": "Empresas que precisam de comunicar com clientes por SMS.",
    "objetivo": "Crescer tráfego orgânico relevante sobre SMS marketing.",
    "voz": "Português de Portugal, prático, direto e empresarial.",
    "oferta": "Contacto para avaliar a estratégia de SMS marketing.",
    "temasPermitidos": ["SMS marketing", "Fidelização"],
    "temasExcluidos": ["Legislação"],
    "dias": [2, 5],
    "hora": "09:00",
    "limiteSemanal": 2,
    "producao": "manual",
    "publicacao": "humana"
  }
}
```

O preview usa `/__hub-seo/configurar-site` com o mesmo motor e validação. O motor local é partilhado nesta demonstração; não representa isolamento entre projetos de produção. O identificador de projeto é capturado explicitamente nas leituras cloud e na gravação do assistente, evitando aplicar o formulário ao projeto escolhido noutro separador durante o pedido.

A nova marca de conclusão é opcional no JSON do estado editorial; não exige migração SQL nem dependências adicionais. A futura instalação precisa de publicar o backend com a ação nova antes da interface. Os bundles `hub-editorial/runtime.js` e `hub-editorial-worker/runtime.js` foram regenerados a partir das fontes, não editados manualmente.

## Verificação e limites

- **1 072 testes aprovados, 1 ignorado** na bateria completa. Inclui 28 novos testes de UI, validação, navegação, persistência, concorrência, permissões, bloqueios e utilização da voz no prompt editorial.
- TypeScript da aplicação/backend, lint dos ficheiros alterados, Deno dos dois entrypoints, grafo Edge (255 ficheiros) e build de produção aprovados.
- Revisão em computador (1280 × 720) e telemóvel (390 × 844), incluindo lista, formulário, ritmo/aprovação e resumo final. Evidência em segmentos de viewport em `.impeccable/review/sites-guiados/`.
- A revisão visual independente pediu duas correções na navegação móvel: primeiro botão Configurar visível mais cedo e passos numa linha, sem ficarem ocultos pelo cabeçalho. O veredicto **ship** classificou ambas como resolvidas; esta segunda avaliação incide nessas correções. Após o ajuste passaram novamente 45 testes dirigidos, TypeScript, lint e build.
- Não foram substituídas as definições reais dos sites para demonstrar a gravação. Os testes de persistência gravam e reabrem motores em pastas temporárias isoladas.
- Não foram feitos testes com novas contas em produção nem instalado o backend novo no Lovable. As pendências de instalação e permissões de rondas anteriores permanecem descritas em `docs/publicacao-segura.md`.
- Sem instalação de credenciais, ligação de WordPress, ativação de políticas ou pedidos pagos nesta ronda.

Custos desta ronda: **0 créditos Lovable = 0,00 €** e nenhum pedido pago a fornecedores.
