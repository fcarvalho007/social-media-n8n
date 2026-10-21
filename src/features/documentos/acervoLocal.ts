import { BACKEND_NUVEM } from '@/lib/backendHub';
import {listarNuvem,encontrarNuvem,guardarFicheiroNuvem,alterarNuvem,guardarRecolhaNuvem,refazerCapaNuvem,guardarLegadoNuvem} from './acervoNuvem';
import { DOCUMENTOS_LOCAL, type DocumentoAcervo, type Recolha } from './modelo';
import type {MetadadosPdfTracker} from './legado';

/** Prototype storage only. Production will use private Storage + owner/team RLS. */
let dbPromise: Promise<IDBDatabase> | null = null;
function abrir(): Promise<IDBDatabase> {
  if (!DOCUMENTOS_LOCAL) return Promise.reject(new Error('O acervo local só está disponível na pré-visualização.'));
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const r = indexedDB.open('hub-documentos-local-v1', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      const docs = d.createObjectStore('documentos', { keyPath: 'id' });
      docs.createIndex('ambito', 'ambito'); docs.createIndex('hashAmbito', ['ambito', 'pdf.hash'], { unique: true });
      d.createObjectStore('recolhas', { keyPath: 'id' }).createIndex('ambito', 'ambito');
    };
    r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); dbPromise = null; }; resolve(r.result); };
    r.onerror = () => { dbPromise = null; reject(new Error('Não foi possível abrir o acervo neste navegador.')); };
    r.onblocked = () => { dbPromise = null; reject(new Error('Fecha os outros separadores do acervo e tenta novamente.')); };
  });
  return dbPromise;
}

export async function listarAcervo<T extends DocumentoAcervo | Recolha>(tabela: 'documentos' | 'recolhas', ambito: string): Promise<T[]> {
  if(BACKEND_NUVEM)return listarNuvem<T>(tabela,ambito);
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const r = db.transaction(tabela).objectStore(tabela).index('ambito').getAll(ambito);
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(new Error('Não foi possível ler o acervo.'));
  });
}

/** Atomic hash lookup + insert; success only after the transaction commits. */
export async function guardarDocumento(d: DocumentoAcervo): Promise<{ documento: DocumentoAcervo; duplicado: boolean }> {
  if(BACKEND_NUVEM)return guardarFicheiroNuvem(new File([d.ficheiro],d.pdf.ficheiro,{type:'application/pdf'}),d.ambito,{titulo:d.titulo,origem:d.origem,fonteNome:d.fonteNome,categoria:d.categoria});
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documentos', 'readwrite');
    const store = tx.objectStore('documentos');
    let resultado = { documento: d, duplicado: false };
    const r = store.index('hashAmbito').get([d.ambito, d.pdf.hash]);
    r.onsuccess = () => { if (r.result) resultado = { documento: r.result, duplicado: true }; else store.add(d); };
    tx.oncomplete = () => resolve(resultado);
    tx.onabort = () => reject(new Error('O PDF não foi guardado. Verifica o espaço disponível no navegador.'));
  });
}

export async function encontrarDocumentoHash(ambito: string, hash: string): Promise<DocumentoAcervo | null> {
  if(BACKEND_NUVEM)return encontrarNuvem(ambito,hash);
  const db=await abrir();
  return new Promise((resolve,reject)=>{ const r=db.transaction('documentos').objectStore('documentos').index('hashAmbito').get([ambito,hash]); r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(new Error('Não foi possível verificar se o PDF já existe.')); });
}

export async function guardarRecolha(r: Recolha): Promise<void> {
  if(BACKEND_NUVEM)return guardarRecolhaNuvem(r);
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recolhas', 'readwrite'); tx.objectStore('recolhas').put(r);
    tx.oncomplete = () => resolve(); tx.onabort = () => reject(new Error('Não foi possível guardar o histórico da recolha.'));
  });
}

export async function guardarTituloDocumento(id: string, ambito: string, titulo: string): Promise<void> {
  if(BACKEND_NUVEM)return alterarNuvem(id,ambito,'titulo',titulo);
  const nome = titulo.trim();
  if (!nome || nome.length > 200) throw new Error('Indica um título com até 200 caracteres.');
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documentos', 'readwrite'); const store = tx.objectStore('documentos');
    const r = store.get(id);
    r.onsuccess = () => { const d = r.result as DocumentoAcervo | undefined; if (!d || d.ambito !== ambito) { tx.abort(); return; } store.put({ ...d, titulo: nome }); };
    tx.oncomplete = () => resolve(); tx.onabort = () => reject(new Error('O título não foi guardado. Tenta novamente.'));
  });
}

export async function guardarCapaDocumento(id: string, ambito: string, capa: Blob): Promise<void> {
  if(BACKEND_NUVEM)return refazerCapaNuvem(id,ambito);
  const db=await abrir();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('documentos','readwrite'); const store=tx.objectStore('documentos'); const r=store.get(id);
    r.onsuccess=()=>{ const d=r.result as DocumentoAcervo|undefined; if(!d||d.ambito!==ambito){tx.abort();return;} store.put({...d,capa,capaErro:undefined}); };
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(new Error('A imagem da capa não foi guardada.'));
  });
}

export async function guardarLegadoDocumento(id:string,ambito:string,legado:MetadadosPdfTracker):Promise<DocumentoAcervo>{
  if(BACKEND_NUVEM)return guardarLegadoNuvem(id,ambito,legado);
  const db=await abrir();return new Promise((resolve,reject)=>{const tx=db.transaction('documentos','readwrite');const store=tx.objectStore('documentos');let atualizado:DocumentoAcervo;const r=store.get(id);r.onsuccess=()=>{const d=r.result as DocumentoAcervo|undefined;if(!d||d.ambito!==ambito){tx.abort();return;}atualizado={...d,legado:{...legado,registos:[...new Map([...(d.legado?.registos??[]),...legado.registos].map(r=>[r.id,r])).values()]}};store.put(atualizado);};tx.oncomplete=()=>resolve(atualizado);tx.onabort=()=>reject(new Error('Os metadados antigos não foram guardados.'));});
}

export async function guardarLeituraDocumento(id:string,ambito:string,leitura:NonNullable<DocumentoAcervo['leitura']>):Promise<void>{
  if(BACKEND_NUVEM)return alterarNuvem(id,ambito,'leitura',leitura);
  if(!['por_ler','lido','arquivado'].includes(leitura))throw new Error('Estado de leitura inválido.');
  const db=await abrir();return new Promise((resolve,reject)=>{const tx=db.transaction('documentos','readwrite');const store=tx.objectStore('documentos');const r=store.get(id);r.onsuccess=()=>{const d=r.result as DocumentoAcervo|undefined;if(!d||d.ambito!==ambito){tx.abort();return;}store.put({...d,leitura});};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(new Error('O estado de leitura não foi guardado.'));});
}
