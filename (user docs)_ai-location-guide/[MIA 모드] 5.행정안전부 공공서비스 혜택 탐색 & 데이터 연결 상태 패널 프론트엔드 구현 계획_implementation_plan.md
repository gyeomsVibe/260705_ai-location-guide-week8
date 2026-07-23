# [MIA 모드] 행정안전부 공공서비스 혜택 탐색 & 데이터 연결 상태 패널 프론트엔드 구현 계획

`ANTIGRAVITY_BENEFITS_PARALLEL_PROMPT.md` 지시문과 저장소 계약을 전적으로 준수하여, 백엔드(`backend/**`), `.env`, `render.yaml`, `package*.json`을 일절 건드리지 않고 오직 `frontend/public/index.html` 내에 **행정안전부 공공서비스 혜택 탐색 UI, 상황별 빠른 탐색 버튼, 데이터 연결 상태 패널, 안전한 API 어댑터**를 완벽하게 구현합니다.

## User Review Required

> [!IMPORTANT]
> - **소유권 및 파일 변경 경계**: 오직 `frontend/public/index.html` 파일만 수정하며, `backend/**`, `.env`, `render.yaml`, `package*.json` 등은 절대 변경하지 않습니다.
> - **기존 기능 100% 보존**: 기존 카카오맵, 17개 시도 거점, Geolocation GPS, 카카오 2km 키워드 검색, 공공 카페 `/api/cafes` 1km/3km/5km 반경 칩 및 마커/원 기능을 완전 보존합니다.
> - **XSS 완전 차단 & 안전성**: 혜택 데이터 및 연결 상태 정보 렌더링 시 `innerHTML` 대신 `textContent`와 DOM 생성 API만 사용하며, 비밀값/인증키를 화면에 절대 노출하지 않습니다.

## Open Questions

- Codex가 백엔드 REST API(`/api/benefits`, `/api/data-sources`)를 구현하는 동안, 프론트엔드는 API가 404 상태여도 화면이 멈추지 않고 `"백엔드 혜택 기능을 준비하고 있습니다."` 안내와 함께 UI를 원활히 탐색할 수 있도록 우아한 폴백(Graceful Fallback)을 유지합니다.

---

## MIA Stage & Decision Memo

- **Stage**: `기획·검토` (Planning & Review)
- **Decision Gate**: `Go` (병렬 프론트엔드 구현 수립)
- **핵심 구현 목표**:
  1. **모드 전환 UI**: `📍 내 주변 찾기`와 `🎁 정부 혜택 찾기` 명확한 화면 전환 탭 제공
  2. **정부 혜택 찾기 & 빠른 탐색 칩**:
     - 쉬운 첫 문장: `"상황을 선택하거나 궁금한 내용을 검색해 보세요."`
     - 상황별 빠른 탐색 칩 4종 (`1인 창조기업`, `소상공인`, `예비창업`, `신규 창업`)
     - 혜택 검색어 입력 바 및 실행
  3. **REST API 어댑터 (`fetchBenefits`, `fetchDataSources`)**:
     - `GET /api/benefits?limit=5&q={q}&organization={org}&userType={type}`
     - `GET /api/data-sources`
     - `AbortController` 및 요청 세대 번호로 중복/늦은 응답 무시
     - 404(준비 중), 503(키 미설정), 502/네트워크 오류 친절한 사용자 문구 안내 (`aria-live="polite"`)
  4. **혜택 카드 UX & 상세 펼침/접기 (Accordion)**:
     - `name`, `summary`, `target`, `support`, `applicationDeadline`, `agency` 기본 노출
     - 클릭 시 상세 항목 접기/펼침
     - `왜 보여줬나요?` 안내 및 `조건 일치 가능성이 있는 혜택입니다.` 권장 문구 사용
     - 공식 상세 URL은 새 탭 (`target="_blank"`, `rel="noopener noreferrer"`)
  5. **데이터 연결 상태 패널 (Data Sources Status Panel)**:
     - 하단/사이드바에 접이식 `데이터 연결 상태` 패널 배치
     - `configured` (키 설정됨/키 미설정), `implementationStatus` (사용 가능/연결 준비 중), `verificationStatus` (연결 확인 완료/연결 확인 실패/아직 확인 전), `message`, 시각 안내
     - 인증키 실제 값 및 환경변수 명칭 100% 노출 금지

---

## Proposed Changes

### Frontend Component & Logic

#### [MODIFY] [frontend/public/index.html](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/frontend/public/index.html)

1. **상단 모드 전환 탭 (Header Nav)**:
   - `내 주변 찾기` (기존 카카오맵 & 카페 UI) / `정부 혜택 찾기` (신규 혜택 UI) 전환 탭 추가.
   - `aria-selected` 및 `role="tab"` 바인딩으로 접근성 강화.

2. **정부 혜택 섹션 (Benefits Section)**:
   - 혜택 전용 검색 바, 빠른 탐색 버튼 4종(`1인 창조기업`, `소상공인`, `예비창업`, `신규 창업`).
   - 혜택 결과 카드를 삽입할 리스트 및 `aria-live="polite"` 디스플레이.

3. **데이터 연결 상태 접이식 패널 (Data Sources Panel)**:
   - 사이드바 하단 또는 메인 패널에 `🔌 공공데이터 연결 상태` 접이식 영역 추가.

4. **자바스크립트 REST API 어댑터 & 안전 DOM 렌더링**:
   - `fetchBenefits({ query, userType, page })` 및 `fetchDataSources()` 작성.
   - `renderBenefitResults(items)`: `textContent` 및 DOM API 전용 사용으로 XSS 방지.
   - `renderDataSources(items)`: 쉬운 한국어 라벨 변환 및 비밀 정보 차단.

---

## Verification Plan

### Automated Checks
1. `node -e "... vm.Script ..."` (인라인 JS 문법 정밀 분석)
2. `git diff --name-only` 실행으로 `frontend/public/index.html` 외에 백엔드/패키지 파일 변경이 전혀 없는지 검증.

### Manual Verification
1. `📍 내 주변 찾기` ↔ `🎁 정부 혜택 찾기` 모드 전환 클릭 및 기존 지도/GPS/공공 카페 기능 정상 동작 확인.
2. 빠른 탐색 칩(`1인 창조기업`, `소상공인` 등) 클릭 시 검색어 입력 및 `fetchBenefits` 통신 시도 확인.
3. 데이터 연결 상태 패널 클릭 시 쉬운 한국어 상태 라벨 표출 및 키 값 은폐 확인.
4. 모바일 360px 환경에서 가로 스크롤 및 짤림 현상 없음 확인.
