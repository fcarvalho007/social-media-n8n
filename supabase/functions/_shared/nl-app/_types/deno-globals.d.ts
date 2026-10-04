// Minimal Deno globals for type-checking the newsletter server tree with tsc (scripts/port-newsletter.py).
declare namespace Deno {
  const env: { get(name: string): string | undefined };
}
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
