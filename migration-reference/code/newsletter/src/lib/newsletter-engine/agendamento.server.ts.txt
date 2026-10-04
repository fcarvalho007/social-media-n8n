// Motor de agendamento: executa edições cujo `agendado_para` já passou.
import { admin, dispararEgoi, publicarWordpress } from "./envio.server";

export interface ResultadoAgendamento {
  processadas: number;
  detalhes: Array<{ edicao_id: string; numero: number; ok: boolean; mensagem: string }>;
}

/** Executa todos os agendamentos vencidos (idempotente por claim de estado). */
export async function executarAgendamentos(): Promise<ResultadoAgendamento> {
  const sb = admin();
  const agora = new Date().toISOString();

  const { data } = await sb.from("edicoes")
    .select("id, numero, agendamento_listas, agendamento_wordpress, agendado_por, estado")
    .eq("agendamento_estado", "agendado")
    .lte("agendado_para", agora)
    .order("agendado_para", { ascending: true })
    .limit(5);

  const pendentes = (data ?? []) as Array<{
    id: string; numero: number; agendamento_listas: unknown;
    agendamento_wordpress: boolean; agendado_por: string | null; estado: string;
  }>;

  const detalhes: ResultadoAgendamento["detalhes"] = [];

  for (const ed of pendentes) {
    // Claim: só avança quem conseguir mudar o estado de 'agendado' para 'a_executar'.
    const { data: claim } = await sb.from("edicoes")
      .update({ agendamento_estado: "a_executar", agendamento_iniciado_em: new Date().toISOString() })
      .eq("id", ed.id).eq("agendamento_estado", "agendado")
      .select("id").maybeSingle();
    if (!claim) continue;

    const quem = `agendamento (${ed.agendado_por ?? "sistema"})`;
    const listaIds = Array.isArray(ed.agendamento_listas) ? (ed.agendamento_listas as unknown[]).map(String) : [];

    try {
      if (ed.estado === "enviada") throw new Error("Edição já tinha sido enviada.");
      if (listaIds.length === 0) throw new Error("Agendamento sem listas.");

      if (ed.agendamento_wordpress) {
        try {
          await publicarWordpress({ edicaoId: ed.id, quemNome: quem });
        } catch (e) {
          await sb.from("audit_log").insert({
            quem, accao: `WordPress falhou no envio agendado da edição #${ed.numero}`,
            detalhe: (e as Error).message,
          });
        }
      }

      const r = await dispararEgoi({
        quemNome: quem,
        edicaoId: ed.id,
        listaIds,
        exigirConfirmacao: false,
      });

      await sb.from("edicoes").update({
        agendamento_estado: r.ok ? "executado" : "falhou",
        agendamento_erro: r.ok ? null : r.mensagem,
      }).eq("id", ed.id);

      await sb.from("audit_log").insert({
        quem, accao: `Envio agendado da edição #${ed.numero} ${r.ok ? "concluído" : "com falhas"}`,
        detalhe: r.mensagem,
      });
      detalhes.push({ edicao_id: ed.id, numero: ed.numero, ok: r.ok, mensagem: r.mensagem });
    } catch (e) {
      const msg = (e as Error).message;
      await sb.from("edicoes").update({ agendamento_estado: "falhou", agendamento_erro: msg }).eq("id", ed.id);
      await sb.from("audit_log").insert({ quem, accao: `Envio agendado da edição #${ed.numero} falhou`, detalhe: msg });
      detalhes.push({ edicao_id: ed.id, numero: ed.numero, ok: false, mensagem: msg });
    }
  }

  return { processadas: detalhes.length, detalhes };
}
