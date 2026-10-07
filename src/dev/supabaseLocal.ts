/** Development-only client. Refuses every backend call: local fixtures cannot write to the real Cloud. */
const response = { data: null, error: { message: "Teste local: esta ação precisa do Cloud e está desligada.", code: "LOCAL_ONLY" } };
const chain: unknown = new Proxy(() => {}, { get: (_t, k) => k === "then" ? Promise.resolve(response).then.bind(Promise.resolve(response)) : () => chain, apply: () => chain });
export const supabase = {
  from: () => chain, rpc: async () => response,
  functions: { invoke: async () => response },
  auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => response },
  storage: { from: () => chain }, channel: () => chain, removeChannel: async () => {},
};
