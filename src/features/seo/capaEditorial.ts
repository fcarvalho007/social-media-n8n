/** A real, local PNG cover, made from the approved title; no AI call or invented illustration. */
export async function criarCapaEditorial(titulo:string,palavra:string,dominio:string):Promise<Blob>{
 await document.fonts.ready;const c=document.createElement('canvas');c.width=1200;c.height=630;const g=c.getContext('2d');if(!g)throw new Error('O navegador não conseguiu preparar a capa.');
 g.fillStyle='#101d35';g.fillRect(0,0,1200,630);g.fillStyle='#a5ecdc';g.fillRect(70,64,70,8);g.font='500 22px Inter, sans-serif';g.fillStyle='#d8e2ef';g.fillText(dominio,70,570);g.fillText('ARTIGO · '+palavra.toLocaleUpperCase('pt-PT').slice(0,80),70,115,1060);
 const linhas=(size:number)=>{g.font=`650 ${size}px Inter, sans-serif`;const words=titulo.trim().split(/\s+/).flatMap(w=>{const parts:string[]=[];let part='';for(const ch of w){if(g.measureText(part+ch).width>1060){parts.push(part);part=ch;}else part+=ch;}if(part)parts.push(part);return parts;}),out:string[]=[];let line='';for(const w of words){if(g.measureText(`${line} ${w}`.trim()).width>1060&&line){out.push(line);line=w;}else line=`${line} ${w}`.trim();}if(line)out.push(line);return out;};
 let size=68,ls=linhas(size);while(ls.length*size*1.2>335&&size>34){size-=2;ls=linhas(size);}g.font=`650 ${size}px Inter, sans-serif`;g.fillStyle='#ffffff';ls.forEach((l,i)=>g.fillText(l,70,210+i*size*1.2));g.strokeStyle='#41516a';g.beginPath();g.moveTo(70,520);g.lineTo(1130,520);g.stroke();
 return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível exportar a capa.')),'image/png'));
}
export async function base64Ficheiro(blob:Blob){const bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
