import type { VarianteRoteiro } from '../../../supabase/functions/_shared/roteiros/modelo';
import { textoLimpo } from '../../../supabase/functions/_shared/roteiros/modelo';
import { assinaturaMateriais, idsMateriais, pendenciasMateriais } from '../../../supabase/functions/_shared/roteiros/materiais';
import type { ApiMateriais, MaterialRoteiro } from '@/services/roteiros-materiais';
import { pdfPlano, textoPlano } from './plano-exportar';
/** All bytes resolved before writing anything: never a "successful" archive with missing images. */
export async function criarPacoteMateriais(v:VarianteRoteiro,ppm:number,project:string,api:ApiMateriais):Promise<Blob> {
  if(pendenciasMateriais(v).length || v.materiais_revistos!==await assinaturaMateriais(v,ppm))throw new Error('Revê e aprova a sequência atual antes de exportar os materiais.');
  const assets=await api.ler(project,idsMateriais(v));
  return pacoteVerificado(v,ppm,assets);
}
export async function pacoteVerificado(v:VarianteRoteiro,ppm:number,assets:Record<string,MaterialRoteiro>):Promise<Blob> {
  if(idsMateriais(v).some(id=>!assets[id]))throw new Error('Faltam imagens no conjunto. Volta a escolher os materiais.');
  if(Object.values(assets).reduce((n,a)=>n+Math.ceil(a.dados.length*3/4),0)>60*1024*1024)throw new Error('Os materiais ultrapassam 60 MB. Usa imagens mais pequenas.');
  const {default:JSZip}=await import('jszip');const zip=new JSZip();
  const manifesto=v.cenas.map((c,i)=>{
    const a=c.apoio?.asset_id?assets[c.apoio.asset_id]:null;
    const ficheiro=a?`materiais/passagem-${String(i+1).padStart(2,'0')}.${a.mime==='image/png'?'png':'jpg'}`:null;
    if(a&&ficheiro)zip.file(ficheiro,a.dados,{base64:true});
    return {ordem:i+1,cena_id:c.id,etapa:c.etapa,fala:c.locucao,instrucao_edicao:c.visual,tipo:c.apoio?.tipo,ficheiro,asset_id:a?.id??null,nome:a?.nome??null,credito:a?.credito??null};
  });
  zip.file('locucao-bigvu.txt',textoLimpo(v));zip.file('plano-gravacao.txt',textoPlano(v,ppm));
  zip.file('manifesto.json',JSON.stringify({versao:1,titulo:v.titulo,tempos:'estimados, confirmar após gravar',passagens:manifesto},null,2));
  const creditos=manifesto.filter(p=>p.credito).map(p=>`Passagem ${p.ordem}: ${p.credito}`);
  zip.file('creditos.txt',creditos.join('\n')||'Não há créditos de banco de imagens associados a este conjunto.');
  zip.file('plano-gravacao.pdf',await (await pdfPlano(v,ppm,assets,false)).arrayBuffer());
  return zip.generateAsync({type:'blob',compression:'STORE'});
}
