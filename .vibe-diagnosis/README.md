# 🩺 Vibe Diagnosis 자가진단 가이드

이 프로젝트는 자가진단 프레임워크(`vibe-diagnosis`)를 탑재하여, 서비스 코드의 보안 안전성 및 고품질 UI/UX 요소를 주기적으로 점검하고 무결성을 유지할 수 있도록 구성되어 있습니다.

---

## 📋 진단 항목 구성

현재 설계된 맞춤형 진단 도구는 프로젝트 루트의 `.vibe-diagnosis/diagnostics/` 디렉토리에 수록되어 있습니다.

### 1. 🖥️ 시스템 영역 (`project-diagnostic`)
- **대상**: [project.diag.js](./diagnostics/project.diag.js)
- **검증 내용**:
  - `server.js`의 작동 무결성 및 Express 프레임워크 사용 유무
  - 보안을 위한 `x-powered-by` Express 버전 정보 헤더 차단 여부
  - 환경변수 기반 동적 포트 바인딩(`process.env.PORT`) 처리 여부
  - `ZONES_DATA` 객체에 수록된 전국 17개 거점의 세부 위치가 누락 없이 **정확히 89개**로 온전히 보존되어 있는지 정합성 검증

### 2. 🎨 UI/UX 품질 영역 (`ui-ux-diagnostic`)
- **대상**: [ui-ux.diag.js](./diagnostics/ui-ux.diag.js)
- **검증 내용**:
  - 프리미엄 사용자 경험을 위한 커스텀 웹킷 스크롤바(`::-webkit-scrollbar`) 적용 상태 검사
  - 웹 접근성을 확보하기 위한 HTML `lang` 선언 여부
  - 테마 제어를 위한 CSS 변수(:root 및 속성) 구축 상태 검사
  - 시스템 테마와 연동되는 `@media (prefers-color-scheme: dark)` 다크모드 미디어 쿼리 구축 여부
  - 사용자 동작 피드백을 위한 부드러운 애니메이션(`transition:`) 탑재 검사

---

## 🚀 진단 실행 명령어

프로젝트 루트 디렉토리에서 터미널을 열고 다음 명령어를 실행하여 서비스를 진단할 수 있습니다.

### 1. CLI 터미널 진단 실행
```bash
npx vibe-diagnosis run
```
- 모든 진단 노드들을 한 번에 스캔하고, 전체적인 건강지수(Health %)와 성공/경고/에러 여부를 터미널에 한눈에 시각화해 줍니다.

### 2. 웹 기반 그래픽 대시보드 구동
```bash
npx vibe-diagnosis dashboard
```
- 기본 7700 포트에서 실행되는 그래픽 웹 콘솔을 열어 브라우저상에서 검사 결과를 열람하고 AI 교정(Auto Repair) 도구를 시각적으로 관리합니다.
- 포트 변경이 필요한 경우: `npx vibe-diagnosis dashboard --port 8080`

---

## 📂 자산 및 상태 관리 체계

- **진단 설정 파일 (`config.json`)**: 프로젝트 정보 및 진단 대상 레이어, AI 연결(BYOK) 설정을 제어합니다.
- **에러 패턴 저장소 (`error-patterns/`)**: 진단 실패 사례와 구체적인 해결 코드를 `ERR_NNN_slug.md` 형식으로 기록하여 보존합니다. 
- **`STATE_BOUNDARY.md`**: 원본 소스, 빌드 상태, 패치 히스토리를 추적하여 비파괴적이고 안전한 자가교정 상태를 유지합니다.
- **`AGENT_PATCH_QUEUE.md`**: 여러 교정 작업이 순차적으로 올바르게 이루어지도록 큐를 제어합니다.
