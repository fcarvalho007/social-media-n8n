# R3 — Motor de carrosséis (nota de produto e design)

- Percurso: Fonte → Conteúdo → Design, em /estudio/carrosseis. «Para quem?» usa os projetos reais do utilizador e a escolha atual do Estúdio.
- Fonte: só texto colado nesta ronda (link/PDF ficam para rondas próprias, sem botões fingidos). Texto curto é aceite se tiver um facto completo; o número de slides é sugerido pelo tamanho do texto e editável.
- Geração no servidor (fila com reservas R2). Sem IA paga: estruturação determinística só com frases da fonte; o modo «Demonstração» só aceita a fixture sintética.
- Conteúdo partilhado pelas variantes A e B; cada alteração cria nova versão com verificação de versão (conflitos mostram as duas versões).
- Design usa o editor da R1, a ocupar o ecrã útil; texto que não cabe é assinalado, nunca escondido em silêncio.

## Design system do estúdio de carrosséis (redesign)
- Tokens escopados em `.mc-estudio` (src/features/motor/estudio.css): fundo grafite #171a1c, superfície #202427, texto #F2F2EE, secundário AA, acento único sálvia #B8CBA8 com texto escuro; raios 4/8/12; palco do canvas um tom abaixo; movimento 200 ms, desligado com reduced-motion; Work Sans auto-hospedada (mesma do renderer). O resto do Hub mantém o seu tema.
- Componentes (src/features/motor/Estudio.tsx): Quadro, Cabecalho (uma barra), Etapas (Fonte → Narrativa → Composição → Revisão, aria-current, concluídas revisitáveis), BarraAcoes (única, safe-area), Grupo (divulgação progressiva nativa), useLargura (canvas no tamanho real).
- Etapas: Fonte só com «Para quem?» e texto; título em «Detalhes»; erros só após blur/avançar; recuperação local por utilizador+projeto. Narrativa: objetivo (Informar/Explicar/Opinião/Divulgar), estrutura prevista, «Personalizar» e «Opções de geração» recolhidos; após gerar, storyboard com papéis e evidência §. Composição: editor canónico R1 com faixa de etapas. Revisão: folhear páginas, variante A/B por miniatura, 1 Exportar, 2 Aprovar e preparar rascunho (fluxo R6 intacto).
- Biblioteca: miniaturas reais da capa (variante A, versão atual), título com fallback, estado, data; Teste/Demonstração etiquetados.
- Reabrir: aprovado → Revisão; pronto → Narrativa; em curso → Fonte com progresso real.
