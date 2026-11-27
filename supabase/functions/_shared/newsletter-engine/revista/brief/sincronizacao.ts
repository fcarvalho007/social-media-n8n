/** Save failures must never start Brief synchronization. */
export async function guardarAntesDeSincronizar(
  guardar: () => Promise<unknown>,
  sincronizar: () => Promise<unknown>,
): Promise<void> {
  await guardar();
  await sincronizar();
}