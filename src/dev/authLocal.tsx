import type { ReactNode } from "react";
/** Vite's mode=local alias only. Never bundled by the production entrypoint. */
export const useAuth = () => ({ user: null, session: null, loading: false, signOut: async () => {}, signInWithEmail: async () => ({ error: { message: "Modo local: não existe entrada real." } }) });
export const AuthProvider = ({ children }: { children: ReactNode }) => children;
export const LIMITE_ENTRADA_MS = 20000;
export const SERVICO_INDISPONIVEL = "Modo local sem Cloud";
