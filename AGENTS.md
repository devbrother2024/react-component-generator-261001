# AGENTS.md

## Operational Commands

- 패키지 매니저는 `bun` 고정. npm/yarn/pnpm 사용 금지 (`bun.lock`만 존재).
- 개발 서버: `bun run dev` (API 서버 3002 + Vite 5173 동시 실행)
- API 서버만: `bun run server`
- 테스트: `bun run test` (Vitest). `bun test`는 Bun 내장 러너를 실행하므로 사용 금지 — jsdom 환경과 `src/test/setup.ts`가 적용되지 않는다.
- 단일 테스트: `bun run test server/generator.test.ts`
- 타입체크 + 빌드: `bun run build`
- 린트: `bun run lint`
- 작업 완료 전 `bun run test`와 `bun run lint`를 통과시킨다.

## Golden Rules

### Immutable

- API 키 값을 클라이언트 응답에 절대 포함하지 마라. `/api/config`는 키 존재 여부(boolean)만 반환한다 (`server/index.ts:150-153`).
- API 키를 코드에 하드코딩하지 마라. 서버 키는 `.env`의 `ANTHROPIC_API_KEY`/`GOOGLE_API_KEY`에서만 읽는다 (`server/index.ts:59-62`). `.env`는 gitignore 대상이며 커밋 금지.
- 프론트엔드는 AI 제공자 API를 직접 호출하지 않는다. 항상 상대 경로 `/api/*`로 Bun 서버를 거친다 (`src/hooks/useComponentGenerator.ts:23`, `src/App.tsx:25`).

### Hard Constraints

- 생성 코드는 react-live `noInline` 모드에서 실행된다 (`src/components/LivePreview.tsx:11`). 마지막에 `render(<Comp />)` 호출이 없으면 미리보기가 비어 있다.
- 생성 코드에는 import 문과 TypeScript 문법이 없어야 한다. react-live는 브라우저에서 JS로만 평가한다 (`server/index.ts:13-14`, `server/index.ts:23` SYSTEM_PROMPT 규칙).
- API 서버 포트 3002는 Vite 프록시 대상과 짝을 이룬다. 한쪽만 바꾸지 마라 (`server/index.ts:139`, `vite.config.ts:11`).
- `server/`는 어떤 tsconfig에도 포함되지 않아 `bun run build`가 타입 검사하지 않는다 (`tsconfig.app.json` include `src`, `tsconfig.node.json` include `vite.config.ts`). 서버 수정 후 타입 오류를 빌드로 잡을 수 있다고 가정하지 마라.

### Double Defense

- render 호출 보장: SYSTEM_PROMPT 지시(`server/index.ts:15`)와 `ensureRenderCall` 후처리(`server/generator.ts:16`)가 함께 막는다. 프롬프트를 고쳤다고 후처리를 제거하지 마라.
- 코드펜스 제거: SYSTEM_PROMPT의 "no markdown fences"(`server/index.ts:18`)와 `stripCodeFences`(`server/generator.ts:5`)가 함께 막는다.
- API 키 누락: 클라이언트 사전 차단(`src/App.tsx:34`)과 서버 400 응답(`server/index.ts:169`)이 모두 있다. 둘 다 유지한다.

### Do's & Don'ts

- Do: 제공자 응답 정규화처럼 테스트할 로직은 부수효과 없는 모듈로 분리하고 테스트를 붙인다 (선례: `server/generator.ts:1-2`, `server/fallback.ts`).
- Do: 사용자에게 보이는 에러·UI 문구는 한국어로 작성한다 (`server/index.ts:196`, `src/App.tsx`).
- Don't: 새 제공자 타입을 한쪽에만 추가하지 마라. `Provider`가 서버(`server/index.ts:57`)와 클라이언트(`src/types/index.ts:1`)에 따로 정의되어 있다.

## Project Context

- 자연어 프롬프트로 React 컴포넌트를 생성하고 실시간 미리보기와 코드를 보여주는 도구.
- Stack: React 19, TypeScript, Vite, Bun, react-live, Vitest, Testing Library, ESLint

## Standards & References

- 설치·실행 방법과 기능 소개는 `README.md` 참고.
- 코드 주석과 테스트 설명(`it(...)`)은 한국어로 작성한다 (기존 테스트 파일 참고).
- 커밋 메시지: `<type>: <한국어 요약>`, type은 `feat` / `fix` / `refactor` / `chore`. 논리적 단위로 나눠 커밋한다 (`.claude/skills/commit/SKILL.md`).
- Maintenance Policy: 이 문서의 규칙·근거 라인이 실제 코드와 어긋나면 작업 중 발견한 즉시 업데이트를 제안하라.

## Context Map

- **[API 서버 / AI 제공자 연동 (Bun)](./server/AGENTS.md)** — 프롬프트, 모델, 응답 정규화, 에러 처리 수정 시.
- **[프론트엔드 UI (React)](./src/AGENTS.md)** — 화면, 컴포넌트, 미리보기, 클라이언트 테스트 수정 시.
