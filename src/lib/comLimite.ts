/** Bound a client wait without importing the server's authentication/validation module. */
export async function comLimite<T>(pedido: PromiseLike<T>, ms: number, signal?: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  let cancelar: () => void;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('O pedido excedeu o tempo de espera.')), ms);
    cancelar = () => reject(new DOMException('Pedido cancelado.','AbortError'));
    if (signal?.aborted) cancelar();
    else signal?.addEventListener('abort',cancelar,{once:true});
  });
  try { return await Promise.race([Promise.resolve(pedido), limite]); }
  finally { clearTimeout(timer!);signal?.removeEventListener('abort',cancelar!); }
}
