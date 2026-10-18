import { prepararMigracaoLocal } from './migracao-local';
import { clienteServico } from './seguranca';
import { exportarCopia, restaurarCopia } from './backup-operador';
import { z } from 'zod';
const [acao, projeto, pasta, owner] = process.argv.slice(2);
if (acao === 'preparar-migracao') {
    if (!projeto || !pasta)
        throw new Error('Indica a raiz do Hub local e uma pasta privada nova.');
    console.info(JSON.stringify(await prepararMigracaoLocal(projeto, pasta)));
    process.exit(0);
}
z.string().uuid().parse(projeto);
if (!pasta)
    throw new Error('Indica uma pasta privada para a cópia.');
const url = process.env.SUPABASE_URL, chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave)
    throw new Error('Configura o acesso do operador no ambiente privado.');
const sb = clienteServico(url, chave);
let r: unknown;
if (acao === 'exportar')
    r = await exportarCopia(sb, projeto, pasta);
else if (acao === 'restaurar') {
    z.string().uuid().parse(owner);
    r = await restaurarCopia(sb, pasta, projeto, owner);
}
else
    throw new Error('Operação disponível: exportar ou restaurar (projeto novo e vazio).');
console.info(JSON.stringify(r));
