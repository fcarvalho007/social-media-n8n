import './artigo.css';
import type { FonteEditorial } from './contratos';
import { htmlMarkdownArtigo } from './markdownArtigo';
/** The shared, escaping renderer is also used by the WordPress publisher. Raw HTML is text. */
export function ConteudoArtigo({corpo,fontes}:{corpo:string;fontes:FonteEditorial[]}){
 return <div className="hub-artigo-prosa" dangerouslySetInnerHTML={{__html:htmlMarkdownArtigo(corpo,fontes)}}/>;
}
