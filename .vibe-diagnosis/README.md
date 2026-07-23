# Vibe Diagnosis 자가진단

프로젝트 루트에서 다음 명령으로 진단을 실행합니다.

```bash
npm run diag:sys
npm run diag:ui
npm run diag
```

현재 설치된 `vibe-diagnosis` 패키지의 CLI 이름은 `vibe-diag`입니다. 진단 스크립트는 분리된 프로젝트 구조를 기준으로 `backend/server.js`와 `frontend/public/index.html`을 검사합니다.

인증키나 `.env` 파일은 진단 대상이 아닙니다.