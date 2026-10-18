import type { ReactNode } from "react";
import { demoSession, demoUser } from "./hubFixtures";

/** Alias used only by Vite's development-only hub preview. No real authentication. */
export const useAuth = () => ({ user: demoUser, session: demoSession, loading: false, signOut: async () => {}, signInWithEmail: async () => ({ error: { message: "Demonstração local: a autenticação real está desligada." } }) });
export const AuthProvider = ({ children }: { children: ReactNode }) => children;
export const LIMITE_ENTRADA_MS = 20_000;
export const SERVICO_INDISPONIVEL = "Demonstração local sem Cloud";
