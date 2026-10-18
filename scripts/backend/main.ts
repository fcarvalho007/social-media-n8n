import { mkdir } from 'node:fs/promises';
import { clienteServico } from './seguranca';
import { ServicoSeo } from './seo';
import { DocumentosNuvem } from './documentos';
import { WorkerHub } from './worker';
import { PublicadorWordPress, credencialWordPress } from './wordpress';
import { criarServidor } from './servidor';
const exigir = (nome: string) => {
    const v = process.env[nome];
    if (!v)
        throw new Error(`Configura ${nome} no servidor.`);
    return v;
};
const url = exigir('SUPABASE_URL'), anon = exigir('SUPABASE_ANON_KEY'), chave = exigir('SUPABASE_SERVICE_ROLE_KEY');
if (new URL(url).protocol !== 'https:')
    throw new Error('O backend exige um Supabase HTTPS.');
const origens = new Set(exigir('HUB_ORIGENS').split(',').map(s => s.trim()));
for (const o of origens) {
    const u = new URL(o);
    if (o !== u.origin || (u.protocol !== 'https:' && !(process.env.HUB_DESENVOLVIMENTO === '1' && u.hostname === '127.0.0.1')))
        throw new Error('Configura origens exatas HTTPS, sem caminhos.');
}
const pasta = process.env.HUB_PASTA_TRABALHO ?? '/tmp/hub-worker';
await mkdir(pasta, { recursive: true, mode: 0o700 });
const sb = clienteServico(url, chave), seo = new ServicoSeo(sb, () => ({ login: process.env.DATAFORSEO_LOGIN, password: process.env.DATAFORSEO_PASSWORD, deepseek: process.env.DEEPSEEK_API_KEY })), documentos = new DocumentosNuvem(sb, pasta);
const wordpress = new PublicadorWordPress(sb, s => credencialWordPress(s), () => process.env.HUB_WORDPRESS_PUBLICAR === '1');
const worker = new WorkerHub(sb, seo, documentos, pasta, j => wordpress.executar(j), s => process.env.HUB_WORDPRESS_PUBLICAR === '1' && !!credencialWordPress(s)), servidor = criarServidor({ url, anon, origens, pasta }, { sb, seo, documentos, wordpress });
const porta = Number(process.env.PORT ?? 8081);
if (!Number.isInteger(porta) || porta < 1 || porta > 65535)
    throw new Error('Porta inválida.');
servidor.requestTimeout = 150000;
servidor.headersTimeout = 15000;
servidor.listen(porta, process.env.HUB_HOST ?? '127.0.0.1', () => { console.info(`Serviço editorial pronto na porta ${porta}; processamento controlado pelas políticas persistidas.`); worker.iniciar(); });
let fechando = false;
const fechar = () => {
    if (fechando)
        return;
    fechando = true;
    servidor.close(() => { });
    void worker.fechar().then(() => process.exit(0));
};
process.on('SIGTERM', fechar);
process.on('SIGINT', fechar);
