// Explicit access map for every ported newsletter server operation ("module:export").
// Shared by the nl-api gateway (enforcement) and the client shim (confirmation dialogs).
// Pure TS, no imports, so it can be bundled by both Deno and Vite.
//
// leitura  – staff (editor or admin), no side effects outside reads
// editor   – staff, writes only inside this project's database/storage (or paid AI calls)
// admin    – admin only, internal but sensitive (configuration, destructive, irreversible state)
// externa  – admin only + explicit confirmation token; sends email, writes to E-goi/WordPress,
//            changes subscribers, publishes or unpublishes public content
export type NlNivel = "leitura" | "editor" | "admin" | "externa";

export interface NlOp {
  nivel: NlNivel;
  /** Concrete confirmation text shown before an external action. */
  confirmar?: string;
}

const L: NlOp = { nivel: "leitura" };
const E: NlOp = { nivel: "editor" };
const A: NlOp = { nivel: "admin" };
const X = (confirmar: string): NlOp => ({ nivel: "externa", confirmar });

export const NL_OPS: Record<string, NlOp> = {
  "brief-analytics:registarEventoBriefFn": E,
  "brief-publico:obterBriefPublicoFn": L,
  "brief-publico:previsualizarBriefFn": L,
  "brief:listarEdicoesBriefFn": L,
  "brief:listarNoticiasParaBriefFn": L,
  "brief:listarBriefsDaEdicaoFn": L,
  "brief:estadoBriefsDaEdicaoFn": L,
  "brief:criarBriefFn": E,
  "brief:removerBriefDaEdicaoFn": E,
  "brief:guardarConteudoBriefFn": E,
  "brief:guardarLeituraBriefFn": E,
  "brief:guardarIdentidadeBriefFn": E,
  "brief:gerarBriefFn": E,
  "brief:reformularBriefFn": E,
  "brief:reverificarBriefFn": E,
  "brief:aprovarLeituraBriefFn": X("Aprovar esta leitura torna o Destaque visível ao público. Continuar?"),
  "brief:revogarLeituraBriefFn": X("Revogar a aprovação retira este Destaque da leitura pública. Continuar?"),
  "brief:sincronizarBriefPapelFn": X("Sincronizar este Destaque altera o conteúdo publicado. Continuar?"),
  "brief:sincronizarBriefsDaEdicaoFn": X("Sincronizar os Destaques da edição altera o conteúdo publicado. Continuar?"),

  "curadoria-ferramentas:listarFontesDirectorios": L,
  "curadoria-ferramentas:getConfigCuradoriaFerramentas": L,
  "curadoria-ferramentas:correrCuradoriaFerramentasAgora": E,
  "curadoria-ferramentas:criarFonteDirectorio": E,
  "curadoria-ferramentas:actualizarFonteDirectorio": E,
  "curadoria-ferramentas:alternarDirectoriosEmLote": E,
  "curadoria-ferramentas:apagarFonteDirectorio": A,
  "curadoria-ferramentas:setConfigCuradoriaFerramentas": A,

  "curadoria:descobrirFeed": E,
  "curadoria:testarFeed": E,
  "curadoria:correrCuradoriaAgora": E,
  "curadoria:correrFonteAgora": E,
  "curadoria:alternarFontesEmLote": E,

  "definicoes:verificarSecretsAPI": A,
  "definicoes:getWebhookCloudMailinUrl": A,

  "descricoes:corrigirDescricoes": E,
  "encurtar-descricao:encurtarDescricao": E,

  "destinos:estadoDestinosFn": L,
  "destinos:previewArtigoCronicaFn": L,
  "destinos:estadoIntegracaoCronicaFn": L,
  "destinos:diagnosticoCronicaFn": L,
  "destinos:contarArtigosPorSlugFn": L,
  "destinos:prontidaoRevistaFn": L,
  "destinos:guardarUrlCronicaFn": A,
  "destinos:reconciliarHashCronicaFn": A,
  "destinos:repetirDestinoFn": X("Repetir este destino volta a enviar ou publicar o conteúdo fora do estúdio. Continuar?"),
  "destinos:publicarCronicaFn": X("Publicar a crónica no WordPress torna-a pública. Continuar?"),
  "destinos:publicarArtigoCronicaFn": X("Criar o artigo da crónica no WordPress. Continuar?"),
  "destinos:actualizarArtigoCronicaFn": X("Atualizar o artigo da crónica já existente no WordPress substitui o conteúdo publicado. Continuar?"),

  "emails-recebidos:listarEmailsRecebidos": L,
  "emails-recebidos:listarFontesEmail": L,
  "emails-recebidos:listarNoticiasDoEmail": L,
  "emails-recebidos:reprocessarEmail": E,
  "emails-recebidos:activarFonteEReprocessar": E,
  "emails-recebidos:apagarEmailRecebido": A,

  "envio:previewEdicaoFn": L,
  "envio:reconciliarEdicaoFn": A,
  "envio:sincronizarRascunhoFn": X("Criar ou atualizar o rascunho da campanha na E-goi. Nenhum email é enviado. Continuar?"),
  "envio:prepararEnvioFn": X("Preparar o envio cria a campanha na E-goi para as listas escolhidas. Continuar?"),
  "envio:dispararEgoiFn": X("Enviar a newsletter agora para os subscritores. Esta ação não pode ser anulada. Continuar?"),
  "envio:dispararListaFn": X("Enviar a newsletter para esta lista agora. Esta ação não pode ser anulada. Continuar?"),
  "envio:repetirListaFn": X("Voltar a enviar para esta lista. Os subscritores podem receber o email outra vez. Continuar?"),
  "envio:finalizarEnvioFn": X("Fechar o envio desta edição. Só fecha quando a E-goi confirmar a entrega. Continuar?"),
  "envio:publicarWordpressFn": X("Publicar a edição no WordPress torna-a pública. Continuar?"),
  "envio:agendarEnvioFn": X("Agendar o envio automático desta edição para os subscritores. Continuar?"),
  "envio:cancelarAgendamentoFn": X("Cancelar o envio agendado desta edição. Continuar?"),

  "ferramentas:listarFerramentas": L,
  "ferramentas:listarFerramentasDoEmail": L,
  "ferramentas:listarEdicoesDestinoFerramenta": L,
  "ferramentas:contarFerramentasArquivadas": L,
  "ferramentas:actualizarEstadoFerramenta": E,
  "ferramentas:aprovarFerramentaParaRascunho": E,
  "ferramentas:rejeitarFerramentaComBan": E,
  "ferramentas:apagarFerramenta": A,

  "fila-curadoria:contarFilaCuradoria": L,
  "fila-curadoria:processarFilaCuradoria": E,
  "fila-curadoria:retomarFalhadosCuradoria": E,
  "fila-curadoria:definirModoManualCuradoria": A,
  "fila-curadoria:limparFilaAntigaCuradoria": A,

  "ia-leitura:gerarMinhaLeitura": E,
  "imagens:pesquisarPexelsFn": L,
  "imagens:obterImagemBase64Fn": L,
  "imagens:importarPexelsFn": E,
  "imagens:carregarImagemFn": E,
  "newsletter-ia:sugerirAssunto": E,
  "organizar-edicao:sugerirOrganizacaoEdicao": E,
  "pesquisar-fonte:pesquisarFonteIA": E,
  "processar-noticias:extrairNoticias": E,
  "processar-noticias:confirmarNoticias": E,
  "processar-noticias:testarModeloIA": E,
  "processar-noticias:guardarModeloIA": A,
  "propor-apresentacao:proporApresentacaoFn": E,
  "propor-pecas:proporPecasCronicaFn": E,
  "recomecar-edicao:recomecarEdicaoFn": A,

  "revista-preview:previsualizarEdicaoWebFn": L,
  "revista-web:baseUrlEdicoesFn": L,
  "revista-web:listarEdicoesPublicasFn": L,
  "revista-web:obterEdicaoPublicaFn": L,

  "subscricao:estadoSubscricaoFn": L,
  "subscricao:resumoSubscricoesFn": L,
  "subscricao:urlWebhookEgoiFn": A,
  "subscricao:aplicarAccaoSubscricaoFn": X("Alterar a subscrição deste contacto na E-goi. Continuar?"),
  "subscricao:testarSubscricaoFn": X("O teste cria e remove uma subscrição real na E-goi para o email indicado. Continuar?"),

  "verificar-links:verificarLinksEdicao": E,
  "verificar-links:verificarUmLink": E,
  "verificar-links:ignorarLink": E,
  "verificar-links:reactivarLink": E,
};
