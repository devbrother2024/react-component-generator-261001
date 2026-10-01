import { describe, it, expect } from 'vitest';
import {
  createSSEParser,
  readSSEData,
  parseAnthropicEvent,
  parseGeminiEvent,
  createGenerateStream,
} from './stream';

async function* fromArray(items: string[]) {
  for (const item of items) yield item;
}

async function readAllEvents(stream: ReadableStream<Uint8Array>) {
  const text = await new Response(stream).text();
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe('createSSEParser', () => {
  it('완결된 이벤트의 data 값을 반환한다', () => {
    const push = createSSEParser();
    expect(push('data: {"a":1}\n\ndata: {"b":2}\n\n')).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('청크 경계에서 잘린 이벤트는 다음 청크와 합쳐서 반환한다', () => {
    const push = createSSEParser();
    expect(push('data: {"a"')).toEqual([]);
    expect(push(':1}\n\n')).toEqual(['{"a":1}']);
  });

  it('CRLF 줄바꿈으로 구분된 이벤트도 처리한다', () => {
    const push = createSSEParser();
    expect(push('data: {"a":1}\r\n\r\n')).toEqual(['{"a":1}']);
  });

  it('event·주석 줄은 무시하고 data 줄만 반환한다', () => {
    const push = createSSEParser();
    expect(push(': ping\n\nevent: message_start\ndata: {"a":1}\n\n')).toEqual(['{"a":1}']);
  });
});

describe('readSSEData', () => {
  it('바이트 경계에서 잘린 한글도 깨지지 않게 data 값을 순서대로 내보낸다', async () => {
    const bytes = new TextEncoder().encode('data: 안녕\n\ndata: 하세요\n\n');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 7));
        controller.enqueue(bytes.slice(7));
        controller.close();
      },
    });

    const result: string[] = [];
    for await (const data of readSSEData(body)) result.push(data);

    expect(result).toEqual(['안녕', '하세요']);
  });
});

describe('parseAnthropicEvent', () => {
  it('text_delta 이벤트에서 텍스트를 꺼낸다', () => {
    const data = JSON.stringify({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'const A' },
    });
    expect(parseAnthropicEvent(data)).toBe('const A');
  });

  it('텍스트가 없는 이벤트는 빈 문자열을 반환한다', () => {
    expect(parseAnthropicEvent(JSON.stringify({ type: 'message_start' }))).toBe('');
  });

  it('error 이벤트는 에러를 던진다', () => {
    const data = JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } });
    expect(() => parseAnthropicEvent(data)).toThrow('Overloaded');
  });
});

describe('parseGeminiEvent', () => {
  it('첫 후보의 parts 텍스트를 이어 붙여 반환한다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'const ' }, { text: 'A' }] } }],
    });
    expect(parseGeminiEvent(data)).toBe('const A');
  });

  it('finishReason이 MAX_TOKENS면 잘림 에러를 던진다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'MAX_TOKENS' }],
    });
    expect(() => parseGeminiEvent(data)).toThrow('생성된 코드가 너무 길어 잘렸습니다');
  });
});

describe('createGenerateStream', () => {
  it('조각마다 delta 이벤트를 보내고 마지막에 정규화한 코드를 done으로 보낸다', async () => {
    const stream = createGenerateStream(fromArray(['```jsx\nconst Card', ' = () => null;\n```']));

    expect(await readAllEvents(stream)).toEqual([
      { type: 'delta', text: '```jsx\nconst Card' },
      { type: 'delta', text: ' = () => null;\n```' },
      { type: 'done', code: 'const Card = () => null;\n\nrender(<Card />);' },
    ]);
  });

  it('생성 도중 실패하면 사용자용 메시지로 바꿔 error 이벤트를 보낸다', async () => {
    async function* failing() {
      yield 'const A';
      throw new Error('Gemini API error: 503');
    }

    const events = await readAllEvents(createGenerateStream(failing()));

    expect(events.at(-1)).toEqual({
      type: 'error',
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    });
  });
});
