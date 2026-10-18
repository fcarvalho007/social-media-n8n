// Minimal typed surface used by the existing document parser; no runtime dependency change.
declare module 'jsdom' {
  export const VirtualConsole: new () => unknown;
  export const JSDOM: new (
    source: string,
    options?: { contentType?: string; virtualConsole?: unknown },
  ) => {
    window: {
      document: import('../features/documentos/contratos').MarkupDocumento;
      close(): void;
    };
  };
}