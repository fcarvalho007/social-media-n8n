// @vitest-environment node
import {expect,it,vi} from 'vitest';
import JSZip from 'jszip';
import {estruturaManual} from '../../supabase/functions/_shared/roteiros/modelo';
import {assinaturaMateriais} from '../../supabase/functions/_shared/roteiros/materiais';
import {criarPacoteMateriais} from '@/features/roteiros/materiais-exportar';
import type {ApiMateriais,MaterialRoteiro} from '@/services/roteiros-materiais';
vi.mock('@/features/roteiros/plano-exportar',()=>({textoPlano:()=> 'Plano de teste',pdfPlano:vi.fn(async()=>new Blob(['PDF ilustrado']))}));
it('ZIP contém imagens na ordem das passagens, locução e créditos, conservando duplicados usados em cenas diferentes',async()=>{
 const v=estruturaManual('hva','Materiais');const id=crypto.randomUUID();v.cenas.forEach(c=>{c.locucao='Texto editado';c.visual='Instrução.';c.apoio={tipo:'imagem',asset_id:id};});v.materiais_revistos=await assinaturaMateriais(v,140);
 const a:MaterialRoteiro={id,mime:'image/png',largura:1,altura:1,dados:Buffer.from('bytes imagem').toString('base64'),nome:'Imagem',credito:'Fotografia: autor / banco'};
 const api={ler:vi.fn().mockResolvedValue({[id]:a})} as unknown as ApiMateriais;
 const blob=await criarPacoteMateriais(v,140,'projeto',api);const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 expect(api.ler).toHaveBeenCalledWith('projeto',[id]);expect(await zip.file('materiais/passagem-01.png')!.async('string')).toBe('bytes imagem');expect(zip.file('materiais/passagem-03.png')).not.toBeNull();expect(await zip.file('locucao-bigvu.txt')!.async('string')).toContain('Texto editado');
 const manifest=JSON.parse(await zip.file('manifesto.json')!.async('string'));expect(manifest.passagens[0].cena_id).toBe(v.cenas[0].id);expect(await zip.file('creditos.txt')!.async('string')).toContain('Fotografia: autor / banco');
});
it('não exporta aprovação obsoleta ou materiais indisponíveis',async()=>{
 const v=estruturaManual('hva','Texto');v.cenas.forEach(c=>{c.locucao='Texto';c.visual='Corte';c.apoio={tipo:'apresentador'};});v.materiais_revistos=await assinaturaMateriais(v,140);v.cenas[0].locucao='Alterado';const api={ler:vi.fn()} as unknown as ApiMateriais;
 await expect(criarPacoteMateriais(v,140,'p',api)).rejects.toThrow('Revê e aprova');expect(api.ler).not.toHaveBeenCalled();
 v.cenas[0].apoio={tipo:'imagem',asset_id:crypto.randomUUID()};v.materiais_revistos=await assinaturaMateriais(v,140);(api.ler as any).mockResolvedValue({});await expect(criarPacoteMateriais(v,140,'p',api)).rejects.toThrow('Faltam imagens');
});
