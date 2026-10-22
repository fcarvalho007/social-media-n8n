# Narrativa: corrigir o erro da tradução e rever o ecrã (UX/UI 20/20)

## 1. O erro (primeiro)
O que aconteceu: ao carregar em «Preparar versão PT-PT», a tradução foi recusada pela verificação de segurança («Os números de §1 não coincidem com o original»). A recusa em si é correta, mas:
- o ecrã trata-a como uma falha da aplicação e abre o aviso vermelho «Error»;
- a verificação é demasiado rígida: recusa traduções corretas quando os números mudam só de forma (por exemplo «$1.5 million» → «1,5 milhões de dólares», «1st» → «1.º», «2,000» → «2000»).

Correções:
1. Confirmar a causa exata lendo o §1 original e a tradução recusada guardada (só leitura). Se a causa for outra, ajusto antes de mexer.
2. Ecrã: a recusa passa a ser um estado normal, sem aviso de erro da aplicação. Mostra uma mensagem curta, o parágrafo em causa e duas saídas: «Avançar com o original» ou «Repetir uma vez (1 pedido)».
3. Verificação: comparar os números pelo seu valor (separadores, ordinais e sufixos normalizados), mantendo a recusa quando um número desaparece, muda ou é inventado. Teste com casos reais de aceitar e de recusar.
4. Sem repetições automáticas nem pedidos pagos nos testes.

## 2. Layout da Narrativa
Sim, o ecrã ficou diferente com as últimas adições: o aviso do idioma, a escolha Editorial/PAS e o objetivo ficaram empilhados, com três botões principais azuis a competir e espaço vazio à esquerda. Proposta para repor a hierarquia:

```text
[Etapas]
Marca · título · 40 §                         [Mudar fonte]
┌ Aviso idioma (compacto, 1 linha + ações) ┐
O que deve fazer este carrossel?
[Informar] [Explicar] [Opinião] [Divulgar]     ← objetivo primeiro
Estrutura:  ( Editorial )  ( PAS )  · ambas são geradas
> Personalizar (tom, público, apelo)  > Voz ativa
──────────────────────────────────────────────
Voltar                     2 pedidos · [Gerar Editorial + PAS]
```

## 3. Avaliação de melhorias (20)
1. Recusa da tradução sem aviso de erro da aplicação.
2. Um só botão principal por ecrã; os outros passam a secundários.
3. Aviso de idioma compacto e recolhível depois da escolha.
4. «Avançar em PT-PT» e «Preparar versão PT-PT» fundidos numa só ação clara.
5. Mensagem de recusa em linguagem simples, junto ao parágrafo em causa.
6. Objetivo antes da estrutura (ordem de decisão natural).
7. Editorial e PAS como cartões iguais, explicando que ambos são gerados.
8. Cartões com altura igual e texto mais curto.
9. Coluna central com largura de leitura confortável e alinhada às etapas, sem vazio à esquerda.
10. Linha da fonte com título truncado e «Mudar fonte».
11. «Voz ativa» numa linha recolhida, sem link solto.
12. «Personalizar» e «Rever abordagem» juntos num só painel recolhido.
13. Barra inferior: custo («2 pedidos») junto ao botão, frase auxiliar curta.
14. Botão final nunca cortado à direita (o atual sai do ecrã).
15. Estado de espera com progresso por versão (Editorial / PAS).
16. Foco do teclado visível e ordem lógica de tabulação.
17. Contraste AA do texto secundário e dos cartões escolhidos.
18. Espaçamentos verticais reduzidos (regra de ecrã compacto).
19. A 375 px: cartões empilhados, barra inferior fixa sem sobrepor conteúdo.
20. Textos revistos em PT-PT, em sentence case, sem termos técnicos.

## Verificação
- Testes da verificação da tradução (aceitar formatos equivalentes, recusar números alterados) e do ecrã sem aviso de erro.
- Capturas em desktop e 375 px, sem pedidos pagos.

## Detalhes técnicos
- `supabase/functions/_shared/motor/traducao.ts`: normalizar `numeros()` por valor (sufixos/ordinais/separadores); mantém recusa para números em falta ou extra. Exige redeploy do `mc-motor` e `verificar-grafo-edge.py`; pela instrução de 19/10, a instalação fica pendente até autorização.
- Cliente: tratar 422 `estado:"invalida"` como resultado esperado no serviço do motor (não lançar erro de execução).
- Layout: `CarrosselNovo.tsx` (etapa Narrativa) e `Estudio.tsx` (`BarraAcoes`), só tokens existentes.

## Decisão necessária
A correção da verificação da tradução exige instalar o motor no servidor. Ao aprovar, autorizas essa instalação; sem ela, faço o ecrã (pontos 1–20) e o tratamento da recusa no cliente.
