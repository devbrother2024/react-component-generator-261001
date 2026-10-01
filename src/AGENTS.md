# src/AGENTS.md

## Module Context

React 19 SPA. 프롬프트 입력, 제공자·키 설정, 생성 결과 카드(미리보기/코드)를 렌더링하며 `/api/*`를 통해서만 서버와 통신한다.

## Tech Stack & Constraints

- 상태 관리 라이브러리 없음. 생성 상태는 `useComponentGenerator` 훅 하나가 소유한다 (`src/hooks/useComponentGenerator.ts:13`).
- 스타일은 일반 CSS 클래스(`App.css`, `index.css`)와 BEM 유사 수식자(`key--small`, `switch-option--on`)를 쓴다. CSS-in-JS·Tailwind를 도입하지 않는다.
- `tsconfig.app.json`의 `verbatimModuleSyntax`로 타입은 `import type`으로 가져와야 한다 (`src/App.tsx:5`).

## Implementation Patterns

- 컴포넌트는 named export 함수 컴포넌트, Props는 `interface <Name>Props` (`src/components/ComponentCard.tsx:6`). `App`만 default export.
- 공유 타입은 `src/types/index.ts`에 둔다.
- 미리보기 재생은 `key`를 증가시켜 리마운트한다 (`src/components/ComponentCard.tsx:17`, `:33`).
- 접근성 속성(`role`, `aria-*`)을 기존 수준으로 유지한다. 테스트가 role/name으로 요소를 찾는다.

## Testing Strategy

- `bun run test src/` — jsdom 환경, `src/test/setup.ts`가 jest-dom 매처 등록과 cleanup을 담당한다.
- 테스트는 컴포넌트 옆에 `<Component>.test.tsx`로 둔다. `getByRole`과 `userEvent.setup()`로 사용자 관점에서 검증한다 (`src/components/PromptInput.test.tsx`).

## Local Golden Rules

- Hard Constraint: `LivePreview`의 `noInline`을 제거하지 마라 (`src/components/LivePreview.tsx:11`). 서버가 `render(...)` 호출을 붙여 보내는 계약과 짝이다.
- Hard Constraint: 테스트가 버튼 접근 가능 이름 `컴포넌트 생성`, `생성 중...`에 의존한다 (`src/components/PromptInput.test.tsx:9`, `:26`). 문구를 바꾸면 테스트도 함께 수정하라.
- Security Boundary: 사용자가 입력한 API 키는 컴포넌트 state에만 둔다 (`src/App.tsx:14`). localStorage 등에 저장하거나 콘솔에 출력하지 마라. 제공자를 바꾸면 키를 비운다 (`src/App.tsx:43`).
- Security Boundary: 키가 비어 있으면 요청 바디에서 `apiKey` 필드를 빼서 서버가 `.env` 키를 쓰게 한다 (`src/hooks/useComponentGenerator.ts:26`). 빈 문자열을 보내지 마라.
- Test Boundary: 테스트는 `PromptInput`에만 있다. `useComponentGenerator`, `App`의 키 검증 흐름을 바꿀 때는 테스트를 추가하라.
