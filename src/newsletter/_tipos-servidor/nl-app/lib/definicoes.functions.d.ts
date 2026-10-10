export type EstadoSecrets = {
    deepseek: boolean;
    egoi: boolean;
    wp_url: boolean;
    wp_user: boolean;
    wp_pass: boolean;
};
export declare const verificarSecretsAPI: import("../_shim/start.ts").NlServerFn<void, EstadoSecrets>;
/**
 * Devolve a URL completa do webhook do CloudMailin (com Basic Auth embutida)
 * para o admin colar na configuração do endereço em CloudMailin.
 * Só o admin pode ver. Server-only.
 */
export declare const getWebhookCloudMailinUrl: import("../_shim/start.ts").NlServerFn<void, {
    url: string | null;
}>;
