// Minimal adapter from @tanstack/react-router APIs to react-router-dom, scoped under /newsletter.
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link as RLink, Outlet, useLocation, useNavigate as useRNavigate, useParams as useRParams } from "react-router-dom";

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

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;
interface LinkProps extends Omit<AnchorProps, "href"> {
  to?: string; params?: Params; search?: Search; hash?: string; children?: ReactNode;
  activeProps?: AnchorProps; inactiveProps?: AnchorProps; activeOptions?: { exact?: boolean; includeSearch?: boolean };
  preload?: unknown; replace?: boolean;
}
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, params, search, hash, activeProps, inactiveProps, activeOptions, preload: _p, replace, children, className, style, ...rest }, ref,
) {
  const loc = useLocation();
  const href = resolveTo(to, params, search, currentSearch(loc)) + (hash ? `#${hash}` : "");
  const target = href.split(/[?#]/)[0];
  const exact = activeOptions?.exact ?? target === BASE;
  const active = exact ? loc.pathname === target : loc.pathname === target || loc.pathname.startsWith(target + "/");
  const state = active ? activeProps : inactiveProps;
  if (href.startsWith("http")) return <a ref={ref} href={href} className={className} style={style} {...rest}>{children}</a>;
  return (
    <RLink ref={ref} to={href} replace={replace} {...rest} {...state}
      data-status={active ? "active" : undefined}
      style={{ ...style, ...state?.style }}
      className={[className, state?.className].filter(Boolean).join(" ")}>
      {children}
    </RLink>
  );
});

type NavOpts = { to?: string; params?: Params; search?: Search; hash?: string; replace?: boolean };
export function useNavigate() {
  const nav = useRNavigate();
  const loc = useLocation();
  return (o: NavOpts | string) => {
    if (typeof o === "string") return nav(resolveTo(o));
    const to = o.to ?? (loc.pathname.replace(BASE, "") || "/");
    return nav(resolveTo(to, o.params, o.search, currentSearch(loc)) + (o.hash ? `#${o.hash}` : ""), { replace: o.replace });
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
export { Outlet };

export function createFileRoute(_path: string) {
  return <T extends { component?: unknown; validateSearch?: unknown }>(opts: T) => ({
    options: opts,
    ...opts,
    useSearch: () => {
      const raw = currentSearch(useLocation());
      const v = opts.validateSearch as { parse?: (x: unknown) => unknown } | ((x: unknown) => unknown) | undefined;
      try {
        if (typeof v === "function") return v(raw) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (v?.parse) return v.parse(raw) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      } catch { /* fall through to raw */ }
      return raw as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    useParams: () => useRParams() as Record<string, string>,
    useNavigate: () => useNavigate(),
    useRouteContext: () => ({}),
    useLoaderData: () => undefined,
  });
}
