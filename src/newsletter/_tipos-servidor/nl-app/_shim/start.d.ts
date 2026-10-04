import { AsyncLocalStorage } from "node:async_hooks";
export interface NlCtx {
    userId: string;
    supabase: unknown;
    claims: Record<string, unknown>;
}
type Next = (o?: {
    context?: Record<string, unknown>;
}) => Promise<unknown>;
export interface NlMiddleware {
    __mw: (a: {
        next: Next;
        context: Record<string, unknown>;
    }) => Promise<unknown>;
}
export interface NlServerFn<I = unknown, O = unknown> {
    __nl: true;
    __in?: I;
    __out?: O;
    middlewares: NlMiddleware[];
    validator: (d: unknown) => unknown;
    handler: (a: {
        data: unknown;
        context: Record<string, unknown>;
    }) => Promise<unknown>;
}
export declare const requestStore: AsyncLocalStorage<Request>;
export declare function getRequest(): Request | undefined;
export declare function getRequestHeader(name: string): string | null;
export declare function getRequestHost(): string;
export declare function getRequestProtocol(): string;
export declare function createMiddleware(_o?: unknown): {
    server: (fn: NlMiddleware["__mw"]) => NlMiddleware;
};
type Any = any;
interface Builder<I, P> {
    middleware(m: NlMiddleware[]): Builder<I, P>;
    inputValidator<Q, V>(v: (x: Q) => V): Builder<V, Q>;
    validator<Q, V>(v: (x: Q) => V): Builder<V, Q>;
    handler<R>(h: (a: {
        data: I;
        context: Any;
    }) => R): NlServerFn<P, Awaited<R>>;
}
export declare function createServerFn(_o?: unknown): Builder<undefined, void>;
export declare function runServerFn(fn: NlServerFn, data: unknown): Promise<unknown>;
export {};
