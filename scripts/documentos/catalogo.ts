import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import originais from './fontes-originais.json';
import pausadas from './fontes-pausadas.json';
import { verificacaoFonte } from '../../src/features/documentos/sugestoes';
import { validarDestino } from './obter';
import type { FonteDocumento } from '../../src/features/documentos/contratos';

export interface ConfiguracaoFontes { alteradas: FonteDocumento[]; removidas: number[] }
export const fonteSchema = z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(150), url: z.string().trim().max(2000), group_category: z.string().max(100), descricao: z.string().trim().max(500).optional(), pausada: z.boolean().optional() });
export function fontesCatalogo(config: ConfiguracaoFontes = { alteradas: [], removidas: [] }): FonteDocumento[] {
  const alteradas = new Map(config.alteradas.map(f => [f.id, f]));
  return [...originais.map(f => {
    const ev = pausadas.find(e => e.id === f.id);
    // Exclude failed routes from the working selection; preserve evidence and allow reactivation.
    const pausada = !!ev;
    return alteradas.get(f.id) ?? { ...f, pausada, motivoPausa: ev?.motivo };
  }), ...config.alteradas.filter(f => !originais.some(o => o.id === f.id))].filter(f => !config.removidas.includes(f.id));
}
export function modificarFonte(config: ConfiguracaoFontes, bruto: unknown): ConfiguracaoFontes {
  const a = fonteSchema.parse(bruto), url = validarDestino(a.url).href;
  const todas = fontesCatalogo(config), existente = a.id ? todas.find(f => f.id === a.id) : undefined;
  if (a.id && !existente) throw new Error('A fonte já não existe neste projeto. Atualiza a lista.');
  if (todas.some(f => f.url === url && f.id !== a.id)) throw new Error('Este endereço já existe nas fontes deste projeto.');
  const id = a.id ?? Math.max(1000, ...todas.map(f => f.id), ...config.removidas) + 1;
  const verificacao = verificacaoFonte(url);
  const fonte: FonteDocumento = { ...existente, id, name: a.name, url, alternative_urls: existente?.url === url ? existente.alternative_urls : [], group_category: a.group_category, region: existente?.region ?? 'international', priority: existente?.priority ?? 'medium', active: existente?.active ?? false, tags: existente?.tags ?? [], display_order: id, descricao: a.descricao, pausada: a.pausada ?? (verificacao?.estado === 'erro' || verificacao?.estado === 'bloqueada'), motivoPausa: verificacao?.detalhes.join(' · ') };
  return { ...config, alteradas: [...config.alteradas.filter(f => f.id !== id), fonte] };
}
export class CatalogoFontesLocal {
  private fila: Promise<unknown> = Promise.resolve();
  constructor(private pasta: string) {}
  private caminho(ambito: string) { if (!ambito || ambito.length > 300) throw new Error('Escolhe um projeto.'); return path.join(this.pasta, `fontes-${createHash('sha256').update(ambito).digest('hex')}.json`); }
  async ler(ambito: string): Promise<ConfiguracaoFontes> {
    try { return JSON.parse(await readFile(this.caminho(ambito), 'utf8')); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { alteradas: [], removidas: [] }; throw e; }
  }
  async listar(ambito: string) { return fontesCatalogo(await this.ler(ambito)); }
  async alterar(ambito: string, operacao: (c: ConfiguracaoFontes) => ConfiguracaoFontes) {
    const p = this.fila.catch(() => undefined).then(async () => { const c = operacao(await this.ler(ambito)); await mkdir(this.pasta, { recursive: true }); const destino = this.caminho(ambito), tmp = `${destino}.${randomUUID()}.tmp`; await writeFile(tmp, JSON.stringify(c), { mode: 0o600 }); await rename(tmp, destino); return fontesCatalogo(c); });
    this.fila = p; return p;
  }
}
