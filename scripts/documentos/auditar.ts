import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { MotorDocumentos } from './motor-local';
import fontes from './fontes-originais.json';
import { readFile } from 'node:fs/promises';
import type { TarefaDocumentos } from '../../src/features/documentos/contratos';

// Manual, read-only public-site audit; never starts the legacy cron or paid providers.
const pasta = path.resolve('.documentos-local');
const motor = new MotorDocumentos(pasta,fontes);
const pedidas=process.argv.slice(2).map(Number).filter(Number.isFinite);
const ids=pedidas.length?pedidas:fontes.map(f=>f.id);
const j = await motor.iniciar('auditoria-tecnica-local',ids,'diagnostico');
process.stdout.write(`Auditoria iniciada: ${j.id}, ${j.total} fontes.\n`);
let anterior = 0;
while (j.estado === 'em_curso') {
  const n = j.fontes.filter(f=>f.estado!=='a_consultar').length;
  if (n !== anterior) { anterior=n; process.stdout.write(`${n}/${j.total} fontes concluídas. ${j.atual}\n`); }
  await new Promise(r=>setTimeout(r,1000));
}
await motor.aguardar(j.id,'auditoria-tecnica-local');
await mkdir('docs/auditorias',{recursive:true});
// Full discovery evidence stays in ignored local task storage, not in a public repository.
let relatorio={...j,descobertas:[],pdfs:[],resumo:{pdfsCandidatos:j.descobertas.filter(d=>d.tipo==='pdf').length,referencias:j.descobertas.filter(d=>d.tipo==='artigo').length}};
if(pedidas.length){
  const base=JSON.parse(await readFile('docs/auditorias/fontes-pdfs-2026-10-18.json','utf8')) as typeof relatorio;
  const atualizadas=new Map(j.fontes.map(f=>[f.fonteId,f]));
  const unidas=base.fontes.map(f=>atualizadas.get(f.fonteId)??f);
  relatorio={...base,fontes:unidas,resumo:{pdfsCandidatos:unidas.reduce((n,f)=>n+f.pdfs,0),referencias:unidas.reduce((n,f)=>n+f.novidades,0)}};
}
await writeFile('docs/auditorias/fontes-pdfs-2026-10-18.json',JSON.stringify(relatorio,null,2)+'\n');
const resumo = Object.fromEntries(['concluida','limitada','erro','bloqueada'].map(e=>[e,j.fontes.filter(f=>f.estado===e).length]));
process.stdout.write(JSON.stringify({estado:j.estado,fontes:j.total,...resumo,pdfs:j.descobertas.filter(d=>d.tipo==='pdf').length,referencias:j.descobertas.filter(d=>d.tipo==='artigo').length})+'\n');
