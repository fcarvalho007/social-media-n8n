import { build } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';

const destino = process.argv[2] ?? '.impeccable/review/build/medicao.json';
mkdirSync(dirname(destino), { recursive: true });
await build({build:{manifest:true},plugins:[{
  name:'hub-medir-build',
  generateBundle(_options,bundle) {
    const chunks = Object.values(bundle).filter(c=>c.type==='chunk').map(c=>({
      file:c.fileName,entry:c.isEntry,dynamic:c.isDynamicEntry,bytes:Buffer.byteLength(c.code),gzip:gzipSync(c.code).length,
      imports:c.imports,dynamicImports:c.dynamicImports,
      modules:Object.entries(c.modules).map(([id,m])=>({id:id.includes('/node_modules/')?`node_modules/${id.split('/node_modules/').at(-1)}`:id.replace(`${process.cwd()}/`,''),bytes:m.renderedLength})).sort((a,b)=>b.bytes-a.bytes),
    }));
    writeFileSync(destino,JSON.stringify(chunks,null,2));
    const byFile=new Map(chunks.map(c=>[c.file,c])),vistos=new Set();
    function visitar(file){if(vistos.has(file))return;vistos.add(file);for(const i of byFile.get(file)?.imports??[])visitar(i);}
    for(const c of chunks.filter(c=>c.entry))visitar(c.file);
    console.log(JSON.stringify({relatorio:destino,javascriptInicialBytes:[...vistos].reduce((n,f)=>n+(byFile.get(f)?.bytes??0),0),gzipInicialBytes:[...vistos].reduce((n,f)=>n+(byFile.get(f)?.gzip??0),0),ficheirosIniciais:vistos.size}));
  },
}]});
