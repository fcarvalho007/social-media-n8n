import {it,expect,vi} from 'vitest';
import {transferirTexto} from '@/features/roteiros/transferir';
it('exporta o texto editado em UTF-8, com o link anexado, e liberta o recurso',()=>{
 vi.useFakeTimers();const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
 const create=vi.fn().mockReturnValue('blob:local');const revoke=vi.fn();URL.createObjectURL=create;URL.revokeObjectURL=revoke;
 let connected=false;let name='';const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){connected=this.isConnected;name=this.download;});
 try{transferirTexto('Ação, revisão e comunicação.','roteiro-locucao.txt');expect(create).toHaveBeenCalledWith(expect.any(Blob));expect(create.mock.calls[0][0].type).toBe('text/plain;charset=utf-8');expect(connected).toBe(true);expect(name).toBe('roteiro-locucao.txt');expect(document.querySelector('a[download]')).toBeNull();vi.runAllTimers();expect(revoke).toHaveBeenCalledWith('blob:local');}finally{click.mockRestore();URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;vi.useRealTimers();}
});
