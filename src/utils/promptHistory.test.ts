import { describe, it, expect } from 'vitest';
import { addPromptToHistory } from './promptHistory';

describe('addPromptToHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addPromptToHistory(['이전'], '새 프롬프트')).toEqual(['새 프롬프트', '이전']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addPromptToHistory(['A', 'B', 'C'], 'B')).toEqual(['B', 'A', 'C']);
  });

  it('20개를 넘으면 가장 오래된 항목을 버린다', () => {
    const history = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const next = addPromptToHistory(history, 'new');
    expect(next).toHaveLength(20);
    expect(next[0]).toBe('new');
    expect(next).not.toContain('p19');
  });

  it('원본 배열을 변경하지 않는다', () => {
    const history = ['A'];
    addPromptToHistory(history, 'B');
    expect(history).toEqual(['A']);
  });
});
