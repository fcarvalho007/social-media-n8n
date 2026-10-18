import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { schemaConhecimento } from '../../src/features/seo/sequencia';
import { estadoInicialSeo } from '../../src/features/seo/catalogo';
import { z } from 'zod';
import { schemaConfiguracaoSeo, schemaPoliticaSeo } from '../../src/features/seo/politicas';
import type { EstadoSeo } from '../../src/features/seo/contratos';
export async function escreverAtomico(ficheiro: string, dados: unknown) {
  await mkdir(path.dirname(ficheiro), { recursive: true, mode: 0o700 });
  const temp = `${ficheiro}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const f = await open(temp, 'wx', 0o600);
  try { await f.writeFile(JSON.stringify(dados)); await f.sync(); } finally { await f.close(); }
  try { await rename(temp, ficheiro); } catch (e) { await unlink(temp).catch(() => {}); throw e; }
}
const micro=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export function validarEstadoPersistido(e:EstadoSeo){
  const raiz=z.object({versao:z.literal(1),configuracao:schemaConfiguracaoSeo,sites:z.array(z.object({id:z.string().min(1),dominio:z.string().min(3),estado:z.enum(['piloto','planeado']),revisaoObrigatoria:z.boolean(),politica:schemaPoliticaSeo}).passthrough()).min(1),pedidos:z.array(z.object({id:z.string().uuid(),modo:z.enum(['real','sandbox','exemplo']),estado:z.enum(['em_curso','concluido','falhou','incerto']),estimativaMicro:micro,custoMicro:micro.nullable(),reservaMicro:micro,cambio:z.number().positive(),criadoEm:z.string().refine(v=>Number.isFinite(Date.parse(v))),linhas:z.array(z.object({descricao:z.string(),quantidade:z.number().nonnegative(),unitarioMicro:z.number().nonnegative(),totalMicro:z.number().nonnegative()}))}).passthrough()),orcamentos:z.array(z.object({id:z.string().uuid(),estimativaMicro:micro}).passthrough()),pautas:z.array(z.object({id:z.string().uuid(),versao:z.number().int().positive(),siteId:z.string(),fontes:z.array(z.unknown())}).passthrough()),auditoria:z.array(z.unknown()),slots:z.array(z.unknown()),conta:z.unknown().nullable()}).strict();
  try{raiz.parse(e);for(const s of e.sites)if(s.conhecimento)schemaConhecimento.parse(s.conhecimento);if(new Set(e.sites.map(s=>s.id)).size!==e.sites.length)throw new Error();const pessoal=e.sites.find(s=>s.id==='frederico');if(pessoal&&(!pessoal.revisaoObrigatoria||pessoal.dominio!=='fredericocarvalho.pt'||pessoal.politica.publicacao!=='humana'))throw new Error();}catch{throw new Error('O registo local tem dados ou limites inválidos. Foi preservado; os serviços pagos ficam indisponíveis até à recuperação.');}
}

export interface ArmazemSeo {
 readonly raiz:string;
 iniciar():Promise<void>; fechar():Promise<void>; ler():Promise<EstadoSeo>;
 alterar<T>(fn:(e:EstadoSeo)=>T|Promise<T>):Promise<T>;
 guardarResultado(id:string,dados:unknown):Promise<void>; resultado<T>(id:string):Promise<T>;
 guardarResposta(id:string,dados:unknown):Promise<void>;
}

export class RepositorioSeo {
  private estado!: EstadoSeo; private fila: Promise<unknown> = Promise.resolve(); private bloqueio = false;
  constructor(readonly raiz: string) {}
  async iniciar(): Promise<void> {
    await mkdir(this.raiz, { recursive: true, mode: 0o700 });
    const lockPath = path.join(this.raiz, 'motor.lock');
    try { const lock = await open(lockPath, 'wx', 0o600); await lock.writeFile(String(process.pid)); await lock.close(); this.bloqueio = true; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      const pid = Number(await readFile(lockPath, 'utf8')); let vivo = true;
      try { process.kill(pid, 0); } catch (falha) { vivo = (falha as NodeJS.ErrnoException).code !== 'ESRCH'; }
      if (!Number.isSafeInteger(pid) || pid < 1 || vivo) throw new Error('Outro motor SEO já usa estes dados. Fecha a outra instância antes de continuar.');
      await unlink(lockPath); return this.iniciar();
    }
    try {
      try { this.estado = JSON.parse(await readFile(path.join(this.raiz, 'estado.json'), 'utf8')); }
      catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') this.estado = estadoInicialSeo(); else throw new Error('O registo local não pôde ser lido. Foi preservado; não será substituído por um histórico vazio.'); }
      if (this.estado.versao !== 1 || !Array.isArray(this.estado.pedidos) || !Array.isArray(this.estado.sites) || !Array.isArray(this.estado.pautas) || !this.estado.configuracao) throw new Error('Formato local inválido. Restaura uma cópia verificada antes de iniciar pedidos pagos.');
      validarEstadoPersistido(this.estado);
      for (const p of this.estado.pedidos) if (p.estado === 'em_curso') { p.estado = 'incerto'; p.detalhe = 'Interrompido no reinício. Confirma o custo e o resultado antes de repetir; não houve repetição automática.'; p.terminadoEm = new Date().toISOString(); }
      for (const p of this.estado.pautas) if (p.estado === 'a_preparar') { p.estado = 'bloqueado'; p.motivo = 'Produção interrompida. Confirma o pedido anterior antes de voltar a preparar.'; }
      await escreverAtomico(path.join(this.raiz, 'estado.json'), this.estado);
    } catch (e) { await this.fechar(); throw e; }
  }
  async ler() { await this.fila; return structuredClone(this.estado); }
  async alterar<T>(fn: (e: EstadoSeo) => T | Promise<T>): Promise<T> {
    const tarefa = this.fila.then(async () => { if (!this.estado || !this.bloqueio) throw new Error('O motor local não está disponível.'); const novo = structuredClone(this.estado); const resposta = await fn(novo); await escreverAtomico(path.join(this.raiz, 'estado.json'), novo); this.estado = novo; return structuredClone(resposta); });
    this.fila = tarefa.then(() => {}, () => {}); return tarefa;
  }
  async guardarResultado(id: string, dados: unknown) { if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Identificador inválido.'); await escreverAtomico(path.join(this.raiz, 'resultados', `${id}.json`), dados); }
  async resultado<T>(id: string): Promise<T> { if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Identificador inválido.'); return JSON.parse(await readFile(path.join(this.raiz, 'resultados', `${id}.json`), 'utf8')); }
  async guardarResposta(id: string, raw: unknown) { await escreverAtomico(path.join(this.raiz, 'respostas', `${id}.json`), raw); }
  async fechar() { await this.fila; if (this.bloqueio) { this.bloqueio = false; await unlink(path.join(this.raiz, 'motor.lock')).catch(() => {}); } }
}
