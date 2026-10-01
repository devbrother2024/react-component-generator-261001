# server/AGENTS.md

## Module Context

Bun 런타임에서 동작하는 AI 제공자 프록시. 프롬프트를 Anthropic/Gemini로 보내고 응답을 react-live용 코드로 정규화해 반환한다.

## Tech Stack & Constraints

- HTTP는 `Bun.serve`, 외부 호출은 전역 `fetch`만 사용한다. 제공자 SDK나 HTTP 프레임워크를 추가하지 않는다 (`server/index.ts:69`, `server/index.ts:101`, `server/index.ts:138`).
- `index.ts`는 import 시점에 서버를 띄운다. 테스트에서 `index.ts`를 import하지 마라.

## Implementation Patterns

- 테스트 가능한 로직은 부수효과 없는 별도 파일로 분리한다: 응답 정규화는 `generator.ts`, 모델 폴백은 `fallback.ts`. `index.ts`에는 라우팅과 제공자 호출만 둔다.
- 응답 처리 순서는 `ensureRenderCall(stripCodeFences(text))` 고정 (`server/index.ts:188`).
- 모든 응답에 `CORS_HEADERS`를 붙인다 (`server/index.ts:51`).

## Testing Strategy

- `bun run test server/` — Vitest로 실행된다 (`vite.config.ts:20`의 include에 `server/**/*.test.ts` 포함).
- 테스트는 같은 폴더에 `<module>.test.ts`로 둔다. 외부 API는 호출하지 않고 `vi.fn`으로 대체한다 (`server/fallback.test.ts`).

## Local Golden Rules

- Asymmetry: Gemini만 모델 폴백(`server/index.ts:134-136`)과 `MAX_TOKENS` 잘림 감지(`server/index.ts:123`)가 있고, Anthropic 경로에는 없다. 출력 한도도 다르다 (Anthropic 4096 `:78`, Gemini 8192 `:107`). 한쪽을 고칠 때 다른 쪽도 같은 처리가 필요한지 확인하라.
- Hard Constraint: 제공자 호출 함수는 실패 시 HTTP 상태 코드를 메시지에 포함해 throw해야 한다 (`Claude API error: ${status}` 형식, `server/index.ts:85`, `:112`). 에러 매핑이 `message.includes('503')`/`'429'` 문자열 검사에 의존한다 (`server/index.ts:194`, `:201`).
- Hard Constraint: `GOOGLE_MODELS` 배열 순서가 폴백 우선순위다 (`server/index.ts:4-5`). 빈 배열이면 `withModelFallback`이 즉시 throw한다 (`server/fallback.ts:7`).
- Security Boundary: 클라이언트가 보낸 키가 `.env` 키보다 우선한다 (`server/index.ts:65`). 이 우선순위를 바꾸면 UI 안내 문구(`src/App.tsx:134`)와 어긋난다.
- Security Boundary: Gemini 키는 URL 쿼리에 들어간다 (`server/index.ts:99`). 요청 URL이나 키를 로그·에러 메시지에 남기지 마라.
- Test Boundary: `index.ts`는 테스트가 없다. 정규화·폴백 로직을 `index.ts`에 직접 추가하지 말고 순수 모듈로 빼서 테스트하라.
- Don't: SYSTEM_PROMPT의 "no import", "no TypeScript syntax", "render() 호출" 규칙(`server/index.ts:13-23`)을 제거하지 마라. react-live 실행이 깨진다.
