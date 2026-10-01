// /api/generate의 NDJSON 스트림을 읽는다. 서버(server/stream.ts)가 보내는 이벤트 형식과 짝이다.
type GenerateEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

/** delta 조각은 onDelta로 넘기고, done 이벤트의 최종 코드를 반환한다. error 이벤트나 중간 끊김은 에러로 던진다. */
export async function readGenerateStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<string> {
  // Safari는 ReadableStream 비동기 순회를 지원하지 않아 reader로 읽는다.
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as GenerateEvent;
      if (event.type === 'delta') onDelta(event.text);
      if (event.type === 'done') return event.code;
      if (event.type === 'error') throw new Error(event.error);
    }
  }

  throw new Error('응답이 중간에 끊겼습니다. 다시 시도해주세요.');
}
