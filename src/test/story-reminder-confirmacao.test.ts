import { describe, expect, it, vi } from 'vitest';
import { confirmarRespostaEmail, enviarEmailERegistar, registoTesteEmail } from '../../supabase/functions/send_story_reminder/envio';

const confirmado = () => Promise.resolve({ data: { id: 'email-1' }, error: null });
const guardado = () => Promise.resolve({ data: { id: 'story-1' }, error: null });

describe('lembrete Story: evidência do serviço de email', () => {
  it('uma recusa devolvida pelo SDK não marca o teste ou Story como enviados', async () => {
    const registar = vi.fn(guardado);
    await expect(enviarEmailERegistar(() => Promise.resolve({ data: null, error: { message: 'Domínio não autorizado' } }), registar)).rejects.toThrow('Domínio não autorizado');
    expect(registar).not.toHaveBeenCalled();
  });
  it.each([null, {}, { id: '' }, { id: '   ' }, { id: 42 }])('uma resposta sem identificação válida não grava sucesso: %j', async (data) => {
    const registar = vi.fn(guardado);
    await expect(enviarEmailERegistar(() => Promise.resolve({ data, error: null }), registar)).rejects.toThrow('não confirmou');
    expect(registar).not.toHaveBeenCalled();
  });
  it('uma exceção de transporte nunca chega à gravação de sucesso', async () => {
    const registar = vi.fn(guardado);
    await expect(enviarEmailERegistar(() => Promise.reject(new Error('Rede interrompida')), registar)).rejects.toThrow('Rede interrompida');
    expect(registar).not.toHaveBeenCalled();
  });
  it('só grava depois da confirmação do serviço e só resolve depois da confirmação SQL', async () => {
    const ordem: string[] = [];
    let aceitar!: (value: { data: { id: string }; error: null }) => void;
    let persistir!: (value: { data: { id: string }; error: null }) => void;
    const envio = new Promise<{ data: { id: string }; error: null }>((r) => { aceitar = r; });
    const sql = new Promise<{ data: { id: string }; error: null }>((r) => { persistir = r; });
    const registar = vi.fn(() => { ordem.push('sql'); return sql; });
    const resultado = enviarEmailERegistar(() => { ordem.push('email'); return envio; }, registar).then((id) => { ordem.push('concluido'); return id; });
    expect(registar).not.toHaveBeenCalled();
    aceitar({ data: { id: 'email-1' }, error: null });
    await Promise.resolve();
    expect(ordem).toEqual(['email', 'sql']);
    persistir({ data: { id: 'story-1' }, error: null });
    await expect(resultado).resolves.toBe('email-1');
    expect(ordem).toEqual(['email', 'sql', 'concluido']);
  });
  it('um erro SQL depois da aceitação do email é devolvido como confirmação incompleta', async () => {
    await expect(enviarEmailERegistar(confirmado, () => Promise.resolve({ data: null, error: { message: 'Gravação recusada' } }))).rejects.toThrow('Email aceite pelo serviço; não foi possível guardar a confirmação: Gravação recusada');
  });
  it('uma gravação sem registo confirmado nunca devolve sucesso', async () => {
    await expect(enviarEmailERegistar(confirmado, () => Promise.resolve({ data: null, error: null }))).rejects.toThrow('não confirmou o registo');
  });
  it('a existência de um id não supera um erro explícito do serviço', () => {
    expect(() => confirmarRespostaEmail({ data: { id: 'email-1' }, error: { message: 'Recusado' } })).toThrow('Recusado');
  });
  it('o teste altera apenas a data de verificação, preservando canal e horários existentes', () => {
    expect(registoTesteEmail('u1', new Date('2026-10-18T10:00:00Z'))).toEqual({ user_id: 'u1', email_tested_at: '2026-10-18T10:00:00.000Z' });
  });
});
