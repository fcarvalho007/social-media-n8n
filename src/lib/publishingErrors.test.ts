import { describe, expect, it } from 'vitest';
import { classifyError, classifyErrorFromString, getErrorInfoFromStructured } from './publishingErrors';

describe('publishingErrors', () => {
  it('classifica All platforms failed como falha temporária acionável', () => {
    const structured = classifyErrorFromString('All platforms failed', 200);

    expect(structured.code).toBe('ALL_PLATFORMS_FAILED');
    expect(structured.source).toBe('getlate');
    expect(structured.isRetryable).toBe(true);
    expect(structured.suggestedAction).toContain('histórico');
  });

  it('usa copy específica para falhas genéricas de plataforma', () => {
    expect(classifyError('{"message":"All platforms failed"}')).toBe('all_platforms_failed');

    const info = getErrorInfoFromStructured({
      message: 'Falha temporária da rede social',
      code: 'ALL_PLATFORMS_FAILED',
      source: 'getlate',
      originalError: 'All platforms failed',
      isRetryable: true,
      suggestedAction: 'Verifica o histórico antes de repetir',
    });

    expect(info.title).toContain('rejeitou temporariamente');
    expect(info.whatToDo.join(' ')).toContain('histórico');
  });
});