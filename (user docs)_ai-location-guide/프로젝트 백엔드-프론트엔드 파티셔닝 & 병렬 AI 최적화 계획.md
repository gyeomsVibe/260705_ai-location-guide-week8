# 📍 프로젝트 백엔드/프론트엔드 파티셔닝 & 병렬 AI 최적화 계획

현재 단일 디렉토리에 혼재되어 있는 프론트엔드와 백엔드 코드를 분리하고, 서로 다른 AI 도구가 상호 간섭 없이 독립적으로 병렬 작업을 수행할 수 있도록 공간 구조를 전면 개선합니다.

---

## 🔍 배경 및 파티션 요구 이유 분석 (AI 협업의 한계와 비효율 개선)

1. **AI 작업 컨텍스트 간섭**: 
   - 하나의 폴더 안에 백엔드 의존성(`node_modules`), 서버 코드(`server.js`), 프론트엔드 마크업(`index.html`), AI 진단 캐시 및 설정 등이 모두 혼재되어 있어, AI 도구가 전체 워크스페이스를 조회할 때 불필요한 토큰 소비와 성능 저하가 발생합니다.
2. **동시 수정으로 인한 코드 충돌**: 
   - 프론트엔드 전용 AI와 백엔드 API 전용 AI가 병렬로 작동할 때, 동일한 루트 경로 아래에서 빌드/테스트를 수행하거나 공통 설정 파일(`package.json`, `.gitignore` 등)을 무분별하게 수정하여 변경 사항이 덮어씌워질 위험이 큽니다.
3. **책임 범위의 모호함**: 
   - 프론트엔드 작업에 집중해야 할 AI가 백엔드 코드나 환경 변수 파일에 접근하거나 불필요한 의존성을 설치하는 문제를 원천 차단하기 위해 **물리적인 작업 경계선(Boundary Partition)**이 필요합니다.

---

## 🛠️ 제안하는 파티셔닝 아키텍처

개선 후의 폴더 구조는 아래와 같이 깔끔하게 격리됩니다.

```text
/ (root) - 통합 관리 및 배포 영역
├── .gitignore (루트 전체 관리용)
├── render.yaml (Render 배포 명세서 - 서브디렉토리 빌드 반영)
├── README.md (전체 가이드 및 문서)
├── README.en.md
├── STATE_BOUNDARY.md (최상위 상태 관리)
├── AGENT_PATCH_QUEUE.md (패치 큐)
├── .vibe-diagnosis/ (진단 스크립트 및 설정)
│   └── diagnostics/
│       ├── project.diag.js (분리 경로 반영 완료)
│       └── ui-ux.diag.js (분리 경로 반영 완료)
│
├── 📂 backend/ - 백엔드 영역 (Express API 및 서버)
│   ├── server.js (Express 서버 파일)
│   ├── package.json (Express 의존성 등)
│   ├── package-lock.json
│   └── .gitignore (백엔드 전용: node_modules 등 제외)
│
└── 📂 frontend/ - 프론트엔드 영역 (UI 및 정적 리소스)
    └── public/
        └── index.html (실시간 검색 및 반응형 UI 단일 파일)
```

---

## 📝 주요 변경 사항 (Proposed Changes)

### 1. [NEW] 디렉토리 생성 및 파일 이동
- `backend/` 폴더를 생성하고 다음 파일들을 이동시킵니다.
  - `server.js` ➡️ `backend/server.js`
  - `package.json` ➡️ `backend/package.json`
  - `package-lock.json` ➡️ `backend/package-lock.json`
- `frontend/` 폴더를 생성하고 `public/` 디렉토리를 통째로 이동시킵니다.
  - `public/` ➡️ `frontend/public/`

### 2. [MODIFY] [render.yaml](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/render.yaml)
- Render 배포 환경에서 서비스 빌드 및 실행 시, `backend/` 폴더를 기준으로 동작하도록 변경합니다.
- `buildCommand` 및 `startCommand`는 `backend/` 기준으로 적용 완료.

### 3. [MODIFY] [project.diag.js](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/.vibe-diagnosis/diagnostics/project.diag.js) & [ui-ux.diag.js](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/.vibe-diagnosis/diagnostics/ui-ux.diag.js)
- 진단 엔진이 소스 코드의 위치를 제대로 탐색할 수 있도록, 기존 루트 기준 경로를 파티셔닝된 경로로 교정합니다.
  - `server.js` 탐색 경로 ➡️ `backend/server.js`
  - `public/index.html` 탐색 경로 ➡️ `frontend/public/index.html`

### 4. [MODIFY] [backend/server.js](file:///d:/D_Workspace_NB/-google-workspace/-antigravity-workspace/260705_ai-location-guide-week8-9/backend/server.js) (적용 완료)
- 프론트엔드 정적 리소스를 서빙하는 경로가 `path.join(__dirname, 'public')`에서 `path.join(__dirname, '../frontend/public')` 또는 `backend` 내부에 static 폴더가 없을 경우의 상대 경로로 적절히 수정되어야 합니다.
- (현재 `server.js`에서는 `path.join(__dirname, 'public')`을 지정하고 있습니다. 현재 `backend/server.js`는 `path.join(__dirname, "../frontend/public")`을 사용하며, 분리된 정적 리소스를 정상적으로 서빙합니다.)

---

## 🤖 병렬 AI 도구 협업 최적화 규칙 수립 (MIA 파티션 룰)

- **백엔드 AI 에이전트 규칙**: `backend/` 폴더 내부 파일만 수정 권한 부여. `frontend/` 폴더는 읽기 전용으로만 허용하며, 수정이 필요한 경우 프론트엔드 에이전트에 작업을 위임하거나 병렬 수행을 대기시킵니다.
- **프론트엔드 AI 에이전트 규칙**: `frontend/` 폴더 내부의 HTML/CSS/JS 파일만 수정 권한 부여. 백엔드 `server.js`와 API 의존성은 완벽한 블랙박스(Black-box)로 간주하고 백엔드 서버가 제공하는 API 명세에만 의존합니다.
- **루트 동기화 규칙**: 패키지 설치(`npm install`) 및 통합 빌드는 `backend/` 폴더와 `frontend/` 폴더 각각의 환경에서 개별적으로 일어나며, 루트 디렉토리의 자가진단 도구(`vibe-diagnosis`)를 통해서만 통합 및 최종 검증을 수행합니다.

---

## 🚦 검증 및 복구 계획 (Verification Plan)

### 자동화된 진단 수행
1. 소스 코드 이동 및 경로 수정 완료 후, 루트 디렉토리에서 아래 명령어를 실행하여 자가진단이 올바르게 100% 통과하는지 확인합니다.
   ```bash
   npx vibe-diagnosis run
   ```
2. 로컬 서버 정상 기동 확인:
   - `backend/` 폴더에서 `npm start`를 실행하여 서버가 정상 기동하는지 검증합니다.
   - 브라우저로 `http://localhost:3000`에 접속하여 프론트엔드 UI 화면이 정상적으로 로드되고 지도가 뜨는지 검증합니다.

### 롤백(Rollback) 경로
- 변경 사항이 문제를 일으킬 경우, Git 커밋 변경 사항을 즉시 폐기하거나 파일들을 원래의 루트 위치로 즉시 원복(Revert)하여 서비스 무결성을 보장합니다.
