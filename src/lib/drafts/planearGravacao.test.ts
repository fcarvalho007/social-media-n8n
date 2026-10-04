import { describe, it, expect, vi } from 'vitest';
import { planearGravacaoRascunho } from './planearGravacao';

const dados = { user_id: 'editor-atual', project_id: 'outro', caption: 'Olá', status: 'draft' };

describe('planearGravacaoRascunho', () => {
  it('preserva autoria e projeto ao atualizar rascunho existente', () => {
    const projeto = vi.fn();
    const p = planearGravacaoRascunho(dados, 'd1', 'd1', projeto);
    expect(p.tipo).toBe('atualizar');
    if (p.tipo !== 'atualizar') return;
    expect(p.campos).toEqual({ caption: 'Olá', status: 'draft' });
    expect(projeto).not.toHaveBeenCalled();
  });

  it('aplica o projeto escolhido só na criação', async () => {
    const p = planearGravacaoRascunho(dados, null, null, async () => 'proj-escolhido');
    expect(p.tipo).toBe('criar');
    if (p.tipo === 'criar') expect(await p.projeto()).toBe('proj-escolhido');
  });

  it('falha da preferência de projeto não cria rascunho sem marca', async () => {
    const p = planearGravacaoRascunho(dados, null, null, () => Promise.reject(new Error('sem rede')));
    if (p.tipo !== 'criar') throw new Error('esperado criar');
    await expect(p.projeto()).rejects.toThrow('sem rede');
  });

  it('não grava enquanto o rascunho pedido não foi recuperado', () => {
    expect(planearGravacaoRascunho(dados, null, 'd1', async () => 'x').tipo).toBe('aguardar');
  });
});
