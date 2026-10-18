import{build}from'esbuild';
await build({entryPoints:['scripts/backend/main.ts','scripts/backend/operador.ts'],outdir:'dist-backend',bundle:true,platform:'node',target:'node22',format:'esm',packages:'external',sourcemap:false});
