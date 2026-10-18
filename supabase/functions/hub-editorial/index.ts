// Generated Cloud entrypoint: PDFium loads by pinned URL + SHA-256, outside the deploy bundle.
import{criarRuntimeEdge,carregarWasm}from'./runtime.js';
const runtime=criarRuntimeEdge({get:(n:string)=>Deno.env.get(n),lerWasm:()=>carregarWasm('5e4cd023c3dad4a895b3571ca573d3fc51bac6de48360d95283134385b954eaa')});
Deno.serve(req=>runtime.fetch(req));
