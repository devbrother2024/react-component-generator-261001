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

// 서버 NDJSON 스트림을 흉내 낸다. 테스트가 이벤트를 원하는 시점에 흘려보낼 수 있도록 controller를 돌려준다.
function createControlledStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    body,
    send: (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)),
    close: () => controller.close(),
  };
}

function mockFetchResponse(ok: boolean, body: { code?: string; error?: string }) {
  if (!ok) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }));
    return;
  }
  const stream = createControlledStream();
  stream.send({ type: 'done', code: body.code });
  stream.close();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, body: stream.body }));
}

function mockFetchStream() {
  const stream = createControlledStream();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream.body }));
  return stream;
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

  it('저장 용량을 넘지 않도록 최신 30개까지만 localStorage에 저장한다', async () => {
    const saved = Array.from({ length: 30 }, (_, i) => ({ ...storedComponent, id: `saved-${i}` }));
    localStorage.setItem(STORAGE_KEYS.components, JSON.stringify(saved));
    mockFetchResponse(true, { code: 'render(<p />)' });
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('버튼', undefined, 'google'));

    const stored = readStored(STORAGE_KEYS.components);
    expect(stored).toHaveLength(30);
    expect(stored[0].prompt).toBe('버튼');
    expect(stored.map((c: { id: string }) => c.id)).not.toContain('saved-29');
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

describe('useComponentGenerator 스트리밍', () => {
  it('생성 중에는 받은 코드 조각을 streamingComponent에 누적한다', async () => {
    const stream = mockFetchStream();
    const { result } = renderHook(() => useComponentGenerator());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.generate('버튼', undefined, 'google');
    });
    await act(async () => {
      stream.send({ type: 'delta', text: 'const ' });
      stream.send({ type: 'delta', text: 'A' });
    });

    expect(result.current.streamingComponent).toEqual(
      expect.objectContaining({ prompt: '버튼', code: 'const A' }),
    );

    await act(async () => {
      stream.send({ type: 'done', code: 'render(<A />)' });
      stream.close();
      await pending;
    });
  });

  it('생성이 끝나면 streamingComponent를 비우고 같은 id로 목록 맨 앞에 추가한다', async () => {
    const stream = mockFetchStream();
    const { result } = renderHook(() => useComponentGenerator());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.generate('버튼', undefined, 'google');
    });
    await act(async () => {
      stream.send({ type: 'delta', text: 'const A' });
    });
    const streamingId = result.current.streamingComponent?.id;

    await act(async () => {
      stream.send({ type: 'done', code: 'render(<A />)' });
      stream.close();
      await pending;
    });

    expect(result.current.streamingComponent).toBeNull();
    expect(result.current.components[0]).toEqual(
      expect.objectContaining({ id: streamingId, code: 'render(<A />)' }),
    );
  });

  it('생성 도중 실패하면 streamingComponent를 비우고 에러를 보여준다', async () => {
    const stream = mockFetchStream();
    const { result } = renderHook(() => useComponentGenerator());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.generate('버튼', undefined, 'google');
    });
    await act(async () => {
      stream.send({ type: 'delta', text: 'const A' });
      stream.send({ type: 'error', error: '과부하' });
      stream.close();
      await pending;
    });

    expect(result.current.streamingComponent).toBeNull();
    expect(result.current.error).toBe('과부하');
    expect(result.current.components).toEqual([]);
  });
});
