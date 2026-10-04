import { useSyncExternalStore } from "react";

export type EnvioAccao = {
  onEnviar: () => void;
  enviarPending: boolean;
  bloqueado: boolean;
  papelDesconhecido: boolean;
  isAdmin: boolean;
} | null;

let estado: EnvioAccao = null;
const ouvintes = new Set<() => void>();

function notificar() {
  for (const cb of ouvintes) cb();
}

export function registarEnvio(a: NonNullable<EnvioAccao>) {
  estado = a;
  notificar();
}

export function limparEnvio() {
  estado = null;
  notificar();
}

function subscrever(cb: () => void) {
  ouvintes.add(cb);
  return () => {
    ouvintes.delete(cb);
  };
}

function getSnapshot(): EnvioAccao {
  return estado;
}

function getServerSnapshot(): EnvioAccao {
  return null;
}

export function useEnvioAccao(): EnvioAccao {
  return useSyncExternalStore(subscrever, getSnapshot, getServerSnapshot);
}
