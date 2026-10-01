import { describe, it, expect } from 'vitest';
import { restoreComponents, restorePromptHistory, restoreProvider } from './restore';

describe('restoreProvider', () => {
  it('지원하는 제공자 값은 그대로 복원한다', () => {
    expect(restoreProvider('anthropic')).toBe('anthropic');
  });

  it('알 수 없는 값이면 기본 제공자 google을 반환한다', () => {
    expect(restoreProvider('openai')).toBe('google');
  });
});

describe('restorePromptHistory', () => {
  it('문자열 배열이면 그대로 복원한다', () => {
    expect(restorePromptHistory(['A', 'B'])).toEqual(['A', 'B']);
  });

  it('배열이 아니면 빈 배열을 반환한다', () => {
    expect(restorePromptHistory('A')).toEqual([]);
  });

  it('문자열이 아닌 항목은 버린다', () => {
    expect(restorePromptHistory(['A', 1, null, 'B'])).toEqual(['A', 'B']);
  });

  it('중복된 프롬프트는 앞쪽 하나만 남긴다', () => {
    expect(restorePromptHistory(['A', 'B', 'A'])).toEqual(['A', 'B']);
  });

  it('20개를 넘으면 앞쪽 20개만 복원한다', () => {
    const stored = Array.from({ length: 25 }, (_, i) => `p${i}`);
    expect(restorePromptHistory(stored)).toEqual(stored.slice(0, 20));
  });
});

describe('restoreComponents', () => {
  const stored = {
    id: '1',
    prompt: '카드',
    code: 'render(<div />)',
    createdAt: '2026-10-01T05:00:00.000Z',
  };

  it('createdAt 문자열을 Date로 복원한다', () => {
    const [component] = restoreComponents([stored]);
    expect(component.createdAt).toBeInstanceOf(Date);
    expect(component.createdAt.toISOString()).toBe('2026-10-01T05:00:00.000Z');
  });

  it('복원한 컴포넌트에는 restored 표시를 붙인다', () => {
    expect(restoreComponents([stored])[0].restored).toBe(true);
  });

  it('배열이 아니면 빈 배열을 반환한다', () => {
    expect(restoreComponents({})).toEqual([]);
  });

  it('필수 필드가 빠진 항목은 버린다', () => {
    expect(restoreComponents([{ ...stored, code: undefined }, stored])).toHaveLength(1);
  });

  it('createdAt이 유효한 날짜가 아닌 항목은 버린다', () => {
    expect(restoreComponents([{ ...stored, createdAt: 'invalid' }])).toEqual([]);
  });
});
