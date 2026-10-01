---
name: create-pr
description: |
  현재 브랜치의 변경사항을 분석해 코드 리뷰를 받기 위한 GitHub PR을 생성한다.
  본문은 references/의 템플릿을 채워 작성하며, 이 프로젝트(react-component-generator)는 한국어 템플릿, 그 밖의 프로젝트는 영문 템플릿을 쓴다.
  "PR 만들어줘", "PR 올려줘", "풀 리퀘스트 생성", "리뷰 요청 올려줘", "create a PR", "open a pull request", "/create-pr" 같은 요청에 활성화한다.
  커밋만 요청할 때는 쓰지 않는다(commit 스킬 담당).
argument-hint: "[base 브랜치] [--draft]"
context: fork
---

# create-pr: 코드 리뷰용 PR 생성

현재 브랜치의 커밋을 분석하고, 리뷰어가 빠르게 맥락을 잡을 수 있는 본문을 템플릿으로 작성해 PR을 연다.

이 스킬은 `context: fork`로 서브 에이전트에서 실행된다. 사용자에게 중간 질문을 할 수 없으므로 판단이 필요한 지점은 아래 규칙대로 처리하고, 진행할 수 없으면 **멈추고 이유를 보고**한다. 마지막 응답이 메인 대화에 전달되는 유일한 결과다.

## 인자

- 첫 번째 위치 인자: base 브랜치. 없으면 저장소 기본 브랜치(`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`).
- `--draft`: Draft PR로 생성.

## 1. 저장소 지침 로드

저장소 루트의 `CLAUDE.md`, `AGENTS.md`를 읽는다. 브랜치 이름·PR 제목·검증 명령 규칙이 있으면 이 문서보다 우선한다.

## 2. 사전 점검

```bash
git status --short
git branch --show-current
git fetch origin <base>
git log --oneline origin/<base>..HEAD
gh pr view --json url,state 2>/dev/null   # 현재 브랜치에 열린 PR이 있는지
```

다음 경우에는 PR을 만들지 않고 멈춰서 보고한다.

| 상황 | 보고 내용 |
|---|---|
| 커밋되지 않은 변경이 있음 | 변경 파일 목록과 함께 "먼저 커밋하세요(`/commit`)" |
| `origin/<base>..HEAD` 커밋이 0개 | "PR로 올릴 커밋이 없습니다" |
| 현재 브랜치에 이미 열린 PR이 있음 | 기존 PR URL (새로 만들지 않는다) |
| `gh auth status` 실패 | 사용자가 `! gh auth login`을 실행하도록 안내 |

### 기본 브랜치 위에 있을 때

현재 브랜치가 base와 같으면(예: `main`에서 바로 작업) 새 브랜치를 만들어 옮긴다.

```bash
git switch -c <type>/<kebab-case-요약>   # 예: feat/prompt-length-limit
```

- `<type>`은 커밋 type(`feat`/`fix`/`refactor`/`chore`) 중 가장 비중이 큰 것.
- 로컬 `main`을 reset하지 않는다. 브랜치만 새로 만들고 푸시한다.

## 3. 변경 분석

```bash
git log --format='%h %s%n%b' origin/<base>..HEAD
git diff --stat origin/<base>...HEAD
git diff origin/<base>...HEAD
```

- 커밋 메시지만 보고 쓰지 않는다. diff를 읽고 **무엇이 왜 바뀌었는지**, 리뷰어가 특히 봐야 할 곳이 어디인지 파악한다.
- diff에 API 키·토큰처럼 보이는 문자열이나 `.env` 파일이 있으면 푸시하지 말고 멈춰서 보고한다.

## 4. 검증 실행

저장소 지침에 명시된 검증 명령을 실행한다. 이 프로젝트는 `bun run test`, `bun run lint`.
지침이 없으면 `package.json`의 `test`/`lint` 스크립트가 있을 때만 실행한다.

- 실패해도 PR은 생성하되, 본문 "테스트" 섹션에 실패 사실과 요약을 그대로 적고 Draft로 연다.
- 실행하지 않은 검증은 체크하지 않는다. 결과를 지어내지 않는다.

## 5. 템플릿 선택

| 조건 | 템플릿 |
|---|---|
| `origin` 리모트가 `devbrother2024/react-component-generator*` 저장소 | `references/template-ko.md` (한국어) |
| 그 밖의 모든 저장소 | `references/template-en.md` (영문) |

```bash
git remote get-url origin
```

- 한국어 템플릿을 쓸 프로젝트를 늘리려면 위 표의 첫 행에 저장소 패턴을 추가한다.
- 저장소에 `.github/pull_request_template.md`(또는 `.github/PULL_REQUEST_TEMPLATE/`)가 있으면 그 저장소의 템플릿이 우선한다. 위 표의 언어 규칙만 적용해 채운다.

## 6. 제목과 본문 작성

**제목**
- 한국어 템플릿: `<type>: <한국어 요약>` (커밋 컨벤션과 동일)
- 영문 템플릿: `<type>: <English summary>` — 소문자 시작, 마침표 없음, 70자 이내
- 커밋이 하나면 그 커밋 요약을 그대로 쓴다. 여러 개면 전체를 아우르는 요약을 새로 쓴다.

**본문**
- 선택한 템플릿 파일을 읽고 각 섹션을 채운다. 주석(`<!-- -->`)은 지운다.
- 해당 사항이 없는 섹션은 지우지 말고 "없음" / "None"으로 둔다.
- 관련 이슈는 브랜치 이름·커밋 메시지에서 `#123` 같은 번호를 찾았을 때만 적는다. 추측해 만들지 않는다.
- 시스템이 PR 본문 끝에 붙이라고 지정한 줄이 있으면 본문 맨 끝에 그대로 붙인다.

본문은 스크래치패드(없으면 `mktemp`)에 파일로 쓴 뒤 `--body-file`로 넘긴다. 셸 따옴표 문제를 피하기 위해서다.

## 7. 푸시와 PR 생성

```bash
git push -u origin HEAD
gh pr create --base <base> --title "<제목>" --body-file <본문 파일> [--draft]
```

- `--force` 푸시는 하지 않는다. 푸시가 거부되면 멈추고 보고한다.
- 리뷰어·라벨·assignee는 사용자가 인자로 지정했을 때만 붙인다.

## 8. 결과 보고

메인 대화로 돌아갈 마지막 응답에 다음을 담는다.

```
PR 생성 완료: <URL>
- 브랜치: <head> → <base> (새로 만든 브랜치면 표시)
- 제목: <제목>
- 템플릿: 한국어 | 영문
- 검증: bun run test ✅ / bun run lint ✅  (실패 시 ❌와 요약, Draft 여부)
```

멈춘 경우에는 어느 단계에서 왜 멈췄는지와 사용자가 할 일을 적는다.
