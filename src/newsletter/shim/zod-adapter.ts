// Replacement for @tanstack/zod-adapter in the Vite build.
import type { ZodTypeAny } from "zod";
export const zodValidator = <T,>(schema: T): T => schema;
export const fallback = <S extends ZodTypeAny>(schema: S, value: unknown) => schema.catch(value as never);
