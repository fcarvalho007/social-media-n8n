import { useSyncExternalStore } from "react";
import type { ItemChecklist } from "./checklist.ts";

export type ValidadorEstado = {
  dias: number;
  itens: ItemChecklist[];
  /** Notícias aprovadas com destino efectivo = email. */
  nEmail: number;
  /** Total de notícias aprovadas (todas vão para a página do site). */
  nSite: number;
  /** Aprovadas que ficam só no site (nSite - nEmail). */
  nSoNoSite: number;
  /** Notícias ainda por aprovar na fila. */
  nPendentes: number;
  onIrParaSeccao: (secId: string) => void;
} | null;


let estado: ValidadorEstado = null;
const ouvintes = new Set<() => void>();

function notificar() {
  for (const cb of ouvintes) cb();
}

export function registarValidador(v: NonNullable<ValidadorEstado>) {
  estado = v;
  notificar();
}

export function limparValidador() {
  estado = null;
  notificar();
}

function subscrever(cb: () => void) {
  ouvintes.add(cb);
  return () => { ouvintes.delete(cb); };
}
function getSnapshot(): ValidadorEstado { return estado; }
function getServerSnapshot(): ValidadorEstado { return null; }

export function useValidador(): ValidadorEstado {
  return useSyncExternalStore(subscrever, getSnapshot, getServerSnapshot);
}
