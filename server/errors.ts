// 제공자 에러 메시지를 클라이언트에 보낼 상태 코드와 문구로 바꾼다.
// 제공자 호출 함수가 메시지에 HTTP 상태 코드를 넣어 던지는 계약에 의존한다.
export function toClientError(message: string): { status: number; error: string } {
  if (message.includes('503')) {
    return { status: 503, error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' };
  }
  if (message.includes('429')) {
    return { status: 429, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { status: 500, error: message };
}
