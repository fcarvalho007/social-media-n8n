import { it } from "vitest";
import * as R from "../../supabase/functions/_shared/motor/redesenhar";
import * as S from "../../supabase/functions/_shared/motor/sistema";
it("dbg", () => {
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const slides=[{id:"s1",titulo:"Titulo curto",texto:"x"},{id:"s2",titulo:"Titulo curto",texto:"x"}];
  const pg=(i:number,sid:string)=>({id:`p${i}`,slide:sid,fundo:"#fff",composicao:{modo:"full_bleed",regiao:"left",asset_id:R.ASSET_IA_PENDENTE},camadas:[{ id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700, tam: 72, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } }]});
  const doc=(v:string)=>({v:1,variante:v,largura:1080,altura:1350,fonte:"WorkSans@1",paginas:slides.map((s,i)=>pg(i,s.id))});
  const p:any={v:1,id:"x",nome:"x",sintetico:true,conteudo:{slides},assets:{[R.ASSET_IA_PENDENTE]:{id:R.ASSET_IA_PENDENTE,mime:"image/png",largura:1080,altura:1350,dados:PNG}},variantes:{A:doc("A"),B:doc("B")}};
  const r=S.aplicarSistema(p,{...S.sistemaPadrao(2,"editorial"),quebras:{},imagens:"auto"},undefined,[1],{},{ajustes:"recriar",variantes:["A"]});
  console.log(JSON.stringify({rec:r.recusadas,ir:r.imagemRecusadas,cam:r.pacote.variantes.A.paginas[1].camadas.map((c:any)=>c.id+":"+c.tipo)}));
});
