import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import type { Server, IncomingMessage, ServerResponse } from 'node:http';
/** Shared tested HTTP router, exposed as a Web Request handler in the Edge runtime. No listening socket. */
export function adaptarWeb(servidor: Server) {
    return async (req: Request): Promise<Response> => {
        const headers: Record<string, string> = {};
        req.headers.forEach((v, k) => { headers[k] = v; });
        const url = new URL(req.url);
        url.pathname = url.pathname.replace(/^\/(?:functions\/v1\/)?hub-editorial(?=\/|$)/, '') || '/';
        async function* corpo() {
            if (!req.body)
                return;
            const reader = req.body.getReader();
            try {
                while (true) {
                    const r = await reader.read();
                    if (r.done)
                        break;
                    yield r.value;
                }
            }
            finally {
                reader.releaseLock();
            }
        }
        const entrada = Object.assign(Readable.from(corpo()), { method: req.method, url: url.pathname + url.search, headers }) as unknown as IncomingMessage;
        return new Promise(resolve => {
            const cabecalhos = new Headers();
            let codigo = 200;
            const res = { destroyed: false, setHeader: (k: string, v: string | number) => cabecalhos.set(k, String(v)), writeHead: (status: number, h: Record<string, string> = {}) => {
                    codigo = status;
                    for (const [k, v] of Object.entries(h))
                        cabecalhos.set(k, v);
                }, end: (body?: Buffer | string) => resolve(new Response(body ?? null, { status: codigo, headers: cabecalhos })) } as unknown as ServerResponse;
            servidor.emit('request', entrada, res);
        });
    };
}
