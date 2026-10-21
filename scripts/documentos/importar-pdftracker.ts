import process from 'node:process';
import path from 'node:path';
import {prepararLegado} from './legado-local';
import {documentosLegado} from '../../src/features/documentos/legado';
const c=await prepararLegado(path.resolve('.documentos-local'));
process.stdout.write(JSON.stringify({registos:c.registos,objetos:c.objetos,descarregados:c.entradas.filter(e=>e.hash).length,unicos:documentosLegado(c).length,erros:c.entradas.filter(e=>e.erro).map(e=>({id:e.id,erro:e.erro})),capas:c.thumbnails.filter(t=>t.hash).length})+'\n');
