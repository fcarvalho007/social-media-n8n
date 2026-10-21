// @vitest-environment node
import { describe,expect,it } from 'vitest';
import { permitidoRobots } from '../../scripts/documentos/robots';
const pode=(s:string,p:string)=>permitidoRobots(s,new URL(p,'https://example.org'));
describe('robots: acesso conservador às fontes',()=>{
  it('usa a regra mais específica e Allow em empate',()=>{const s='User-agent: *\nDisallow: /reports\nAllow: /reports/public';expect(pode(s,'/reports/private')).toBe(false);expect(pode(s,'/reports/public/a.pdf')).toBe(true);expect(pode('User-agent: *\nDisallow: /a\nAllow: /a','/a')).toBe(true);});
  it('grupo próprio tem precedência e grupos com o mesmo agente são combinados',()=>{const s='User-agent: *\nDisallow: /\nUser-agent: HubDocumentos\nDisallow: /privado\nUser-agent: HubDocumentos\nDisallow: /conta';expect(pode(s,'/publico')).toBe(true);expect(pode(s,'/conta')).toBe(false);});
  it('interpreta wildcard e fim de caminho',()=>{const s='User-agent: *\nDisallow: /*.pdf$';expect(pode(s,'/a.pdf')).toBe(false);expect(pode(s,'/a.pdf?download=1')).toBe(true);});
  it('uma regra vazia não mistura grupos de agentes',()=>{expect(pode('User-agent: *\nDisallow:\nUser-agent: OutroBot\nDisallow: /','/a')).toBe(true);});
  it('normaliza UTF-8 e percent-encoding sem descodificar barras reservadas',()=>{expect(pode('User-agent: *\nDisallow: /caf%C3%A9','/café')).toBe(false);expect(pode('User-agent: *\nDisallow: /a%2Fb','/a/b')).toBe(true);});
  it('ignora comentários e agentes que não correspondem',()=>{expect(pode('User-agent: OutroBot\nDisallow: / # privado','/a')).toBe(true);});
});
