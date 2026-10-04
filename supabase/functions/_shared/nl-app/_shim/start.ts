// Server-side replacement for @tanstack/react-start used by the ported newsletter functions.
// A server function is a plain descriptor executed by the nl-api gateway.
import { AsyncLocalStorage } from "node:async_hooks";

export interface NlCtx { userId: string; supabase: unknown; claims: Record<string, unknown> }
type Next = (o?: { context?: Record<string, unknown> }) => Promise<unknown>;
export interface NlMiddleware { __mw: (a: { next: Next; context: Record<string, unknown> }) => Promise<unknown> }
// I = what the caller sends (validator parameter), O = resolved handler result.
// The phantom fields carry types to the generated client declarations; never set at runtime.
export interface NlServerFn<I = unknown, O = unknown> {
  __nl: true;
  __in?: I;
  __out?: O;
  middlewares: NlMiddleware[];
  validator: (d: unknown) => unknown;
  handler: (a: { data: unknown; context: Record<string, unknown> }) => Promise<unknown>;
}

export const requestStore = new AsyncLocalStorage<Request>();
export function getRequest(): Request | undefined { return requestStore.getStore(); }
export function getRequestHeader(name: string): string | null { return getRequest()?.headers.get(name) ?? null; }

export function getRequestHost(): string {
  const r = getRequest();
  return r?.headers.get("x-forwarded-host") ?? r?.headers.get("origin")?.replace(/^https?:\/\//, "") ?? new URL(r?.url ?? "http://localhost").host;
}
export function getRequestProtocol(): string {
  const o = getRequest()?.headers.get("origin");
  return o?.startsWith("http://") ? "http" : "https";
}

export function createMiddleware(_o?: unknown) {
  return { server: (fn: NlMiddleware["__mw"]): NlMiddleware => ({ __mw: fn }) };
}

// deno-lint-ignore no-explicit-any
type Any = any;
interface Builder<I, P> {
  middleware(m: NlMiddleware[]): Builder<I, P>;
  inputValidator<Q, V>(v: (x: Q) => V): Builder<V, Q>;
  validator<Q, V>(v: (x: Q) => V): Builder<V, Q>;
  handler<R>(h: (a: { data: I; context: Any }) => R): NlServerFn<P, Awaited<R>>;
}
export function createServerFn(_o?: unknown): Builder<undefined, void> {
  const d: NlServerFn = { __nl: true, middlewares: [], validator: (x) => x, handler: async () => undefined };
  // deno-lint-ignore no-explicit-any
  const b: Builder<any, any> = {
    middleware(m) { d.middlewares = m; return b; },
    inputValidator(v) { d.validator = v as (d: unknown) => unknown; return b; },
    validator(v) { d.validator = v as (d: unknown) => unknown; return b; },
    handler(h) { d.handler = async (a) => await h(a as Any); return d as NlServerFn<Any, Any>; },
  };
  return b;
}

export async function runServerFn(fn: NlServerFn, data: unknown): Promise<unknown> {
  const input = fn.validator(data);
  let ctx: Record<string, unknown> = {};
  const chain = async (i: number): Promise<unknown> => {
    if (i >= fn.middlewares.length) return fn.handler({ data: input, context: ctx });
    return fn.middlewares[i].__mw({
      context: ctx,
      next: async (o) => { ctx = { ...ctx, ...(o?.context ?? {}) }; return chain(i + 1); },
    });
  };
  return chain(0);
}
