// Server-side stand-in for @tanstack/react-router's createFileRoute, used only so ported hook
// modules can expose their handlers to server functions. No routing happens here.
export interface HookHandlerCtx { request: Request }
export type HookHandler = (ctx: HookHandlerCtx) => Promise<Response> | Response;
export interface HookRouteOptions { server?: { handlers?: Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS", HookHandler>> } }

export function createFileRoute<P extends string>(_path: P) {
  return <O extends HookRouteOptions>(options: O): { options: O } => ({ options });
}
