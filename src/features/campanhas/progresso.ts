import type { PautaEditorial } from '../seo/contratos';
import { pecasAtivas, type Campanha, type PecaCampanha } from './modelo';
export function etapaArtigo(p?:PautaEditorial){
 if(!p)return{concluida:false,nome:'Preparar rascunho',detalhe:'Abre um rascunho com o objetivo e as referências. Ainda não é gerado texto por IA.',secao:'brief'};
 if(!p.palavra.trim())return{concluida:false,nome:'Definir palavra-chave',detalhe:'Escolhe a palavra-chave principal e associa uma pesquisa guardada, se existir.',secao:'brief'};
 if(!p.fontes.length||p.fontes.some(f=>!f.aprovada||!f.verificadaEm))return{concluida:false,nome:'Verificar fontes do artigo',detalhe:'Confirma os excertos que sustentam o artigo antes da redação.',secao:'fontes'};
 if(p.aprovacao?.versao===p.versao)return{concluida:true,nome:'Artigo aprovado',detalhe:'A preparação editorial está concluída. A publicação é confirmada separadamente no WordPress.',secao:'texto'};
 if(!p.estruturaAtual)return{concluida:false,nome:'Confirmar estrutura',detalhe:'Revê os subtítulos e o ângulo antes de autorizar a redação.',secao:'estrutura'};
 if(!p.texto&&!p.proposta)return{concluida:false,nome:'Escrever artigo',detalhe:'Escreve no editor ou revê o custo de uma proposta DeepSeek. Ainda não existe texto final.',secao:'texto'};
 return{concluida:false,nome:p.proposta?'Rever proposta de texto':'Rever e aprovar artigo',detalhe:'Edita o texto, confirma as referências e aprova a versão no editor.',secao:'texto'};
}
export function estadoPecaCampanha(p:PecaCampanha,revisoes:Record<string,boolean>,pauta?:PautaEditorial){
 if(p.tipo==='artigo'){const etapa=etapaArtigo(pauta);return{concluida:etapa.concluida,nome:etapa.nome,detalhe:etapa.detalhe,acao:p.pautaId?'Abrir editor do artigo':'Preparar rascunho do artigo'};}
 const feita=!!revisoes[p.tipo]&&!!p.revisao;
 if(feita)return{concluida:true,nome:'Revisão concluída',detalhe:'Esta versão foi revista. O envio ou publicação mantém a confirmação do canal.',acao:'Abrir peça revista'};
 if(p.tipo==='newsletter')return{concluida:false,nome:'Texto por rever',detalhe:'Revê o destaque e escolhe a edição na Newsletter.',acao:'Rever destaque'};
 return{concluida:false,nome:p.composicao?'Composição por rever':'Rascunho visual por criar',detalhe:p.composicao?'Abre o compositor e confirma o texto e o design.':'Ajusta o texto e prepara uma composição gratuita no compositor.',acao:p.composicao?'Rever no compositor':'Preparar peça visual'};
}
export function progressoCampanha(c:Campanha,revisoes:Record<string,boolean>,pautas:PautaEditorial[]){const pecas=pecasAtivas(c);return{total:pecas.length,concluidas:pecas.filter(p=>estadoPecaCampanha(p,revisoes,pautas.find(a=>a.id===p.pautaId)).concluida).length,fonte:!!c.fonteConfirmadaEm};}
