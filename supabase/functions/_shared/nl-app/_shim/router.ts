// Server-side stand-in for @tanstack/react-router's createFileRoute, used only so ported hook
// modules can expose their handlers to server functions. No routing happens here.
export function createFileRoute<P extends string>(_path: P) {
  return <O>(options: O): { options: O } => ({ options });
}
