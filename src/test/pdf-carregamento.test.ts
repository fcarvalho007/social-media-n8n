import {describe,expect,it,vi} from 'vitest';
const h=vi.hoisted(()=>({carregou:vi.fn(),destroy:vi.fn(),cleanup:vi.fn()}));
vi.mock('pdfjs-dist',()=>{h.carregou();return{
 GlobalWorkerOptions:{workerSrc:''},OPS:{paintImageXObject:1,paintInlineImageXObject:2,paintImageMaskXObject:3},
 getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[{str:'Conteúdo verificável do relatório.',hasEOL:true,transform:[1,0,0,1,0,1],height:1}]}),cleanup:h.cleanup}),getMetadata:async()=>({info:{Title:'Relatório de teste'}}),destroy:h.destroy})}),
};});
import {comporFontePdf,lerPdf, type PdfLido} from '@/features/motor/fontePdf';
const ficheiro=(texto:string)=>({name:'teste.pdf',size:texto.length,arrayBuffer:async()=>new TextEncoder().encode(texto).buffer} as File);
describe('o motor PDF não atrasa a edição de texto',()=>{
 it('compor uma referência e recusar um ficheiro inválido não carregam o parser',async()=>{
  const fonte:PdfLido={ficheiro:'relatorio.pdf',hash:'abc',bytes:10,paginas:[{n:1,estado:'texto',texto:'Conteúdo verificável.',paragrafos:['Conteúdo verificável.']}]};
  expect(comporFontePdf(fonte,new Set(),false).texto).toContain('Conteúdo verificável');
  await expect(lerPdf(ficheiro('não é PDF'))).rejects.toThrow('não é um PDF');expect(h.carregou).not.toHaveBeenCalled();
 });
 it('ao abrir um PDF, extrai páginas e liberta recursos depois da leitura',async()=>{
  const doc=await lerPdf(ficheiro('%PDF-1.7\nficheiro de teste'));
  expect(h.carregou).toHaveBeenCalledOnce();expect(doc.paginas[0].texto).toContain('Conteúdo verificável');
  expect(doc.titulo).toBe('Relatório de teste');expect(h.cleanup).toHaveBeenCalledOnce();expect(h.destroy).toHaveBeenCalledOnce();
 });
});
