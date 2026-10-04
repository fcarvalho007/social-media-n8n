// Server-side replacement for @tanstack/react-start used by the ported newsletter functions.
// A server function is a plain descriptor executed by the nl-api gateway.
import { AsyncLocalStorage } from "node:async_hooks";

export interface NlCtx { userId: string; supabase: unknown; claims: Record<string, unknown> }
type Next = (o?: { context?: Record<string, unknown> }) => Promise<unknown>;
export interface NlMiddleware { __mw: (a: { next: Next; context: Record<string, unknown> }) => Promise<unknown> }
export interface NlServerFn {
  __nl: true;
  middlewares: NlMiddleware[];
  validator: (d: unknown) => unknown;
  handler: (a: { data: unknown; context: Record<string, unknown> }) => Promise<unknown>;
}

export const requestStore = new AsyncLocalStorage<Request>();
export function getRequest(): Request | undefined { return requestStore.getStore(); }
export function getRequestHeader(name: string): string | null { return getRequest()?.headers.get(name) ?? null; }

export function createMiddleware(_o?: unknown) {
  return { server: (fn: NlMiddleware["__mw"]): NlMiddleware => ({ __mw: fn }) };
}

// deno-lint-ignore no-explicit-any
type Any = any;
interface Builder<I> {
  middleware(m: NlMiddleware[]): Builder<I>;
  inputValidator<V>(v: (x: Any) => V): Builder<V>;
  validator<V>(v: (x: Any) => V): Builder<V>;
  handler<R>(h: (a: { data: I; context: Any }) => R): NlServerFn;
}
export function createServerFn(_o?: unknown): Builder<Any> {
  const d: NlServerFn = { __nl: true, middlewares: [], validator: (x) => x, handler: async () => undefined };
  const b: Builder<Any> = {
    middleware(m) { d.middlewares = m; return b; },
    inputValidator(v) { d.validator = v; return b; },
    validator(v) { d.validator = v; return b; },
    handler(h) { d.handler = async (a) => await h(a as Any); return d; },
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
