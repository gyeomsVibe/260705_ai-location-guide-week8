# Antigravity 병렬 프론트엔드 구현 지시문 — 혜택 탐색·데이터 연결 상태

아래 코드 블록 전체를 Antigravity의 새 작업에 그대로 전달한다.

```text
1. TASK — 작업 목표

현재 카카오맵 기반 Week 8-9 프로젝트에 다음 프론트엔드 기능을 추가하세요.

- 행정안전부 공공서비스 혜택 검색·목록 UI
- “모르는 걸 모르는 사용자”를 위한 상황별 빠른 탐색 UI
- 공공데이터 연결 상태를 비밀값 없이 보여주는 상태 패널

이번 작업은 Codex가 백엔드의 `/api/benefits`, `/api/data-sources`를 구현하는 동안 수행하는 병렬 프론트엔드 작업입니다.


2. EXPECTED OUTCOME — 결과물과 성공 기준

수정 결과는 `frontend/public/index.html` 하나에 통합합니다.

완료 시 사용자는 다음을 할 수 있어야 합니다.

- 기존 카카오맵·주변 장소·공공 카페 기능을 그대로 사용할 수 있다.
- `주변 장소`와 `정부 혜택` 화면을 명확히 전환할 수 있다.
- 혜택 검색어를 입력하고 Enter 또는 검색 버튼으로 조회할 수 있다.
- `1인 창조기업`, `소상공인`, `예비창업`, `신규 창업` 빠른 탐색 버튼을 사용할 수 있다.
- 혜택의 이름, 요약, 지원대상, 지원내용, 신청기한, 신청방법, 담당기관, 문의처를 읽을 수 있다.
- 로딩·결과 없음·백엔드 준비 중·인증키 미설정·외부 API 오류 상태를 이해할 수 있다.
- 설정된 인증키의 실제 값은 전혀 보이지 않고 데이터 소스별 설정·구현·검증 상태만 볼 수 있다.


3. REQUIRED SKILLS — 적용할 역량

- frontend-design: 기존 시각 언어와 어울리는 반응형 UI 구현
- web-design-guidelines: 접근성·키보드·모바일·상태 메시지 점검
- error-path-analysis: 404, 503, 502, 네트워크 단절, 빈 결과 UX 점검


4. REQUIRED TOOLS — 사용할 수 있는 도구

- 파일 읽기와 검색
- `frontend/public/index.html` 수정
- 인라인 JavaScript 문법 검증
- 로컬 서버를 이용한 브라우저 확인
- `git diff`, `git status`를 이용한 변경 범위 확인

패키지 설치, Git 커밋, Git push, Render 배포, 외부 계정 설정 변경은 하지 마세요.


5. MUST DO — 반드시 지킬 요구사항

5-1. 시작 전 기준 확인

- 저장소 루트의 `AGENTS.md`가 있으면 먼저 읽으세요.
- `handoff/active/frontend-week9/README.md`를 참고하되, 그 문서의 “백엔드가 아직 404”라는 설명은 과거 상태이므로 이번 지시문을 우선하세요.
- 기준 브랜치는 `main`, 기준 커밋은 `3d08373`입니다.
- 작업 시작 전 `git status --short`를 확인하고 다른 도구의 변경을 보존하세요.
- Codex는 `backend/**`만 작업하며 Antigravity는 `frontend/public/index.html`만 작업합니다.

5-2. 기존 기능 보존

- 기존 카카오맵 초기화, 지역 선택, GPS, 카카오 키워드 검색을 삭제하지 마세요.
- 기존 `/api/cafes`, `fetchCafes`, 1km·3km·5km 칩, 카페 마커·목록 동기화를 깨뜨리지 마세요.
- 기존 라이트·다크 모드와 모바일 레이아웃을 유지하세요.
- 기존 공통 결과 목록을 무리하게 재사용해 장소 결과와 혜택 결과가 섞이지 않게 하세요.

5-3. 사용자 정보구조

- 사용자에게 API 제공기관 이름부터 보여주지 마세요.
- 상단 또는 사이드바에 최소 두 개의 명확한 모드 전환 버튼을 만드세요.
  - `내 주변 찾기`
  - `정부 혜택 찾기`
- 혜택 화면의 첫 문장은 쉬운 언어로 작성하세요.
  - 예: `상황을 선택하거나 궁금한 내용을 검색해 보세요.`
- 상황별 빠른 탐색은 실제 `button`으로 만드세요.
  - `1인 창조기업`
  - `소상공인`
  - `예비창업`
  - `신규 창업`
- 빠른 탐색 버튼은 검색어를 채우고 즉시 검색하거나, 사용자가 어떤 검색이 실행되는지 명확히 보여준 뒤 검색하세요.

5-4. 백엔드 API 계약

다음 same-origin API만 호출하세요. 공공데이터포털 API와 인증키를 브라우저에서 직접 호출하면 안 됩니다.

혜택 목록:

GET /api/benefits?limit=5&q={선택}&organization={선택}&userType={선택}&serviceField={선택}&page={선택}

성공 응답:

{
  "items": [
    {
      "id": "서비스ID",
      "name": "서비스명",
      "summary": "서비스 목적 요약",
      "supportType": "지원유형",
      "target": "지원대상",
      "selectionCriteria": "선정기준",
      "support": "지원내용",
      "applicationMethod": "신청방법",
      "applicationDeadline": "신청기한",
      "detailUrl": "공식 상세 URL",
      "agency": "소관기관명",
      "agencyType": "소관기관유형",
      "department": "부서명",
      "userTypes": "사용자구분",
      "serviceField": "서비스분야",
      "receptionAgency": "접수기관",
      "phone": "전화문의",
      "registeredAt": "등록일시",
      "updatedAt": "수정일시"
    }
  ],
  "count": 1,
  "page": 1,
  "totalCount": 1
}

오류 응답:

{
  "error": {
    "code": "BENEFIT_API_ERROR",
    "message": "공공서비스 혜택을 불러오지 못했습니다."
  }
}

데이터 소스 상태:

GET /api/data-sources

성공 응답:

{
  "items": [
    {
      "id": "moisBenefits",
      "label": "행정안전부 공공서비스(혜택)",
      "configured": true,
      "implementationStatus": "available",
      "verificationStatus": "not_tested",
      "lastCheckedAt": null,
      "lastSuccessAt": null,
      "lastErrorCode": null,
      "message": "인증키가 설정됐으며 첫 API 호출을 기다리고 있습니다."
    }
  ]
}

5-5. 혜택 API 어댑터

- `fetchBenefits`처럼 역할이 명확한 별도 함수를 만드세요.
- `AbortController`와 요청 세대 번호를 사용해 이전 검색을 취소하고 늦게 도착한 응답을 무시하세요.
- 검색어는 `URLSearchParams`로 인코딩하세요.
- 응답의 `items`가 배열인지 확인하세요.
- `response.ok`가 아니면 서버의 안전한 `error.message`를 사용하되 없으면 기본 한국어 안내를 표시하세요.
- 404이면 `백엔드 혜택 기능을 준비하고 있습니다.`라고 표시하세요.
- 503이면 `혜택 API 인증키 설정을 확인해 주세요.`라고 표시하세요.
- 502 또는 네트워크 오류이면 `혜택 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.`라고 표시하세요.
- 오류 세부정보나 응답 원문을 사용자 화면에 그대로 노출하지 마세요.

5-6. 안전한 렌더링

- 외부 API 데이터는 `innerHTML` 문자열에 끼워 넣지 마세요.
- `createElement`, `textContent`, `setAttribute`로 렌더링하세요.
- `detailUrl`은 `https:` 또는 `http:` URL로 정상 파싱될 때만 링크로 만드세요.
- 전화번호는 표시하되 임의의 HTML이나 JavaScript URL이 실행되지 않게 하세요.
- 값이 없는 필드는 빈 라벨을 남기지 말고 해당 행 자체를 생략하세요.

5-7. 혜택 카드 UX

- 기본 카드에는 `name`, `summary`, `target`, `support`, `applicationDeadline`, `agency`를 우선 표시하세요.
- 세부 항목은 펼침/접기 방식으로 제공해 초보자의 인지부하를 줄이세요.
- `왜 보여줬나요?` 영역에는 검색어 또는 선택한 빠른 탐색 조건과 일치해 표시됐다는 설명만 하세요.
- 실제 API가 자격을 확정하지 않으므로 `신청 가능`, `100% 대상`이라고 단정하지 마세요.
- 대신 `지원 조건을 확인해 주세요.` 또는 `조건 일치 가능성이 있는 혜택입니다.`라고 표시하세요.
- 공식 링크는 새 탭으로 열고 `rel="noopener noreferrer"`를 적용하세요.

5-8. 데이터 연결 상태 패널

- 일반 사용자 화면을 방해하지 않는 `데이터 연결 상태` 접이식 패널을 제공하세요.
- `configured`, `implementationStatus`, `verificationStatus`, `message`, 최근 확인 시각만 표시하세요.
- 환경변수 이름, 인증키 입력창, 인증키 일부 문자열도 표시하지 마세요.
- 상태 라벨을 쉬운 한국어로 변환하세요.
  - configured=true: `키 설정됨`
  - configured=false: `키 미설정`
  - available: `사용 가능`
  - planned: `연결 준비 중`
  - success: `연결 확인 완료`
  - failed: `연결 확인 실패`
  - not_tested: `아직 확인 전`

5-9. 접근성과 모바일

- 모드 전환 버튼과 빠른 탐색 버튼은 키보드로 조작 가능해야 합니다.
- 선택 상태는 `aria-pressed` 또는 올바른 탭 패턴으로 표현하세요.
- 검색 입력에는 보이는 `label` 또는 `aria-label`을 제공하세요.
- 결과 수·로딩·오류 메시지는 `aria-live="polite"`로 알리세요.
- 로딩 중에는 검색 버튼의 중복 실행을 막되 취소 후 다시 사용할 수 있어야 합니다.
- 모바일에서 검색 입력, 빠른 탐색 버튼, 상태 메시지가 가로 화면 밖으로 넘치지 않게 하세요.
- `prefers-reduced-motion` 사용자를 위해 새 애니메이션은 줄이거나 끌 수 있게 하세요.


6. MUST NOT DO — 금지 사항

- `backend/**`를 수정하지 마세요.
- `.env`, `.env.example`, `.gitignore`, `render.yaml`, `package*.json`을 수정하지 마세요.
- 패키지를 설치하지 마세요.
- 공공데이터 인증키를 코드, 로그, 화면, 문서에 넣지 마세요.
- `api.odcloud.kr`, `apis.data.go.kr`를 프론트엔드에서 직접 호출하지 마세요.
- 기존 카페·카카오 검색 로직을 삭제하거나 이름만 바꿔 숨기지 마세요.
- 의료 API가 아직 구현되지 않았는데 `현재 영업 중`, `공휴일 운영 확정` 같은 의료 운영 상태를 만들지 마세요.
- Git 커밋, push, Render 배포를 하지 마세요.
- 다른 도구가 만든 변경을 되돌리거나 전체 파일을 과거 버전으로 덮어쓰지 마세요.


7. CONTEXT — 저장소와 협업 조건

- 저장소: `gyeomsVibe/260705_ai-location-guide-week8-9`
- 로컬 프로젝트: `D:\D_Workspace_NB\-google-workspace\-antigravity-workspace\260705_ai-location-guide-week8-9`
- 프론트엔드 소유 파일: `frontend/public/index.html`
- 백엔드 소유자: Codex
- 프론트엔드 소유자: Antigravity
- 현재 백엔드에서 이미 사용 가능한 API: `/api/cafes`
- Codex가 병렬 구현할 API: `/api/benefits`, `/api/data-sources`
- 백엔드 준비 전 해당 API가 404여도 프론트엔드는 기존 기능을 유지하고 준비 중 상태를 보여야 합니다.

완료 검증:

1. 인라인 JavaScript를 추출하거나 적절한 방식으로 `node --check`를 실행하세요.
2. 로컬에서 기존 지도, 위치 선택, 키워드 검색, 카페 반경 검색을 회귀 확인하세요.
3. 혜택 API의 성공·빈 배열·404·503·502·네트워크 오류를 각각 확인하세요.
4. 혜택 이름에 `<img src=x onerror=alert(1)>`가 들어와도 실행되지 않는지 확인하세요.
5. 키보드만으로 모드 전환, 빠른 탐색, 검색, 카드 펼침이 가능한지 확인하세요.
6. 모바일 폭 360px에서 가로 스크롤과 잘림이 없는지 확인하세요.
7. `git diff --name-only` 결과가 `frontend/public/index.html`만 포함하는지 확인하세요.

완료 보고 형식:

1. 변경한 파일
2. 구현한 기능
3. 검증 명령과 실제 결과
4. 백엔드 준비 전이라 검증하지 못한 항목
5. 남은 위험과 Codex에게 전달할 API 계약 문제

검증 실패를 숨기지 말고, 실패한 명령과 원인을 그대로 보고하세요.
```

