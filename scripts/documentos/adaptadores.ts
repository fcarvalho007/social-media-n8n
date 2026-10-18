/** Published DSpace REST content contract, verified against this public repository.
 * Other hosts stay untouched. No login, token, paywall or anti-bot circumvention.
 */
export function downloadConhecido(bruto:string):string{
  const u=new URL(bruto);
  if(u.hostname==='openknowledge.worldbank.org'&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port){
    const id=u.pathname.match(/^\/bitstreams\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/download\/?$/i)?.[1];
    if(id)return new URL(`/server/api/core/bitstreams/${id}/content`,u.origin).href;
  }
  return bruto;
}
