// Snapshot of the fields a patch will change, so an applied suggestion can be reverted.
export function snapshotAnterior<T extends object>(cfg: T, patch: Partial<T>): Partial<T> {
  const anterior: Partial<T> = {};
  for (const k of Object.keys(patch) as (keyof T)[]) {
    const v = cfg[k];
    anterior[k] = (v === undefined || v === null ? (typeof patch[k] === "string" ? "" : v) : v) as T[keyof T];
  }
  return anterior;
}
