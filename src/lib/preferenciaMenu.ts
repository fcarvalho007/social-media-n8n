// UI preference only: remembers whether the main navigation is open on this device.
const CHAVE = 'hub:menu-aberto';

export function lerMenuAberto(omissao: boolean): boolean {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === null ? omissao : v === '1';
  } catch { return omissao; }
}

export function guardarMenuAberto(aberto: boolean): void {
  try { localStorage.setItem(CHAVE, aberto ? '1' : '0'); } catch { /* ignore */ }
}
