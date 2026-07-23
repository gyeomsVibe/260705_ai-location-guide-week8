# [MIA 모드] 9주차 프론트엔드 병렬작업 Handoff 계약 준수 UI/어댑터 구현 계획

GitHub `handoff/active/frontend-week9` 계약과 `ANTIGRAVITY_PROMPT.md`지침을 전적으로 수용하여, 백엔드·환경변수·Render 설정을 일절 건드리지 않고 `frontend/public/index.html`의 프론트엔드 UI/UX 최적화 및 공공 카페 API 어댑터 연동을 구현합니다.

## User Review Required

> [!IMPORTANT]
> - **작업 소유권 제한**: `frontend/public/index.html` 파일 및 handoff 문서만 수정합니다. `backend/**`, `render.yaml`, `package.json`, `.env`, `.gitignore`는 수정하지 않습니다.
> - **안전한 백엔드 계약 연결**: 현재 백엔드의 `/api/cafes` 라우트가 404 상태이므로, 백엔드 담당자의 신호 전까지 자동 초기 호출을 차단하고 기존 카카오 키워드 검색의 기본 동작을 완벽하게 보존합니다.
> - **XSS 방지 & 접근성**: 외부 공공 데이터 렌더링 시 `innerHTML` 대신 `textContent`와 DOM API만 사용하며, 반경 선택 칩에 `aria-pressed`, 상태 메시지 영역에 `aria-live="polite"`를 적용합니다.

## Open Questions

- 현 시점에서 백엔드 `/api/cafes` 연동 준비가 완료되기 전까지 공공 카페 UI 어댑터를 독립된 탭/모드 토글로 연동 상태를 테스트할 수 있게 프론트엔드 컴포넌트로 깔끔하게 통합합니다.

---

## MIA Stage & Decision Memo

- **Stage**: `실행` (Execution)
- **Decision Gate**: `Go` (프론트엔드 병렬 작업 진행)
- **주요 목표**:
  1. `내 주변 카페 찾기` 섹션 및 `1km` / `3km` / `5km` 반경 선택 칩 UI 구현 (기본값 `1km`, `aria-pressed`)
  2. 로딩 / 빈 결과 / 데이터 오류 / 위치 거부 안내 컴포넌트 추가 (`aria-live="polite"`)
  3. `fetchCafes({ lat, lng, radiusKm, query })` 백엔드 어댑터 구축 (`AbortController` & 세대 번호 기반 취소 로직)
  4. 공공 카페 항목 안전한 DOM/마커/선택 동기화 렌더링 어댑터 (`renderCafeResults(items)`) 구현
  5. 지도 중심 반경 원(`kakao.maps.Circle`) 시각화 및 마커 동기화

---

## Proposed Changes

### Frontend UI & Adapters

#### [MODIFY] [frontend/public/index.html](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/frontend/public/index.html)

1. **내 주변 카페 찾기 & 반경 칩 UI 추가**:
   - 기존 실시간 검색 패널 상단에 `공공 카페 찾기` 토글/안내 및 `1km | 3km | 5km` 반경 선택 칩 컴포넌트 추가.
   - 칩 클릭 시 활성 상태 CSS 스타일 변경 및 `aria-pressed="true"` 바인딩.
   - 접근성을 고려한 `aria-live="polite"` 알림 패널(로딩 중, 결과 없음, 위치 권한 거부, 데이터 오류) 구현.

2. **안전한 공공 카페 렌더링 어댑터 (`renderCafeResults`)**:
   - `name`, `category`, `address`, `distanceKm` 데이터를 DOM 생성 API(`document.createElement`, `textContent`)로만 삽입하여 XSS 위험 완전 제거.
   - 카드 클릭 및 마커 클릭 시 동일한 선택 액티브 상태 공유.
   - 마커 및 커스텀 오버레이 cleanup 함수 분리.

3. **반경 시각화 및 위치 갱신 (`updateCafeRadiusCircle`)**:
   - 선택 지점 위도·경도 중심으로 카카오맵 원(`kakao.maps.Circle`) 렌더링 및 갱신.
   - 칩 변경 시 원, 마커, 리스트가 동일 세대 요청으로 동시 업데이트되도록 제어.

4. **API 어댑터 (`fetchCafes`) & 안정성 확보**:
   - `AbortController` 및 요청 세대 번호(`requestGeneration`)로 이전 늦은 응답 취소.
   - API가 아직 404 응답을 내는 기간 동안 기존 카카오 `keywordSearch()` 검색이 차질없이 동작하도록 세이프가드 유지.

---

## Verification Plan

### Automated Tests & Checks
1. `node --check frontend/public/index.html` (인라인 JS 문법 검증)
2. `git diff --name-only` 실행으로 `frontend/public/index.html` 이외의 금지 파일(`backend/**`, `.env`, `package.json` 등)이 수정되지 않았는지 엄격 확인.

### Manual Verification
1. 로컬 백엔드 서버 구동 (`node backend/server.js`) 후 웹 브라우저에서 지도, 위치 선택, 칩 클릭 UI 동작 및 마이크로 인터랙션 확인.
2. 카드 및 마커 클릭 시의 상태 공유 동작 검증.
