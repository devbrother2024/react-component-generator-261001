import { describe, it, expect, vi, afterEach } from 'vitest';
import { readStorage, writeStorage } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('readStorage / writeStorage', () => {
  it('저장한 값을 같은 키로 다시 읽는다', () => {
    writeStorage('test:key', { a: 1, b: ['x'] });
    expect(readStorage('test:key', null)).toEqual({ a: 1, b: ['x'] });
  });

  it('키가 없으면 fallback을 반환한다', () => {
    expect(readStorage('test:missing', 'fallback')).toBe('fallback');
  });

  it('저장된 값이 JSON이 아니면 fallback을 반환한다', () => {
    localStorage.setItem('test:broken', '{not json');
    expect(readStorage('test:broken', [])).toEqual([]);
  });

  it('localStorage 읽기가 예외를 던지면 fallback을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readStorage('test:key', 'fallback')).toBe('fallback');
  });

  it('localStorage 쓰기가 예외를 던져도(용량 초과 등) 에러를 전파하지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeStorage('test:key', 'value')).not.toThrow();
  });
});
