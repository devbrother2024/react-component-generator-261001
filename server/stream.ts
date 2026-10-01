// 제공자 스트리밍 응답(SSE)을 해석하고, 클라이언트로 보낼 NDJSON 스트림을 만드는 순수 함수들.
// 부수효과(Bun.serve 등)가 없어 단위 테스트가 가능하다.
import { stripCodeFences, ensureRenderCall } from './generator';
import { toClientError } from './errors';

/** 청크를 넣으면 완결된 SSE 이벤트의 data 값들을 돌려주는 파서를 만든다. 미완결 이벤트는 다음 청크까지 버퍼에 남긴다. */
export function createSSEParser(): (chunk: string) => string[] {
  let buffer = '';
  return (chunk) => {
    buffer = (buffer + chunk).replace(/\r\n/g, '\n');
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    return events.flatMap((event) =>
      event
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim()),
    );
  };
}

/** 응답 body를 읽어 SSE 이벤트의 data 값을 하나씩 내보낸다. */
export async function* readSSEData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  const push = createSSEParser();
  for await (const chunk of body) {
    yield* push(decoder.decode(chunk, { stream: true }));
  }
}

/** Anthropic 스트리밍 이벤트에서 텍스트 조각을 꺼낸다. */
export function parseAnthropicEvent(data: string): string {
  const event = JSON.parse(data) as {
    type: string;
    delta?: { type: string; text?: string };
    error?: { message?: string };
  };
  if (event.type === 'error') {
    throw new Error(`Claude API error: ${event.error?.message ?? 'unknown'}`);
  }
  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
    return event.delta.text ?? '';
  }
  return '';
}

/** Gemini 스트리밍 이벤트에서 텍스트 조각을 꺼낸다. 출력 한도로 잘리면 에러를 던진다. */
export function parseGeminiEvent(data: string): string {
  const event = JSON.parse(data) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const candidate = event.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }
  return candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
}

/**
 * 텍스트 조각을 NDJSON 이벤트 스트림으로 바꾼다.
 * 조각마다 `delta`, 끝나면 정규화한 코드로 `done`, 실패하면 `error`를 한 줄씩 보낸다.
 */
export function createGenerateStream(deltas: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let text = '';
      try {
        for await (const delta of deltas) {
          text += delta;
          send({ type: 'delta', text: delta });
        }
        send({ type: 'done', code: ensureRenderCall(stripCodeFences(text)) });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', error: toClientError(message).error });
      }
      controller.close();
    },
  });
}
