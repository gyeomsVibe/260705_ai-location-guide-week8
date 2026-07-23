# [MIA 모드] 백신 원리 기반 결함 주입 및 시스템 내구성 치료 구현 계획

백신(Vaccine)이 약화된 모의 바이러스를 주입하여 인체 면역 체계를 강화하듯, 로컬 서비스(백엔드 REST API 및 프론트엔드 UI)에 **다양한 의도적 에러 및 경계 조건(Vaccine Fault Injections)**을 주입하여 숨어 있는 잠재 결함을 수면 위로 끌어올리고, 이를 완벽하게 치료(Fix & Hardening)합니다.

## User Review Required

> [!IMPORTANT]
> - **의도적 결함 주입 테스트**: 백엔드 API 파라미터 경계 실패, 공공 API 비정상 응답(XML/HTML 500 에러), 프론트엔드 XSS 스크립트 주입, 네트워크 끊김, 극단적 긴 텍스트 레이아웃 붕괴 등 5대 시나리오를 주입합니다.
> - **시스템 내구성 보강(Hardening)**: 예외 발생 시 서버 프로세스 다운(Crash) 방지, 프론트엔드 영구 로딩 멈춤 방지, XSS 완전 방어, 극단적 텍스트 레이아웃 보존을 원터치 치료합니다.

## Open Questions

- 테스트 주입 과정에서 작성되는 검증용 스크립트는 `backend/test/` 내 백신 검증 테스트로 추가하여 향후 회귀 방지(Regression Guard) 자산으로 보존합니다.

---

## MIA Stage & Decision Memo

- **Stage**: `실행` (Execution & Vaccine Hardening)
- **Decision Gate**: `Go` (백신 원리 기반 결함 주입 및 치료 시작)
- **5대 백신 시나리오 (Vaccine Injections)**:
  1. **V1. [백엔드] 입력 파라미터 무효값 주입**: `lat=invalid`, `lng=nan`, `radiusKm=999`, `limit=-10` 수신 시 서버 크래시 방지 및 400 정밀 에러 반환.
  2. **V2. [백엔드] 공공 API 비정상 응답 처리**: 공공데이터 API가 JSON 대신 HTML/XML 오류 페이지를 반환하거나 500을 낼 때 `SyntaxError` 파싱 에러 크래시 차단 (JSON 파싱 방어 조치).
  3. **V3. [프론트엔드] XSS 악성 스크립트 주입**: 카페 상호명/주소에 `<script>alert(1)</script>`, `<img src=x onerror=...>` 주입 시 커스텀 오버레이 및 카드에서 실행 차단.
  4. **V4. [프론트엔드] 레이스 조건 & 네트워크 끊김 주입**: 반경 칩 초고속 연속 클릭 및 통신 거부(Failed to fetch) 발생 시 영구 로딩 멈춤 해소.
  5. **V5. [프론트엔드] 극단적 초장문 텍스트 레이아웃 검증**: 100자 이상의 상호명/주소 유입 시 CSS 엘리프시스 및 자동 줄바꿈 보장.

---

## Proposed Changes

### Backend Service & Vaccine Tests

#### [MODIFY] [backend/services/semas-cafes.js](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/backend/services/semas-cafes.js)
- `lat`, `lng` 파라미터가 `NaN`이거나 수치가 아닌 경우 안전한 `400 BAD_REQUEST` 에러 반환.
- 공공 API 응답이 `application/json`이 아니거나 비정상 HTML/XML 페이지로 들어올 경우 `JSON.parse` 예외를 포착하여 서버 다운 방지 및 `502 PUBLIC_API_ERROR`로 전환.

#### [NEW] [backend/test/vaccine-fault-injection.test.js](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/backend/test/vaccine-fault-injection.test.js)
- 5대 의도적 실패 주입 및 치료 상태 자동 검증 단위 테스트 모듈 추가.

### Frontend UI & Overlay Hardening

#### [MODIFY] [frontend/public/index.html](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/frontend/public/index.html)
- `openOverlay` 커스텀 오버레이 윈도우 생성 시 `innerHTML` 대신 DOM 생성 API(`document.createElement`, `textContent`)로 전면 교체하여 XSS 취약점 완전 제거.
- `fetchCafes` catch 블록에서 네트워크 끊김(`TypeError: Failed to fetch`) 발생 시 로딩 레이어를 즉시 해제하고 복구 안내 표출.
- `.rc-title`, `.rc-address`, `.co-title`, `.co-desc` CSS에 `word-break: break-word`, `overflow-wrap: anywhere` 방어막 추가.

---

## Verification Plan

### Automated Tests & Vaccine Execution
1. `node --test backend/test/vaccine-fault-injection.test.js` (백신 주입 테스트 실행 및 치료 확인)
2. `node --test backend/test/semas-cafes.test.js` (기존 단위 테스트 통과 유지 확인)
3. `node -e "... vm.Script ..."` (프론트엔드 자바스크립트 문법 정밀 검증)

### Manual Verification
1. 브라우저 개발자 도구(F12) 콘솔 및 네트워크 탭에서 무효 파라미터 및 XSS 페이로드 주입 후 화면 안정성 확인.
