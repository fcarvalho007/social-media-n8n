// Minimal adapter from @tanstack/react-router APIs to react-router-dom, scoped under /newsletter.
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link as RLink, useLocation, useNavigate as useRNavigate, useParams as useRParams } from "react-router-dom";

export const BASE = "/newsletter";
const ROUTE_MAP: Record<string, string> = { "/": "", "/auth": "/auth" };

type Params = Record<string, string | number | undefined>;
type Search = Record<string, unknown> | ((s: Record<string, unknown>) => Record<string, unknown>) | true;

export function resolveTo(to: string | undefined, params?: Params, search?: Search, current?: Record<string, unknown>): string {
  let path = to ?? "";
  if (params) for (const [k, v] of Object.entries(params)) path = path.replace(`$${k}`, encodeURIComponent(String(v ?? "")));
  if (!path.startsWith("http")) {
    if (path === "/auth") path = "/auth";
    else path = BASE + (ROUTE_MAP[path] ?? path);
  }
  const s = typeof search === "function" ? search(current ?? {}) : search === true ? current : search;
  if (s && Object.keys(s).length) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) if (v !== undefined && v !== null) qs.set(k, String(v));
    path += `?${qs.toString()}`;
  }
  return path;
}

function currentSearch(loc: { search: string }): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(loc.search).entries());
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to?: string; params?: Params; search?: Search; children?: ReactNode;
  activeProps?: AnchorHTMLAttributes<HTMLAnchorElement>; activeOptions?: unknown; preload?: unknown; replace?: boolean;
}
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, params, search, activeProps, activeOptions: _a, preload: _p, replace, children, className, ...rest }, ref,
) {
  const loc = useLocation();
  const href = resolveTo(to, params, search, currentSearch(loc));
  const active = loc.pathname === href.split("?")[0];
  if (href.startsWith("http")) return <a ref={ref} href={href} className={className} {...rest}>{children}</a>;
  return (
    <RLink ref={ref} to={href} replace={replace} {...rest} {...(active ? activeProps : {})}
      className={[className, active ? activeProps?.className : ""].filter(Boolean).join(" ")}>
      {children}
    </RLink>
  );
});

export function useNavigate() {
  const nav = useRNavigate();
  const loc = useLocation();
  return (o: { to?: string; params?: Params; search?: Search; replace?: boolean } | string) => {
    if (typeof o === "string") return nav(resolveTo(o));
    return nav(resolveTo(o.to ?? loc.pathname.replace(BASE, "") || "/", o.params, o.search, currentSearch(loc)), { replace: o.replace });
  };
}

export function useSearch(_o?: unknown): Record<string, string> {
  return currentSearch(useLocation());
}

export function useParams(_o?: unknown): Record<string, string | undefined> {
  return useRParams();
}

export function useRouterState<T>(o: { select: (s: { location: { pathname: string } }) => T }): T {
  const loc = useLocation();
  return o.select({ location: { pathname: loc.pathname.replace(BASE, "") || "/" } });
}

export function useRouter() {
  const nav = useRNavigate();
  return { invalidate: () => undefined, navigate: (o: { to: string }) => nav(resolveTo(o.to)), history: { back: () => nav(-1) } };
}

export function redirect(o: { to: string }): never {
  throw new Error(`redirect:${o.to}`);
}

/** Origin route files call createFileRoute(path)({ component }). We just expose the options. */
export function createFileRoute(_path: string) {
  return <T extends { component?: unknown }>(opts: T) => ({ options: opts, ...opts });
}
