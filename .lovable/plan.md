# Refinar o módulo «Criar»

## Objetivo
Transformar `/pending?tab=create` numa entrada clara para os dois percursos que já existem: criação manual e criação assistida por IA. Carrossel, post e story passam a estar visíveis como formatos reais; a versão n8n fica apenas como referência discreta.

## Diagnóstico confirmado
- O ecrã atual ainda apresenta **post** e **story assistidos como «Em construção»**, tanto em `ModeSelector` como em `ActionButtons`.
- O motor novo já permite escolher **carrossel, post ou story** em `CarrosselNovo`, e os testes existentes confirmam os três formatos.
- A secção **«Versão anterior · n8n» está aberta por defeito** e ocupa demasiado espaço.
- A ajuda «Como funciona?» ainda diz que o modo assistido usa **Google Forms**, informação desatualizada.
- Depois de escolher IA, o ecrã repete uma segunda apresentação do mesmo percurso, tornando a entrada menos direta.

## Alterações

### 1. Dois percursos principais, sem passos redundantes
- Manter **Manual** e **Assistido por IA** como as duas escolhas principais, com hierarquia visual equilibrada.
- O modo manual abre diretamente o editor manual existente.
- O modo assistido mostra logo três opções claras:
  - **Carrossel** — várias páginas;
  - **Post** — uma imagem 1080×1350;
  - **Story** — uma imagem 1080×1920.
- Cada opção abre o motor novo já no formato correspondente, sem um ecrã intermédio repetido.

### 2. Layout mais refinado e compacto
- Reduzir texto genérico e dar prioridade às ações.
- Usar um cartão principal por percurso e, dentro do assistido, três opções de formato compactas e facilmente comparáveis.
- Preservar «Meus carrosséis», «Carrosséis da crónica», trabalhos iniciados e a preferência de modo, mas com menor peso visual.
- Garantir uma coluna no telemóvel e uma composição equilibrada no computador, sem cartões dentro de cartões nem excesso de altura.

### 3. n8n reduzido a referência
- Substituir o bloco aberto por uma linha discreta e recolhida: **«Versão anterior · n8n»**.
- Manter apenas o acesso real ao formulário antigo, sem promover stories ou posts n8n inexistentes.
- Não alterar o endereço nem o funcionamento legado.

### 4. Texto e ajuda alinhados com o sistema real
- Retirar todas as menções «Em construção» para post e story assistidos.
- Atualizar «Como funciona?» para comparar o editor manual com o motor assistido atual, sem referir Google Forms como fluxo principal.
- Usar texto em PT-PT e sentence case.

## Âmbito técnico
- Ajustar `src/components/ModeSelector.tsx`, `src/components/ActionButtons.tsx`, `src/components/ModeDifferencesModal.tsx` e a composição da área de criação em `src/pages/Pending.tsx`.
- Reutilizar componentes, ícones, botões e tokens existentes; não introduzir dependências.
- Não alterar motor, base de dados, formatos, permissões, integrações, publicações ou n8n.
- Atualizar os testes de interface para confirmar os destinos dos três formatos e a apresentação reduzida do legado.

## Verificação
- Confirmar que Manual abre `/manual-create`.
- Confirmar que Carrossel, Post e Story abrem o motor novo com o formato correto.
- Confirmar que não aparece «Em construção» nem «Google Forms (atual)» no percurso principal.
- Confirmar que n8n começa recolhido e conserva o único link real.
- Validar o ecrã em computador e a 375 px, incluindo trabalhos iniciados e preferência de modo.
- Executar os testes relevantes, verificação de tipos e confirmar que a aplicação compila.
