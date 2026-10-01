import { describe, it, expect, vi } from 'vitest';
import { readGenerateStream } from './generateStream';

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

const line = (event: object) => `${JSON.stringify(event)}\n`;

describe('readGenerateStream', () => {
  it('delta 이벤트마다 텍스트 조각을 콜백으로 넘긴다', async () => {
    const onDelta = vi.fn();
    const body = streamOf(
      line({ type: 'delta', text: 'const ' }),
      line({ type: 'delta', text: 'A' }),
      line({ type: 'done', code: 'const A' }),
    );

    await readGenerateStream(body, onDelta);

    expect(onDelta.mock.calls).toEqual([['const '], ['A']]);
  });

  it('done 이벤트의 최종 코드를 반환한다', async () => {
    const body = streamOf(line({ type: 'done', code: 'render(<A />)' }));

    await expect(readGenerateStream(body, vi.fn())).resolves.toBe('render(<A />)');
  });

  it('청크 경계에서 잘린 줄은 다음 청크와 합쳐서 해석한다', async () => {
    const full = line({ type: 'done', code: 'render(<A />)' });
    const body = streamOf(full.slice(0, 10), full.slice(10));

    await expect(readGenerateStream(body, vi.fn())).resolves.toBe('render(<A />)');
  });

  it('error 이벤트를 받으면 그 메시지로 에러를 던진다', async () => {
    const body = streamOf(line({ type: 'delta', text: 'x' }), line({ type: 'error', error: '과부하' }));

    await expect(readGenerateStream(body, vi.fn())).rejects.toThrow('과부하');
  });

  it('done 없이 스트림이 끝나면 에러를 던진다', async () => {
    const body = streamOf(line({ type: 'delta', text: 'x' }));

    await expect(readGenerateStream(body, vi.fn())).rejects.toThrow('응답이 중간에 끊겼습니다');
  });
});
