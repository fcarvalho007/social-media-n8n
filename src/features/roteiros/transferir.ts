/** Export uses the editable text, not a server template or generated fixture. */
export function transferirTexto(texto: string, nome: string) {
 transferirBlob(new Blob([texto], { type: 'text/plain;charset=utf-8' }), nome);
}
export function transferirBlob(blob: Blob, nome: string) {
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = nome; a.hidden = true;
 document.body.appendChild(a);
 try { a.click(); } finally { a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
}
