import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';
import { STORAGE_KEYS } from '../utils/storage';

const storedComponent = {
  id: 'saved-1',
  prompt: '저장된 카드',
  code: 'render(<div />)',
  createdAt: '2026-10-01T05:00:00.000Z',
};

function mockFetchResponse(ok: boolean, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }),
  );
}

function readStored(key: string) {
  return JSON.parse(localStorage.getItem(key) ?? 'null');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useComponentGenerator 저장/복원', () => {
  it('저장된 컴포넌트 목록을 초기 상태로 복원한다', () => {
    localStorage.setItem(STORAGE_KEYS.components, JSON.stringify([storedComponent]));
    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].prompt).toBe('저장된 카드');
    expect(result.current.components[0].createdAt).toBeInstanceOf(Date);
  });

  it('생성에 성공하면 새 컴포넌트를 localStorage에 저장한다', async () => {
    mockFetchResponse(true, { code: 'render(<p />)' });
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('버튼', undefined, 'google'));

    expect(readStored(STORAGE_KEYS.components)).toEqual([
      expect.objectContaining({ prompt: '버튼', code: 'render(<p />)' }),
    ]);
  });

  it('컴포넌트를 삭제하면 저장된 목록에서도 빠진다', () => {
    localStorage.setItem(STORAGE_KEYS.components, JSON.stringify([storedComponent]));
    const { result } = renderHook(() => useComponentGenerator());

    act(() => result.current.removeComponent('saved-1'));

    expect(readStored(STORAGE_KEYS.components)).toEqual([]);
  });

  it('저장된 프롬프트 히스토리를 초기 상태로 복원한다', () => {
    localStorage.setItem(STORAGE_KEYS.promptHistory, JSON.stringify(['이전 프롬프트']));
    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.history).toEqual(['이전 프롬프트']);
  });

  it('생성에 성공하면 프롬프트를 히스토리 맨 앞에 추가하고 저장한다', async () => {
    localStorage.setItem(STORAGE_KEYS.promptHistory, JSON.stringify(['이전 프롬프트']));
    mockFetchResponse(true, { code: 'render(<p />)' });
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('버튼', undefined, 'google'));

    expect(result.current.history).toEqual(['버튼', '이전 프롬프트']);
    expect(readStored(STORAGE_KEYS.promptHistory)).toEqual(['버튼', '이전 프롬프트']);
  });

  it('생성에 실패하면 히스토리에 추가하지 않는다', async () => {
    localStorage.setItem(STORAGE_KEYS.promptHistory, JSON.stringify(['이전 프롬프트']));
    mockFetchResponse(false, { error: '실패' });
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('버튼', undefined, 'google'));

    expect(result.current.history).toEqual(['이전 프롬프트']);
  });

  it('생성 결과를 저장할 때 요청에 쓴 API 키는 저장하지 않는다', async () => {
    mockFetchResponse(true, { code: 'render(<p />)' });
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('버튼', 'sk-ant-secret', 'anthropic'));

    expect(localStorage.length).toBeGreaterThan(0);
    const everything = Object.keys(localStorage)
      .map((key) => localStorage.getItem(key))
      .join('');
    expect(everything).not.toContain('sk-ant-secret');
  });
});
