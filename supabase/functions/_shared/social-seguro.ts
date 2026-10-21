// Shared by every social write route. No expiring locks, automatic resend, or provider fallback.
type Cliente = any;
export class ErroSocial extends Error {
  constructor(message: string, public status = 503) {
    super(message);
  }
}
export async function exigirEditor(req: Request, sb: Cliente): Promise<string> {
  const bearer = req.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) {
    throw new ErroSocial("Autenticação necessária.", 401);
  }
  const { data, error } = await sb.auth.getUser(bearer.slice(7));
  if (error || !data?.user?.id) throw new ErroSocial("Sessão inválida.", 401);
  const roles = await sb.from("user_roles").select("role").eq(
    "user_id",
    data.user.id,
  ).in("role", ["admin", "editor"]);
  if (roles.error) {
    throw new ErroSocial("Não foi possível verificar as permissões.");
  }
  if (!roles.data?.length) {
    throw new ErroSocial("Sem permissão editorial.", 403);
  }
  return data.user.id;
}
export async function exigirProjeto(
  sb: Cliente,
  user: string,
  project: unknown,
): Promise<string | null> {
  if (project == null) return null; // Historical unassigned records remain unassigned.
  if (typeof project !== "string" || !/^[0-9a-f-]{36}$/i.test(project)) {
    throw new ErroSocial("Projeto inválido.", 400);
  }
  const { data, error } = await sb.from("projects").select("id").eq(
    "id",
    project,
  ).eq("owner_id", user).maybeSingle();
  if (error || !data) throw new ErroSocial("Projeto inacessível.", 403);
  return project;
}
function canonical(value: unknown): unknown {
  if (typeof value === "string") {
    return value.normalize("NFC").replace(/[\u200B\u2063\uFEFF]/g, "").trim();
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map((
        [k, v],
      ) => [k, canonical(v)]),
    );
  }
  return value;
}
export async function fingerprintSocial(content: unknown): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(canonical(content))),
  );
  return Array.from(
    new Uint8Array(hash),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function respostaSocial(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
export function erroSocial(e: unknown, cors: Record<string, string>): Response {
  if(e instanceof SyntaxError) e=new ErroSocial("Pedido JSON inválido.",400);
  return respostaSocial(
    {
      success: false,
      fallback: false,
      error: {
        message: e instanceof ErroSocial
          ? e.message
          : "Operação não concluída. Verifica o histórico antes de repetir.",
        code: "SOCIAL_BLOCKED",
        isRetryable: false,
      },
    },
    e instanceof ErroSocial ? e.status : 503,
    cors,
  );
}
export async function reservarSocial(
  sb: Cliente,
  user: string,
  post: unknown,
  destino: string,
  fase: "publicar" | "aprovar",
  content: unknown,
  cors: Record<string, string>,
) {
  if (typeof post !== "string" || !/^[0-9a-f-]{36}$/i.test(post)) {
    throw new ErroSocial("Guarda a publicação antes de a enviar.", 400);
  }
  const { data, error } = await sb.rpc("social_publicacao_reservar", {
    _user: user,
    _post: post,
    _destino: destino,
    _fase: fase,
    _fingerprint: await fingerprintSocial(content),
  });
  if (error) {
    throw new ErroSocial(
      error.code === "42501"
        ? "Publicação inacessível."
        : "Não foi possível reservar a publicação.",
      error.code === "42501" ? 403 : 503,
    );
  }
  const r = data?.[0];
  if (!r) throw new ErroSocial("Reserva não confirmada.");
  if (!r.reservada) {
    return {
      repetida: r.resultado
        ? respostaSocial(
          { ...r.resultado, deduplicated: true },
          r.http_status ?? 409,
          cors,
        )
        : respostaSocial(
          {
            success: false,
            fallback: false,
            error: {
              message: r.estado === "aceite"
                ? "Esta publicação já foi aceite. Consulta o histórico."
                : "Há um envio em curso ou por confirmar. Consulta o histórico antes de repetir.",
              code: "DUPLICATE_IN_PROGRESS",
              isRetryable: false,
            },
          },
          409,
          cors,
        ),
    };
  }
  return {
    id: r.id as string,
    token: r.token as string,
    key: `hub-${r.id}`,
    repetida: undefined,
  };
}
export async function concluirSocial(
  sb: Cliente,
  reserva: { id?: string; token?: string },
  estado: "aceite" | "incerto" | "recusado",
  resultado: unknown,
  status: number,
) {
  const { data, error } = await sb.rpc("social_publicacao_concluir", {
    _id: reserva.id,
    _token: reserva.token,
    _estado: estado,
    _resultado: resultado,
    _http_status: status,
  });
  if (error || data !== true) {
    throw new ErroSocial(
      "Resultado externo por reconciliar. Não voltes a enviar.",
    );
  }
}
